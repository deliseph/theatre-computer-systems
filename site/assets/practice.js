// Interactive practice: subnetting trainer, fault diagnosis simulator,
// the Four Flows sort, the numbers drill, and the glossary tools.
//
// Everything is self-graded and stored per browser. Nothing is reported
// anywhere, which is the point: a drill you are being marked on is a test, and
// people stop taking risks on tests.

import { due, counts, grade as gradeCard, nextDue, describeWhen, cardId } from './review.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

let DATA = null;
const loadData = async () => (DATA ||= await (await fetch('/assets/data.json')).json());


// --- Stat store -------------------------------------------------------------

const statKey = (k) => `tcs-stat-${k}`;
const getStat = (k) => { try { return JSON.parse(localStorage.getItem(statKey(k))) || { right: 0, wrong: 0 }; } catch { return { right: 0, wrong: 0 }; } };
const setStat = (k, v) => { try { localStorage.setItem(statKey(k), JSON.stringify(v)); } catch { /* ignore */ } };

const scorebar = (right, wrong, extra = '') => `<div class="scorebar">
  <span class="score good">✓ ${right}</span>
  <span class="score bad">✗ ${wrong}</span>${extra}</div>`;

// ============================================================================
// IPv4 helpers, duplicated deliberately so practice works without tools.js
// ============================================================================

const ipToInt = (ip) => ip.trim().split('.').reduce((a, o) => a * 256 + (+o), 0) >>> 0;
const intToIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskOf = (p) => (p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0);
const netOf = (ip, p) => (ipToInt(ip) & maskOf(p)) >>> 0;
const bcastOf = (ip, p) => (netOf(ip, p) | (~maskOf(p) >>> 0)) >>> 0;
const normIp = (s) => s.trim().replace(/\s+/g, '').replace(/^\/+/, '');

// ============================================================================
// Subnetting trainer
// ============================================================================

const PREFIXES = [22, 23, 24, 25, 26, 27, 28, 29, 30];

