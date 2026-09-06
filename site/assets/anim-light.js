// Lighting, from the DMX value down to the light: dimmer curves, what 8 bit
// costs at the bottom of a fade, PWM against a camera shutter, a fixture
// personality channel by channel, and patching arithmetic.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, labelWrap, line, alpha, clamp, lerp, fitter,
} from './anim-core.js';

const mono = { mono: true };

// CIE lightness, the standard model of how bright a luminance looks.
const Lstar = (Y) => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y) / 100;

const CURVES = {
  linear: { label: 'Linear', fn: (u) => u },
  square: { label: 'Square law', fn: (u) => u * u },
  scurve: { label: 'S curve', fn: (u) => u * u * (3 - 2 * u) },
  tung: { label: 'Tungsten emulation', fn: (u) => Math.pow(u, 1.8) },
};

// ============================================================================
// 1. Dimmer curves: the fader is not the light
// ============================================================================

register('dim-curve', (host) => {
  const st = { curve: 'square', dmx: 128 };
  const { controls, stage, setNote } = figure(host, {
    title: 'What a DMX level actually does to the light',
    sub: 'The fader is a request, not a measurement. Between the number and the photons sits a curve, and it decides how the fade feels.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const S = Math.min(232, w - 250);
      const ox = Math.max(12, (w - (S + 230)) / 2), oy = 20;

      box(g, ox, oy, S, S, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      line(g, ox, oy + S, ox + S, oy, { color: alpha(p.muted, 0.45), lw: 1, dash: [4, 4] });

      // Every curve faint, the chosen one solid.
      for (const [k, c] of Object.entries(CURVES)) {
        g.beginPath();
        for (let i = 0; i <= S; i++) { const u = i / S; g.lineTo(ox + i, oy + S - c.fn(u) * S); }
        g.strokeStyle = k === st.curve ? p.amber : alpha(p.muted, 0.28);
        g.lineWidth = k === st.curve ? 2.4 : 1;
        g.stroke();
      }
      // Perceived brightness of the chosen curve.
      g.beginPath();
      for (let i = 0; i <= S; i++) { const u = i / S; g.lineTo(ox + i, oy + S - Lstar(CURVES[st.curve].fn(u)) * S); }
      g.strokeStyle = p.cyan; g.lineWidth = 2; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);

      const u = st.dmx / 255;
      const outp = CURVES[st.curve].fn(u);
      const perc = Lstar(outp);
      const fx = ox + u * S;
      line(g, fx, oy, fx, oy + S, { color: p.ink, lw: 1.2 });
      g.fillStyle = p.amber; g.beginPath(); g.arc(fx, oy + S - outp * S, 4, 0, 7); g.fill();
      g.fillStyle = p.cyan; g.beginPath(); g.arc(fx, oy + S - perc * S, 4, 0, 7); g.fill();

      label(g, 'DMX value', ox + S / 2, oy + S + 16, { color: p.muted, size: 10.5, align: 'center', ...mono });
      label(g, 'out', ox + 6, oy + 10, { color: p.muted, size: 10.5, ...mono });

      // The readout, and a strip showing what the fade looks like.
      const rx = ox + S + 24;
      let ry = oy + 6;
      const row = (lbl, val, col) => {
        label(g, lbl, rx, ry, { color: p.muted, size: 11, ...mono });
        label(g, val, rx, ry + 17, { color: col, size: 15, weight: 700, ...mono });
        ry += 44;
      };
      row('DMX value', `${st.dmx}  of 255`, p.ink);
      row('light out', `${(outp * 100).toFixed(1)} %`, p.amber);
      row('how bright it looks', `${(perc * 100).toFixed(1)} %`, p.cyan);

      const stw = Math.min(200, w - rx - 16);
      label(g, 'the whole fade, as seen', rx, ry - 6, { color: p.muted, size: 10.5 });
      for (let i = 0; i < stw; i++) {
        const v = CURVES[st.curve].fn(i / stw);
        const q = Math.round(Math.pow(v, 1 / 2.2) * 255);
        g.fillStyle = `rgb(${q},${Math.round(q * 0.94)},${Math.round(q * 0.8)})`;
        g.fillRect(rx + i, ry + 4, 1.4, 34);
      }
      box(g, rx, ry + 4, stw, 34, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
    },
  });

  const upd = () => {
    cv.once();
    const u = st.dmx / 255, outp = CURVES[st.curve].fn(u), perc = Lstar(outp);
    if (st.curve === 'linear') setNote(`<b>Linear.</b> At DMX ${st.dmx} the lamp emits ${(outp * 100).toFixed(0)} percent of its light, and your eye reports about ${(perc * 100).toFixed(0)} percent. That gap is the problem: the top half of the fader does almost nothing you can see, and everything happens in the bottom. A designer calling for a slow fade to black on a linear curve gets a fade that sits still and then falls off a cliff.`);
    else if (st.curve === 'square') setNote(`<b>Square law.</b> Output is the square of the fader, which almost exactly cancels the cube root in your eye’s response. At DMX ${st.dmx} you get ${(outp * 100).toFixed(0)} percent of the light and it looks like ${(perc * 100).toFixed(0)} percent, so <b>fader position and apparent brightness move together</b>. This is the default on most consoles, and this is why.`);
    else if (st.curve === 'tung') setNote('<b>Tungsten emulation.</b> An LED responds instantly and a filament does not: it takes time to heat and longer to cool, so a real tungsten fade has a lag and a warm tail. A fixture doing this is faking thermal mass, and the reason to bother is that a bump on a tungsten rig and a bump on an LED rig read as different events from the seat.');
    else setNote('<b>S curve.</b> Slow at both ends, quick in the middle. Useful when you want a fade to arrive and settle rather than land, and worth knowing exists so that you recognise it when someone else has set it and your fade times stop behaving.');
  };

  controls.append(
    choice('Curve', Object.entries(CURVES).map(([k, c]) => [k, c.label]), { value: 'square', on: (v) => { st.curve = v; upd(); } }).node,
    slider('Fader', { min: 0, max: 255, step: 1, value: 128, fmt: (v) => `DMX ${v}`, on: (v) => { st.dmx = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. Where 8 bit dimming runs out: the bottom of the fade
// ============================================================================

register('dim-resolution', (host) => {
  const st = { curve: 'square', speed: 1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why a slow fade to black steps, and 16 bit fixes it',
    sub: 'The same fade at 8 bit and at 16 bit. Watch the bottom of the 8 bit one: the steps are not in the console, they are in the arithmetic.',
    note: '&nbsp;',
  });

  let t0 = 0;
  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const cyc = 9 / st.speed;
      const ph = ((t % cyc) / cyc);
      const u = 1 - ph;                                  // a fade from full to out
      const fn = CURVES[st.curve].fn;

      const band = (y, bits, title) => {
        const steps = 2 ** bits;
        const q = Math.round(u * (steps - 1)) / (steps - 1);
        const outp = fn(q);
        const q8 = Math.round(Math.pow(outp, 1 / 2.2) * 255);
        box(g, ox, y, W * 0.46, 74, { fill: `rgb(${q8},${Math.round(q8 * 0.94)},${Math.round(q8 * 0.8)})`, stroke: p.line, r: 6, lw: 1 });
        label(g, title, ox, y - 9, { color: p.ink2, size: 11.5, weight: 650 });
        const rx = ox + W * 0.5;
        label(g, `level ${Math.round(q * (steps - 1))} of ${steps - 1}`, rx, y + 16, { color: p.ink2, size: 11.5, ...mono });
        label(g, `light out ${(outp * 100).toFixed(3)} %`, rx, y + 36, { color: p.amber, size: 11.5, ...mono });
        // Size of one step, right here, as a share of where we are.
        const lower = Math.max(0, Math.round(u * (steps - 1)) - 1) / (steps - 1);
        const jump = outp > 0 ? ((outp - fn(lower)) / outp) * 100 : 0;
        label(g, `one step from here changes it by ${jump > 200 ? '>200' : jump.toFixed(1)} %`, rx, y + 56,
          { color: jump > 12 ? p.red : p.muted, size: 11.5, ...mono });
        return jump;
      };

      const j8 = band(28, 8, '8 bit dimmer, 256 levels');
      band(146, 16, '16 bit dimmer, 65,536 levels');

      // A progress bar for the fade itself.
      box(g, ox, 244, W, 8, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 4 });
      box(g, ox, 244, W * u, 8, { fill: alpha(p.cyan, 0.6), stroke: 'transparent', r: 4 });
      label(g, `fade at ${(u * 100).toFixed(0)} %`, ox, 232, { color: p.muted, size: 10.5, ...mono });
      return j8;
    },
  });

  const upd = () => {
    setNote(`<b>The steps are not evenly spaced in light.</b> At the top of a fade, one step of an 8 bit dimmer is a fraction of a percent and invisible. At the bottom, one step is a large share of what is left, because ${st.curve === 'linear' ? 'the level is already tiny' : 'the curve is squaring a small number'}. So a fade that is smooth for four seconds falls apart in the last half second, always in the same place. 16 bit puts 256 intermediate levels between every one of those steps, which is the entire reason a fixture offers a fine channel.`);
  };

  controls.append(
    choice('Curve', Object.entries(CURVES).map(([k, c]) => [k, c.label]), { value: 'square', on: (v) => { st.curve = v; upd(); } }).node,
    slider('Fade speed', { min: 0.5, max: 3, step: 0.1, value: 1, fmt: (v) => `${v.toFixed(1)}x`, on: (v) => { st.speed = v; } }).node
  );
  upd();
});

// ============================================================================
// 3. PWM against a camera shutter
// ============================================================================

register('pwm-flicker', (host) => {
  const st = { freq: 480, duty: 45, shutter: 250, rolling: true };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'How an LED dims, and why the camera sees bands',
    sub: 'An LED does not dim. It switches, fast, and stays on for part of each cycle. Your eye averages it. A shutter does not.',
    note: '&nbsp;',
  });

  challenge('Get a clean frame on a 1/1000 shutter without turning the dimmer up.',
    () => st.shutter === 1000 && (1 / st.shutter) / (1 / st.freq) > 40);

  let cv;
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const d = st.duty / 100;
      const period = 1 / st.freq;
      const expo = 1 / st.shutter;

      // The drive waveform over a window sized so a few cycles are visible.
      const win = Math.max(period * 4, expo * 1.6);
      const wy = 52, amp = 26;
      label(g, `drive to the LED: ${st.freq.toLocaleString('en-US')} Hz, ${st.duty} % duty`, ox, 16,
        { color: p.ink, size: 11.5, weight: 650 });
      label(g, `window shown: ${(win * 1000).toFixed(2)} ms`, ox + W, 16, { color: p.muted, size: 10.5, align: 'right', ...mono });
      g.beginPath();
      for (let i = 0; i <= W; i++) {
        const tt = (i / W) * win + t * 0.02;
        const on = (tt % period) / period < d;
        g.lineTo(ox + i, wy - (on ? amp : -amp) * 0.5);
      }
      g.strokeStyle = p.amber; g.lineWidth = 2; g.stroke();
      line(g, ox, wy + amp * 0.5, ox + W, wy + amp * 0.5, { color: alpha(p.line, 0.6), lw: 1 });

      // One exposure window, drawn to scale against it.
      const ew = Math.min(W, (expo / win) * W);
      box(g, ox, wy - amp - 10, ew, amp * 1.6, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 3, lw: 1.2 });
      label(g, `one exposure at 1/${st.shutter}`, ox + 6, wy - amp - 20, { color: p.cyan, size: 10.5, ...mono });

      // Simulated camera frame. Each row starts a hair later on a rolling
      // shutter, so each row integrates a different slice of the waveform.
      const fy = 118, fh = 132, fw = Math.min(W, 420), fx = ox + (W - fw) / 2;
      const rows = 66;
      const cycles = expo / period;
      let mn = 1, mx = 0;
      for (let r = 0; r < rows; r++) {
        const start = (st.rolling ? (r / rows) * (1 / 50) : 0) + t * 0.37;
        // Integrate the square wave over the exposure, exactly.
        const full = Math.floor(cycles);
        const rem = cycles - full;
        const ph0 = ((start % period) / period);
        let onTime = full * d;
        const a = ph0, b = ph0 + rem;
        const overlap = (lo, hi) => Math.max(0, Math.min(hi, d) - Math.max(lo, 0)) + Math.max(0, Math.min(hi - 1, d) - Math.max(lo - 1, 0));
        onTime += overlap(a, b);
        const lvl = clamp(onTime / cycles, 0, 1);
        mn = Math.min(mn, lvl); mx = Math.max(mx, lvl);
        const q = Math.round(Math.pow(lvl, 1 / 2.2) * 235) + 10;
        g.fillStyle = `rgb(${q},${Math.round(q * 0.95)},${Math.round(q * 0.82)})`;
        g.fillRect(fx, fy + (r / rows) * fh, fw, fh / rows + 1);
      }
      box(g, fx, fy, fw, fh, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      label(g, 'what the camera records', fx, fy - 9, { color: p.ink2, size: 11.5, weight: 650 });
      const spread = (mx - mn) * 100;
      label(g, spread < 1.2 ? 'even, no visible banding' : `banding: ${spread.toFixed(0)} % variation top to bottom`,
        fx, fy + fh + 18, { color: spread < 1.2 ? p.green : p.red, size: 12, weight: 650 });
      label(g, `cycles captured per exposure: ${cycles.toFixed(1)}`, fx, fy + fh + 38,
        { color: p.muted, size: 11, ...mono });
    },
  });

  const upd = () => {
    const cycles = (1 / st.shutter) / (1 / st.freq);
    if (cycles > 40) setNote(`<b>${cycles.toFixed(0)} PWM cycles inside one exposure.</b> Every row averages so many cycles that they all come out the same, and the frame is clean. This is what a fixture means by "flicker free": not that it stopped switching, but that it switches far faster than any shutter you are likely to use.`);
    else if (cycles < 4) setNote(`Only ${cycles.toFixed(1)} cycles inside one exposure, and a rolling shutter starts every row at a different moment. Each row therefore catches a different amount of on time, and you get <b>bands</b>. Nothing is broken: the fixture is doing exactly what it was told. Fix it by raising the PWM frequency in the fixture menu, by slowing the shutter, or by using a fixture with a higher PWM rate.`);
    else setNote(`${cycles.toFixed(1)} cycles per exposure. Marginal, which is the worst place to be: it will look fine on the monitor in the room and show up on the broadcast feed. Test with the actual camera at the actual shutter, not by eye.`);
  };

  controls.append(
    slider('PWM frequency', { min: 120, max: 25000, step: 20, value: 480, fmt: (v) => `${v.toLocaleString('en-US')} Hz`, on: (v) => { st.freq = v; upd(); } }).node,
    slider('Dimmer level (duty)', { min: 2, max: 100, step: 1, value: 45, fmt: (v) => `${v} %`, on: (v) => { st.duty = v; upd(); } }).node,
    choice('Shutter', [['50', '1/50'], ['250', '1/250'], ['1000', '1/1000'], ['4000', '1/4000']], { value: '250', on: (v) => { st.shutter = +v; upd(); } }).node,
    toggle('Rolling shutter', { value: true, on: (v) => { st.rolling = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 4. A fixture personality, channel by channel
// ============================================================================

const PERSONALITY = [
  ['Pan', 'coarse'], ['Pan fine', 'fine'], ['Tilt', 'coarse'], ['Tilt fine', 'fine'],
  ['Dimmer', 'level'], ['Strobe', 'level'], ['Colour', 'wheel'], ['Gobo', 'wheel'],
];
const WHEEL = [
  [0, 'open', [255, 250, 236]], [32, 'CTO', [255, 214, 150]], [64, 'red', [255, 60, 52]],
  [96, 'amber', [255, 160, 40]], [128, 'green', [50, 220, 110]], [160, 'blue', [60, 110, 255]],
  [192, 'congo', [90, 40, 220]], [224, 'magenta', [230, 60, 190]],
];

register('fixture-channels', (host) => {
  const st = { panC: 128, panF: 0, tiltC: 150, dim: 200, colour: 0, strobe: 0, addr: 101 };
  const { controls, stage, setNote } = figure(host, {
    title: 'A fixture personality, channel by channel',
    sub: 'Eight slots, starting at one address. Move a slider and watch which part of the light it owns.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 320,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const stageW = Math.min(300, W * 0.52), stageH = 180;
      const sx = ox, sy = 22;

      // The stage, seen from the front.
      box(g, sx, sy, stageW, stageH, { fill: '#0e1420', stroke: p.line, r: 4, lw: 1 });
      g.save();
      g.beginPath(); g.rect(sx + 1, sy + 1, stageW - 2, stageH - 2); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(sx, sy + stageH - 26, stageW, 26);

      const pan16 = st.panC * 256 + st.panF;
      const bx = sx + stageW * (0.08 + 0.84 * (pan16 / 65535));
      const by = sy + 22 + (stageH - 74) * (st.tiltC / 255);
      const col = WHEEL.reduce((a, c) => (st.colour >= c[0] ? c : a), WHEEL[0]);
      const strobeOn = st.strobe < 8 ? 1 : (Math.sin(t * (2 + st.strobe / 10)) > 0 ? 1 : 0.06);
      const inten = (st.dim / 255) * strobeOn;

      const fx = sx + stageW / 2, fy = sy + 8;
      const grd = g.createLinearGradient(fx, fy, bx, by);
      grd.addColorStop(0, `rgba(${col[2][0]},${col[2][1]},${col[2][2]},${0.42 * inten})`);
      grd.addColorStop(1, `rgba(${col[2][0]},${col[2][1]},${col[2][2]},${0.10 * inten})`);
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(fx - 5, fy); g.lineTo(fx + 5, fy);
      g.lineTo(bx + 26, by + 10); g.lineTo(bx - 26, by + 10); g.closePath(); g.fill();
      const pg = g.createRadialGradient(bx, by, 1, bx, by, 30);
      pg.addColorStop(0, `rgba(${col[2][0]},${col[2][1]},${col[2][2]},${0.95 * inten})`);
      pg.addColorStop(1, `rgba(${col[2][0]},${col[2][1]},${col[2][2]},0)`);
      g.fillStyle = pg; g.beginPath(); g.arc(bx, by, 30, 0, 7); g.fill();
      box(g, fx - 9, fy - 3, 18, 12, { fill: '#2a3446', stroke: '#4a5668', r: 2, lw: 1 });
      g.restore();
      label(g, `colour wheel: ${col[1]}`, sx, sy + stageH + 16, { color: p.muted, size: 11 });

      // The slot map: which universe address each value is written to.
      const rx = ox + stageW + 22;
      const vals = [st.panC, st.panF, st.tiltC, 0, st.dim, st.strobe, st.colour, 0];
      label(g, `patched at address ${st.addr}, 8 slots`, rx, 16, { color: p.ink, size: 11.5, weight: 650 });
      PERSONALITY.forEach(([n, kind], i) => {
        const y = 34 + i * 27;
        const live = [0, 1, 2, 4, 5, 6].includes(i);
        label(g, String(st.addr + i).padStart(3, ' '), rx, y, { color: p.muted, size: 11, ...mono });
        label(g, n, rx + 34, y, { color: live ? p.ink2 : p.muted, size: 11.5 });
        const bw = Math.min(88, w - rx - 150);
        box(g, rx + 118, y - 7, bw, 14, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 3 });
        box(g, rx + 118, y - 7, Math.max(2, (bw * vals[i]) / 255),
          14, { fill: alpha(kind === 'fine' ? p.cyan : p.amber, 0.65), stroke: 'transparent', r: 3 });
        label(g, String(vals[i]).padStart(3, ' '), rx + 124 + bw, y, { color: p.ink2, size: 11, ...mono });
      });
      label(g, `pan as 16 bit: ${st.panC} × 256 + ${st.panF} = ${pan16.toLocaleString('en-US')} of 65,535`,
        rx, 34 + 8 * 27 + 6, { color: p.cyan, size: 11, ...mono });
    },
  });

  const upd = () => {
    if (st.panF > 0 && st.panC === 128) setNote(`<b>The fine channel.</b> Coarse ${st.panC} plus fine ${st.panF} is position ${(st.panC * 256 + st.panF).toLocaleString('en-US')} out of 65,535. One step of coarse moves the beam by 256 fine steps: on a long throw that is a visible jump, and it is why a slow pan on 8 bit stutters. Two slots buy you a movement that arrives smoothly.`);
    else if (st.strobe > 8) setNote('<b>Strobe on one slot.</b> One byte covering a whole behaviour, split into ranges: a band for off, a band for speed, sometimes bands for random and for pulse. This is why the manual’s channel chart is not optional reading, and why the same DMX value means different things on two fixtures.');
    else setNote('<b>Eight slots, one address.</b> The fixture reads the slot at its address and the seven after it, and it is the fixture, not the desk, that decides what each one means. Change the mode in the menu and the map changes underneath a patch that still looks correct. That mismatch is the most common reason a light does the wrong thing.');
  };

  controls.append(
    slider('Pan coarse', { min: 0, max: 255, value: 128, fmt: (v) => v, on: (v) => { st.panC = v; upd(); } }).node,
    slider('Pan fine', { min: 0, max: 255, value: 0, fmt: (v) => v, on: (v) => { st.panF = v; upd(); } }).node,
    slider('Tilt', { min: 0, max: 255, value: 150, fmt: (v) => v, on: (v) => { st.tiltC = v; upd(); } }).node,
    slider('Dimmer', { min: 0, max: 255, value: 200, fmt: (v) => v, on: (v) => { st.dim = v; upd(); } }).node,
    slider('Colour', { min: 0, max: 255, value: 0, fmt: (v) => v, on: (v) => { st.colour = v; upd(); } }).node,
    slider('Strobe', { min: 0, max: 255, value: 0, fmt: (v) => v, on: (v) => { st.strobe = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. Patching arithmetic, and the overlap that causes it
// ============================================================================

register('dmx-patch', (host) => {
  // The figure opens on the mistake it is about. It used to open on a clean
  // patch that already satisfied its own goal, so the goal marked itself done
  // the moment anything was touched and asked the student for nothing.
  //
  // As it stands: Spot 1 is in its 8 channel mode at 17, and the batten
  // underneath it starts at 21, so four slots are already claimed twice.
  const fixtures = [
    { name: 'Wash 1', addr: 1, fp: 8, col: 'amber' },
    { name: 'Wash 2', addr: 9, fp: 8, col: 'cyan' },
    { name: 'Spot 1', addr: 17, fp: 8, col: 'green' },
    { name: 'Batten', addr: 21, fp: 60, col: 'red' },
  ];
  let sel = 2;
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'Patching is addition, and the mistake is always the same',
    sub: 'Each fixture owns a run of slots starting at its address. Move one and watch what it lands on.',
    note: '&nbsp;',
  });

  challenge('Spot 1 needs its 24 channel mode. Give it one, then find it an address where nothing is claimed twice.',
    () => {
      const f = fixtures[2];
      if (f.fp !== 24) return false;
      // A fixture that runs past 512 is a patch error too, and the picture
      // stops at 512, so the test has to as well or it would pass something
      // the student cannot see.
      if (fixtures.some((x) => x.addr + x.fp - 1 > 512)) return false;
      const own = new Array(513).fill(-1);
      let clash = 0;
      fixtures.forEach((x, i) => {
        for (let s = x.addr; s < x.addr + x.fp && s <= 512; s++) { if (own[s] >= 0) clash++; else own[s] = i; }
      });
      return clash === 0;
    });

  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const perRow = 64, rows = 8, cw = W / perRow, rh = 15;
      const oy = 30;

      // Which fixture owns each slot, and where two of them collide.
      const owner = new Array(513).fill(-1);
      const clash = new Set();
      fixtures.forEach((f, i) => {
        for (let s = f.addr; s < f.addr + f.fp && s <= 512; s++) {
          if (owner[s] >= 0) clash.add(s); else owner[s] = i;
        }
      });

      label(g, 'one universe, 512 slots', ox, 16, { color: p.ink, size: 11.5, weight: 650 });
      for (let s = 1; s <= 512; s++) {
        const r = ((s - 1) / perRow) | 0, c = (s - 1) % perRow;
        const x = ox + c * cw, y = oy + r * rh;
        const o = owner[s - 1 + 1];
        let fill = alpha(p.line, 0.32);
        if (clash.has(s)) fill = p.red;
        else if (o >= 0) fill = alpha(p[fixtures[o].col], 0.75);
        g.fillStyle = fill;
        g.fillRect(x, y, Math.max(1, cw - 0.5), rh - 2);
      }
      for (let r = 0; r < rows; r++) {
        label(g, String(r * perRow + 1).padStart(3, ' '), ox - 6, oy + r * rh + rh / 2 - 1,
          { color: p.muted, size: 9.5, align: 'right', ...mono });
      }

      let y = oy + rows * rh + 24;
      fixtures.forEach((f, i) => {
        const on = i === sel;
        g.fillStyle = alpha(p[f.col], 0.75); g.fillRect(ox, y - 6, 11, 11);
        label(g, `${f.name}`, ox + 18, y, { color: on ? p.ink : p.ink2, size: 11.5, weight: on ? 700 : 500 });
        label(g, `address ${String(f.addr).padStart(3, ' ')}   footprint ${String(f.fp).padStart(2, ' ')}   uses ${f.addr} to ${f.addr + f.fp - 1}`,
          ox + 96, y, { color: p.muted, size: 11, ...mono });
        y += 22;
      });
      const n = clash.size;
      label(g, n ? `${n} slots claimed by two fixtures` : 'no overlaps, every fixture has its own run',
        ox, y + 10, { color: n ? p.red : p.green, size: 12.5, weight: 700 });
      const last = fixtures.reduce((a, f) => Math.max(a, f.addr + f.fp - 1), 0);
      label(g, `next free address: ${last + 1}   ·   ${512 - last} slots left`, ox, y + 30,
        { color: p.muted, size: 11.5, ...mono });
    },
  });

  const upd = () => {
    cv.once();
    const f = fixtures[sel];
    const owner = new Array(513).fill(-1);
    let n = 0;
    fixtures.forEach((x, i) => {
      for (let s = x.addr; s < x.addr + x.fp && s <= 512; s++) { if (owner[s] >= 0) n++; else owner[s] = i; }
    });
    if (n) setNote(`<b>${n} slots claimed twice.</b> Both fixtures are reading the same numbers, so both obey them, and the symptom is a light that half works: the right colour, the wrong movement, or a fixture that flickers when a completely different one is moved. Nothing on the desk shows this. The fix is arithmetic, not a reboot: <b>next address = this address + this footprint</b>.`);
    else setNote(`<b>${f.name} sits at ${f.addr} and owns ${f.fp} slots, ${f.addr} to ${f.addr + f.fp - 1}.</b> The footprint comes from the fixture’s mode, so changing the mode in the fixture menu changes the footprint without changing the patch, and a rig that was clean this morning has overlaps this afternoon. Leave gaps when you patch. They cost nothing and they save an hour.`);
  };

  controls.append(
    choice('Fixture', fixtures.map((f, i) => [String(i), f.name]), { value: '2', on: (v) => { sel = +v; upd(); } }).node,
    slider('Address', { min: 1, max: 460, step: 1, value: 17, fmt: (v) => v, on: (v) => { fixtures[sel].addr = v; upd(); } }).node,
    choice('Mode (footprint)', [['8', '8 ch'], ['16', '16 ch'], ['24', '24 ch'], ['60', '60 ch']], { value: '8', on: (v) => { fixtures[sel].fp = +v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 6. Two sources, one channel: HTP, LTP and what a merge actually decides
// ============================================================================

register('htp-ltp', (host) => {
  const st = { mode: 'htp', a: 180, b: 60, lastA: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'Two desks, one channel, one answer',
    sub: 'When two sources claim the same slot, something has to decide. Which rule is in force changes what the audience sees.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 260,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(540, w - 24), ox = (w - W) / 2;
      const out = st.mode === 'htp' ? Math.max(st.a, st.b) : (st.lastA ? st.a : st.b);
      const winner = st.mode === 'htp' ? (st.a >= st.b ? 'A' : 'B') : (st.lastA ? 'A' : 'B');

      const src = (x, name, v, on) => {
        box(g, x, 24, 150, 62, { fill: on ? alpha(p.amber, 0.16) : alpha(p.raised, 0.6), stroke: on ? p.amber : p.line, r: 8, lw: on ? 2 : 1 });
        label(g, name, x + 12, 44, { color: on ? p.ink : p.ink2, size: 12, weight: 650 });
        label(g, `level ${v}`, x + 12, 66, { color: p.muted, size: 11.5, ...mono });
        const bw = 126;
        box(g, x + 12, 74, bw, 6, { fill: alpha(p.line, 0.5), stroke: 'transparent', r: 3 });
        box(g, x + 12, 74, Math.max(2, (bw * v) / 255), 6, { fill: on ? p.amber : p.muted, stroke: 'transparent', r: 3 });
      };
      src(ox, 'Console A', st.a, winner === 'A');
      src(ox + W - 150, 'Console B', st.b, winner === 'B');

      const mx = ox + W / 2, my = 130;
      box(g, mx - 58, my - 18, 116, 36, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 8, lw: 1.4 });
      label(g, st.mode === 'htp' ? 'HTP merge' : 'LTP merge', mx, my, { color: p.cyan, size: 12, weight: 700, align: 'center' });
      line(g, ox + 75, 90, mx - 40, my - 20, { color: alpha(p.amber, winner === 'A' ? 0.9 : 0.25), lw: 2 });
      line(g, ox + W - 75, 90, mx + 40, my - 20, { color: alpha(p.amber, winner === 'B' ? 0.9 : 0.25), lw: 2 });

      // The lamp.
      const ly = 210;
      const q = Math.round(Math.pow(out / 255, 1 / 2.2) * 255);
      line(g, mx, my + 18, mx, ly - 24, { color: alpha(p.cyan, 0.6), lw: 2 });
      const rg = g.createRadialGradient(mx, ly, 1, mx, ly, 34);
      rg.addColorStop(0, `rgba(${q},${Math.round(q * 0.94)},${Math.round(q * 0.78)},0.95)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(mx, ly, 34, 0, 7); g.fill();
      label(g, `output ${out}`, mx, ly + 44, { color: p.ink, size: 13, weight: 700, align: 'center', ...mono });
      label(g, `console ${winner} wins`, mx, ly + 62, { color: p.muted, size: 11, align: 'center' });
    },
  });

  const upd = () => {
    cv.once();
    if (st.mode === 'htp') setNote('<b>HTP, highest takes precedence.</b> The bigger number wins, always. Safe, because nobody can ever black out a channel somebody else is using, and that is why it is the traditional rule for dimmers. The cost: <b>you cannot take a light out</b> while another source is holding it up, so a busking desk left at 30 percent quietly puts a floor under the whole show.');
    else setNote('<b>LTP, latest takes precedence.</b> Whoever moved last owns it, whatever the level. Necessary for moving lights, because a colour or a position is not a quantity you can take the maximum of: the highest of red and blue is not a colour. The cost is that a stray source can steal a channel and nothing about the numbers tells you which one did.');
  };

  controls.append(
    choice('Merge rule', [['htp', 'HTP, highest wins'], ['ltp', 'LTP, latest wins']], { value: 'htp', on: (v) => { st.mode = v; upd(); } }).node,
    slider('Console A', { min: 0, max: 255, value: 180, fmt: (v) => v, on: (v) => { st.a = v; st.lastA = true; upd(); } }).node,
    slider('Console B', { min: 0, max: 255, value: 60, fmt: (v) => v, on: (v) => { st.b = v; st.lastA = false; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 7. Tracking against cue only, which is where the confusion lives
// ============================================================================

register('cue-tracking', (host) => {
  const CH = ['warm wash', 'cool wash', 'special', 'cyc'];
  // Recorded cues. null means "this cue says nothing about this channel".
  const base = [
    [80, 0, 0, 40],
    [80, 0, 100, 40],
    [null, 60, 100, null],
    [null, null, 0, null],
    [0, 0, 0, 0],
  ];
  let st = { tracking: true, edit: 60, cue: 2, ch: 1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Tracking, and why your change appeared in a cue you never touched',
    sub: 'A cue list holds changes, not states. Whether an edit runs forward is the single most confusing idea in lighting control.',
    note: '&nbsp;',
  });

  function resolve() {
    const cues = base.map((r) => r.slice());
    cues[st.cue][st.ch] = st.edit;
    const live = [];
    let cur = [0, 0, 0, 0];
    cues.forEach((row) => {
      cur = cur.map((v, i) => (row[i] === null ? (st.tracking ? v : 0) : row[i]));
      live.push(cur.slice());
    });
    return { cues, live };
  }

  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const { cues, live } = resolve();
      const colW = Math.min(96, (W - 74) / 4), oy = 44;

      label(g, 'cue', ox, 26, { color: p.muted, size: 11, ...mono });
      CH.forEach((c, i) => label(g, c, ox + 74 + i * colW + colW / 2, 26,
        { color: p.muted, size: 10.5, align: 'center' }));

      cues.forEach((row, r) => {
        const y = oy + r * 42;
        label(g, String(r + 1), ox, y + 14, { color: p.ink2, size: 12, weight: 650, ...mono });
        row.forEach((v, i) => {
          const x = ox + 74 + i * colW;
          const recorded = v !== null;
          const val = live[r][i];
          const edited = r === st.cue && i === st.ch;
          // The recorded value, then what the channel is actually doing.
          box(g, x + 4, y, colW - 8, 30, {
            fill: recorded ? alpha(p.amber, 0.16) : 'transparent',
            stroke: edited ? p.cyan : (recorded ? p.amber : alpha(p.line, 0.6)),
            r: 5, lw: edited ? 2 : 1,
          });
          const q = Math.round(Math.pow(val / 100, 1 / 2.2) * 200) + 12;
          g.fillStyle = `rgb(${q},${Math.round(q * 0.94)},${Math.round(q * 0.8)})`;
          g.fillRect(x + 8, y + 4, 12, 22);
          label(g, recorded ? String(v) : '·', x + 30, y + 10, { color: recorded ? p.ink : p.muted, size: 11.5, ...mono });
          label(g, String(val), x + 30, y + 24, { color: p.cyan, size: 11, ...mono });
        });
      });

      const ly = oy + 5 * 42 + 8;
      g.fillStyle = alpha(p.amber, 0.16); g.fillRect(ox, ly, 11, 11);
      label(g, 'recorded in this cue', ox + 17, ly + 5, { color: p.muted, size: 10.5 });
      label(g, 'lower number: what the channel is actually at', ox + 190, ly + 5, { color: p.cyan, size: 10.5 });
    },
  });

  const upd = () => {
    cv.once();
    const { live } = resolve();
    if (st.tracking) setNote(`<b>Tracking.</b> A cue only stores the channels it changes. Anything it says nothing about keeps doing what it was doing, so your edit in cue ${st.cue + 1} <b>runs forward</b> into every later cue that never mentions that channel. Cue ${st.cue + 2} now reads ${live[st.cue + 1] ? live[st.cue + 1][st.ch] : '—'} on ${CH[st.ch]} and nobody recorded it there. This is not a fault, it is the point: change a wash once and it stays changed, which is why big shows are built this way.`);
    else setNote('<b>Cue only.</b> Every cue stores a complete state, so an edit stays where you put it and the next cue snaps back to what it recorded. Predictable, and much more work: change a wash and you change it in every cue by hand. Note the blanks now read as zero rather than as "carry on", which is the whole difference between the two modes.');
  };

  controls.append(
    choice('Mode', [['1', 'Tracking'], ['0', 'Cue only']], { value: '1', on: (v) => { st.tracking = v === '1'; upd(); } }).node,
    choice('Edit which cue', [['1', 'cue 2'], ['2', 'cue 3'], ['3', 'cue 4']], { value: '2', on: (v) => { st.cue = +v; upd(); } }).node,
    slider('Set level to', { min: 0, max: 100, value: 60, fmt: (v) => `${v} %`, on: (v) => { st.edit = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 8. The effect engine: one shape, spread across a rig
// ============================================================================

const SHAPES = {
  sine: { label: 'Sine', fn: (u) => 0.5 + 0.5 * Math.sin(u * Math.PI * 2) },
  ramp: { label: 'Ramp', fn: (u) => 1 - (u % 1) },
  step: { label: 'Step (chase)', fn: (u) => ((u % 1) < 0.18 ? 1 : 0.04) },
  saw: { label: 'Triangle', fn: (u) => 1 - Math.abs(((u % 1) * 2) - 1) },
};

register('effect-engine', (host) => {
  const st = { shape: 'sine', rate: 0.6, spread: 360, n: 12, size: 100 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a desk makes a chase without you programming one',
    sub: 'One shape, one rate, and an offset per fixture. Everything a rig does over time is these three numbers.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const fn = SHAPES[st.shape].fn;
      const gapW = W / st.n;

      // The rig, one lamp per fixture.
      const ly = 62, r = Math.min(19, gapW / 2.6);
      for (let i = 0; i < st.n; i++) {
        const off = (i / st.n) * (st.spread / 360);
        const v = clamp(fn(t * st.rate + off) * (st.size / 100), 0, 1);
        const cx = ox + gapW * (i + 0.5);
        const q = Math.round(Math.pow(v, 1 / 2.2) * 235) + 10;
        const rg = g.createRadialGradient(cx, ly, 1, cx, ly, r * 1.9);
        rg.addColorStop(0, `rgba(${q},${Math.round(q * 0.93)},${Math.round(q * 0.76)},0.95)`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(cx, ly, r * 1.9, 0, 7); g.fill();
        box(g, cx - r * 0.5, ly - r - 12, r, 10, { fill: p.raised, stroke: p.line, r: 2, lw: 1 });
        label(g, String(i + 1), cx, ly + r + 18, { color: p.muted, size: 9.5, align: 'center', ...mono });
      }
      label(g, `${st.n} fixtures`, ox, 20, { color: p.muted, size: 11, ...mono });

      // The same thing as curves over time, which is what the desk stores.
      const gy = 150, gh = 96;
      box(g, ox, gy, W, gh, { fill: alpha(p.raised, 0.4), stroke: p.line, r: 4, lw: 1 });
      for (let i = 0; i < st.n; i++) {
        const off = (i / st.n) * (st.spread / 360);
        g.beginPath();
        for (let k = 0; k <= W; k++) {
          const u = (k / W) * 2;
          const v = clamp(fn(u + off) * (st.size / 100), 0, 1);
          g.lineTo(ox + k, gy + gh - v * (gh - 6) - 3);
        }
        g.strokeStyle = alpha(p.amber, 0.18 + 0.5 * (i === 0 ? 1 : 0));
        g.lineWidth = i === 0 ? 2 : 1;
        g.stroke();
      }
      const px = ox + ((t * st.rate) % 2) / 2 * W;
      line(g, px, gy, px, gy + gh, { color: p.cyan, lw: 1.5 });
      label(g, `${SHAPES[st.shape].label}, ${st.spread}° spread across the rig`, ox, gy - 9,
        { color: p.ink2, size: 11.5, weight: 600 });
      label(g, `rate ${st.rate.toFixed(2)} cycles per second  ·  one cycle every ${(1 / st.rate).toFixed(1)} s`,
        ox, gy + gh + 18, { color: p.muted, size: 11, ...mono });
    },
  });

  const upd = () => {
    if (st.spread === 0) setNote('<b>Zero spread.</b> Every fixture gets the same offset, so the whole rig breathes together. Useful, and completely different in feel from the same effect spread out, which is the point: the shape did not change, only where each fixture sits in it.');
    else if (st.spread >= 350) setNote('<b>360 degrees of spread.</b> The offsets are distributed evenly around one full cycle, so at any moment every fixture is at a different point and the eye reads it as movement travelling along the rig. Nothing is moving. Twelve lamps are fading at twelve different phases of the same curve.');
    else setNote(`<b>${st.spread}° spread.</b> The fixtures are bunched into part of the cycle, so the rig moves in a group rather than as a wave. Spread is the control that decides whether an effect reads as one gesture or as travel, and it is worth more to a designer than the shape is.`);
  };

  controls.append(
    choice('Shape', Object.entries(SHAPES).map(([k, v]) => [k, v.label]), { value: 'sine', on: (v) => { st.shape = v; upd(); } }).node,
    slider('Rate', { min: 0.05, max: 3, step: 0.05, value: 0.6, fmt: (v) => `${v.toFixed(2)} Hz`, on: (v) => { st.rate = v; upd(); } }).node,
    slider('Spread', { min: 0, max: 360, step: 10, value: 360, fmt: (v) => `${v}°`, on: (v) => { st.spread = v; upd(); } }).node,
    slider('Size', { min: 5, max: 100, step: 5, value: 100, fmt: (v) => `${v} %`, on: (v) => { st.size = v; upd(); } }).node,
    slider('Fixtures', { min: 3, max: 24, step: 1, value: 12, fmt: (v) => v, on: (v) => { st.n = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 9. Two slots, one number: what a fine channel is actually for
// ============================================================================

register('dmx-16bit', (host) => {
  const PARAM = {
    pan: { label: 'Pan', range: 540, unit: '°' },
    tilt: { label: 'Tilt', range: 270, unit: '°' },
  };
  const st = { which: 'pan', throw: 20, coarse: 128, fine: 96 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Two DMX slots, one number, and what the second one buys',
    sub: 'There is no 16 bit DMX. The wire has carried single bytes since 1986. 16 bit is an agreement between the desk and the fixture about what two of those bytes mean together.',
    note: '&nbsp;',
  });

  const P = () => PARAM[st.which];
  const v16 = () => st.coarse * 256 + st.fine;
  // Everything is measured in the fixture's own 16 bit space, including the
  // coarse-only case, which is simply fine sitting at zero. Mixing the two
  // spaces (coarse out of 255, the pair out of 65,535) puts the coarse-only
  // angle slightly *ahead* of the 16 bit one, which is nonsense on screen, and
  // it makes one coarse step 257 fine steps instead of the 256 it is by
  // construction.
  const deg8 = () => (P().range * st.coarse * 256) / 65535;
  const deg16 = () => (P().range * v16()) / 65535;
  // One step, as an arc on a surface at the throw distance. A pan is a rotation,
  // so the honest figure is arc length, not the tangent of a triangle.
  const arc = (degrees) => st.throw * degrees * (Math.PI / 180);
  const step16 = () => P().range / 65535;
  const step8 = () => step16() * 256;
  const metric = (m) => (m >= 1 ? `${m.toFixed(2)} m` : m >= 0.01 ? `${(m * 100).toFixed(1)} cm` : `${(m * 1000).toFixed(1)} mm`);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 400,
    animated: false,
    controls,
    draw(g, w) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const narrow = W < 470;

      // --- the two slots on the wire -----------------------------------------
      let y = 30;
      const sw = Math.min(150, (W - 16) / 2);
      const slot = (x, name, addr, val, tone) => {
        box(g, x, y, sw, 58, { fill: alpha(tone, 0.14), stroke: tone, r: 6, lw: 1.4 });
        label(g, name, x + 10, y + 15, { color: tone, size: 11, weight: 700, max: sw - 20 });
        label(g, `slot ${addr}`, x + 10, y + 31, { color: p.muted, size: 10, max: sw - 20, ...mono });
        label(g, String(val), x + sw - 10, y + 40, { color: p.ink, size: 20, weight: 700, align: 'right', max: sw - 20, ...mono });
      };
      label(g, 'ON THE WIRE, TWO ORDINARY BYTES', ox, y - 13, { color: p.muted, size: 10, weight: 700, max: W });
      slot(ox, `${P().label} coarse`, 1, st.coarse, p.cyan);
      slot(ox + sw + 16, `${P().label} fine`, 2, st.fine, p.green);

      // --- the arithmetic the fixture does -----------------------------------
      y += 78;
      label(g, `${st.coarse} × 256  +  ${st.fine}  =  ${v16().toLocaleString()}   of 65,535`,
        ox, y, { color: p.ink, size: narrow ? 12 : 13.5, weight: 650, max: W, ...mono });
      label(g, `${deg16().toFixed(3)}${P().unit} of ${P().range}${P().unit}. With fine at zero the fixture would sit at ${deg8().toFixed(3)}${P().unit}.`,
        ox, y + 20, { color: p.muted, size: 11, max: W });

      // --- the whole sweep, for context --------------------------------------
      y += 56;
      const bh = 22;
      label(g, `THE WHOLE ${P().label.toUpperCase()}`, ox, y - 10, { color: p.muted, size: 10, weight: 700, max: W * 0.6 });
      box(g, ox, y, W, bh, { fill: alpha(p.line, 0.5), stroke: p.line, r: 4, lw: 1 });
      const fx = ox + (v16() / 65535) * W;
      line(g, fx, y - 3, fx, y + bh + 3, { color: p.amber, lw: 2 });
      label(g, `0${P().unit}`, ox, y + bh + 12, { color: p.muted, size: 9.5, max: 40, ...mono });
      label(g, `${P().range}${P().unit}`, ox + W, y + bh + 12, { color: p.muted, size: 9.5, align: 'right', max: 46, ...mono });

      // --- one coarse step, magnified ----------------------------------------
      // The whole sweep at this throw is hundreds of metres of arc, so the gap
      // the fine byte fills cannot be drawn to the same scale as the sweep. It
      // gets its own panel, and the panel says what it is worth in metres.
      y += bh + 40;
      const zh = 62;
      label(g, 'ONE COARSE STEP, MAGNIFIED', ox, y - 10, { color: p.amber, size: 10, weight: 700, max: W * 0.7 });
      box(g, ox, y, W, zh, { fill: alpha(p.amber, 0.06), stroke: alpha(p.line, 1), r: 6, lw: 1 });
      const lo = st.coarse - 1, hi = st.coarse + 2;      // three coarse steps across the panel
      const zx = (c256) => ox + ((c256 - lo * 256) / ((hi - lo) * 256)) * W;
      for (let c = lo; c <= hi; c++) {
        if (c < 0 || c > 255) continue;
        const x = zx(c * 256);
        line(g, x, y + 8, x, y + zh - 18, { color: p.cyan, lw: 1.6 });
        label(g, `${c}`, x, y + zh - 7, { color: p.cyan, size: 9.5, align: 'center', max: 44, ...mono });
      }
      // Every fine position inside the gap the student is standing in.
      for (let f = 0; f <= 256; f += 8) {
        const x = zx(st.coarse * 256 + f);
        if (x < ox + 2 || x > ox + W - 2) continue;
        line(g, x, y + zh - 26, x, y + zh - 18, { color: alpha(p.green, 0.55), lw: 1 });
      }
      const px = clamp(zx(v16()), ox + 2, ox + W - 2);
      line(g, px, y + 4, px, y + zh - 14, { color: p.amber, lw: 2.2 });
      label(g, 'here', clamp(px, ox + 22, ox + W - 22), y + 14, { color: p.amber, size: 10, align: 'center', max: 50 });

      // --- what it is worth, in metres on the thing you are lighting ----------
      y += zh + 30;
      const rowH = 22;
      const row = (i, k, v, tone) => {
        label(g, k, ox, y + i * rowH, { color: p.muted, size: 11.5, max: W * 0.56 });
        label(g, v, ox + W, y + i * rowH, { color: tone, size: 11.5, weight: 650, align: 'right', max: W * 0.42, ...mono });
      };
      row(0, `one coarse step at ${st.throw} m`, metric(arc(step8())), p.red);
      row(1, `one fine step at ${st.throw} m`, metric(arc(step16())), p.green);
      const capY = y + 2 * rowH + 8;
      const capH = labelWrap(g, narrow
        ? `${step8().toFixed(2)}${P().unit} against ${step16().toFixed(4)}${P().unit} per step.`
        : `${step8().toFixed(2)}${P().unit} per step against ${step16().toFixed(4)}${P().unit}: the fine byte divides every coarse step into 256.`,
        ox, capY, { color: p.ink, size: 11.5, weight: 600, max: W, maxLines: 2 });
      fit(capY + capH + 10);
    },
  });

  const upd = () => {
    cv.once();
    const big = arc(step8()), small = arc(step16());
    setNote(`<b>The fine byte is not a smaller version of the coarse byte. It is the gap the coarse byte leaves behind.</b> Turning fine from 0 to 255 walks you from one coarse position exactly to the next, and no further. At ${st.throw} metres one coarse step moves the beam ${metric(big)}, which on a slow ${P().label.toLowerCase()} is a jump the audience sees as a stutter. One fine step moves it ${metric(small)}. That is the whole argument, and it costs you one extra DMX slot per parameter.`);
  };

  controls.append(
    choice('Parameter', [['pan', 'Pan, 540°'], ['tilt', 'Tilt, 270°']], { value: 'pan', on: (v) => { st.which = v; upd(); } }).node,
    slider('Throw', { min: 3, max: 45, step: 1, value: 20, fmt: (v) => `${v} m`, on: (v) => { st.throw = v; upd(); } }).node,
    slider('Coarse byte', { min: 0, max: 255, step: 1, value: 128, fmt: (v) => v, on: (v) => { st.coarse = v; upd(); } }).node,
    slider('Fine byte', { min: 0, max: 255, step: 1, value: 96, fmt: (v) => v, on: (v) => { st.fine = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 10. What 16 bit costs, counted in slots
// ============================================================================

register('bit-footprint', (host) => {
  const st = { fine: { pan: true, tilt: true, dim: true, cmy: false }, base: 5 };
  const { controls, stage, setNote } = figure(host, {
    title: 'What 16 bit costs, counted in slots',
    sub: 'Every fine channel is a whole extra DMX slot, forever, on every fixture in the rig. That is the trade, and it is worth doing the arithmetic before the plot goes out.',
    note: '&nbsp;',
  });

  const EXTRA = { pan: 1, tilt: 1, dim: 1, cmy: 3 };
  const NAMES = { pan: 'Pan fine', tilt: 'Tilt fine', dim: 'Dimmer fine', cmy: 'C, M and Y fine' };
  const footprint = () => st.base + Object.keys(EXTRA).reduce((n, k) => n + (st.fine[k] ? EXTRA[k] : 0), 0);
  const perUniverse = () => Math.floor(512 / footprint());

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    controls,
    draw(g, w) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const fp = footprint(), per = perUniverse();

      // The fixture's own footprint, slot by slot.
      let y = 32;
      label(g, 'ONE FIXTURE, SLOT BY SLOT', ox, y - 12, { color: p.muted, size: 10, weight: 700, max: W });
      const cw = Math.min(26, (W - (fp - 1) * 3) / fp);
      let x = ox;
      for (let i = 0; i < fp; i++) {
        const isFine = i >= st.base;
        box(g, x, y, cw, 26, {
          fill: alpha(isFine ? p.green : p.cyan, 0.2), stroke: isFine ? p.green : p.cyan, r: 3, lw: 1.2,
        });
        x += cw + 3;
      }
      label(g, `${st.base} coarse`, ox, y + 42, { color: p.cyan, size: 11, max: W * 0.4 });
      label(g, `+ ${fp - st.base} fine  =  ${fp} slots`, ox + W, y + 42,
        { color: p.green, size: 11, align: 'right', max: W * 0.55, ...mono });

      // What that does to a universe.
      y += 76;
      label(g, 'ONE UNIVERSE, 512 SLOTS', ox, y - 12, { color: p.muted, size: 10, weight: 700, max: W });
      const uh = 30;
      box(g, ox, y, W, uh, { fill: alpha(p.line, 0.4), stroke: p.line, r: 4, lw: 1 });
      const used = (per * fp) / 512;
      box(g, ox, y, W * used, uh, { fill: alpha(p.amber, 0.32), stroke: 'transparent', r: 4 });
      for (let i = 1; i < per; i++) {
        const gx = ox + ((i * fp) / 512) * W;
        if (per <= 64) line(g, gx, y + 2, gx, y + uh - 2, { color: alpha(p.ground, 0.5), lw: 1 });
      }
      label(g, `${per} fixtures`, ox + 8, y + uh / 2, { color: p.ink, size: 12, weight: 700, max: W * 0.5 });
      label(g, `${512 - per * fp} slots spare`, ox + W - 8, y + uh / 2,
        { color: p.muted, size: 11, align: 'right', max: W * 0.45, ...mono });

      // The comparison that makes the trade legible.
      y += uh + 34;
      const all8 = Math.floor(512 / st.base);
      const capH = labelWrap(g,
        `All coarse: ${all8} fixtures per universe. As patched: ${per}. ${all8 === per ? 'No difference yet.' : `The fine channels cost you ${all8 - per} fixtures, so the same rig needs ${Math.round((all8 / per - 1) * 100)} percent more universes.`}`,
        ox, y, { color: p.ink, size: 12, weight: 600, max: W, maxLines: 3 });
      fit(y + capH + 12);
    },
  });

  const fmtList = (a) => (a.length === 1 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  const upd = () => {
    cv.once();
    const on = Object.keys(EXTRA).filter((k) => st.fine[k]);
    const per = perUniverse(), all8 = Math.floor(512 / st.base);
    if (!on.length) setNote(`<b>Nothing on fine, and ${per} fixtures fit.</b> This is the cheapest the rig will ever be in slots, and the worst it will ever look on a slow move. Turn on the parameters that actually move slowly in this show, and leave the rest coarse: a gobo wheel has no use for a fine channel, and neither does a strobe.`);
    else if (per === all8) setNote(`<b>${on.length} fine channel${on.length > 1 ? 's' : ''}, and the fixture count has not moved.</b> 512 does not divide evenly, so some footprints cost you nothing at all. Worth checking before you argue about it: the answer is arithmetic, not opinion.`);
    else setNote(`<b>${fmtList(on.map((k) => NAMES[k].toLowerCase()))} at 16 bit takes the fixture to ${footprint()} slots, and the universe from ${all8} fixtures down to ${per}.</b> That is the honest trade. Smooth movement is bought with universes, and universes are bought with node ports, so this decision reaches the equipment list, not just the patch.`);
  };

  controls.append(
    slider('Coarse channels', { min: 3, max: 24, step: 1, value: 5, fmt: (v) => v, on: (v) => { st.base = v; upd(); } }).node,
    ...Object.keys(EXTRA).map((k) => toggle(NAMES[k], { value: st.fine[k], on: (v) => { st.fine[k] = v; upd(); } }).node)
  );
  upd();
});
