// Static site generator for the teaching platform.
//
// Reads the authored markdown one directory up (single source of truth, no
// duplication), renders it, and emits a fully static site into ./public.
// Zero dependencies on purpose: Vercel runs `node build.mjs` with no install
// step, so there is nothing to go stale and nothing to break in CI.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { render, esc, slugify } from './lib/markdown.mjs';
import { flowCards, flowMeta, faultScenarios, selfTest, readiness, taughtAt } from './data/interactive.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Content lives one directory up in the repo (single source of truth). A
// deploy tree that carries its own copy under ./content wins, so the site can
// also be deployed standalone without the rest of the repo.
const LOCAL = path.join(HERE, 'content');
const SRC = fs.existsSync(LOCAL) ? LOCAL : path.resolve(HERE, '..');
const OUT = path.join(HERE, 'public');

const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

// ---------------------------------------------------------------------------
// Course shape
//
// The web package covers the five taught classroom classes. The production
// visit and the practical exam remain in the repo pack but are deliberately not
// published here, so cross references to them are rewritten into plain words.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The timetable
// ---------------------------------------------------------------------------
//
// Seven Saturdays. The module's own course map says the shape is 2 hours of
// intro, 2 of visit, 16 of content and 4 of practical exam, and this is exactly
// that: 2 + 2 + (4 × 4) + 4 = 24. Written once here and read everywhere else,
// so a moved date is one edit.
//
// `kind` decides what a row links to: a taught class has a page, the visit and
// the exam do not.
const SCHEDULE = [
  { week: 1, date: '2026-09-05', start: '14:00', end: '16:00', kind: 'class', n: 1 },
  { week: 5, date: '2026-10-03', start: '11:00', end: '13:00', kind: 'visit', label: 'Production visit', where: 'Interstage' },
  { week: 7, date: '2026-10-17', start: '14:00', end: '18:00', kind: 'class', n: 2 },
  { week: 8, date: '2026-10-24', start: '14:00', end: '18:00', kind: 'class', n: 3 },
  { week: 9, date: '2026-10-31', start: '14:00', end: '18:00', kind: 'class', n: 4 },
  { week: 10, date: '2026-11-07', start: '14:00', end: '18:00', kind: 'class', n: 5 },
  { week: 14, date: '2026-12-05', start: '14:00', end: '18:00', kind: 'exam', label: 'Practical exam' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dates are stamped at build time, so they are read as UTC rather than as
// whatever the build machine thinks local midnight is.
function dateParts(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: DAYS[d.getUTCDay()], dm: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], year: d.getUTCFullYear() };
}
const longDate = (iso) => { const { day, dm, month } = dateParts(iso); return `${day} ${dm} ${month}`; };
const shortDate = (iso) => { const { dm, month } = dateParts(iso); return `${dm} ${month.slice(0, 3)}`; };
const hoursOf = (s) => (Number(s.end.slice(0, 2)) + Number(s.end.slice(3)) / 60)
  - (Number(s.start.slice(0, 2)) + Number(s.start.slice(3)) / 60);
const slotOf = (s) => `${s.start}\u2013${s.end}`;

const CLASSES = [
  {
    n: 1, slug: 'why-this-class-exists', file: '01-session-01-intro.md',
    title: 'Why This Class Exists', studyKey: 'Session 1', numbersKey: 'Block 1',
    strap: 'The argument, the Four Flows, and the two calculations that run through everything.',
    tools: ['units', 'datarate', 'latency', 'delaytime'], practice: ['myths', 'flows', 'selftest'],
  },
  {
    n: 2, slug: 'the-machine', file: '03-session-03-the-machine.md',
    title: 'The Machine', studyKey: 'Session 3', numbersKey: 'Block 2',
    strap: 'What a show computer is, why it is configured differently, and how sound and light become numbers.',
    tools: ['units', 'datarate', 'storage', 'buffer', 'ledwall'], practice: ['myths', 'drill', 'selftest'],
  },
  {
    n: 3, slug: 'the-network', file: '04-session-04-the-network.md',
    title: 'The Network', studyKey: 'Session 4', numbersKey: 'Block 3',
    strap: 'The OSI model as a diagnostic ladder, subnet arithmetic, and separating departments with VLANs.',
    tools: ['binhex', 'subnet', 'split', 'vlan', 'poe'], practice: ['myths', 'subnetdrill', 'faults', 'selftest'],
  },
  {
    n: 4, slug: 'control', file: '05-session-05-control.md',
    title: 'Control', studyKey: 'Session 5', numbersKey: 'Block 4',
    strap: 'State against event, DMX512, Art-Net against sACN, universe maths, OSC, MIDI and timecode.',
    tools: ['universe', 'dmx', 'dip', 'timecode', 'beam', 'power'], practice: ['myths', 'drill', 'selftest'],
  },
  {
    n: 5, slug: 'media-over-ip', file: '06-session-06-media-and-systems.md',
    title: 'Media Over IP and Systems', studyKey: 'Session 6', numbersKey: 'Block 5',
    strap: 'Audio and video over the network, the tyranny of clock, designing for failure, and the paperwork.',
    tools: ['datarate', 'latency', 'storage', 'ledwall', 'timecode'], practice: ['myths', 'drill', 'selftest'],
  },
];

// Every taught class carries its own date, and the build fails if one has no
// slot: a course page that quietly stops saying when it meets is worse than a
// build that stops.
for (const c of CLASSES) {
  const slot = SCHEDULE.find((x) => x.kind === 'class' && x.n === c.n);
  if (!slot) throw new Error(`schedule: no slot for Class ${c.n}`);
  c.slot = slot;
}
for (const s of SCHEDULE) {
  if (s.kind === 'class' && !CLASSES.some((c) => c.n === s.n)) {
    throw new Error(`schedule: week ${s.week} names Class ${s.n}, which does not exist`);
  }
}

// Session numbers in the source become class numbers on the site. The two
// unpublished sessions become plain descriptions so no reference dangles.
const SESSION_TO_CLASS = {
  1: 'Class 1', 2: 'the production visit', 3: 'Class 2',
  4: 'Class 3', 5: 'Class 4', 6: 'Class 5', 7: 'the practical exam',
};

function renumber(md) {
  return md.replace(/\b([Ss])essions?\s+(\d)\b/g, (whole, s, d) => {
    const target = SESSION_TO_CLASS[Number(d)];
    if (!target) return whole;
    // Preserve sentence-initial capitalisation for the descriptive replacements.
    return s === 'S' && target[0] === 't' ? target[0].toUpperCase() + target.slice(1) : target;
  });
}

// Slice a markdown document at an h2 whose text starts with `key`.
function sliceSection(md, key) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.slice(3).trim().startsWith(key));
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').replace(/\n---\s*$/, '').trim();
}

function removeSection(md, key) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.slice(3).trim().startsWith(key));
  if (start === -1) return md;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n');
}

// ---------------------------------------------------------------------------
// Flashcards generated from the reference tables, so they can never drift out
// of sync with the taught content.
// ---------------------------------------------------------------------------

