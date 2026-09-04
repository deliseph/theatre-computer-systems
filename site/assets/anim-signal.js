// Animations for Class 1 (the argument) and Class 2 (the machine).

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp, h, el,
} from './anim-core.js';

// ============================================================================
// Class 1: the Four Flows sharing one wire
//
// The model is real. Each flow offers a load; the link has a capacity. Without
// QoS the switch shares proportionally, so control and clock degrade along with
// everything else. With QoS it serves clock, then control, then media, and
// management starves, which is exactly what you want.
// ============================================================================

register('four-flows', (host) => {
  const FLOWS = [
    { k: 'clock', name: 'Clock', c: 'green', offer: 1, prio: 0, note: 'PTP' },
    { k: 'control', name: 'Control', c: 'amber', offer: 3, prio: 1, note: 'sACN' },
    { k: 'media', name: 'Media', c: 'cyan', offer: 55, prio: 2, note: 'Dante' },
    { k: 'mgmt', name: 'Management', c: 'red', offer: 0, prio: 3, note: 'file copy' },
  ];
  const CAP = 100;
  const state = { mgmt: false, qos: false, drops: 0, lateMs: 0 };

  const { controls, stage, setNote } = figure(host, {
    title: 'Four flows, one wire',
    sub: 'Four kinds of traffic share a single Cat lead through one switch. Start the file copy and watch what happens to the cue.',
    note: '&nbsp;',
  });

  // Allocate link capacity. Proportional share without QoS, strict priority with it.
  function allocate() {
    const offers = FLOWS.map((f) => (f.k === 'mgmt' ? (state.mgmt ? 90 : 0) : f.offer));
    const total = offers.reduce((a, b) => a + b, 0);
    if (total <= CAP) return offers.slice();
    if (!state.qos) return offers.map((o) => (o * CAP) / total);
    const out = [0, 0, 0, 0];
    let left = CAP;
    for (const f of [...FLOWS].sort((a, b) => a.prio - b.prio)) {
      const i = FLOWS.indexOf(f);
      const give = Math.min(offers[i], left);
      out[i] = give;
      left -= give;
    }
    return out;
  }

  const packets = [];
  let spawn = 0;

  const cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const alloc = allocate();
      const offers = FLOWS.map((f) => (f.k === 'mgmt' ? (state.mgmt ? 90 : 0) : f.offer));
      const laneH = hgt / 5;
      const srcX = 84;
      const swX = w * 0.47;
      const swW = 62;
      const dstX = w - 84;

      // Switch body
      box(g, swX, laneH * 0.55, swW, hgt - laneH * 1.1, { fill: p.raised, stroke: p.line, r: 10 });
      label(g, 'SWITCH', swX + swW / 2, hgt / 2 - 8, { color: p.muted, size: 10, weight: 700, align: 'center' });
      label(g, `${CAP} units`, swX + swW / 2, hgt / 2 + 8, { color: p.muted, size: 10, align: 'center', mono: true });

      FLOWS.forEach((f, i) => {
        const y = laneH * (i + 1);
        const col = p[f.c];
        const offered = offers[i];
        const got = alloc[i];
        const ratio = offered ? got / offered : 1;

        // Lane
        line(g, srcX, y, dstX, y, { color: alpha(p.line, 0.9), lw: 10 });
        if (offered > 0) line(g, srcX, y, dstX, y, { color: alpha(col, 0.16), lw: 10 });

        // Source and destination
        box(g, 10, y - 15, 70, 30, { fill: p.surface, stroke: alpha(col, 0.7), r: 7 });
        label(g, f.name, 45, y - 3, { color: col, size: 11, weight: 700, align: 'center' });
        label(g, f.note, 45, y + 9, { color: p.muted, size: 9.5, align: 'center', mono: true });
        box(g, dstX + 6, y - 13, 66, 26, { fill: p.surface, stroke: alpha(p.line, 1), r: 7 });
        label(g, offered ? `${got.toFixed(0)}/${offered}` : 'idle', dstX + 39, y,
          { color: ratio < 0.95 && offered ? p.red : p.muted, size: 10.5, align: 'center', mono: true });

        // Starvation marker
        if (offered > 0 && ratio < 0.98) {
          label(g, ratio < 0.5 ? 'STARVED' : 'DEGRADED', (srcX + swX) / 2, y - 22,
            { color: p.red, size: 9.5, weight: 700, align: 'center' });
        }
      });

      // Spawn packets in proportion to what each flow is actually getting through
      spawn += dt;
      if (spawn > 0.055) {
        spawn = 0;
        FLOWS.forEach((f, i) => {
          const offered = offers[i];
          if (!offered) return;
          const ratio = alloc[i] / offered;
          const rate = f.k === 'media' || f.k === 'mgmt' ? 0.85 : 0.32;
          if (Math.random() < rate) {
            // A packet the link cannot carry is dropped at the switch.
            const dropped = Math.random() > ratio;
            if (dropped && (f.k === 'control' || f.k === 'clock')) state.drops++;
            packets.push({ i, x: srcX, drop: dropped, dead: 0, speed: lerp(60, 210, clamp(ratio, 0, 1)) });
          }
        });
      }

      for (let n = packets.length - 1; n >= 0; n--) {
        const pk = packets[n];
        const f = FLOWS[pk.i];
        const col = p[f.c];
        const y = laneH * (pk.i + 1);
        pk.x += pk.speed * dt;

        if (pk.drop && pk.x > swX + swW / 2) {
          pk.dead += dt;
          g.globalAlpha = clamp(1 - pk.dead * 3, 0, 1);
          label(g, '✕', swX + swW / 2, y - 16 - pk.dead * 22, { color: p.red, size: 14, weight: 700, align: 'center' });
          g.globalAlpha = 1;
          if (pk.dead > 0.34) packets.splice(n, 1);
          continue;
        }
        if (pk.x > dstX) { packets.splice(n, 1); continue; }
        box(g, pk.x, y - 5, 11, 10, { fill: col, stroke: 'transparent', r: 3 });
      }

      // Consequence readout, in the language of the show
      const ctrlRatio = offers[1] ? alloc[1] / offers[1] : 1;
      const clkRatio = offers[0] ? alloc[0] / offers[0] : 1;
      let verdict, vcol;
      if (ctrlRatio > 0.98 && clkRatio > 0.98) { verdict = 'Cues fire on time. Clock is locked.'; vcol = p.green; }
      else if (clkRatio < 0.98) { verdict = 'Clock is being starved. Expect clicks, then dropouts.'; vcol = p.red; }
      else { verdict = 'Control is being starved. Cues will fire late or not at all.'; vcol = p.red; }
      label(g, verdict, w / 2, hgt - 8, { color: vcol, size: 12, weight: 650, align: 'center' });
    },
  });

  controls.append(
    toggle('Designer copies a 4 GB file', {
      on: (v) => { state.mgmt = v; state.drops = 0; update(); },
    }).node,
    toggle('QoS enabled on the switch', {
      on: (v) => { state.qos = v; state.drops = 0; update(); },
    }).node
  );

  function update() {
    if (!state.mgmt) {
      setNote('Everything fits. The link is carrying about 59 of its 100 units, so nothing competes. This is the case you test in the afternoon.');
    } else if (!state.qos) {
      setNote('<b>This is the villain.</b> Management traffic has no deadline, so it takes whatever it can. Without QoS the switch shares the link proportionally, so control and clock degrade along with everything else. The file copy finishes. Your show does not.');
    } else {
      setNote('QoS serves clock first, then control, then media, and management gets what is left. The file copy crawls, which is correct: it is the only flow with no deadline. <b>Priority is how you protect a deadline from something that does not have one.</b>');
    }
  }
  update();
});

