/*!
 * Liquid Glass for the web — v1.0.0
 * Apple-style Liquid Glass (refraction, specular rim, interactive springs)
 * in pure HTML, CSS and JavaScript. No framework, no build step.
 *
 * https://github.com/asimov-academy/liquid-glass-skill
 * MIT License — Asimov Academy
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiquidGlass = api;
})(typeof window !== 'undefined' ? window : this, function (win) {
  'use strict';

  if (!win || !win.document) return {};
  var doc = win.document;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var VERSION = '1.0.0';

  /* ------------------------------------------------------------------ *
   * Environment
   * ------------------------------------------------------------------ */

  var ua = win.navigator.userAgent || '';
  var brands = (win.navigator.userAgentData && win.navigator.userAgentData.brands) || [];
  // Only Chromium can feed an SVG filter (url()) into `backdrop-filter`.
  var isChromium = brands.some(function (b) { return /Chromium|Google Chrome|Microsoft Edge|Opera/i.test(b.brand); }) ||
    (/Chrome\/\d+/.test(ua) && !/iPhone|iPad|iPod/.test(ua));

  function media(q) {
    try { return win.matchMedia(q); } catch (e) { return { matches: false, addEventListener: function () {} }; }
  }
  var mqReduceMotion = media('(prefers-reduced-motion: reduce)');
  var mqReduceTransparency = media('(prefers-reduced-transparency: reduce)');
  var mqMoreContrast = media('(prefers-contrast: more)');

  var supports = {
    backdropRefraction: isChromium,
    backdropFilter: !!(win.CSS && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))),
    svgFilters: true
  };

  /* ------------------------------------------------------------------ *
   * Defaults
   * ------------------------------------------------------------------ */

  var VARIANTS = {
    // Regular: blurs + compresses luminosity so text on top stays legible.
    regular: { blur: 7, saturation: 1.45, brightness: 1.03, contrast: 0.9 },
    // Clear: highly translucent, for media-rich backgrounds (add a dim layer on bright content).
    clear: { blur: 0.5, saturation: 1.08, brightness: 1.02, contrast: 1 }
  };

  var defaults = {
    variant: 'regular',   // 'regular' | 'clear'
    refraction: null,     // max lateral bend at the rim, in px (null = auto from size)
    bezel: null,          // width of the curved rim, in px (null = auto from size)
    curvature: 4,         // squircle exponent of the rim profile (2 = circle, 4 = Apple-like)
    dispersion: 0,        // chromatic aberration at the rim (0 – 0.5)
    magnify: 1,           // lens zoom for the flat center (1 = none)
    blur: null,           // px — null uses the variant value
    saturation: null,
    brightness: null,
    contrast: null,
    interactive: false,   // spring press / stretch / glow
    mode: 'auto',         // 'auto' | 'backdrop' | 'scene' | 'fallback'
    light: 'pointer'      // global: 'pointer' | 'fixed'
  };

  /* ------------------------------------------------------------------ *
   * Utils
   * ------------------------------------------------------------------ */

  var uid = 0;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function round(v, p) { var k = Math.pow(10, p || 2); return Math.round(v * k) / k; }
  function el(tag, cls, parent) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function parseVal(v) {
    if (v === '' || v === 'true') return true;
    if (v === 'false') return false;
    return /^\s*-?\d*\.?\d+(px)?\s*$/.test(v) ? parseFloat(v) : v;
  }
  function readAttrOptions(node) {
    var out = {};
    var ds = node.dataset || {};
    if (ds.glass && ds.glass !== 'true' && VARIANTS[ds.glass]) out.variant = ds.glass;
    for (var k in ds) {
      if (k.indexOf('glass') === 0 && k.length > 5) {
        var key = k.charAt(5).toLowerCase() + k.slice(6);
        out[key] = parseVal(ds[k]);
      }
    }
    return out;
  }
  function assign(t) {
    for (var i = 1; i < arguments.length; i++) {
      var s = arguments[i];
      if (s) for (var k in s) if (s[k] !== undefined && s[k] !== null) t[k] = s[k];
    }
    return t;
  }
  function resolveOptions(node, opts) {
    var o = assign({}, defaults, readAttrOptions(node), opts);
    var v = VARIANTS[o.variant] || VARIANTS.regular;
    if (o.blur == null) o.blur = v.blur;
    if (o.saturation == null) o.saturation = v.saturation;
    if (o.brightness == null) o.brightness = v.brightness;
    if (o.contrast == null) o.contrast = v.contrast;
    o.refraction = o.refraction == null ? null : +o.refraction; o.bezel = o.bezel == null ? null : +o.bezel; o.dispersion = clamp(+o.dispersion || 0, 0, 0.8);
    o.magnify = +o.magnify || 1; o.curvature = clamp(+o.curvature || 4, 1.5, 8);
    return o;
  }
  // Auto optics scale with the element: thicker glass for bigger shapes.
  function optics(o, w, h) {
    var md = Math.min(w, h);
    var bez = o.bezel == null || isNaN(o.bezel) ? clamp(md * 0.3, 6, 90) : o.bezel;
    var ref = o.refraction == null || isNaN(o.refraction) ? bez * foldFree(o.curvature) : o.refraction;
    return assign({}, o, { bezel: bez, refraction: ref });
  }
  function radiusOf(node, w, h) {
    var cs = win.getComputedStyle(node);
    var r = cs.borderTopLeftRadius || '0';
    var v = parseFloat(r) || 0;
    if (/%/.test(r)) v = Math.min(w, h) * v / 100;
    return clamp(v, 0, Math.min(w, h) / 2);
  }

  /* ------------------------------------------------------------------ *
   * Frame loop + springs
   * ------------------------------------------------------------------ */

  var tasks = new Set();
  var running = false, lastT = 0;
  function frame(t) {
    var dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000 || 0.016));
    lastT = t;
    tasks.forEach(function (fn) { if (!fn(dt)) tasks.delete(fn); });
    if (tasks.size) win.requestAnimationFrame(frame); else running = false;
  }
  function animate(fn) {
    tasks.add(fn);
    if (!running) { running = true; lastT = win.performance.now(); win.requestAnimationFrame(frame); }
  }

  /**
   * Critically-tunable damped spring (semi-implicit Euler, 240 Hz substeps).
   * Springs keep their velocity when retargeted — that is what makes
   * interrupted gestures feel continuous, the way Apple's do.
   */
  function Spring(value, cfg) {
    cfg = cfg || {};
    this.value = value || 0; this.target = this.value; this.velocity = 0;
    this.stiffness = cfg.stiffness || 300; this.damping = cfg.damping || 26; this.mass = cfg.mass || 1;
    this.precision = cfg.precision || 0.001;
  }
  Spring.prototype.to = function (t) { this.target = t; if (mqReduceMotion.matches) this.set(t); return this; };
  Spring.prototype.set = function (v) { this.value = this.target = v; this.velocity = 0; return this; };
  Spring.prototype.step = function (dt) {
    var n = Math.ceil(dt * 240), h = dt / n;
    for (var i = 0; i < n; i++) {
      var f = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      this.velocity += (f / this.mass) * h;
      this.value += this.velocity * h;
    }
    if (Math.abs(this.velocity) < this.precision && Math.abs(this.value - this.target) < this.precision) {
      this.value = this.target; this.velocity = 0; return false;
    }
    return true;
  };

  /* ------------------------------------------------------------------ *
   * Displacement map — the optics
   *
   * The glass is modelled as a slab whose rim is a convex squircle bevel.
   * For each pixel we take the signed distance to the rounded-rect edge,
   * look up the surface slope of the bevel, refract a vertical view ray
   * with Snell's law (n = 1.5) and store the resulting lateral shift as a
   * vector in R/G. The flat center has zero shift (or a uniform zoom when
   * `magnify` > 1). feDisplacementMap then bends the backdrop with it.
   * ------------------------------------------------------------------ */

  var lutCache = {};
  // Lens profile. A pixel at normalized depth t (0 = edge, 1 = start of the flat
  // center) samples the backdrop at depth g(t), with g'(t) = t^q: the local
  // magnification 1/g' grows smoothly toward the rim (infinite right at the
  // edge, where content smears along the curve like real thick glass) and the
  // mapping never folds, so text stays clean. g(1) = 1 and g'(1) = 1, so the
  // bevel blends seamlessly into the flat, undistorted center.
  function profileLUT(curvature) {
    var key = curvature.toFixed(2);
    if (lutCache[key]) return lutCache[key];
    var N = 256, out = new Float32Array(N), q = Math.max(0.5, curvature - 1), k = q / (q + 1);
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var g = k + Math.pow(t, q + 1) / (q + 1); // sampled depth
      out[i] = (g - t) / k;                      // normalized inward shift (1 at the edge)
    }
    lutCache[key] = out;
    return out;
  }
  // max shift (as a fraction of the bezel) that still never folds
  function foldFree(curvature) { var q = Math.max(0.5, curvature - 1); return q / (q + 1); }

  var mapCache = new Map();
  function makeMap(w, h, r, o) {
    var key = [Math.round(w), Math.round(h), Math.round(r), o.refraction, o.bezel, o.curvature, o.magnify, o.hiRes ? 1 : 0].join('|');
    var hit = mapCache.get(key);
    if (hit) { mapCache.delete(key); mapCache.set(key, hit); return hit; }

    // WebKit/Gecko upscale feImage without smoothing, so give them a denser map.
    var s = o.hiRes ? clamp(1100 / Math.max(w, h), 1, 2) : clamp(720 / Math.max(w, h), 0.75, 2);
    var W = Math.max(2, Math.round(w * s)), H = Math.max(2, Math.round(h * s));
    var sx = W / w, sy = H / h;
    var hw = w / 2, hh = h / 2;
    r = Math.min(r, hw, hh);
    var bez = Math.max(1, Math.min(o.bezel, Math.min(hw, hh)));
    var lut = profileLUT(o.curvature);
    var zoomK = 1 / o.magnify - 1;
    var maxD = Math.max(1, o.refraction + Math.abs(zoomK) * Math.max(hw, hh));

    var cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    // bevel lighting (3D thickness): normals from a squircle height field, lit
    // by a key light (top-left) and a weaker internal reflection (bottom-right)
    var shc = doc.createElement('canvas'); shc.width = W; shc.height = H;
    var shctx = shc.getContext('2d'), shimg = shctx.createImageData(W, H), sd8 = shimg.data;
    var P = o.curvature, thick = 0.55, aa = Math.min(sx, sy);
    var L1 = [-0.48, -0.66, 0.58], L2 = [0.48, 0.66, 0.58];
    var nrm = function (v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    L1 = nrm(L1); L2 = nrm(L2);
    var H1 = nrm([L1[0], L1[1], L1[2] + 1]), H2 = nrm([L2[0], L2[1], L2[2] + 1]);
    var flat1 = Math.pow(H1[2], 90), flat2 = Math.pow(H2[2], 90);
    // The normal field uses a corner radius of at least the bezel width, so
    // the inner bevel stays smooth (no mitred crease along the diagonals).
    var rn = Math.max(r, Math.min(bez * 1.15, hw, hh));
    var cx = hw - rn, cy = hh - rn, k = 127.5 / maxD;

    for (var j = 0; j < H; j++) {
      var py = (j + 0.5) / sy - hh, ay = Math.abs(py), sgy = py < 0 ? -1 : 1;
      var qy = ay - cy;
      for (var i = 0; i < W; i++) {
        var px = (i + 0.5) / sx - hw, ax = Math.abs(px), sgx = px < 0 ? -1 : 1;
        var qx = ax - cx;
        var nx, ny, sd;
        if (qx > 0 && qy > 0) {
          var l = Math.sqrt(qx * qx + qy * qy) || 1;
          nx = qx / l * sgx; ny = qy / l * sgy; sd = l - rn;
        } else if (qx > qy) {
          nx = sgx; ny = 0; sd = qx - rn;
        } else {
          nx = 0; ny = sgy; sd = qy - rn;
        }
        var t = clamp(-sd / bez, 0, 1);
        var fi = t * 255, i0 = fi | 0, m = (lut[i0] + (lut[Math.min(255, i0 + 1)] - lut[i0]) * (fi - i0)) * o.refraction;
        // A view ray hitting the tilted bevel bends toward the inward normal, so
        // each rim pixel shows content from further inside: the rim magnifies
        // and drags the interior along the curve of the edge (like real glass).
        var dx = -nx * m + px * zoomK, dy = -ny * m + py * zoomK;
        var idx = (j * W + i) * 4;
        d[idx] = clamp(Math.round(127.5 + dx * k), 0, 255);
        d[idx + 1] = clamp(Math.round(127.5 + dy * k), 0, 255);
        d[idx + 2] = 128;
        d[idx + 3] = 255; // keep opaque: premultiplied alpha would corrupt vectors
        var cov = clamp(0.5 - sd * aa, 0, 1);
        if (cov > 0 && t < 1) {
          var tt = Math.max(t, 1e-3), am = Math.pow(1 - tt, P);
          var slope = Math.min(6, Math.pow(1 - am, 1 / P - 1) * Math.pow(1 - tt, P - 1) * thick);
          var N3 = nrm([nx * slope, ny * slope, 1]);
          var dif = (N3[0] * L1[0] + N3[1] * L1[1] + N3[2] * L1[2]) - L1[2];
          var sp1 = Math.pow(Math.max(0, N3[0] * H1[0] + N3[1] * H1[1] + N3[2] * H1[2]), 90) - flat1;
          var sp2 = Math.pow(Math.max(0, N3[0] * H2[0] + N3[1] * H2[1] + N3[2] * H2[2]), 90) - flat2;
          var v = dif * 0.22 + sp1 * 0.75 + sp2 * 0.45;
          var a8 = clamp(Math.abs(v) * (v > 0 ? 1 : 0.35), 0, 1) * cov;
          var c8 = v > 0 ? 255 : 0;
          sd8[idx] = c8; sd8[idx + 1] = c8; sd8[idx + 2] = c8; sd8[idx + 3] = Math.round(a8 * 255);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    shctx.putImageData(shimg, 0, 0);

    // Shape mask (anti-aliased) used by the cross-browser scene renderer.
    var mv = doc.createElement('canvas'); mv.width = W; mv.height = H;
    var mctx = mv.getContext('2d');
    mctx.scale(sx, sy); mctx.fillStyle = '#fff'; mctx.beginPath();
    if (mctx.roundRect) mctx.roundRect(0, 0, w, h, r);
    else { mctx.moveTo(r, 0); mctx.arcTo(w, 0, w, h, r); mctx.arcTo(w, h, 0, h, r); mctx.arcTo(0, h, 0, 0, r); mctx.arcTo(0, 0, w, 0, r); }
    mctx.fill();

    var out = { disp: cv.toDataURL('image/png'), shade: shc.toDataURL('image/png'), mask: mv.toDataURL('image/png'), scale: 2 * maxD, reach: Math.max(0, zoomK) * Math.max(hw, hh) + 1 };
    mapCache.set(key, out);
    if (mapCache.size > 80) mapCache.delete(mapCache.keys().next().value);
    return out;
  }

  /* ------------------------------------------------------------------ *
   * SVG host
   * ------------------------------------------------------------------ */

  var svgHost = null;
  function defs() {
    if (svgHost && svgHost.isConnected) return svgHost.firstChild;
    svgHost = doc.createElementNS(SVG_NS, 'svg');
    svgHost.setAttribute('aria-hidden', 'true');
    svgHost.setAttribute('width', '0'); svgHost.setAttribute('height', '0');
    svgHost.setAttribute('data-liquid-glass', VERSION);
    svgHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;left:-9999px;top:-9999px';
    svgHost.appendChild(doc.createElementNS(SVG_NS, 'defs'));
    (doc.body || doc.documentElement).appendChild(svgHost);
    return svgHost.firstChild;
  }
  function makeFilter(id, attrs, inner) {
    var f = doc.createElementNS(SVG_NS, 'filter');
    f.setAttribute('id', id);
    for (var k in attrs) f.setAttribute(k, attrs[k]);
    f.innerHTML = inner;
    defs().appendChild(f);
    return f;
  }
  function rect(x, y, w, h) { return ' x="' + round(x) + '" y="' + round(y) + '" width="' + round(Math.max(0, w)) + '" height="' + round(Math.max(0, h)) + '"'; }
  function img(href, res, r) {
    return '<feImage href="' + href + '" xlink:href="' + href + '" preserveAspectRatio="none" result="' + res + '"' + r + '/>';
  }
  // Displacement (+ optional chromatic dispersion: R/G/B bent by different amounts)
  function displace(src, map, scale, disp, res, r, tag) {
    tag = tag || '';
    var DM = function (s, out) {
      return '<feDisplacementMap in="' + src + '" in2="' + map + '" scale="' + round(s) + '" xChannelSelector="R" yChannelSelector="G" result="' + out + '"' + r + tag + '/>';
    };
    if (!disp) return DM(scale, res);
    var R = '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', G = '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', B = '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0';
    return DM(scale * (1 + disp), res + 'r') + '<feColorMatrix in="' + res + 'r" type="matrix" values="' + R + '" result="' + res + 'cr"' + r + '/>' +
      DM(scale, res + 'g') + '<feColorMatrix in="' + res + 'g" type="matrix" values="' + G + '" result="' + res + 'cg"' + r + '/>' +
      DM(scale * (1 - disp), res + 'b') + '<feColorMatrix in="' + res + 'b" type="matrix" values="' + B + '" result="' + res + 'cb"' + r + '/>' +
      '<feBlend in="' + res + 'cr" in2="' + res + 'cg" mode="screen" result="' + res + 'rg"' + r + '/>' +
      '<feBlend in="' + res + 'rg" in2="' + res + 'cb" mode="screen" result="' + res + '"' + r + '/>';
  }

  /* ------------------------------------------------------------------ *
   * Global specular light
   * ------------------------------------------------------------------ */

  var lightBound = false;
  function bindLight(mode) {
    if (lightBound || mode === 'fixed' || mqReduceMotion.matches) return;
    lightBound = true;
    var tx = 0.5, ty = 0.5, queued = false, rootStyle = doc.documentElement.style;
    function apply() {
      queued = false;
      var a = -45 + (tx - 0.5) * 50 + (ty - 0.5) * 18;
      rootStyle.setProperty('--lg-light-angle', round(a, 1) + 'deg');
    }
    win.addEventListener('pointermove', function (e) {
      tx = e.clientX / (win.innerWidth || 1); ty = e.clientY / (win.innerHeight || 1);
      if (!queued) { queued = true; win.requestAnimationFrame(apply); }
    }, { passive: true });
    win.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      tx = clamp(0.5 + e.gamma / 60, 0, 1); ty = clamp(0.5 + (e.beta - 45) / 90, 0, 1);
      if (!queued) { queued = true; win.requestAnimationFrame(apply); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Scene — cross-browser refraction (Safari, Firefox, and anywhere you
   * force it). The backdrop layer gets one SVG `filter` that refracts the
   * region under every glass element in the scene, like a real lens array.
   * ------------------------------------------------------------------ */

  var scenes = new Map();
  function findBackdrop(sceneEl) {
    var list = sceneEl.querySelectorAll('.lg-backdrop, [data-glass-backdrop]');
    for (var i = 0; i < list.length; i++) {
      if (list[i].parentElement && list[i].parentElement.closest('.lg-scene, [data-glass-scene]') === sceneEl) return list[i];
    }
    return null;
  }
  function sceneFor(sceneEl) {
    var s = scenes.get(sceneEl);
    if (!s) {
      var bd = findBackdrop(sceneEl);
      if (!bd) return null;
      s = new Scene(sceneEl, bd); scenes.set(sceneEl, s);
    }
    return s;
  }

  function Scene(sceneEl, backdrop) {
    this.el = sceneEl; this.backdrop = backdrop; this.id = 'lg-scene-' + (++uid);
    this.lenses = new Set(); this.filter = null; this.visible = true; this.dirty = true;
    var self = this;
    if ('IntersectionObserver' in win) {
      this.io = new IntersectionObserver(function (es) {
        self.visible = es[es.length - 1].isIntersecting;
        if (self.visible) self.wake();
      }, { rootMargin: '200px' });
      this.io.observe(sceneEl);
    }
    this.tick = function () {
      if (!self.lenses.size) return false;
      if (self.dirty) self.rebuild();
      if (self.visible) self.update();
      return self.visible && !!self.lenses.size;
    };
  }
  Scene.prototype.wake = function () { animate(this.tick); };
  Scene.prototype.add = function (g) { this.lenses.add(g); this.dirty = true; this.wake(); };
  Scene.prototype.remove = function (g) {
    this.lenses.delete(g); this.dirty = true;
    if (!this.lenses.size) {
      if (this.filter) this.filter.remove(); this.filter = null;
      this.backdrop.style.filter = '';
      if (this.io) this.io.disconnect();
      scenes.delete(this.el);
    } else this.wake();
  };
  // All scene coordinates are fractions of the backdrop's box
  // (primitiveUnits="objectBoundingBox"): WebKit resolves userSpaceOnUse for
  // CSS filters on HTML against the page, not the element, so fractions are
  // the only units every engine agrees on. In those units feDisplacementMap
  // scales X by the box width and Y by its height, so each map goes through a
  // colour matrix that rebalances the two axes.
  Scene.prototype.rebuild = function () {
    this.dirty = false;
    var html = '', i = 0, self = this;
    this.items = [];
    this.lenses.forEach(function (g) {
      if (!g.map) return;
      var o = g.opts, n = 'l' + (i++), b = Math.max(0, o.blur);
      var Z = ' data-r="' + n + '"';
      var sat = o.saturation, sl = o.contrast * o.brightness, ic = (0.5 - 0.5 * o.contrast) * o.brightness;
      html +=
        (b > 0.05 ? '<feGaussianBlur in="SourceGraphic" stdDeviation="0" data-blur="' + b + '" result="' + n + 'b" data-pad="1"' + Z + '/>'
          : '<feOffset in="SourceGraphic" dx="0" dy="0" result="' + n + 'b" data-pad="1"' + Z + '/>') +
        img(g.map.disp, n + 'm0', Z) +
        '<feColorMatrix in="' + n + 'm0" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" data-axis="1" result="' + n + 'm"' + Z + '/>' +
        displace(n + 'b', n + 'm', g.map.scale, o.dispersion, n + 'd', Z, ' data-s="' + g.map.scale + '"') +
        '<feColorMatrix in="' + n + 'd" type="saturate" values="' + sat + '" result="' + n + 'c"' + Z + '/>' +
        '<feComponentTransfer in="' + n + 'c" result="' + n + 't"' + Z + '>' +
        '<feFuncR type="linear" slope="' + sl + '" intercept="' + ic + '"/>' +
        '<feFuncG type="linear" slope="' + sl + '" intercept="' + ic + '"/>' +
        '<feFuncB type="linear" slope="' + sl + '" intercept="' + ic + '"/></feComponentTransfer>' +
        img(g.map.mask, n + 'k', Z) +
        '<feComposite in="' + n + 't" in2="' + n + 'k" operator="in" result="' + n + 'o"' + Z + '/>';
      self.items.push({ g: g, n: n, last: '' });
    });
    html += '<feMerge><feMergeNode in="SourceGraphic"/>' + this.items.map(function (it) { return '<feMergeNode in="' + it.n + 'o" data-m="' + it.n + '"/>'; }).join('') + '</feMerge>';
    if (this.filter) this.filter.remove();
    this.filter = makeFilter(this.id + '-' + uid++, {
      x: 0, y: 0, width: 1, height: 1,
      filterUnits: 'objectBoundingBox', primitiveUnits: 'objectBoundingBox',
      'color-interpolation-filters': 'sRGB'
    }, html);
    this.items.forEach(function (it) {
      it.nodes = Array.prototype.slice.call(self.filter.querySelectorAll('[data-r="' + it.n + '"]'));
      it.merge = self.filter.querySelector('[data-m="' + it.n + '"]');
    });
    this.backdrop.style.filter = 'url(#' + this.filter.id + ')';
  };
  Scene.prototype.update = function () {
    var bd = this.backdrop, br = bd.getBoundingClientRect();
    var bw = bd.offsetWidth || br.width, bh = bd.offsetHeight || br.height;
    if (!bw || !bh) return;
    var kx = br.width ? bw / br.width : 1, ky = br.height ? bh / br.height : 1;
    var mn = Math.min(bw, bh), ax = mn / bw, ay = mn / bh;
    var axis = round(ax, 6) + ' 0 0 0 ' + round((1 - ax) / 2, 6) + ' 0 ' + round(ay, 6) + ' 0 0 ' + round((1 - ay) / 2, 6) + ' 0 0 1 0 0 0 0 0 1 0';
    // read all, then write all (no layout thrash)
    var reads = this.items.map(function (it) {
      var g = it.g, r = g.el.getBoundingClientRect();
      // A switched-off lens keeps valid geometry (WebKit drops the whole
      // filter if a primitive leaves the region) and just leaves the merge.
      var off = g.el.getAttribute('data-lg-lens') === 'off' || !r.width;
      if (!r.width) r = { left: br.left, top: br.top, width: 1, height: 1 };
      return { it: it, off: off, x: (r.left - br.left) * kx, y: (r.top - br.top) * ky, w: r.width * kx, h: r.height * ky, lw: g.el.offsetWidth || 1 };
    });
    reads.forEach(function (m) {
      var it = m.it, o = it.g.opts;
      var sig = [m.off ? 0 : 1, round(m.x, 1), round(m.y, 1), round(m.w, 1), round(m.h, 1), bw, bh].join(',');
      if (sig === it.last) return;
      it.last = sig;
      if (it.merge) it.merge.setAttribute('in', m.off ? 'SourceGraphic' : it.n + 'o');
      if (m.off && it.placed) return;
      it.placed = true;
      var k = m.lw ? m.w / m.lw : 1;
      var pad = it.g.map.reach * k + o.blur * 3 + 2;
      it.nodes.forEach(function (n) {
        var p = n.hasAttribute('data-pad') ? pad : 0;
        n.setAttribute('x', round((m.x - p) / bw, 6)); n.setAttribute('y', round((m.y - p) / bh, 6));
        n.setAttribute('width', round(Math.max(0, m.w + 2 * p) / bw, 6)); n.setAttribute('height', round(Math.max(0, m.h + 2 * p) / bh, 6));
        if (n.hasAttribute('data-s')) {
          var base = parseFloat(n.getAttribute('data-s')), res = n.getAttribute('result');
          var mul = /dr$/.test(res) ? 1 + o.dispersion : /db$/.test(res) ? 1 - o.dispersion : 1;
          n.setAttribute('scale', round(base * k * mul / mn, 6));
        }
        if (n.hasAttribute('data-axis')) n.setAttribute('values', axis);
        if (n.hasAttribute('data-blur')) {
          var b = parseFloat(n.getAttribute('data-blur'));
          n.setAttribute('stdDeviation', round(b / bw, 6) + ' ' + round(b / bh, 6));
        }
      });
    });
  };

  /* ------------------------------------------------------------------ *
   * Glass element
   * ------------------------------------------------------------------ */

  var instances = new WeakMap();

  function Glass(node, opts) {
    this.el = node; this.id = ++uid; this.userOpts = opts || {};
    this.opts = resolveOptions(node, this.userOpts);
    this.filter = null; this.scene = null; this.map = null;
    instances.set(node, this);

    node.classList.add('lg-ready');
    if (win.getComputedStyle(node).position === 'static') node.style.position = 'relative';

    var layers = el('span', 'lg-layers');
    layers.setAttribute('aria-hidden', 'true');
    this.refract = el('span', 'lg-refract', layers);
    this.tint = el('span', 'lg-tint', layers);
    this.shade = el('span', 'lg-shade', layers);
    this.glow = el('span', 'lg-glow', layers);
    this.rim = el('span', 'lg-rim', layers);
    this.layers = layers;
    node.insertBefore(layers, node.firstChild);

    var self = this;
    this.queued = false;
    this.ro = new ResizeObserver(function () { self.schedule(); });
    this.ro.observe(node);
    if (this.opts.tint) node.style.setProperty('--lg-tint', this.opts.tint);
    if (this.opts.interactive) this.bindInteractive();
    this.render();
    bindLight(defaults.light);
  }

  var GROUP_SELECTOR = '.lg-glass-group, [data-glass-group]';
  Glass.prototype.decideMode = function () {
    var m = this.opts.mode;
    if (this.el.parentElement && this.el.parentElement.closest(GROUP_SELECTOR)) return 'member';
    if (mqReduceTransparency.matches || mqMoreContrast.matches) return 'fallback';
    var sceneEl = this.el.parentElement && this.el.parentElement.closest('.lg-scene, [data-glass-scene]');
    var canScene = !!(sceneEl && findBackdrop(sceneEl));
    if (m === 'fallback') return 'fallback';
    if (m === 'backdrop') return supports.backdropRefraction ? 'backdrop' : (canScene ? 'scene' : 'fallback');
    if (m === 'scene') return canScene ? 'scene' : (supports.backdropRefraction ? 'backdrop' : 'fallback');
    if (supports.backdropRefraction) return 'backdrop';
    return canScene ? 'scene' : 'fallback';
  };

  Glass.prototype.schedule = function () {
    if (this.queued) return;
    this.queued = true;
    var self = this;
    win.requestAnimationFrame(function () { self.queued = false; self.render(); });
  };

  Glass.prototype.update = function (opts) {
    assign(this.userOpts, opts);
    var wasInteractive = this.opts.interactive;
    this.opts = resolveOptions(this.el, this.userOpts);
    if (this.opts.tint) this.el.style.setProperty('--lg-tint', this.opts.tint); else this.el.style.removeProperty('--lg-tint');
    if (this.opts.interactive && !wasInteractive) this.bindInteractive();
    this.lastSig = '';
    this.render();
    return this;
  };

  Glass.prototype.render = function () {
    var node = this.el;
    if (!node.isConnected) return;
    var w = node.offsetWidth, h = node.offsetHeight;
    if (!w || !h) return;
    var o = this.opts, r = radiusOf(node, w, h);
    var mode = this.decideMode();
    var sig = [mode, w, h, r, o.refraction, o.bezel, o.curvature, o.magnify, o.dispersion, o.blur, o.saturation, o.brightness, o.contrast].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.mode = mode;
    node.setAttribute('data-lg-mode', mode);
    node.setAttribute('data-lg-variant', o.variant);
    node.toggleAttribute('data-lg-tinted', !!o.tint);
    node.style.setProperty('--lg-r', round(r) + 'px');
    if (mode === 'member') {
      if (this.filter) { this.filter.remove(); this.filter = null; }
      if (this.scene) { this.scene.remove(this); this.scene = null; }
      this.refract.style.backdropFilter = this.refract.style.webkitBackdropFilter = '';
      var grp = groups.get(node.parentElement.closest(GROUP_SELECTOR));
      if (grp) grp.wake();
      return;
    }

    var rs = this.refract.style;
    if (mode !== 'scene' && this.scene) { this.scene.remove(this); this.scene = null; }
    if (mode !== 'backdrop' && this.filter) { this.filter.remove(); this.filter = null; }

    if (mode === 'fallback') {
      var fb = 'blur(' + Math.max(o.blur * 3, 10) + 'px) saturate(' + o.saturation + ') brightness(' + o.brightness + ')';
      rs.backdropFilter = rs.webkitBackdropFilter = fb;
      return;
    }

    var oo = optics(o, w, h);
    oo.hiRes = mode === 'scene' && !isChromium;
    this.map = makeMap(w, h, r, oo);
    this.shade.style.backgroundImage = 'url("' + this.map.shade + '")';

    if (mode === 'scene') {
      rs.backdropFilter = rs.webkitBackdropFilter = '';
      var s = sceneFor(node.parentElement.closest('.lg-scene, [data-glass-scene]'));
      if (this.scene && this.scene !== s) this.scene.remove(this);
      this.scene = s;
      s.add(this); s.dirty = true; s.wake();
      return;
    }

    // backdrop mode (Chromium). The refract layer is exactly the element's
    // shape (its own border-radius is the one clip Chromium always honours
    // for backdrop-filter), while the SVG filter region reaches M px beyond
    // it — so the rim can bend in real pixels from outside the edge.
    var M = Math.ceil(this.map.reach + 2);
    var fid = 'lg-glass-' + this.id + '-' + (++uid);
    var R = rect(0, 0, w, h);
    var inner = img(this.map.disp, 'map', R) + displace('SourceGraphic', 'map', this.map.scale, o.dispersion, 'refr', R);
    var old = this.filter;
    this.filter = makeFilter(fid, {
      x: -M, y: -M, width: w + 2 * M, height: h + 2 * M,
      filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    }, inner);
    var bf = (o.blur > 0.05 ? 'blur(' + o.blur + 'px) ' : '') + 'url(#' + fid + ') saturate(' + o.saturation + ') brightness(' + o.brightness + ') contrast(' + o.contrast + ')';
    rs.backdropFilter = bf;
    rs.webkitBackdropFilter = bf;
    if (old) win.requestAnimationFrame(function () { old.remove(); });
  };

  Glass.prototype.bindInteractive = function () {
    if (this.springs) return;
    var self = this, node = this.el;
    var sp = this.springs = {
      s: new Spring(1, { stiffness: 380, damping: 20 }),
      p: new Spring(0, { stiffness: 260, damping: 26 }),
      x: new Spring(0, { stiffness: 320, damping: 22 }),
      y: new Spring(0, { stiffness: 320, damping: 22 })
    };
    var start = null, size = 0, maxOff = 0;
    node.classList.add('lg-interactive');
    function soft(v) { return Math.sign(v) * maxOff * (1 - Math.exp(-Math.abs(v) / (maxOff * 4))); }
    function glowAt(e) {
      var r = node.getBoundingClientRect();
      node.style.setProperty('--lg-px', round((e.clientX - r.left) / r.width * 100, 1) + '%');
      node.style.setProperty('--lg-py', round((e.clientY - r.top) / r.height * 100, 1) + '%');
    }
    var tick = function (dt) {
      var a = sp.s.step(dt), b = sp.p.step(dt), c = sp.x.step(dt), d = sp.y.step(dt);
      var s = sp.s.value, ox = sp.x.value, oy = sp.y.value;
      var w = node.offsetWidth || 1, h = node.offsetHeight || 1;
      var sx = s * (1 + Math.abs(ox) / w * 0.5 - Math.abs(oy) / h * 0.15);
      var sy = s * (1 + Math.abs(oy) / h * 0.5 - Math.abs(ox) / w * 0.15);
      node.style.translate = round(ox, 2) + 'px ' + round(oy, 2) + 'px';
      node.style.scale = round(sx, 4) + ' ' + round(sy, 4);
      node.style.setProperty('--lg-press', round(sp.p.value, 3));
      if (self.mode === 'member') wakeGroupOf(node);
      var alive = a || b || c || d;
      if (!alive && !start) { node.style.translate = ''; node.style.scale = ''; }
      return alive || !!start;
    };
    this._down = function (e) {
      if (e.button > 0 || node.disabled) return;
      var w = node.offsetWidth, h = node.offsetHeight;
      size = Math.min(w, h);
      maxOff = clamp(size * 0.14, 3, 9);
      start = { x: e.clientX, y: e.clientY };
      glowAt(e);
      sp.s.to(1 + clamp(8 / Math.max(28, size), 0.015, 0.16));
      sp.p.to(1);
      animate(tick);
    };
    this._hover = function (e) { if (!start) glowAt(e); };
    node.addEventListener('pointermove', this._hover, { passive: true });
    this._move = function (e) {
      if (!start) return;
      glowAt(e);
      if (mqReduceMotion.matches || node.classList.contains('lg-draggable')) return;
      sp.x.to(soft(e.clientX - start.x)); sp.y.to(soft(e.clientY - start.y));
    };
    this._up = function () {
      if (!start) return;
      start = null;
      sp.s.to(1); sp.p.to(0); sp.x.to(0); sp.y.to(0);
      animate(tick);
    };
    node.addEventListener('pointerdown', this._down);
    win.addEventListener('pointermove', this._move, { passive: true });
    win.addEventListener('pointerup', this._up);
    win.addEventListener('pointercancel', this._up);
    node.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { sp.s.to(1.04); sp.p.to(0.6); animate(tick); } });
    node.addEventListener('keyup', function () { sp.s.to(1); sp.p.to(0); animate(tick); });
  };

  Glass.prototype.destroy = function () {
    this.ro.disconnect();
    if (this.filter) this.filter.remove();
    if (this.scene) this.scene.remove(this);
    if (this.layers.parentNode) this.layers.parentNode.removeChild(this.layers);
    if (this._down) {
      this.el.removeEventListener('pointerdown', this._down);
      win.removeEventListener('pointermove', this._move);
      win.removeEventListener('pointerup', this._up);
      win.removeEventListener('pointercancel', this._up);
    }
    this.el.classList.remove('lg-ready', 'lg-interactive');
    this.el.removeAttribute('data-lg-mode');
    instances.delete(this.el);
  };

  /* ------------------------------------------------------------------ *
   * Components
   * ------------------------------------------------------------------ */

  var wired = new WeakSet();

  // Tab bar / segmented control. The selection is a liquid droplet: its two
  // edges ride separate springs (the leading edge darts ahead, the trailing
  // edge catches up), so it stretches across the tabs and snaps back into a
  // pill. While touched it lifts into a magnifying lens you can drag.
  function tabs(nav) {
    if (wired.has(nav)) return; wired.add(nav);
    var list = nav.querySelector('.lg-tabs-list') || nav;
    var items = Array.prototype.slice.call(list.querySelectorAll('[role="tab"], .lg-tab'));
    if (!items.length) return;
    var ind = el('span', 'lg-tabs-indicator');
    ind.setAttribute('aria-hidden', 'true');
    list.appendChild(ind);
    apply(ind, {
      variant: 'clear', refraction: nav.dataset.lensRefraction ? +nav.dataset.lensRefraction : null,
      bezel: nav.dataset.lensBezel ? +nav.dataset.lensBezel : null,
      magnify: +(nav.dataset.lensMagnify || 1.16), dispersion: +(nav.dataset.lensDispersion || 0.1), blur: 0
    });
    var FAST = [640, 40], SLOW = [210, 24];
    var a = new Spring(0, { stiffness: FAST[0], damping: FAST[1] });
    var b = new Spring(0, { stiffness: FAST[0], damping: FAST[1] });
    var act = new Spring(0, { stiffness: 340, damping: 26 });
    var idx = Math.max(0, items.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
    var drag = null, settleTimer = 0;

    function edges(i) { var t = items[i]; return [t.offsetLeft, t.offsetLeft + t.offsetWidth]; }
    function tune(sp, k) { sp.stiffness = k[0]; sp.damping = k[1]; }
    function aim(L, R) {
      var dir = (L + R) / 2 - (a.target + b.target) / 2;
      if (Math.abs(dir) > 0.5 && !mqReduceMotion.matches) {
        tune(dir > 0 ? b : a, FAST); tune(dir > 0 ? a : b, SLOW);
      }
      a.to(L); b.to(R);
    }
    function place() { var e = edges(idx); a.set(e[0]); b.set(e[1]); render(); }
    function render() {
      var L = a.value, R = b.value, A = act.value;
      ind.style.translate = round(L, 2) + 'px 0';
      ind.style.width = round(Math.max(10, R - L), 2) + 'px';
      ind.style.scale = round(1 + A * 0.1, 4) + ' ' + round(1 + A * 0.24, 4);
      ind.style.setProperty('--lg-active', round(A, 3));
      ind.toggleAttribute('data-active', A > 0.02);
      var c = (L + R) / 2;
      items.forEach(function (t) {
        var tc = t.offsetLeft + t.offsetWidth / 2;
        t.style.setProperty('--lg-near', round(clamp(1 - Math.abs(tc - c) / t.offsetWidth, 0, 1), 3));
      });
    }
    var tick = function (dt) {
      var x = a.step(dt), y = b.step(dt), z = act.step(dt);
      render();
      return x || y || z || !!drag;
    };
    function select(i, fromUser) {
      i = clamp(i, 0, items.length - 1);
      var changed = i !== idx;
      idx = i;
      items.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === i ? 'true' : 'false');
        t.tabIndex = j === i ? 0 : -1;
      });
      var e = edges(i);
      aim(e[0], e[1]);
      if (fromUser && changed) {
        act.to(1);
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () { if (!drag) { act.to(0); animate(tick); } }, 260);
        nav.dispatchEvent(new CustomEvent('lg:change', { detail: { index: i, tab: items[i] }, bubbles: true }));
      }
      animate(tick);
    }
    list.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      var lr = list.getBoundingClientRect();
      drag = { x0: e.clientX, moved: false, lr: lr, k: list.offsetWidth / lr.width };
      act.to(1);
      animate(tick);
    });
    win.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x0) > 3) drag.moved = true;
      if (!drag.moved) return;
      var w = items[idx].offsetWidth, c = (e.clientX - drag.lr.left) * drag.k;
      var min = items[0].offsetLeft + w / 2, max = items[items.length - 1].offsetLeft + items[items.length - 1].offsetWidth - w / 2;
      if (c < min) c = min - Math.sqrt(min - c) * 2;   // rubber-band past the ends
      if (c > max) c = max + Math.sqrt(c - max) * 2;
      aim(c - w / 2, c + w / 2);
    }, { passive: true });
    function end(e) {
      if (!drag) return;
      var d = drag; drag = null;
      if (d.moved) {
        var c = (a.target + b.target) / 2, best = 0, bd = Infinity;
        items.forEach(function (t, j) { var dd = Math.abs(t.offsetLeft + t.offsetWidth / 2 - c); if (dd < bd) { bd = dd; best = j; } });
        select(best, true);
      } else {
        var t = e && e.target && e.target.closest ? e.target.closest('[role="tab"], .lg-tab') : null;
        var j = items.indexOf(t);
        if (j >= 0) select(j, true);
      }
      setTimeout(function () { act.to(0); animate(tick); }, 120);
      animate(tick);
    }
    win.addEventListener('pointerup', end);
    win.addEventListener('pointercancel', end);
    list.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = idx + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = idx - 1;
      else if (k === 'Home') n = 0; else if (k === 'End') n = items.length - 1;
      if (n == null) return;
      e.preventDefault(); select(n, true); items[idx].focus();
    });
    items.forEach(function (t, j) { t.tabIndex = j === idx ? 0 : -1; t.setAttribute('aria-selected', j === idx ? 'true' : 'false'); });
    new ResizeObserver(place).observe(list);
    place();
    nav.lgSelect = function (i) { select(i, true); };
  }

  // iOS 26-style switch: the knob turns into a liquid lens while touched.
  function toggle(label) {
    if (wired.has(label)) return; wired.add(label);
    var input = label.querySelector('input[type="checkbox"]');
    if (!input) return;
    input.setAttribute('role', 'switch');
    label.setAttribute('data-glass-scene', '');
    var track = el('span', 'lg-switch-track'); el('span', 'lg-switch-fill', track);
    track.setAttribute('data-glass-backdrop', '');
    var knob = el('span', 'lg-switch-knob');
    knob.setAttribute('aria-hidden', 'true');
    label.appendChild(track); label.appendChild(knob);
    apply(knob, { variant: 'clear', refraction: 8, bezel: 8, magnify: 1.25, dispersion: 0.2, blur: 0 });
    var pos = new Spring(input.checked ? 1 : 0, { stiffness: 480, damping: 34 });
    var act = new Spring(0, { stiffness: 380, damping: 24 });
    var drag = null;
    function travel() { return track.offsetWidth - knob.offsetWidth - 4; }
    function render() {
      var p = pos.value, a = act.value, T = travel();
      var stretch = mqReduceMotion.matches ? 0 : clamp(Math.abs(pos.velocity) / 40, 0, 0.25);
      knob.style.translate = round(2 + p * T, 2) + 'px 0';
      knob.style.scale = round(1 + a * 0.48 + stretch, 4) + ' ' + round(1 + a * 0.42 - stretch * 0.3, 4);
      knob.style.setProperty('--lg-active', round(a, 3));
      knob.setAttribute('data-lg-lens', a > 0.02 ? 'on' : 'off');
      label.style.setProperty('--lg-on', round(clamp(p, 0, 1), 3));
    }
    var tick = function (dt) { var a = pos.step(dt), b = act.step(dt); render(); return a || b || !!drag; };
    var fromPointer = false;
    label.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || input.disabled) return;
      fromPointer = true;
      drag = { x0: e.clientX, p0: pos.target, moved: false, k: label.offsetWidth / label.getBoundingClientRect().width };
      act.to(1); animate(tick);
    });
    win.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = (e.clientX - drag.x0) * drag.k;
      if (Math.abs(dx) > 3) drag.moved = true;
      if (drag.moved) pos.to(clamp(drag.p0 + dx / travel(), -0.08, 1.08));
    }, { passive: true });
    function end() {
      if (!drag) return;
      var d = drag; drag = null;
      var next = d.moved ? pos.target > 0.5 : !input.checked;
      if (next !== input.checked) {
        input.checked = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      pos.to(next ? 1 : 0);
      setTimeout(function () { act.to(0); animate(tick); }, 90);
      animate(tick);
    }
    win.addEventListener('pointerup', end);
    win.addEventListener('pointercancel', end);
    label.addEventListener('click', function (e) {
      if (fromPointer) { e.preventDefault(); fromPointer = false; }
    });
    input.addEventListener('change', function () { pos.to(input.checked ? 1 : 0); animate(tick); });
    new ResizeObserver(render).observe(label);
    render();
  }

  // Slider: native <input type=range> for a11y, glass thumb while dragging.
  function slider(wrap) {
    if (wired.has(wrap)) return; wired.add(wrap);
    var input = wrap.querySelector('input[type="range"]');
    if (!input) return;
    wrap.setAttribute('data-glass-scene', '');
    var track = el('span', 'lg-slider-track'); var fill = el('span', 'lg-slider-fill', track);
    track.setAttribute('data-glass-backdrop', '');
    var knob = el('span', 'lg-slider-knob');
    knob.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(track, input); wrap.insertBefore(knob, input);
    apply(knob, { variant: 'clear', refraction: 6, bezel: 7, magnify: 1.18, dispersion: 0.15, blur: 0 });
    function frac() { var a = +input.min || 0, b = +input.max || 100; return (input.value - a) / ((b - a) || 1); }
    var pos = new Spring(frac(), { stiffness: 900, damping: 50 });
    var act = new Spring(0, { stiffness: 360, damping: 24 });
    var down = false;
    function render() {
      var W = wrap.offsetWidth, kw = knob.offsetWidth, p = pos.value;
      var stretch = mqReduceMotion.matches ? 0 : clamp(Math.abs(pos.velocity) / 9, 0, 0.3);
      knob.style.translate = round(p * (W - kw), 2) + 'px -50%';
      knob.style.scale = round(1 + act.value * 0.5 + stretch, 4) + ' ' + round(1 + act.value * 0.5 - stretch * 0.3, 4);
      knob.style.setProperty('--lg-active', round(act.value, 3));
      knob.setAttribute('data-lg-lens', act.value > 0.02 ? 'on' : 'off');
      fill.style.width = round(kw / 2 + p * (W - kw), 2) + 'px';
    }
    var tick = function (dt) { var a = pos.step(dt), b = act.step(dt); render(); return a || b || down; };
    input.addEventListener('input', function () { pos.to(frac()); animate(tick); });
    input.addEventListener('pointerdown', function () { down = true; act.to(1); animate(tick); });
    function up() { if (!down) return; down = false; act.to(0); animate(tick); }
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', up);
    new ResizeObserver(render).observe(wrap);
    render();
  }

  // Menu: a glass button that morphs into a glass panel.
  function menu(wrap) {
    if (wired.has(wrap)) return; wired.add(wrap);
    var trigger = wrap.querySelector('[aria-haspopup]') || wrap.querySelector('button');
    var panel = wrap.querySelector('.lg-menu-panel');
    if (!trigger || !panel) return;
    var items = Array.prototype.slice.call(panel.querySelectorAll('[role^="menuitem"], button, a'));
    var p = new Spring(0, { stiffness: 420, damping: 32 });
    var open = false;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    function geometry() {
      var tr = trigger.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var below = (wrap.dataset.placement || 'bottom') !== 'top';
      panel.style.left = round(trigger.offsetLeft) + 'px';
      if (below) { panel.style.top = round(trigger.offsetTop) + 'px'; panel.style.bottom = ''; panel.style.transformOrigin = 'top left'; }
      else { panel.style.bottom = round(wrap.offsetHeight - trigger.offsetTop - trigger.offsetHeight) + 'px'; panel.style.top = ''; panel.style.transformOrigin = 'bottom left'; }
      return { tw: tr.width, th: tr.height, wr: wr };
    }
    var g = null;
    function render() {
      var v = clamp(p.value, -0.2, 1.2);
      var pw = panel.offsetWidth || 1, ph = panel.offsetHeight || 1;
      var sx = lerp(g.tw / pw, 1, v), sy = lerp(g.th / ph, 1, v);
      panel.style.scale = round(Math.max(0.01, sx), 4) + ' ' + round(Math.max(0.01, sy), 4);
      panel.style.setProperty('--lg-open', round(clamp(v, 0, 1), 3));
      trigger.style.setProperty('--lg-open', round(clamp(v, 0, 1), 3));
    }
    var tick = function (dt) {
      var alive = p.step(dt); render();
      if (!alive && !open) { panel.hidden = true; wrap.removeAttribute('data-open'); }
      return alive;
    };
    function setOpen(next, focus) {
      if (next === open) return;
      open = next;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.hidden = false; wrap.setAttribute('data-open', '');
        g = geometry(); p.set(0); render(); p.to(1);
        if (focus !== false && items[0]) setTimeout(function () { items[0].focus({ preventScroll: true }); }, 60);
      } else {
        p.to(0);
        if (focus !== false) trigger.focus({ preventScroll: true });
      }
      animate(tick);
    }
    trigger.addEventListener('click', function () { setOpen(!open); });
    doc.addEventListener('pointerdown', function (e) { if (open && !wrap.contains(e.target)) setOpen(false, false); });
    wrap.addEventListener('keydown', function (e) {
      if (!open) return;
      var i = items.indexOf(doc.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    items.forEach(function (it) {
      it.addEventListener('click', function () {
        wrap.dispatchEvent(new CustomEvent('lg:select', { detail: { item: it, value: it.dataset.value || it.textContent.trim() }, bubbles: true }));
        setOpen(false);
      });
    });
    wrap.lgOpen = function (v) { setOpen(v !== false); };
  }

  // Progressive blur / scroll-edge effect: stacked blur layers with feathered masks.
  function progressiveBlur(node) {
    if (wired.has(node)) return; wired.add(node);
    var n = +(node.dataset.layers || 6), max = +(node.dataset.blur || 24);
    var dir = node.dataset.direction || 'top';
    var to = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' }[dir] || 'to top';
    var step = 100 / (n + 1);
    for (var i = 0; i < n; i++) {
      var s = el('span', 'lg-pb-layer', node);
      var b = round(max / Math.pow(2, n - 1 - i), 2);
      var a = i * step, c = (i + 1) * step, d = (i + 2) * step;
      var mask = 'linear-gradient(' + to + ', rgba(0,0,0,0) ' + round(a) + '%, #000 ' + round(c) + '%' + (i < n - 1 ? ', #000 ' + round(d) + '%, rgba(0,0,0,0) ' + round(Math.min(100, d + step)) + '%' : '') + ')';
      s.style.backdropFilter = s.style.webkitBackdropFilter = 'blur(' + b + 'px)';
      s.style.webkitMaskImage = s.style.maskImage = mask;
    }
    var tint = el('span', 'lg-pb-tint', node);
    tint.style.background = 'linear-gradient(' + to + ', transparent, var(--lg-pb-tint, rgba(0,0,0,.35)))';
  }

  // Draggable glass (lenses, droplets): throw it and it glides with momentum.
  function draggable(node) {
    if (wired.has(node)) return; wired.add(node);
    node.classList.add('lg-draggable');
    node.style.touchAction = 'none';
    var drag = null, vx = 0, vy = 0, lastT = 0;
    function bounds() {
      var p = node.offsetParent || doc.body;
      return { w: p.clientWidth - node.offsetWidth, h: p.clientHeight - node.offsetHeight };
    }
    function put(l, t) { node.style.left = round(l, 1) + 'px'; node.style.top = round(t, 1) + 'px'; node.style.right = 'auto'; node.style.bottom = 'auto'; wakeGroupOf(node); }
    node.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      try { node.setPointerCapture(e.pointerId); } catch (_) {}
      drag = { x: e.clientX, y: e.clientY, l: node.offsetLeft, t: node.offsetTop, k: node.offsetWidth / node.getBoundingClientRect().width || 1 };
      vx = vy = 0; lastT = win.performance.now();
      node.setAttribute('data-dragging', '');
    });
    node.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = win.performance.now(), dt = Math.max(8, now - lastT) / 1000;
      var b = bounds();
      var l = drag.l + (e.clientX - drag.x) * drag.k, t = drag.t + (e.clientY - drag.y) * drag.k;
      // rubber-band outside the parent
      if (l < 0) l = -Math.sqrt(-l) * 3; if (l > b.w) l = b.w + Math.sqrt(l - b.w) * 3;
      if (t < 0) t = -Math.sqrt(-t) * 3; if (t > b.h) t = b.h + Math.sqrt(t - b.h) * 3;
      vx = vx * 0.4 + (l - node.offsetLeft) / dt * 0.6; vy = vy * 0.4 + (t - node.offsetTop) / dt * 0.6;
      lastT = now;
      put(l, t);
    });
    function release() {
      if (!drag) return;
      drag = null;
      node.removeAttribute('data-dragging');
      if (mqReduceMotion.matches) { vx = vy = 0; }
      var x = node.offsetLeft, y = node.offsetTop;
      var sx = new Spring(x, { stiffness: 170, damping: 22 }), sy = new Spring(y, { stiffness: 170, damping: 22 });
      animate(function (dt) {
        if (drag) return false;
        var b = bounds();
        vx *= Math.exp(-dt * 4.5); vy *= Math.exp(-dt * 4.5);
        x += vx * dt; y += vy * dt;
        var cx = clamp(x, 0, b.w), cy = clamp(y, 0, b.h);
        if (cx !== x) { sx.value = x; sx.velocity = vx; sx.to(cx); x = cx; vx = 0; }
        if (cy !== y) { sy.value = y; sy.velocity = vy; sy.to(cy); y = cy; vy = 0; }
        var a = sx.step(dt), c = sy.step(dt);
        put(a ? sx.value : x, c ? sy.value : y);
        if (!a) sx.set(x); if (!c) sy.set(y);
        return a || c || Math.abs(vx) + Math.abs(vy) > 8;
      });
    }
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);
    node.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 40 : 10, m = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
      if (!m) return;
      e.preventDefault();
      var b = bounds();
      put(clamp(node.offsetLeft + m[0], 0, b.w), clamp(node.offsetTop + m[1], 0, b.h));
    });
  }

  /* ------------------------------------------------------------------ *
   * Glass group — Apple's GlassEffectContainer. Every glass element inside
   * is rendered as ONE liquid surface: shapes are combined with a smooth
   * union of signed distance fields, so neighbours melt together with a
   * neck as they approach and pinch apart as they separate (the "morph").
   * The union field is re-solved only while something moves.
   * ------------------------------------------------------------------ */

  var groups = new Map();
  // members that move or scale (springs, drags) keep their group awake
  function wakeGroupOf(node) {
    var g = node.parentElement && node.parentElement.closest(GROUP_SELECTOR);
    if (g && groups.has(g)) groups.get(g).wake();
  }

  function sdRoundBox(px, py, hw, hh, r) {
    var qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function Group(node, opts) {
    this.el = node; this.id = ++uid; this.userOpts = opts || {};
    this.opts = resolveOptions(node, this.userOpts);
    this.merge = +(node.dataset.glassMerge || this.userOpts.merge || 24);
    groups.set(node, this);
    node.classList.add('lg-group-ready');
    if (win.getComputedStyle(node).position === 'static') node.style.position = 'relative';
    var L = this.layer = el('span', 'lg-group-layer');
    L.setAttribute('aria-hidden', 'true');
    this.shadowWrap = el('span', 'lg-g-shadow', L);
    this.tint = el('span', 'lg-g-tint', this.shadowWrap);
    this.refract = el('span', 'lg-g-refract', L);
    this.shade = el('span', 'lg-g-shade', L);
    node.insertBefore(L, node.firstChild);
    this.sig = '';
    var self = this;
    this.tick = function () { return self.update(); };
    this.idle = 0;
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) { self.visible = es[es.length - 1].isIntersecting; if (self.visible) self.wake(); }, { rootMargin: '100px' }).observe(node);
    }
    this.visible = true;
    this.ro = new ResizeObserver(function () { self.wake(); });
    this.ro.observe(node);
    this.wake();
    bindLight(defaults.light);
  }
  Group.prototype.wake = function () { this.idle = 0; animate(this.tick); };
  Group.prototype.members = function () {
    var self = this;
    return Array.prototype.filter.call(this.el.querySelectorAll('.lg-ready'), function (m) {
      return m.parentElement.closest(GROUP_SELECTOR) === self.el && m.offsetWidth && !m.hidden;
    });
  };
  Group.prototype.update = function () {
    if (!this.el.isConnected) return false;
    var ms = this.members();
    var gr = this.el.getBoundingClientRect();
    var k = gr.width ? this.el.offsetWidth / gr.width : 1;
    var shapes = ms.map(function (m) {
      var r = m.getBoundingClientRect(), lw = m.offsetWidth || 1;
      var sc = r.width / lw / k;
      return { x: (r.left - gr.left) * k, y: (r.top - gr.top) * k, w: r.width * k, h: r.height * k,
               r: radiusOf(m, m.offsetWidth, m.offsetHeight) * sc };
    });
    var sig = shapes.map(function (s) { return [round(s.x, 1), round(s.y, 1), round(s.w, 1), round(s.h, 1), round(s.r, 1)].join(','); }).join(';') + '|' + this.el.getAttribute('data-glass-appearance');
    if (sig !== this.sig) { this.sig = sig; this.idle = 0; this.draw(shapes); }
    else this.idle++;
    // keep polling briefly after the last change (springs/CSS transitions), then sleep
    return this.visible && this.idle < 45;
  };
  Group.prototype.draw = function (shapes) {
    var L = this.layer, o = this.opts;
    if (!shapes.length) { L.style.display = 'none'; return; }
    L.style.display = '';
    var P = Math.ceil(this.merge + 4);
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, minDim = Infinity;
    shapes.forEach(function (s) {
      x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h);
      minDim = Math.min(minDim, s.w, s.h);
    });
    x0 -= P; y0 -= P; x1 += P; y1 += P;
    var w = Math.ceil(x1 - x0), h = Math.ceil(y1 - y0);
    L.style.left = round(x0) + 'px'; L.style.top = round(y0) + 'px';
    L.style.width = w + 'px'; L.style.height = h + 'px';

    var opt = optics(o, minDim, minDim);
    var bez = opt.bezel, R = opt.refraction, lut = profileLUT(o.curvature);
    var s = clamp(Math.sqrt(160000 / (w * h)), 0.5, 1);
    var W = Math.max(2, Math.round(w * s)), H = Math.max(2, Math.round(h * s));
    var sx = W / w, sy = H / h, K = Math.max(1, this.merge * 2); // bridges form once the gap < merge
    var n = shapes.length, sh = shapes.map(function (q) {
      var r = Math.min(q.r, q.w / 2, q.h / 2);
      return { cx: q.x - x0 + q.w / 2, cy: q.y - y0 + q.h / 2, hw: q.w / 2, hh: q.h / 2, r: r };
    });
    // 1) union signed distance field (polynomial smooth-min)
    var SD = new Float32Array(W * H);
    for (var j = 0; j < H; j++) {
      var py = (j + 0.5) / sy;
      for (var i = 0; i < W; i++) {
        var px = (i + 0.5) / sx, d = 1e9;
        for (var m = 0; m < n; m++) {
          var q = sh[m], dm = sdRoundBox(px - q.cx, py - q.cy, q.hw, q.hh, q.r);
          var hk = Math.max(K - Math.abs(d - dm), 0) / K;
          d = Math.min(d, dm) - hk * hk * K * 0.25;
        }
        SD[j * W + i] = d;
      }
    }
    // 2) displacement, mask and lighting from the field and its gradient
    var mk = function () { var c = doc.createElement('canvas'); c.width = W; c.height = H; return c; };
    var cd = mk(), cm = mk(), cs = mk();
    var xd = cd.getContext('2d'), xm = cm.getContext('2d'), xs = cs.getContext('2d');
    var id = xd.createImageData(W, H), im = xm.createImageData(W, H), is = xs.createImageData(W, H);
    var D = id.data, M = im.data, S = is.data;
    var kk = 127.5 / Math.max(1, R), aa = Math.min(sx, sy);
    var ang = (parseFloat(win.getComputedStyle(doc.documentElement).getPropertyValue('--lg-light-angle')) || -45) * Math.PI / 180;
    var lx = Math.sin(ang), ly = -Math.cos(ang); // light direction in screen space
    var dark = this.el.closest('[data-glass-appearance="dark"]') ? 0.6 : 1;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var ix = y * W + x, v = SD[ix];
        var gx = (SD[y * W + Math.min(W - 1, x + 1)] - SD[y * W + Math.max(0, x - 1)]) * sx;
        var gy = (SD[Math.min(H - 1, y + 1) * W + x] - SD[Math.max(0, y - 1) * W + x]) * sy;
        var gl = Math.sqrt(gx * gx + gy * gy) || 1, nx = gx / gl, ny = gy / gl;
        var t = clamp(-v / bez, 0, 1);
        var fi = t * 255, i0 = fi | 0, f = lut[i0] + (lut[Math.min(255, i0 + 1)] - lut[i0]) * (fi - i0);
        var sad = clamp((gl - 0.08) / 0.4, 0, 1); // fade out at saddle points (gradient → 0)
        var mag = f * R * sad * sad * (3 - 2 * sad), p4 = ix * 4;
        D[p4] = clamp(Math.round(127.5 - nx * mag * kk), 0, 255);
        D[p4 + 1] = clamp(Math.round(127.5 - ny * mag * kk), 0, 255);
        D[p4 + 2] = 128; D[p4 + 3] = 255;
        var cov = clamp(0.5 - v * aa, 0, 1);
        M[p4] = M[p4 + 1] = M[p4 + 2] = 255; M[p4 + 3] = Math.round(cov * 255);
        if (cov > 0) {
          // specular rim: two lobes facing the light and its reflection
          var facing = nx * lx + ny * ly;
          var rimW = clamp(1 - Math.abs(v + 0.8) / 1.4, 0, 1);
          var lobe = Math.pow(Math.abs(facing), 3);
          var bevel = (1 - t) * (1 - t) * Math.max(0, -facing) * 0.18;
          var a = (rimW * (0.18 + 0.82 * lobe) * (facing < 0 ? 1 : 0.7) + bevel) * cov * dark;
          S[p4] = S[p4 + 1] = S[p4 + 2] = 255; S[p4 + 3] = Math.round(clamp(a, 0, 1) * 255);
        }
      }
    }
    xd.putImageData(id, 0, 0); xm.putImageData(im, 0, 0); xs.putImageData(is, 0, 0);
    var disp = cd.toDataURL('image/png'), mask = 'url("' + cm.toDataURL('image/png') + '")';
    [this.refract, this.tint].forEach(function (e) {
      e.style.webkitMaskImage = e.style.maskImage = mask;
    });
    this.shade.style.backgroundImage = 'url("' + cs.toDataURL('image/png') + '")';
    this.el.style.setProperty('--lg-g-blur', o.blur + 'px');

    // refraction (Chromium); elsewhere the masked layer is a frosted fallback
    var rs = this.refract.style;
    if (supports.backdropRefraction && !mqReduceTransparency.matches && !mqMoreContrast.matches) {
      if (!this.filter) {
        this.filter = makeFilter('lg-group-' + this.id, {
          x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
          'color-interpolation-filters': 'sRGB'
        }, '<feImage preserveAspectRatio="none" result="map" x="0" y="0"/>' +
           '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/>');
        this.fImg = this.filter.querySelector('feImage');
        this.fDm = this.filter.querySelector('feDisplacementMap');
      }
      this.filter.setAttribute('width', w); this.filter.setAttribute('height', h);
      this.fImg.setAttribute('width', w); this.fImg.setAttribute('height', h);
      this.fImg.setAttribute('href', disp);
      this.fDm.setAttribute('scale', round(2 * R));
      var bf = (o.blur > 0.05 ? 'blur(' + o.blur + 'px) ' : '') + 'url(#' + this.filter.id + ') saturate(' + o.saturation + ') brightness(' + o.brightness + ') contrast(' + o.contrast + ')';
      if (rs.backdropFilter !== bf) { rs.backdropFilter = bf; rs.webkitBackdropFilter = bf; }
      else { rs.backdropFilter = ''; void this.refract.offsetWidth; rs.backdropFilter = bf; }
    } else {
      var fb = 'blur(' + Math.max(o.blur * 2, 10) + 'px) saturate(' + o.saturation + ')';
      rs.backdropFilter = rs.webkitBackdropFilter = fb;
    }
  };

  function group(node) {
    if (groups.has(node)) return groups.get(node);
    return new Group(node);
  }

  var COMPONENTS = [
    ['.lg-tabs', tabs],
    ['.lg-switch', toggle],
    ['.lg-slider', slider],
    ['.lg-menu', menu],
    ['.lg-progressive-blur', progressiveBlur],
    ['[data-glass-draggable]', draggable],
    [GROUP_SELECTOR, group]
  ];

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */

  var GLASS_SELECTOR = '.glass, [data-glass]';

  function apply(node, opts) {
    if (!node || node.nodeType !== 1) return null;
    if (node.matches(GROUP_SELECTOR)) return group(node);
    var g = instances.get(node);
    if (g) return opts ? g.update(opts) : g;
    return new Glass(node, opts);
  }
  function destroy(node) { var g = instances.get(node); if (g) g.destroy(); }
  function scan(rootNode) {
    rootNode = rootNode || doc;
    COMPONENTS.forEach(function (c) {
      if (rootNode.matches && rootNode.matches(c[0])) c[1](rootNode);
      Array.prototype.forEach.call(rootNode.querySelectorAll ? rootNode.querySelectorAll(c[0]) : [], c[1]);
    });
    if (rootNode.matches && rootNode.matches(GLASS_SELECTOR)) apply(rootNode);
    Array.prototype.forEach.call(rootNode.querySelectorAll ? rootNode.querySelectorAll(GLASS_SELECTOR) : [], function (n) { apply(n); });
  }

  var observer = null, initialized = false;
  function init(opts) {
    if (opts) assign(defaults, opts);
    if (initialized) { scan(doc); return api; }
    initialized = true;
    doc.documentElement.classList.add('lg-js', supports.backdropRefraction ? 'lg-refraction-backdrop' : 'lg-refraction-scene');
    scan(doc);
    observer = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && !n.classList.contains('lg-layers')) scan(n); });
        Array.prototype.forEach.call(m.removedNodes, function (n) {
          if (n.nodeType !== 1 || n.classList.contains('lg-layers')) return;
          if (instances.has(n) && !n.isConnected) destroy(n);
          if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.lg-ready'), function (c) { if (!c.isConnected) destroy(c); });
        });
      });
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    function rerender() { mapCache.clear(); doc.querySelectorAll('.lg-ready').forEach(function (n) { var g = instances.get(n); if (g) { g.lastSig = ''; g.render(); } }); }
    [mqReduceTransparency, mqMoreContrast].forEach(function (q) { if (q.addEventListener) q.addEventListener('change', rerender); });
    return api;
  }

  var api = {
    version: VERSION,
    supports: supports,
    defaults: defaults,
    variants: VARIANTS,
    init: init,
    apply: apply,
    get: function (node) { return instances.get(node) || null; },
    destroy: destroy,
    refresh: function (node) {
      if (node) { var g = instances.get(node); if (g) { g.lastSig = ''; g.render(); } return; }
      scan(doc);
      doc.querySelectorAll('.lg-ready').forEach(function (n) { var g = instances.get(n); if (g) { g.lastSig = ''; g.render(); } });
    },
    profile: function (curvature) { return Array.prototype.slice.call(profileLUT(curvature || 4)); },
    displacementMap: function (w, h, r, opts) { return makeMap(w, h, r, optics(resolveOptions(doc.createElement('div'), opts), w, h)); },
    Spring: Spring,
    animate: animate,
    group: group,
    components: { tabs: tabs, switch: toggle, slider: slider, menu: menu, progressiveBlur: progressiveBlur, draggable: draggable }
  };

  // Auto-init unless the script tag opts out with data-manual.
  var current = doc.currentScript;
  if (!(current && current.hasAttribute('data-manual'))) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); });
    else init();
  }

  return api;
});
