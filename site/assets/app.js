// Shell behaviour: theme, mobile nav, tabs, search, and progress tracking.

// --- Theme ------------------------------------------------------------------
// Three states, matching the CSS: explicit light, explicit dark, or unset,
// which follows the operating system. Stored per browser only.

const THEME_KEY = 'tcs-theme';

function applyTheme(v) {
  if (v) document.documentElement.setAttribute('data-theme', v);
  else document.documentElement.removeAttribute('data-theme');
}

try {
  applyTheme(localStorage.getItem(THEME_KEY));
} catch { /* private mode, blocked storage: fall through to system theme */ }

document.querySelector('.theme-btn')?.addEventListener('click', () => {
  const now = document.documentElement.getAttribute('data-theme');
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const next = now ? (now === 'dark' ? 'light' : null) : (prefersDark ? 'light' : 'dark');
  applyTheme(next);
  try {
    if (next) localStorage.setItem(THEME_KEY, next);
    else localStorage.removeItem(THEME_KEY);
  } catch { /* ignore */ }
});

// --- Mobile nav -------------------------------------------------------------

const side = document.querySelector('.side');
const menuBtn = document.querySelector('.menu-btn');
menuBtn?.addEventListener('click', () => {
  const open = side.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
side?.addEventListener('click', (e) => {
  if (e.target.closest('a')) side.classList.remove('open');
});

// --- Tabs -------------------------------------------------------------------
// The chosen tab is kept in the URL hash so a lecturer can link straight to,
// say, the tools tab of Class 3 from their own notes.

const tabs = [...document.querySelectorAll('.tab')];
function showTab(id, push) {
  if (!tabs.length) return;
  const btn = tabs.find((t) => t.dataset.tab === id);
  if (!btn) return;
  tabs.forEach((t) => t.classList.toggle('on', t === btn));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('on', p.dataset.panel === id));
  if (push) history.replaceState(null, '', `#tab=${id}`);
}
// Which tab this reader had open last, per page. Prepare is the right landing
// place the first time and friction on every visit after it.
const TABKEY = `tcs:tab:${location.pathname}`;
const remember = (id) => { try { localStorage.setItem(TABKEY, id); } catch { /* private window */ } };
const recall = () => { try { return localStorage.getItem(TABKEY); } catch { return null; } };

tabs.forEach((t) => t.addEventListener('click', () => { showTab(t.dataset.tab, true); remember(t.dataset.tab); }));

// An in-page link to #tab=... must switch the tab. Without this the header's
// "Start learning" button changed the URL and left the reader on Prepare.
function tabFromHash(push) {
  if (!location.hash.startsWith('#tab=')) return false;
  const id = location.hash.slice(5);
  if (!tabs.some((t) => t.dataset.tab === id)) return false;
  showTab(id, false);
  if (push) remember(id);
  document.querySelector('.tabs')?.scrollIntoView({ block: 'nearest' });
  return true;
}
addEventListener('hashchange', () => { tabFromHash(true); });
if (!tabFromHash(false)) {
  const last = recall();
  if (last && tabs.some((t) => t.dataset.tab === last)) showTab(last, false);
}

// A link to a heading inside a hidden panel must open that panel first,
// otherwise the anchor lands on nothing.
function revealHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id || id.startsWith('tab=')) return;
  const target = document.getElementById(id);
  const panel = target?.closest('.panel');
  if (panel && !panel.classList.contains('on')) {
    showTab(panel.dataset.panel, false);
    target.scrollIntoView();
  }
}
addEventListener('hashchange', revealHash);
revealHash();

// --- Self-test accordions ---------------------------------------------------

document.addEventListener('click', (e) => {
  const q = e.target.closest('.qa-q');
  if (!q) return;
  const open = q.getAttribute('aria-expanded') === 'true';
  q.setAttribute('aria-expanded', String(!open));
  q.nextElementSibling.hidden = open;
});

// --- Progress ---------------------------------------------------------------
// Per browser, per student. Never leaves the device, which is why it tracks
// only "studied", never a grade.

