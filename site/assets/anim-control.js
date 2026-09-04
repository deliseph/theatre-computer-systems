// Animations for Class 4: control.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, h, el,
} from './anim-core.js';

// ============================================================================
// State based against event based, and what a lost packet costs
// ============================================================================

register('state-event', (host) => {
  const state = { cut: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why the light held and the video froze',
    sub: 'Cut the cable. One of these recovers by itself and one of them does not.',
    note: '&nbsp;',
  });

  let pk = [], spawn = 0, lastState = 50, cueFired = false, missedCue = false, cueTimer = 0;

  canvas(stage, {
    height: 250,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const x0 = 130, x1 = w - 150, cut = (x0 + x1) / 2;
      const yA = 74, yB = 172;

      // Lanes
      [[yA, 'DMX / sACN', 'state based', p.amber], [yB, 'OSC cue', 'event based', p.cyan]]
        .forEach(([y, name, kind, col]) => {
          line(g, x0, y, x1, y, { color: alpha(p.line, 1), lw: 8 });
          label(g, name, 10, y - 8, { color: col, size: 12.5, weight: 650 });
          label(g, kind, 10, y + 8, { color: p.muted, size: 10.5 });
        });

      // Spawns: state repeats constantly, events fire occasionally
      spawn += dt;
      if (spawn > 0.24) {
        spawn = 0;
        pk.push({ y: yA, x: x0, v: lastState, ev: false });
      }
      cueTimer += dt;
      if (cueTimer > 4.2) {
        cueTimer = 0;
        cueFired = false; missedCue = false;
        pk.push({ y: yB, x: x0, ev: true });
      }

      for (let i = pk.length - 1; i >= 0; i--) {
        const q = pk[i];
        q.x += 190 * dt;
        if (state.cut && q.x > cut) {
          if (q.ev) missedCue = true;
          pk.splice(i, 1);
          continue;
        }
        if (q.x > x1) {
          if (q.ev) { cueFired = true; }
          pk.splice(i, 1);
          continue;
        }
        box(g, q.x, q.y - 5, q.ev ? 16 : 10, 10, { fill: q.ev ? p.cyan : p.amber, stroke: 'transparent', r: 3 });
      }

      // The cut
      if (state.cut) {
        line(g, cut, 40, cut, hgt - 34, { color: p.red, lw: 2.5, dash: [5, 5] });
        label(g, 'CABLE PULLED', cut, 28, { color: p.red, size: 11, weight: 700, align: 'center' });
      }

      // Receivers
      box(g, x1 + 10, yA - 30, 128, 60, { fill: p.surface, stroke: p.line, r: 8 });
      label(g, 'Moving light', x1 + 74, yA - 14, { color: p.ink2, size: 11, align: 'center' });
      label(g, `${lastState}%`, x1 + 74, yA + 6, { color: p.amber, size: 20, weight: 700, align: 'center', mono: true });
      label(g, state.cut ? 'holding last value' : 'live', x1 + 74, yA + 22,
        { color: state.cut ? p.amber : p.muted, size: 9.5, align: 'center' });

      box(g, x1 + 10, yB - 30, 128, 60, { fill: p.surface, stroke: p.line, r: 8 });
      label(g, 'Video server', x1 + 74, yB - 14, { color: p.ink2, size: 11, align: 'center' });
      label(g, missedCue ? 'CUE LOST' : cueFired ? 'CUE 12 ✓' : 'waiting', x1 + 74, yB + 8,
        { color: missedCue ? p.red : cueFired ? p.green : p.muted, size: 14, weight: 700, align: 'center', mono: true });
      label(g, state.cut ? 'nothing happens, ever' : 'follows cues', x1 + 74, yB + 24,
        { color: state.cut ? p.red : p.muted, size: 9.5, align: 'center' });
    },
  });

  controls.append(
    toggle('Pull the network cable', { on: (v) => { state.cut = v; update(); } }).node,
    slider('Level being held', { min: 0, max: 100, step: 5, value: 50, fmt: (v) => `${v}%`, on: (v) => { lastState = v; } }).node
  );

  function update() {
    if (state.cut) setNote('<b>State survives, events do not.</b> The lighting stream repeats the same value about 44 times a second, so the node still has a valid last value and keeps outputting it. The video server was waiting for a single message that will now never arrive, so nothing happens at all. Reconnect and the light is instantly correct again; the video is still stuck.');
    else setNote('Both are running. Notice the difference in traffic: the state stream sends constantly whether anything changed or not, which looks wasteful and is exactly what makes it robust. The cue fires once. <b>Anything that must happen exactly once at exactly the right moment is the fragile part of your system.</b>');
  }
  update();
});

// ============================================================================
// The DMX512 frame, and where 44 Hz comes from
// ============================================================================