// ============================================================================
// Class 1: latency against jitter
// ============================================================================

register('latency-jitter', (host) => {
  const state = { jitter: 0, buffer: 4 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Latency you can fix, jitter you cannot',
    sub: 'Both paths have the same average delay. Add jitter to the lower one and watch the buffer fight it.',
    note: '&nbsp;',
  });

  let packets = [];
  let out = [];
  let level = 0, clicks = 0, spawn = 0, playhead = 0;

  const cv = canvas(stage, {
    height: 250,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const x0 = 96, x1 = w - 120;
      const yA = 62, yB = 168;

      [[yA, 'Constant delay', p.cyan], [yB, 'Variable delay (jitter)', p.amber]].forEach(([y, name, col]) => {
        line(g, x0, y, x1, y, { color: alpha(p.line, 1), lw: 8 });
        label(g, name, x0, y - 26, { color: col, size: 12, weight: 650 });
      });

      spawn += dt;
      if (spawn > 0.28) {
        spawn = 0;
        packets.push({ x: x0, y: yA, j: 0 });
        packets.push({ x: x0, y: yB, j: (Math.random() - 0.5) * state.jitter });
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        const speed = (x1 - x0) / (1.5 + pk.j);
        pk.x += speed * dt;
        if (pk.x >= x1) {
          if (pk.y === yB) { level = Math.min(state.buffer + 4, level + 1); }
          packets.splice(i, 1);
          continue;
        }
        box(g, pk.x, pk.y - 5, 10, 10, { fill: pk.y === yA ? p.cyan : p.amber, stroke: 'transparent', r: 3 });
      }

      // The buffer drains at a steady rate. Empty means a click.
      playhead += dt;
      if (playhead > 0.28) {
        playhead = 0;
        if (level > 0) level--;
        else { clicks++; out.push({ t: 0 }); }
      }

      // Buffer meter
      const bx = x1 + 16, bw = 44, bh = 96, by = yB - bh / 2;
      box(g, bx, by, bw, bh, { fill: p.raised, stroke: p.line, r: 6 });
      const capH = (bh - 6) * clamp(level / (state.buffer + 4), 0, 1);
      box(g, bx + 3, by + bh - 3 - capH, bw - 6, capH, { fill: level ? p.amber : p.red, stroke: 'transparent', r: 4 });
      label(g, 'buffer', bx + bw / 2, by - 12, { color: p.muted, size: 10, align: 'center' });

      for (let i = out.length - 1; i >= 0; i--) {
        out[i].t += dt;
        if (out[i].t > 0.7) { out.splice(i, 1); continue; }
        g.globalAlpha = 1 - out[i].t / 0.7;
        label(g, 'CLICK', bx + bw / 2, by + bh + 20, { color: p.red, size: 13, weight: 700, align: 'center' });
        g.globalAlpha = 1;
      }

      label(g, `added latency ${(state.buffer * 0.28 * 1000 / 10).toFixed(0)} ms`, x0, hgt - 26,
        { color: p.muted, size: 11, mono: true });
      label(g, `clicks ${clicks}`, x0, hgt - 10, { color: clicks ? p.red : p.muted, size: 11, mono: true });
    },
  });

  controls.append(
    slider('Jitter', { min: 0, max: 12, step: 1, value: 0, fmt: (v) => `${v}`, on: (v) => { state.jitter = v / 8; clicks = 0; update(); } }).node,
    slider('Buffer', { min: 0, max: 12, step: 1, value: 4, fmt: (v) => `${v}`, on: (v) => { state.buffer = v; clicks = 0; update(); } }).node,
    button('Reset', () => { clicks = 0; level = state.buffer; packets = []; out = []; }).node
  );

  function update() {
    if (state.jitter === 0) setNote('With no jitter both paths behave identically. A constant delay is not a fault: you measure it once and compensate. A delay tower is exactly that, and nobody calls it broken.');
    else if (state.buffer >= state.jitter * 8 * 0.8) setNote('The buffer is absorbing the jitter, and you paid for it in latency. That is the whole trade: <b>the only defence against jitter is a buffer, and a buffer costs delay.</b>');
    else setNote('<b>The buffer is running dry.</b> Each time it empties you get a click. Raise the buffer and the clicks stop, at the cost of latency. This is why jitter, not latency, is the thing that breaks shows.');
  }
  update();
});