function randomAddress() {
  const base = pick([
    () => `10.${rnd(0, 254)}.${rnd(0, 254)}.${rnd(1, 254)}`,
    () => `192.168.${rnd(0, 254)}.${rnd(1, 254)}`,
    () => `172.${rnd(16, 31)}.${rnd(0, 254)}.${rnd(1, 254)}`,
  ]);
  return base();
}
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function makeSubnetQuestion() {
  const kind = pick(['network', 'broadcast', 'hosts', 'range', 'talk', 'mask', 'prefix', 'fit', 'split']);
  const ip = randomAddress();
  const p = pick(PREFIXES);
  const net = intToIp(netOf(ip, p));
  const bc = intToIp(bcastOf(ip, p));
  const usable = 2 ** (32 - p) - 2;
  const blockOctet = Math.min(3, Math.floor(p / 8));
  const maskOctet = (maskOf(p) >>> (8 * (3 - blockOctet))) & 255;
  const block = 256 - maskOctet;

  const working = (extra) => `  Mask for /${p} is ${intToIp(maskOf(p))}
  Block size = 256 − ${maskOctet} = ${block}
  ${ip} falls in the block starting ${net.split('.')[blockOctet]}
  Network   ${net}
  Broadcast ${bc}
  Usable    ${intToIp(netOf(ip, p) + 1)} to ${intToIp(bcastOf(ip, p) - 1)}   (${usable.toLocaleString()} addresses)${extra || ''}`;

  switch (kind) {
    case 'network':
      return { prompt: `What is the <b>network address</b> of <code>${ip}/${p}</code>?`, tag: 'Network address', answer: net, check: (v) => normIp(v) === net, working: working() };
    case 'broadcast':
      return { prompt: `What is the <b>broadcast address</b> of <code>${ip}/${p}</code>?`, tag: 'Broadcast address', answer: bc, check: (v) => normIp(v) === bc, working: working() };
    case 'hosts':
      return { prompt: `How many <b>usable host addresses</b> are in <code>${ip}/${p}</code>?`, tag: 'Host count', answer: String(usable), check: (v) => v.replace(/[,\s]/g, '') === String(usable), working: `  Usable = 2^(32−${p}) − 2 = ${(2 ** (32 - p)).toLocaleString()} − 2 = ${usable.toLocaleString()}\n  The two you never assign are the network address and the broadcast address.` };
    case 'range': {
      const ans = `${intToIp(netOf(ip, p) + 1)}-${intToIp(bcastOf(ip, p) - 1)}`;
      return { prompt: `Give the <b>first and last usable host</b> in <code>${ip}/${p}</code>. Write them as <code>first-last</code>.`, tag: 'Usable range', answer: ans, check: (v) => normIp(v).replace(/\s*(to|-|–)\s*/gi, '-') === ans, working: working() };
    }
    case 'mask':
      return { prompt: `Write <code>/${p}</code> as a <b>dotted decimal subnet mask</b>.`, tag: 'Prefix to mask', answer: intToIp(maskOf(p)), check: (v) => normIp(v) === intToIp(maskOf(p)), working: `  /${p} means ${p} ones followed by ${32 - p} zeros.\n  ${intToIp(maskOf(p))}\n  Bit values to recognise: 0 128 192 224 240 248 252 254 255` };
    case 'prefix':
      return { prompt: `Write the mask <code>${intToIp(maskOf(p))}</code> as a <b>CIDR prefix</b>.`, tag: 'Mask to prefix', answer: `/${p}`, check: (v) => normIp(v).replace('/', '') === String(p), working: `  Count the ones: ${intToIp(maskOf(p))} is /${p}.\n  Bit values: 128=1 192=2 224=3 240=4 248=5 252=6 254=7 255=8 ones.` };
    case 'talk': {
      const same = Math.random() < 0.5;
      const a = ip;
      let b;
      if (same) b = intToIp(netOf(a, p) + rnd(1, Math.max(1, 2 ** (32 - p) - 2)));
      else b = intToIp((bcastOf(a, p) + rnd(1, 40)) >>> 0);
      const canTalk = netOf(a, p) === netOf(b, p);
      return {
        prompt: `Can <code>${a}/${p}</code> talk directly to <code>${b}/${p}</code>?`,
        tag: 'Can these two talk?', answer: canTalk ? 'yes' : 'no',
        choices: ['Yes', 'No'],
        check: (v) => v.trim().toLowerCase().startsWith(canTalk ? 'y' : 'n'),
        working: `  Apply the mask to both addresses.\n  ${a} → network ${intToIp(netOf(a, p))}\n  ${b} → network ${intToIp(netOf(b, p))}\n  The network portions ${canTalk ? 'MATCH, so yes' : 'DIFFER, so no. No cable will change this.'}`,
      };
    }
    case 'fit': {
      const need = pick([6, 12, 25, 50, 60, 100, 200, 300, 500]);
      let pr = 30;
      while (2 ** (32 - pr) - 2 < need && pr > 8) pr--;
      return {
        prompt: `You need one network holding <b>${need} devices</b>. What is the <b>smallest prefix</b> that works?`,
        tag: 'Sizing a network', answer: `/${pr}`,
        check: (v) => normIp(v).replace('/', '') === String(pr),
        working: `  /${pr} gives 2^(32−${pr}) − 2 = ${(2 ** (32 - pr) - 2).toLocaleString()} usable, which holds ${need}.\n  /${pr + 1} would give only ${(2 ** (32 - pr - 1) - 2).toLocaleString()}, which does not.`,
      };
    }
    default: {
      const want = pick([2, 4, 8, 16]);
      const basep = pick([22, 23, 24]);
      const bits = Math.log2(want);
      const np = basep + bits;
      return {
        prompt: `You have a <code>/${basep}</code> and you need <b>${want} equal subnets</b>. What prefix do you use?`,
        tag: 'Splitting a range', answer: `/${np}`,
        check: (v) => normIp(v).replace('/', '') === String(np),
        working: `  ${want} subnets needs enough borrowed bits that 2^bits ≥ ${want}.\n  2^${bits} = ${want}, so borrow ${bits} bits.\n  /${basep} + ${bits} = /${np}   mask ${intToIp(maskOf(np))}\n  Each holds ${(2 ** (32 - np) - 2).toLocaleString()} usable addresses.`,
      };
    }
  }
}

function mountSubnetTrainer(root) {
  const stat = getStat('subnet');
  let streak = 0;
  let q = null;
  const box = h('<div></div>');
  root.append(h(`<p class="tool-sub">Endless generated questions. Twenty minutes a night for a week
    beats three hours the day before. Aim for ten right in a row, twice.</p>`), box);

  const next = () => {
    q = makeSubnetQuestion();
    box.innerHTML = scorebar(stat.right, stat.wrong, `<span class="score">in a row ${streak}</span>`) + `
      <div class="q-card">
        <div class="q-meta">${q.tag}</div>
        <p class="q-prompt">${q.prompt}</p>
        ${q.choices
          ? `<div class="opts">${q.choices.map((c) => `<button class="opt" data-v="${c}"><span class="opt-k">${c[0]}</span>${c}</button>`).join('')}</div>`
          : `<div class="fields" style="margin:0"><div class="field">
              <input id="sq-in" placeholder="Your answer" autocomplete="off" spellcheck="false"></div></div>
             <div class="chip-row" style="margin:12px 0 0"><button class="chip on" id="sq-go">Check</button>
             <button class="chip" id="sq-skip">Show me</button></div>`}
      </div>`;
    // preventScroll: focusing on mount otherwise yanks the page down to the
    // answer box, hiding the class title on arrival.
    $('#sq-in', box)?.focus({ preventScroll: true });
  };

  const grade = (value, gaveUp) => {
    const right = !gaveUp && q.check(value);
    if (gaveUp) { stat.wrong++; streak = 0; }
    else if (right) { stat.right++; streak++; }
    else { stat.wrong++; streak = 0; }
    setStat('subnet', stat);

    const card = $('.q-card', box);
    card.querySelectorAll('button, input').forEach((b) => { b.disabled = true; });
    card.append(h(`<div class="q-answer">
      <p><b style="color:var(--${right ? 'green' : 'red'})">${gaveUp ? 'The answer' : right ? '✓ Correct' : '✗ Not that one'}</b>
      ${right ? '' : ` — the answer is <code>${q.answer}</code>`}</p>
      <pre class="working">${q.working}</pre>
      <div class="chip-row" style="margin:12px 0 0"><button class="chip on" id="sq-next">Next question →</button></div>
    </div>`));
    $('#sq-next', box).focus({ preventScroll: true });
  };

  box.addEventListener('click', (e) => {
    if (e.target.closest('#sq-next')) return next();
    if (e.target.closest('#sq-go')) return grade($('#sq-in', box).value, false);
    if (e.target.closest('#sq-skip')) return grade('', true);
    const opt = e.target.closest('.opt');
    if (opt) return grade(opt.dataset.v, false);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if ($('#sq-next', box)) next();
    else if ($('#sq-in', box)) grade($('#sq-in', box).value, false);
  });
  next();
}

