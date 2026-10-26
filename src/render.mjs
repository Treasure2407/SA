// HTML templates for the showreel site. Content comes from content/*.json (edited in Pages CMS).
// Any missing image or video falls back to a labelled placeholder.

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lines = (s = '') => esc(s).split(/\r?\n/).join('<br>');
const pad = (n, w = 2) => String(n).padStart(w, '0');
const ext = (url) => (url ? `href="${esc(url)}" target="_blank" rel="noopener"` : 'href="#" data-placeholder-link');

/* ---------- Video helpers (Cloudinary, plain files, YouTube/Vimeo) ---------- */
const isCloudinary = (u) => /res\.cloudinary\.com\/.+\/video\/upload\//.test(u || '');
const cld = (u, t) => u.replace('/video/upload/', `/video/upload/${t}/`);
// Short looping preview for the reel, cut from the full video by Cloudinary.
export function previewSrc(p) {
  if (!p.video) return '';
  if (isCloudinary(p.video)) return cld(p.video, `so_${Number(p.previewStart) || 0},du_6,w_960,q_auto`).replace(/\.\w+$/, '.mp4');
  return /\.(mp4|webm|mov)(\?|$)/i.test(p.video) ? p.video : '';
}
export function posterSrc(p) {
  if (p.poster) return p.poster;
  if (isCloudinary(p.video)) return cld(p.video, `so_${Number(p.previewStart) || 0},w_1280,q_auto`).replace(/\.\w+$/, '.jpg');
  return '';
}
function embed(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return '';
}

/* ---------- Shared bits ---------- */
const placeholder = (label, kind = 'photo') => `<div class="ph" role="img" aria-label="Placeholder: ${esc(label)}"><span class="mono accent">+ Add ${kind}</span><span class="mono muted">${esc(label)}</span></div>`;
const img = (src, alt, label, attrs = 'loading="lazy"') => (src ? `<img src="${esc(src)}" alt="${esc(alt || '')}" ${attrs}>` : placeholder(label));
const PLAY = '<svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true"><path d="M22 12L0 24V0L22 12Z" fill="currentColor"/></svg>';
const SPEAKER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path class="sound__waves" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="sound__mute" d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const vf = (cls = 'vf') => `<div class="${cls}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;

function cta(c) {
  const href = c.contact.bookingUrl || (c.contact.email ? `mailto:${c.contact.email}` : '#contact');
  return `href="${esc(href)}"${c.contact.bookingUrl ? ' target="_blank" rel="noopener"' : ''}`;
}

function layout(c, { title, description, page, body }) {
  return `<!doctype html>