// ============================================================================
// Class 1: the air is the biggest delay in the room
// ============================================================================

register('sound-distance', (host) => {
  const state = { d: 15 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How much of your latency is actually air',
    sub: 'Drag the listener back through the auditorium and compare the two bars.',
    note: '&nbsp;',
  });

  const ELEC = [
    ['Mic to converter', 0.5], ['Console processing', 1.5],
    ['Dante at 1 ms', 1.0], ['Amp DSP and conversion', 1.0],
  ];
  const elecTotal = ELEC.reduce((a, b) => a + b[1], 0);

  canvas(stage, {
    height: 230,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const air = state.d * 2.92;
      const max = Math.max(air, elecTotal) * 1.15;
      const x0 = 132, x1 = w - 24;
      const scale = (ms) => ((x1 - x0) * ms) / max;

      // Room
      box(g, x0, 18, x1 - x0, 52, { fill: alpha(p.cyan, 0.06), stroke: p.line, r: 8 });
      box(g, x0 + 4, 24, 26, 40, { fill: alpha(p.amber, 0.85), stroke: 'transparent', r: 5 });
      label(g, 'PA', x0 + 17, 44, { color: p.ground, size: 10, weight: 700, align: 'center' });
      const lx = x0 + 34 + ((x1 - x0 - 60) * clamp(state.d, 0, 40)) / 40;
      g.fillStyle = p.cyan;
      g.beginPath(); g.arc(lx, 44, 9, 0, Math.PI * 2); g.fill();
      label(g, `${state.d} m`, lx, 80, { color: p.cyan, size: 11, align: 'center', mono: true });

      // Bars
      const bar = (y, ms, col, name) => {
        box(g, x0, y, scale(ms), 26, { fill: alpha(col, 0.75), stroke: col, r: 5 });
        label(g, name, x0 - 10, y + 13, { color: p.ink2, size: 12, align: 'right' });
        label(g, `${ms.toFixed(1)} ms`, x0 + scale(ms) + 8, y + 13, { color: col, size: 12, weight: 650, mono: true });
      };
      bar(108, elecTotal, p.amber, 'Whole digital chain');
      bar(150, air, p.cyan, `Air at ${state.d} m`);

      label(g, ELEC.map((e) => `${e[0]} ${e[1]}`).join('  ·  ') + ' ms',
        x0, 196, { color: p.muted, size: 10.5, mono: true });
      label(g, 'sound travels about 2.92 ms per metre', x0, 214, { color: p.muted, size: 10.5, mono: true });
    },
  });

  const s = slider('Distance to listener', {
    min: 1, max: 40, step: 1, value: 15, fmt: (v) => `${v} m`,
    on: (v) => { state.d = v; update(); },
  });
  controls.append(s.node);

  function update() {
    const air = state.d * 2.92;
    setNote(`The listener at ${state.d} m is experiencing <b>${air.toFixed(0)} ms</b> of delay from the air alone and has never complained about it. The entire digital signal chain costs <b>${elecTotal.toFixed(1)} ms</b>, which is ${(air / elecTotal).toFixed(1)} times less. Latency that is known and constant is a budget you spend, not a fault you fix.`);
  }
  update();
});

