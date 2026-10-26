// Showreel site: intro, velvet curtain page transitions, sound, reel previews, rows, sets and player.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const html = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch {} } };

/* ================= Sound =================
   On by default. Browsers hold audio until the first tap/click/key; we unlock then.
   The toggle mutes everything: synth effects and clip audio. */
const sound = (() => {
  let on = store.get('sa-muted') !== '1';
  const btn = $('[data-sound]');
  const label = $('[data-sound-label]');
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = Ctx ? new Ctx() : null;
  let noise = null;
  if (ctx) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const live = () => !!ctx && ctx.state === 'running';
  const listeners = new Set();
  function update() {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-waiting', on && !live());
    label.textContent = !on ? 'Sound off' : live() ? 'Sound on' : 'Tap for sound';
    listeners.forEach((fn) => fn());
  }
  function unlock() { if (ctx && !live()) ctx.resume().then(update, update); }
  ctx?.addEventListener?.('statechange', update);
  unlock();
  ['pointerdown', 'touchend', 'keydown'].forEach((t) => window.addEventListener(t, unlock, { capture: true, passive: true }));

  function burst({ dur = 0.05, type = 'bandpass', freq = 2000, q = 1, gain = 0.5, attack = 0.002, sweepTo } = {}) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ctx.destination); src.start(t, Math.random() * 0.5, dur + 0.05);
  }
  function tone({ freq = 120, to = 60, dur = 0.12, gain = 0.5, type = 'sine' } = {}) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const fx = {
    flicker: () => { burst({ dur: 0.04, freq: 3500, q: 3, gain: 0.12 }); tone({ freq: 100, to: 98, dur: 0.18, gain: 0.05, type: 'sawtooth' }); },
    shutter: () => { burst({ dur: 0.02, type: 'highpass', freq: 2500, gain: 0.4 }); setTimeout(() => on && live() && burst({ dur: 0.03, type: 'highpass', freq: 1800, gain: 0.3 }), 70); },
    clap: () => { burst({ dur: 0.16, freq: 1400, q: 0.8, gain: 0.9, attack: 0.001 }); tone({ freq: 160, to: 55, dur: 0.1, gain: 0.6 }); },
    whoosh: (dur = 1.2) => burst({ dur, type: 'lowpass', freq: 250, sweepTo: 1600, q: 0.7, gain: 0.18, attack: dur * 0.4 }),
    tick: () => burst({ dur: 0.015, type: 'highpass', freq: 4000, gain: 0.08 }),
  };

  btn.addEventListener('click', () => {
    if (on && !live()) return; // the first click only unlocks audio
    on = !on; store.set('sa-muted', on ? '0' : '1'); update();
  });
  update();
  return {
    play: (name, ...a) => { if (on && live()) fx[name](...a); },
    // clip audio may play once sound is on and the visitor has interacted with the page
    canHear: () => on && (navigator.userActivation ? navigator.userActivation.hasBeenActive : live()),
    isOn: () => on,
    onChange: (fn) => listeners.add(fn),
  };
})();