// `code`, **bold** and *italic* inside a table cell or a bullet have to be
// rendered or the card shows its own backticks and asterisks.
const inlineMd = (t) => esc(t)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');

function twoColumnCards(md, tag) {
  const cards = [];
  const rows = md.match(/^\|[^\n]*\|$/gm) || [];
  for (const row of rows) {
    const cells = row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length !== 2) continue;
    if (/^:?-+:?$/.test(cells[0]) || /^:?-+:?$/.test(cells[1])) continue;
    if (/^(Thing|English|Prefix|Bits set|#)$/i.test(cells[0])) continue;
    if (!cells[0] || !cells[1]) continue;
    // The cells are markdown, so `code`, **bold** and *italic* have to be
    // rendered or the card shows its own backticks and asterisks.
    // The key the taughtAt map is authored against: the tag plus the raw
    // question text, with markdown punctuation stripped.
    const key = `${tag}::${cells[0].replace(/[`*]/g, '').trim()}`;
    cards.push({ q: inlineMd(cells[0]), a: inlineMd(cells[1]), tag, key });
  }
  return cards;
}

function glossaryCards(md) {
  const cards = [];
  let section = '';
  for (const line of md.split('\n')) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) section = h[1].replace(/^[A-H]\.\s*/, '').trim();
    if (!/^\|/.test(line)) continue;
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length !== 3) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;
    if (cells[0] === 'English') continue;
    if (!cells[0] || !cells[2]) continue;
    cards.push({ q: cells[0], zh: cells[1], a: cells[2], tag: section });
  }
  return cards;
}


// Build stamp.
//
// On a git-connected Vercel deployment the platform sets VERCEL_GIT_COMMIT_SHA
// and VERCEL_GIT_COMMIT_REF. Publishing them means you can tell, by looking at
// the live site, exactly which commit is serving and whether it arrived through
// the git integration or a manual upload. That answers "did my push deploy?"
// without needing the dashboard.
function buildStamp() {
  const env = process.env;
  let sha = env.VERCEL_GIT_COMMIT_SHA || '';
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD', { cwd: HERE, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim();
    } catch { sha = ''; }
  }
  return {
    commit: sha ? sha.slice(0, 7) : 'unknown',
    branch: env.VERCEL_GIT_COMMIT_REF || null,
    builtAt: new Date().toISOString(),
    source: env.VERCEL_GIT_COMMIT_SHA ? 'git' : env.VERCEL ? 'manual upload' : 'local',
  };
}
const STAMP = buildStamp();

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

// Who made this. Every link here is one Migu publishes himself, on showstack's
// own README; nothing is inferred. `support` is deliberately empty: a donation
// link has to be a real one, so it is a single edit here when there is a URL,
// and the block simply omits the line until then.
const AUTHOR = {
  name: 'Migu Mianizt Leung',
  // His own site goes first: it is the one that is his rather than a platform's.
  links: [
    ['mi2.dev', 'https://www.mi2.dev'],
    ['LinkedIn', 'https://www.linkedin.com/in/mi2dev/'],
    ['Medium', 'https://medium.com/@mi2dev'],
    ['Instagram', 'https://instagram.com/mi2.dev'],
  ],
  work: [
    ['showstack', 'https://showstack-inky.vercel.app/', 'the open index of live entertainment technology'],
    ['showstack on GitHub', 'https://github.com/deliseph/showstack', 'MIT code, CC BY 4.0 data'],
  ],
  support: '',
};

// Resources, grouped. Ten links in one flat list is a list nobody reads: these
// are four short lists with a heading each, in the order somebody actually
// reaches for them, and each one says what it is for.
const NAV_GROUPS = [
  ['Before a class', [
    ['/prepare', 'Prepare', 'What to do before each class'],
    ['/foundations', 'Foundations', 'The number skills the module assumes'],
  ]],
  ['While you work', [
    ['/tools', 'Tools', 'Calculators, with the working shown'],
    ['/practice', 'Practice', 'Drills, claims, fault diagnosis'],
    ['/map', 'The map', 'Every figure and card, and the ones you have opened'],
  ]],
  ['Look it up', [
    ['/numbers', 'Numbers', 'The reference card, examinable'],
    ['/field', 'Field card', 'Commands and settings for the floor'],
    ['/glossary', 'Glossary', 'Bilingual term list'],
  ]],
  ['Going further', [
    ['/lineage', 'How we got here', 'Why each technology exists'],
    ['/next', 'Where to go next', 'Certifications, courses and books'],
  ]],
];

function shell({ title, desc, body, active = '', bodyClass = '', bodyAttrs = '', scripts = [] }) {
  const navClasses = CLASSES.map(
    (c) => `<a class="nv${active === `class-${c.n}` ? ' on' : ''}" href="/class/${c.n}">
        <span class="nv-n">${c.n}</span>
        <span class="nv-t">${esc(c.title)}</span>
        </a>`
  ).join('');

  const navRes = NAV_GROUPS.map(
    ([group, items]) => `<p class="side-g">${esc(group)}</p>${items.map(
      ([href, label, desc]) => `<a class="nv nv-res${active === href ? ' on' : ''}" href="${href}">
        <span class="nv-t">${esc(label)}</span>
        <span class="nv-d">${esc(desc)}</span></a>`
    ).join('')}`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Theatre Computer Systems</title>
<meta name="description" content="${esc(desc || '')}">
<meta name="color-scheme" content="dark light">
<link rel="stylesheet" href="/assets/styles.css?v=${STAMP.commit}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0d0f13"/><circle cx="16" cy="12" r="5" fill="#f0a038"/><path d="M8 26c1.6-4.6 4.4-7 8-7s6.4 2.4 8 7z" fill="#4fb3c8"/></svg>'
  )}">
</head>
<body class="${bodyClass}"${bodyAttrs}>
<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
  <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded="false">☰</button>
  <a class="brand" href="/">
    <span class="brand-mark" aria-hidden="true"></span>
    <span class="brand-txt"><b>Computer Systems</b><i>Theatre &amp; Entertainment Arts</i></span>
  </a>
  <div class="topbar-sp"></div>
  <button class="search-open icon-btn" aria-label="Search">
    <span class="sr">Search</span>⌕<kbd>/</kbd>
  </button>
  <button class="theme-btn icon-btn" aria-label="Toggle theme">◐</button>
</header>

<div class="layout">
  <nav class="side" aria-label="Course navigation">
    <p class="side-h">Classes</p>
    ${navClasses}
    ${navRes}
    <div class="side-foot">
      <p>Five taught classes. The production visit and the practical exam sit in the lecturer's
      own pack and are not published here.</p>
      <p class="side-by">Built by <a href="${AUTHOR.links[0][1]}" rel="noopener" target="_blank">${AUTHOR.name}</a>
        · ${AUTHOR.links.slice(1).map(([n, u]) => `<a href="${u}" rel="noopener" target="_blank">${n}</a>`).join(' · ')}</p>
      <p class="side-build" title="Which commit is serving, and how it got here">
        build <code>${STAMP.commit}</code>${STAMP.branch ? ` · ${esc(STAMP.branch)}` : ''} · via ${STAMP.source}</p>
    </div>
  </nav>
  <main id="main">${body}</main>
</div>

<div class="search-modal" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="Search the course">
    <input type="search" class="search-input" placeholder="Search every class, tool and term…" autocomplete="off">
    <div class="search-results"></div>
    <p class="search-hint"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>esc</kbd> close</p>
  </div>
</div>

<script src="/assets/app.js?v=${STAMP.commit}" type="module"></script>
${scripts.map((s) => `<script src="${s}?v=${STAMP.commit}" type="module"></script>`).join('\n')}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Every page is kept so the cross-reference pass at the end can check that a
// link a card promises actually lands somewhere.
const PAGES = new Map();

const write = (route, html) => {
  const dir = route === '/' ? OUT : path.join(OUT, route.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  PAGES.set(route, html);
};

const searchIndex = [];
const addSearch = (route, title, section, text) => {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 20) return;
  searchIndex.push({ r: route, t: title, s: section, x: clean.slice(0, 260) });
};

// --- Source documents -------------------------------------------------------

const studyMd = renumber(read('study-guide.md'));
const numbersMd = renumber(read('numbers-to-know.md'));
const fieldMd = renumber(read('field-commands.md'));
const lineageMd = renumber(read('lineage.md'));
const nextMd = renumber(read('where-next.md'));
const glossaryMd = read('glossary.md');

const drillCards = [];
const myths = [];
for (const c of CLASSES) {
  const block = sliceSection(numbersMd, c.numbersKey);
  drillCards.push(...twoColumnCards(block, `Class ${c.n}`));
}
const glossCards = glossaryCards(glossaryMd);

const TOOL_TITLES = {
  units: 'Bits, bytes and prefixes',
  binhex: 'Binary, decimal and hex',
  poe: 'PoE budget',
  timecode: 'Timecode calculator',
  ledwall: 'LED wall and pixel canvas',
  delaytime: 'Delay time',
  datarate: 'Data rate calculator',
  latency: 'Latency budget',
  storage: 'Storage throughput',
  buffer: 'Audio buffer and latency',
  subnet: 'Subnet calculator',
  split: 'Subnet splitter',
  vlan: 'VLAN planner',
  universe: 'DMX universe calculator',
  dmx: 'DMX refresh rate',
  dip: 'DIP switch addressing',
  beam: 'Beam size and light on stage',
  power: 'Power load and current',
};

function toolsHtml(ids) {
  return (
    `<p class="lede">The calculations in this module are done, not guessed. Every tool shows its
    working, because showing the working is what earns the marks.</p>` +
    ids.map((id) => `<div class="tool" data-tool="${id}"><h3 class="tool-h">${TOOL_TITLES[id]}</h3></div>`).join('')
  );
}

// The "Common misconceptions" bullets are uniform: `- **"claim"** correction`,
// wrapped across lines at 2-space indent. Parsing them is the whole content
// pipeline for Spot the myth, so a reworded bullet must fail the build loudly
// rather than silently vanish from the deck.
function parseMyths(md, n, file) {
  const sec = sliceSection(md, 'Common misconceptions');
  if (!sec) return [];
  const chunks = [];
  for (const line of sec.split('\n')) {
    if (/^-\s+/.test(line)) chunks.push(line.replace(/^-\s+/, ''));
    else if (chunks.length && line.trim()) chunks[chunks.length - 1] += ` ${line.trim()}`;
  }
  const out = [];
  for (const ch of chunks) {
    const m = /^\*\*[\u201c"]([\s\S]+?)[\u201d"]\*\*\s+([\s\S]+)$/.exec(ch.trim());
    if (!m) {
      console.error(`  ! ${file}: misconception bullet is not in the form - **"claim"** correction: ${ch.slice(0, 60)}`);
      process.exitCode = 1;
      continue;
    }
    out.push({ claim: inlineMd(m[1]), correction: inlineMd(m[2]), tag: `Myth \u00b7 Class ${n}`, cls: n });
  }
  return out;
}

const PRACTICE_TITLES = {
  myths: 'Spot the myth',
  ready: 'Readiness check',
  flows: 'Sort the Four Flows',
  drill: 'Numbers drill',
  subnetdrill: 'Subnetting trainer',
  faults: 'Fault diagnosis simulator',
  selftest: '',
};

function practiceHtml(ids, n) {
  return ids
    .filter((id) => id !== 'selftest')
    .map(
      (id) =>
        `<div class="practice" data-practice="${id}" data-class="${n}">
          <h3 class="tool-h" id="${id}">${PRACTICE_TITLES[id]}</h3></div>`
    )
    .join('') || '<p>Practice for this class lives in the study tab.</p>';
}

// --- Class pages ------------------------------------------------------------

// A marker only renders when it is alone on its line. Catching a stray one at
// build time is much cheaper than noticing a missing explainer in a lecture.
let animExpected = 0, animRendered = 0;

const classData = CLASSES.map((c) => {
  const raw = renumber(read(c.file));
  myths.push(...parseMyths(raw, c.n, c.file));
  const wanted = (raw.match(/<!--\s*anim:[a-z0-9-]+\s*-->/g) || []).length;
  const alone = (raw.match(/^[ \t]*<!--\s*anim:[a-z0-9-]+\s*-->[ \t]*$/gm) || []).length;
  if (wanted !== alone) {
    console.error(`  ! ${c.file}: ${wanted - alone} anim marker(s) not alone on their line, so they will not render`);
    process.exitCode = 1;
  }
  animExpected += wanted;
  // Drop the source H1; the page header carries the title instead.
  const stripped = raw.replace(/^#\s+[^\n]*\n/, '');
  // The prepare block is for before the class, so it must not appear in the
  // content tab or be projected in teach mode.
  const prep = render(sliceSection(stripped, 'Before this class'));
  const body = removeSection(stripped, 'Before this class');
  const doc = render(body);
  animRendered += (doc.html.match(/class="anim"/g) || []).length;
  const study = render(sliceSection(studyMd, c.studyKey));
  const numbers = render(sliceSection(numbersMd, c.numbersKey));
  return { ...c, doc, study, numbers, prep };
});

for (const c of classData) {
  const toc = c.doc.headings
    .filter((h) => h.level === 2)
    .map((h) => `<a href="#${h.id}">${esc(h.text)}</a>`)
    .join('');

  // The order is the learning loop: prepare, learn, do it, test yourself, look
  // it up. Reference used to sit in the middle of that, which put a lookup
  // between the learning and the doing.
  // A wrong belief printed next to its correction is read, agreed with and
  // forgotten. The door to the version that asks you to commit first belongs
  // on the heading itself, where somebody is already reading them.
  const learnHtml = c.doc.html.replace(
    /(<h2 id="common-misconceptions-in-this-session"[\s\S]*?<\/h2>)/,
    `$1<p class="note">Reading a wrong belief with its correction attached does very little. <a href="#myths">Spot the myth</a>, on the Practice tab, puts each of these claims in front of you bare and asks you to commit before the correction appears.</p>`
  );

  const tabs = [
    ['prepare', 'Prepare', c.prep.html],
    ['content', 'Learn', learnHtml],
    ['tools', 'Tools', toolsHtml(c.tools)],
    ['practice', 'Practice', practiceHtml(c.practice, c.n)],
    ['study', 'Test yourself', c.study.html + selfTestHtml(c.n)],
    ['numbers', 'Numbers', c.numbers.html],
  ];

  const tabBtns = tabs
    .map(([id, label], i) => `<button class="tab${i === 0 ? ' on' : ''}" data-tab="${id}">${label}</button>`)
    .join('');
  const tabPanels = tabs
    .map(([id, , html], i) => `<section class="panel${i === 0 ? ' on' : ''}" data-panel="${id}">${html}</section>`)
    .join('');

  const body = `
