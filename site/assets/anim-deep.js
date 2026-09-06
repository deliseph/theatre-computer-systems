// The layer below the one the course usually stops at.
//
// Class 2 says a CPU executes and RAM holds; Class 3 says a switch forwards and
// a router routes. These are the figures for the students who ask what that
// actually means: what a memory cell physically is, what the arithmetic unit
// does with 10110, why a GPU is not a fast CPU, what separates a hub from a
// switch, where a packet goes when it leaves the building, and what a byte is
// doing when the character is 繁體中文 rather than English.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, labelWrap, wrapText, textWidth, drawnSize, line, alpha, clamp, lerp, fitter,
} from './anim-core.js';

const mono = { mono: true };
const TAU = Math.PI * 2;
const bin = (v, n) => (v >>> 0).toString(2).padStart(n, '0');

// ============================================================================
// 1. Fetch, decode, execute, and how far away everything is
// ============================================================================

register('cpu-ram-cycle', (host) => {
  const st = { where: 'l1', step: 0 };
  // Real orders of magnitude on a current desktop part. The point is not the
  // exact figure, it is that the last two are a different kind of number.
  const TIERS = [
    ['Registers', 0.3, 'a few hundred bytes', 'inside the core'],
    ['L1 cache', 1, '48 KB', 'on the core'],
    ['L2 cache', 4, '1 to 2 MB', 'next to the core'],
    ['L3 cache', 30, '32 MB', 'shared by all the cores'],
    ['RAM', 80, '16 to 64 GB', 'across the motherboard'],
    ['NVMe SSD', 50000, 'terabytes', 'down the PCIe bus'],
    ['Hard disk', 5000000, 'terabytes', 'and something has to move'],
  ];
  const KEY = ['reg', 'l1', 'l2', 'l3', 'ram', 'nvme', 'hdd'];
  const STEPS = ['Fetch', 'Decode', 'Execute', 'Write back'];
  const WHAT = [
    'The program counter says which address the next instruction is at. Go and get it.',
    'Work out what the instruction is: which operation, which registers, which address.',
    'Do it. For arithmetic that means handing two numbers to the arithmetic unit.',
    'Put the answer somewhere: a register, or back out to memory.',
  ];

  const { controls, stage, setNote } = figure(host, {
    title: 'What a processor spends its time doing, and waiting for',
    sub: 'The same four steps, forever, a few billion times a second. Almost all of the interesting engineering is about not waiting for step one.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(660, w - 24), ox = (w - W) / 2;

      // The cycle.
      const gap = 8;
      const bw = (W - gap * (STEPS.length - 1)) / STEPS.length;
      STEPS.forEach((name, i) => {
        const x = ox + i * (bw + gap), on = i === st.step;
        box(g, x, 22, bw, 38, {
          fill: on ? alpha(p.amber, 0.16) : alpha(p.raised, 0.6),
          stroke: on ? p.amber : p.line, r: 6, lw: on ? 2 : 1,
        });
        label(g, name, x + bw / 2, 41, { color: on ? p.amber : p.ink2, size: 11.5, weight: on ? 700 : 600, align: 'center', max: bw - 8 });
        if (i < STEPS.length - 1) line(g, x + bw, 41, x + bw + gap, 41, { color: alpha(p.amber, 0.6), lw: 1.5 });
      });
      let y = 68;
      y += labelWrap(g, WHAT[st.step], ox, y + 8, { color: p.ink2, size: 12, max: W, maxLines: 2 }) + 12;

      // How far away the thing it wants might be, on a log scale, because a
      // linear one would draw the first four tiers as nothing at all.
      const sel = KEY.indexOf(st.where);
      const rowH = 24;
      const nameW = clamp(W * 0.22, 84, 120);
      const numW = textWidth(g, '5,000,000 ns', { size: 10.5, mono: true }) + 10;
      const barX = ox + nameW, barW = W - nameW - numW;
      const lg = (ns) => Math.log10(ns * 1000 + 1) / Math.log10(5e9 * 1000 + 1);
      const topY = y;
      TIERS.forEach(([name, ns, size, whereIs], i) => {
        const ry = topY + i * rowH, on = i === sel;
        label(g, name, ox, ry + 9, { color: on ? p.cyan : p.muted, size: 11, weight: on ? 700 : 500, max: nameW - 6 });
        const bwid = Math.max(2, lg(ns) * barW);
        box(g, barX, ry + 2, bwid, 14, {
          fill: alpha(on ? p.cyan : p.muted, on ? 0.55 : 0.25), stroke: on ? p.cyan : 'transparent', r: 2, lw: 1,
        });
        const txt = ns >= 1000 ? `${Math.round(ns).toLocaleString('en-US')} ns` : `${ns} ns`;
        label(g, txt, ox + W, ry + 9, { color: on ? p.ink : p.muted, size: 10.5, align: 'right', max: numW, ...mono });
        if (on) label(g, `${size} · ${whereIs}`, barX + bwid + 8, ry + 9,
          { color: p.muted, size: 10, max: Math.max(10, ox + W - numW - (barX + bwid) - 12) });
      });
      y = topY + TIERS.length * rowH + 10;

      const cycles = Math.max(1, Math.round(TIERS[sel][1] * 4));   // a 4 GHz part
      y += labelWrap(g, `At four gigahertz a cycle is a quarter of a nanosecond, so waiting on ${TIERS[sel][0].toLowerCase()} costs about ${cycles.toLocaleString('en-US')} ${cycles === 1 ? 'cycle' : 'cycles'} of doing nothing.`,
        ox, y + 6, { color: p.ink2, size: 11.5, max: W, maxLines: 3 });
      fit(y + 16);
    },
  });

  const upd = () => {
    const sel = KEY.indexOf(st.where);
    if (sel <= 2) setNote('<b>A cache hit is the normal case, and it is why a processor is fast at all.</b> Caches keep what was used recently and what sits next to it, on the bet that a program will want it again. That bet is right well over ninety percent of the time, which is the only reason a four gigahertz part is not idle for most of every microsecond.');
    else if (st.where === 'ram') setNote('<b>Eighty nanoseconds is roughly three hundred wasted cycles.</b> That is what a cache miss costs: the core has nothing to do until the memory answers. Everything a modern processor does that sounds exotic, out of order execution, prefetching, running two threads on one core, exists to find something useful to do during that wait.');
    else setNote('<b>Storage is a different kind of number.</b> An SSD is roughly six hundred times slower than RAM and a spinning disk is sixty thousand times slower again, which is why a media server holds its cue stack in RAM and why a video that stutters is almost never a processor problem. This is also the buffer argument from earlier in the class, seen from the other end.');
  };

  controls.append(
    choice('Step', STEPS.map((s, i) => [String(i), s]), { value: '0', on: (v) => { st.step = +v; upd(); } }).node,
    choice('It wants something from', TIERS.map(([n], i) => [KEY[i], n]), { value: 'l1', on: (v) => { st.where = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. One bit of RAM, which is one capacitor
// ============================================================================

register('ram-cell', (host) => {
  const st = { kind: 'dram', power: true, refresh: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'What one bit of memory physically is',
    sub: 'A gigabyte is eight billion of these. Two designs, and the difference between them is why cache is small and fast and RAM is large and slow.',
    note: '&nbsp;',
  });

  let charge = 1, sinceRefresh = 0;

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const dram = st.kind === 'dram';

      if (!st.power) charge = Math.max(0, charge - dt * 2.2);
      else if (dram) {
        // DRAM leaks. JEDEC says every row must be refreshed inside 64 ms; this
        // is that, slowed by a factor of about a thousand so it can be watched.
        sinceRefresh += dt;
        charge = Math.max(0, charge - dt * 0.42);
        if (st.refresh && sinceRefresh > 1.6) { sinceRefresh = 0; charge = 1; }
      } else charge = 1;

      // The cell.
      const cx = ox + W * 0.28, cy = 96;
      label(g, dram ? 'DRAM cell: one transistor, one capacitor' : 'SRAM cell: six transistors, latched',
        ox, 22, { color: p.ink2, size: 12, weight: 650, max: W });

      if (dram) {
        line(g, cx - 70, cy - 40, cx + 70, cy - 40, { color: p.line, lw: 2 });
        label(g, 'word line', cx - 70, cy - 50, { color: p.muted, size: 10, max: 120, ...mono });
        line(g, cx + 70, cy - 40, cx + 70, cy + 46, { color: p.line, lw: 2 });
        label(g, 'bit line', cx + 76, cy + 20, { color: p.muted, size: 10, max: 90, ...mono });
        box(g, cx - 14, cy - 22, 28, 22, { fill: alpha(p.muted, 0.2), stroke: p.muted, r: 3 });
        label(g, 'T', cx, cy - 11, { color: p.muted, size: 11, align: 'center', max: 24, ...mono });
        // The capacitor, filled to whatever charge is left in it.
        line(g, cx - 26, cy + 14, cx + 26, cy + 14, { color: p.line, lw: 3 });
        line(g, cx - 26, cy + 26, cx + 26, cy + 26, { color: p.line, lw: 3 });
        const col = charge > 0.55 ? p.green : charge > 0.2 ? p.amber : p.red;
        box(g, cx - 24, cy + 16, 48 * charge, 8, { fill: alpha(col, 0.8), stroke: 'transparent', r: 1 });
        label(g, 'C', cx + 36, cy + 20, { color: p.muted, size: 11, max: 24, ...mono });
      } else {
        for (const [dx, lbl] of [[-34, 'Q'], [34, 'Q̅']]) {
          box(g, cx + dx - 22, cy - 22, 44, 44, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 5 });
          label(g, lbl, cx + dx, cy, { color: p.cyan, size: 13, weight: 700, align: 'center', max: 40, ...mono });
        }
        line(g, cx - 12, cy - 8, cx + 12, cy + 8, { color: alpha(p.cyan, 0.8), lw: 1.5 });
        line(g, cx - 12, cy + 8, cx + 12, cy - 8, { color: alpha(p.cyan, 0.8), lw: 1.5 });
        label(g, 'each side holds the other one up', cx - 70, cy + 40, { color: p.muted, size: 10, max: 200 });
      }

      // What the cell currently reads as.
      const rx = ox + W * 0.62;
      const val = charge > 0.5 ? 1 : 0;
      label(g, 'reads as', rx, cy - 34, { color: p.muted, size: 11, max: W - (rx - ox) });
      label(g, st.power || !dram ? String(val) : (charge > 0.5 ? '1' : '?'), rx, cy,
        { color: charge > 0.5 ? p.green : p.red, size: 46, weight: 700, max: 90, ...mono });
      if (dram) {
        label(g, `charge ${(charge * 100).toFixed(0)} %`, rx, cy + 34, { color: p.muted, size: 11, max: 140, ...mono });
      }

      let y = 168;
      const rows = dram
        ? [['one transistor and one capacitor per bit, so a lot fits in a small die', p.ink2],
          ['the charge leaks, so every row is read and written back inside 64 ms, forever', p.amber],
          ['reading discharges the capacitor, so a read is followed by a write back', p.muted],
          ['cut the power and the charge is gone in a fraction of a second', p.red]]
        : [['six transistors per bit, so it costs about six times the area', p.ink2],
          ['nothing leaks: the two halves hold each other, so no refresh is needed', p.green],
          ['reading does not disturb it, and it answers in about one nanosecond', p.muted],
          ['still volatile: cut the power and the latch has nothing to hold', p.red]];
      for (const [txt, col] of rows) {
        y += labelWrap(g, txt, ox, y, { color: col, size: 11.5, max: W, maxLines: 2 }) + 5;
      }
      fit(y + 12);
    },
  });

  const upd = () => {
    if (!st.power) setNote('<b>This is what volatile means, and it is not a metaphor.</b> The one was a charge on a capacitor and the charge is now gone. Nothing was deleted and nothing failed; there is simply no longer anything there to read. Every unsaved cue, every loaded show file and every frame in the buffer lives exactly like this, which is the entire argument for a UPS on a show machine.');
    else if (st.kind === 'sram') setNote('<b>Cache is a different circuit, not faster RAM.</b> Six transistors arranged so each half holds the other one up: nothing leaks, nothing needs refreshing, and it answers in about a nanosecond. It also takes roughly six times the area per bit, which is why your processor has 48 KB of L1 and 32 GB of RAM rather than the other way round.');
    else if (!st.refresh) setNote('<b>Refresh off, and the row is decaying in front of you.</b> A DRAM bit is a charge on a capacitor about thirty femtofarads across, and it leaks. The memory controller reads and rewrites every row inside 64 milliseconds of the last time, forever, whenever the machine is on. That housekeeping is invisible and it is a real part of why memory latency is what it is.');
    else setNote('<b>One transistor and one capacitor. That is a bit of RAM.</b> The transistor is a gate onto the bit line and the capacitor is the bit: charged is a one, empty is a zero. Simple enough to build eight billion of on a die, leaky enough that the whole array has to be read and rewritten sixteen times a second just to stand still.');
  };

  controls.append(
    choice('Cell', [['dram', 'DRAM, main memory'], ['sram', 'SRAM, cache']], { value: 'dram', on: (v) => { st.kind = v; charge = 1; upd(); } }).node,
    toggle('Refresh running', { value: true, on: (v) => { st.refresh = v; upd(); } }).node,
    toggle('Power on', { value: true, on: (v) => { st.power = v; if (v) charge = 1; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 3. The arithmetic unit, doing the only thing it can do
// ============================================================================

register('alu-add', (host) => {
  const st = { a: 22, b: 13, bits: 6, op: 'add' };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a processor adds 10110 to 01101',
    sub: 'One column at a time, right to left, carrying. It is the addition you were taught at seven, in a base with two digits, built out of switches.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const N = st.bits;
      const mask = (1 << N) - 1;
      const a = st.a & mask, b = st.b & mask;
      const raw = st.op === 'add' ? a + b : st.op === 'and' ? (a & b) : st.op === 'or' ? (a | b) : (a ^ b);
      const res = raw & mask;
      const overflow = st.op === 'add' && raw > mask;

      // Column widths from the digits themselves, so the grid always fits.
      const cw = Math.min(34, (W - 92) / (N + 1));
      const gx = ox + 92;
      const digit = (v, i, y, col, weight = 600) =>
        label(g, String(v), gx + (N - i) * cw + cw / 2, y, { color: col, size: Math.min(17, cw * 0.55), weight, align: 'center', max: cw, ...mono });

      // Carries, worked out column by column exactly as the hardware does.
      const carries = [];
      let c = 0;
      for (let i = 0; i < N; i++) {
        const ab = (a >> i) & 1, bb = (b >> i) & 1;
        carries[i] = c;
        c = st.op === 'add' ? ((ab + bb + c) > 1 ? 1 : 0) : 0;
      }

      let y = 30;
      if (st.op === 'add') {
        label(g, 'carry', ox, y, { color: p.amber, size: 11, max: 84, ...mono });
        for (let i = 0; i < N; i++) if (carries[i]) digit(1, i + 1, y, p.amber, 700);
        y += 24;
      }
      label(g, `${a}`, ox, y, { color: p.cyan, size: 11.5, max: 84, ...mono });
      for (let i = 0; i < N; i++) digit((a >> i) & 1, i, y, p.cyan);
      y += 24;
      label(g, `${st.op === 'add' ? '+' : st.op.toUpperCase()} ${b}`, ox, y, { color: p.green, size: 11.5, max: 84, ...mono });
      for (let i = 0; i < N; i++) digit((b >> i) & 1, i, y, p.green);
      y += 12;
      line(g, gx, y, gx + (N + 1) * cw, y, { color: p.line, lw: 1.5 });
      y += 16;
      label(g, `= ${res}`, ox, y, { color: p.ink, size: 12, weight: 700, max: 84, ...mono });
      for (let i = 0; i < N; i++) digit((res >> i) & 1, i, y, p.ink, 700);
      if (overflow) digit(1, N, y, p.red, 700);
      y += 26;

      if (overflow) {
        label(g, `${a} + ${b} = ${raw}, which does not fit in ${N} bits. The carry off the end is dropped and the answer wraps to ${res}.`,
          ox, y + 6, { color: p.red, size: 11.5, max: W });
        y += 22;
      }

      // What one column of that is, in gates.
      y += 10;
      label(g, 'one column, in switches', ox, y, { color: p.muted, size: 11, max: W });
      y += 18;
      const gateW = Math.min(150, (W - 20) / 3);
      const GATES = st.op === 'add'
        ? [['XOR', 'a and b differ', 'gives the digit'], ['AND', 'a and b both 1', 'gives the carry'], ['OR', 'either carry', 'joins them up']]
        : [[st.op.toUpperCase(), 'compare the two bits', 'no carry, no columns talk to each other'], ['', '', ''], ['', '', '']];
      GATES.filter(([n]) => n).forEach(([name, what, does], i) => {
        const x = ox + i * (gateW + 10);
        box(g, x, y, gateW, 46, { fill: alpha(p.raised, 0.6), stroke: p.line, r: 6 });
        label(g, name, x + 10, y + 15, { color: p.amber, size: 11.5, weight: 700, max: gateW - 20, ...mono });
        label(g, what, x + 10, y + 30, { color: p.muted, size: 9.5, max: gateW - 20 });
        label(g, does, x + 10, y + 41, { color: p.muted, size: 9.5, max: gateW - 20 });
      });
      y += 58;
      y += labelWrap(g, st.op === 'add'
        ? 'A processor has no idea what a number is. It has switches wired so that this pattern of ones and zeros produces that one, and it does it for every column at once. Subtract, multiply and compare are all built from this same block.'
        : 'A logic operation has no carry at all: each column is decided entirely by its own two bits, which is why masks and flags are cheap and why a subnet mask works the way it does.',
      ox, y, { color: p.ink2, size: 11.5, max: W, maxLines: 4 });
      fit(y + 14);
    },
  });

  const upd = () => {
    const mask = (1 << st.bits) - 1;
    const raw = st.a + st.b;
    if (st.op === 'add' && raw > mask) setNote(`<b>${st.a} + ${st.b} = ${raw}, and ${st.bits} bits cannot hold it.</b> The carry off the top has nowhere to go, so it is dropped and the answer comes out as ${raw & mask}. Nothing reports this: the hardware sets a flag and it is the program's job to look. It is the same failure as a DMX value above 255 and the same one behind every timecode that rolls over at midnight.`);
    else if (st.op !== 'add') setNote(`<b>AND, OR and XOR have no carry.</b> Each column is decided by its own two bits and nothing travels sideways, which is why they are the cheapest thing a processor does. AND with a mask is exactly how a subnet mask picks the network part out of an address, and it is why the nine mask values are the nine values they are.`);
    else setNote('<b>Right to left, one column at a time, carrying.</b> Two bits and a carry in go to a small circuit that produces one bit and a carry out; string as many of those together as you have bits and you have an adder. Everything else, subtraction, multiplication, comparing two numbers, is built out of that one block, which is why a processor is fundamentally a very fast machine for adding.');
  };

  controls.append(
    slider('First number', { min: 0, max: 63, step: 1, value: 22, fmt: (v) => `${v} = ${bin(v, 6)}`, on: (v) => { st.a = v; upd(); } }).node,
    slider('Second number', { min: 0, max: 63, step: 1, value: 13, fmt: (v) => `${v} = ${bin(v, 6)}`, on: (v) => { st.b = v; upd(); } }).node,
    choice('Operation', [['add', 'Add'], ['and', 'AND'], ['or', 'OR'], ['xor', 'XOR']], { value: 'add', on: (v) => { st.op = v; upd(); } }).node,
    choice('Width', [['4', '4 bit'], ['6', '6 bit'], ['8', '8 bit']], { value: '6', on: (v) => { st.bits = +v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 4. Three kinds of processor, one job each
// ============================================================================

register('cpu-gpu-npu', (host) => {
  const JOBS = {
    cue: { label: 'Run a cue stack', desc: 'One thing after another, each depending on the last, with decisions in between.' },
    pixels: { label: 'Shade 2 million pixels', desc: 'The same short calculation on every pixel, none of them depending on each other.' },
    matrix: { label: 'Key a person out of a plate', desc: 'Multiply and add, millions of times, at low precision, in a fixed pattern.' },
  };
  const st = { job: 'cue' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why a graphics card is not just a faster processor',
    sub: 'Three chips in the same machine, built for three different shapes of work. Give each of them the same job and watch which one is embarrassed.',
    note: '&nbsp;',
  });

  // Rough, honest relative throughput for each shape of work. The bars are a
  // teaching aid, not a benchmark, and the figure says so.
  const FIT = {
    cue: { cpu: 1, gpu: 0.04, npu: 0.02 },
    pixels: { cpu: 0.02, gpu: 1, npu: 0.05 },
    matrix: { cpu: 0.01, gpu: 0.55, npu: 1 },
  };
  const UNITS = [
    ['cpu', 'CPU', 'cyan', '8 to 16 big cores', 'branch prediction, big caches, out of order', 'built to finish one thing quickly'],
    ['gpu', 'GPU', 'amber', 'thousands of narrow lanes', 'all running the same instruction on different data', 'built to finish a million things at once'],
    ['npu', 'NPU', 'green', 'a grid of multiply and add', 'fixed pattern, low precision, very little else', 'built to do one kind of arithmetic per watt'],
  ];

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(660, w - 24), ox = (w - W) / 2;
      const stacked = W < 470;
      const colW = stacked ? W : (W - 20) / 3;

      let maxY = 0;
      UNITS.forEach(([k, name, colName, cores, how, why], i) => {
        const col = p[colName];
        const x = stacked ? ox : ox + i * (colW + 10);
        const y0 = stacked ? 22 + i * 116 : 22;
        const fitv = FIT[st.job][k];

        box(g, x, y0, colW, 96, { fill: alpha(col, fitv > 0.5 ? 0.14 : 0.05), stroke: fitv > 0.5 ? col : p.line, r: 8, lw: fitv > 0.5 ? 2 : 1 });
        label(g, name, x + 12, y0 + 18, { color: col, size: 14, weight: 700, max: colW - 24 });
        label(g, cores, x + 12, y0 + 34, { color: p.muted, size: 10, max: colW - 24 });

        // The cores themselves, drawn to scale in number rather than in size.
        const gy = y0 + 44;
        if (k === 'cpu') {
          for (let c = 0; c < 8; c++) {
            const cx = x + 12 + (c % 4) * ((colW - 30) / 4), cy = gy + Math.floor(c / 4) * 15;
            box(g, cx, cy, (colW - 34) / 4, 12, { fill: alpha(col, 0.5), stroke: col, r: 2, lw: 0.8 });
          }
        } else if (k === 'gpu') {
          const per = 26;
          for (let c = 0; c < per * 3; c++) {
            const cx = x + 11 + (c % per) * ((colW - 22) / per), cy = gy + Math.floor(c / per) * 9;
            g.fillStyle = alpha(col, 0.55);
            g.fillRect(cx, cy, Math.max(1.5, (colW - 26) / per - 1), 6);
          }
        } else {
          for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
            const cx = x + 12 + c * ((colW - 26) / 12), cy = gy + r * 7;
            g.fillStyle = alpha(col, ((Math.sin(t * 2 + c * 0.5 + r) * 0.5 + 0.5) * 0.5 + 0.3));
            g.fillRect(cx, cy, Math.max(1.5, (colW - 30) / 12 - 1), 5);
          }
        }
        maxY = Math.max(maxY, y0 + 96);
      });

      let y = maxY + 16;
      label(g, `Given: ${JOBS[st.job].label.toLowerCase()}`, ox, y, { color: p.ink, size: 12.5, weight: 650, max: W });
      y += 16;
      y += labelWrap(g, JOBS[st.job].desc, ox, y + 4, { color: p.muted, size: 11, max: W, maxLines: 2 }) + 8;

      const nameW = 46, barX = ox + nameW, barW = W - nameW - 60;
      UNITS.forEach(([k, name, colName], i) => {
        const ry = y + i * 22;
        const fv = FIT[st.job][k];
        label(g, name, ox, ry + 8, { color: p[colName], size: 11, weight: 600, max: nameW - 6, ...mono });
        box(g, barX, ry + 2, Math.max(2, fv * barW), 13, { fill: alpha(p[colName], 0.55), stroke: p[colName], r: 2, lw: 1 });
        label(g, fv >= 0.9 ? 'right tool' : fv >= 0.3 ? 'workable' : 'wrong shape', barX + barW + 8, ry + 8,
          { color: fv >= 0.9 ? p.ink : p.muted, size: 10, max: 58 });
      });
      y += UNITS.length * 22 + 6;
      y += labelWrap(g, 'Relative fit, not a benchmark: the point is the shape of the work, not a number of frames per second.',
        ox, y, { color: p.muted, size: 10, max: W, maxLines: 2 });
      fit(y + 14);
    },
  });

  const upd = () => {
    if (st.job === 'cue') setNote('<b>A cue stack is a chain of decisions, and a chain cannot be spread out.</b> Step two needs the answer from step one, so having ten thousand lanes available helps you not at all: what you want is one lane that is very fast and very good at guessing which way a branch will go. That is a CPU, and it is why show control software is not "accelerated" by a graphics card.');
    else if (st.job === 'pixels') setNote('<b>Two million pixels, none of which cares what the others are doing.</b> That is the shape a GPU was built for: thousands of narrow lanes all running the same instruction on different data at the same instant. A sixteen core CPU doing the same job runs sixteen at a time. This is the whole reason a media server has a graphics card in it.');
    else setNote('<b>An NPU is a grid of multipliers and almost nothing else.</b> Multiply, add, repeat, at eight bits instead of thirty two, in a fixed pattern with no branching. A GPU can do this and does it well; an NPU does only this and does it for a fraction of the power, which is why one is in the phone that keys your comfort feed and in cameras that upscale in real time.');
  };

  controls.append(
    choice('The job', Object.entries(JOBS).map(([k, v]) => [k, v.label]), { value: 'cue', on: (v) => { st.job = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. The four boxes, and what each one reads before deciding
// ============================================================================

register('box-roles', (host) => {
  const BOX = {
    hub: {
      label: 'Hub', layer: 'layer 1', col: 'red', era: 'gone by about 2005',
      reads: 'nothing at all',
      does: 'repeats every electrical signal out of every other port',
      collide: 'one collision domain for the whole box: two devices talking at once destroy each other',
      show: 'You will not meet one. It matters because a wireless access point behaves like this on the radio side.',
    },
    switch: {
      label: 'Switch', layer: 'layer 2', col: 'cyan', era: 'every show network',
      reads: 'the destination MAC address',
      does: 'forwards only to the port that address was last seen on, and floods if it has not seen it',
      collide: 'one collision domain per port, and every port full duplex',
      show: 'The box everything plugs into. Managed ones also read the VLAN tag, which is how departments get separated.',
    },
    router: {
      label: 'Router', layer: 'layer 3', col: 'amber', era: 'the edge of every network',
      reads: 'the destination IP address',
      does: 'chooses the next network, drops the old frame, builds a new one, takes one off the TTL',
      collide: 'each side is a separate broadcast domain, which is the point of it',
      show: 'On a show you often want no router at all: departments are meant to be isolated, and a router is a door.',
    },
    ap: {
      label: 'Access point', layer: 'layer 2', col: 'green', era: 'convenient and contended',
      reads: 'the destination MAC address, same as a switch',
      does: 'bridges the radio to the cable, one frame at a time, in one direction at a time',
      collide: 'every device on the channel shares the air, and only one may transmit at a time',
      show: 'A bridge with a hub bolted to the front of it. Fine for a tablet, wrong for anything with a deadline.',
    },
  };
  const st = { box: 'switch', msg: 'unicast' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Hub, switch, router, access point',
    sub: 'Four boxes with four ports each. Send the same frame into each of them and the difference is entirely in what the box reads before it decides.',
    note: '&nbsp;',
  });

  let pulse = 0, sending = false;

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const d = BOX[st.box];
      const col = p[d.col];
      if (sending) { pulse += dt * 0.85; if (pulse > 1) { pulse = 0; sending = false; } }

      // The box, with four devices around it.
      const cx = ox + W / 2, cy = 92;
      const bw = Math.min(160, W * 0.32);
      box(g, cx - bw / 2, cy - 26, bw, 52, { fill: alpha(col, 0.16), stroke: col, r: 8, lw: 2 });
      label(g, d.label.toUpperCase(), cx, cy - 6, { color: col, size: 12.5, weight: 700, align: 'center', max: bw - 10 });
      label(g, d.layer, cx, cy + 12, { color: p.muted, size: 10.5, align: 'center', max: bw - 10, ...mono });

      const PORTS = [
        { name: 'A', x: -1, y: -1 }, { name: 'B', x: 1, y: -1 },
        { name: 'C', x: -1, y: 1 }, { name: 'D', x: 1, y: 1 },
      ];
      const spread = Math.min(200, W * 0.36);
      PORTS.forEach((pt, i) => {
        const px = cx + pt.x * spread, py = cy + pt.y * 60;
        // Who receives this frame depends entirely on the box.
        const wanted = st.msg === 'broadcast' ? i !== 0
          : st.box === 'hub' || st.box === 'ap' ? i !== 0
            : st.msg === 'other-net' ? (st.box === 'router' && i === 3) : i === 2;
        const active = sending && wanted && pulse > 0.45;
        const wasted = active && !(st.msg === 'broadcast' || i === 2 || (st.msg === 'other-net' && i === 3));
        box(g, px - 34, py - 15, 68, 30, {
          fill: active ? alpha(wasted ? p.red : p.green, 0.2) : alpha(p.raised, 0.6),
          stroke: active ? (wasted ? p.red : p.green) : p.line, r: 6, lw: active ? 2 : 1,
        });
        label(g, i === 0 ? `${pt.name} sends` : pt.name, px, py, {
          color: active ? (wasted ? p.red : p.green) : p.ink2, size: 11, align: 'center', max: 62,
        });
        // The frame in flight.
        const from = i === 0;
        if (sending) {
          const u = from ? Math.min(1, pulse / 0.45) : clamp((pulse - 0.45) / 0.4, 0, 1);
          if (from || wanted) {
            const sx = from ? px : cx, sy = from ? py : cy;
            const ex = from ? cx : px, ey = from ? cy : py;
            const dotX = lerp(sx, ex, u), dotY = lerp(sy, ey, u);
            if (u > 0 && u < 1) {
              g.fillStyle = wasted ? p.red : from ? col : p.green;
              g.beginPath(); g.arc(dotX, dotY, 5, 0, TAU); g.fill();
            }
          }
        }
        line(g, px + (pt.x < 0 ? 34 : -34), py, cx + (pt.x < 0 ? -bw / 2 : bw / 2), cy + pt.y * 14,
          { color: alpha(p.line, 1), lw: 1.5 });
      });

      let y = 190;
      for (const [k, v] of [['reads', d.reads], ['then', d.does], ['collisions', d.collide]]) {
        label(g, k, ox, y + 6, { color: p.muted, size: 9.5, max: 74, ...mono });
        y += labelWrap(g, v, ox + 80, y + 6, { color: p.ink2, size: 11.5, max: W - 80, maxLines: 2 }) + 5;
      }
      y += 4;
      y += labelWrap(g, d.show, ox, y + 6, { color: p.muted, size: 11, max: W, maxLines: 3 });
      fit(y + 14);
    },
  });

  const upd = () => {
    const d = BOX[st.box];
    if (st.box === 'hub') setNote('<b>A hub reads nothing, because it cannot.</b> It is an electrical repeater: a signal arriving on one port is pushed out of all the others, so every device receives every frame and has to decide for itself whether to care. Two devices talking at once destroy both messages, and the whole box shares one collision domain. This is why hubs disappeared, and why an access point on a busy channel feels like 1998.');
    else if (st.box === 'switch') setNote('<b>A switch reads the destination MAC and sends the frame only there.</b> It learns which address is on which port by watching the source address of everything that passes, so it fills its table by doing its job. The first frame to an address it has never seen is flooded everywhere, and after that it is not, which is the entire difference between this and a hub.');
    else if (st.box === 'router') setNote('<b>A router reads the destination IP, and it is the only box here that opens the packet.</b> It decides which network to send it towards, throws the layer 2 frame away, builds a new one for the next wire, and takes one off the time to live. That is why the MAC addresses change at every hop and the IP addresses do not. On a show network you often want no router: a router is a door between departments that are meant to be separate.');
    else setNote('<b>An access point is a switch on one side and a hub on the other.</b> Towards the cable it is a bridge that reads MAC addresses. Towards the radio, everyone on the channel shares one medium and only one device may transmit at a time, so throughput is divided and latency is whatever the busiest neighbour leaves you. Fine for a tablet running a remote; wrong for anything with a deadline.');
  };

  controls.append(
    choice('Box', Object.entries(BOX).map(([k, v]) => [k, v.label]), { value: 'switch', on: (v) => { st.box = v; upd(); } }).node,
    choice('A sends', [['unicast', 'A frame for C'], ['broadcast', 'A broadcast'], ['other-net', 'Something off this network']],
      { value: 'unicast', on: (v) => { st.msg = v; upd(); } }).node,
    button('Send it', () => { sending = true; pulse = 0; }).node
  );
  upd();
});

// ============================================================================
// 6. From the socket in the wall to a machine on the other side of the world
// ============================================================================

register('home-to-world', (host) => {
  const HOPS = [
    ['Your laptop', '192.168.1.20', 'A private address. Millions of houses use this exact one, which is why it cannot be routed on the public internet.'],
    ['Your router', '192.168.1.1 → 203.0.113.7', 'It swaps your private address for the one public address the ISP gave you, and writes down which port belonged to whom.'],
    ['The ISP', '203.0.113.7', 'The first network that is not yours. From here on, every hop is somebody else deciding which way is closer.'],
    ['The internet', 'a dozen or so hops', 'Nobody is steering. Each router looks at the destination, picks the next one, takes one off the time to live, and forgets about it.'],
    ['The far end', '198.51.100.42', 'Which knows nothing about your laptop. As far as it is concerned it is talking to 203.0.113.7 on a particular port.'],
  ];
  const st = { hop: 0, dir: 'out' };
  const { controls, stage, setNote } = figure(host, {
    title: 'What happens when you ask for something on the internet',
    sub: 'The same journey a show file download, a licence check or a remote camera feed makes. The interesting part is how the answer finds its way back.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(660, w - 24), ox = (w - W) / 2;
      const stacked = W < 520;
      const out = st.dir === 'out';

      // The chain of hops.
      let y = 24;
      if (stacked) {
        HOPS.forEach(([name, addr], i) => {
          const on = i === st.hop;
          const ry = y + i * 40;
          box(g, ox, ry, W, 34, { fill: on ? alpha(p.cyan, 0.14) : alpha(p.raised, 0.5), stroke: on ? p.cyan : p.line, r: 6, lw: on ? 2 : 1 });
          label(g, name, ox + 10, ry + 12, { color: on ? p.cyan : p.ink2, size: 11.5, weight: on ? 700 : 600, max: W * 0.5 });
          label(g, addr, ox + W - 10, ry + 12, { color: p.muted, size: 10, align: 'right', max: W * 0.45, ...mono });
          label(g, out ? '↓' : '↑', ox + 10, ry + 26, { color: p.muted, size: 10, max: 20 });
        });
        y += HOPS.length * 40 + 6;
      } else {
        const gap = 8;
        const bw = (W - gap * (HOPS.length - 1)) / HOPS.length;
        HOPS.forEach(([name, addr], i) => {
          const x = ox + i * (bw + gap), on = i === st.hop;
          box(g, x, y, bw, 56, { fill: on ? alpha(p.cyan, 0.14) : alpha(p.raised, 0.5), stroke: on ? p.cyan : p.line, r: 6, lw: on ? 2 : 1 });
          labelWrap(g, name, x + bw / 2, y + 15, { color: on ? p.cyan : p.ink2, size: 10.5, align: 'center', max: bw - 8, maxLines: 2 });
          labelWrap(g, addr, x + bw / 2, y + 40, { color: p.muted, size: 9, align: 'center', max: bw - 6, maxLines: 2, ...mono });
          if (i < HOPS.length - 1) {
            const ax = x + bw, mid = y + 28;
            line(g, ax, mid, ax + gap, mid, { color: alpha(p.cyan, 0.6), lw: 1.6 });
          }
        });
        y += 66;
      }

      // The one table that makes the return journey possible.
      label(g, 'the table in your router', ox, y + 8, { color: p.amber, size: 11.5, weight: 650, max: W });
      y += 20;
      const cols = ['inside', 'outside', 'came back to'];
      const rows = [['192.168.1.20:51820', '203.0.113.7:51820', out ? 'not yet' : '192.168.1.20:51820']];
      const cw = (W - 8) / 3;
      cols.forEach((c, i) => label(g, c, ox + i * cw, y + 8, { color: p.muted, size: 9.5, max: cw - 8, ...mono }));
      y += 16;
      rows.forEach((r) => {
        r.forEach((v, i) => label(g, v, ox + i * cw, y + 8,
          { color: i === 2 && !out ? p.green : p.ink2, size: 10.5, max: cw - 8, ...mono }));
        y += 20;
      });

      y += 8;
      y += labelWrap(g, HOPS[st.hop][2], ox, y + 6, { color: p.ink2, size: 11.5, max: W, maxLines: 3 }) + 8;
      y += labelWrap(g, out
        ? 'On the way out the router rewrites the source address and remembers what it did. That note is the only reason the reply can find you.'
        : 'On the way back the far end sends to 203.0.113.7 and the router looks the port up in that table, rewrites the destination and hands it to the right machine. Without the note, the reply arrives at your building addressed to nobody.',
      ox, y, { color: p.muted, size: 11, max: W, maxLines: 3 });
      fit(y + 16);
    },
  });

  const upd = () => {
    if (st.hop === 1) setNote('<b>This is the box doing the interesting thing.</b> Your laptop has a private address that means nothing outside your building, so the router swaps it for the one public address the ISP gave you and writes down which port it used for you. Everything in the house shares that address, and the port number is what tells the replies apart. It is also why an incoming connection needs a rule: there is no note yet, so the router does not know who to give it to.');
    else if (st.hop === 3) setNote('<b>Nobody is steering.</b> There is no route planned at the start and no path held open. Each router looks at the destination, decides which of its neighbours is closer, takes one off the time to live and forgets the packet exists. Two packets in the same conversation can take different paths, arrive out of order and take different times, which is why the numbers in Class 5 are about variation rather than distance.');
    else if (st.dir === 'back') setNote('<b>The reply is addressed to the building, not to you.</b> The far end knows only the public address and a port number. Your router looks that pair up in the table it wrote on the way out, replaces the destination with your private address and puts it on the local wire. That table is the whole mechanism, and it is why a router restart drops every connection through it at once.');
    else setNote('<b>A private address, a public one, and a note connecting them.</b> That is the whole of what happens when something in your building talks to something outside it. On a show network the same idea appears as a deliberate choice: departments get private ranges that cannot leave, and only the things that need the outside world get a path to it.');
  };

  controls.append(
    choice('Look at', HOPS.map(([n], i) => [String(i), n]), { value: '0', on: (v) => { st.hop = +v; upd(); } }).node,
    choice('Direction', [['out', 'Going out'], ['back', 'Coming back']], { value: 'out', on: (v) => { st.dir = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 7. A character is not a byte
// ============================================================================

register('char-encode', (host) => {
  const SAMPLES = [
    { ch: 'A', name: 'Latin capital A', cp: 0x41 },
    { ch: '7', name: 'digit seven', cp: 0x37 },
    { ch: '£', name: 'pound sign', cp: 0xA3 },
    { ch: '光', name: 'light', cp: 0x5149 },
    { ch: '劇', name: 'drama', cp: 0x5287 },
    { ch: '😀', name: 'grinning face', cp: 0x1F600 },
  ];
  const st = { i: 0, enc: 'utf8' };
  const { controls, stage, setNote } = figure(host, {
    title: 'What a character actually is, in bytes',
    sub: 'A file holds bytes. A character is an agreement about which bytes mean which shape, and there have been several of those agreements.',
    note: '&nbsp;',
  });

  // UTF-8 is defined by the code point, so encode it rather than tabulate it.
  const utf8 = (cp) => {
    if (cp < 0x80) return [cp];
    if (cp < 0x800) return [0xC0 | (cp >> 6), 0x80 | (cp & 63)];
    if (cp < 0x10000) return [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    return [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
  };
  const bytesFor = (cp) => {
    if (st.enc === 'ascii') return cp < 0x80 ? [cp] : null;
    if (st.enc === 'latin1') return cp < 0x100 ? [cp] : null;
    if (st.enc === 'utf16') {
      if (cp < 0x10000) return [cp >> 8, cp & 255];
      const v = cp - 0x10000;
      const hi = 0xD800 + (v >> 10), lo = 0xDC00 + (v & 0x3FF);
      return [hi >> 8, hi & 255, lo >> 8, lo & 255];
    }
    return utf8(cp);
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const s = SAMPLES[st.i];
      const bytes = bytesFor(s.cp);

      // The character itself, then the number everyone agrees on.
      label(g, s.ch, ox, 58, { color: p.ink, size: 46, weight: 650, max: 90 });
      const nx = ox + 96;
      label(g, s.name, nx, 30, { color: p.muted, size: 11, max: W - 100 });
      label(g, `U+${s.cp.toString(16).toUpperCase().padStart(4, '0')}`, nx, 52,
        { color: p.cyan, size: 17, weight: 700, max: W - 100, ...mono });
      label(g, `code point ${s.cp.toLocaleString('en-US')}, the same in every encoding`, nx, 72,
        { color: p.muted, size: 10.5, max: W - 100 });

      let y = 104;
      label(g, `as ${st.enc === 'utf8' ? 'UTF-8' : st.enc === 'utf16' ? 'UTF-16' : st.enc === 'ascii' ? 'ASCII' : 'Latin-1'}`,
        ox, y, { color: p.ink2, size: 12, weight: 650, max: W });
      y += 18;

      if (!bytes) {
        box(g, ox, y, W, 44, { fill: alpha(p.red, 0.12), stroke: p.red, r: 6 });
        labelWrap(g, `${st.enc === 'ascii' ? 'ASCII has 128 characters and stops.' : 'Latin-1 has 256 and stops.'} There is no byte for this one, so it is dropped, or replaced with a question mark, or turned into mojibake. This is the whole reason UTF-8 exists.`,
          ox + 10, y + 15, { color: p.red, size: 11.5, max: W - 20, maxLines: 2 });
        y += 54;
      } else {
        const bw = Math.min(78, (W - (bytes.length - 1) * 8) / bytes.length);
        bytes.forEach((b, i) => {
          const x = ox + i * (bw + 8);
          box(g, x, y, bw, 58, { fill: alpha(p.amber, 0.12), stroke: p.amber, r: 6 });
          label(g, b.toString(16).toUpperCase().padStart(2, '0'), x + bw / 2, y + 17,
            { color: p.amber, size: 15, weight: 700, align: 'center', max: bw - 6, ...mono });
          label(g, bin(b, 8), x + bw / 2, y + 35, { color: p.muted, size: 9, align: 'center', max: bw - 4, ...mono });
          label(g, `byte ${i + 1}`, x + bw / 2, y + 49, { color: p.muted, size: 8.5, align: 'center', max: bw - 4 });
        });
        y += 68;
        label(g, `${bytes.length} ${bytes.length === 1 ? 'byte' : 'bytes'} for one character`,
          ox, y, { color: p.ink2, size: 11.5, weight: 600, max: W });
        y += 20;
      }

      const notes = {
        utf8: 'The leading bits say how many bytes to expect: 0 for one, 110 for two, 1110 for three, 11110 for four. Every continuation byte starts 10, so a reader that lands in the middle of a character can tell and step back.',
        utf16: 'Two bytes for most things, four for the rest, and a byte order to agree on. Windows and Java grew up on this, which is why a file written on one machine sometimes opens as Chinese-looking nonsense on another.',
        ascii: 'Seven bits, 128 characters, 1963. English, digits and punctuation, and nothing else. Still the foundation: every UTF-8 file that happens to be pure English is also a valid ASCII file.',
        latin1: 'Eight bits, 256 characters. Enough for Western European accents, not enough for anything else, and the source of most of the mojibake you have seen.',
      };
      y += labelWrap(g, notes[st.enc], ox, y, { color: p.muted, size: 11, max: W, maxLines: 4 });
      fit(y + 14);
    },
  });

  const upd = () => {
    const s = SAMPLES[st.i];
    const bytes = bytesFor(s.cp);
    if (!bytes) setNote(`<b>${s.ch} cannot be written in this encoding at all.</b> There simply is no byte for it, so something has to give: the character is dropped, replaced, or written as bytes that mean something else entirely. If you have ever seen a 繁中 filename arrive as boxes or as accented Latin gibberish, this is what happened to it.`);
    else if (st.enc === 'utf8' && bytes.length >= 3) setNote(`<b>${bytes.length} bytes for one character.</b> This matters practically: a filename in 繁中 is about three times the bytes of the same length in English, a fixed-width field that allows 32 characters may only hold 10 of them, and a console that assumes one byte is one character will cut a character in half and print a broken one. Count characters, never bytes, unless bytes is what you actually mean.`);
    else setNote('<b>A code point is the agreement; an encoding is the packing.</b> U+5149 is 光 to every piece of software on earth, and always has been. What differs is how that number is written down as bytes, and the entire history of text going wrong is the history of a file being read with a different agreement than it was written with.');
  };

  controls.append(
    choice('Character', SAMPLES.map((s, i) => [String(i), s.ch]), { value: '0', on: (v) => { st.i = +v; upd(); } }).node,
    choice('Encoding', [['utf8', 'UTF-8'], ['utf16', 'UTF-16'], ['ascii', 'ASCII'], ['latin1', 'Latin-1']], { value: 'utf8', on: (v) => { st.enc = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 8. Address bits, and the wall a 32 bit machine walks into
// ============================================================================

register('address-bits', (host) => {
  const st = { bits: 32, installed: 16 };            // installed RAM in GiB
  const { controls, stage, setNote } = figure(host, {
    title: 'What "64 bit" is actually counting',
    sub: 'Not speed. The width of a memory address, which decides how many different places the machine is able to name at all.',
    note: '&nbsp;',
  });

  // 2^64 is far past what a JavaScript number holds exactly, so the size is
  // formatted from the exponent rather than from the value: 2^n is 2^(n mod 10)
  // of the unit at floor(n/10). Exact at every width, and it is also how a
  // person reads it.
  const UNITS = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
  const size = (n) => {
    const u = Math.min(UNITS.length - 1, Math.floor(n / 10));
    return { n: 2 ** (n - u * 10), unit: UNITS[u] };
  };
  const fmt = (n) => { const s = size(n); return `${s.n.toLocaleString()} ${s.unit}`; };

  // A frame of 1080p held uncompressed, four bytes a pixel, which is what a
  // server actually has in memory once it has decoded one.
  const FRAME = 1920 * 1080 * 4;
  const LANDMARK = [
    [16, 'a home computer, 1982'],
    [32, 'the 4 GiB wall'],
    [48, 'what x86-64 really implements'],
    [64, 'the pointer width'],
  ];

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 340,
    animated: false,
    controls,
    draw(g, w) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const narrow = W < 470;

      // --- the address itself, one box per bit -------------------------------
      let y = 30;
      label(g, 'ONE ADDRESS, BIT BY BIT', ox, y - 12, { color: p.muted, size: 10, weight: 700, max: W });
      const per = Math.min(64, st.bits);
      const bw = (W - (per - 1) * 1.5) / per;
      for (let i = 0; i < per; i++) {
        box(g, ox + i * (bw + 1.5), y, bw, 18, {
          fill: alpha(i < 32 ? p.cyan : p.green, 0.35),
          stroke: i < 32 ? p.cyan : p.green, r: 1.5, lw: 0.8,
        });
      }
      label(g, `${st.bits} bits`, ox, y + 32, { color: p.ink, size: 12, weight: 700, max: W * 0.4, ...mono });
      label(g, `2^${st.bits} = ${fmt(st.bits)} of addressable space`, ox + W, y + 32,
        { color: p.amber, size: 12, weight: 700, align: 'right', max: W * 0.58, ...mono });

      // --- where that sits, on a scale where each bit is a doubling ----------
      y += 62;
      const sh = 26;
      box(g, ox, y, W, sh, { fill: alpha(p.line, 0.4), stroke: p.line, r: 4, lw: 1 });
      const bx = (b) => ox + ((b - 16) / 48) * W;
      box(g, ox, y, Math.max(2, bx(st.bits) - ox), sh, { fill: alpha(p.amber, 0.3), stroke: 'transparent', r: 4 });
      for (const [b, txt] of LANDMARK) {
        line(g, bx(b), y - 4, bx(b), y + sh + 4, { color: alpha(p.muted, 0.6), lw: 1, dash: [3, 3] });
        if (!narrow || b === 32 || b === 64) {
          label(g, txt, clamp(bx(b), ox + 40, ox + W - 40), y + sh + 16,
            { color: b === st.bits ? p.amber : p.muted, size: 9.5, align: 'center', max: W * 0.34 });
        }
        label(g, `${b}`, bx(b), y - 12, { color: p.muted, size: 9.5, align: 'center', max: 30, ...mono });
      }

      // --- and what it means for a machine you would actually buy ------------
      y += sh + 44;
      const rows = [];
      const addressable = st.bits >= 63 ? Infinity : 2 ** st.bits;
      const installed = st.installed * 2 ** 30;
      const reachable = Math.min(addressable, installed);
      rows.push(['RAM in the machine', `${st.installed} GiB`, p.ink2]);
      rows.push(['one process can name', st.bits >= 64 ? 'more than you can fit' : fmt(st.bits),
        addressable < installed ? p.red : p.green]);
      rows.push(['so it can reach', `${(reachable / 2 ** 30).toFixed(reachable < 2 ** 30 ? 3 : 0)} GiB`,
        addressable < installed ? p.red : p.green]);
      rows.push(['1080p frames held decoded', `${Math.floor(reachable / FRAME).toLocaleString()}`, p.amber]);
      rows.push(['which is, at 25 fps', `${(Math.floor(reachable / FRAME) / 25).toFixed(1)} seconds`, p.amber]);
      rows.forEach(([k, v, tone], i) => {
        const ry = y + i * 22;
        label(g, k, ox, ry, { color: p.muted, size: 11.5, max: W * 0.56 });
        label(g, v, ox + W, ry, { color: tone, size: 11.5, weight: 650, align: 'right', max: W * 0.42, ...mono });
      });

      const capY = y + rows.length * 22 + 8;
      const capH = labelWrap(g, addressable < installed
        ? `The RAM is in the machine and the process cannot name it. Adding more changes nothing.`
        : `Every byte in the machine has an address this process can form.`,
        ox, capY, { color: addressable < installed ? p.red : p.ink, size: 11.5, weight: 600, max: W, maxLines: 2 });
      fit(capY + capH + 10);
    },
  });

  const upd = () => {
    cv.once();
    const addressable = st.bits >= 63 ? Infinity : 2 ** st.bits;
    const installed = st.installed * 2 ** 30;
    if (st.bits === 32) setNote(`<b>Four gibibytes, and not one byte more.</b> 2³² addresses, one byte each, is 4 GiB, and that is the ceiling on what a single 32 bit process can name however much memory you bolt into the machine. Windows handed half of it to the kernel, so an application really had two. This is the whole reason media servers, samplers and plugin hosts moved, and it had nothing to do with speed.`);
    else if (st.bits < 32) setNote(`<b>${fmt(st.bits)}.</b> Each bit you take away halves it, which is why old machines ran out so abruptly: 16 bits names 64 KiB, and one uncompressed 1080p frame is ${(FRAME / 1024 ** 2).toFixed(1)} MiB. The frame is ${Math.round(FRAME / 2 ** st.bits).toLocaleString()} times larger than everything this machine can address.`);
    else if (st.bits === 48) setNote(`<b>This is what your machine actually does.</b> The pointer is 64 bits wide, but x86-64 implementations decode only 48 of them, giving 256 TiB. The top bits have to be a copy of bit 47 or the processor faults, which is called a canonical address. Newer parts extend it to 57 bits. Nobody has ever needed the other sixteen.`);
    else if (addressable > installed * 1024) setNote(`<b>The address space stopped being the constraint.</b> ${fmt(st.bits)} against ${st.installed} GiB of actual memory: the machine could name the RAM of every machine in the building and then some. What limits a 64 bit show machine is how much memory you bought and how fast it is, which are ordinary questions with ordinary answers.`);
    else setNote(`<b>${fmt(st.bits)} of addressable space, ${st.installed} GiB installed.</b> Above 32 bits the ceiling stops mattering and the practical limit goes back to being the memory itself. Note what widening the pointer costs: every pointer in every data structure is now twice the size, so pointer heavy code uses more memory and more cache lines at 64 bits than it did at 32. The address space is worth it. The speed was never the point.`);
  };

  controls.append(
    slider('Address width', { min: 16, max: 64, step: 1, value: 32, fmt: (v) => `${v} bit`, on: (v) => { st.bits = v; upd(); } }).node,
    slider('RAM installed', { min: 1, max: 256, step: 1, value: 16, fmt: (v) => `${v} GiB`, on: (v) => { st.installed = v; upd(); } }).node
  );
  upd();
});
