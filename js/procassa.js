// Procassa · cabecera, menú, antes/después en diagonal, filtros, ficha de obra con visor, clips y formulario → WhatsApp
(() => {
  const d = document, $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cabecera y menú
  const cab = $('#cab'), menu = $('#menu');
  const poner = (ab) => { cab.classList.toggle('abierto', ab); menu.setAttribute('aria-expanded', ab); };
  menu.addEventListener('click', () => poner(!cab.classList.contains('abierto')));
  $$('#nav a').forEach((a) => a.addEventListener('click', () => poner(false)));
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') poner(false); });
  const fijar = () => cab.classList.toggle('fija', scrollY > 30);
  addEventListener('scroll', fijar, { passive: true }); fijar();

  // apariciones
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.aparece').forEach((el) => io.observe(el));

  // ---------- antes y después ----------
  const marco = $('.ad__marco');
  if (marco) {
    const rango = $('.ad__rango', marco), pares = $$('.ad__par', marco), tabs = $$('.ad__pestanas [role=tab]');
    const datos = JSON.parse($('#pares').textContent), pie = $('[data-ad-pie]'), ver = $('[data-ad-ver]');
    const ang = () => { const r = marco.getBoundingClientRect(); marco.style.setProperty('--ang', Math.atan(0.18 * r.width / r.height) + 'rad'); };
    ang(); addEventListener('resize', ang);
    const mover = (p) => { p = Math.max(4, Math.min(96, p)); marco.style.setProperty('--p', p); rango.value = Math.round(p); };
    rango.addEventListener('input', () => mover(+rango.value));
    // arrastrar en cualquier punto (también en móvil, sin bloquear el scroll vertical)
    let x0 = null;
    marco.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    marco.addEventListener('pointermove', (e) => {
      if (x0 === null || (e.pointerType === 'mouse' && e.buttons !== 1)) return;
      const r = marco.getBoundingClientRect(); mover((e.clientX - r.left) / r.width * 100);
    });
    addEventListener('pointerup', () => { x0 = null; });
    const elegir = (i, foco) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
      pares.forEach((p, k) => p.classList.toggle('activo', k === i));
      $$('img', pares[i]).forEach((im) => { im.loading = 'eager'; });
      marco.setAttribute('aria-labelledby', tabs[i].id);
      pie.textContent = datos[i].t; ver.dataset.obra = datos[i].o;
      $('[data-ad-titulo]').textContent = datos[i].t; $('[data-ad-meta]').textContent = datos[i].m; $('[data-ad-texto]').textContent = datos[i].x;
      if (foco) tabs[i].focus();
      if (!reducir) { mover(78); requestAnimationFrame(() => setTimeout(() => { marco.classList.add('anima'); mover(50); setTimeout(() => marco.classList.remove('anima'), 700); }, 60)); }
      else mover(50);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => elegir(i));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); elegir((i + k + tabs.length) % tabs.length, true); }
      });
    });
    tabs.forEach((t, k) => { t.tabIndex = k === 0 ? 0 : -1; });
    // pista: la diagonal se mueve sola una vez al verla
    const pista = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; pista.disconnect(); if (reducir) return;
      marco.classList.add('anima'); mover(30); setTimeout(() => mover(64), 650); setTimeout(() => { mover(50); setTimeout(() => marco.classList.remove('anima'), 700); }, 1300);
    }, { threshold: 0.5 });
    pista.observe(marco);
  }

  // ---------- filtros de obras ----------
  const filtros = $$('[data-filtro]'), obras = $$('.obra'), mas = $('[data-mas]');
  // en el móvil se ven 6 obras y un botón para ver el resto (menos scroll); con un filtro se ven todas las suyas
  const movil = matchMedia('(max-width:640px)');
  let todas = false;
  const recortar = () => {
    const activo = $('[data-filtro][aria-pressed=true]');
    const f = activo ? activo.dataset.filtro : 'todas';
    const corta = movil.matches && f === 'todas' && !todas;
    obras.forEach((o, i) => o.classList.toggle('recorte', corta && i >= 6));
    if (mas) mas.hidden = !corta;
  };
  if (mas) mas.addEventListener('click', () => { todas = true; recortar(); if (obras[6]) obras[6].querySelector('button').focus({ preventScroll: true }); });
  movil.addEventListener('change', recortar); recortar();
  filtros.forEach((b) => b.addEventListener('click', () => {
    filtros.forEach((x) => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.filtro;
    obras.forEach((o) => { const ver = f === 'todas' || o.dataset.tipo === f; o.hidden = !ver; if (ver) o.classList.add('visto'); });
    recortar();
  }));

  // ---------- ficha de obra con visor ----------
  const fichas = JSON.parse($('#fichas').textContent), dlg = $('#ficha');
  const img = $('#ficha-img'), minis = $('#ficha-minis'), cuenta = $('#ficha-cuenta');
  let actual = null, n = 0, quien = null;
  const src = (f, a) => `img/${f.id}-${a}.webp`;
  const srcset = (f) => f.a.map((a) => `img/${f.id}-${a}.webp ${Math.min(a, f.w)}w`).join(', ');
  const ir = (i) => {
    const fs = actual.f; n = (i + fs.length) % fs.length; const f = fs[n];
    img.srcset = srcset(f); img.sizes = '(min-width:1060px) 60vw, 100vw'; img.src = src(f, f.a[0]);
    img.width = f.w; img.height = f.h; img.alt = `${actual.t}, foto ${n + 1} de ${fs.length}`;
    cuenta.textContent = `${n + 1} / ${fs.length}`;
    $$('button', minis).forEach((b, k) => b.setAttribute('aria-current', k === n));
    const m = minis.children[n]; if (m) m.scrollIntoView({ block: 'nearest', inline: 'center' });
    // precarga la siguiente
    const sig = fs[(n + 1) % fs.length]; const p = new Image(); p.sizes = img.sizes; p.srcset = srcset(sig);
  };
  const abrir = (id, desde) => {
    actual = fichas[id]; if (!actual) return; quien = desde;
    $('#ficha-t').textContent = actual.t; $('#ficha-meta').textContent = actual.l; $('#ficha-x').textContent = actual.x;
    $('#ficha-p').innerHTML = actual.p.map((p) => `<li>${p.replace(/</g, '&lt;')}</li>`).join('');
    $('#ficha-ig').innerHTML = 'En nuestro Instagram: ' + actual.ig.map((c, i) => `<a href="https://www.instagram.com/p/${c}/" rel="noopener" target="_blank">${actual.ig.length > 1 ? 'vídeo ' + (i + 1) : 'ver el vídeo'}</a>`).join(' · ');
    minis.innerHTML = actual.f.map((f, i) => `<button type="button" aria-label="Foto ${i + 1}"><img src="img/${f.id}-c-400.webp" alt="" loading="lazy"></button>`).join('');
    $$('button', minis).forEach((b, i) => b.addEventListener('click', () => ir(i)));
    ir(0);
    dlg.showModal(); d.body.style.overflow = 'hidden';
  };
  dlg.addEventListener('close', () => { d.body.style.overflow = ''; if (quien) quien.focus(); });
  $('[data-cerrar]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('.ficha__ant').addEventListener('click', () => ir(n - 1));
  $('.ficha__sig').addEventListener('click', () => ir(n + 1));
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') ir(n - 1); if (e.key === 'ArrowRight') ir(n + 1); });
  let tx = null;
  $('.ficha__foto').addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  $('.ficha__foto').addEventListener('touchend', (e) => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) ir(n + (dx < 0 ? 1 : -1)); tx = null; });
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-obra]'); if (b) abrir(b.dataset.obra, b); });

  // ---------- clips: se cargan al acercarse y solo se reproducen en pantalla ----------
  const vids = $$('video[data-src]');
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src) { v.src = v.dataset.src; } if (!reducir) v.play().catch(() => {}); }
    else v.pause();
  }), { rootMargin: '200px 0px' });
  vids.forEach((v) => vio.observe(v));

  // ---------- formulario → WhatsApp ----------
  const form = $('#formulario');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const req = $$('[required]', form); let ok = true;
    req.forEach((i) => { const mal = !i.value.trim(); i.setAttribute('aria-invalid', mal); if (mal && ok) { i.focus(); ok = false; } });
    if (!ok) return;
    const v = (n) => form.elements[n].value.trim();
    const t = `Hola Procassa, soy ${v('nombre')}. Quería pedir presupuesto para: ${v('obra')}${v('municipio') ? ' en ' + v('municipio') : ''}.${v('mensaje') ? '\n' + v('mensaje') : ''}\nMi teléfono: ${v('telefono')}`;
    open(`https://wa.me/34686844842?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
  });
})();