<article class="doc">
  <header class="page-head">
    <p class="eyebrow"><span class="pill">Class ${c.n} of 5</span><span class="pill pill-q">Week ${c.slot.week}</span></p>
    <h1>${esc(c.title)}</h1>
    <p class="when" data-week="${c.slot.week}"><b>${longDate(c.slot.date)}</b>, ${slotOf(c.slot)}
      <span class="when-h">${hoursOf(c.slot)} hours</span></p>
    <p class="strap">${esc(c.strap)}</p>
    <p class="print-head" aria-hidden="true">Computer Systems &amp; Networking for Theatre and
      Entertainment Arts · Class ${c.n} of 5 · Week ${c.slot.week}, ${longDate(c.slot.date)}<br>
      Prepared by ${esc(AUTHOR.name)}</p>
    <div class="head-actions">
      <a class="btn btn-primary" href="#tab=prepare">Prepare for this class</a>
      <a class="btn" href="#tab=content">Start learning</a>
      <a class="btn" href="/teach/${c.n}">▶ Teach mode</a>
      <button class="btn js-print" data-class="${c.n}">Print study notes</button>
      <button class="btn js-done" data-class="${c.n}">Mark as studied</button>
    </div>
  </header>
  <nav class="toc" aria-label="On this page"><span class="toc-h">On this page</span>${toc}</nav>
  <div class="tabs" role="tablist">${tabBtns}</div>
  ${tabPanels}