// ============================================================================
// Class 2: sampling, bit depth, and aliasing
// ============================================================================

register('sampling', (host) => {
  const state = { freq: 3, rate: 24, bits: 4 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a sound becomes numbers',
    sub: 'The smooth line is the real waveform. The dots are what the converter actually measured. Drop the sample rate below twice the frequency and watch what comes back.',
    note: '&nbsp;',
  });

  canvas(stage, {
    height: 260,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const x0 = 20, x1 = w - 20, mid = hgt / 2 - 6, amp = hgt / 2 - 46;
      const cycles = state.freq;

      line(g, x0, mid, x1, mid, { color: alpha(p.line, 1), lw: 1 });

      // True waveform
      g.strokeStyle = alpha(p.cyan, 0.55);
      g.lineWidth = 2;
      g.beginPath();
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        const y = mid - Math.sin(u * Math.PI * 2 * cycles) * amp;
        x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();

      // Samples, quantised to the chosen bit depth
      const levels = 2 ** state.bits;
      const pts = [];
      for (let i = 0; i <= state.rate; i++) {
        const u = i / state.rate;
        const raw = Math.sin(u * Math.PI * 2 * cycles);
        const q = Math.round(((raw + 1) / 2) * (levels - 1)) / (levels - 1) * 2 - 1;
        pts.push([x0 + u * (x1 - x0), mid - q * amp, mid - raw * amp]);
      }

      // Quantisation error
      pts.forEach(([x, yq, yr]) => {
        if (Math.abs(yq - yr) > 1) line(g, x, yr, x, yq, { color: alpha(p.red, 0.55), lw: 1.5 });
      });

      // Reconstruction from the samples
      g.strokeStyle = p.amber;
      g.lineWidth = 2.2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();

      pts.forEach(([x, y]) => {
        g.fillStyle = p.amber;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      });

      const nyq = state.rate / 2;
      const aliased = cycles > nyq;
      label(g, `signal ${cycles} cycles   ·   ${state.rate} samples   ·   Nyquist limit ${nyq}`,
        x0, hgt - 26, { color: aliased ? p.red : p.muted, size: 11.5, mono: true });
      label(g, `${state.bits} bit = ${levels} levels = ${(state.bits * 6.02).toFixed(0)} dB of dynamic range`,
        x0, hgt - 9, { color: p.muted, size: 11.5, mono: true });
      if (aliased) label(g, 'ALIASING', x1, hgt - 26, { color: p.red, size: 12, weight: 700, align: 'right' });
    },
  });

  controls.append(
    slider('Signal', { min: 1, max: 20, step: 1, value: 3, fmt: (v) => `${v} cyc`, on: (v) => { state.freq = v; update(); } }).node,
    slider('Sample rate', { min: 6, max: 64, step: 1, value: 24, fmt: (v) => `${v}`, on: (v) => { state.rate = v; update(); } }).node,
    slider('Bit depth', { min: 1, max: 8, step: 1, value: 4, fmt: (v) => `${v} bit`, on: (v) => { state.bits = v; update(); } }).node
  );

  function update() {
    const nyq = state.rate / 2;
    if (state.freq > nyq) {
      setNote('<b>Aliasing.</b> The samples no longer describe the real wave, and the amber reconstruction is a completely different, lower frequency. This is why the rule is absolute: you can only capture frequencies below half the sample rate. 48 kHz gives you 24 kHz, which is above human hearing, which is why 48 kHz is enough.');
    } else if (state.bits <= 3) {
      setNote(`Sample rate is fine, but at ${state.bits} bit there are only ${2 ** state.bits} levels to round to, and the red lines are the rounding error. That error is the noise floor. Each bit buys about 6.02 dB, so 24 bit gives about 144 dB.`);
    } else {
      setNote('Enough samples and enough levels, so the reconstruction sits on the real wave. Everything in this module is this idea repeated: a continuous thing, measured often enough and precisely enough, becomes numbers a computer can carry.');
    }
  }
  update();
});