// ============================================================================
// Fault diagnosis simulator
// ============================================================================

async function mountFaults(root) {
  const { faultScenarios } = await loadData();
  const box = h('<div></div>');
  root.append(h(`<p class="tool-sub">Five real failure signatures. You are scored on the
    <b>order</b> you investigate in, not only on the answer, because bottom-up diagnosis is the
    actual skill. Every step costs you something.</p>`), box);

  let sc = null, taken = [], done = false;

  const start = (id) => {
    sc = faultScenarios.find((s) => s.id === id) || pick(faultScenarios);
    taken = []; done = false;
    paint();
  };

  const paint = () => {
    const steps = sc.steps.map((s) => {
      const used = taken.find((t) => t.id === s.id);
      return `<button class="step" data-id="${s.id}"${used || done ? ' disabled' : ''}>
          <span class="step-l">L${s.layer}</span>${s.label}</button>
        ${used ? `<div class="step-res${s.useful ? '' : ' dud'}">${s.result}</div>` : ''}`;
    }).join('');

    const wasted = taken.filter((t) => !sc.steps.find((s) => s.id === t.id).useful).length;

    box.innerHTML = `
      <div class="chip-row">${faultScenarios.map((s) => `<button class="chip${s.id === sc.id ? ' on' : ''}" data-sc="${s.id}">${s.title}</button>`).join('')}</div>
      <div class="q-card">
        <div class="q-meta">The symptom</div>
        <p style="margin:0 0 4px">${sc.brief}</p>
      </div>
      <h4 class="hd hd-4">Investigate. Each step tells you something, or wastes your time.</h4>
      <div class="steps">${steps}</div>
      ${taken.length ? `<div class="scorebar"><span class="score">${taken.length} step${taken.length === 1 ? '' : 's'} taken</span>
        <span class="score${wasted ? ' bad' : ' good'}">${wasted} wasted</span></div>` : ''}
      ${done ? '' : `<h4 class="hd hd-4">Name the fault</h4>
      <div class="opts">${shuffle([...sc.options]).map((o) => `<button class="opt" data-ans="${o.id}"><span class="opt-k">▸</span>${o.label}</button>`).join('')}</div>`}`;
  };

  const answer = (id) => {
    done = true;
    const right = id === sc.answer;
    const stat = getStat('faults');
    right ? stat.right++ : stat.wrong++;
    setStat('faults', stat);

    const wasted = taken.filter((t) => !sc.steps.find((s) => s.id === t.id).useful);
    const firstLayer = taken.length ? sc.steps.find((s) => s.id === taken[0].id).layer : null;
    paint();
    box.append(h(`<div class="q-card" style="border-color:var(--${right ? 'green' : 'red'})">
      <div class="q-meta">${right ? '✓ Correct' : '✗ Not that one'}</div>
      <p>${right ? '' : `The fault was <b>${sc.options.find((o) => o.id === sc.answer).label}</b>. `}${sc.explain}</p>
      <div class="q-answer">
        <p><b>How you worked.</b> ${taken.length} step${taken.length === 1 ? '' : 's'},
        ${wasted.length === 0 ? 'none wasted. Clean.' : `${wasted.length} of them wasted (${wasted.map((w) => sc.steps.find((s) => s.id === w.id).label.toLowerCase()).join(', ')}).`}
        ${firstLayer === 1 ? ' You started at layer 1, which is right: link light before anything else.'
        : firstLayer >= 4 ? ' You started at layer ' + firstLayer + '. Start at the bottom. The link light is thirty seconds and rules out the most common fault family.'
          : ' You started at layer ' + firstLayer + '. Acceptable, though the link light is cheaper still.'}</p>
      </div>
      <div class="chip-row" style="margin:12px 0 0">
        <button class="chip on" data-sc="${pick(faultScenarios.filter((s) => s.id !== sc.id)).id}">Another scenario →</button>
      </div></div>`));
  };

  box.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sc]');
    if (s) return start(s.dataset.sc);
    const step = e.target.closest('.step');
    if (step && !done) { taken.push({ id: step.dataset.id }); return paint(); }
    const a = e.target.closest('[data-ans]');
    if (a && !done) return answer(a.dataset.ans);
  });

  start(faultScenarios[0].id);
}