<html lang="en" data-page="${page}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script>
    // Decide before first paint whether the intro or a closed curtain covers the page (avoids a flash).
    // The home page plays the full intro on every fresh load or refresh; arriving through the
    // curtain from another page (or with the back button) only opens the curtain.
    (function () {
      var d = document.documentElement, s = sessionStorage, rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      try {
        var nav = performance.getEntriesByType('navigation')[0], viaCurtain = s.getItem('sa-curtain') === 'closed';
        if (rm) return;
        if (d.dataset.page === 'home' && (!viaCurtain || (nav && nav.type === 'reload')) && !(nav && nav.type === 'back_forward')) d.classList.add('intro-on', 'curtain-on');
        else if (viaCurtain) d.classList.add('curtain-on');
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/site.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${body}
  <div class="curtain" aria-hidden="true"><div class="drape drape--l"></div><div class="drape drape--r"></div></div>
  <div class="cursor" aria-hidden="true"><span class="cursor__frame"><span class="cursor__label mono"></span></span><span class="cursor__dot"></span></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="/js/site.js" defer></script>
</body>
</html>
`;
}

function nav(c, active) {
  const links = [['Reel', '/#reel'], ['Photography', '/#photography'], ['Videos', '/#videos'], ['About', '/#about'], ['Contact', '#contact']];
  return `
  <header class="nav" data-nav>
    <a class="logo" href="/" data-curtain-link aria-label="SA Imagery — home"><span class="logo__mark">SA</span><span class="mono muted">Ajayi Samuel</span></a>
    <nav class="nav__links" aria-label="Primary">
${links.map(([l, h]) => `      <a class="mono${l === active ? ' is-current' : ''}" href="${h}"${h.startsWith('/') ? ' data-curtain-link' : ''}>${l}</a>`).join('\n')}
    </nav>
    <div class="nav__right">
      <a class="body-m-medium underline nav__book" ${cta(c)}>Book a shoot ↗</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle><span class="sr-only">Open menu</span><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 9H25M3 19H17" stroke="currentColor" stroke-width="2"/></svg></button>
    </div>
  </header>
  <div class="menu" id="menu" hidden data-menu>
    <nav aria-label="Mobile">
${links.map(([l, h], i) => `      <a href="${h}" data-menu-link${h.startsWith('/') ? ' data-curtain-link' : ''}><span class="mono muted">${pad(i + 1)}</span>${l}</a>`).join('\n')}
    </nav>
    <a class="btn btn--outline" ${cta(c)} data-menu-link>Book a shoot ↗</a>
  </div>`;
}

function footer(c) {
  return `
  <footer class="footer" id="contact">
    <div class="footer__content">
      <p class="mono muted">( 05 ) — Contact</p>
      <h2 class="footer__headline">${esc(c.footer.headline)}</h2>
      <div class="footer__row">
        <div><p class="mono muted">Email</p>${c.contact.email ? `<a class="footer__email" href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a>` : '<p class="footer__email">Email coming soon</p>'}</div>
        <div><p class="mono muted">Socials</p><ul class="socials" role="list">${(c.contact.socials || []).map((s) => `<li><a class="body-m-medium" ${ext(s.url)}>${esc(s.label)} ↗</a></li>`).join('')}</ul></div>
        <div><p class="mono muted">Booking</p><a class="body-m-medium underline" ${cta(c)}>Book a shoot ↗</a></div>
      </div>
    </div>
    <div class="wrap">
      <div class="wrap__drape"></div><div class="wrap__drape"></div>
      <p class="wrap__title">${esc(c.footer.wrap)}</p>
      <p class="mono wrap__meta">© <span data-year>2026</span> SA Imagery · <a href="#top" data-top>Back to top ↑</a></p>
    </div>
  </footer>`;
}

function clip(p, i, feature = false) {
  const prev = previewSrc(p), poster = posterSrc(p);
  return `
        <li class="clip${feature ? ' clip--feature' : ''}">
          <a class="clip__link" href="/work/${p.slug}/" data-curtain-link data-clip>
            <div class="clip__screen">
              ${poster ? `<img class="clip__poster" src="${esc(poster)}" alt="" loading="lazy">` : (prev ? '' : placeholder(`Preview clip ${pad(i + 1)}`, 'video'))}
              ${prev ? `<video class="clip__video" src="${esc(prev)}" muted loop playsinline preload="none"${poster ? ` poster="${esc(poster)}"` : ''}></video>` : ''}
              <span class="mono muted clip__code">SA_${pad(i + 1, 3)}${feature ? ' — Now playing' : ''}</span>
              <span class="mono clip__tc">${esc(p.length || '00:00')}</span>
              <span class="play" aria-hidden="true">${PLAY}</span>
              <span class="mono clip__chip" aria-hidden="true">${SPEAKER}<span data-chip-label>Sound</span></span>
            </div>
            <div class="clip__meta"><h3 class="clip__title">${esc(p.title)}</h3><span class="mono muted">${esc(p.client)} — ${esc(p.type)}</span></div>
          </a>
        </li>`;
}

/* ---------- Pages ---------- */
export function homePage(c, projects, sets) {
  const reel = projects.filter((p) => p.section !== 'more');
  const more = projects.filter((p) => p.section === 'more');
  const [feature, ...rest] = reel;
  const head = (idx, id, t, note) => `
      <div class="head">
        <div class="head__title"><span class="mono muted">( ${idx} )</span><h2 id="${id}-title">${esc(t)}</h2></div>
        ${note ? `<p class="mono muted head__note">${lines(note)}</p>` : ''}
      </div>`;

  const body = `
${nav(c, 'Reel')}
  <!-- ============ INTRO: lights, camera, action (first visit per session) ============ -->
  <div class="intro" aria-hidden="true" data-intro>
    <div class="spot"></div>
    <p class="word" data-word="lights">Lights</p>
    <div class="frame"><i></i><i></i><i></i><i></i><span class="frame__rec mono"><span class="rec-dot"></span>REC <span data-timecode>00:00:00:00</span></span><span class="frame__fmt mono">4K · 24P</span></div>
    <p class="word" data-word="camera">Camera</p>
    <svg class="clapper" viewBox="0 0 320 240" aria-hidden="true">
      <g class="clapper__stick"><rect x="10" y="40" width="300" height="34" fill="#0b0b0a" stroke="#f3efe7" stroke-width="3"/><path d="M30 40 L60 74 M90 40 L120 74 M150 40 L180 74 M210 40 L240 74 M270 40 L300 74" stroke="#f3efe7" stroke-width="14"/></g>
      <rect x="10" y="78" width="300" height="34" fill="#0b0b0a" stroke="#f3efe7" stroke-width="3"/>
      <path d="M40 78 L10 112 M100 78 L70 112 M160 78 L130 112 M220 78 L190 112 M280 78 L250 112" stroke="#f3efe7" stroke-width="14"/>
      <rect x="10" y="112" width="300" height="118" fill="#0b0b0a" stroke="#f3efe7" stroke-width="3"/>
      <text x="26" y="146" class="clapper__text">SA IMAGERY</text>
      <text x="26" y="178" class="clapper__text clapper__text--muted">SCENE 01</text>
      <text x="170" y="178" class="clapper__text clapper__text--muted">TAKE 01</text>
      <text x="26" y="212" class="clapper__text clapper__text--muted">DIR. AJAYI SAMUEL</text>
    </svg>
    <p class="word word--action" data-word="action">Action</p>
    <div class="flash"></div>
  </div>
  <button class="skip mono" type="button" data-skip>Skip intro →</button>
  <!-- sound control lives on the intro only; tapping it is what lets browsers play the intro sounds -->
  <button class="sound mono" type="button" aria-pressed="true" data-sound>${SPEAKER}<span data-sound-label>Sound on</span></button>

  <main id="main">
    <!-- HERO: the featured clip fills the screen, nav on top -->
    <section class="hero" aria-label="Featured project">
      <ul class="hero__clip" role="list">
${feature ? clip(feature, 0, true) : ''}
      </ul>
    </section>

    <!-- 01 REEL -->
    <section class="section reel" id="reel" aria-label="The reel">
      <ul class="clips" role="list" data-clips>
${rest.map((p, i) => clip(p, i + 1)).join('')}
      </ul>
      ${rest.length > 4 ? `<button class="btn btn--outline clips__more" type="button" data-more>Show all ${rest.length} clips ↓</button>` : ''}
    </section>

    <!-- 02 PHOTOGRAPHY: sets drift sideways on their own; hovering one pauses the strip -->
    <section class="section photo" id="photography" aria-labelledby="photography-title">
${head('02', 'photography', c.photography.title, c.photography.note)}
      <div class="sets" data-sets>
        <ul class="sets__track" role="list" style="--n:${Math.max(sets.length, 1)}">
${[0, 1].map((copy) => sets.map((s, i) => `          <li class="set"${copy ? ' aria-hidden="true"' : ''}>
            <a class="set__link" href="/photos/${s.slug}/" data-curtain-link${copy ? ' tabindex="-1"' : ''}>
              <div class="set__stack">${img(s.cover || s.images?.find((x) => x.image)?.image, copy ? '' : s.title, `Set ${pad(i + 1)} cover`)}</div>
              <p class="set__name">${esc(s.title)}</p>
              <p class="mono muted">${pad((s.images || []).length)} images</p>
            </a>
          </li>`).join('\n')).join('\n')}
        </ul>
      </div>
    </section>

    <!-- 03 MORE VIDEOS -->
    <section class="section videos" id="videos" aria-labelledby="videos-title">
${head('03', 'videos', c.videos.title, c.videos.note)}
      <ul class="rows" role="list">
${more.map((p, i) => `        <li><a class="row" href="/work/${p.slug}/" data-curtain-link data-preview="${esc(posterSrc(p))}">
          <span class="mono muted">${pad(i + 1)}</span>
          <span class="row__title">${esc(p.title)}</span>
          <span class="mono muted row__client">${esc(p.client)}</span>
          <span class="mono muted row__type">${esc(p.type)}</span>
          <span class="mono muted row__year">${esc(p.year)}</span>
          <span class="mono muted row__len">${esc(p.length)}</span>
          <span class="row__arrow" aria-hidden="true">↗</span>
        </a></li>`).join('\n')}
      </ul>
      <div class="row-preview" aria-hidden="true" data-row-preview></div>
    </section>

    <!-- 04 ABOUT -->
    <section class="section about" id="about" aria-labelledby="about-title">
      <div class="about__grid">
        <div class="about__photo">${img(c.about.photo, c.about.photoAlt, 'About — portrait')}</div>
        <div class="about__copy">
          <p class="mono muted">( 04 ) — About</p>
          <h2 class="about__name" id="about-title">${lines(c.about.name)}</h2>
          <p class="body-l">${esc(c.about.lead)}</p>
          <p class="body-m muted">${esc(c.about.body)}</p>
          <dl class="facts">${(c.about.facts || []).map((f) => `<div><dt class="mono muted">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
        </div>
      </div>
      <div class="logos">
        <p class="mono muted">Worked with</p>
        <div class="logos__band" aria-label="${esc((c.about.logos || []).map((l) => l.name).join(', '))}">
          <div class="logos__track">${[0, 1, 2, 3].map((k) => (c.about.logos || []).map((l) => (l.logo ? `<img src="${esc(l.logo)}" alt="${k ? '' : esc(l.name)}" loading="lazy">` : `<span class="logos__text">${esc(l.name)}</span>`)).join('')).join('')}</div>
        </div>
      </div>
    </section>
  </main>
${footer(c)}`;
  return layout(c, { title: c.settings.pageTitle, description: c.settings.description, page: 'home', body });
}

export function projectPage(c, p, i, all) {
  const next = all[(i + 1) % all.length];
  const poster = posterSrc(p);
  const src = p.video || '';
  const iframe = src && embed(src);
  const notes = (p.notes || []).map((n, k) => `
          <div class="note">
            <h3><span class="mono accent">${pad(k + 1)}</span>${esc(n.heading)}</h3>
            <p class="body-l">${esc(n.text)}</p>
          </div>${k === 1 && (p.stills || []).length ? `
          <div class="stills">${p.stills.slice(0, 2).map((s, j) => img(s.image, s.caption, `Still ${j + 1}`)).join('')}</div>` : k === 1 ? `
          <div class="stills">${placeholder('Still 1')}${placeholder('Still 2')}</div>` : ''}`).join('');

  const player = iframe
    ? `<div class="player player--embed"><iframe src="${esc(iframe)}" title="${esc(p.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
    : src
      ? `<div class="player" data-player>
          <video src="${esc(src)}" playsinline preload="metadata"${poster ? ` poster="${esc(poster)}"` : ''}></video>
          <div class="player__controls">
            <button type="button" class="player__play" data-play aria-label="Play">${PLAY}</button>
            <span class="mono" data-time>00:00 / 00:00</span>
            <div class="player__bar" data-bar><i data-played></i></div>
            <button type="button" class="mono" data-mute>Sound</button>
            <button type="button" class="mono" data-fs>Full screen</button>
          </div>
        </div>`
      : `<div class="player">${placeholder('Full video — paste a Cloudinary, YouTube or Vimeo link', 'video')}<span class="play play--static" aria-hidden="true">${PLAY}</span></div>`;

  const body = `
  <header class="bar">
    <a class="mono" href="/#reel" data-curtain-link>← Back to the reel</a>
    <span class="mono muted bar__mid">SA_${pad(i + 1, 3)} / ${pad(all.length)}</span>
    <a class="mono" href="/work/${next.slug}/" data-curtain-link>Next project →</a>
  </header>
  <main id="main" class="project">
    <div class="project__head">
      <p class="mono muted">${esc(p.client)} — ${esc(p.type)}</p>
      <h1 class="project__title">${esc(p.title)}</h1>
      <dl class="project__meta">
        <div><dt class="mono muted">Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt class="mono muted">Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt class="mono muted">Length</dt><dd>${esc(p.length)}</dd></div>
        <div><dt class="mono muted">Category</dt><dd>${esc(p.type)}</dd></div>
      </dl>
    </div>
    ${player}
    <section class="split" aria-label="Thought process">
      <div class="split__label"><p class="mono">Thought process</p><p class="body-m muted">In Samuel's words — how the film came together, from brief to final cut.</p></div>
      <div class="notes">${notes}
      </div>
    </section>
    <section class="split" aria-label="Credits">
      <div class="split__label"><p class="mono">Credits</p></div>
      <dl class="facts">${(p.credits || []).map((f) => `<div><dt class="mono muted">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
    </section>
  </main>
  <a class="next" href="/work/${next.slug}/" data-curtain-link>
    <span><span class="mono muted">Next project — ${esc(next.client)}</span><span class="next__title">${esc(next.title)} →</span></span>
    <span class="next__img">${img(posterSrc(next), '', 'Next project still')}</span>
  </a>
${footer(c)}`;
  return layout(c, { title: `${p.title} — ${p.client} | Ajayi Samuel`, description: `${p.type} for ${p.client} by Ajayi Samuel (SA Imagery).`, page: 'project', body });
}

export function setPage(c, s, i, all) {
  const next = all[(i + 1) % all.length];
  const images = s.images || [];
  // layout rhythm: full · half · half · full · third · third · third, then repeat
  const pattern = ['full', 'half', 'half', 'full', 'third', 'third', 'third'];
  const shots = images.map((im, k) => `
      <figure class="shot shot--${pattern[k % pattern.length]}">
        <div class="shot__img">${img(im.image, im.caption || `${s.title} — photo ${k + 1}`, `${s.title} — photo ${pad(k + 1)}`)}</div>
        <figcaption class="mono muted">${pad(k + 1)} / ${pad(images.length)}${im.caption ? ` — ${esc(im.caption)}` : ''}</figcaption>
      </figure>`).join('');
  const body = `
  <header class="bar">
    <a class="mono" href="/#photography" data-curtain-link>← Back to photography</a>
    <span class="mono muted bar__mid">Set ${pad(i + 1)} / ${pad(all.length)}</span>
    <a class="mono" href="/photos/${next.slug}/" data-curtain-link>Next set →</a>
  </header>
  <main id="main" class="project">
    <div class="project__head">
      <p class="mono muted">${esc(s.client)} · ${esc(s.year)} · ${pad(images.length)} images</p>
      <h1 class="project__title">${esc(s.title)}</h1>
    </div>
    <div class="shots">${shots}
    </div>
  </main>
  <a class="next" href="/photos/${next.slug}/" data-curtain-link>
    <span><span class="mono muted">Next set — ${pad((next.images || []).length)} images</span><span class="next__title">${esc(next.title)} →</span></span>
    <span class="next__img next__img--tall">${img(next.cover || next.images?.find((x) => x.image)?.image, '', 'Next set cover')}</span>
  </a>
${footer(c)}`;
  return layout(c, { title: `${s.title} — Photography | Ajayi Samuel`, description: `${s.title}: a photo set by Ajayi Samuel (SA Imagery).`, page: 'set', body });
}