// ============================================================================
// Class 2: buffer underrun
// ============================================================================

register('buffer-underrun', (host) => {
  const state = { size: 128, load: 0.3 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why the buffer size is a choice with a cost',
    sub: 'The CPU fills the buffer. The sound card drains it at a fixed rate. Load the CPU and watch the race.',
    note: '&nbsp;',
  });

  let level = 0.6, clicks = 0, flash = 0, fillT = 0;

  canvas(stage, {
    height: 220,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const bufMs = (state.size / 48000) * 1000;

      // The CPU delivers a block, late in proportion to load, with jitter.
      fillT += dt;
      const period = bufMs / 1000;
      const late = state.load * (0.9 + Math.random() * 1.4);
      if (fillT > period * (0.55 + late)) {
        fillT = 0;
        level = Math.min(1, level + 0.42);
      }
      level -= dt / (period * 2.6);

      if (level <= 0) { level = 0.42; clicks++; flash = 1; }
      flash = Math.max(0, flash - dt * 3);

      const bx = 30, bw = w - 240, by = 54, bh = 60;
      box(g, bx, by, bw, bh, { fill: p.raised, stroke: p.line, r: 8 });
      box(g, bx + 3, by + 3, (bw - 6) * clamp(level, 0, 1), bh - 6,
        { fill: level < 0.18 ? p.red : p.cyan, stroke: 'transparent', r: 5 });
      label(g, 'BUFFER', bx + 10, by - 12, { color: p.muted, size: 10, weight: 700 });

      label(g, 'CPU fills →', bx, by + bh + 22, { color: p.amber, size: 12, weight: 600 });
      label(g, '→ sound card drains', bx + bw, by + bh + 22, { color: p.cyan, size: 12, weight: 600, align: 'right' });

      if (flash > 0) {
        g.globalAlpha = flash;
        label(g, 'CLICK', bx + bw / 2, by + bh / 2, { color: p.red, size: 26, weight: 700, align: 'center' });
        g.globalAlpha = 1;
      }

      const rx = w - 196;
      label(g, `${state.size} samples`, rx, 58, { color: p.ink, size: 15, weight: 700, mono: true });
      label(g, `${bufMs.toFixed(2)} ms per buffer`, rx, 78, { color: p.muted, size: 11.5, mono: true });
      label(g, `round trip ≈ ${(bufMs * 2 + 1.5).toFixed(1)} ms`, rx, 96, { color: p.muted, size: 11.5, mono: true });
      label(g, `clicks ${clicks}`, rx, 122, { color: clicks ? p.red : p.muted, size: 13, weight: 700, mono: true });

      label(g, `${state.size} ÷ 48,000 = ${(state.size / 48000).toFixed(5)} s`, 30, hgt - 14,
        { color: p.muted, size: 11, mono: true });
    },
  });

  controls.append(
    choice('Buffer', [[64, '64'], [128, '128'], [256, '256'], [512, '512'], [1024, '1024']],
      { value: 128, on: (v) => { state.size = +v; clicks = 0; update(); } }).node,
    slider('CPU load', { min: 0, max: 100, step: 5, value: 30, fmt: (v) => `${v}%`, on: (v) => { state.load = v / 100; clicks = 0; update(); } }).node
  );

  function update() {
    const bufMs = (state.size / 48000) * 1000;
    if (state.load > 0.6 && state.size <= 128) {
      setNote(`<b>This is the failure.</b> At ${state.size} samples the CPU has only ${bufMs.toFixed(2)} ms to deliver the next block, and under load it misses. Every miss is an audible click. Raise the buffer, or take work off the machine.`);
    } else if (state.size >= 512) {
      setNote(`Safe, and slow. ${bufMs.toFixed(2)} ms per buffer means roughly ${(bufMs * 2 + 1.5).toFixed(0)} ms round trip, which a performer monitoring themselves will feel as wrong. Fine for playback, wrong for a musician.`);
    } else {
      setNote('Running clean. The buffer is the trade between latency and safety, and there is no setting that wins both. You choose it per job, and you choose it knowing what the machine is also being asked to do.');
    }
  }
  update();
});