// ============================================================================
// Four Flows sort
// ============================================================================

async function mountFlows(root) {
  const { flowCards, flowMeta } = await loadData();
  const box = h('<div></div>');
  root.append(h(`<p class="tool-sub">Twenty four real examples. Sort each into the flow it belongs
    to. The explanation after each answer is the actual teaching, so read it even when you are right.</p>`), box);

  let deck = [], i = 0, right = 0, placed = [];

  const start = () => { deck = shuffle([...flowCards]); i = 0; right = 0; placed = []; paint(); };

  const paint = () => {
    const cols = Object.entries(flowMeta).map(([k, v]) => `<div class="sortcol ${k}">
        <h4>${v.label}</h4><p>${v.hint}</p>
        ${placed.filter((p) => p.f === k).map((p) => `<span class="sorted ${p.ok ? 'right' : 'wrong'}">${p.t}</span>`).join('')}
      </div>`).join('');

    if (i >= deck.length) {
      box.innerHTML = `<div class="q-card"><div class="q-meta">Finished</div>
        <p class="q-prompt">${right} out of ${deck.length}</p>
        <p>${right === deck.length ? 'Every one. You can classify show traffic on sight, which is the whole point of the model.'
          : right >= deck.length * 0.75 ? 'Solid. Look back at the ones marked red and read why.'
            : 'Worth another run. The four flows are the model every other class leans on.'}</p>
        <div class="chip-row" style="margin:12px 0 0"><button class="chip on" id="fl-again">Shuffle and go again</button></div></div>
        <div class="sortgrid">${cols}</div>`;
      return;
    }

    const c = deck[i];
    box.innerHTML = `<div class="scorebar"><span class="score">${i + 1} of ${deck.length}</span>
        <span class="score good">✓ ${right}</span></div>
      <div class="q-card"><div class="q-meta">Which flow is this?</div>
        <p class="q-prompt">${c.t}</p>
        <div class="opts">${Object.entries(flowMeta).map(([k, v]) =>
          `<button class="opt" data-f="${k}"><span class="opt-k">▸</span>${v.label}</button>`).join('')}</div>
      </div>
      <div class="sortgrid">${cols}</div>`;
  };

  box.addEventListener('click', (e) => {
    if (e.target.closest('#fl-again')) return start();
    const btn = e.target.closest('.opt[data-f]');
    if (!btn) return;
    const c = deck[i];
    const ok = btn.dataset.f === c.f;
    if (ok) right++;
    placed.push({ t: c.t, f: c.f, ok });

    const card = $('.q-card', box);
    card.querySelectorAll('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.f === c.f) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    card.append(h(`<div class="q-answer">
      <p><b style="color:var(--${ok ? 'green' : 'red'})">${ok ? '✓' : '✗'} ${flowMeta[c.f].label}.</b> ${c.why}</p>
      <div class="chip-row" style="margin:10px 0 0"><button class="chip on" id="fl-next">Next →</button></div></div>`));
    $('#fl-next', box).onclick = () => { i++; paint(); };
    $('#fl-next', box).focus({ preventScroll: true });
  });

  start();
}

// ============================================================================
// Numbers drill
// ============================================================================

async function mountDrill(root, classNum) {
  const { drillCards } = await loadData();
  const tags = [...new Set(drillCards.map((c) => c.tag))];
  const box = h('<div></div>');
  root.append(h(`<p class="tool-sub">Flashcards built from the reference card, so they can never drift
    out of date. A card you get right comes back later; a card you miss comes back tomorrow. Nobody
    sees any of this but you.</p>`), box);

  let filter = classNum > 0 ? `Class ${classNum}` : 'all';
  // 'due' is the sitting that ends. 'all' is the deck, for the night before.
  let mode = 'due';
  let deck = [], i = 0, shown = false, sessionRight = 0, sessionWrong = 0, finished = false;
  const missed = new Map();   // cardId -> misses in THIS sitting, never stored
  let tipOff = false;         // the student said "no, that is it"
  let pointerFor = null;      // the card whose second miss earned a pointer
  const stat = getStat('drill');

  const pool = () => drillCards.filter((c) => filter === 'all' || c.tag === filter);

  // 'due' is the sitting that ends, and it holds nothing but cards that have
  // come back. New cards are their own mode so that taking on new material is a
  // decision, not a debt that grows while you sleep.
  const build = () => {
    const p = pool();
    if (mode === 'all') deck = shuffle(p);
    else if (mode === 'new') deck = shuffle(due(p).fresh).slice(0, 8);
    else deck = due(p).ready.slice(0, 20);
    i = 0; shown = false; pointerFor = null; finished = false; sessionRight = 0; sessionWrong = 0;
    missed.clear(); tipOff = false;
  };

  const header = () => {
    const c = counts(pool());
    const newN = Math.min(c.fresh, 8);
    return `<div class="chip-row">
        <button class="chip${filter === 'all' ? ' on' : ''}" data-t="all">All ${drillCards.length}</button>
        ${tags.map((t) => `<button class="chip${filter === t ? ' on' : ''}" data-t="${t}">${t}</button>`).join('')}
      </div>
      <div class="chip-row rv-modes">
        <button class="chip${mode === 'due' ? ' on' : ''}" data-m="due">Due now
          ${c.ready > 0 ? `<b class="rv-n">${c.ready}</b>` : ''}</button>
        ${newN > 0 ? `<button class="chip${mode === 'new' ? ' on' : ''}" data-m="new">Start ${newN} new</button>` : ''}
        <button class="chip${mode === 'all' ? ' on' : ''}" data-m="all">Whole deck</button>
        <span class="rv-state">${c.known} settled · ${c.landing} to come back to · ${c.fresh} of ${c.total} not started</span>
      </div>`;
  };

  // Card fronts are build-time HTML, so a raw fragment inside a sentence reads
  // badly and can run long.
  const plain = (html) => {
    const d = document.createElement('div'); d.innerHTML = html;
    const t = d.textContent.trim();
    return t.length > 60 ? `${t.slice(0, 59)}…` : t;
  };

  // At most one suggestion, and it is always refusable. The guards on the
  // second branch are the anti-treadmill rules: it never follows a sitting of
  // new cards, never appears while cards are still due, and never appears
  // after a long sitting.
  const suggestion = (c) => {
    const twice = [...missed.entries()].find(([, n]) => n >= 2);
    if (twice) {
      const card = deck.find((d) => cardId(d) === twice[0]) || pool().find((d) => cardId(d) === twice[0]);
      if (card) {
        const n = /Class (\d)/.exec(card.tag || '')?.[1];
        const href = n ? `/class/${n}/#tab=numbers` : '/numbers';
        const what = n ? `The Class ${n} numbers card has it in full.` : 'The numbers card has it in full.';
        const link = n ? `Open the Class ${n} numbers card` : 'Open the numbers card';
        return `<div class="rv-tip"><p>Two misses tonight on “${plain(card.q)}”. ${what}</p>
          <div class="chip-row"><a class="chip on" href="${href}">${link}</a>
          <button class="chip" data-tip="no">No, that is it</button></div></div>`;
      }
    }
    if (mode === 'due' && c.ready === 0 && c.fresh > 0 && sessionRight + sessionWrong < 12) {
      return `<div class="rv-tip"><p>There are ${c.fresh} cards you have not started. Eight of them takes about four minutes.</p>
        <div class="chip-row"><button class="chip on" data-m="new">Start 8 new</button>
        <button class="chip" data-tip="no">No, that is it</button></div></div>`;
    }
    return '';
  };

  const paint = () => {
    const card = deck[i];
    if (finished || !card) {
      const c = counts(pool());
      const graded = sessionRight + sessionWrong;
      const when = describeWhen(nextDue(pool()));
      const touched = c.known + c.landing + c.started;
      const title = graded ? 'Done for tonight.' : touched ? 'Nothing is due.' : 'Nothing has come back yet.';
      const tail = [];
      if (c.ready > 0) tail.push(`There are ${c.ready} more due. They keep until tomorrow if you would rather stop.`);
      else if (when) tail.push(`The next cards come back <b>${when}</b>.`);
      else if (!touched) tail.push(`You have not started any of these cards. There are ${c.fresh} waiting whenever you want them.`);
      if (c.known) tail.push(`You have ${c.known} of ${c.total} settled.`);
      box.innerHTML = header() + `<div class="q-card rv-done">
        <h3>${title}</h3>
        ${graded ? `<p>${sessionRight} right, ${sessionWrong} to come back to, out of ${graded}.</p>` : ''}
        <p class="rv-next">${tail.join(' ')}</p>
        ${tipOff ? '<p class="rv-stop">That is it for tonight.</p>' : suggestion(c)}</div>`;
      return;
    }
    box.innerHTML = header() + `
      ${scorebar(stat.right, stat.wrong, `<span class="score">card ${i + 1} of ${deck.length}</span>`)}
      <div class="q-card flash">
        <div class="flash-tag">${card.tag}</div>
        <div class="flash-q">${card.q}</div>
        ${shown ? `<div class="flash-a">${card.a}</div>
          ${pointerFor ? `<div class="rv-where">
            <span class="rv-where-s">This one has not landed yet. It is taught here:</span>
            <a class="rv-where-l" href="${card.src.to}">${card.src.label} →</a></div>
            <div class="chip-row" style="justify-content:center">
              <button class="chip on" id="dr-next">Next card →</button></div>`
          : `<div class="chip-row" style="justify-content:center">
            <button class="chip" data-g="miss">✗ Missed it</button>
            <button class="chip on" data-g="got">✓ Got it</button></div>`}`
        : `<div class="chip-row" style="justify-content:center;margin-top:18px">
            <button class="chip on" id="dr-show">Reveal the answer</button></div>`}
      </div>`;
    if (pointerFor) $('#dr-next', box)?.focus({ preventScroll: true });
  };

  box.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]');
    if (t) { filter = t.dataset.t; build(); return paint(); }
    const m = e.target.closest('[data-m]');
    if (m) { mode = m.dataset.m; build(); return paint(); }
    if (e.target.closest('[data-tip]')) { tipOff = true; return paint(); }
    if (e.target.closest('#dr-show')) { shown = true; return paint(); }
    if (e.target.closest('#dr-next')) {
      pointerFor = null; i++; shown = false;
      if (i >= deck.length) finished = true;
      return paint();
    }
    const g = e.target.closest('[data-g]');
    if (g) {
      const right = g.dataset.g === 'got';
      right ? (stat.right++, sessionRight++) : (stat.wrong++, sessionWrong++);
      setStat('drill', stat);
      const st = gradeCard(deck[i], right);
      if (!right) { const id = cardId(deck[i]); missed.set(id, (missed.get(id) || 0) + 1); }
      // A card you just missed is seen again before you leave, at the back of
      // the queue. Retrieval works when the second attempt is not immediate.
      if (!right && deck.length > 1) deck.push(deck[i]);
      // A second miss is not a card that needs repeating faster. It is a card
      // that was never taught, or was taught and not followed, so say where.
      if (!right && st.miss >= 2 && deck[i].src) { pointerFor = deck[i]; return paint(); }
      i++; shown = false; pointerFor = null;
      if (i >= deck.length) finished = true;
      return paint();
    }
  });

  build(); paint();
}

