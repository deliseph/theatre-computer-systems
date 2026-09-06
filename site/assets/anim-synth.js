// A synthesiser, which is the analogue chain run backwards.
//
// A microphone makes a voltage out of moving air. A synthesiser makes the same
// kind of voltage out of a circuit that never stops, with no air involved at
// any point. From the second stage onwards it is the identical chain the rest
// of this module already draws: shape it, level it, amplify it, move a cone.
//
// Both figures do the real arithmetic rather than drawing an impression of it.
// The waves are summed from their actual Fourier series, and the filter is an
// exact two pole response, magnitude and phase, so the output wave on screen is
// what that filter would really do to that wave.

import {
  register, figure, canvas, palette, slider, choice,
  box, label, labelWrap, line, alpha, clamp, fitter,
} from './anim-core.js';

const mono = { mono: true };
const TAU = Math.PI * 2;

// A2, low enough that forty odd harmonics all sit inside hearing, which keeps
// the spectrum panel honest instead of drawing partials nobody could hear.
const F0 = 110;
const NH = 48;

/**
 * The harmonics of each classic oscillator wave, as amplitude per partial.
 *
 * These are the real series, not an approximation of the shape. A sawtooth is
 * every harmonic at 1/n; a square is the odd ones only, also at 1/n, which is
 * exactly why it sounds hollow; a triangle is the odd ones at 1/n², which falls
 * away so fast that it is nearly a sine with a little edge on it. The leading
 * constants are the ones that make each series sum to unit amplitude.
 */