register('dmx-frame', (host) => {
  const state = { slots: 512 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Where 44 refreshes per second comes from',
    sub: 'The frame drawn to scale in time. Send fewer slots and the frame gets shorter.',
    note: '&nbsp;',
  });

  let sweep = 0;
  canvas(stage, {
    height: 210,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const bits = state.slots * 11;
      const dataMs = (bits / 250000) * 1000;
      const frameMs = dataMs + 0.5;
      const hz = 1000 / frameMs;

      const x0 = 24, x1 = w - 24, y = 74, hh = 40;
      const full = 23.0;                        // scale: a full 512 frame
      const wpx = (ms) => ((x1 - x0) * ms) / full;

      // Break, mark, start code, data
      let x = x0;
      const seg = (ms, col, name) => {
        const ww = Math.max(2, wpx(ms));
        box(g, x, y, ww, hh, { fill: alpha(col, 0.5), stroke: col, r: 3 });
        if (ww > 34) label(g, name, x + ww / 2, y + hh / 2, { color: p.ink, size: 10.5, weight: 600, align: 'center' });
        x += ww;
      };
      seg(0.088, p.red, 'break');
      seg(0.008, p.muted, '');
      seg(0.044, p.green, 'start');
      seg(dataMs, p.amber, `${state.slots} slots × 11 bits`);

      // Sweep showing the frame repeating in real time, slowed 40x
      sweep += (dt * 1000) / (frameMs * 40);
      if (sweep > 1) sweep -= 1;
      const sx = x0 + (x - x0) * sweep;
      line(g, sx, y - 12, sx, y + hh + 12, { color: p.ink, lw: 1.5 });

      label(g, '0 ms', x0, y + hh + 24, { color: p.muted, size: 10, mono: true });
      label(g, `${frameMs.toFixed(2)} ms`, x, y + hh + 24, { color: p.ink, size: 11, weight: 650, align: 'center', mono: true });

      const lines = [
        `${state.slots} slots × 11 bits = ${bits.toLocaleString()} bits`,
        `${bits.toLocaleString()} ÷ 250,000 bit/s = ${dataMs.toFixed(2)} ms of data`,
        `plus break and mark ≈ ${frameMs.toFixed(2)} ms per frame`,
        `1 ÷ ${(frameMs / 1000).toFixed(5)} s ≈ ${hz.toFixed(1)} frames per second`,
      ];
      lines.forEach((l, i) => label(g, l, x0, 140 + i * 17, { color: i === 3 ? p.amber : p.muted, size: 11.5, mono: true }));

      label(g, `${hz.toFixed(0)} Hz`, x1, 96, { color: p.amber, size: 30, weight: 700, align: 'right', mono: true });
    },
  });

  controls.append(
    slider('Slots transmitted', { min: 24, max: 512, step: 8, value: 512, fmt: (v) => `${v}`, on: (v) => { state.slots = v; update(); } }).node
  );

  function update() {
    const hz = 1000 / (((state.slots * 11) / 250000) * 1000 + 0.5);
    if (state.slots === 512) setNote('A full universe manages about <b>44 frames per second</b>, and that is the ceiling on how smooth a fast chase or a strobe can be. The protocol has no faster gear, so fast pixel effects need more universes, not a quicker one.');
    else setNote(`Sending only ${state.slots} slots gets you <b>${hz.toFixed(0)} Hz</b>. This is legal and it is a real technique: if your rig only uses the first ${state.slots} channels of a universe, a console that transmits a short frame refreshes faster.`);
  }
  update();
});

// ============================================================================
// Packing pixels into universes
// ============================================================================

register('universe-pack', (host) => {
  const state = { fixtures: 24, pixels: 40, mode: 4 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Where the universes actually go',
    sub: 'Each block is one universe of 512 channels. Watch how fast a pixel rig fills them, and watch the data rate stay tiny.',
    note: '&nbsp;',
  });

  canvas(stage, {
    height: 230,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const total = state.fixtures * state.pixels * state.mode;
      const uni = Math.max(1, Math.ceil(total / 512));
      const perRow = Math.max(6, Math.floor((w - 40) / 46));
      const cw = Math.min(44, (w - 40) / perRow);

      for (let i = 0; i < Math.min(uni, perRow * 3); i++) {
        const r = Math.floor(i / perRow), c = i % perRow;
        const x = 20 + c * cw, y = 32 + r * 46;
        const used = clamp(total - i * 512, 0, 512) / 512;
        box(g, x, y, cw - 6, 38, { fill: p.raised, stroke: p.line, r: 4 });
        box(g, x + 2, y + 38 - 2 - 34 * used, cw - 10, 34 * used, { fill: alpha(p.amber, 0.75), stroke: 'transparent', r: 3 });
        label(g, String(i + 1), x + (cw - 6) / 2, y + 19, { color: p.ink, size: 10, weight: 700, align: 'center', mono: true });
      }
      if (uni > perRow * 3) label(g, `… and ${uni - perRow * 3} more`, 20, 32 + 3 * 46 + 14, { color: p.muted, size: 11 });

      const y0 = hgt - 74;
      label(g, `${state.fixtures} × ${state.pixels} pixels × ${state.mode} ch = ${total.toLocaleString()} channels`,
        20, y0, { color: p.muted, size: 12, mono: true });
      label(g, `${total.toLocaleString()} ÷ 512 = ${(total / 512).toFixed(2)}  →  round up  →  ${uni} universes`,
        20, y0 + 19, { color: p.ink, size: 12.5, weight: 650, mono: true });
      label(g, `data rate  ${uni} × 0.25 = ${(uni * 0.25).toFixed(2)} Mbit/s on a 1000 Mbit/s link`,
        20, y0 + 40, { color: p.cyan, size: 12, mono: true });
      label(g, `${state.mode === 3 ? '512 ÷ 3 = 170 RGB pixels' : '512 ÷ 4 = 128 RGBW pixels'} per universe`,
        20, y0 + 59, { color: p.muted, size: 11, mono: true });
    },
  });

  controls.append(
    slider('Battens', { min: 1, max: 60, step: 1, value: 24, fmt: (v) => `${v}`, on: (v) => { state.fixtures = v; update(); } }).node,
    slider('Pixels each', { min: 4, max: 120, step: 4, value: 40, fmt: (v) => `${v}`, on: (v) => { state.pixels = v; update(); } }).node,
    choice('Pixel type', [[3, 'RGB'], [4, 'RGBW']], { value: 4, on: (v) => { state.mode = +v; update(); } }).node
  );

  function update() {
    const total = state.fixtures * state.pixels * state.mode;
    const uni = Math.max(1, Math.ceil(total / 512));
    setNote(`<b>${uni} universes, and ${(uni * 0.25).toFixed(2)} Mbit/s.</b> Read that data rate again: it is nothing on a gigabit link. Your constraints on a pixel rig are universe count, node port count and processing, never bandwidth. That is why lighting failures on a network are almost always addressing, and audio and video failures are almost always capacity or clock.`);
  }
  update();
});

