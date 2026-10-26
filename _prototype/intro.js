// Intro prototype: lights → camera → action → curtain reveal, plus curtain page transitions.
// Sounds are synthesized with the Web Audio API (no audio files, so no licensing to worry about).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const intro = $('#intro');
const reelView = $('#reel');
const projectView = $('#project');
const drapeL = $('.drape--l');
const drapeR = $('.drape--r');
const skipBtn = $('[data-skip]');

/* ---------------- Sound (on by default) ----------------
   Browsers only let a page make sound after the visitor's first tap, click or key press.
   We try straight away (some browsers allow it for returning visitors) and otherwise
   unlock on the very first interaction anywhere on the page. The button only mutes. */
const sound = (() => {
  let on = true;
  const btn = $('[data-sound]');
  const label = $('[data-sound-label]');

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const live = () => ctx.state === 'running';
  function update() {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-waiting', on && !live());
    label.textContent = !on ? 'Sound off' : live() ? 'Sound on' : 'Tap for sound';
  }
  function unlock() { if (!live()) ctx.resume().then(update, update); }

  ctx.addEventListener?.('statechange', update);
  unlock();
  ['pointerdown', 'touchend', 'keydown'].forEach((type) => window.addEventListener(type, unlock, { capture: true, passive: true }));

  // Short filtered noise burst — the building block for clicks, claps and whooshes.
  function burst({ dur = 0.05, type = 'bandpass', freq = 2000, q = 1, gain = 0.5, attack = 0.002, sweepTo } = {}) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  function tone({ freq = 120, to = 60, dur = 0.12, gain = 0.5, type = 'sine' } = {}) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }

  const fx = {
    flicker: () => { burst({ dur: 0.04, freq: 3500, q: 3, gain: 0.12 }); tone({ freq: 100, to: 98, dur: 0.18, gain: 0.05, type: 'sawtooth' }); },
    shutter: () => { burst({ dur: 0.02, type: 'highpass', freq: 2500, gain: 0.4 }); setTimeout(() => on && burst({ dur: 0.03, type: 'highpass', freq: 1800, gain: 0.3 }), 70); },
    clap: () => { burst({ dur: 0.16, freq: 1400, q: 0.8, gain: 0.9, attack: 0.001 }); tone({ freq: 160, to: 55, dur: 0.1, gain: 0.6 }); },
    whoosh: (dur = 1.2) => burst({ dur, type: 'lowpass', freq: 250, sweepTo: 1600, q: 0.7, gain: 0.18, attack: dur * 0.4 }),
    tick: () => burst({ dur: 0.015, type: 'highpass', freq: 4000, gain: 0.08 }),
  };

  btn.addEventListener('click', () => {
    // a first click while the browser is holding sound just unlocks it; after that it mutes/unmutes
    if (on && !live()) return;
    on = !on;
    update();
  });
  update();

  return { play: (name, ...args) => { if (on && live()) fx[name](...args); } };
})();