/* ================= Timecode ================= */
let tcStart = performance.now();
(function tc(now) {
  const f = Math.floor(((now - tcStart) / 1000) * 24), s = Math.floor(f / 24);
  $$('[data-timecode]').forEach((el) => { el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`; });
  requestAnimationFrame(tc);
})(performance.now());

/* ================= Velvet curtain ================= */
const drapes = $$('.drape');
const curtain = {
  setClosed() { html.classList.add('curtain-on'); gsap.set(drapes, { xPercent: 0, scaleX: 1 }); },
  open() {
    return gsap.timeline({ onStart: () => sound.play('whoosh', 1.3), onComplete: () => html.classList.remove('curtain-on') })
      .to(drapes, { scaleX: 0.14, duration: 1.4, ease: 'power3.inOut' })
      .to(drapes[0], { xPercent: -101, duration: 0.6, ease: 'power2.in' }, '-=0.15')
      .to(drapes[1], { xPercent: 101, duration: 0.6, ease: 'power2.in' }, '<');
  },
  close() {
    html.classList.add('curtain-on');
    return gsap.timeline({ onStart: () => sound.play('whoosh', 0.8) })
      .set(drapes, { scaleX: 0.14 }).set(drapes[0], { xPercent: -101 }).set(drapes[1], { xPercent: 101 })
      .to(drapes[0], { xPercent: 0, duration: 0.35, ease: 'power2.out' })
      .to(drapes[1], { xPercent: 0, duration: 0.35, ease: 'power2.out' }, '<')
      .to(drapes, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' })
      .call(() => sound.play('tick'));
  },
};

// Internal links close the curtain, then the next page opens it again.
let leaving = false;
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-curtain-link]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || leaving) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname) {
    if (url.hash) { e.preventDefault(); $(url.hash)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); history.replaceState(null, '', url.hash); }
    return;
  }
  e.preventDefault();
  if (reduceMotion) { location.href = url.href; return; }
  leaving = true;
  store.set('sa-curtain', 'closed');
  curtain.close().then(() => { location.href = url.href; });
});
// back/forward cache: never come back to a closed curtain
window.addEventListener('pageshow', (e) => { if (e.persisted) { leaving = false; if (html.classList.contains('curtain-on') && !html.classList.contains('intro-on')) curtain.open(); } });

/* ================= Intro (home, first visit per session) ================= */
function playIntro() {
  const intro = $('[data-intro]');
  const words = { lights: $('[data-word="lights"]'), camera: $('[data-word="camera"]'), action: $('[data-word="action"]') };
  const spot = $('.spot'), frame = $('.frame'), clapper = $('.clapper'), stick = $('.clapper__stick'), flash = $('.flash');
  curtain.setClosed();
  gsap.set([frame, clapper, ...Object.values(words)], { xPercent: -50, yPercent: -50 });
  gsap.set(stick, { rotation: -26, transformOrigin: '0% 100%' });
  window.scrollTo(0, 0);

  const done = () => {
    store.set('sa-intro', '1');
    html.classList.remove('intro-on');
    curtain.open();
  };
  const tl = gsap.timeline({ delay: 0.4, onComplete: done })
    .to(spot, { keyframes: [{ opacity: 0.7, duration: 0.05 }, { opacity: 0.05, duration: 0.09 }, { opacity: 0.9, duration: 0.05 }, { opacity: 0.25, duration: 0.12 }, { opacity: 1, duration: 0.2 }] })
    .call(() => sound.play('flicker'), null, 0).call(() => sound.play('flicker'), null, 0.14).call(() => sound.play('flicker'), null, 0.31)
    .fromTo(words.lights, { opacity: 0, letterSpacing: '0.4em' }, { opacity: 1, letterSpacing: '0.02em', duration: 0.7, ease: 'power3.out' }, 0.25)
    .to(words.lights, { opacity: 0, y: -20, duration: 0.25, ease: 'power2.in' }, 1.25)
    .to(spot, { opacity: 0.35, duration: 0.4 }, 1.25)
    .fromTo(frame, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, 1.45)
    .call(() => { sound.play('shutter'); tcStart = performance.now(); }, null, 1.45)
    .fromTo(words.camera, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }, 1.55)
    .to([words.camera, frame], { opacity: 0, duration: 0.25 }, 2.45)
    .fromTo(clapper, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 2.6)
    .to(stick, { rotation: 0, duration: 0.09, ease: 'power4.in' }, 3.15)
    .call(() => sound.play('clap'), null, 3.24)
    .fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.35, immediateRender: false }, 3.24)
    .to(clapper, { keyframes: [{ x: -6, duration: 0.04 }, { x: 5, duration: 0.04 }, { x: 0, duration: 0.05 }] }, 3.24)
    .fromTo(words.action, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.out' }, 3.24)
    .to(intro, { autoAlpha: 0, duration: 0.4, ease: 'power2.inOut' }, 3.9);

  const skip = () => { if (!tl.isActive() && tl.progress() === 1) return; tl.kill(); gsap.to(intro, { autoAlpha: 0, duration: 0.3, onComplete: done }); };
  $('[data-skip]').addEventListener('click', skip);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('intro-on')) skip(); });
}

if (html.classList.contains('intro-on')) playIntro();
else if (html.classList.contains('curtain-on')) { curtain.setClosed(); store.del('sa-curtain'); gsap.delayedCall(0.15, () => curtain.open()); }

/* ================= Reel clips ================= */
const clips = $$('[data-clip]');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
function chipText() {
  const t = !sound.isOn() ? 'Muted' : sound.canHear() ? 'Sound' : 'Tap for sound';
  $$('[data-chip-label]').forEach((el) => { el.textContent = t; });
}
sound.onChange(() => { chipText(); if (!sound.isOn()) $$('.clip__video').forEach((v) => { v.muted = true; }); });
chipText();

const visible = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    const v = $('.clip__video', target);
    if (!v) return;
    if (isIntersecting && !reduceMotion) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  });
}, { threshold: 0.35 });

clips.forEach((link) => {
  const li = link.closest('.clip');
  const v = $('.clip__video', link);
  if (v) { v.addEventListener('playing', () => li.classList.add('is-playing')); visible.observe(link); }
  const hot = (on) => {
    li.classList.toggle('is-hot', on);
    if (v) { v.muted = !(on && sound.canHear()); if (on) v.play().catch(() => {}); }
    if (on) sound.play('tick');
    chipText();
  };
  link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hot(true); });
  link.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hot(false); });
  link.addEventListener('focus', () => hot(true));
  link.addEventListener('blur', () => hot(false));
  // touch: first tap plays with sound, second tap opens the project
  link.addEventListener('click', (e) => {
    if (finePointer || li.classList.contains('is-hot')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    clips.forEach((o) => { if (o !== link) { o.closest('.clip').classList.remove('is-hot'); const ov = $('.clip__video', o); if (ov) ov.muted = true; } });
    hot(true);
  }, true);
});
// on touch screens the reel note talks about tapping, not hovering
if (!finePointer) $$('.reel .head__note').forEach((n) => { n.innerHTML = n.innerHTML.replace(/hover/i, 'Tap').replace(/click/i, 'Tap again'); });
$('[data-more]')?.addEventListener('click', (e) => { $('[data-clips]').classList.add('is-all'); e.currentTarget.remove(); });

/* ================= Photo sets strip ================= */
const sets = $('[data-sets]');
if (sets) {
  const step = () => (sets.querySelector('.set')?.offsetWidth || 300) + 24;
  $('[data-sets-prev]').addEventListener('click', () => sets.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('[data-sets-next]').addEventListener('click', () => sets.scrollBy({ left: step(), behavior: 'smooth' }));
}

/* ================= More videos: preview follows the cursor ================= */
const preview = $('[data-row-preview]');
if (preview) {
  let x = 0, y = 0, raf = 0;
  const move = () => { raf = 0; preview.style.transform = `translate(${x + 24}px, ${y - 90}px)`; };
  $$('.row').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const src = row.dataset.preview;
      preview.innerHTML = src ? `<img src="${src}" alt="">` : '<div class="ph"><span class="mono muted">Preview</span></div>';
      preview.classList.add('is-on');
    });
    row.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
    row.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(move); });
  });
}

/* ================= Mobile menu ================= */
const menu = $('[data-menu]'), menuBtn = $('[data-menu-toggle]');
if (menu && menuBtn) {
  const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
}

/* ================= Project video player ================= */
const player = $('[data-player]');
if (player) {
  const v = $('video', player), playBtn = $('[data-play]', player), time = $('[data-time]', player), bar = $('[data-bar]', player), played = $('[data-played]', player);
  const PLAY = '<svg width="16" height="18" viewBox="0 0 22 24" aria-hidden="true"><path d="M22 12L0 24V0L22 12Z" fill="currentColor"/></svg>';
  const PAUSE = '<svg width="16" height="18" viewBox="0 0 22 24" aria-hidden="true"><path d="M2 0h6v24H2zM14 0h6v24h-6z" fill="currentColor"/></svg>';
  const fmt = (s) => (isFinite(s) ? `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}` : '00:00');
  const toggle = () => (v.paused ? v.play() : v.pause());
  v.muted = !sound.isOn();
  playBtn.addEventListener('click', toggle);
  v.addEventListener('click', toggle);
  v.addEventListener('play', () => { player.classList.add('is-playing'); playBtn.innerHTML = PAUSE; playBtn.setAttribute('aria-label', 'Pause'); });
  v.addEventListener('pause', () => { player.classList.remove('is-playing'); playBtn.innerHTML = PLAY; playBtn.setAttribute('aria-label', 'Play'); });
  v.addEventListener('timeupdate', () => { time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`; played.style.width = `${(v.currentTime / v.duration) * 100 || 0}%`; });
  v.addEventListener('loadedmetadata', () => { time.textContent = `00:00 / ${fmt(v.duration)}`; });
  bar.addEventListener('click', (e) => { const r = bar.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * v.duration; });
  $('[data-mute]', player).addEventListener('click', (e) => { v.muted = !v.muted; e.currentTarget.textContent = v.muted ? 'Muted' : 'Sound'; });
  $('[data-fs]', player).addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : player.requestFullscreen?.()));
}

/* ================= Misc ================= */
$$('[data-placeholder-link]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
$$('[data-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); }));
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
const navLinks = $$('.nav__links a[href^="/#"]');
if (navLinks.length) {
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-current', a.hash === `#${en.target.id}`)); }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.hash); if (s) io.observe(s); });
}