// ============================================================================
// Timecode against cue based operation
// ============================================================================

register('timecode-vs-cue', (host) => {
  const state = { laugh: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Timecode is precise, and it does not listen',
    sub: 'Both shows are running the same sequence. Hold the audience laugh and watch what each one does.',
    note: '&nbsp;',
  });

  let tc = 0, cueClock = 0, cueIdx = 0, tcIdx = 0, held = 0;
  const CUES = [2, 4, 6, 8, 10];

  canvas(stage, {
    height: 250,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      tc += dt;
      if (tc > 12) { tc = 0; cueClock = 0; cueIdx = 0; tcIdx = 0; held = 0; }
      if (state.laugh) held += dt; else cueClock += dt;

      const x0 = 130, x1 = w - 30;
      const px = (s) => x0 + ((x1 - x0) * s) / 12;

      [[74, 'Timecode show', p.cyan, tc, tcIdx],
       [168, 'Cue based show', p.amber, cueClock, cueIdx]].forEach(([y, name, col, clock, idx]) => {
        line(g, x0, y, x1, y, { color: alpha(p.line, 1), lw: 6 });
        label(g, name, 10, y - 8, { color: col, size: 12.5, weight: 650 });
        CUES.forEach((c, i) => {
          const fired = clock >= c;
          box(g, px(c) - 5, y - 13, 10, 26, {
            fill: fired ? col : alpha(col, 0.15), stroke: alpha(col, 0.8), r: 3,
          });
          label(g, String(i + 1), px(c), y + 26, { color: fired ? col : p.muted, size: 10, align: 'center', mono: true });
        });
        const hx = clamp(px(clock), x0, x1);
        line(g, hx, y - 22, hx, y + 22, { color: p.ink, lw: 2 });
      });

      const mm = String(Math.floor(tc / 60)).padStart(2, '0');
      const ss = String(Math.floor(tc % 60)).padStart(2, '0');
      const ff = String(Math.floor((tc % 1) * 25)).padStart(2, '0');
      label(g, `00:${mm}:${ss}:${ff}`, 10, 44, { color: p.cyan, size: 14, weight: 700, mono: true });

      if (state.laugh) {
        box(g, x0, 206, x1 - x0, 30, { fill: alpha(p.red, 0.16), stroke: alpha(p.red, 0.6), r: 6 });
        label(g, `audience laughing for ${held.toFixed(1)} s — the operator is holding`, (x0 + x1) / 2, 221,
          { color: p.red, size: 12, weight: 600, align: 'center' });
      }
      label(g, `drift between the two shows: ${held.toFixed(1)} s`, 10, 226,
        { color: held > 0.4 ? p.red : p.muted, size: 11, mono: true });
    },
  });

  controls.append(
    toggle('Hold for the laugh', { on: (v) => { state.laugh = v; update(); } }).node,
    button('Restart', () => { tc = 0; cueClock = 0; held = 0; }).node
  );

  function update() {
    if (state.laugh) setNote('<b>The timecode show does not wait.</b> Its cues keep firing against the clock while the operator holds the cue based show for the laugh. Every department following timecode stays together, and every one of them is now ahead of the performance.');
    else setNote('Both are in step. In cue based operation an operator presses GO and everything is relative to that press, so the show breathes with the performance. In timecode operation every department follows the same clock independently, which is decentralised, repeatable and precise to a frame. <b>Which is correct depends entirely on the work, and that is an artistic decision made on technical grounds.</b>');
  }
  update();
});