/* ---------------- Timecode (HH:MM:SS:FF @ 24fps) ---------------- */
const pad = (n) => String(n).padStart(2, '0');
let tcStart = performance.now();
(function tc(now) {
  const f = Math.floor(((now - tcStart) / 1000) * 24);
  const s = Math.floor(f / 24);
  $$('[data-timecode]').forEach((el) => { el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`; });
  requestAnimationFrame(tc);
})(performance.now());

/* ---------------- Velvet curtain ---------------- */
const curtain = {
  setClosed() { gsap.set([drapeL, drapeR], { xPercent: 0, scaleX: 1 }); },
  setOpen() { gsap.set(drapeL, { xPercent: -101 }); gsap.set(drapeR, { xPercent: 101 }); },
  // gather the fabric towards the sides, then pull it off screen
  open() {
    return gsap.timeline({ onStart: () => sound.play('whoosh', 1.3) })
      .to([drapeL, drapeR], { scaleX: 0.14, duration: 1.4, ease: 'power3.inOut' })
      .to(drapeL, { xPercent: -101, duration: 0.6, ease: 'power2.in' }, '-=0.15')
      .to(drapeR, { xPercent: 101, duration: 0.6, ease: 'power2.in' }, '<');
  },
  close() {
    return gsap.timeline({ onStart: () => sound.play('whoosh', 0.8) })
      .set([drapeL, drapeR], { scaleX: 0.14 })
      .to(drapeL, { xPercent: 0, duration: 0.35, ease: 'power2.out' })
      .to(drapeR, { xPercent: 0, duration: 0.35, ease: 'power2.out' }, '<')
      .to([drapeL, drapeR], { scaleX: 1, duration: 0.7, ease: 'power3.inOut' })
      .call(() => sound.play('tick'));
  },
};

/* ---------------- Intro timeline ---------------- */
const words = {
  lights: $('[data-word="lights"]'),
  camera: $('[data-word="camera"]'),
  action: $('[data-word="action"]'),
};
const spot = $('.spot');
const frame = $('.frame');
const clapper = $('.clapper');
const stick = $('.clapper__stick');
const flash = $('.flash');
let introTl = null;

function resetIntro() {
  gsap.set(intro, { autoAlpha: 1 });
  gsap.set([spot, frame, clapper, flash, ...Object.values(words)], { opacity: 0, clearProps: 'transform,letterSpacing' });
  // centre with GSAP's own percent offsets (it replaces CSS `translate` when it animates transforms)
  gsap.set([frame, clapper, ...Object.values(words)], { xPercent: -50, yPercent: -50 });
  gsap.set(stick, { rotation: -26, transformOrigin: '0% 100%' });
  curtain.setClosed();
  reelView.hidden = false; projectView.hidden = true;
  document.body.classList.add('is-locked');
  skipBtn.classList.remove('is-gone');
}

function finish() {
  document.body.classList.remove('is-locked');
  skipBtn.classList.add('is-gone');
  gsap.from('.clip', { opacity: 0, y: 30, duration: 0.8, stagger: 0.06, ease: 'power3.out' });
}

function playIntro() {
  introTl?.kill();
  resetIntro();
  window.scrollTo(0, 0);
  tcStart = performance.now();

  if (reduceMotion) { gsap.set(intro, { autoAlpha: 0 }); curtain.setOpen(); finish(); return; }

  introTl = gsap.timeline({ delay: 0.4 })
    // LIGHTS — the studio light flickers on
    .to(spot, { keyframes: [{ opacity: 0.7, duration: 0.05 }, { opacity: 0.05, duration: 0.09 }, { opacity: 0.9, duration: 0.05 }, { opacity: 0.25, duration: 0.12 }, { opacity: 1, duration: 0.2 }] })
    .call(() => sound.play('flicker'), null, 0)
    .call(() => sound.play('flicker'), null, 0.14)
    .call(() => sound.play('flicker'), null, 0.31)
    .fromTo(words.lights, { opacity: 0, letterSpacing: '0.4em' }, { opacity: 1, letterSpacing: '0.02em', duration: 0.7, ease: 'power3.out' }, 0.25)
    .to(words.lights, { opacity: 0, y: -20, duration: 0.25, ease: 'power2.in' }, 1.25)
    .to(spot, { opacity: 0.35, duration: 0.4 }, 1.25)
    // CAMERA — the viewfinder snaps into place and starts recording
    .fromTo(frame, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, 1.45)
    .call(() => { sound.play('shutter'); tcStart = performance.now(); }, null, 1.45)
    .fromTo(words.camera, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }, 1.55)
    .to([words.camera, frame], { opacity: 0, duration: 0.25 }, 2.45)
    // ACTION — the clapperboard snaps shut
    .fromTo(clapper, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 2.6)
    .to(stick, { rotation: 0, duration: 0.09, ease: 'power4.in' }, 3.15)
    .call(() => sound.play('clap'), null, 3.24)
    .fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.35, immediateRender: false }, 3.24)
    .to(clapper, { keyframes: [{ x: -6, duration: 0.04 }, { x: 5, duration: 0.04 }, { x: 0, duration: 0.05 }] }, 3.24)
    .fromTo(words.action, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.out' }, 3.24)
    // hand over to the curtain
    .to(intro, { autoAlpha: 0, duration: 0.4, ease: 'power2.inOut' }, 3.9)
    .add(() => curtain.open().eventCallback('onComplete', finish), 4.15);
}

function skip() {
  if (!document.body.classList.contains('is-locked') || !introTl?.isActive()) return;
  introTl.kill();
  gsap.to(intro, { autoAlpha: 0, duration: 0.3 });
  curtain.open().eventCallback('onComplete', finish);
  skipBtn.classList.add('is-gone');
}
skipBtn.addEventListener('click', skip);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); });

/* ---------------- Placeholder reel + curtain page transition ---------------- */
const CLIPS = [
  ['Web3bridge — Brand film', 'Project title'], ['Amplify Africa — Edit', 'Project title'], ['AllThings Africa — Edit', 'Project title'],
  ['Event coverage', 'Project title'], ['Documentary', 'Project title'], ['Social campaign', 'Project title'], ['Music video', 'Project title'],
];
$('[data-clips]').innerHTML = CLIPS.map(([client, name], i) => `
  <li class="clip">
    <button class="clip__btn" type="button" data-open="${i}" aria-label="Open ${name} — ${client}">
      <div class="clip__screen">
        <span class="mono muted clip__label">Preview clip ${pad(i + 1)}</span>
        <span class="mono clip__tc">00:00:0${(i % 5) + 3}:00</span>
        <span class="play" aria-hidden="true"><svg width="22" height="24" viewBox="0 0 22 24"><path d="M22 12L0 24V0L22 12Z" fill="currentColor"/></svg></span>
      </div>
      <div class="clip__meta"><span class="clip__name">${name}</span><span class="mono muted">${client}</span></div>
    </button>
  </li>`).join('');

let busy = false;
async function transition(swap) {
  if (busy) return;
  busy = true;
  await curtain.close();
  swap();
  window.scrollTo(0, 0);
  await gsap.delayedCall(0.15, () => {});
  await curtain.open();
  busy = false;
}

$$('[data-open]').forEach((btn) => {
  const li = btn.closest('.clip');
  btn.addEventListener('pointerenter', () => { li.classList.add('is-hot'); sound.play('tick'); });
  btn.addEventListener('pointerleave', () => li.classList.remove('is-hot'));
  btn.addEventListener('click', () => {
    const [client] = CLIPS[btn.dataset.open];
    transition(() => {
      $('[data-project-client]').textContent = client;
      $('[data-project-code]').textContent = `SA_${String(+btn.dataset.open + 1).padStart(3, '0')}`;
      reelView.hidden = true; projectView.hidden = false;
    });
  });
});
$('[data-back]').addEventListener('click', () => transition(() => { projectView.hidden = true; reelView.hidden = false; }));

/* ---------------- Prototype control: replay ---------------- */
$('[data-replay]').addEventListener('click', playIntro);
playIntro();
