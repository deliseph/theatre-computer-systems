// Animation framework.
//
// Design rules these all follow, because a decorative animation is worse than
// no animation in a teaching context:
//
//  1. Every animation shows a real MECHANISM, and its numbers are the numbers
//     taught in the prose beside it. Nothing is faked for prettiness.
//  2. The student can break it. Controls exist to push the system into the
//     failure the class is about, not to admire the working case.
//  3. Colour is the Four Flows code used everywhere else: amber control,
//     cyan media, green clock, red management and faults.
//  4. It pauses when off screen and honours prefers-reduced-motion, because a
//     page of running canvases on a projector laptop is a real cost.

const REG = new Map();
export const register = (id, fn) => REG.set(id, fn);

// One source of truth for 'we are on a projector'. The class is on <body>
// before any module evaluates, so this is safe to read at module scope.
export const TEACH = document.body.classList.contains('teach-mode');

// --- Small DOM helpers ------------------------------------------------------

export const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Theme colours are read from the CSS custom properties, so the animations
// re-colour themselves with the rest of the site instead of hard-coding a
// palette that would be wrong in one of the two themes.
let paletteCache = null;
export function palette() {
  if (paletteCache) return paletteCache;
  const cs = getComputedStyle(document.documentElement);
  const g = (n, f) => (cs.getPropertyValue(n).trim() || f);
  paletteCache = {
    amber: g('--amber', '#f0a038'),
    cyan: g('--cyan', '#5cbdd2'),
    green: g('--green', '#6cc47f'),
    red: g('--red', '#e2685f'),
    ink: g('--ink', '#e7e9ee'),
    ink2: g('--ink-2', '#b9c0cc'),
    muted: g('--muted', '#8b94a3'),
    line: g('--line', '#272d38'),
    raised: g('--raised', '#1b1f27'),
    surface: g('--surface', '#14171d'),
    ground: g('--ground', '#0d0f13'),
  };
  return paletteCache;
}
// The theme button rewrites data-theme; drop the cache so the next frame repaints.
new MutationObserver(() => { paletteCache = null; })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paletteCache = null; });

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Controls ---------------------------------------------------------------

export function slider(label, { min = 0, max = 100, step = 1, value = 50, fmt = (v) => v, on }) {
  const node = h(`<label class="ac ac-slider">
    <span class="ac-l">${label}<b class="ac-v"></b></span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
  </label>`);
  const input = node.querySelector('input');
  const out = node.querySelector('.ac-v');
  const paint = () => { out.textContent = fmt(+input.value); };
  input.addEventListener('input', () => { paint(); on?.(+input.value); });
  paint();
  return { node, get value() { return +input.value; }, set(v) { input.value = v; paint(); on?.(+input.value); } };
}

export function toggle(label, { value = false, on }) {
  const node = h(`<button class="ac ac-toggle${value ? ' on' : ''}"><span class="ac-dot"></span>${label}</button>`);
  let v = value;
  node.addEventListener('click', () => {
    v = !v;
    node.classList.toggle('on', v);
    on?.(v);
  });
  return { node, get value() { return v; }, set(nv) { v = nv; node.classList.toggle('on', v); on?.(v); } };
}

export function button(label, on, cls = '') {
  const node = h(`<button class="ac ac-btn ${cls}">${label}</button>`);
  node.addEventListener('click', () => on?.(node));
  return { node, set label(t) { node.innerHTML = t; } };
}

export function choice(label, opts, { value, on }) {
  const node = h(`<div class="ac ac-choice"><span class="ac-l">${label}</span>
    <span class="ac-opts">${opts.map(([v, l]) =>
      `<button data-v="${v}"${String(v) === String(value) ? ' class="on"' : ''}>${l}</button>`).join('')}</span></div>`);
  node.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    node.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    on?.(b.dataset.v);
  });
  return { node };
}

// --- Figure shell -----------------------------------------------------------

