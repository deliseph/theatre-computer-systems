// Class 5: how a network clock actually synchronises, where the latency in a
// show system comes from, and what a single point of failure costs.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, labelWrap, wrapText, textWidth, drawnSize, line, alpha, clamp, lerp, fitter,
} from './anim-core.js';

const mono = { mono: true };

// ============================================================================
// 1. PTP: measuring the offset, and what an unaware switch does to it
// ============================================================================

register('ptp-sync', (host) => {
  const st = { asym: 0, aware: true, running: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a network clock actually agrees on the time',
    sub: 'Four messages. The whole of PTP is one subtraction, and one assumption that a cheap switch breaks.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const mx = ox + 70, sx = ox + W - 70;
      const top = 40, bot = 214;

      // Two timelines: the grandmaster and the follower.
      line(g, mx, top, mx, bot, { color: p.line, lw: 2 });
      line(g, sx, top, sx, bot, { color: p.line, lw: 2 });
      label(g, 'grandmaster', mx, top - 20, { color: p.green, size: 11.5, weight: 650, align: 'center' });
      label(g, 'follower', sx, top - 20, { color: p.cyan, size: 11.5, weight: 650, align: 'center' });

      const cyc = 5.2;
      const ph = st.running ? (t % cyc) / cyc : 0.999;

      // Path delay each way. The switch adds queueing that PTP cannot see
      // unless the switch itself is PTP aware and corrects for it.
      const base = 0.30;
      const jitterUp = st.aware ? 0 : 0.10 + 0.10 * Math.sin(t * 1.7);
      const down = base + st.asym * 0.5 + jitterUp;
      const up = base - st.asym * 0.5 + (st.aware ? 0 : 0.10 + 0.10 * Math.cos(t * 2.1));

      const msgs = [
        ['Sync', 0.06, 0.06 + down * 0.28, mx, sx, p.green, 't1 sent', 't2 received'],
        ['Follow_Up', 0.30, 0.30 + down * 0.20, mx, sx, alpha(p.green, 0.6), 'carries t1', ''],
        ['Delay_Req', 0.52, 0.52 + up * 0.28, sx, mx, p.cyan, 't3 sent', 't4 received'],
        ['Delay_Resp', 0.76, 0.76 + down * 0.20, mx, sx, alpha(p.cyan, 0.6), 'carries t4', ''],
      ];

      let y = top + 14;
      msgs.forEach(([name, a, b, from, to, col], i) => {
        const yy = top + 18 + i * 44;
        const done = ph >= b;
        const going = ph >= a && ph < b;
        const u = going ? (ph - a) / (b - a) : (done ? 1 : 0);
        // The whole flight path, faint.
        line(g, from, yy, to, yy + 22, { color: alpha(col, done ? 0.55 : 0.16), lw: 1.6 });
        if (going || done) {
          const px = lerp(from, to, u), py = lerp(yy, yy + 22, u);
          g.fillStyle = col; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill();
        }
        label(g, name, (mx + sx) / 2, yy - 4, { color: done || going ? p.ink2 : p.muted, size: 11, align: 'center', ...mono });
      });

      // The arithmetic, which is the entire point.
      const measured = (down + up) / 2;
      const err = (down - up) / 2;
      let ry = bot + 24;
      const formula = 'path delay  =  ((t2 − t1) + (t4 − t3)) ÷ 2';
      const caveat = 'assumes the two directions take the same time';
      // The caveat sat beside the formula at a hard 320px, which on a phone put
      // it past the right edge of the picture entirely. It takes its own line
      // whenever the two do not fit on one.
      const fw = textWidth(g, formula, { size: 11.5, mono: true });
      const together = fw + 16 + textWidth(g, caveat, { size: 11 }) <= W;
      label(g, formula, ox, ry, { color: p.muted, size: 11.5, max: W, ...mono });
      if (together) label(g, caveat, ox + fw + 16, ry, { color: p.muted, size: 11, max: W - fw - 16 });
      else { ry += 17; label(g, caveat, ox, ry, { color: p.muted, size: 11, max: W }); }
      ry += 24;
      const off = Math.abs(err) > 0.02;
      // Three readings on one line need a wide canvas. Narrow, they stack.
      const nums = [`down ${(down * 100).toFixed(1)} µs`, `up ${(up * 100).toFixed(1)} µs`,
        `→  offset error ${Math.abs(err * 100).toFixed(1)} µs`];
      const oneLine = nums.join('   ');
      if (textWidth(g, oneLine, { size: 12.5, weight: 650, mono: true }) <= W) {
        label(g, oneLine, ox, ry, { color: off ? p.red : p.green, size: 12.5, weight: 650, max: W, ...mono });
        ry += 22;
      } else {
        label(g, `${nums[0]}   ${nums[1]}`, ox, ry, { color: off ? p.red : p.green, size: 12.5, weight: 650, max: W, ...mono });
        ry += 18;
        label(g, nums[2], ox, ry, { color: off ? p.red : p.green, size: 12.5, weight: 650, max: W, ...mono });
        ry += 22;
      }
      ry += labelWrap(g, off
        ? 'the follower is now wrong by exactly half the difference, and it does not know'
        : 'symmetric, so the subtraction is correct and the follower is locked',
      ox, ry, { color: off ? p.red : p.green, size: 11.5, max: W, maxLines: 3 });
      fit(ry + 12);
    },
  });

  const upd = () => {
    if (!st.aware) setNote('<b>A switch that is not PTP aware.</b> It queues the timing messages behind whatever else it is carrying, and the delay it adds is different each way and changes every second. PTP cannot see it, so the follower silently applies a wrong offset that wanders. The symptom is not a dead system: it is audio that is fine for an hour and then starts clicking. This is why the switch specification for a Dante or AES67 system is not a formality.');
    else if (Math.abs(st.asym) > 0.04) setNote('<b>Asymmetric path.</b> The two directions take different times, perhaps because one way goes through an extra hop or a slower link. PTP averages them and lands exactly halfway between, so the follower is off by half the difference and reports itself as locked. A clock error you cannot see in the software is the worst kind.');
    else setNote('<b>Symmetric and PTP aware.</b> The follower notes when a Sync left and when it arrived, then asks the same question in reverse. Average the two and you have the path delay; subtract it and you have the offset. Everything else in PTP is bookkeeping around that one subtraction.');
  };

  controls.append(
    toggle('PTP aware switch', { value: true, on: (v) => { st.aware = v; upd(); } }).node,
    slider('Path asymmetry', { min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => (Math.abs(v) < 0.005 ? 'symmetric' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)} µs`), on: (v) => { st.asym = v; upd(); } }).node,
    toggle('Run', { value: true, on: (v) => { st.running = v; } }).node
  );
  upd();
});

// ============================================================================
// 2. Where the latency in a show system actually comes from
// ============================================================================

const STAGES_L = [
  { k: 'mic', label: 'Microphone to converter', ms: 0.0, fixed: true },
  { k: 'adc', label: 'A to D conversion', ms: 0.7, min: 0.3, max: 2 },
  { k: 'net', label: 'Network transport', ms: 1.0, min: 0.25, max: 5 },
  { k: 'buf', label: 'Console or DAW buffer', ms: 5.3, min: 1.3, max: 21.3 },
  { k: 'dsp', label: 'Processing and plugins', ms: 3.0, min: 0, max: 20 },
  { k: 'dac', label: 'D to A conversion', ms: 0.7, min: 0.3, max: 2 },
  { k: 'air', label: 'Air, 12 m to the seat', ms: 35, min: 0, max: 90 },
];

register('latency-budget', (host) => {
  const st = Object.fromEntries(STAGES_L.map((s) => [s.k, s.ms]));
  const { controls, stage, setNote } = figure(host, {
    title: 'The latency budget, added up honestly',
    sub: 'No single stage is the problem. They are all small, and they all add, and the total is what the performer feels.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const total = STAGES_L.reduce((a, s) => a + st[s.k], 0);
      const elec = total - st.air;

      // Every column is a share of the canvas, not a fixed pixel offset. The
      // old layout put the bars at a hard 186px, which on a phone left them
      // 148px to grow into and sent the rest off the side of the picture.
      const valW = textWidth(g, '00.0 ms', { size: 11, mono: true }) + 10;
      const labW = clamp(W * 0.4, 76, 176);
      const barX = ox + labW + valW;
      const barW = W - labW - valW;
      const scale = barW / Math.max(60, total * 1.06);
      const rowH = Math.max(26, drawnSize(11.5) * 2.1);
      // Where the threshold captions go decides where the first stage starts:
      // inline captions need the room, a key underneath does not.
      const wide = W >= 430;

      let y = wide ? 26 + drawnSize(10) * 2.6 : 26;
      let acc = 0;
      const cols = [p.muted, p.cyan, p.amber, p.red, p.green, p.cyan, p.muted];
      STAGES_L.forEach((s, i) => {
        const v = st[s.k];
        label(g, s.label, ox, y, { color: p.ink2, size: 11.5, max: labW - 6 });
        label(g, `${v.toFixed(1)} ms`, ox + labW + valW - 10, y,
          { color: p.muted, size: 11, align: 'right', max: valW, ...mono });
        box(g, barX + acc * scale, y - 8, Math.max(1.5, v * scale), 16,
          { fill: alpha(cols[i], 0.6), stroke: cols[i], r: 3, lw: 1 });
        acc += v;
        y += rowH;
      });

      y += 6;
      line(g, ox, y - 8, ox + W, y - 8, { color: p.line, lw: 1 });
      // The totals sit against the right edge, so they cannot walk off it.
      const sumW = textWidth(g, '000.0 ms', { size: 14, weight: 700, mono: true }) + 8;
      label(g, 'electrical path, console to loudspeaker', ox, y + 6,
        { color: p.muted, size: 11.5, max: W - sumW });
      label(g, `${elec.toFixed(1)} ms`, ox + W, y + 6,
        { color: elec > 12 ? p.red : elec > 7 ? p.amber : p.green, size: 14, weight: 700, align: 'right', ...mono });
      label(g, 'plus the air the audience was always going to hear through',
        ox, y + 28, { color: p.muted, size: 11.5, max: W - sumW });
      label(g, `${total.toFixed(1)} ms`, ox + W, y + 28,
        { color: p.ink, size: 14, weight: 700, align: 'right', ...mono });

      // The two thresholds that actually matter. Wide enough and each caption
      // sits beside its own dashed line. Narrow, and two captions on one row
      // print over each other and over the first stage, so the lines take a
      // short tag and the captions drop to a key underneath.
      const THRESH = [
        [10, '10 ms', 'a performer on in-ears starts to feel it', p.amber],
        [40, '40 ms', 'lip sync becomes visible', p.red],
      ];
      let ky = y + 52;
      THRESH.forEach(([ms, tag, why, col], n) => {
        const x = barX + ms * scale;
        const on = x <= ox + W;
        if (on) {
          line(g, x, 18, x, y - 14, { color: alpha(col, 0.8), lw: 1.5, dash: [4, 4] });
          const lbl = wide ? `${tag}: ${why}` : tag;
          const tw = textWidth(g, lbl, { size: 10, mono: true });
          const flip = x + 4 + tw > ox + W;
          label(g, lbl, flip ? x - 4 : x + 4, 18 + n * 14,
            { color: col, size: 10, align: flip ? 'right' : 'left', max: flip ? x - ox - 4 : ox + W - x - 4, ...mono });
        }
        if (!wide) {
          label(g, `${tag}  ${why}${on ? '' : ', off the scale'}`, ox, ky,
            { color: col, size: 10.5, max: W, ...mono });
          ky += 16;
        }
      });
      fit((wide ? y + 44 : ky + 6));
    },
  });

  const upd = () => {
    cv.once();
    const total = STAGES_L.reduce((a, s) => a + st[s.k], 0);
    const elec = total - st.air;
    if (elec > 12) setNote(`<b>${elec.toFixed(1)} ms before the sound has left the loudspeaker.</b> A performer on in-ear monitors will feel this as their own voice arriving late, and they will pull back off the microphone to compensate. Nothing here is broken and no single stage is unreasonable; they simply add. The buffer is almost always the biggest lever, and the plugins are the second.`);
    else if (st.air > 55) setNote(`The electrical path is fine at ${elec.toFixed(1)} ms. Then there is ${st.air.toFixed(0)} ms of air, which nobody ever complains about, because sound has always taken 3 ms per metre. <b>The audience is not comparing your system to zero</b>, they are comparing it to the acoustic sound in the room, which is why a delay tower works at all.`);
    else setNote(`${elec.toFixed(1)} ms electrical, ${total.toFixed(1)} ms to the seat. This is a budget, not a fault: your job is to spend it deliberately. Constant latency can be measured and compensated; what cannot be compensated is <b>variation</b>, which is why a system that averages 6 ms and occasionally spikes to 20 is worse than one that always takes 12.`);
  };

  STAGES_L.filter((s) => !s.fixed).forEach((s) => {
    controls.append(slider(s.label, {
      min: s.min, max: s.max, step: 0.1, value: s.ms, fmt: (v) => `${v.toFixed(1)} ms`,
      on: (v) => { st[s.k] = v; upd(); },
    }).node);
  });
  upd();
});

// ============================================================================
// 3. Single point of failure: click it, see what goes dark
// ============================================================================

const DESIGNS = {
  single: {
    label: 'One of everything',
    nodes: [
      ['src', 'Playback', 90, 40], ['sw', 'Switch', 90, 120], ['pw', 'Power', 240, 40],
      ['proc', 'Processor', 90, 200], ['wall', 'LED wall', 240, 200], ['amp', 'Amplifier', 240, 120],
    ],
    links: [['src', 'sw'], ['sw', 'proc'], ['proc', 'wall'], ['sw', 'amp'], ['pw', 'sw'], ['pw', 'proc'], ['pw', 'amp']],
    outputs: ['wall', 'amp'],
  },
  dual: {
    label: 'Dual path, single power',
    nodes: [
      ['src', 'Playback', 90, 40], ['sw', 'Switch A', 40, 120], ['sw2', 'Switch B', 150, 120],
      ['pw', 'Power', 240, 40], ['proc', 'Processor', 90, 200], ['wall', 'LED wall', 240, 200],
      ['amp', 'Amplifier', 240, 120],
    ],
    links: [['src', 'sw'], ['src', 'sw2'], ['sw', 'proc'], ['sw2', 'proc'], ['proc', 'wall'],
      ['sw', 'amp'], ['sw2', 'amp'], ['pw', 'sw'], ['pw', 'sw2'], ['pw', 'proc'], ['pw', 'amp']],
    outputs: ['wall', 'amp'],
  },
  full: {
    label: 'Dual path, dual power',
    nodes: [
      ['src', 'Playback', 90, 40], ['src2', 'Backup play', 200, 40],
      ['sw', 'Switch A', 40, 120], ['sw2', 'Switch B', 150, 120],
      ['pw', 'Power A', 262, 78], ['pw2', 'Power B', 262, 130],
      ['proc', 'Processor', 90, 200], ['wall', 'LED wall', 240, 200], ['amp', 'Amplifier', 240, 160],
    ],
    links: [['src', 'sw'], ['src', 'sw2'], ['src2', 'sw'], ['src2', 'sw2'], ['sw', 'proc'], ['sw2', 'proc'],
      ['proc', 'wall'], ['sw', 'amp'], ['sw2', 'amp'],
      ['pw', 'sw'], ['pw2', 'sw2'], ['pw', 'proc'], ['pw2', 'proc'], ['pw', 'amp'], ['pw2', 'amp'],
      ['pw', 'src'], ['pw2', 'src2']],
    outputs: ['wall', 'amp'],
  },
};

register('spof-map', (host) => {
  let key = 'single';
  let dead = new Set();
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'Kill one box and see what goes dark',
    sub: 'Click any node to fail it. Redundancy is not a word, it is whether a path still exists.',
    note: '&nbsp;',
  });

  challenge('On the dual path design, kill two boxes and keep both outputs live. Then find the two that stop the show.',
    () => key !== 'single' && dead.size >= 2 && DESIGNS[key].outputs.every((o) => alive(DESIGNS[key]).reach.has(o)));

  // Which outputs are still fed, given the failures.
  function alive(d) {
    const ok = new Set(d.nodes.map(([id]) => id).filter((id) => !dead.has(id)));
    const powered = new Set();
    const pw = d.nodes.filter(([id]) => id.startsWith('pw')).map(([id]) => id);
    for (const [id] of d.nodes) {
      if (id.startsWith('pw')) { if (ok.has(id)) powered.add(id); continue; }
      const feeds = d.links.filter(([a, b]) => b === id && a.startsWith('pw')).map(([a]) => a);
      if (!feeds.length || feeds.some((f) => ok.has(f))) powered.add(id);
    }
    const good = new Set([...ok].filter((id) => powered.has(id)));
    // Walk forward from any surviving source.
    const reach = new Set(d.nodes.map(([id]) => id).filter((id) => id.startsWith('src') && good.has(id)));
    for (let i = 0; i < 8; i++) {
      for (const [a, b] of d.links) {
        if (a.startsWith('pw')) continue;
        if (reach.has(a) && good.has(b)) reach.add(b);
      }
    }
    return { reach, good };
  }

  // Nodes are laid out in a 320 x 215 space; this scales that to whatever
  // canvas we get, and both the drawing and the hit test use it.
  // The drawn node box and the clickable node box are the same box. They were
  // not: the drawing clamped its size and the hit test kept scaling, so at one
  // end of the range the target was wider than the node and at the other it was
  // narrower.
  const nodeBox = (sc) => ({ nw: clamp(84 * sc, 54, 96), nh: clamp(26 * sc, 20, 30) });

  // Width only. The height is a result of the layout, not an input to it: while
  // the scale depended on the canvas height and the canvas height was fitted to
  // the scale, the two chased each other down to nothing.
  const layout = (w) => {
    // The readout sits beside the map when there is room for both, and under it
    // when there is not. On a phone the old fixed 175px reserve squeezed the
    // map to 57 percent while the node boxes stayed 84px wide, so they printed
    // over each other.
    const side = w >= 560;
    const reserve = side ? 175 : 16;
    const sc = clamp((Math.min(w, 660) - reserve) / 320, 0.62, 1.5);
    return { sc, side, ox: Math.max(8, (w - (320 * sc + (side ? 165 : 0))) / 2), oy: 16 };
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const d = DESIGNS[key];
      const { sc, side, ox, oy } = layout(w);
      const P = (x, y) => [ox + x * sc, oy + y * sc];
      const { reach, good } = alive(d);
      const map = Object.fromEntries(d.nodes.map(([id, lbl, x, y]) => [id, [x, y, lbl]]));

      for (const [a, b] of d.links) {
        const [ax, ay] = P(map[a][0], map[a][1]), [bx, by] = P(map[b][0], map[b][1]);
        const live = good.has(a) && good.has(b) && (a.startsWith('pw') || reach.has(a));
        line(g, ax, ay, bx, by, {
          color: a.startsWith('pw') ? alpha(p.red, live ? 0.4 : 0.12) : alpha(p.cyan, live ? 0.7 : 0.14),
          lw: a.startsWith('pw') ? 1.2 : 2, dash: a.startsWith('pw') ? [3, 3] : undefined,
        });
      }
      for (const [id, lbl, x, y] of d.nodes) {
        const [cx, cy] = P(x, y);
        const isDead = dead.has(id);
        const fed = reach.has(id) || id.startsWith('pw');
        const col = isDead ? p.red : (good.has(id) && fed ? p.green : p.muted);
        // The box scales with the map, or two nodes end up sharing pixels.
        const { nw, nh } = nodeBox(sc);
        box(g, cx - nw / 2, cy - nh / 2, nw, nh, {
          fill: isDead ? alpha(p.red, 0.18) : alpha(col, 0.13), stroke: col, r: 6, lw: isDead ? 2 : 1.2,
        });
        label(g, isDead ? `✕ ${lbl}` : lbl, cx, cy,
          { color: isDead ? p.red : p.ink2, size: sc < 0.85 ? 9.5 : 10.5, align: 'center', max: nw - 6 });
      }

      const mapBottom = oy + 215 * sc;
      const rx = side ? ox + 320 * sc + 14 : 16;
      let ry = side ? oy + 38 : mapBottom + 44;
      label(g, 'still working', rx, (side ? oy : mapBottom) + 16, { color: p.muted, size: 11, weight: 600 });
      for (const o of d.outputs) {
        const ok = reach.has(o);
        const cx = side ? rx + 5 : rx + 5 + d.outputs.indexOf(o) * Math.min(150, (w - 32) / d.outputs.length);
        const tx = cx + 11;
        g.fillStyle = ok ? p.green : p.red;
        g.beginPath(); g.arc(cx, ry - 4, 5, 0, 7); g.fill();
        label(g, map[o][2], tx, ry - 4, { color: p.ink2, size: 11, max: side ? w - tx - 8 : 120 });
        label(g, ok ? 'live' : 'DARK', tx, ry + 12, { color: ok ? p.green : p.red, size: 11, weight: 700, max: 120, ...mono });
        if (side) ry += 38;
      }
      if (!side) ry += 34;
      else ry += 4;
      label(g, `${dead.size} failed`, rx, ry, { color: p.muted, size: 11, max: w - rx - 8, ...mono });
      fit(Math.max(mapBottom + 20, ry + 18));
    },
  });

  // Clicking a node fails it, which is the only way this figure teaches anything.
  cv && stage.querySelector('canvas').addEventListener('click', (e) => {
    const d = DESIGNS[key];
    const c = e.currentTarget, r = c.getBoundingClientRect();
    const { sc, ox, oy } = layout(r.width);
    const { nw, nh } = nodeBox(sc);
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    for (const [id, , x, y] of d.nodes) {
      const cx = ox + x * sc, cy = oy + y * sc;
      if (Math.abs(mx - cx) <= nw / 2 && Math.abs(my - cy) <= nh / 2) {
        dead.has(id) ? dead.delete(id) : dead.add(id);
        upd();
        return;
      }
    }
  });

  function upd() {
    cv.once();
    const d = DESIGNS[key];
    const { reach } = alive(d);
    const darkOut = d.outputs.filter((o) => !reach.has(o));
    if (!dead.size) setNote(`<b>${d.label}.</b> Everything is live. Now fail something: click a box. The question a design has to answer is not "is it good equipment", it is <b>"what is the smallest number of things that have to break before the audience notices"</b>.`);
    else if (!darkOut.length) setNote(`${dead.size} box${dead.size > 1 ? 'es' : ''} failed and the show is still running, because there is another path. That is what redundancy means, and note that it costs a second switch, a second power feed and a discipline about which is which. It also has to be <b>tested by pulling the cable</b>, because a redundant path nobody has ever cut over to is a theory.`);
    else setNote(`<b>${darkOut.length === d.outputs.length ? 'Everything' : darkOut.join(' and ')} dark from ${dead.size} failure${dead.size > 1 ? 's' : ''}.</b> Trace back from the black screen: the chain is only as good as the thinnest place in it. Note how often power, not signal, is the thing that took it out. Power and network are the same problem wearing different labels.`);
  }

  controls.append(
    choice('Design', Object.entries(DESIGNS).map(([k, v]) => [k, v.label]), { value: 'single', on: (v) => { key = v; dead = new Set(); upd(); } }).node,
    button('Repair everything', () => { dead = new Set(); upd(); }).node
  );
  upd();
});