// ============================================================================
// Class 2: intra frame against inter frame
// ============================================================================

register('intra-inter', (host) => {
  const state = { mode: 'inter', target: 11, decoding: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why we transcode before a show',
    sub: 'Click any frame to jump to it, and count how many frames have to be decoded to get there.',
    note: '&nbsp;',
  });

  const N = 24;
  let cursor = 0, work = [], decoded = 0, timer = 0;

  const jump = (i) => {
    state.target = i;
    decoded = 0;
    if (state.mode === 'intra') { cursor = i; work = []; update(); return; }
    let key = i;
    while (key % 8 !== 0) key--;          // keyframe every 8 frames
    work = [];
    for (let f = key; f <= i; f++) work.push(f);
    cursor = key;
    timer = 0;
    update();
  };

  const cv = canvas(stage, {
    height: 190,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const pad = 18;
      const cw = (w - pad * 2) / N;

      if (work.length) {
        timer += dt;
        if (timer > 0.09) {
          timer = 0;
          cursor = work.shift();
          decoded++;
        }
      }

      for (let i = 0; i < N; i++) {
        const x = pad + i * cw;
        const isKey = i % 8 === 0;
        const done = state.mode === 'intra' ? i === cursor : (decoded > 0 && i <= cursor && i >= cursor - decoded + 1);
        const col = state.mode === 'intra' ? p.cyan : (isKey ? p.cyan : p.amber);
        box(g, x + 2, 46, cw - 4, 56, {
          fill: done ? alpha(col, 0.55) : alpha(col, 0.12),
          stroke: i === state.target ? p.ink : alpha(col, 0.5), r: 4, lw: i === state.target ? 2 : 1,
        });
        if (state.mode === 'inter' && isKey) label(g, 'K', x + cw / 2, 74, { color: p.cyan, size: 10, weight: 700, align: 'center' });
        if (i === cursor) box(g, x + 2, 106, cw - 4, 4, { fill: p.ink, stroke: 'transparent', r: 2 });
      }

      label(g, state.mode === 'intra'
        ? 'Intra frame: every frame is complete on its own'
        : 'Inter frame: only K frames stand alone, the rest are differences',
        pad, 30, { color: p.ink2, size: 12.5, weight: 600 });

      label(g, `frames decoded to reach frame ${state.target}: `, pad, 136, { color: p.muted, size: 12 });
      label(g, String(state.mode === 'intra' ? 1 : Math.max(decoded, 1)),
        pad + 232, 136, { color: state.mode === 'intra' ? p.green : p.red, size: 16, weight: 700, mono: true });
      label(g, 'Click any frame to jump to it', pad, 162, { color: p.muted, size: 11 });
    },
  });

  stage.querySelector('canvas').addEventListener('click', (e) => {
    const r = e.target.getBoundingClientRect();
    const i = clamp(Math.floor(((e.clientX - r.left - 18) / (r.width - 36)) * N), 0, N - 1);
    jump(i);
  });

  controls.append(
    choice('Codec', [['inter', 'H.264 (inter frame)'], ['intra', 'HAP / ProRes (intra frame)']],
      { value: 'inter', on: (v) => { state.mode = v; jump(state.target); } }).node
  );

  function update() {
    if (state.mode === 'intra') {
      setNote('Every frame stands alone, so a jump to any point costs exactly one decode. The file is much larger, and that is the price of a cue that fires instantly. <b>This is what you play back from.</b>');
    } else {
      setNote('Only every eighth frame is complete. To show any other frame the machine must find the last keyframe and decode forward to your target. That is why a cue jump stalls, and why H.264 is what you receive, never what you play back. <b>The transcode is not bureaucracy, it is what makes the cue behave.</b>');
    }
  }
  jump(11);
});

// ============================================================================
// Class 2: chroma subsampling
// ============================================================================