/**
 * Where a note stops being setup and starts being the answer.
 *
 * Notes are not pure punchlines: many open with an observation ('Both are
 * running. Notice the difference in traffic') and land the claim at the end.
 * Every note that has a claim marks it with <b>, so the split is the sentence
 * boundary before the first bold, never mid-clause. A note with no bold folds
 * whole: hiding too much is recoverable in one keypress, leaking the answer is
 * not.
 */
export function splitNote(html) {
  const s = String(html);
  const cuts = [];
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '<') {
      const close = s.indexOf('>', i);
      if (close < 0) break;
      const tag = s.slice(i + 1, close);
      if (/^\//.test(tag)) depth = Math.max(0, depth - 1);
      else if (!/\/$/.test(tag) && !/^(br|img|hr)\b/i.test(tag)) depth++;
      i = close;
      continue;
    }
    if (depth > 0) continue;              // never cut inside <b> or <i>
    if (c !== '.' && c !== '?' && c !== '!') continue;
    let j = i + 1;
    while (j < s.length && /\s/.test(s[j])) j++;
    if (j === i + 1 || j >= s.length) continue;   // 2.00 Mbit/s is not a sentence end
    if (!/[A-Z0-9<“"(]/.test(s[j])) continue;
    cuts.push(j);
  }
  const parts = [];
  let prev = 0;
  for (const c of cuts) { parts.push(s.slice(prev, c)); prev = c; }
  parts.push(s.slice(prev));
  let k = parts.findIndex((p) => p.includes('<b>'));
  if (k < 0) k = 0;
  const text = (x) => x.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const lead = parts.slice(0, k).join('').trim();
  const held = parts.slice(k).join('').trim();
  if (text(lead).length < 25) return { lead: '', held: s.trim(), foldable: text(s).length >= 12 };
  return { lead, held, foldable: text(held).length >= 12 };
}

export function figure(host, { title, sub, note }) {
  host.innerHTML = '';
  const fig = el('figure', 'anim-fig');
  if (title) fig.append(h(`<figcaption class="anim-cap"><span class="anim-tag">Interactive</span>${title}</figcaption>`));
  if (sub) fig.append(h(`<p class="anim-sub">${sub}</p>`));
  const controls = el('div', 'anim-controls');
  const stage = el('div', 'anim-stage');
  fig.append(controls, stage);
  // The note is the figure's conclusion. On a projector it is legible from the
  // back of the room before the lecturer has finished the setup, so the room
  // reads the answer to a question nobody has asked it. In teach mode the note
  // holds: the setup sentences stay up, the sentence that lands the point waits
  // for the lecturer's n. Class pages are untouched, so a student alone on a
  // phone never has anything withheld.
  const noteEl = note ? h(`<p class="anim-note">${note}</p>`) : null;
  let leadEl = null, heldEl = null;
  if (noteEl && TEACH) {
    noteEl.innerHTML = '';
    leadEl = el('span', 'anim-note-lead');
    heldEl = el('span', 'anim-note-held');
    const key = h(`<button type="button" class="anim-note-key" aria-expanded="false" title="The figure&#39;s conclusion, held until the room has guessed. Press n, or click, to show it.">Say what you expect. Press <kbd>n</kbd> for the answer.</button>`);
    key.addEventListener('click', () => {
      noteEl.classList.remove('is-held');
      key.setAttribute('aria-expanded', 'true');
    });
    noteEl.append(leadEl, key, heldEl);
  }
  if (noteEl) fig.append(noteEl);
  host.append(fig);

  // A still figure has no animation loop to pick up a state change, so any
  // control that moves must trigger a repaint. Doing it here means every
  // figure gets it, rather than each one remembering to ask.
  let queued = false;
  const repaint = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const c of fig.querySelectorAll('canvas.anim-canvas')) {
        if (c.__anim && !c.__anim.running) c.__anim.once();
      }
    });
  };
  controls.addEventListener('input', repaint);
  controls.addEventListener('change', repaint);
  controls.addEventListener('click', repaint);

  /**
   * A goal to reach with the controls.
   *
   * A figure you can only fiddle with is a toy; a figure with something to
   * reach is a question. This adds one line above the controls saying what to
   * try, and marks it done when `test()` passes. There is no score, no timer
   * and no streak: it is a prompt that gets out of the way once you have had
   * the idea, which is the whole of the design brief.
   */
  function challenge(text, test) {
    const el = h(`<div class="anim-goal"><span class="anim-goal-tag">Try this</span>
      <span class="anim-goal-t">${text}</span></div>`);
    fig.insertBefore(el, controls);
    let done = false;
    const check = () => {
      let ok = false;
      try { ok = !!test(); } catch { ok = false; }
      if (ok && !done) {
        done = true;
        el.classList.add('got');
        el.querySelector('.anim-goal-tag').textContent = 'Got it';
      } else if (!ok && done) {
        // Let it go again, so a student can re-find it rather than being told
        // once that they are finished.
        done = false;
        el.classList.remove('got');
        el.querySelector('.anim-goal-tag').textContent = 'Try this';
      }
    };
    controls.addEventListener('input', check);
    controls.addEventListener('change', check);
    controls.addEventListener('click', () => requestAnimationFrame(check));
    return { check };
  }

  const setNote = (t) => {
    if (!noteEl) return;
    if (!TEACH) { noteEl.innerHTML = t; return; }
    let s;
    try { s = splitNote(t); } catch { s = { lead: '', held: String(t), foldable: true }; }
    leadEl.innerHTML = s.lead;
    heldEl.innerHTML = s.held;
    noteEl.classList.toggle('has-lead', !!s.lead);
    if (!s.foldable) { noteEl.removeAttribute('data-fold'); noteEl.classList.remove('is-held'); return; }
    // First real text is what arms the fold. A note that is already showing
    // stays showing while a slider moves it; re-holding is the deck's job, on
    // the next slide.
    if (!noteEl.hasAttribute('data-fold')) {
      noteEl.setAttribute('data-fold', '1');
      noteEl.classList.add('is-held');
    }
  };

  return { fig, controls, stage, repaint, challenge, setNote };
}