const PROG_KEY = 'tcs-progress';
export function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY)) || {}; } catch { return {}; }
}
export function setProgress(p) {
  try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const doneBtn = document.querySelector('.js-done');
if (doneBtn) {
  const n = doneBtn.dataset.class;
  const paint = () => {
    const done = !!getProgress()[`class-${n}`];
    doneBtn.textContent = done ? '✓ Studied' : 'Mark as studied';
    doneBtn.dataset.done = done ? '1' : '';
  };
  doneBtn.addEventListener('click', () => {
    const p = getProgress();
    if (p[`class-${n}`]) delete p[`class-${n}`];
    else p[`class-${n}`] = Date.now();
    setProgress(p);
    paint();
  });
  paint();
}

const strip = document.getElementById('progress-strip');
if (strip) {
  const p = getProgress();
  const done = [1, 2, 3, 4, 5].filter((n) => p[`class-${n}`]).length;
  const pct = Math.round((done / 5) * 100);
  strip.innerHTML = `<div class="pbar">
    <span class="pbar-lbl">${done} of 5 classes</span>
    <span class="pbar-track"><span class="pbar-fill" style="width:${pct}%"></span></span>
    <span class="pbar-lbl">${pct}%</span></div>`;
}

// --- Search -----------------------------------------------------------------
// The index is small enough (a few hundred entries) that a plain scored
// substring match beats loading a search library, and it works offline.

const modal = document.querySelector('.search-modal');
const input = document.querySelector('.search-input');
const results = document.querySelector('.search-results');
let index = null;
let sel = 0;

async function loadIndex() {
  if (index) return index;
  try {
    index = await (await fetch('/search-index.json')).json();
  } catch {
    index = [];
  }
  return index;
}

function openSearch() {
  modal.hidden = false;
  input.value = '';
  results.innerHTML = '<p class="sr-none">Type to search every class, tool and term.</p>';
  input.focus();
  loadIndex();
}
function closeSearch() { modal.hidden = true; }

function score(entry, terms) {
  const title = entry.t.toLowerCase();
  const section = entry.s.toLowerCase();
  const text = entry.x.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += 8;
    if (section.includes(t)) s += 5;
    if (text.includes(t)) s += 2;
    else if (!title.includes(t) && !section.includes(t)) return 0; // every term must appear
  }
  return s;
}

function runSearch(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length || !index) {
    results.innerHTML = '<p class="sr-none">Type to search every class, tool and term.</p>';
    return;
  }
  const hits = index
    .map((e) => ({ e, s: score(e, terms) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 20);

  sel = 0;
  results.innerHTML = hits.length
    ? hits.map((h, i) => `<a class="sr-item${i === 0 ? ' sel' : ''}" href="${h.e.r}">
        <div class="sr-t">${h.e.t}</div>
        <div class="sr-s">${h.e.s}</div>
        <div class="sr-x">${h.e.x.slice(0, 150)}…</div></a>`).join('')
    : '<p class="sr-none">Nothing found. Try a protocol name, a number, or a symptom.</p>';
}

document.querySelector('.search-open')?.addEventListener('click', openSearch);
input?.addEventListener('input', () => runSearch(input.value));
modal?.addEventListener('click', (e) => { if (e.target === modal) closeSearch(); });

addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); return; }
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); return; }
  if (modal?.hidden !== false) return;

  const items = [...results.querySelectorAll('.sr-item')];
  if (e.key === 'Escape') { closeSearch(); }
  else if (e.key === 'ArrowDown' && items.length) {
    e.preventDefault(); sel = (sel + 1) % items.length;
    items.forEach((it, i) => it.classList.toggle('sel', i === sel));
    items[sel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp' && items.length) {
    e.preventDefault(); sel = (sel - 1 + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('sel', i === sel));
    items[sel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && items[sel]) {
    location.href = items[sel].getAttribute('href');
  }
});

// --- Scrollable table hint ---------------------------------------------------
// A table wider than its column scrolls, and on a phone nothing said so. Mark
// the ones that actually overflow, and unmark them when they stop.
function mark(w) { w.classList.toggle('can-scroll', w.scrollWidth > w.clientWidth + 2); }
function markScrollables() { document.querySelectorAll('.table-wrap').forEach(mark); }

// A table inside a hidden panel measures zero, so it cannot be assessed until
// the panel is shown. A ResizeObserver catches that moment, and window resizes
// and font loads, without anything having to remember to call it.
const tableRO = new ResizeObserver((entries) => { for (const e of entries) mark(e.target); });
document.querySelectorAll('.table-wrap').forEach((w) => tableRO.observe(w));
addEventListener('load', markScrollables);
markScrollables();
