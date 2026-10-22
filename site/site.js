/* Gallery site behaviour (not part of the library) */
(function () {
  'use strict';
  // ?mode=scene | backdrop | fallback — force a renderer (handy for testing)
  var forced = new URLSearchParams(location.search).get('mode');
  if (forced && window.LiquidGlass) LiquidGlass.defaults.mode = forced;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- tiny HTML highlighter ---------- */
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function span(c, s) { return '<span class="tok-' + c + '">' + esc(s) + '</span>'; }
  function highlight(src) {
    var re = /(<!--[\s\S]*?-->|\/\/[^\n]*)|(<\/?[a-zA-Z][\w-]*)|(\s[a-zA-Z_:@][\w:.-]*)(?==)|("[^"]*"|'[^']*')|(\/?>)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = m.index + m[0].length;
      if (m[1]) out += span('com', m[0]);
      else if (m[2]) out += span('tag', m[0]);
      else if (m[3]) out += span('attr', m[0]);
      else if (m[4]) out += span('str', m[0]);
      else out += span('tag', m[0]);
    }
    return out + esc(src.slice(last));
  }
  function dedent(s) {
    s = s.replace(/^\n+|\s+$/g, '').replace(/<\\\/script>/g, '</script>');
    var lines = s.split('\n');
    var min = Math.min.apply(null, lines.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^ */)[0].length; }));
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }

  /* ---------- copy buttons ---------- */
  function wireCopy(btn, getText) {
    btn.addEventListener('click', function () {
      var t = getText();
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
        btn.textContent = 'Copiado ✓';
      }, function () { btn.textContent = 'Selecione e copie'; });
      setTimeout(function () { btn.textContent = 'Copiar'; }, 1600);
    });
  }
  $$('.copy[data-copy]').forEach(function (b) {
    wireCopy(b, function () { return $(b.getAttribute('data-copy')).textContent; });
  });

  /* ---------- Preview / Code toggle on every stage ---------- */
  $$('.stage').forEach(function (stage, i) {
    var src = $('script.src', stage), view = $('.code-view', stage);
    if (!src || !view) return;
    var code = dedent(src.textContent);
    view.innerHTML = '<pre class="code">' + highlight(code) + '</pre><button class="copy">Copiar</button>';
    wireCopy($('.copy', view), function () { return code; });
    var seg = document.createElement('nav');
    seg.className = 'glass lg-tabs stage-corner';
    seg.setAttribute('aria-label', 'Prévia ou código');
    seg.setAttribute('data-glass-appearance', 'dark');
    seg.innerHTML = '<div class="lg-tabs-list" role="tablist">' +
      '<button role="tab" aria-selected="true">Prévia</button>' +
      '<button role="tab">Código</button></div>';
    stage.appendChild(seg);
    seg.addEventListener('lg:change', function (e) {
      stage.setAttribute('data-view', e.detail.index === 1 ? 'code' : 'preview');
    });
  });

  /* ---------- Hero: keep actions right under the lead paragraph ---------- */
  var hero = $('.hero'), lead = $('.hero .lead'), actions = $('#hero-actions');
  function placeActions() {
    if (!hero || !lead || !actions) return;
    var hr = hero.getBoundingClientRect();
    var top = lead.getBoundingClientRect().bottom - hr.top + 34;
    actions.style.setProperty('--actions-top', Math.round(top) + 'px');
    var h1 = $('.hero h1'), lens = $('.hero-lens');
    if (h1 && lens && !lens.style.top) {
      var r = h1.getBoundingClientRect(), fs = parseFloat(getComputedStyle(h1).fontSize);
      lens.style.setProperty('--lens-top', Math.round(r.top - hr.top + fs * 0.44 - lens.offsetHeight / 2) + 'px');
    }
  }
  placeActions();
  addEventListener('resize', placeActions);
  if (document.fonts) document.fonts.ready.then(placeActions);

  /* ---------- Player toggles ---------- */
  $$('.like').forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
  });
  $$('.playpause').forEach(function (b) {
    b.addEventListener('click', function () {
      var playing = b.getAttribute('aria-label') === 'Pausar';
      b.setAttribute('aria-label', playing ? 'Tocar' : 'Pausar');
      $('use', b).setAttribute('href', playing ? '#i-play' : '#i-pause');
    });
  });
  $$('.lg-toolbar > button[aria-pressed]').forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
  });

  $$('.cc .lg-switch input').forEach(function (inp) {
    var small = inp.closest('.cc-row').querySelector('small');
    if (!small || !/ativado/i.test(small.textContent)) return;
    inp.addEventListener('change', function () { small.textContent = inp.checked ? 'Ativado' : 'Desativado'; });
  });

  /* ---------- Library grid (procedural covers, fictional albums) ---------- */
  var albums = [
    ['Maré Alta', 'Os Satélites'], ['Órbita Baixa', 'Kiko Nebulosa'], ['Neon 88', 'Velvet Static'], ['Pôr do Sol em Marte', 'Duna'],
    ['Fita Cassete', 'Lia & os Ecos'], ['Atlântico', 'Brisa Norte'], ['Xadrez', 'Monocromo'], ['Cometa', 'Ana Prisma'],
    ['Chuva Ácida', 'Os Satélites'], ['Vapor', 'Velvet Static'], ['Cidade Luz', 'Kiko Nebulosa'], ['Gravidade', 'Duna'],
    ['Lua Nova', 'Brisa Norte'], ['Ruído Rosa', 'Lia & os Ecos'], ['Eclipse', 'Ana Prisma'], ['Horizonte', 'Monocromo']
  ];
  var grid = $('#lib-grid');
  if (grid) {
    grid.innerHTML = albums.map(function (a, i) {
      return '<figure><div class="cv art-' + ((i % 9) + 1) + '"></div><figcaption>' + a[0] + '<span>' + a[1] + '</span></figcaption></figure>';
    }).join('');
    var libTabs = $('.lib-head .lg-tabs');
    libTabs.addEventListener('lg:change', function (e) {
      $('#lib-phone').setAttribute('data-layout', e.detail.tab.getAttribute('data-layout'));
    });
  }

  /* ---------- Morph: a button buds out of the toolbar ---------- */
  var add = $('#morph-add'), bud = $('#morph-bud'), mg = $('#morph-group');
  if (add && bud && window.LiquidGlass) {
    var out = false;
    var mx = new LiquidGlass.Spring(-46, { stiffness: 190, damping: 17 });
    var ms = new LiquidGlass.Spring(0.55, { stiffness: 260, damping: 20 });
    var budIcon = bud.querySelector('svg');
    var paint = function () {
      bud.style.transform = 'translateX(' + mx.value.toFixed(2) + 'px) scale(' + ms.value.toFixed(4) + ')';
      // the icon only appears once the droplet has budded out of the bar
      var p = (mx.value + 46) / 104;
      budIcon.style.opacity = Math.max(0, Math.min(1, (p - 0.45) / 0.4)).toFixed(3);
      bud.style.pointerEvents = p > 0.6 ? '' : 'none'; // tucked in: let clicks reach the + button
    };
    bud.setAttribute('aria-hidden', 'true');
    paint();
    var budTick = function (dt) {
      var a = mx.step(dt), b = ms.step(dt); paint(); LiquidGlass.group(mg).wake(); return a || b;
    };
    add.addEventListener('click', function () {
      out = !out;
      add.setAttribute('aria-expanded', String(out));
      bud.tabIndex = out ? 0 : -1;
      if (out) bud.removeAttribute('aria-hidden'); else bud.setAttribute('aria-hidden', 'true');
      mx.to(out ? 58 : -46); ms.to(out ? 1 : 0.55);
      LiquidGlass.animate(budTick);
    });
  }

  /* ---------- Menu feedback ---------- */
  $$('.lg-menu').forEach(function (m) {
    m.addEventListener('lg:select', function (e) { console.log('[liquid-glass] menu:', e.detail.value); });
  });

  /* ---------- Playground ---------- */
  var target = $('#pg-target');
  if (target) {
    var state = { variant: 'regular', refraction: 20, bezel: 16, magnify: 1, dispersion: 0, blur: 7, radius: 75, tint: '', dark: true };
    var fmt = function (k, v) {
      var u = $('input[data-k="' + k + '"]').getAttribute('data-u');
      return (k === 'magnify' ? (+v).toFixed(2).replace(/\.?0+$/, '') : v) + u;
    };
    function code() {
      var a = ['class="glass"'];
      if (state.variant === 'clear') a.push('data-glass="clear"');
      a.push('data-glass-refraction="' + state.refraction + '"');
      a.push('data-glass-bezel="' + state.bezel + '"');
      if (state.magnify !== 1) a.push('data-glass-magnify="' + state.magnify + '"');
      if (state.dispersion) a.push('data-glass-dispersion="' + state.dispersion + '"');
      var defBlur = state.variant === 'clear' ? 0.5 : 7;
      if (state.blur !== defBlur) a.push('data-glass-blur="' + state.blur + '"');
      if (state.tint) a.push('data-glass-tint="' + state.tint + '"');
      a.push('data-glass-interactive');
      a.push('style="border-radius:' + state.radius + 'px"');
      return '<div ' + a.join('\n     ') + '>\n  Liquid Glass\n</div>';
    }
    var vizMap = $('#viz-map');
    function apply() {
      target.style.borderRadius = state.radius + 'px';
      target.setAttribute('data-glass-appearance', state.dark ? 'dark' : 'light');
      LiquidGlass.apply(target, {
        variant: state.variant, refraction: state.refraction, bezel: state.bezel, magnify: state.magnify,
        dispersion: state.dispersion, blur: state.blur, tint: state.tint || null
      });
      if (!state.tint) { var g = LiquidGlass.get(target); if (g) { delete g.userOpts.tint; g.update({}); } }
      $('#pg-code').innerHTML = highlight(code());
      if (vizMap) {
        var m = LiquidGlass.displacementMap(target.offsetWidth, target.offsetHeight, Math.min(state.radius, target.offsetHeight / 2), {
          refraction: state.refraction, bezel: state.bezel, magnify: state.magnify
        });
        vizMap.src = m.disp;
      }
    }
    $$('#pg-panel input[type=range]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-k');
        state[k] = +inp.value;
        $('output[data-for="' + k + '"]').textContent = fmt(k, inp.value);
        apply();
      });
    });
    $('#pg-variant').addEventListener('lg:change', function (e) {
      state.variant = e.detail.tab.getAttribute('data-v');
      var blur = state.variant === 'clear' ? 0.5 : 7;
      var b = $('#pg-blur'); b.value = blur; state.blur = blur;
      b.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $$('#pg-tints button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#pg-tints button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        state.tint = b.getAttribute('data-tint'); apply();
      });
    });
    $$('#pg-bgs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#pg-bgs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#pg-bg').className = 'bg ' + b.getAttribute('data-bg');
      });
    });
    $('#pg-dark').addEventListener('change', function (e) { state.dark = e.target.checked; apply(); });
    // wait for the library to attach, then sync
    requestAnimationFrame(function () { requestAnimationFrame(apply); });
  }

  /* ---------- Profile viz ---------- */
  var cv = $('#viz-profile');
  if (cv && window.LiquidGlass) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, P = 34;
    var lut = LiquidGlass.profile(4);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // bevel height (squircle) in gray
    ctx.beginPath();
    for (var i = 0; i <= 200; i++) {
      var t = i / 200, z = Math.pow(1 - Math.pow(1 - t, 4), 1 / 4);
      var x = P + t * (W - 2 * P), y = H - P - z * (H - 2 * P) * 0.55;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineTo(W - P, H - P); ctx.lineTo(P, H - P); ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(160,200,255,.45)'); g.addColorStop(1, 'rgba(160,200,255,.05)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(200,225,255,.8)'; ctx.lineWidth = 2; ctx.stroke();
    // displacement curve
    ctx.beginPath();
    lut.forEach(function (v, i) {
      var x = P + i / (lut.length - 1) * (W - 2 * P), y = H - P - v * (H - 2 * P);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.font = '600 22px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffd479'; ctx.fillText('deslocamento (perfil sem dobras)', P + 70, P + 40);
    ctx.fillStyle = 'rgba(200,225,255,.9)'; ctx.fillText('altura do bisel', W - P - 170, H - P - 150);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '500 18px -apple-system, system-ui, sans-serif';
    ctx.fillText('borda', P, H - 8); ctx.fillText('centro', W - P - 54, H - 8);
  }
})();