// ============================================================================
// Spot the myth
// ============================================================================
//
// The misconceptions section of each class prints a wrong belief with its
// correction attached. Read that way it is agreed with and forgotten: you
// cannot disagree with a sentence that has already told you the answer. Here
// each claim arrives bare and you commit before the correction appears.
//
// Nothing here is scored. What you say first is not graded at all, because a
// student who happens to guess right has learned nothing. The grading question
// is the second one, and only you can answer it: could you have said why.

async function mountMyths(root, classNum) {
  const { myths } = await loadData();
  const box = h('<div></div>');
  let filter = classNum > 0 ? `Myth · Class ${classNum}` : 'all';
  let mode = 'due';
  let deck = [], i = 0, said = null, finished = false;
  const missed = new Map();
  const requeued = new Set();

  const pool = () => myths.filter((c) => filter === 'all' || c.tag === filter);
  const tags = [...new Set(myths.map((c) => c.tag))];

  root.append(h(`<p class="tool-sub">${pool().length} sentences that get said about this subject, and every
    one of them is wrong. You are asked to commit before the correction appears, because agreeing with a
    bullet that has already told you the answer does almost nothing. What you are graded on is the second
    question: whether you could have said why. Nothing here is scored and nothing leaves your browser.</p>`), box);

  const build = () => {
    const p = pool();
    if (mode === 'all') deck = shuffle(p);
    else {
      const { fresh, ready } = due(p);
      deck = [...ready.slice(0, 20), ...shuffle(fresh).slice(0, 8)];
    }
    i = 0; said = null; finished = false;
    missed.clear(); requeued.clear();
  };

  const header = () => {
    const c = counts(pool());
    // The badge is the length build() will actually produce, so the chip can
    // never say eight while the closing card says nothing is due.
    const n = Math.min(c.ready, 20) + Math.min(c.fresh, 8);
    const classRow = classNum === 0
      ? `<div class="chip-row">
          <button class="chip${filter === 'all' ? ' on' : ''}" data-t="all">All ${myths.length}</button>
          ${tags.map((t) => `<button class="chip${filter === t ? ' on' : ''}" data-t="${t}">${t.replace('Myth · ', '')}</button>`).join('')}
        </div>`
      : '';
    return `${classRow}
      <div class="chip-row rv-modes">
        <button class="chip${mode === 'due' ? ' on' : ''}" data-m="due">Due now${n > 0 ? ` <b class="rv-n">${n}</b>` : ''}</button>
        <button class="chip${mode === 'all' ? ' on' : ''}" data-m="all">The whole set</button>
      </div>`;
  };

  const paint = () => {
    const card = deck[i];
    if (finished || !card) {
      const when = describeWhen(nextDue(pool()));
      const back = [...missed.values()];
      box.innerHTML = header() + `<div class="q-card rv-done">
        <h3>${i > 0 ? 'That is the set, for now.' : 'Nothing is due here.'}</h3>
        ${back.length
          ? `<p>These come back tomorrow. Each one links to where it is taught.</p>
             <ul class="myth-back">${back.map((c) => `<li><a href="/class/${c.cls}#common-misconceptions-in-this-session">${c.claim}</a></li>`).join('')}</ul>`
          : `<p class="rv-next">${when ? `These claims come back <b>${when}</b>.` : 'Every claim in this set is new. Start whenever you like.'}</p>`}
        <div class="chip-row" style="justify-content:center;margin:14px 0 0"><button class="chip" data-m="all">Go through the whole set anyway</button></div>
      </div>`;
      return;
    }
    box.innerHTML = header() + `
      <div class="scorebar"><span class="score">claim ${i + 1} of ${deck.length}</span></div>
      <div class="q-card">
        <div class="q-meta">${card.tag}</div>
        <p class="myth-claim">${card.claim}</p>
        <p class="myth-ask">Most people say this. Do you?</p>
        <div class="opts">
          <button class="opt" data-say="yes"><span class="opt-k">▸</span>Sounds right to me</button>
          <button class="opt" data-say="no"><span class="opt-k">▸</span>I do not think so</button>
        </div>
      </div>`;
  };

  box.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]');
    if (t) { filter = t.dataset.t; build(); return paint(); }
    const m = e.target.closest('[data-m]');
    if (m) { mode = m.dataset.m; build(); return paint(); }

    const say = e.target.closest('.opt[data-say]');
    if (say && !said) {
      said = say.dataset.say;
      const card = deck[i];
      const qc = $('.q-card', box);
      // Neither answer is right or wrong, so neither is marked so. The one you
      // chose is simply the one you are now committed to.
      qc.querySelectorAll('.opt').forEach((b) => { b.disabled = true; });
      say.classList.add('chose');
      qc.append(h(`<div class="q-answer">
        <p class="myth-verdict"><b>${said === 'yes'
          ? 'Most people say this, and here is why it is not so.'
          : 'You are right that it is not so. This is the part that matters.'}</b></p>
        <p>${card.correction}</p>
        <p class="myth-grade">Before you read that, could you have given that reason?</p>
        <div class="chip-row" style="margin:0">
          <button class="chip" data-g="miss">Not yet</button>
          <button class="chip on" data-g="got">Yes, that was my reason</button>
        </div>
      </div>`));
      return;
    }

    const g = e.target.closest('[data-g]');
    if (g && said) {
      const right = g.dataset.g === 'got';
      gradeCard(deck[i], right);
      const id = cardId(deck[i]);
      if (right) missed.delete(id);
      else {
        missed.set(id, deck[i]);
        // Once, not every time. An unguarded requeue makes a sitting you
        // cannot finish.
        if (!requeued.has(id) && deck.length > 1) { requeued.add(id); deck.push(deck[i]); }
      }
      i++; said = null;
      if (i >= deck.length) finished = true;
      return paint();
    }
  });

  build(); paint();
}