</article>`;

  write(`/class/${c.n}`, shell({
    title: `Class ${c.n}: ${c.title}`,
    desc: c.strap,
    body,
    active: `class-${c.n}`,
    scripts: ['/assets/tools.js', '/assets/practice.js', '/assets/anim.js'],
  }));

  addSearch(`/class/${c.n}`, `Class ${c.n}: ${c.title}`, 'Overview', c.strap);
  addSearch(`/class/${c.n}#myths`, `Class ${c.n}: ${c.title}`, 'Spot the myth',
    myths.filter((m) => m.cls === c.n).map((m) => m.claim).join(' '));
  // splitBlocks names the run of prose before the first heading "opening", for
  // teach mode's first slide. There is no element with that id on the page, so
  // a search hit in it points at the top of the page rather than at nothing.
  for (const b of c.doc.blocks) {
    addSearch(b.id === 'opening' ? `/class/${c.n}` : `/class/${c.n}#${b.id}`,
      `Class ${c.n}: ${c.title}`, b.title, b.html);
  }
}

// --- Teach mode -------------------------------------------------------------
//
// A projector view: one h2 section per screen, very large type, with a block
// timer. It is the lecturer's own notes made legible from the back of a room,
// not an attempt to auto-generate slides that would be worse than the notes.

for (const c of classData) {
  // A "Block C:" divider with nothing under it spends a whole projected screen
  // saying a title the toolbar already shows. Fold those into the screen that
  // follows, so the block announces itself and then gets on with it.
  const merged = [];
  for (const b of c.doc.blocks) {
    const bare = b.html.replace(/<h[23][\s\S]*?<\/h[23]>/, '');
    const words = (bare.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
    const prev = merged[merged.length - 1];
    if (prev && prev.level === 2 && prev.thin && b.level === 3) {
      b.html = prev.html + b.html;
      merged[merged.length - 1] = b;
      continue;
    }
    merged.push({ ...b, thin: b.level === 2 && words < 25 });
  }

  const slides = merged
    .map((b, i) => {
      // The block chip in the toolbar already shows the planned window, so drop
      // it from the projected heading: at this size it costs a whole line.
      const html = b.html.replace(
        /(<h2 [^>]*>)([\s\S]*?)\s*\(\d+\s*min\)(<a class="anchor")/i,
        '$1$2$3'
      );
      const cont = b.pages > 1 && b.page > 1;
      const label = b.pages > 1 ? `${b.title} (${b.page}/${b.pages})` : b.title;
      // On a continuation screen the heading is repeated small, so the room
      // still knows which section it is in without spending a title line.
      const inner = cont
        ? html.replace(/<h([23]) ([^>]*)>/, '<h$1 $2 data-cont="1">')
        : html;
      const hasFig = /<div class="(anim|practice)"/.test(html);
      return `<section class="slide" data-i="${i}" data-title="${esc(label)}"
        data-block="${esc(b.parent)}" data-level="${b.level}"${cont ? ' data-cont="1"' : ''}${hasFig ? ' data-fig="1"' : ''}>
        <div class="slide-inner">${inner}</div></section>`;
    })
    .join('');

  const body = `
<div class="teach" data-class="${c.n}">
  <header class="teach-bar">
    <a class="teach-exit" href="/class/${c.n}" title="Exit teach mode">✕</a>
    <h1 class="teach-title">Class ${c.n} · ${esc(c.title)}</h1>
    <span class="teach-when">${shortDate(c.slot.date)} · ${slotOf(c.slot)}</span>
    <span class="teach-block" id="tblock"></span>
    <span class="teach-sub" id="tsub"></span>
    <div class="teach-sp"></div>
    <button class="teach-btn" id="tstart" title="Runs for the whole class. The block figure beside it restarts at each block.">▶ Start stopwatch</button>
    <span class="teach-clock" id="tclock">00:00</span>
    <span class="teach-bclock" id="tbclock" hidden></span>
    <span class="teach-pos" id="tpos"></span>
    <button class="teach-btn" id="tfull" title="Full screen">⛶</button>
  </header>
  <div class="teach-track" id="ttrack">${slides}</div>
  <footer class="teach-foot">
    <button class="teach-nav" id="tprev">← Previous</button>
    <div class="teach-dots" id="tdots"></div>
    <span class="teach-next" id="tnextup" hidden></span>
    <span class="teach-loc" id="tloc" hidden title="The same page on a phone. Press l to show it big for the room."><span class="teach-loc-p" id="tlocp"></span><kbd>l</kbd></span>
    <button class="teach-btn" id="tboard" title="A surface to draw on, over this screen. What you draw stays until you clear it.">✎ Board <kbd>w</kbd></button>
    <button class="teach-btn" id="tgrid" title="Overview of every screen (o)">▦ Overview <kbd>o</kbd></button>
    <button class="teach-btn" id="tanswers" aria-pressed="true" title="Hold each figure&#39;s conclusion until you press n. Your choice is remembered on this laptop."><span>Answers: held</span> <kbd>a</kbd></button>
    <button class="teach-nav" id="tnext">Next →</button>
  </footer>
</div>`;

  write(`/teach/${c.n}`, shell({
    title: `Teach · Class ${c.n}`,
    desc: `Projector view for Class ${c.n}`,
    body,
    bodyClass: 'teach-mode',
    bodyAttrs: ` data-cls="${c.n}"`,
    scripts: ['/assets/teach.js', '/assets/anim.js'],
  }));
}

// --- Self test and panel builders ------------------------------------------

function selfTestHtml(n) {
  const items = selfTest[n];
  if (!items) return '';
  const qs = items
    .map(
      (it, i) => `<li class="qa">
      <button class="qa-q" aria-expanded="false"><span class="qa-n">${i + 1}</span>${esc(it.q)}</button>
      <div class="qa-a" hidden><p>${esc(it.a)}</p></div>
    </li>`
    )
    .join('');
  return `<h2 class="hd hd-2" id="model-answers">Self test with model answers</h2>
  <p>Answer it yourself first, out loud or on paper, then open the answer. Reading the answer
  without attempting the question teaches you almost nothing.</p>
  <ol class="qa-list">${qs}</ol>
  <p class="note"><b>Note.</b> These are model answers, not the only correct ones. If yours differs
  and you can defend it with the arithmetic, that is worth more than matching the wording.</p>`;
}

// --- Resource pages ---------------------------------------------------------

const numbersDoc = render(numbersMd.replace(/^#\s+[^\n]*\n/, ''));
write('/numbers', shell({
  title: 'Numbers to know',
  desc: 'The reference card. Learn these.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Reference</span><span class="pill pill-q">Examinable</span></p>
      <h1>Numbers to know</h1>
      <p class="strap">Print it, fold it, put it in the pocket of the jacket you wear to work. There
      is a five minute verbal quiz at the top of every class.</p>
      <div class="head-actions"><button class="btn btn-primary" onclick="window.print()">Print this card</button>
      <a class="btn" href="/practice#drill">Drill these</a></div>
    </header>${numbersDoc.html}</article>`,
  active: '/numbers',
}));
for (const b of numbersDoc.blocks) addSearch('/numbers', 'Numbers to know', b.title, b.html);

const fieldDoc = render(fieldMd.replace(/^#\s+[^\n]*\n/, ''));
write('/field', shell({
  title: 'The field card',
  desc: 'Commands and settings, for when somebody is waiting.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Reference</span><span class="pill pill-q">Examinable</span></p>
      <h1>The field card</h1>
      <p class="strap">The commands you type and the settings you change while standing in a venue.
      Learn the first six by heart. Look the rest up.</p>
      <div class="head-actions"><button class="btn btn-primary" onclick="window.print()">Print this card</button>
      <a class="btn" href="/class/3">Where this is taught</a></div>
    </header>${fieldDoc.html}</article>`,
  active: '/field',
}));
for (const b of fieldDoc.blocks) addSearch('/field', 'The field card', b.title, b.html);

const lineageDoc = render(lineageMd.replace(/^#\s+[^\n]*\n/, ''));
write('/lineage', shell({
  title: 'How we got here',
  desc: 'Why each of these technologies exists, and what it refuses to do.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Reference</span></p>
      <h1>How we got here</h1>
      <p class="strap">Nothing here was designed. It accumulated, one problem at a time. Knowing why
      something exists tells you what it refuses to do, and that knowledge outlives the product names.</p>
      <div class="head-actions">${CLASSES.map((c) =>
        `<a class="btn" href="/class/${c.n}">${c.n}. ${esc(c.title)}</a>`).join('')}</div>
    </header>${lineageDoc.html}</article>`,
  active: '/lineage',
  scripts: ['/assets/anim.js'],
}));
for (const b of lineageDoc.blocks) addSearch('/lineage', 'How we got here', b.title, b.html);

const nextDoc = render(nextMd.replace(/^#\s+[^\n]*\n/, ''));
write('/next', shell({
  title: 'Where to go next',
  desc: 'Certifications, free courses, standards and books, and how to choose a direction.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Reference</span></p>
      <h1>Where to go next</h1>
      <p class="strap">This module is an introduction: deliberately wide, deliberately shallow. By
      the end of it you should know which direction you want to go deeper in. Here is where each
      direction leads, what it costs, and what is free.</p>
    </header>${nextDoc.html}</article>`,
  active: '/next',
}));
for (const b of nextDoc.blocks) addSearch('/next', 'Where to go next', b.title, b.html);

write('/map', shell({
  title: 'The map',
  desc: 'Every figure and every card in the module, in the order they are taught.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">The whole module</span></p>
      <h1>The map</h1>
      <p class="strap">Sixty five figures and every card, in the order they are taught. It is here so
      you can get back to the one you half remember. The ones you have driven are filled in, and the
      cards you have met are marked; nothing is counted and there is nothing to finish.</p>
      <p class="note">This is read from your own browser and never leaves it. On a different device,
      or after clearing your site data, the map starts empty again.</p>
    </header><div id="modulemap" class="mp"></div></article>`,
  active: '/map',
  scripts: ['/assets/map.js'],
}));
addSearch('/#schedule', 'Home', 'Seven Saturdays',
  SCHEDULE.map((x) => `Week ${x.week} ${longDate(x.date)} ${slotOf(x)} ${x.kind === 'class'
    ? `Class ${x.n} ${CLASSES.find((c) => c.n === x.n).title}` : `${x.label}${x.where ? ` at ${x.where}` : ''}`}`).join(' · '));
addSearch('/map', 'The map', 'The whole module',
  'Every figure and every card in the module in the order they are taught, with the ones you have opened filled in');

const glossDoc = render(glossaryMd.replace(/^#\s+[^\n]*\n/, '').replace(/^##\s+Computer Systems[^\n]*\n/m, ''));
write('/glossary', shell({
  title: 'Glossary',
  desc: 'Bilingual glossary, English and 繁體中文, of every term used in the module.',
  body: `<article class="doc glossary-page"><header class="page-head">
      <p class="eyebrow"><span class="pill">${glossCards.length} terms</span><span class="pill pill-q">EN · 繁中</span></p>
      <h1>Glossary 詞彙表</h1>
      <p class="strap">Learn the English term as the operational one. Every menu, every error
      message and every conversation on an international crew is in English. The Chinese is there
      to build the concept.</p>
      <div class="gloss-controls">
        <input type="search" id="gloss-filter" placeholder="Filter ${glossCards.length} terms, English or 中文…" autocomplete="off">
        <button class="btn" id="gloss-cards">Flashcard mode</button>
        <span class="gloss-count" id="gloss-count"></span>
      </div>
    </header>
    <div id="gloss-flash" hidden></div>
    <div id="gloss-body">${glossDoc.html}</div></article>`,
  active: '/glossary',
  scripts: ['/assets/practice.js'],
}));
for (const b of glossDoc.blocks) addSearch('/glossary', 'Glossary', b.title, b.html);

write('/tools', shell({
  title: 'Tools',
  desc: 'Every calculator in the module: data rate, latency, subnet, VLAN, universes, storage.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Used in class and in the exam</span></p>
      <h1>Tools</h1>
      <p class="strap">Every calculation the module asks for, with the working shown. Use them to
      check your own arithmetic, never to replace it. The exam asks you to show the method.</p>
    </header>${toolsHtml(['units', 'binhex', 'subnet', 'split', 'vlan', 'poe', 'dip', 'beam', 'power', 'datarate', 'latency',
      'delaytime', 'universe', 'dmx', 'ledwall', 'timecode', 'storage', 'buffer'])}</article>`,
  active: '/tools',
  scripts: ['/assets/tools.js'],
}));
for (const [id, title] of Object.entries(TOOL_TITLES)) addSearch(`/tools#tool-${id}`, 'Tools', title, `${title} calculator with working shown`);

write('/practice', shell({
  title: 'Practice',
  desc: 'Subnetting trainer, fault diagnosis simulator, Four Flows sort and the numbers drill.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Repetition is the point</span></p>
      <h1>Practice</h1>
      <p class="strap">Three of these reward doing them badly at first. The subnetting trainer in
      particular needs twenty minutes a night for a week, not three hours the day before.</p>
      <p class="note"><b>The cards come back on their own.</b> A card you get right returns in a
      few days, then a week, then three. A card you miss comes back tomorrow, and again before you
      leave. So a sitting is short and it <b>ends</b>: the due count goes to zero and the page says
      so. New cards are never pushed at you, you start eight when you want them. Miss a week and
      nothing is lost or broken, there are simply more cards waiting. None of it leaves your
      browser.</p>
    </header>
    <div class="practice" data-practice="subnetdrill" data-class="3"><h3 class="tool-h" id="subnetdrill">Subnetting trainer</h3></div>
    <div class="practice" data-practice="faults" data-class="3"><h3 class="tool-h" id="faults">Fault diagnosis simulator</h3></div>
    <div class="practice" data-practice="myths" data-class="0"><h3 class="tool-h" id="myths">Spot the myth</h3></div>
    <div class="practice" data-practice="flows" data-class="1"><h3 class="tool-h" id="flows">Sort the Four Flows</h3></div>
    <div class="practice" data-practice="drill" data-class="0"><h3 class="tool-h" id="drill">Numbers drill</h3></div>
    </article>`,
  active: '/practice',
  scripts: ['/assets/practice.js'],
}));

const foundDoc = render(renumber(read('foundations.md')).replace(/^#\s+[^\n]*\n/, ''));
write('/foundations', shell({
  title: 'Foundations',
  desc: 'Bits and bytes, powers of two, binary and hex: the number skills every other class assumes.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Do this first</span></p>
      <h1>Foundations</h1>
      <p class="strap">Nothing here is difficult, and all of it is assumed everywhere else. A student
      who has not met it spends Class 3 fighting the arithmetic instead of learning the network.</p>
      <div class="head-actions">
        <a class="btn btn-primary" href="/practice#drill">Drill the numbers</a>
        <a class="btn" href="/tools#tool-binhex">Open the binary tool</a>
      </div>
    </header>${foundDoc.html}</article>`,
  active: '/foundations',
  scripts: ['/assets/tools.js', '/assets/practice.js', '/assets/anim.js'],
}));
for (const b of foundDoc.blocks) addSearch('/foundations', 'Foundations', b.title, b.html);

// The prepare page collects every pre-class block in one place, so a student can
// see the whole run-up rather than discovering each one the night before.
// Five classes of preparation, every readiness check rendered, came to well
// over ten thousand pixels on a phone, four fifths of it for a class weeks
// away. Each block collapses; app.js opens the one the reader actually needs.
const prepCards = classData.map((c) => `<section class="prep-block" data-prep="${c.n}">
    <header class="prep-head">
      <span class="prep-n">${c.n}</span>
      <div>
        <h2 class="hd hd-2" id="prepare-class-${c.n}" style="margin:0;border:0;padding:0">${esc(c.title)}</h2>
        <p class="prep-meta">Class ${c.n} · Week ${c.slot.week} · ${longDate(c.slot.date)}, ${slotOf(c.slot)}</p>
      </div>
      <a class="btn" href="/class/${c.n}#tab=prepare">Open Class ${c.n} →</a>
      <button class="btn prep-toggle" aria-expanded="false" data-prep-toggle="${c.n}">Show</button>
    </header>
    <div class="prep-body" hidden>${c.prep.html}</div>
  </section>`).join('');

write('/prepare', shell({
  title: 'Prepare',
  desc: 'What to do before each class: prerequisites, the three tasks, what to bring, and a readiness check.',
  body: `<article class="doc"><header class="page-head">
      <p class="eyebrow"><span class="pill">Before you walk in</span></p>
      <h1>Prepare</h1>
      <p class="strap">Each class assumes the one before it, and Class 3 assumes arithmetic you will
      not pick up on the day. Every block below tells you what you must already be able to do, three
      things to actually go and do, and what to bring. The readiness check is five questions that
      point at the specific thing to fix.</p>
      <div class="head-actions">
        <a class="btn btn-primary" href="#" data-prep-open="next">Open the one I need</a>
        <a class="btn" href="/foundations">Foundations, if the arithmetic is new</a>
      </div>
    </header>
    <div class="note" style="margin-bottom:28px"><b>The one that matters.</b> Class 3 needs its
    preparation spread over several days, because subnetting does not absorb in one sitting.
    Everything else is lighter. If you only prepare for one class, prepare for that one.</div>
    ${prepCards}</article>`,
  active: '/prepare',
  scripts: ['/assets/practice.js', '/assets/anim.js'],
}));
for (const c of classData) addSearch(`/prepare#prepare-class-${c.n}`, 'Prepare', `Class ${c.n}: ${c.title}`, c.prep.html);

// --- Home -------------------------------------------------------------------

const spine = `Every signal in a modern show is, at some point, a number in a computer's memory,
travelling over a shared network, with a deadline.`;

const classCards = CLASSES.map(
  (c) => `<a class="card" href="/class/${c.n}">
    <span class="card-n">${c.n}</span>
    <h3>${esc(c.title)}</h3>
    <p>${esc(c.strap)}</p>
    <span class="card-foot">
    <span class="card-go">Open →</span></span>
  </a>`
).join('');

write('/', shell({
  title: 'Computer Systems & Networking for Theatre and Entertainment Arts',
  desc: 'An interactive teaching platform: five classes, calculators, drills and a bilingual glossary for year one Media Design and Technology students.',
  body: `
<article class="doc home">
  <header class="hero">
    <p class="eyebrow"><span class="pill">Year one BFA · MDT</span><span class="pill pill-q">Audio · Lighting · Video</span></p>
    <h1>Computer Systems &amp; Networking<br><span class="hero-sub">for Theatre and Entertainment Arts</span></h1>
    <blockquote class="spine"><p>${spine}</p></blockquote>
    <p class="strap">Five classes. Everything here exists to unpack that one sentence and to make it
    usable at 18:00 on a Friday when something has stopped working.</p>
    <div class="head-actions">
      <a class="btn btn-primary" href="/class/1">Start with Class 1</a>
      <a class="btn" href="/prepare">What to do before a class</a>
      <a class="btn" href="/tools">Open the tools</a>
    </div>
  </header>


  <section class="sched" id="schedule">
    <h2 class="sched-h">Seven Saturdays</h2>
    <p class="sched-sub">Two hours to open, two on a production visit, sixteen of content across four
    consecutive weeks, four for the practical exam. The run from week 7 to week 10 is the dense part:
    four classes, one a week, nothing skipped.</p>
    <p class="sched-next" id="sched-next" hidden></p>
    <ol class="sched-list">
      ${SCHEDULE.map((x) => {
    const cls = x.kind === 'class' ? CLASSES.find((c) => c.n === x.n) : null;
    const title = cls ? `Class ${cls.n} · ${esc(cls.title)}` : esc(x.label);
    const inner = cls
      ? `<a href="/class/${cls.n}">${title}</a>`
      : `<span>${title}</span>${x.where ? ` <span class="sched-where">${esc(x.where)}</span>` : ''}`;
    const plain = cls ? `Class ${cls.n}, ${esc(cls.title)}`
      : `${esc(x.label)}${x.where ? ` at ${esc(x.where)}` : ''}`;
    return `<li class="sched-row sched-${x.kind}" data-date="${x.date}" data-end="${x.end}"
          data-title="${plain}" data-when="${dateParts(x.date).day} ${dateParts(x.date).dm} ${dateParts(x.date).month}">
          <span class="sched-wk">Week ${x.week}</span>
          <span class="sched-dt"><b>${shortDate(x.date)}</b> <span class="sched-day">${dateParts(x.date).day.slice(0, 3)}</span></span>
          <span class="sched-tm">${slotOf(x)}</span>
          <span class="sched-ti">${inner}</span>
        </li>`;
  }).join('')}
    </ol>
  </section>

  <section class="progress-strip" id="progress-strip"></section>

  <section class="byline" id="who">
    <h2 class="sched-h">Who made this, and what else there is</h2>
    <p class="byline-p">This site is built and maintained by
      <a href="${AUTHOR.links[0][1]}" rel="noopener" target="_blank">${AUTHOR.name}</a>, who teaches the
      module it belongs to. Questions are welcome, and so is a correction: if something here does not
      hold up, or you would like to talk a part of it through, please do get in touch. Students who
      have finished the module are still welcome to write.</p>
    <p class="byline-links">${AUTHOR.links.map(([n, u]) => `<a href="${u}" rel="noopener" target="_blank">${n}</a>`).join('')}</p>
    <ul class="byline-work">
      ${AUTHOR.work.map(([n, u, d]) => `<li><a href="${u}" rel="noopener" target="_blank">${n}</a> <span>${d}</span></li>`).join('')}
    </ul>
    <p class="byline-p">Several of the numbers on this site, the port assignments, the standard dates
      and the bilingual terms, are checked against showstack, which is his open dataset of the same
      subject. It is free, it is cited on every field, and it takes contributions.</p>
    ${AUTHOR.support ? `<p class="byline-p"><a class="btn" href="${AUTHOR.support}" rel="noopener" target="_blank">Support this work</a></p>` : ''}
  </section>

  <h2 class="hd hd-2" id="classes">The five classes</h2>
  <div class="cards">${classCards}</div>

  <h2 class="hd hd-2" id="four-flows">The model that runs through every class</h2>
  <p>Any traffic on a show network is one of four kinds. Learn the table, then use it to classify
  everything you meet for the rest of your career.</p>
  <div class="flows">
    ${Object.entries(flowMeta).map(([k, v]) => `<div class="flow flow-${k}">
      <h3>${v.label}</h3><p>${esc(v.hint)}</p></div>`).join('')}
  </div>
  <p class="note"><b>The one to watch.</b> Management traffic has no deadline and therefore no
  manners. It is the only flow that cannot itself be broken, and the one most likely to break
  everything else. <a href="/practice#flows">Sort twenty four real examples →</a></p>

  <h2 class="hd hd-2" id="whats-here">What is on this platform</h2>
  <div class="cards cards-sm">
    <a class="card" href="/prepare"><h3>A preparation path</h3><p>What to do before each class, what
    you must already be able to do, and a five question readiness check that points at the exact
    thing to go and fix.</p></a>
    <a class="card" href="/foundations"><h3>Foundations</h3><p>Bits and bytes, powers of two, binary
    and hex. Forty minutes, done once, and the rest of the module stops fighting you.</p></a>
    <a class="card" href="/lineage"><h3>How we got here</h3><p>Why each of these technologies
      exists, and what it refuses to do. Audio to the network, DMX to sACN, VGA to DisplayPort,
      parallel to serial, floppy disk to NVMe.</p></a>
    <a class="card" href="/tools"><h3>Eighteen calculators</h3><p>Subnet, VLAN plan, PoE budget,
    timecode, LED wall, delay time, data rate, latency budget, universes and more. Each shows its
    working.</p></a>
    <a class="card" href="/practice"><h3>Four drills</h3><p>An endless subnetting trainer, a fault
    diagnosis simulator built from real failure signatures, the Four Flows sort, and flashcards for
    every examinable number.</p></a>
    <a class="card" href="/glossary"><h3>${glossCards.length} terms, bilingual</h3><p>English and
    繁體中文, grouped by domain, with a live filter and a flashcard mode.</p></a>
  </div>

</article>`,
  active: '/',
  scripts: ['/assets/practice.js'],
}));

// --- Where this is taught ---------------------------------------------------
//
// A card the student has now missed twice is not a card they need to see
// again sooner. It is a card they were never taught, or were taught and did
// not follow. So each drill card can carry the place the fact is taught, and
// the build refuses to ship a link that does not land: every route, every id
// and every figure name is checked here against the pages just generated.

const LINKABLE = ['/class/1', '/class/2', '/class/3', '/class/4', '/class/5', '/foundations', '/lineage', '/numbers'];
const PAGE_NAME = {
  '/foundations': 'Foundations',
  '/lineage': 'How we got here',
  '/numbers': 'Numbers to know',
  ...Object.fromEntries(CLASSES.map((c) => [`/class/${c.n}`, `Class ${c.n}`])),
};

// mountAll() removes a host whose figure was never registered, so a link to one
// would land on nothing. Read the register calls rather than trusting the name.
const REGISTERED = new Set();
for (const f of fs.readdirSync(path.join(HERE, 'assets')).filter((n) => /^anim-.*\.js$/.test(n))) {
  const src = fs.readFileSync(path.join(HERE, 'assets', f), 'utf8');
  for (const m of src.matchAll(/register\('([a-z0-9-]+)'/g)) REGISTERED.add(m[1]);
}

const HEADINGS = new Map();
for (const route of LINKABLE) {
  const html = PAGES.get(route);
  if (!html) throw new Error(`taught-at: no page built for ${route}`);
  const list = [];
  for (const m of html.matchAll(/<h([234]) id="([^"]+)"[^>]*>([\s\S]*?)<a class="anchor"/g)) {
    list.push({
      index: m.index,
      id: m[2],
      text: m[3].replace(/<span class="ext-badge">[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    });
  }
  HEADINGS.set(route, list);
  // A repeated id would make the anchor ambiguous. /prepare is deliberately not
  // linkable: it reprints each class's prep headings and repeats ids by design.
  const ids = (html.match(/ id="[^"]+"/g) || []);
  const seen = new Set();
  for (const raw of ids) {
    if (seen.has(raw)) throw new Error(`taught-at: ${route} repeats${raw}`);
    seen.add(raw);
  }
}

function resolve(route, id) {
  if (!LINKABLE.includes(route)) throw new Error(`taught-at: ${route} is not linkable (id ${id})`);
  const html = PAGES.get(route);
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) throw new Error(`taught-at: ${route} has no id "${id}"`);
  if (id.startsWith('fig-') && !REGISTERED.has(id.slice(4))) {
    throw new Error(`taught-at: ${route}#${id} names a figure that is never registered`);
  }
  const list = HEADINGS.get(route);
  const own = list.find((h) => h.id === id);
  let label = own ? own.text : '';
  if (!own) {
    let best = null;
    for (const h of list) { if (h.index < at) best = h; else break; }
    if (!best) throw new Error(`taught-at: ${route}#${id} sits above every heading`);
    label = best.text;
  }
  if (label.length > 58) label = `${label.slice(0, label.lastIndexOf(' ', 58)).trim()}…`;
  return { to: `${route}#${id}`, label: `${PAGE_NAME[route]} · ${label}` };
}

// The module map. Every figure on a class page, in the order it appears, with
// the section that holds it. The map is navigation first: it is how a student
// gets back to the figure they half remember. That the ones they have driven
// fill in is the second thing it does, and it never counts them.
// A figure's own title, read from the module that registers it. The section
// heading is not enough: two figures under one heading would both be called
// "Audio", which is no use to somebody looking for the one they remember.
const FIG_TITLE = new Map();
for (const f of fs.readdirSync(path.join(HERE, 'assets')).filter((n) => /^anim-.*\.js$/.test(n))) {
  const src = fs.readFileSync(path.join(HERE, 'assets', f), 'utf8');
  for (const m of src.matchAll(/register\('([a-z0-9-]+)'[\s\S]{0,8000}?title:\s*'((?:[^'\\]|\\.)*)'/g)) {
    if (!FIG_TITLE.has(m[1])) FIG_TITLE.set(m[1], m[2].replace(/\\'/g, "'"));
  }
}

// Where the map should send somebody for each class's cards. Only three of the
// five classes carry the numbers drill on their own Practice tab; for the other
// two the deck lives on /practice, filtered by the class chip.
const classLinks = Object.fromEntries(CLASSES.map((c) => [c.n, {
  drill: c.practice.includes('drill') ? `/class/${c.n}#drill` : '/practice#drill',
  myths: c.practice.includes('myths') ? `/class/${c.n}#myths` : '/practice#myths',
}]));

const mapFigures = [];
for (const c of CLASSES) {
  const route = `/class/${c.n}`;
  const html = PAGES.get(route);
  for (const m of html.matchAll(/ id="fig-([a-z0-9-]+)"/g)) {
    const id = `fig-${m[1]}`;
    const { to, label } = resolve(route, id);
    const title = FIG_TITLE.get(m[1]);
    if (!title) {
      console.error(`  ! no title found for figure ${m[1]}, the map would label it by its section`);
      process.exitCode = 1;
    }
    mapFigures.push({ cls: c.n, name: m[1], to, label: title || label.replace(/^Class \d+ \u00b7 /, '') });
  }
}

let taughtHit = 0;
const staleKeys = new Set(Object.keys(taughtAt));
for (const c of drillCards) {
  const t = taughtAt[c.key];
  if (t) { c.src = resolve(t.route, t.id); taughtHit++; staleKeys.delete(c.key); }
  delete c.key;
}
if (staleKeys.size) {
  console.error(`! taught-at keys match no card: ${[...staleKeys].join(' | ')}`);
  process.exitCode = 1;
}
for (const n of Object.keys(readiness)) {
  for (const q of readiness[n]) {
    if (q.to) { q.src = resolve(q.to.route, q.to.id); delete q.to; }
  }
}

// --- Data and assets --------------------------------------------------------

fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, 'assets'))) {
  fs.copyFileSync(path.join(HERE, 'assets', f), path.join(OUT, 'assets', f));
}

fs.writeFileSync(path.join(OUT, 'assets', 'data.json'), JSON.stringify({
  flowCards, flowMeta, faultScenarios, drillCards, glossCards, readiness, myths, mapFigures, classLinks,
  schedule: SCHEDULE.map((x) => ({ ...x, hours: hoursOf(x), day: dateParts(x.date).day })),
}));
fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify(searchIndex));

fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify(STAMP, null, 2));

const routes = ['/', '/prepare', '/map', '/foundations', '/tools', '/practice', '/glossary', '/numbers', '/field', '/lineage', '/next',
  ...CLASSES.map((c) => `/class/${c.n}`), ...CLASSES.map((c) => `/teach/${c.n}`)];

console.log(`Built ${routes.length} routes`);
console.log(`  search entries : ${searchIndex.length}`);
console.log(`  drill cards    : ${drillCards.length}`);
console.log(`  myth cards     : ${myths.length}`);
console.log(`  map figures    : ${mapFigures.length}`);
console.log(`  taught-at      : ${taughtHit} of ${drillCards.length} drill cards`);
console.log(`  glossary cards : ${glossCards.length}`);
console.log(`  flow cards     : ${flowCards.length}`);
console.log(`  fault cases    : ${faultScenarios.length}`);
console.log(`  build          : ${STAMP.commit} via ${STAMP.source}${STAMP.branch ? ` (${STAMP.branch})` : ''}`);
console.log(`  explainers     : ${animRendered}${animRendered === animExpected ? '' : ` of ${animExpected} EXPECTED`}`);
if (animRendered !== animExpected) process.exitCode = 1;
