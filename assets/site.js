// Shared by both pages: the newest version beside every Try it now button, what to expect after pressing it, FAQ
// links that open their answer, and (home page) the top clip at 60 or 90 fps to suit the screen. No tracking.
(() => {
  const REPO = 'smoovplay/smoovplay';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // The newest published release: the same one the download link gets (GitHub skips drafts and pre-releases).
  // Without an answer the line keeps saying "Latest version".
  function showVersion(tag){
    const v = String(tag || '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+([-.][0-9A-Za-z.]+)?$/.test(v)) return;
    $$('[data-version]').forEach(el => { el.textContent = `Version ${v}`; });
  }
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('sp-latest') || 'null'); } catch (e) {}
  if (cached && Date.now() - cached.at < 3600e3) showVersion(cached.tag);
  else fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {headers: {Accept: 'application/vnd.github+json'}})
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j || !j.tag_name) return;
      showVersion(j.tag_name);
      try { sessionStorage.setItem('sp-latest', JSON.stringify({tag: j.tag_name, at: Date.now()})); } catch (e) {}
    })
    .catch(() => {});

  // After Try it now: the download starts, and Windows' warning comes next, so say how to get past it.
  const next = $('#next');
  if (next) {
    $$('[data-get]').forEach(a => a.addEventListener('click', () => { next.hidden = false; }));
    next.querySelector('.x').addEventListener('click', () => { next.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') next.hidden = true; });
  }

  // A link to an FAQ answer (or the SmartScreen steps) opens it.
  function openHash(){
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  openHash();
  addEventListener('hashchange', openHash);

  // Home page: the split clip, playing on its own (muted) once it's on screen. 90 fps only looks right on a 90 Hz or
  // faster screen, so the refresh rate is measured from animation frames first (median interval over ~1 s).
  const film = $('#film');
  if (!film) return;
  const v = film.querySelector('video'), big = film.querySelector('.big'), tog = film.querySelector('.toggle'), hz = $('#hz');
  const MEDIA = 'https://smoovplay.github.io/compare/media/';
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData);
  let fps = 0, want = !calm, waiting = !calm, inView = false;

  function sync(){
    const on = !v.paused;
    tog.innerHTML = on ? ICON.pause : ICON.play;
    tog.setAttribute('aria-label', on ? 'Pause the clip' : 'Play the clip');
    big.hidden = on || waiting;
  }
  function play(){
    want = true;
    if (!fps) return;
    const src = `${MEDIA}smoovplay_side_by_side_1080p${fps}.mp4`;
    if (v.getAttribute('src') !== src) v.src = src;
    v.play().catch(() => { waiting = false; sync(); });
  }
  function pause(){ want = false; waiting = false; v.pause(); }
  const toggle = () => (v.paused ? play() : pause());
  big.addEventListener('click', e => { e.stopPropagation(); play(); });
  tog.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  v.addEventListener('click', toggle);
  ['play', 'pause', 'playing'].forEach(ev => v.addEventListener(ev, () => { if (ev !== 'pause') waiting = false; sync(); }));

  function pick(f, measured){
    if (fps) return;
    fps = f;
    v.poster = `${MEDIA}poster${f}.jpg`;
    if (hz && measured) {
      const h = Math.round(measured);
      hz.innerHTML = h >= 85
        ? `Your screen runs at about <b>${h} Hz</b>, so this is the 90 fps version.`
        : `Your screen runs at about <b>${h} Hz</b>, so this is the 60 fps version. A 90 Hz or faster screen gets 90.`;
    }
    if (want && inView) play(); else { if (!want) waiting = false; sync(); }
  }
  function measure(){
    const ts = [];
    const step = t => {
      ts.push(t);
      if (ts.length < 70) return requestAnimationFrame(step);
      const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b), med = d[d.length >> 1];
      const m = med > 0 ? 1000 / med : 60;
      pick(m >= 85 ? 90 : 60, m);
    };
    requestAnimationFrame(step);
  }
  if (document.visibilityState === 'visible') measure();
  else document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') measure(); }, {once: true});
  setTimeout(() => pick(60, 0), 3000);

  // Play only while it's on screen; a pause from the viewer sticks.
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && want) play();
    else if (!inView && !v.paused) { v.pause(); }
  }, {threshold: 0.25}).observe(film);
  sync();
})();