// ============================================================================
// Glossary filter and flashcards
// ============================================================================

function mountGlossary() {
  const input = $('#gloss-filter');
  if (!input) return;
  const body = $('#gloss-body');
  const count = $('#gloss-count');
  const rows = [...body.querySelectorAll('tbody tr')];
  const total = rows.length;
  count.textContent = `${total} rows`;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    for (const r of rows) {
      const hit = !q || r.textContent.toLowerCase().includes(q);
      r.hidden = !hit;
      if (hit) n++;
    }
    // Hide a section heading and its table when nothing in it matched.
    for (const wrap of body.querySelectorAll('.table-wrap')) {
      const any = [...wrap.querySelectorAll('tbody tr')].some((r) => !r.hidden);
      wrap.hidden = !any;
      let prev = wrap.previousElementSibling;
      while (prev && !/^H[23]$/.test(prev.tagName)) prev = prev.previousElementSibling;
      if (prev) prev.hidden = !any;
    }
    count.textContent = q ? `${n} of ${total}` : `${total} rows`;
  });

  const flashBtn = $('#gloss-cards');
  const flashBox = $('#gloss-flash');
  let on = false, deck = [], i = 0, shown = false;

  const paint = () => {
    const c = deck[i];
    flashBox.innerHTML = `
      <div class="q-card flash">
        <div class="flash-tag">${c.tag} · ${i + 1} of ${deck.length}</div>
        <div class="flash-q">${c.q}</div>
        ${shown ? `<div class="flash-zh">${c.zh}</div><div class="flash-a" style="font-family:var(--sans);font-size:16px;color:var(--ink-2)">${c.a}</div>` : ''}
        <div class="chip-row" style="justify-content:center;margin-top:16px">
          ${shown ? '' : '<button class="chip on" data-a="show">Reveal</button>'}
          <button class="chip" data-a="next">Next card →</button>
          <button class="chip" data-a="exit">Back to the list</button>
        </div></div>`;
  };

  flashBtn?.addEventListener('click', async () => {
    const { glossCards } = await loadData();
    on = true; deck = shuffle(glossCards); i = 0; shown = false;
    body.hidden = true; flashBox.hidden = false;
    paint();
  });

  flashBox?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'show') { shown = true; paint(); }
    else if (a === 'next') { i = (i + 1) % deck.length; shown = false; paint(); }
    else { on = false; body.hidden = false; flashBox.hidden = true; flashBox.innerHTML = ''; }
  });
}