register('chroma', (host) => {
  const state = { mode: '420' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Chroma subsampling, and where it falls apart',
    sub: 'The same image stored three ways. Watch the fine coloured detail, not the big shapes.',
    note: '&nbsp;',
  });

  canvas(stage, {
    height: 250,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const W = Math.min(560, w - 20), H = 150, ox = (w - W) / 2, oy = 34;

      // Build a test image: a smooth gradient, plus fine coloured stripes and text-like
      // strokes, which is exactly the content subsampling damages.
      const img = g.createImageData(W, H);
      const px = (x, y) => {
        const u = x / W, v = y / H;
        let r = 40 + 180 * u, gg = 60 + 120 * v, b = 200 - 140 * u;
        if (y > H * 0.52 && y < H * 0.78) {                 // fine red/cyan stripes
          const s = Math.floor(x / 2) % 2;
          r = s ? 235 : 20; gg = s ? 30 : 210; b = s ? 40 : 220;
        }
        if (y > H * 0.84 && ((x + Math.floor(y / 4) * 3) % 14) < 4) { r = 250; gg = 60; b = 90; }
        return [r, gg, b];
      };

      // RGB to YCbCr, subsample the chroma planes, convert back.
      const Y = new Float32Array(W * H), Cb = new Float32Array(W * H), Cr = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const [r, gg, b] = px(x, y), i = y * W + x;
        Y[i] = 0.299 * r + 0.587 * gg + 0.114 * b;
        Cb[i] = 128 - 0.169 * r - 0.331 * gg + 0.5 * b;
        Cr[i] = 128 + 0.5 * r - 0.419 * gg - 0.081 * b;
      }
      const sx = state.mode === '444' ? 1 : 2;
      const sy = state.mode === '420' ? 2 : 1;
      for (let y = 0; y < H; y += sy) for (let x = 0; x < W; x += sx) {
        let cb = 0, cr = 0, n = 0;
        for (let dy = 0; dy < sy && y + dy < H; dy++) for (let dx = 0; dx < sx && x + dx < W; dx++) {
          const i = (y + dy) * W + x + dx; cb += Cb[i]; cr += Cr[i]; n++;
        }
        cb /= n; cr /= n;
        for (let dy = 0; dy < sy && y + dy < H; dy++) for (let dx = 0; dx < sx && x + dx < W; dx++) {
          const i = (y + dy) * W + x + dx; Cb[i] = cb; Cr[i] = cr;
        }
      }
      for (let i = 0; i < W * H; i++) {
        const y = Y[i], cb = Cb[i] - 128, cr = Cr[i] - 128;
        img.data[i * 4] = clamp(y + 1.402 * cr, 0, 255);
        img.data[i * 4 + 1] = clamp(y - 0.344 * cb - 0.714 * cr, 0, 255);
        img.data[i * 4 + 2] = clamp(y + 1.772 * cb, 0, 255);
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, Math.round(ox), Math.round(oy));
      box(g, ox, oy, W, H, { fill: 'transparent', stroke: p.line, r: 0 });

      const ratio = state.mode === '444' ? 1 : state.mode === '422' ? 0.667 : 0.5;
      label(g, `4:${state.mode[1]}:${state.mode[2]}`, ox, 22, { color: p.ink, size: 14, weight: 700, mono: true });
      label(g, `${(ratio * 100).toFixed(0)}% of the data of full colour`, ox + 70, 23, { color: p.muted, size: 11.5 });
      label(g, 'brightness detail is untouched — only colour detail is thrown away',
        ox, oy + H + 22, { color: p.muted, size: 11 });
    },
  });

  controls.append(
    choice('Storage', [['444', '4:4:4 full'], ['422', '4:2:2'], ['420', '4:2:0']],
      { value: '420', on: (v) => { state.mode = v; update(); } }).node
  );

  function update() {
    if (state.mode === '444') setNote('Full colour resolution. Everything is crisp, and the file is the largest. This is what you want for fine coloured text and graphics on a large surface.');
    else if (state.mode === '422') setNote('Colour resolution halved horizontally. The gradient is untouched and the stripes have started to smear. 4:2:2 is the broadcast and professional default, and it is what the 2.5 Gbit/s HD figure in this class assumes.');
    else setNote('<b>Colour halved in both directions.</b> Look at the fine stripes and the diagonal marks: the brightness is still sharp but the colour has bled. Our eyes are much more sensitive to brightness than colour, so this is cheap compression that mostly works, until you put fine coloured text on a screen, when it very visibly does not.');
  }
  update();
});

// ============================================================================
// Class 1 anchor: trace one signal, end to end, in your own department
// ============================================================================

