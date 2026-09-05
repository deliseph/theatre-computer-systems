// Aligning what the audience sees with what they hear.
//
// Two clocks run against each other at a concert. Light crosses a room in
// microseconds, so the screen shows you a thing the instant the video chain
// has finished with it. Sound takes about 3 ms per metre, so it is always
// arriving late, and later the further back you stand.
//
// The result these figures exist to make felt: a video processing delay
// behaves exactly like an acoustic delay, so there is a distance at which the
// two coincide on their own. Nearer than that the screen is late; further away
// the sound is. You cannot align a room, only a plane through it.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp,
} from './anim-core.js';

const mono = { mono: true };
const MS_PER_M = 2.915;          // 343 m/s at 20 degrees, the usual show figure

// Grow the canvas to the content instead of leaving a field of empty pixels.
function fitter(get) {
  let pend = false;
  return (want) => {
    const cv = get();
    if (!cv || pend || Math.abs(cv.h - want) < 3) return;
    pend = true;
    requestAnimationFrame(() => { pend = false; cv.setHeight(Math.round(want)); });
  };
}          // 343 m/s at 20 degrees, the usual show figure

// ============================================================================
// 1. Where the picture and the sound actually meet
// ============================================================================

register('av-align', (host) => {
  const st = { dist: 12, video: 80, audio: 8, delay: 0 };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'Why the screen is early at the front and late at the back',
    sub: 'Light is instant across a room. Sound takes 3 ms a metre. The video chain sits between them, and it is the only one you can move.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 330,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const MAXD = 60;
      const X = (m) => ox + 54 + (m / MAXD) * (W - 74);

      // --- Plan view of the room -----------------------------------------
      const py = 34, ph = 62;
      box(g, ox, py, W, ph, { fill: alpha(p.raised, 0.5), stroke: p.line, r: 6, lw: 1 });
      // Stage, wall and PA at the left.
      box(g, ox + 6, py + 8, 42, ph - 16, { fill: alpha(p.ink2, 0.15), stroke: p.line, r: 3, lw: 1 });
      label(g, 'stage', ox + 27, py + ph / 2, { color: p.muted, size: 9, align: 'center' });

      const arrivalV = st.video;                                  // screen lights up
      const arrivalA = st.audio + st.delay + st.dist * MS_PER_M;  // sound reaches the ear
      const cyc = 2.6;
      const ph01 = (t % cyc) / cyc;
      const nowMs = ph01 * 260;

      // The sound, as an expanding wavefront in the plan.
      const emitted = st.audio + st.delay;
      if (nowMs > emitted) {
        const reachedM = (nowMs - emitted) / MS_PER_M;
        const rx = X(Math.min(MAXD, reachedM));
        g.strokeStyle = alpha(p.cyan, 0.75); g.lineWidth = 2;
        g.beginPath(); g.moveTo(rx, py + 6); g.lineTo(rx, py + ph - 6); g.stroke();
        label(g, 'sound', rx + 5, py + 14, { color: p.cyan, size: 9.5 });
      }
      // The screen: it lights the whole room at once, the moment it lights.
      if (nowMs > arrivalV) {
        g.fillStyle = alpha(p.amber, 0.10 + 0.05 * Math.sin(t * 8));
        g.fillRect(ox + 50, py + 4, W - 56, ph - 8);
        label(g, 'screen is showing it', ox + 58, py + 14, { color: p.amber, size: 9.5 });
      }

      // The listener.
      const lx = X(st.dist);
      line(g, lx, py, lx, py + ph, { color: p.ink, lw: 2 });
      g.fillStyle = p.ink; g.beginPath(); g.arc(lx, py + ph / 2, 5, 0, 7); g.fill();
      label(g, `${st.dist} m`, lx, py + ph + 13, { color: p.ink, size: 10, align: 'center', ...mono });

      // Where the two coincide, if anywhere in the room.
      const alignM = (st.video - st.audio - st.delay) / MS_PER_M;
      if (alignM > 0 && alignM < MAXD) {
        const ax = X(alignM);
        line(g, ax, py - 6, ax, py + ph + 4, { color: p.green, lw: 1.5, dash: [4, 3] });
        label(g, `in step at ${alignM.toFixed(0)} m`, ax + 5, py - 12, { color: p.green, size: 10, weight: 650 });
      }

      // --- The two arrivals, on one time axis ------------------------------
      const ty = py + ph + 40, tw = W - 60, tox = ox + 54;
      const T = (ms) => tox + (ms / 260) * tw;
      line(g, tox, ty + 46, tox + tw, ty + 46, { color: p.line, lw: 1 });
      for (let ms = 0; ms <= 250; ms += 50) {
        line(g, T(ms), ty + 46, T(ms), ty + 51, { color: p.line, lw: 1 });
        label(g, `${ms}`, T(ms), ty + 60, { color: p.muted, size: 9, align: 'center', ...mono });
      }
      label(g, 'ms', tox + tw + 8, ty + 60, { color: p.muted, size: 9, ...mono });
      label(g, 'the hit', tox - 6, ty + 8, { color: p.ink2, size: 10, align: 'right' });
      line(g, T(0), ty, T(0), ty + 46, { color: p.ink, lw: 2 });

      // Video chain bar.
      label(g, 'you see', tox - 6, ty + 20, { color: p.amber, size: 10, align: 'right', weight: 600 });
      box(g, T(0), ty + 13, Math.max(2, T(arrivalV) - T(0)), 13,
        { fill: alpha(p.amber, 0.35), stroke: p.amber, r: 3, lw: 1 });
      label(g, `${arrivalV.toFixed(0)} ms of video chain`, T(0) + 6, ty + 19.5, { color: p.amber, size: 9.5, ...mono });

      // Audio: processing, then the air.
      label(g, 'you hear', tox - 6, ty + 38, { color: p.cyan, size: 10, align: 'right', weight: 600 });
      const procW = Math.max(2, T(st.audio + st.delay) - T(0));
      box(g, T(0), ty + 31, procW, 13, { fill: alpha(p.cyan, 0.5), stroke: p.cyan, r: 3, lw: 1 });
      box(g, T(st.audio + st.delay), ty + 31, Math.max(2, T(arrivalA) - T(st.audio + st.delay)), 13,
        { fill: alpha(p.cyan, 0.18), stroke: alpha(p.cyan, 0.6), r: 3, lw: 1 });
      label(g, `${(st.dist * MS_PER_M).toFixed(0)} ms of air`, T(st.audio + st.delay) + 6, ty + 37.5,
        { color: p.cyan, size: 9.5, ...mono });

      // --- The verdict ------------------------------------------------------
      const off = arrivalV - arrivalA;   // positive: sound first, screen late
      const fy = ty + 82;
      const abs = Math.abs(off);
      const col = abs < 20 ? p.green : abs < 45 ? p.amber : p.red;
      label(g, abs < 20
        ? 'In step, as far as anyone can tell'
        : off > 0 ? `Screen is ${abs.toFixed(0)} ms late` : `Sound is ${abs.toFixed(0)} ms late`,
        ox, fy, { color: col, size: 14, weight: 700 });
      label(g, abs < 20 ? 'under about 20 ms, and the two fuse into one event'
        : off > 0 ? 'the drummer is heard before the hand lands on the screen'
        : 'the hand lands on the screen before the drum is heard',
        ox, fy + 19, { color: p.muted, size: 11.5 });
    },
  });

  challenge('Put a listener at 12 m in step with the screen, without touching the video chain.',
    () => st.dist === 12 && Math.abs(st.video - (st.audio + st.delay + st.dist * MS_PER_M)) < 20 && st.delay > 0);

  const upd = () => {
    const arrivalV = st.video;
    const arrivalA = st.audio + st.delay + st.dist * MS_PER_M;
    const off = arrivalV - arrivalA;
    const alignM = (st.video - st.audio - st.delay) / MS_PER_M;
    if (Math.abs(off) < 20) {
      setNote(`<b>In step here, and only here.</b> At ${st.dist} m the ${st.video} ms of video chain and the ${(st.dist * MS_PER_M).toFixed(0)} ms of air happen to cancel. Walk forward and the screen goes late; walk back and the sound does. <b>You cannot align a room, only a plane through it</b>, and choosing where that plane sits is the whole job.`);
    } else if (off > 0) {
      setNote(`<b>The screen is ${off.toFixed(0)} ms behind.</b> Close to the stage the air costs almost nothing, so the video chain is the only delay in the picture and it loses. Every box in that chain costs frames: a camera, a switcher, a scaler, the wall's own processor. The fix nearest to hand is not more delay, it is <b>fewer boxes</b>: at ${alignM > 0 ? `this setting the two only meet at ${alignM.toFixed(0)} m` : 'these settings they never meet in the room at all'}.`);
    } else {
      setNote(`<b>The sound is ${(-off).toFixed(0)} ms behind.</b> Out here the air has overtaken the video chain, which is the normal condition at the back of any large room and the reason nobody complains about it: this is exactly what happens with no screen at all, and everyone has heard it their whole life. The screen being <i>early</i> is the version an audience notices, and it is why the alignment plane is usually put well back.`);
    }
  };

  controls.append(
    slider('Listener distance', { min: 2, max: 60, step: 1, value: 12, fmt: (v) => `${v} m`, on: (v) => { st.dist = v; upd(); } }).node,
    slider('Video chain', { min: 0, max: 200, step: 5, value: 80, fmt: (v) => `${v} ms`, on: (v) => { st.video = v; upd(); } }).node,
    slider('Audio processing', { min: 0, max: 40, step: 1, value: 8, fmt: (v) => `${v} ms`, on: (v) => { st.audio = v; upd(); } }).node,
    slider('Delay added to the audio', { min: 0, max: 150, step: 1, value: 0, fmt: (v) => `${v} ms`, on: (v) => { st.delay = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. Delay towers, and the effect that makes them disappear
// ============================================================================

register('delay-tower', (host) => {
  const st = { tower: 30, listener: 38, delay: 0, haas: 0 };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'The delay tower, and why it is set to the distance',
    sub: 'A second speaker halfway back is louder and wrong. Delay it by the distance it sits from the stage and it vanishes.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const MAXD = 70;
      const X = (m) => ox + 40 + (m / MAXD) * (W - 60);

      const mainMs = st.listener * MS_PER_M;
      const towerMs = st.delay + st.haas + Math.abs(st.listener - st.tower) * MS_PER_M;
      const gap = towerMs - mainMs;          // positive: main heard first, which is what you want

      // --- Plan ------------------------------------------------------------
      const py = 30, ph = 54;
      box(g, ox, py, W, ph, { fill: alpha(p.raised, 0.5), stroke: p.line, r: 6, lw: 1 });
      box(g, ox + 4, py + 8, 30, ph - 16, { fill: alpha(p.ink2, 0.15), stroke: p.line, r: 3, lw: 1 });
      label(g, 'PA', ox + 19, py + ph / 2, { color: p.muted, size: 9, align: 'center' });
      // Tower.
      const tx = X(st.tower);
      box(g, tx - 7, py + 12, 14, ph - 24, { fill: alpha(p.amber, 0.3), stroke: p.amber, r: 2, lw: 1 });
      label(g, 'tower', tx, py - 8, { color: p.amber, size: 9.5, align: 'center' });
      // Listener.
      const lx = X(st.listener);
      g.fillStyle = p.ink; g.beginPath(); g.arc(lx, py + ph / 2, 5, 0, 7); g.fill();
      label(g, `${st.listener} m`, lx, py + ph + 13, { color: p.ink, size: 10, align: 'center', ...mono });

      // Two wavefronts.
      const cyc = 2.8, nowMs = ((t % cyc) / cyc) * 220;
      if (nowMs > 0) {
        const r = nowMs / MS_PER_M;
        line(g, X(Math.min(MAXD, r)), py + 4, X(Math.min(MAXD, r)), py + ph - 4, { color: alpha(p.cyan, 0.7), lw: 2 });
      }
      if (nowMs > st.delay + st.haas) {
        const r = (nowMs - st.delay - st.haas) / MS_PER_M;
        const a = X(Math.min(MAXD, st.tower + r)), bx = X(Math.max(0, st.tower - r));
        line(g, a, py + 4, a, py + ph - 4, { color: alpha(p.amber, 0.7), lw: 2 });
        line(g, bx, py + 4, bx, py + ph - 4, { color: alpha(p.amber, 0.35), lw: 1.5 });
      }

      // --- Arrivals ---------------------------------------------------------
      const ty = py + ph + 42, tw = W - 70, tox = ox + 64;
      const T = (ms) => tox + (ms / 220) * tw;
      line(g, tox, ty + 34, tox + tw, ty + 34, { color: p.line, lw: 1 });
      for (let ms = 0; ms <= 200; ms += 50) {
        line(g, T(ms), ty + 34, T(ms), ty + 39, { color: p.line, lw: 1 });
        label(g, `${ms}`, T(ms), ty + 48, { color: p.muted, size: 9, align: 'center', ...mono });
      }
      label(g, 'from the PA', tox - 8, ty + 8, { color: p.cyan, size: 10, align: 'right', weight: 600 });
      box(g, T(0), ty + 1, Math.max(2, T(mainMs) - T(0)), 13, { fill: alpha(p.cyan, 0.3), stroke: p.cyan, r: 3, lw: 1 });
      label(g, 'from the tower', tox - 8, ty + 26, { color: p.amber, size: 10, align: 'right', weight: 600 });
      box(g, T(0), ty + 19, Math.max(2, T(towerMs) - T(0)), 13, { fill: alpha(p.amber, 0.3), stroke: p.amber, r: 3, lw: 1 });

      // The perceptual bands, which are the actual content here.
      const bandY = ty + 64;
      const bands = [[-1e3, 0, 'tower first: the sound comes from the tower', p.red],
                     [0, 5, 'comb filtering', p.red],
                     [5, 35, 'fused, and heard from the stage', p.green],
                     [35, 1e3, 'a distinct echo', p.red]];
      const band = bands.find(([a, b]) => gap >= a && gap < b);
      label(g, `tower arrives ${gap >= 0 ? '+' : ''}${gap.toFixed(0)} ms after the PA`,
        ox, bandY, { color: p.ink, size: 13, weight: 700, ...mono });
      label(g, band[2], ox, bandY + 20, { color: band[3], size: 12.5, weight: 650 });
      const ideal = st.tower * MS_PER_M;
      label(g, `distance from the PA to the tower is ${st.tower} m, so the tower wants ${ideal.toFixed(0)} ms plus a little`,
        ox, bandY + 40, { color: p.muted, size: 11, ...mono });
      fit(bandY + 58);
    },
  });

  challenge('Set the tower so its sound is fused with the PA and still seems to come from the stage.',
    () => { const gap = st.delay + st.haas + Math.abs(st.listener - st.tower) * MS_PER_M - st.listener * MS_PER_M;
      return gap >= 5 && gap < 35; });

  const upd = () => {
    const gap = st.delay + st.haas + Math.abs(st.listener - st.tower) * MS_PER_M - st.listener * MS_PER_M;
    if (gap < 0) setNote('<b>The tower is early, so the sound is coming from the tower.</b> Your ears localise onto whichever wavefront arrives first, whatever the levels are, so a loud undelayed tower moves the entire band to the middle of the field. This is the failure people describe as "the PA sounds wrong at the back" when nothing is wrong with the PA.');
    else if (gap < 5) setNote('<b>Nearly together, which is the one place you must not be.</b> Two copies of the same signal a few milliseconds apart cancel and reinforce at alternating frequencies: comb filtering. It sounds hollow and phasey, and it is worse than either speaker on its own.');
    else if (gap < 35) setNote(`<b>Fused, and localised to the stage.</b> Between roughly 5 and 35 ms the ear merges the two into one event and takes its <i>direction</i> from the first arrival, which is the PA. That is the precedence effect, and it is the entire reason a delay tower works: the listener gets the tower's level and the stage's position. The setting is the distance from the PA to the tower in milliseconds, ${(st.tower * MS_PER_M).toFixed(0)} ms here, plus about 10 to 15 ms so the PA is reliably first.`);
    else setNote('<b>Too far behind, and it has become an echo.</b> Past about 40 ms the ear stops fusing the two and hears a distinct repeat, which is unusable on speech and merely unpleasant on music. Somewhere between here and comb filtering is a window of about thirty milliseconds, and every delay tower on every show is set inside it.');
  };

  controls.append(
    slider('Tower distance', { min: 10, max: 50, step: 1, value: 30, fmt: (v) => `${v} m`, on: (v) => { st.tower = v; upd(); } }).node,
    slider('Listener', { min: 12, max: 70, step: 1, value: 38, fmt: (v) => `${v} m`, on: (v) => { st.listener = v; upd(); } }).node,
    slider('Delay on the tower', { min: 0, max: 180, step: 1, value: 0, fmt: (v) => `${v} ms`, on: (v) => { st.delay = v; upd(); } }).node,
    choice('Extra offset', [['0', 'none'], ['12', '+12 ms']], { value: '0', on: (v) => { st.haas = +v; upd(); } }).node
  );
  upd();
});