// ============================================================================
// Readiness check
//
// Answered BEFORE the class. It tests the prerequisite, not the class content,
// and a wrong answer names the exact thing to go and fix. That pointer is the
// only useful output of a pre-class quiz.
// ============================================================================

async function mountReady(root, classNum) {
  const { readiness } = await loadData();
  const items = readiness[classNum];
  if (!items) { root.remove(); return; }

  const box = h('<div></div>');
  root.append(h(`<p class="tool-sub">Five questions, before the class. Nothing is recorded and
    nobody sees it. A wrong answer tells you what to go and fix.</p>`), box);

  let i = 0, right = 0, gaps = [];

  const paint = () => {
    if (i >= items.length) {
      const ready = right >= 4;
      box.innerHTML = `<div class="q-card" style="border-color:var(--${ready ? 'green' : 'amber'})">
        <div class="q-meta">${right} of ${items.length}</div>
        <p class="q-prompt">${ready ? 'You are ready for this class.' : 'Two things to do first.'}</p>
        ${gaps.length
          ? `<p>Before you come in, fix these:</p><ul>${gaps.map((g) => `<li>${g.fix}${g.src ? ` <a class="rv-where-l" href="${g.src.to}">${g.src.label} →</a>` : ''}</li>`).join('')}</ul>`
          : '<p>Nothing outstanding. Bring the reference card and come in.</p>'}
        <div class="chip-row" style="margin:12px 0 0"><button class="chip on" id="rd-again">Try again</button></div>
      </div>`;
      return;
    }
    const q = items[i];
    box.innerHTML = `<div class="scorebar"><span class="score">${i + 1} of ${items.length}</span>
        <span class="score good">✓ ${right}</span></div>
      <div class="q-card">
        <div class="q-meta">Readiness</div>
        <p class="q-prompt">${q.q}</p>
        <div class="opts">${shuffle(q.a.map((t, n) => ({ t, n })))
          .map((o) => `<button class="opt" data-n="${o.n}"><span class="opt-k">▸</span>${o.t}</button>`).join('')}</div>
      </div>`;
  };

  box.addEventListener('click', (e) => {
    if (e.target.closest('#rd-again')) { i = 0; right = 0; gaps = []; return paint(); }
    const btn = e.target.closest('.opt[data-n]');
    if (!btn) return;
    const q = items[i];
    const ok = +btn.dataset.n === q.c;
    if (ok) right++; else gaps.push(q);

    const card = $('.q-card', box);
    card.querySelectorAll('.opt').forEach((b) => {
      b.disabled = true;
      if (+b.dataset.n === q.c) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    card.append(h(`<div class="q-answer">
      <p><b style="color:var(--${ok ? 'green' : 'red'})">${ok ? '✓ Yes' : '✗ Not quite'}</b>${ok ? '' : ` — ${q.fix}`}${!ok && q.src ? ` <a class="rv-where-l" href="${q.src.to}">${q.src.label} →</a>` : ''}</p>
      <div class="chip-row" style="margin:10px 0 0"><button class="chip on" id="rd-next">Next →</button></div></div>`));
    $('#rd-next', box).onclick = () => { i++; paint(); };
    $('#rd-next', box).focus({ preventScroll: true });
  });

  paint();
}

// --- Mount ------------------------------------------------------------------

for (const node of document.querySelectorAll('[data-practice]')) {
  const kind = node.dataset.practice;
  const cls = +(node.dataset.class || 0);
  const head = node.querySelector('.tool-h');
  if (head && !head.id) head.id = kind;
  if (kind === 'subnetdrill') mountSubnetTrainer(node);
  else if (kind === 'faults') mountFaults(node);
  else if (kind === 'flows') mountFlows(node);
  else if (kind === 'drill') mountDrill(node, cls);
  else if (kind === 'ready') mountReady(node, cls);
  else if (kind === 'myths') mountMyths(node, cls);
}
mountGlossary();