const CHAINS = {
  audio: {
    label: 'A voice',
    steps: [
      ['Performer', 'air pressure, analogue', 'media'],
      ['Microphone', 'a voltage that looks like the sound', 'media'],
      ['Preamp and A to D', 'now it is numbers, 48,000 a second', 'media'],
      ['Network, Dante', 'numbers in packets, sharing a cable', 'media'],
      ['Console', 'arithmetic on the numbers, in a buffer', 'media'],
      ['Network again', 'back out to the amplifier', 'media'],
      ['D to A and amplifier', 'numbers become a voltage again', 'media'],
      ['Loudspeaker', 'a voltage becomes air pressure', 'media'],
      ['The seat, 20 m back', '58 ms of air nobody complains about', 'media'],
    ],
    clock: 'Word clock or PTP, holding every converter to the same instant',
    control: 'The operator moving a fader, and the desk telling the amplifier about it',
  },
  light: {
    label: 'A lighting cue',
    steps: [
      ['Operator presses GO', 'one event, once', 'control'],
      ['Console', 'works out a level for every channel, 44 times a second', 'control'],
      ['sACN over the network', 'a number per slot, repeated forever', 'control'],
      ['Gateway or node', 'packets become DMX on a cable', 'control'],
      ['Fixture', 'reads the slots at its address', 'control'],
      ['Dimmer curve', 'the number becomes a target brightness', 'control'],
      ['PWM driver', 'switching, thousands of times a second', 'control'],
      ['LED', 'photons, at last', 'control'],
      ['The stage', 'and only now is it a design decision', 'control'],
    ],
    clock: 'None required. This is why lighting survives a network that video cannot.',
    control: 'The whole chain is control. That is what makes it state rather than events.',
  },
  video: {
    label: 'A video cue',
    steps: [
      ['Content file', 'bytes on a disk, compressed', 'media'],
      ['Media server, decode', 'bytes become a raster in memory', 'media'],
      ['Composite and render', 'layers, effects, a canvas', 'media'],
      ['Output, SDI or NDI', 'a stream with a deadline every 40 ms', 'media'],
      ['Network or cable', 'sharing with everything else', 'media'],
      ['Processor', 'maps the canvas onto panels', 'media'],
      ['Receiving cards', 'each drives its group of panels', 'media'],
      ['Panels, PWM', 'switching, like the fixtures', 'media'],
      ['The wall', 'and the camera, which does not average', 'media'],
    ],
    clock: 'Genlock or PTP, so frames change at the same instant everywhere',
    control: 'The cue that started it, and the timecode that may be driving it',
  },
};

register('signal-chain', (host) => {
  let key = 'audio', step = 0, acc = 0;
  const { controls, stage, setNote } = figure(host, {
    title: 'Trace one signal, all the way',
    sub: 'Pick your department. Every arrow is a place it can go wrong, and every one of them is on the syllabus.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 320,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const c = CHAINS[key];
      acc += dt;
      if (acc > 1.5) { acc = 0; step = (step + 1) % c.steps.length; paint(); }

      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const n = c.steps.length;
      const rowH = 26, oy = 24;

      c.steps.forEach(([name, what, flow], i) => {
        const y = oy + i * rowH;
        const on = i === step, past = i < step;
        const col = flow === 'control' ? p.amber : p.cyan;
        if (i) line(g, ox + 12, y - rowH + 8, ox + 12, y - 6, { color: alpha(col, past || on ? 0.8 : 0.25), lw: 2 });
        g.fillStyle = on ? col : alpha(col, past ? 0.6 : 0.2);
        g.beginPath(); g.arc(ox + 12, y, on ? 6 : 4, 0, 7); g.fill();
        label(g, name, ox + 30, y, { color: on ? p.ink : (past ? p.ink2 : p.muted), size: 12, weight: on ? 700 : 500 });
        label(g, what, ox + 200, y, { color: on ? col : p.muted, size: 11 });
      });

      const fy = oy + n * rowH + 12;
      line(g, ox, fy - 6, ox + W, fy - 6, { color: p.line, lw: 1 });
      g.fillStyle = p.green; g.fillRect(ox, fy + 6, 10, 10);
      label(g, `clock: ${c.clock}`, ox + 17, fy + 11, { color: p.muted, size: 11 });
      g.fillStyle = p.amber; g.fillRect(ox, fy + 28, 10, 10);
      label(g, `control: ${c.control}`, ox + 17, fy + 33, { color: p.muted, size: 11 });
    },
  });

  function paint() {
    const c = CHAINS[key];
    const [name, what] = c.steps[step];
    setNote(`<b>${name}.</b> ${what.charAt(0).toUpperCase() + what.slice(1)}. Ask the three questions here: <b>what is it</b> at this point, <b>where is it going</b> next, and <b>what is its deadline</b>? If you can answer those at every stage of your own chain, you can diagnose it, and that is the whole of this module.`);
  }

  controls.append(
    choice('Department', Object.entries(CHAINS).map(([k, v]) => [k, v.label]), { value: 'audio', on: (v) => { key = v; step = 0; acc = 0; paint(); cv.once(); } }).node,
    button('Next stage ›', () => { step = (step + 1) % CHAINS[key].steps.length; acc = 0; paint(); cv.once(); }).node
  );
  paint();
});