/**
 * Canvas with device-pixel scaling, resize handling, and a rAF loop that runs
 * only while the figure is on screen. `draw(g, w, h, t, dt)` gets CSS pixels.
 */
export function canvas(stage, { height = 260, draw, animated = true, controls }) {
  const cv = el('canvas', 'anim-canvas');
  stage.append(cv);
  const g = cv.getContext('2d');
  let w = 0, hgt = height, raf = 0, running = false, t0 = 0, last = 0, t = 0;

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = cv.clientWidth || stage.clientWidth || 600;
    hgt = height;
    cv.style.height = `${hgt}px`;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(hgt * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const frame = (now) => {
    if (!running) return;
    if (!t0) { t0 = now; last = now; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    g.clearRect(0, 0, w, hgt);
    draw(g, w, hgt, t, dt);
    raf = requestAnimationFrame(frame);
  };

  const api = {
    get w() { return w; },
    get h() { return hgt; },
    get t() { return t; },
    get running() { return running; },
    start() { if (running) return; running = true; t0 = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    once() { g.clearRect(0, 0, w, hgt); draw(g, w, hgt, t, 0); },
    reset() { t = 0; api.once(); },
    setHeight(v) { height = v; size(); api.once(); },
  };

  new ResizeObserver(() => { size(); if (!running) api.once(); }).observe(cv);
  size();

  // Off-screen figures do not burn frames. This matters on a laptop driving a
  // projector with several of these on one page.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && animated && !REDUCED && api.wanted !== false) api.start();
      else api.stop();
    }
  }, { rootMargin: '80px' });
  io.observe(cv);

  if (animated && controls) {
    // Reduced motion starts paused, and the button is how you opt in.
    api.wanted = !REDUCED;
    const b = button(REDUCED ? '▶ Play' : '❚❚ Pause', (node) => {
      api.wanted = !api.wanted;
      node.innerHTML = api.wanted ? '❚❚ Pause' : '▶ Play';
      api.wanted ? api.start() : api.stop();
    });
    controls.append(b.node);
  }
  api.once();
  cv.__anim = api;          // so figure() can repaint a still canvas on input
  return api;
}