function harmonics(kind) {
  const out = [];
  for (let n = 1; n <= NH; n++) {
    let a = 0;
    if (kind === 'sine') a = n === 1 ? 1 : 0;
    else if (kind === 'saw') a = (2 / Math.PI) * ((n % 2 ? 1 : -1) / n);
    else if (kind === 'square') a = n % 2 ? (4 / Math.PI) / n : 0;
    else if (kind === 'tri') a = n % 2 ? (8 / Math.PI ** 2) * (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0;
    if (a) out.push({ n, a });
  }
  return out;
}

/**
 * A two pole low pass, which is the 12 dB per octave filter on most synths.
 *
 * H(s) = wc² / (s² + (wc/Q)s + wc²). On the imaginary axis, with r the
 * frequency as a multiple of the cutoff, that is 1 / ((1 - r²) + j r/Q). Both
 * halves are returned because the phase is what actually bends the waveform:
 * take the magnitude alone and the picture would be wrong in a way a student
 * with an oscilloscope would catch.
 */
function twoPole(r, q) {
  const re = 1 - r * r, im = r / q;
  return { mag: 1 / Math.hypot(re, im), phase: -Math.atan2(im, re) };
}

// ============================================================================
// 1. Oscillator into filter: where the timbre comes from
// ============================================================================

register('synth-voice', (host) => {
  const CUT_LO = 80, CUT_HI = 8000;
  const cutAt = (v) => Math.round(CUT_LO * (CUT_HI / CUT_LO) ** (v / 100));
  const CUT0 = Math.round(100 * Math.log(1200 / CUT_LO) / Math.log(CUT_HI / CUT_LO));
  const st = { wave: 'saw', cut: cutAt(CUT0), res: 0 };
  const { controls, stage, setNote } = figure(host, {
    title: 'A synthesiser, and the two knobs that make the sound',
    sub: 'A microphone makes a voltage from moving air. This makes the same voltage from a circuit, with no air anywhere. Everything after the first box is the chain you already know.',
    note: '&nbsp;',
  });

  const Q = () => 0.707 + (st.res / 100) * 9;
  const parts = () => harmonics(st.wave);

  // One sample of the wave, before and after the filter, at phase u of a cycle.
  const sample = (hs, u, filtered) => {
    let v = 0;
    for (const { n, a } of hs) {
      if (!filtered) { v += a * Math.sin(n * u * TAU); continue; }
      const { mag, phase } = twoPole((n * F0) / st.cut, Q());
      v += a * mag * Math.sin(n * u * TAU + phase);
    }
    return v;
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 400,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(640, w - 24), ox = (w - W) / 2;
      const hs = parts();
      const scroll = (t * 0.35) % 1;
      const roomy = W > 470;   // below this a right hand caption would be clipped

      // --- the oscillator, drawn as the raw wave -----------------------------
      const oh = 62;
      let y = 30;
      label(g, 'OSCILLATOR', ox, y - 14, { color: p.cyan, size: 10, weight: 700, max: W * 0.5 });
      label(g, `${F0} Hz, ${hs.length} harmonic${hs.length > 1 ? 's' : ''}`, ox + W, y - 14,
        { color: p.muted, size: 10, align: 'right', max: W * 0.5, ...mono });
      box(g, ox, y, W, oh, { fill: alpha(p.cyan, 0.07), stroke: alpha(p.cyan, 0.35), r: 6, lw: 1 });
      line(g, ox, y + oh / 2, ox + W, y + oh / 2, { color: alpha(p.muted, 0.3), lw: 1, dash: [3, 4] });
      g.save();
      g.beginPath();
      for (let i = 0; i <= 300; i++) {
        const u = (i / 300) * 3 + scroll;
        const v = clamp(sample(hs, u, false), -1.5, 1.5);
        const px = ox + (i / 300) * W, py = y + oh / 2 - v * (oh / 2 - 5);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.cyan; g.lineWidth = 1.8; g.stroke();
      g.restore();

      // --- the harmonics, and what the filter does to each one ---------------
      y += oh + 34;
      const sh = 132;
      label(g, 'FILTER', ox, y - 14, { color: p.amber, size: 10, weight: 700, max: W * 0.4 });
      // Faint is the partial as the oscillator made it, solid is what is left
      // after the filter. Said in the panel, because a reader who has to work
      // that out from the picture is doing the wrong puzzle.
      label(g, roomy ? 'faint: before the filter · solid: after' : 'faint: before · solid: after',
        ox + W, y - 14, { color: p.muted, size: 10, align: 'right', max: W * 0.68 });
      box(g, ox, y, W, sh, { fill: alpha(p.amber, 0.05), stroke: alpha(p.line, 1), r: 6, lw: 1 });

      // A log frequency axis, because that is how the ear reads pitch and how
      // every analyser a student will ever meet is drawn.
      const F_LO = 55, F_HI = 11000;
      const fx = (f) => ox + 6 + (Math.log10(clamp(f, F_LO, F_HI) / F_LO) / Math.log10(F_HI / F_LO)) * (W - 12);
      const FLOOR = -48;                       // dB, below which a partial is gone
      const dbY = (db) => y + sh - 16 - (clamp(db, FLOOR, 6) - FLOOR) / (6 - FLOOR) * (sh - 26);

      for (const f of [100, 1000, 10000]) {
        line(g, fx(f), y + 6, fx(f), y + sh - 16, { color: alpha(p.muted, 0.2), lw: 1 });
        label(g, f >= 1000 ? `${f / 1000}k` : `${f}`, fx(f), y + sh - 7,
          { color: p.muted, size: 9.5, align: 'center', max: 40, ...mono });
      }

      // The response curve first, so the bars sit on top of it.
      g.save();
      g.beginPath();
      for (let i = 0; i <= 220; i++) {
        const f = F_LO * (F_HI / F_LO) ** (i / 220);
        const db = 20 * Math.log10(Math.max(1e-4, twoPole(f / st.cut, Q()).mag));
        const px = fx(f), py = dbY(db);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = alpha(p.amber, 0.85); g.lineWidth = 1.6; g.stroke();
      g.restore();
      line(g, fx(st.cut), y + 6, fx(st.cut), y + sh - 16, { color: p.amber, lw: 1.2, dash: [4, 3] });

      for (const { n, a } of hs) {
        const f = n * F0;
        if (f > F_HI) break;
        const px = fx(f);
        const dry = 20 * Math.log10(Math.abs(a));
        const wet = dry + 20 * Math.log10(Math.max(1e-4, twoPole(f / st.cut, Q()).mag));
        if (dry > FLOOR) {
          g.fillStyle = alpha(p.cyan, 0.28);
          g.fillRect(px - 1.6, dbY(dry), 3.2, y + sh - 16 - dbY(dry));
        }
        if (wet > FLOOR) {
          g.fillStyle = p.cyan;
          g.fillRect(px - 1.6, dbY(wet), 3.2, y + sh - 16 - dbY(wet));
        }
      }
      label(g, `cutoff ${st.cut >= 1000 ? `${(st.cut / 1000).toFixed(1)} kHz` : `${st.cut} Hz`}`,
        clamp(fx(st.cut) + 6, ox + 6, ox + W - 90), y + 14,
        { color: p.amber, size: 10, max: 92, ...mono });

      // --- what comes out ----------------------------------------------------
      y += sh + 34;
      label(g, 'OUT', ox, y - 14, { color: p.green, size: 10, weight: 700, max: W * 0.3 });
      if (roomy) label(g, 'same axis as the top, so the level it lost is the level you see',
        ox + W, y - 14, { color: p.muted, size: 10, align: 'right', max: W * 0.74 });
      box(g, ox, y, W, oh, { fill: alpha(p.green, 0.07), stroke: alpha(p.green, 0.35), r: 6, lw: 1 });
      line(g, ox, y + oh / 2, ox + W, y + oh / 2, { color: alpha(p.muted, 0.3), lw: 1, dash: [3, 4] });
      let clipped = false;
      g.save();
      g.beginPath();
      for (let i = 0; i <= 300; i++) {
        const u = (i / 300) * 3 + scroll;
        const raw = sample(hs, u, true);
        if (Math.abs(raw) > 1.5) clipped = true;
        const v = clamp(raw, -1.5, 1.5);
        const px = ox + (i / 300) * W, py = y + oh / 2 - v * (oh / 2 - 5);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.green; g.lineWidth = 1.8; g.stroke();
      g.restore();
      if (clipped) label(g, 'off the top of the panel', ox + W - 6, y + 12,
        { color: p.red, size: 10, align: 'right', max: W * 0.5 });

      fit(y + oh + 16);
    },
  });

  const upd = () => {
    cv.once?.();
    const hs = parts();
    const above = hs.filter(({ n }) => n * F0 > st.cut).length;
    if (st.res > 55) setNote(`<b>Resonance is the filter listening to itself.</b> Feeding the output back in lifts a peak right at the cutoff, and at this setting the partial sitting nearest ${(st.cut / 1000).toFixed(1)} kHz comes out <b>louder than it went in</b>. That peak is the sound of every filter sweep you have ever heard on a dance record, and it is also why a synth can overload the desk channel it is plugged into while its own meter looks fine.`);
    else if (st.wave === 'sine') setNote(`<b>A sine has nothing to subtract.</b> One harmonic, so the filter has no work to do and the knob does almost nothing. This is the useful way to learn what the filter is for: it removes harmonics, so a wave with none is a wave it cannot change. Every other setting on this figure has ${harmonics('saw').length} or so to play with.`);
    else if (above > 0) setNote(`<b>Subtractive synthesis, and the name is the whole method.</b> The oscillator makes a wave that is deliberately too bright, and the filter takes the top off. ${above} of this wave's ${hs.length} partials are above the cutoff right now and are being reduced, which is why the output is rounder and quieter than the input. Nothing is being added at any point.`);
    else setNote(`<b>Cutoff above everything, so the filter is out of the way.</b> All ${hs.length} partials are below it and come through more or less untouched, which is why the two waves look alike. Bring the cutoff down through the stack and you can watch the timbre change one harmonic at a time.`);
  };

  controls.append(
    choice('Oscillator', [['saw', 'Sawtooth'], ['square', 'Square'], ['tri', 'Triangle'], ['sine', 'Sine']],
      { value: 'saw', on: (v) => { st.wave = v; upd(); } }).node,
    slider('Filter cutoff', {
      min: 0, max: 100, step: 1, value: CUT0,
      fmt: (v) => (cutAt(v) >= 1000 ? `${(cutAt(v) / 1000).toFixed(1)} kHz` : `${cutAt(v)} Hz`),
      on: (v) => { st.cut = cutAt(v); upd(); },
    }).node,
    slider('Resonance', { min: 0, max: 100, step: 1, value: 0, fmt: (v) => `${v}%`, on: (v) => { st.res = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. The envelope: the same voice, played four different ways
// ============================================================================

register('synth-envelope', (host) => {
  const PRESET = {
    pluck: { a: 2, d: 260, s: 0, r: 180, label: 'Pluck' },
    pad: { a: 900, d: 400, s: 70, r: 1200, label: 'Pad' },
    stab: { a: 4, d: 90, s: 0, r: 60, label: 'Stab' },
    organ: { a: 6, d: 10, s: 100, r: 40, label: 'Organ' },
  };
  const st = { ...PRESET.pluck, hold: 700, name: 'pluck' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why the same oscillator can be a pluck or a pad',
    sub: 'Nothing about the tone changes here. The only thing being changed is how loud it is, moment by moment, and that alone is most of what makes an instrument recognisable.',
    note: '&nbsp;',
  });

  // Level at time ms, given the note is released at `hold`.
  const env = (ms) => {
    const { a, d, s, r, hold } = st;
    if (ms < 0) return 0;
    if (ms < hold) {
      if (ms < a) return a ? ms / a : 1;
      if (ms < a + d) return 1 - (1 - s / 100) * ((ms - a) / (d || 1));
      return s / 100;
    }
    const atRelease = hold < a ? (a ? hold / a : 1)
      : hold < a + d ? 1 - (1 - s / 100) * ((hold - a) / (d || 1)) : s / 100;
    const k = (ms - hold) / (r || 1);
    return k >= 1 ? 0 : atRelease * (1 - k);
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(640, w - 24), ox = (w - W) / 2;
      // Just past the last thing that happens, so the panel is mostly the note
      // rather than mostly the silence after it.
      const SPAN = Math.max(600, st.hold + st.r + 180);
      const tx = (ms) => ox + (ms / SPAN) * W;

      // The key, drawn as the thing that is actually happening: held, released.
      let y = 26;
      label(g, 'THE KEY', ox, y - 12, { color: p.muted, size: 10, weight: 700, max: W * 0.4 });
      box(g, tx(0), y, Math.max(2, tx(st.hold) - tx(0)), 14,
        { fill: alpha(p.cyan, 0.3), stroke: p.cyan, r: 3, lw: 1 });
      label(g, 'held', tx(0) + 6, y + 7, { color: p.cyan, size: 9.5, max: Math.max(10, tx(st.hold) - tx(0) - 10) });
      label(g, 'let go', tx(st.hold) + 6, y + 7, { color: p.muted, size: 9.5, max: Math.max(10, ox + W - tx(st.hold) - 10) });

      // The envelope itself.
      y += 38;
      const eh = 108;
      label(g, 'THE ENVELOPE', ox, y - 12, { color: p.amber, size: 10, weight: 700, max: W * 0.5 });
      box(g, ox, y, W, eh, { fill: alpha(p.amber, 0.05), stroke: alpha(p.line, 1), r: 6, lw: 1 });

      // A time ruler, so a long flat stretch reads as elapsed time rather than
      // a panel that failed to draw. On a fast pluck that flat stretch is the
      // point being made: the note is over while the key is still down.
      const tick = SPAN > 2400 ? 500 : SPAN > 1200 ? 250 : 100;
      for (let ms = tick; ms < SPAN; ms += tick) {
        line(g, tx(ms), y + 2, tx(ms), y + eh - 2, { color: alpha(p.muted, 0.16), lw: 1 });
        label(g, `${ms}`, tx(ms), y + eh + 11, { color: p.muted, size: 9, align: 'center', max: tick / SPAN * W, ...mono });
      }
      label(g, 'ms', ox + W, y + eh + 11, { color: p.muted, size: 9, align: 'right', max: 24, ...mono });

      line(g, tx(st.hold), y, tx(st.hold), y + eh, { color: alpha(p.cyan, 0.55), lw: 1.2, dash: [4, 3] });
      g.save();
      g.beginPath();
      for (let i = 0; i <= 400; i++) {
        const ms = (i / 400) * SPAN;
        const px = tx(ms), py = y + eh - 6 - env(ms) * (eh - 14);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.amber; g.lineWidth = 2; g.stroke();
      g.restore();
      // The three corners, named rather than initialled: a student meeting ADSR
      // for the first time has no reason to know what D stands for.
      const NAMES = [[st.a, 'up'], [st.a + st.d, 'fallen'], [st.hold, 'key up']];
      for (const [ms, txt] of NAMES) {
        if (ms > SPAN) continue;
        const px = tx(ms), py = y + eh - 6 - env(Math.min(ms, SPAN)) * (eh - 14);
        g.fillStyle = p.amber;
        g.beginPath(); g.arc(px, py, 2.8, 0, TAU); g.fill();
        // A corner at full level has no room above it, so its name goes below.
        label(g, txt, clamp(px, ox + 22, ox + W - 22), py - 11 < y + 9 ? py + 13 : py - 11,
          { color: p.amber, size: 9.5, align: 'center', max: 56 });
      }

      // The sound: a fixed tone, with that envelope on its level.
      y += eh + 42;
      const sh = 74;
      label(g, 'WHAT YOU HEAR', ox, y - 12, { color: p.green, size: 10, weight: 700, max: W * 0.5 });
      box(g, ox, y, W, sh, { fill: alpha(p.green, 0.06), stroke: alpha(p.green, 0.3), r: 6, lw: 1 });
      const play = ((t * 380) % (SPAN + 600));
      g.save();
      g.beginPath();
      for (let i = 0; i <= 700; i++) {
        const ms = (i / 700) * SPAN;
        const v = Math.sin(ms * 0.26) * env(ms);
        const px = tx(ms), py = y + sh / 2 - v * (sh / 2 - 5);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.green; g.lineWidth = 1.4; g.stroke();
      g.restore();
      if (play < SPAN) line(g, tx(play), y, tx(play), y + sh, { color: alpha(p.red, 0.7), lw: 1.4 });

      const capH = labelWrap(g, `attack ${st.a} ms · decay ${st.d} ms · sustain ${st.s}% · release ${st.r} ms`,
        ox, y + sh + 16, { color: p.ink, size: 11, weight: 600, max: W, maxLines: 2, ...mono });
      fit(y + sh + 16 + capH + 8);
    },
  });

  const upd = () => {
    cv.once?.();
    if (st.name === 'pluck') setNote(`<b>A pluck is a fast attack and no sustain.</b> The level rises in ${st.a} ms and falls away while you are still holding the key, which is what a string does: you put energy in once and it leaks out. Let go early and you barely change it, because the note had already gone.`);
    else if (st.name === 'pad') setNote(`<b>A pad is the same oscillator with a slow attack.</b> ${st.a} ms to reach full level, and ${st.r} ms to fall after you let go. That long release is why pads sound like a room rather than an instrument, and it is also why they eat polyphony: notes you have finished playing are still sounding.`);
    else if (st.name === 'organ') setNote(`<b>An organ envelope is nearly a switch.</b> Straight up, hold at full while the key is down, straight off. That is not a metaphor: a pipe organ really is a valve, and the envelope is the valve opening. Anything with sustain at 100% behaves like this.`);
    else setNote(`<b>A stab is a pluck with the decay cut short.</b> Under ${st.a + st.d} ms from silence to silence. At this length the ear stops hearing pitch and starts hearing rhythm, which is why stabs are used the way a percussion part is used.`);
  };

  // Applying a preset moves the four sliders, and each of those fires its own
  // handler, which would immediately stamp the patch "custom" again. The flag
  // is the whole fix: a slider moved by the student means something different
  // from a slider moved by the figure.
  let applying = false;
  const set = (k) => {
    applying = true;
    Object.assign(st, PRESET[k]);
    st.name = k;
    ctl.a.set(st.a); ctl.d.set(st.d); ctl.s.set(st.s); ctl.r.set(st.r);
    applying = false;
    upd();
  };
  const mark = () => { if (!applying) st.name = 'custom'; };
  const ctl = {
    a: slider('Attack', { min: 0, max: 1500, step: 2, value: st.a, fmt: (v) => `${v} ms`, on: (v) => { st.a = v; mark(); upd(); } }),
    d: slider('Decay', { min: 2, max: 1500, step: 2, value: st.d, fmt: (v) => `${v} ms`, on: (v) => { st.d = v; mark(); upd(); } }),
    s: slider('Sustain', { min: 0, max: 100, step: 1, value: st.s, fmt: (v) => `${v}%`, on: (v) => { st.s = v; mark(); upd(); } }),
    r: slider('Release', { min: 2, max: 2000, step: 2, value: st.r, fmt: (v) => `${v} ms`, on: (v) => { st.r = v; mark(); upd(); } }),
  };
  controls.append(
    choice('Sound', Object.entries(PRESET).map(([k, v]) => [k, v.label]),
      { value: 'pluck', on: set }).node,
    slider('Key held for', { min: 100, max: 2000, step: 20, value: 700, fmt: (v) => `${v} ms`, on: (v) => { st.hold = v; upd(); } }).node,
    ctl.a.node, ctl.d.node, ctl.s.node, ctl.r.node
  );
  upd();
});
