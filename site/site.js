/* Gallery interactions (not part of the library) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LG = window.LiquidGlass, Spring = LG.Spring, animate = LG.animate;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var fmt = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- particles ---------- */
  function burst(stage, x, y, colors, n) {
    if (reduce) return;
    var r = stage.getBoundingClientRect(), parts = [];
    for (var i = 0; i < (n || 26); i++) {
      var p = document.createElement('span');
      p.className = 'confetti';
      p.style.background = colors[i % colors.length];
      p.style.left = (x - r.left) + 'px'; p.style.top = (y - r.top) + 'px';
      stage.appendChild(p);
      var a = Math.random() * Math.PI * 2, s = 260 + Math.random() * 380;
      parts.push({ el: p, x: 0, y: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 260, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 900, life: 1 });
    }
    animate(function (dt) {
      var alive = false;
      parts.forEach(function (q) {
        if (q.life <= 0) return;
        q.vy += 1100 * dt; q.vx *= 0.985; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; q.life -= dt * 0.8;
        q.el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px) rotate(' + q.rot + 'deg)';
        q.el.style.opacity = Math.max(0, q.life);
        if (q.life <= 0) q.el.remove(); else alive = true;
      });
      return alive;
    });
  }
  var center = function (el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  /* ---------- per-stage customize menu ---------- */
  var TINTS = [['Nenhuma', null], ['Azul', '#0a84ff'], ['Rosa', '#ff375f'], ['Verde', '#30d158'], ['Roxo', '#bf5af2']];
  $$('.stage[data-custom]').forEach(function (stage) {
    var state = { variant: 'regular', dark: stage.getAttribute('data-glass-appearance') === 'dark', tint: 0 };
    var wrap = document.createElement('div');
    wrap.className = 'lg-menu custom';
    wrap.setAttribute('data-glass-appearance', 'light');
    wrap.innerHTML = '<button class="glass lg-button lg-icon" data-size="small" data-glass-interactive aria-haspopup="menu" aria-label="Personalizar"><svg><use href="#i-gear"/></svg></button>' +
      '<div class="glass lg-menu-panel" role="menu" aria-label="Personalizar">' +
      '<button role="menuitem" data-k="variant">Material <span class="val"></span></button>' +
      '<button role="menuitem" data-k="dark">Aparência <span class="val"></span></button>' +
      '<button role="menuitem" data-k="tint">Cor <span class="val"></span></button></div>';
    stage.appendChild(wrap);
    function targets() {
      return $$('.glass', stage).filter(function (g) { return !g.closest('.custom') && !g.classList.contains('hud'); });
    }
    function sync() {
      $('[data-k="variant"] .val', wrap).textContent = state.variant === 'regular' ? 'Regular' : 'Clear';
      $('[data-k="dark"] .val', wrap).textContent = state.dark ? 'Escura' : 'Clara';
      $('[data-k="tint"] .val', wrap).textContent = TINTS[state.tint][0];
    }
    sync();
    wrap.addEventListener('lg:select', function (e) {
      var k = e.detail.item.getAttribute('data-k');
      if (k === 'variant') state.variant = state.variant === 'regular' ? 'clear' : 'regular';
      if (k === 'dark') { state.dark = !state.dark; stage.setAttribute('data-glass-appearance', state.dark ? 'dark' : 'light'); }
      if (k === 'tint') state.tint = (state.tint + 1) % TINTS.length;
      if (k !== 'dark') targets().forEach(function (g) {
        var o = { variant: state.variant };
        if (k === 'tint') o.tint = TINTS[state.tint][1];
        LG.apply(g, o);
      });
      sync();
    });
  });

  /* ---------- player ---------- */
  var songs = [['Maré Alta', 'Os Satélites', 331], ['Órbita Baixa', 'Kiko Nebulosa', 254], ['Neon 88', 'Velvet Static', 289]];
  var player = $('#player');
  if (player) {
    var si = 0, t = 111, playing = false, last = 0;
    var playBtn = $('#play'), scrub = $('#scrub'), cover = $('#cover');
    var render = function () {
      var d = songs[si][2];
      scrub.style.setProperty('--p', (t / d * 100).toFixed(2) + '%');
      scrub.setAttribute('aria-valuenow', Math.round(t));
      $('#t-now').textContent = fmt(t);
      $('#t-left').textContent = '-' + fmt(d - t);
    };
    var setSong = function (i) {
      si = (i + songs.length) % songs.length; t = 0;
      $('.meta b', player).textContent = songs[si][0];
      $('.meta span', player).textContent = songs[si][1];
      render();
    };
    var loop = function (now) {
      if (!playing) return;
      t += (now - last) / 1000; last = now;
      if (t >= songs[si][2]) setSong(si + 1);
      render();
      requestAnimationFrame(loop);
    };
    playBtn.addEventListener('click', function () {
      playing = !playing;
      $('use', playBtn).setAttribute('href', playing ? '#i-pause' : '#i-play');
      playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
      cover.classList.toggle('spin', playing);
      if (playing) { last = performance.now(); requestAnimationFrame(loop); }
    });
    $('#next').addEventListener('click', function () { setSong(si + 1); });
    $('#prev').addEventListener('click', function () { if (t > 3) { t = 0; render(); } else setSong(si - 1); });
    $('#like').addEventListener('click', function (e) {
      var on = this.getAttribute('aria-pressed') !== 'true';
      this.setAttribute('aria-pressed', String(on));
      if (on) burst(player.closest('.stage'), e.clientX, e.clientY, ['#ff375f', '#ff6b8b', '#ffd1dc'], 18);
    });
    var seek = function (e) {
      var r = scrub.getBoundingClientRect();
      t = clamp((e.clientX - r.left) / r.width, 0, 1) * songs[si][2]; render();
    };
    scrub.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); scrub.setPointerCapture(e.pointerId); scrub.classList.add('drag'); seek(e);
    });
    scrub.addEventListener('pointermove', function (e) { if (scrub.classList.contains('drag')) seek(e); });
    scrub.addEventListener('pointerup', function () { scrub.classList.remove('drag'); });
    scrub.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { t = Math.min(songs[si][2], t + 5); render(); }
      if (e.key === 'ArrowLeft') { t = Math.max(0, t - 5); render(); }
    });
    render();
  }

  /* ---------- buttons ---------- */
  var go = $('#go');
  if (go) {
    var gs = go.closest('.stage');
    go.addEventListener('click', function (e) {
      burst(gs, e.clientX || center(go)[0], e.clientY || center(go)[1], ['#0a84ff', '#ff375f', '#ffd60a', '#30d158', '#bf5af2', '#fff'], 40);
    });
    var n = 0, cb = $('#count');
    cb.addEventListener('click', function () { $('.lbl', cb).textContent = 'Toques: ' + (++n); });
    var fx = { heart: ['#ff375f', '#ff8aa5'], star: ['#ffd60a', '#ffe58a'], plus: ['#0a84ff', '#7cc0ff'], check: ['#30d158', '#9af0b0'] };
    $$('[data-fx]', gs).forEach(function (b) {
      b.addEventListener('click', function (e) {
        var c = center(b);
        burst(gs, e.clientX || c[0], e.clientY || c[1], fx[b.getAttribute('data-fx')], 16);
      });
    });
  }

  /* ---------- toolbar ---------- */
  var tb1 = $('#tb1');
  if (tb1) {
    var st = $('#tb-status'), fmtState = {};
    var tbPlay = $('#tb-play'), tbOn = false;
    tbPlay.addEventListener('click', function () {
      tbOn = !tbOn;
      $('use', tbPlay).setAttribute('href', tbOn ? '#i-pause' : '#i-play');
      st.textContent = tbOn ? 'Tocando' : 'Pausado';
    });
    $('#tb-vol').addEventListener('click', function () {
      var m = this.getAttribute('aria-pressed') !== 'true';
      this.setAttribute('aria-pressed', String(m));
      $('use', this).setAttribute('href', m ? '#i-vol-lo' : '#i-vol-hi');
      st.textContent = m ? 'Volume baixo' : 'Volume alto';
    });
    $('.heart', tb1).addEventListener('click', function (e) {
      var on = this.getAttribute('aria-pressed') !== 'true';
      this.setAttribute('aria-pressed', String(on));
      st.textContent = on ? 'Curtido' : 'Descurtido';
      if (on) burst(tb1.closest('.stage'), e.clientX, e.clientY, ['#ff375f', '#ff8aa5'], 14);
    });
    var paint = function () {
      st.style.fontWeight = fmtState.bold ? '800' : '500';
      st.style.fontStyle = fmtState.italic ? 'italic' : 'normal';
      st.style.textDecoration = fmtState.underline ? 'underline' : 'none';
      st.style.fontSize = '17px';
      st.textContent = 'Texto de exemplo';
    };
    $$('[data-fmt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-fmt');
        if (k === 'undo') { fmtState = {}; $$('[data-fmt]').forEach(function (x) { if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', 'false'); }); }
        else { fmtState[k] = !fmtState[k]; b.setAttribute('aria-pressed', String(!!fmtState[k])); }
        paint();
      });
    });
  }

  /* ---------- segmented ---------- */
  var seg = $('#seg'), big = $('#bigword');
  if (seg) seg.addEventListener('lg:change', function (e) {
    big.classList.add('out');
    setTimeout(function () { big.textContent = e.detail.tab.textContent.trim(); big.classList.remove('out'); }, 180);
  });

  /* ---------- menu ---------- */
  var menu1 = $('#menu1');
  if (menu1) menu1.addEventListener('lg:select', function (e) {
    var msg = { copy: 'Copiado', share: 'Compartilhado', fav: 'Favoritado', rename: 'Renomeado', delete: 'Apagado' }[e.detail.value];
    $('#menu-status').textContent = msg;
    var bt = $('button', menu1), c = center(bt);
    burst(menu1.closest('.stage'), c[0], c[1], e.detail.value === 'delete' ? ['#ff453a', '#ff8a80'] : ['#fff', '#0a84ff', '#ffd60a'], 18);
  });

  /* ---------- slider lab ---------- */
  var pill = $('#lab-pill');
  if (pill) {
    var rr = $('#r-ref'), rm = $('#r-mag');
    var upd = function () {
      var ref = +rr.value, mag = +rm.value / 100;
      $('#o-ref').textContent = ref; $('#o-mag').textContent = mag.toFixed(2) + '×';
      LG.apply(pill, { refraction: ref, magnify: mag });
    };
    rr.addEventListener('input', upd); rm.addEventListener('input', upd);
    requestAnimationFrame(upd);
  }

  /* ---------- switches ---------- */
  var swStage = $('#sw-stage');
  if (swStage) {
    var card = $('.settings', swStage);
    $('#sw-dark').addEventListener('change', function () { swStage.setAttribute('data-glass-appearance', this.checked ? 'dark' : 'light'); });
    $('#sw-clear').addEventListener('change', function () { LG.apply(card, { variant: this.checked ? 'clear' : 'regular' }); });
    $('#sw-tint').addEventListener('change', function () { LG.apply(card, { tint: this.checked ? '#bf5af2' : null }); });
  }

  /* ---------- notifications ---------- */
  var stack = $('#stack');
  if (stack) {
    var NOTES = [
      ['art-1', 'Música', 'Maré Alta começou a tocar'], ['art-8', 'Clima', 'Céu limpo, 27° à tarde'],
      ['art-3', 'Fotos', 'Você tem novas memórias'], ['art-7', 'Podcasts', 'Novo episódio disponível'],
      ['art-4', 'Mapas', 'Saia agora para chegar às 18h'], ['art-2', 'Notas', 'Lista de compras atualizada']
    ];
    var notes = [], ni = 0, expanded = false;
    var layout = function () {
      var y = 0;
      notes.forEach(function (n, i) {
        var h = n.el.offsetHeight || 66;
        n.y.to(expanded ? y : i * 11);
        n.s.to(expanded ? 1 : Math.pow(0.94, i));
        n.o = expanded ? 1 : (i > 2 ? 0 : 1 - i * 0.18);
        y += h + 10;
        n.el.style.zIndex = 100 - i;
      });
      animate(tick);
    };
    var tick = function (dt) {
      var alive = false;
      notes.forEach(function (n) {
        var a = n.y.step(dt), b = n.s.step(dt), c = n.x.step(dt);
        alive = alive || a || b || c || n.drag;
        n.el.style.transform = 'translate(' + n.x.value.toFixed(1) + 'px,' + n.y.value.toFixed(1) + 'px) scale(' + n.s.value.toFixed(4) + ')';
        n.el.style.opacity = (n.o * (1 - Math.min(1, Math.abs(n.x.value) / 320))).toFixed(3);
      });
      notes = notes.filter(function (n) { if (n.gone && Math.abs(n.x.value) > 300) { n.el.remove(); return false; } return true; });
      return alive;
    };
    var dismiss = function (n, dir) { n.gone = true; n.x.to(dir * 420); notes.splice(notes.indexOf(n), 1); notes.push(n); layout(); setTimeout(function () { n.el.remove(); notes = notes.filter(function (x) { return x !== n; }); }, 700); };
    $('#notify').addEventListener('click', function () {
      var d = NOTES[ni++ % NOTES.length];
      var el = document.createElement('div');
      el.className = 'glass note';
      el.innerHTML = '<i class="app ' + d[0] + '"></i><div><b>' + d[1] + '</b><span>' + d[2] + '</span></div><time>agora</time>';
      el.style.opacity = '0';
      stack.appendChild(el);
      var n = { el: el, y: new Spring(-90, { stiffness: 320, damping: 26 }), s: new Spring(0.9, { stiffness: 320, damping: 22 }), x: new Spring(0, { stiffness: 260, damping: 26 }), o: 1 };
      notes.unshift(n);
      if (notes.length > 6) { var old = notes.pop(); old.el.remove(); }
      el.addEventListener('pointerdown', function (e) {
        n.drag = { x0: e.clientX, moved: false }; el.setPointerCapture(e.pointerId); animate(tick);
      });
      el.addEventListener('pointermove', function (e) {
        if (!n.drag) return;
        var dx = e.clientX - n.drag.x0;
        if (Math.abs(dx) > 4) n.drag.moved = true;
        n.x.set(dx); n.x.target = dx;
      });
      el.addEventListener('pointerup', function () {
        var d = n.drag; n.drag = null;
        if (!d) return;
        if (Math.abs(n.x.value) > 90) dismiss(n, Math.sign(n.x.value));
        else { n.x.to(0); if (!d.moved) { expanded = !expanded; layout(); } }
        animate(tick);
      });
      layout();
    });
    $('#clear-notes').addEventListener('click', function () { notes.slice().forEach(function (n, i) { setTimeout(function () { if (!n.gone) dismiss(n, 1); }, i * 60); }); });
    setTimeout(function () { $('#notify').click(); }, 600);
    setTimeout(function () { $('#notify').click(); }, 900);
  }

  /* ---------- control center ---------- */
  $$('.tile[aria-pressed]').forEach(function (t) {
    t.addEventListener('click', function () {
      var on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      if (t.id === 'focus') $('#focus-s').textContent = on ? 'Não perturbe' : 'Desativado';
      if (t.id === 'torch') $('#cc-bg').style.filter = on ? 'brightness(1.35) saturate(1.1)' : '';
    });
  });
  var hud = $('#hud'), hudY = new Spring(-160, { stiffness: 300, damping: 24 }), hudTimer = 0;
  var hudTick = function (dt) { var a = hudY.step(dt); hud.style.translate = '-50% ' + hudY.value.toFixed(1) + '%'; return a; };
  function vslider(el, onChange) {
    var set = function (v) {
      v = clamp(v, 0, 100);
      el.style.setProperty('--v', v + '%'); el.setAttribute('aria-valuenow', Math.round(v)); onChange(v);
    };
    var drag = null;
    el.addEventListener('pointerdown', function (e) { drag = { y: e.clientY, v: +el.getAttribute('aria-valuenow') }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) { if (drag) set(drag.v - (e.clientY - drag.y) / el.offsetHeight * 100); });
    el.addEventListener('pointerup', function () { drag = null; });
    el.addEventListener('keydown', function (e) {
      var v = +el.getAttribute('aria-valuenow');
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); set(v + 5); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); set(v - 5); }
    });
  }
  if ($('#cc-bright')) {
    vslider($('#cc-bright'), function (v) { $('#cc-bg').style.filter = 'brightness(' + (0.3 + v / 100 * 0.85).toFixed(2) + ')'; });
    vslider($('#cc-vol'), function (v) {
      hud.style.setProperty('--v', v + '%');
      $('use', hud).setAttribute('href', v < 35 ? '#i-vol-lo' : '#i-vol-hi');
      $('#cc-vol use').setAttribute('href', v < 35 ? '#i-vol-lo' : '#i-vol-hi');
      hudY.to(0); animate(hudTick);
      clearTimeout(hudTimer);
      hudTimer = setTimeout(function () { hudY.to(-160); animate(hudTick); }, 1300);
    });
  }

  /* ---------- dock ---------- */
  var dock = $('#dock');
  if (dock) {
    var icons = $$('.app-icon', dock), label = $('#dock-label'), win = $('#window');
    var sc = icons.map(function () { return new Spring(1, { stiffness: 420, damping: 30 }); });
    var bob = icons.map(function () { return new Spring(0, { stiffness: 260, damping: 12 }); });
    var mx = null;
    var dockTick = function (dt) {
      var alive = false;
      icons.forEach(function (ic, i) {
        if (mx != null) {
          var c = ic.getBoundingClientRect(), cx = c.left + c.width / 2;
          sc[i].to(1 + 0.55 * Math.exp(-Math.pow((mx - cx) / 70, 2)));
        } else sc[i].to(1);
        var a = sc[i].step(dt), b = bob[i].step(dt);
        alive = alive || a || b;
        ic.style.transform = 'translateY(' + (bob[i].value - (sc[i].value - 1) * 10).toFixed(1) + 'px) scale(' + sc[i].value.toFixed(3) + ')';
      });
      return alive || mx != null;
    };
    dock.addEventListener('pointermove', function (e) {
      if (reduce) return;
      mx = e.clientX; animate(dockTick);
      var hit = e.target.closest('.app-icon');
      if (hit) {
        var sr = dock.closest('.stage').getBoundingClientRect(), c = hit.getBoundingClientRect();
        label.textContent = hit.getAttribute('data-name');
        label.style.left = (c.left + c.width / 2 - sr.left) + 'px';
        label.classList.add('show');
      }
    });
    dock.addEventListener('pointerleave', function () { mx = null; label.classList.remove('show'); animate(dockTick); });
    var ws = new Spring(0, { stiffness: 300, damping: 24 }), winOpen = false;
    var winTick = function (dt) {
      var a = ws.step(dt), v = ws.value;
      win.style.opacity = clamp(v * 1.4, 0, 1).toFixed(3);
      win.style.transform = 'translateY(' + ((1 - v) * 160).toFixed(1) + 'px) scale(' + (0.3 + 0.7 * v).toFixed(4) + ')';
      win.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      return a;
    };
    icons.forEach(function (ic, i) {
      ic.addEventListener('click', function () {
        bob[i].velocity = -520; animate(dockTick);
        icons.forEach(function (x) { x.classList.remove('open'); });
        ic.classList.add('open');
        $('#win-title').textContent = ic.getAttribute('data-name');
        win.style.transformOrigin = 'center bottom';
        winOpen = true; ws.set(0); ws.to(1); animate(winTick);
      });
    });
    $('#win-close').addEventListener('click', function () { winOpen = false; ws.to(0); animate(winTick); icons.forEach(function (x) { x.classList.remove('open'); }); });
  }

  /* ---------- sheet ---------- */
  var sheet = $('#sheet');
  if (sheet) {
    var sy = new Spring(1, { stiffness: 300, damping: 30 }), H = function () { return sheet.offsetHeight + 30; };
    var sheetTick = function (dt) {
      var a = sy.step(dt);
      sheet.style.translate = '0 ' + (Math.max(-0.08, sy.value) * H()).toFixed(1) + 'px';
      return a;
    };
    var openSheet = function (v) { sy.to(v ? 0 : 1); sheet.setAttribute('aria-hidden', String(!v)); animate(sheetTick); };
    $('#open-sheet').addEventListener('click', function () { openSheet(true); });
    var sd = null;
    sheet.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.share-row button')) return;
      sd = { y: e.clientY, v: sy.value, t: performance.now(), last: e.clientY };
      sheet.setPointerCapture(e.pointerId);
    });
    sheet.addEventListener('pointermove', function (e) {
      if (!sd) return;
      var d = (e.clientY - sd.y) / H(), v = sd.v + d;
      if (v < 0) v = v * 0.25; // rubber band upwards
      sy.velocity = (e.clientY - sd.last) / H() * 60; sd.last = e.clientY;
      sy.set(v); sy.target = v; sheetTick(0);
    });
    sheet.addEventListener('pointerup', function () {
      if (!sd) return;
      var v = sy.value; sd = null;
      openSheet(!(v > 0.3 || sy.velocity > 2));
    });
    $$('.share-row button', sheet).forEach(function (b) {
      b.addEventListener('click', function (e) {
        b.classList.toggle('sent');
        if (b.classList.contains('sent')) burst(sheet.closest('.stage'), e.clientX, e.clientY, ['#34c759', '#fff'], 12);
      });
    });
  }

  /* ---------- search ---------- */
  var search = $('#search');
  if (search) {
    var wrapS = $('#search-wrap'), input = $('#search-input'), results = $('#results');
    var ITEMS = [['art-1', 'Maré Alta'], ['art-3', 'Órbita Baixa'], ['art-2', 'Neon 88'], ['art-4', 'Pôr do Sol em Marte'], ['art-7', 'Fita Cassete'], ['art-8', 'Atlântico'], ['art-6', 'Xadrez'], ['art-5', 'Cometa']];
    var sw = new Spring(52, { stiffness: 340, damping: 30 }), sOpen = false;
    var sTick = function (dt) { var a = sw.step(dt); search.style.width = sw.value.toFixed(1) + 'px'; return a; };
    var show = function () {
      var q = input.value.trim().toLowerCase();
      var list = ITEMS.filter(function (it) { return !q || it[1].toLowerCase().indexOf(q) >= 0; }).slice(0, 4);
      results.innerHTML = list.length ? list.map(function (it) { return '<button role="option"><i class="' + it[0] + '"></i>' + it[1] + '</button>'; }).join('') : '<div class="empty">Nada encontrado</div>';
      results.toggleAttribute('data-show', sOpen);
    };
    var openS = function (v) {
      sOpen = v; search.toggleAttribute('data-open', v);
      sw.to(v ? wrapS.offsetWidth : 52); animate(sTick);
      if (v) { setTimeout(function () { input.focus(); }, 80); show(); }
      else { input.value = ''; results.removeAttribute('data-show'); }
    };
    search.addEventListener('click', function (e) { if (!sOpen && !e.target.closest('#search-x')) openS(true); });
    $('#search-x').addEventListener('click', function (e) { e.stopPropagation(); openS(false); });
    input.addEventListener('input', show);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') openS(false); });
    results.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      input.value = b.textContent; show();
      var c = center(b); burst(search.closest('.stage'), c[0], c[1], ['#0a84ff', '#fff'], 10);
    });
  }

  /* ---------- phone app ---------- */
  var feed = $('#feed');
  if (feed) {
    var albums = [['Maré Alta', 'Os Satélites'], ['Órbita Baixa', 'Kiko Nebulosa'], ['Neon 88', 'Velvet Static'], ['Pôr do Sol', 'Duna'],
      ['Fita Cassete', 'Lia & os Ecos'], ['Atlântico', 'Brisa Norte'], ['Xadrez', 'Monocromo'], ['Cometa', 'Ana Prisma'],
      ['Chuva Ácida', 'Os Satélites'], ['Vapor', 'Velvet Static'], ['Cidade Luz', 'Kiko Nebulosa'], ['Gravidade', 'Duna']];
    var fill = function (shift) {
      feed.innerHTML = albums.map(function (a, i) {
        return '<figure><div class="cv art-' + (((i + shift) % 9) + 1) + '"></div><figcaption>' + a[0] + '<span>' + a[1] + '</span></figcaption></figure>';
      }).join('');
    };
    fill(0);
    $('#layout-tabs').addEventListener('lg:change', function (e) { $('#phone').setAttribute('data-layout', e.detail.tab.getAttribute('data-layout')); });
    $('#app-tabs').addEventListener('lg:change', function (e) {
      $('#phone-title').textContent = e.detail.tab.textContent.trim();
      fill(e.detail.index * 2);
      $('#phone > .lg-backdrop').scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------- morph ---------- */
  var add = $('#morph-add'), bud = $('#morph-bud'), mg = $('#morph-group');
  if (add && bud) {
    var out = false;
    var mx2 = new Spring(-46, { stiffness: 190, damping: 17 }), ms = new Spring(0.55, { stiffness: 260, damping: 20 });
    var budIcon = $('svg', bud);
    var paintBud = function () {
      bud.style.transform = 'translateX(' + mx2.value.toFixed(2) + 'px) scale(' + ms.value.toFixed(4) + ')';
      var p = (mx2.value + 46) / 104;
      budIcon.style.opacity = clamp((p - 0.45) / 0.4, 0, 1).toFixed(3);
      bud.style.pointerEvents = p > 0.6 ? '' : 'none';
    };
    paintBud();
    var budTick = function (dt) { var a = mx2.step(dt), b = ms.step(dt); paintBud(); LG.group(mg).wake(); return a || b; };
    add.addEventListener('click', function () {
      out = !out;
      add.setAttribute('aria-expanded', String(out));
      bud.tabIndex = out ? 0 : -1;
      mx2.to(out ? 58 : -46); ms.to(out ? 1 : 0.55);
      animate(budTick);
    });
    bud.addEventListener('click', function (e) { var c = center(bud); burst(mg.closest('.stage'), c[0], c[1], ['#ff375f', '#ff8aa5', '#fff'], 18); });
  }

  /* ---------- lens ---------- */
  var mag = $('#mag');
  if (mag) mag.addEventListener('dblclick', function () {
    var g = LG.get(mag), m = g && g.opts.magnify > 1.3 ? 1.15 : 1.5;
    LG.apply(mag, { magnify: m });
  });

  /* ---------- install ---------- */
  var CMDS = [
    '/plugin marketplace add asimov-academy/liquid-glass-skill\n/plugin install liquid-glass@asimov-academy',
    'git clone https://github.com/asimov-academy/liquid-glass-skill\ncp -r liquid-glass-skill/skills/liquid-glass ~/.claude/skills/',
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/asimov-academy/liquid-glass-skill@main/dist/liquid-glass.css">\n<script src="https://cdn.jsdelivr.net/gh/asimov-academy/liquid-glass-skill@main/dist/liquid-glass.js"></script>'
  ];
  var cmd = $('#cmd-text'), copy = $('#copy'), copyLabel = $('#copy .lbl'), ci = 0;
  if (cmd) {
    cmd.textContent = CMDS[0];
    $('#install-tabs').addEventListener('lg:change', function (e) { ci = e.detail.index; cmd.textContent = CMDS[ci]; copyLabel.textContent = 'Copiar'; });
    copy.addEventListener('click', function (e) {
      (navigator.clipboard ? navigator.clipboard.writeText(CMDS[ci]) : Promise.reject()).then(function () {
        copyLabel.textContent = 'Copiado';
        var c = center(copy); burst(copy.closest('.stage'), c[0], c[1], ['#30d158', '#fff', '#0a84ff'], 20);
      }, function () { copyLabel.textContent = 'Selecione'; });
      setTimeout(function () { copyLabel.textContent = 'Copiar'; }, 1800);
    });
  }
})();