// --- Drawing helpers --------------------------------------------------------

export function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function box(g, x, y, w, h, { fill, stroke, r = 8, lw = 1.5 }) {
  roundRect(g, x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

/**
 * Text inside a figure is drawn at 9.5 to 14px, which is right on a laptop and
 * unreadable from the back of a lecture hall. In teach mode every drawn label
 * is scaled up, with a floor, so the smallest annotations survive a projector.
 * Set once: the class is on <body> before any figure mounts.
 */
export const TEXT_SCALE = TEACH ? 1.34 : 1;
const MIN_PROJECTED = 13;

export function label(g, text, x, y, { color, size = 12, weight = 500, align = 'left', baseline = 'middle', mono = false }) {
  if (TEXT_SCALE !== 1) size = Math.max(MIN_PROJECTED, size * TEXT_SCALE);
  g.fillStyle = color;
  g.font = `${weight} ${size}px ${mono
    ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    : 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Noto Sans TC", sans-serif'}`;
  g.textAlign = align;
  g.textBaseline = baseline;
  g.fillText(text, x, y);
}

export function line(g, x1, y1, x2, y2, { color, lw = 2, dash }) {
  g.save();
  if (dash) g.setLineDash(dash);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.restore();
}

export function alpha(hex, a) {
  // Accepts #rgb / #rrggbb and returns rgba(). Colours come from CSS vars, so
  // they are always hex in practice; anything else is passed through unchanged.
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let s = m[1];
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- Mount ------------------------------------------------------------------

export function mountAll() {
  for (const node of document.querySelectorAll('.anim[data-anim]')) {
    if (node.dataset.mounted) continue;
    const fn = REG.get(node.dataset.anim);
    if (!fn) { node.remove(); continue; }   // unknown id: drop rather than show a hole
    node.dataset.mounted = '1';
    try {
      fn(node);
    } catch (err) {
      console.error('anim failed:', node.dataset.anim, err);
      node.remove();
    }
  }
}

// --- Video embeds -----------------------------------------------------------
//
// Click to load. Nothing reaches YouTube until a student asks for it, which
// keeps a class page free of third-party requests while it sits open on a
// projector, and keeps the page fast on a venue's network.

export function mountVideos() {
  for (const node of document.querySelectorAll('.vid[data-vid]')) {
    if (node.dataset.mounted) continue;
    node.dataset.mounted = '1';
    const { vid, title, chan, why } = node.dataset;
    const isList = vid.startsWith('list=');
    const watch = isList
      ? `https://www.youtube.com/playlist?${vid}`
      : `https://www.youtube.com/watch?v=${vid}`;
    const embed = isList
      ? `https://www.youtube-nocookie.com/embed/videoseries?${vid}`
      : `https://www.youtube-nocookie.com/embed/${vid}`;

    node.innerHTML = `<div class="vid-card">
      <button class="vid-play" aria-label="Play ${title}">
        <span class="vid-tri">▶</span>
        <span class="vid-meta">
          <b>${title}</b>
          <i>${chan}${isList ? ' · playlist' : ''}</i>
        </span>
      </button>
      <p class="vid-why">${why} <a href="${watch}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></p>
    </div>`;

    node.querySelector('.vid-play').addEventListener('click', (e) => {
      const card = e.currentTarget.parentElement;
      const frame = document.createElement('iframe');
      frame.className = 'vid-frame';
      frame.src = `${embed}?rel=0&autoplay=1`;
      frame.title = title;
      frame.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.loading = 'lazy';
      card.replaceChild(frame, e.currentTarget);
    });
  }
}
