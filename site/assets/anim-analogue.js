// The analogue half of the story.
//
// Everything else on this site starts once the signal is already numbers. This
// module is what happens before that, and what happened instead of it for the
// eighty years before a converter was cheap: a pressure wave becomes a voltage,
// a voltage gets bigger, several voltages are added together, and a voltage
// becomes a pressure wave again. Plus the two questions students actually ask,
// which are whether a record player is really all analogue and what is
// physically holding the sound on each thing we have ever recorded onto.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, labelWrap, textWidth, drawnSize, line, alpha, clamp, lerp, fitter,
} from './anim-core.js';

const mono = { mono: true };
const TAU = Math.PI * 2;

// ============================================================================
// 1. A microphone: pressure into voltage
// ============================================================================

register('mic-transduce', (host) => {
  const st = { spl: 94, kind: 'dynamic', freq: 1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a voice becomes a voltage',
    sub: 'A microphone is a machine for turning moving air into moving electrons. Nothing about it is clever; it is a diaphragm and a way of noticing that the diaphragm moved.',
    note: '&nbsp;',
  });

  // 94 dB SPL is 1 pascal, which is the reference every manufacturer quotes
  // sensitivity against. Dynamic capsules sit near 2 mV/Pa, condensers an order
  // of magnitude above because they are not asking the air to move a coil.
  const SENS = { dynamic: 2.0, condenser: 25.0 };
  const pascals = () => 10 ** ((st.spl - 94) / 20);
  const millivolts = () => pascals() * SENS[st.kind];

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const amp = clamp(Math.log10(pascals() * 10 + 1) * 12, 1.5, 22);
      const phase = t * st.freq * 2.2;

      // The air arriving, drawn as bands of pressure rather than a line: a
      // sound wave is not a shape in space, it is a place being squeezed.
      const bandX = ox, bandW = W * 0.3, midY = 92;
      label(g, 'the air', bandX, 22, { color: p.muted, size: 11, max: bandW });
      for (let i = 0; i < 26; i++) {
        const u = i / 25;
        const press = Math.sin(u * TAU * 2 - phase * TAU);
        const dens = 0.10 + 0.5 * (press * 0.5 + 0.5) * clamp(amp / 22, 0.12, 1);
        g.fillStyle = alpha(p.cyan, dens);
        g.fillRect(bandX + u * bandW, midY - 34, bandW / 26 + 0.8, 68);
      }

      // The diaphragm, moved by that pressure.
      const dx = ox + W * 0.36;
      const disp = Math.sin(-phase * TAU) * amp;
      line(g, dx, midY - 40, dx, midY + 40, { color: alpha(p.line, 0.9), lw: 1 });
      line(g, dx + disp, midY - 30, dx + disp, midY + 30, { color: p.amber, lw: 3 });
      label(g, 'diaphragm', dx - 26, midY + 58, { color: p.amber, size: 11, max: 100 });

      // What is behind it, which is the whole difference between the two kinds.
      const cx = ox + W * 0.55;
      if (st.kind === 'dynamic') {
        // A coil on the back of the diaphragm, sitting in a magnet's field.
        box(g, cx - 6, midY - 20, 34, 40, { fill: alpha(p.muted, 0.16), stroke: p.muted, r: 3 });
        for (let i = 0; i < 5; i++) {
          line(g, cx - 4 + disp * 0.6, midY - 16 + i * 8, cx + 26 + disp * 0.6, midY - 16 + i * 8,
            { color: p.red, lw: 1.6 });
        }
        label(g, 'coil in a magnet', cx - 10, midY + 40, { color: p.muted, size: 10.5, max: 150 });
        label(g, 'moving wire in a field makes a voltage', cx - 10, midY + 56,
          { color: p.muted, size: 10, max: W - (cx - ox) - 10 });
      } else {
        // Two plates: the diaphragm is one of them, so moving it changes the
        // capacitance, and a fixed charge then means a changing voltage.
        line(g, cx + 16, midY - 26, cx + 16, midY + 26, { color: p.muted, lw: 3 });
        label(g, '+48 V', cx + 24, midY - 34, { color: p.red, size: 10, max: 70, ...mono });
        for (let i = -2; i <= 2; i++) {
          line(g, dx + disp + 3, midY + i * 11, cx + 14, midY + i * 11,
            { color: alpha(p.cyan, 0.5), lw: 1, dash: [3, 3] });
        }
        label(g, 'a charged gap', cx - 10, midY + 40, { color: p.muted, size: 10.5, max: 150 });
        label(g, 'move one plate and the voltage across it changes', cx - 10, midY + 56,
          { color: p.muted, size: 10, max: W - (cx - ox) - 10 });
      }

      // The voltage that comes out, to scale against a millivolt grid.
      const gx = ox, gy = 190, gw = W, gh = 54;
      box(g, gx, gy, gw, gh, { fill: alpha(p.raised, 0.5), stroke: p.line, r: 6 });
      const mv = millivolts();
      // The graticule follows the signal. A fixed 60 mV scale is honest about
      // magnitude and useless to look at: at a normal talking level into a
      // dynamic capsule the trace is a flat line, which reads as broken rather
      // than as small. The number carries the magnitude; the picture carries
      // the shape, and the scale is printed so neither has to lie.
      const full = [0.3, 1, 3, 10, 30, 100, 300].find((x) => x >= mv * 1.25) || 300;
      const half = gy + gh / 2;
      line(g, gx, half, gx + gw, half, { color: alpha(p.line, 1), lw: 1 });
      g.beginPath();
      for (let i = 0; i <= 160; i++) {
        const u = i / 160;
        const v = Math.sin(u * TAU * 2 - phase * TAU) * (mv / full) * (gh / 2 - 3);
        const px = gx + u * gw, py = half - v;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.green; g.lineWidth = 2; g.stroke();
      label(g, `${mv < 1 ? mv.toFixed(2) : mv.toFixed(1)} mV`, gx + gw - 8, gy + 14,
        { color: p.green, size: 13, weight: 700, align: 'right', max: 120, ...mono });
      label(g, `${pascals() < 1 ? pascals().toFixed(3) : pascals().toFixed(2)} Pa at the diaphragm`,
        gx + 8, gy + 14, { color: p.muted, size: 10.5, max: gw - 140, ...mono });
      label(g, `${SENS[st.kind]} mV per pascal`, gx + 8, gy + gh - 12,
        { color: p.muted, size: 10.5, max: gw - 150, ...mono });
      label(g, `scale: ±${full} mV`, gx + gw - 8, gy + gh - 12,
        { color: p.muted, size: 10, align: 'right', max: 140, ...mono });
      fit(gy + gh + 16);
    },
  });

  const upd = () => {
    const mv = millivolts();
    if (st.kind === 'condenser') {
      setNote(`<b>A condenser does not ask the air to move a coil.</b> The diaphragm is one plate of a charged capacitor, so the air only has to move a few microns of very thin film, and the phantom power on pins 2 and 3 is what keeps the charge there. That is why it hears the detail a dynamic misses, and why it also hears the air conditioning. At ${st.spl} dB SPL it is putting out about ${mv < 1 ? mv.toFixed(2) : mv.toFixed(1)} mV.`);
    } else if (st.spl >= 120) {
      setNote(`<b>${mv.toFixed(1)} mV, and still nothing has gone wrong.</b> A dynamic capsule has no electronics in it to overload: the coil moves further and makes more voltage. What clips at this level is the preamp you plugged it into, which is why the pad switch exists. This is also why dynamics live in front of kick drums and guitar cabinets.`);
    } else {
      setNote(`<b>Air pressure moves a coil through a magnetic field, and that makes a voltage.</b> Faraday, 1831, and nothing since has improved on it for reliability. The number to keep is the scale: a loud voice at a foot is about a pascal, and a pascal gets you a couple of millivolts. Everything downstream exists to make that number bigger without making the noise bigger with it.`);
    }
  };

  controls.append(
    slider('Sound level', { min: 54, max: 130, step: 1, value: 94, fmt: (v) => `${v} dB SPL`, on: (v) => { st.spl = v; upd(); } }).node,
    choice('Capsule', [['dynamic', 'Dynamic'], ['condenser', 'Condenser']], { value: 'dynamic', on: (v) => { st.kind = v; upd(); } }).node,
    slider('Pitch', { min: 0.4, max: 2.4, step: 0.1, value: 1, fmt: (v) => `${v.toFixed(1)}×`, on: (v) => { st.freq = v; } }).node
  );
  upd();
});

// ============================================================================
// 2. Gain: the same signal, seven orders of magnitude apart
// ============================================================================

register('gain-stage', (host) => {
  const st = { gain: 50, noisy: false };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'Why the preamp is the most important knob on the desk',
    sub: 'The same sound at four points in the chain. Watch the signal and the noise floor separately, because only one of them is supposed to grow.',
    note: '&nbsp;',
  });

  challenge('Put the preamp output at line level, then switch the long cable in and watch which of the two numbers moves.',
    () => st.gain >= 50 && st.gain <= 60);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(660, w - 24), ox = (w - W) / 2;

      // dBu throughout: 0 dBu is 0.775 V. A capsule at a normal talking level
      // is around -50 dBu, professional line level is +4.
      const micDbu = -50;
      const noiseDbu = st.noisy ? -96 : -128;      // a bad cable run against a decent preamp
      const preOut = micDbu + st.gain;
      const STAGES = [
        { label: 'Capsule', sig: micDbu, noise: -132, why: 'what the microphone makes', judged: true },
        { label: 'Preamp out', sig: preOut, noise: noiseDbu + st.gain, why: `+${st.gain} dB of gain, here`, judged: true },
        { label: 'Through the desk', sig: preOut, noise: noiseDbu + st.gain, why: 'faders and EQ, nothing louder', judged: true },
        { label: 'Amplifier out', sig: preOut + 30, noise: noiseDbu + st.gain + 30, why: '+30 dB more, and the hiss too', judged: false },
      ];

      // Wide enough and the name sits beside the bar. On a phone that leaves
      // the bar about 150px, which is not a scale, so the name goes above it
      // and the bar takes the full width.
      const stacked = W < 470;
      const valW = textWidth(g, '+000 dBu', { size: 10.5, mono: true }) + 12;
      const labW = stacked ? 0 : clamp(W * 0.26, 108, 168);
      const barX = ox + labW, barW = W - labW - valW;
      const LO = -140, HI = 40;
      const xOf = (dbu) => barX + ((clamp(dbu, LO, HI) - LO) / (HI - LO)) * barW;

      const top = 26, rowH = stacked ? 64 : 48;
      const judgedRows = STAGES.filter((x) => x.judged).length;

      // The two references belong to the small-signal stages only: a power
      // amplifier's output is meant to be far above line level, so drawing a
      // line-level ceiling across it would be marking it wrong for working.
      for (const [dbu, col] of [[4, p.green], [24, p.red]]) {
        const x = xOf(dbu);
        line(g, x, top - 6, x, top + judgedRows * rowH - 14, { color: alpha(col, 0.7), lw: 1.4, dash: [4, 4] });
      }

      STAGES.forEach((s, i) => {
        const y = top + i * rowH;
        const barY = stacked ? y + 20 : y;
        if (stacked) {
          label(g, s.label, ox, y + 6, { color: p.ink2, size: 11.5, weight: 600, max: W * 0.55 });
          label(g, s.why, ox + W, y + 6, { color: p.muted, size: 9.5, align: 'right', max: W * 0.44 });
        } else {
          label(g, s.label, ox, y + 8, { color: p.ink2, size: 11.5, weight: 600, max: labW - 10 });
          labelWrap(g, s.why, ox, y + 24, { color: p.muted, size: 9.5, max: labW - 10, maxLines: 2 });
        }
        const nx = xOf(s.noise);
        box(g, barX, barY, Math.max(1, nx - barX), 18, { fill: alpha(p.muted, 0.35), stroke: 'transparent', r: 2 });
        const sx = xOf(s.sig);
        const over = s.judged && s.sig > 24;
        box(g, barX, barY, Math.max(2, sx - barX), 18,
          { fill: alpha(over ? p.red : p.cyan, 0.55), stroke: over ? p.red : p.cyan, r: 2, lw: 1 });
        label(g, `${s.sig > 0 ? '+' : ''}${s.sig.toFixed(0)} dBu`, ox + W, barY + 9,
          { color: over ? p.red : p.ink2, size: 10.5, align: 'right', max: valW, ...mono });
        label(g, `${(s.sig - s.noise).toFixed(0)} dB above the hiss`, barX + 2, barY + 28,
          { color: p.muted, size: 10, max: barW + valW - 4, ...mono });
      });

      // The legend goes in the gap the dashed lines leave when there is one,
      // and under everything when the rows are stacked and there is not.
      const ry = stacked ? top + STAGES.length * rowH + 8 : top + judgedRows * rowH - 6;
      const seg = [['dashed:', p.muted], ['line level +4', p.green], ['preamp ceiling +24', p.red]];
      let lx = stacked ? ox : barX;
      for (const [txt, col] of seg) {
        label(g, txt, lx, ry, { color: col, size: 9.5, max: ox + W - lx, ...mono });
        lx += textWidth(g, `${txt}  `, { size: 9.5, mono: true });
      }

      let y2 = top + STAGES.length * rowH + (stacked ? 20 : 4);
      const verdict = preOut > 24
        ? ['Clipping at the preamp. Nothing downstream can undo this.', p.red]
        : preOut < -16
          ? ['Too quiet here, so everything after has to shout, and the hiss shouts with it.', p.amber]
          : ['Roughly right: loud enough at the first stage, still under the ceiling.', p.green];
      y2 += labelWrap(g, verdict[0], ox, y2 + 8, { color: verdict[1], size: 12, weight: 650, max: W, maxLines: 2 }) + 6;
      const gap = STAGES[3].sig - STAGES[3].noise;
      y2 += labelWrap(g, `The bottom row is a loudspeaker, not a fault: it is meant to be far above line level. What matters there is the ${gap.toFixed(0)} dB between the music and the hiss, and that gap was decided at the preamp. Every stage after it multiplies both by the same amount.`,
        ox, y2 + 6, { color: p.muted, size: 11, max: W, maxLines: 6 });
      fit(y2 + 18);
    },
  });

  const upd = () => {
    const sig = -50 + st.gain;
    if (sig > 24) setNote('<b>The preamp is clipping.</b> The top of the waveform is being cut off flat, and no fader, no EQ and no plugin further down can put it back: what was there is gone. On a desk this is the meter you look at before you look at anything else.');
    else if (sig < -16) setNote('<b>Too little gain at the front.</b> The signal is limping out of the preamp barely above the noise, and every stage after it multiplies both equally. Turn a quiet signal up late and you turn the hiss up with it, in exactly the same proportion, which is why gain structure is set from the front backwards.');
    else if (st.noisy) setNote('<b>The noise floor came from the cable, not the preamp.</b> A long unbalanced run, or a bad earth, adds its noise before the amplification, so it gets the full gain of the chain applied to it just like the signal does. This is the entire argument for balanced lines and for putting the preamp near the microphone.');
    else setNote('<b>Amplify early, once, and then leave it alone.</b> Noise added before the gain gets amplified with the signal; noise added after it does not. So the first amplifier decides the signal to noise ratio of the whole chain, and everything downstream can only make it worse. That is why the preamp is the important knob and the fader is not.');
  };

  controls.append(
    slider('Preamp gain', { min: 0, max: 80, step: 1, value: 50, fmt: (v) => `+${v} dB`, on: (v) => { st.gain = v; upd(); } }).node,
    toggle('A long unbalanced cable', { on: (v) => { st.noisy = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 3. A loudspeaker: voltage back into pressure
// ============================================================================

register('speaker-move', (host) => {
  const st = { watts: 100, freq: 1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'A loudspeaker is a microphone running backwards',
    sub: 'The same three parts in the same order, with the arrows reversed. Current through a coil in a magnet makes force; force moves a cone; a moving cone squeezes air.',
    note: '&nbsp;',
  });

  // 8 ohms, and a fairly ordinary 96 dB at 1 W at 1 m.
  const volts = () => Math.sqrt(st.watts * 8);
  const spl = () => 96 + 10 * Math.log10(st.watts);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 280,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const phase = t * st.freq * 2.2;
      const swing = Math.sin(phase * TAU);
      const excursion = clamp(Math.log10(st.watts + 1) * 7, 2, 22);
      const midY = 96;

      // The voltage arriving.
      const gx = ox, gw = W * 0.26;
      label(g, 'the amplifier sends', gx, 20, { color: p.muted, size: 11, max: gw });
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const u = i / 90;
        const v = Math.sin(u * TAU * 1.6 - phase * TAU) * 30;
        const px = gx + u * gw, py = midY - v;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = p.green; g.lineWidth = 2; g.stroke();
      label(g, `${volts().toFixed(1)} V into 8 Ω`, gx, midY + 52, { color: p.green, size: 11, max: gw + 40, ...mono });

      // The coil, the magnet and the cone.
      const cx = ox + W * 0.42;
      box(g, cx - 16, midY - 30, 30, 60, { fill: alpha(p.muted, 0.14), stroke: p.muted, r: 4 });
      label(g, 'magnet', cx - 16, midY + 46, { color: p.muted, size: 10, max: 80 });
      const coilX = cx + swing * excursion;
      for (let i = 0; i < 4; i++) {
        line(g, coilX - 8, midY - 12 + i * 8, coilX + 8, midY - 12 + i * 8, { color: p.red, lw: 1.8 });
      }
      // The cone, hinged at the surround, drawn as two straight walls.
      const coneBase = cx + 16, coneTip = cx + 96 + swing * excursion;
      line(g, coneBase, midY - 12 + swing * excursion * 0.2, coneTip, midY - 46, { color: p.amber, lw: 2.5 });
      line(g, coneBase, midY + 12 + swing * excursion * 0.2, coneTip, midY + 46, { color: p.amber, lw: 2.5 });
      line(g, coneTip, midY - 46, coneTip, midY + 46, { color: alpha(p.amber, 0.5), lw: 1.5 });
      label(g, 'cone', coneBase + 20, midY + 62, { color: p.amber, size: 10.5, max: 90 });
      label(g, 'F = B I L', cx - 16, midY - 44, { color: p.red, size: 10.5, max: 110, ...mono });

      // The air it pushes.
      const aX = coneTip + 12, aW = ox + W - aX;
      if (aW > 40) {
        for (let i = 0; i < 22; i++) {
          const u = i / 21;
          const press = Math.sin(u * TAU * 1.6 - phase * TAU);
          const dens = 0.08 + 0.5 * (press * 0.5 + 0.5) * clamp(excursion / 22, 0.15, 1);
          g.fillStyle = alpha(p.cyan, dens);
          g.fillRect(aX + u * aW, midY - 34, aW / 22 + 0.8, 68);
        }
        label(g, 'moving air', aX, midY + 62, { color: p.cyan, size: 10.5, max: aW });
      }

      const ry = 200;
      const rows = [
        [`${st.watts} W into 8 Ω is ${volts().toFixed(1)} V and ${(volts() / 8).toFixed(1)} A`, p.muted],
        [`${spl().toFixed(0)} dB SPL at one metre, from a box rated 96 dB at 1 W`, p.ink],
        ['about one percent of that power becomes sound; the rest becomes heat in the coil', p.muted],
      ];
      let yy = ry;
      for (const [txt, col] of rows) {
        yy += labelWrap(g, txt, ox, yy, { color: col, size: 11.5, max: W, maxLines: 2, ...mono }) + 5;
      }
      fit(yy + 10);
    },
  });

  const upd = () => {
    if (st.watts >= 800) setNote(`<b>${spl().toFixed(0)} dB at a metre, and the coil is now a heater.</b> Roughly one percent of the electrical power leaves as sound and the other ninety nine percent warms the voice coil, which is why a driver dies of heat rather than of movement. Doubling the power buys 3 dB, which is the smallest change most people notice, and that is the whole reason large systems use more boxes rather than bigger amplifiers.`);
    else setNote(`<b>Current through a coil in a magnetic field makes a force, and the force moves the cone.</b> It is the microphone's mechanism with the arrows reversed: there the air moved the coil and made a voltage, here the voltage moves the coil and makes air. Connect a loudspeaker to a preamp and shout into it and you really do get a signal out, which is what a talkback speaker is doing.`);
  };

  controls.append(
    slider('Amplifier power', { min: 1, max: 2000, step: 1, value: 100, fmt: (v) => `${v} W`, on: (v) => { st.watts = v; upd(); } }).node,
    slider('Pitch', { min: 0.4, max: 2.4, step: 0.1, value: 1, fmt: (v) => `${v.toFixed(1)}×`, on: (v) => { st.freq = v; } }).node
  );
  upd();
});

// ============================================================================
// 4. A mixer: adding voltages, which is all a mix is
// ============================================================================

register('mixer-sum', (host) => {
  const CH = [
    { name: 'Vocal', col: 'amber', f: 1.0, base: 0.9 },
    { name: 'Guitar', col: 'cyan', f: 1.6, base: 0.6 },
    { name: 'Kick', col: 'green', f: 0.35, base: 1.0 },
  ];
  const st = { f: [80, 65, 70], solo: -1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'What a mixer actually does to the voltages',
    sub: 'A fader is a way of making a voltage smaller. A bus is a wire that several of them are connected to. That is the whole idea; everything else on the desk is convenience.',
    note: '&nbsp;',
  });

  const lev = (i) => (st.solo >= 0 && st.solo !== i ? 0 : (st.f[i] / 100) ** 2);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const phase = t * 1.4;
      const chH = 46, top = 26;
      const traceX = ox + 84, traceW = W - 150;

      const at = (i, u) => Math.sin((u * 2.2 - phase) * TAU * CH[i].f) * CH[i].base;

      CH.forEach((c, i) => {
        const y = top + i * chH;
        const col = p[c.col];
        label(g, c.name, ox, y + 14, { color: col, size: 11.5, weight: 600, max: 78 });
        label(g, `${st.f[i]}`, ox, y + 30, { color: p.muted, size: 10, max: 78, ...mono });
        g.beginPath();
        for (let k = 0; k <= 120; k++) {
          const u = k / 120;
          const v = at(i, u) * lev(i) * 16;
          const px = traceX + u * traceW, py = y + 18 - v;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.strokeStyle = lev(i) > 0.001 ? col : alpha(p.muted, 0.4);
        g.lineWidth = 2; g.stroke();
        // The fader, drawn as what it is: a tap part way down a resistor.
        const fx = traceX + traceW + 16;
        line(g, fx, y + 4, fx, y + 32, { color: p.line, lw: 3 });
        const fy = y + 32 - (st.f[i] / 100) * 28;
        box(g, fx - 7, fy - 3, 14, 6, { fill: col, stroke: 'transparent', r: 2 });
      });

      // The bus: the same wire, with all three arriving on it.
      const by = top + CH.length * chH + 12;
      line(g, ox, by - 6, ox + W, by - 6, { color: alpha(p.line, 1), lw: 1 });
      label(g, 'mix bus', ox, by + 16, { color: p.ink, size: 11.5, weight: 650, max: 78 });
      let peak = 0;
      g.beginPath();
      for (let k = 0; k <= 200; k++) {
        const u = k / 200;
        let v = 0;
        for (let i = 0; i < CH.length; i++) v += at(i, u) * lev(i);
        peak = Math.max(peak, Math.abs(v));
        const clipped = clamp(v, -2.6, 2.6);
        const px = traceX + u * traceW, py = by + 18 - clipped * 14;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      const hot = peak > 2.6;
      g.strokeStyle = hot ? p.red : p.ink; g.lineWidth = 2.4; g.stroke();
      if (hot) {
        line(g, traceX, by + 18 - 2.6 * 14, traceX + traceW, by + 18 - 2.6 * 14, { color: alpha(p.red, 0.7), lw: 1, dash: [4, 4] });
        line(g, traceX, by + 18 + 2.6 * 14, traceX + traceW, by + 18 + 2.6 * 14, { color: alpha(p.red, 0.7), lw: 1, dash: [4, 4] });
      }

      const sy = by + 52;
      const sum = CH.reduce((a, c, i) => a + c.base * lev(i), 0);
      const txt = hot
        ? 'The bus is over its ceiling. Nothing is broken upstream; the sum is simply bigger than the electronics can swing.'
        : `Three voltages on one wire add up to one voltage. Peak on the bus is ${sum.toFixed(2)} of the ${CH.length} channel maximum.`;
      const h1 = labelWrap(g, txt, ox, sy, { color: hot ? p.red : p.muted, size: 11.5, max: W, maxLines: 3 });
      fit(sy + h1 + 14);
    },
  });

  const upd = () => {
    const anyHot = CH.reduce((a, c, i) => a + c.base * lev(i), 0) > 2.6;
    if (anyHot) setNote('<b>The master is not the answer.</b> The bus is clipping because the sum of what is on it is larger than the rail voltage of the summing amplifier, so pulling the master fader down after the clipping happened lowers a signal that is already square. The fix is upstream: fewer channels, or less of each. On a digital desk the same thing happens to the numbers instead of to the volts, and the fix is the same.');
    else if (st.solo >= 0) setNote(`<b>Solo is not a mix, it is a different bus.</b> The other channels are still there and still at their fader levels; you are listening to a separate wire that only ${CH[st.solo].name} is connected to. That is why soloing does not change what the audience hears, and why a solo left up at the end of a rehearsal is a classic way to lose the show.`);
    else setNote('<b>A fader takes a fraction of a voltage, and a bus adds the fractions together.</b> That is the whole mechanism, and it is why two identical signals summed come out 6 dB louder rather than twice as loud sounding. Every mixing desk built between the 1930s and the 1990s was this and nothing else; a digital desk does the same arithmetic to numbers, which is why the words on it did not change.');
  };

  controls.append(
    ...CH.map((c, i) => slider(c.name, { min: 0, max: 100, step: 1, value: st.f[i], fmt: (v) => `${v}`, on: (v) => { st.f[i] = v; upd(); } }).node),
    choice('Solo', [['-1', 'Off'], ['0', 'Vocal'], ['1', 'Guitar'], ['2', 'Kick']], { value: '-1', on: (v) => { st.solo = +v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. A record: the one chain with no numbers anywhere in it
// ============================================================================

register('vinyl-path', (host) => {
  const st = { stage: 0, riaa: true };
  const STEPS = [
    ['The groove', 'A wiggle cut into a spiral. Louder is wider; higher pitched is a tighter wiggle. Stereo puts one channel on each wall of the groove, at 45 degrees.'],
    ['The stylus', 'A diamond tip, about 15 microns across, riding in that wiggle and being shaken side to side by it.'],
    ['The cartridge', 'The stylus shakes a magnet next to a coil. Faraday again, exactly as in the microphone, and it makes about 5 mV.'],
    ['RIAA', 'Bass was cut down before the record was made, so it has to be put back on the way out. Without that the record is thin and the treble hisses.'],
    ['The amplifier', 'Millivolts to volts, and volts into a coil in a magnet, and a cone pushes air.'],
  ];

  const { controls, stage, setNote } = figure(host, {
    title: 'A record, from the groove to the room',
    sub: 'Five stages, and not one of them counts anything. This is the whole argument about what analogue means, drawn as a chain.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(640, w - 24), ox = (w - W) / 2;

      // The groove, drawn from above, with the stylus in it.
      const gy = 54, gw = W, gh = 46;
      label(g, 'the groove, from above', ox, 20, { color: p.muted, size: 11, max: W });
      const wig = (u) => Math.sin(u * TAU * 3) * 9 + Math.sin(u * TAU * 11 + 1) * (st.riaa ? 3 : 3) * 0.7;
      for (const side of [-1, 1]) {
        g.beginPath();
        for (let k = 0; k <= 220; k++) {
          const u = k / 220;
          const px = ox + u * gw, py = gy + gh / 2 + wig(u) + side * 7;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.strokeStyle = alpha(p.muted, 0.8); g.lineWidth = 1.4; g.stroke();
      }
      const su = (t * 0.11) % 1;
      const sx = ox + su * gw, sy = gy + gh / 2 + wig(su);
      g.fillStyle = p.amber;
      g.beginPath(); g.moveTo(sx, sy + 8); g.lineTo(sx - 5, sy - 6); g.lineTo(sx + 5, sy - 6); g.closePath(); g.fill();

      // What the cartridge makes of that, before and after the equalisation.
      const vy = 124, vh = 44;
      label(g, st.riaa ? 'after RIAA, as it was played' : 'as cut, bass held back', ox, vy - 8,
        { color: st.riaa ? p.green : p.amber, size: 11, max: W });
      g.beginPath();
      for (let k = 0; k <= 240; k++) {
        const u = k / 240;
        const bass = Math.sin((u * 3 - t * 0.5) * TAU) * (st.riaa ? 15 : 3.2);
        const treble = Math.sin((u * 17 - t * 0.5) * TAU) * (st.riaa ? 3 : 6.5);
        const px = ox + u * W, py = vy + vh / 2 - (bass + treble);
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = st.riaa ? p.green : p.amber; g.lineWidth = 2; g.stroke();

      // The chain, with the stage under inspection lit.
      const cy = 190;
      const gap = 7;
      const bw = (W - gap * (STEPS.length - 1)) / STEPS.length;
      STEPS.forEach(([name], i) => {
        const x = ox + i * (bw + gap);
        const on = i === st.stage;
        box(g, x, cy, bw, 40, {
          fill: on ? alpha(p.cyan, 0.16) : alpha(p.raised, 0.6),
          stroke: on ? p.cyan : p.line, r: 6, lw: on ? 2 : 1,
        });
        labelWrap(g, name, x + bw / 2, cy + 15, { color: on ? p.cyan : p.ink2, size: 10, align: 'center', max: bw - 8, maxLines: 2 });
      });

      const ty = cy + 52;
      const h = labelWrap(g, STEPS[st.stage][1], ox, ty, { color: p.ink2, size: 12, max: W, maxLines: 3 });
      const h2 = labelWrap(g, 'No stage in this chain measures anything. There is no clock, no sample rate and no number: the shape in the groove is a scale model of the pressure in the room, and every stage keeps it a shape.',
        ox, ty + h + 10, { color: p.muted, size: 11, max: W, maxLines: 5 });
      fit(ty + h + h2 + 20);
    },
  });

  const upd = () => {
    if (!st.riaa) {
      setNote('<b>RIAA is not a tone control, it is a way of fitting the music in the space.</b> Bass at full level needs a groove so wide that a twelve inch side would hold about four minutes, and the stylus would leave the groove on every kick. So bass is cut down before the record is made and put back on the way out, by a curve everybody agreed on in 1954. Turn the playback half off, as here, and you hear what is actually in the plastic.');
    } else if (st.stage === 2) {
      setNote('<b>The cartridge is a microphone.</b> A magnet moving near a coil, making a few millivolts, which is why a turntable needs a phono input rather than a line input and why plugging one into a line socket sounds thin and quiet. It is the same physics as the dynamic capsule, driven by a groove instead of by air.');
    } else {
      setNote('<b>Yes, it is genuinely analogue end to end, and yes, it works with no computer anywhere.</b> A shape in plastic shakes a diamond, which shakes a magnet, which makes a voltage, which is made bigger, which shakes a cone. It is the only complete chain most students will meet that has no converter in it. One honest footnote: the playback path being analogue says nothing about the recording, and most records pressed since the 1980s passed through a digital master on the way to the lathe.');
    }
  };

  controls.append(
    choice('Look at', STEPS.map(([n], i) => [String(i), n]), { value: '0', on: (v) => { st.stage = +v; upd(); } }).node,
    toggle('Playback equalisation on', { value: true, on: (v) => { st.riaa = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 6. The same job, two eras: what the wire is carrying
// ============================================================================

register('era-paths', (host) => {
  const DOMAIN = {
    light: {
      label: 'Lighting',
      analogue: {
        wire: 'one pair per dimmer', unit: '0 to 10 volts',
        chain: ['Desk fader', 'One wire, per channel', 'Dimmer rack', 'Lamp'],
        cost: '48 channels needs 48 pairs, and a 48 way multicore is the thickness of your wrist.',
        fail: 'A voltage that drifts gives you a level that is nearly right, and nothing reports it.',
      },
      digital: {
        wire: 'one pair for all of them', unit: '512 numbers, 0 to 255, 44 times a second',
        chain: ['Console', 'One cable, all channels', 'Dimmer or node', 'Lamp'],
        cost: 'One pair carries 512 channels. Beyond that you add a universe, not a wire.',
        fail: 'A number arrives whole or it does not arrive. Corruption looks like a fixture ignoring you, not like a level being slightly off.',
      },
    },
    picture: {
      label: 'Video',
      analogue: {
        wire: 'one coax per picture', unit: 'a voltage, line by line, 0.7 V for white',
        chain: ['Camera', 'Coax', 'Vision mixer', 'Monitor'],
        cost: 'Every metre of cable takes a little off the top of the picture and you cannot get it back.',
        fail: 'Softness, smear, a tilted picture. It degrades gradually, so nobody notices the day it starts.',
      },
      digital: {
        wire: 'one coax, or one network', unit: '10 bit samples, 1.485 Gbit/s for HD',
        chain: ['Camera', 'SDI or IP', 'Switcher', 'Display'],
        cost: 'Perfect to the end of the cable, then nothing at all.',
        fail: 'It works, or it sparkles and drops out. There is no soft middle to misread.',
      },
    },
    sound: {
      label: 'Sound',
      analogue: {
        wire: 'one balanced pair per channel', unit: 'a voltage, about 1.23 V at +4 dBu',
        chain: ['Microphone', 'Multicore', 'Desk', 'Amplifier'],
        cost: '48 inputs to the desk is a 48 pair snake, and a stage box the size of a suitcase.',
        fail: 'Hum, hiss and crosstalk accumulate down the run and every stage adds its own.',
      },
      digital: {
        wire: 'one Cat5e, both directions', unit: '48,000 samples a second, 24 bits each',
        chain: ['Microphone', 'Stage box', 'Network', 'Desk and amplifier'],
        cost: 'One cable carries the lot, and the preamp moved to the stage where the microphone is.',
        fail: 'Clean until it is not. Clock trouble is silent for an hour and then clicks.',
      },
    },
  };
  const st = { d: 'light', era: 'both' };
  const { controls, stage, setNote } = figure(host, {
    title: 'The same job, before and after the numbers',
    sub: 'Two eras of the same signal path, drawn side by side. What changed is not the job, it is what the wire is carrying and therefore what going wrong looks like.',
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
      const D = DOMAIN[st.d];
      const rows = st.era === 'both' ? [['analogue', p.amber], ['digital', p.cyan]]
        : [[st.era, st.era === 'analogue' ? p.amber : p.cyan]];

      let y = 22;
      for (const [key, col] of rows) {
        const E = D[key];
        label(g, key === 'analogue' ? 'The analogue path' : 'The digital path', ox, y,
          { color: col, size: 12.5, weight: 700, max: W * 0.5 });
        label(g, E.unit, ox + W, y, { color: p.muted, size: 10.5, align: 'right', max: W * 0.5, ...mono });
        y += 16;

        // The chain, as boxes with the wire between them called out.
        const gap = 8;
        const bw = (W - gap * (E.chain.length - 1)) / E.chain.length;
        const bh = 40;
        E.chain.forEach((name, i) => {
          const x = ox + i * (bw + gap);
          box(g, x, y, bw, bh, { fill: alpha(col, 0.12), stroke: alpha(col, 0.8), r: 6, lw: 1.2 });
          labelWrap(g, name, x + bw / 2, y + 15, { color: p.ink2, size: 10, align: 'center', max: bw - 8, maxLines: 2 });
          if (i < E.chain.length - 1) line(g, x + bw, y + bh / 2, x + bw + gap, y + bh / 2, { color: alpha(col, 0.7), lw: 1.6 });
        });
        y += bh + 8;
        label(g, `on the wire: ${E.wire}`, ox, y + 4, { color: col, size: 10.5, max: W, ...mono });
        y += 18;
        y += labelWrap(g, E.cost, ox, y + 4, { color: p.ink2, size: 11, max: W, maxLines: 2 }) + 6;
        y += labelWrap(g, `when it goes wrong: ${E.fail}`, ox, y + 4, { color: p.muted, size: 11, max: W, maxLines: 3 }) + 14;
      }
      fit(y + 6);
    },
  });

  const upd = () => {
    const D = DOMAIN[st.d];
    if (st.d === 'light') setNote('<b>Analogue lighting control was one wire per dimmer, carrying nought to ten volts.</b> The wire <i>was</i> the channel number: which pair you plugged into decided which lamp moved. DMX replaced that with one pair carrying 512 numbers in order, forty four times a second, so the channel number became a position in a list rather than a physical socket. That is the whole change, and it is why patching became arithmetic and why a wrong address now looks like the wrong light rather than a loose wire.');
    else if (st.d === 'picture') setNote('<b>Analogue video was a voltage tracing out each line of the picture.</b> Nought volts was black, seven tenths of a volt was white, and everything between them was a shade, so anything that lost a little voltage lost a little picture, permanently and quietly. Digital video sends numbers instead, so it is exact right up to the moment it is not: perfect, perfect, perfect, sparkles, gone. Neither is better; they fail differently, and knowing which failure you are looking at is most of fixing it.');
    else setNote('<b>Analogue audio was a voltage that was a scale model of the pressure at the microphone.</b> Every metre of copper, every connector and every stage added its own noise to that model, and none of it could ever be removed. Sending numbers instead means the hundredth metre is identical to the first. What you buy with that is distance and channel count; what you pay is a clock that everything now has to agree on, and a failure that arrives without warning.');
  };

  controls.append(
    choice('Domain', [['light', 'Lighting'], ['picture', 'Video'], ['sound', 'Sound']], { value: 'light', on: (v) => { st.d = v; upd(); } }).node,
    choice('Show', [['both', 'Both'], ['analogue', 'Analogue only'], ['digital', 'Digital only']], { value: 'both', on: (v) => { st.era = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 7. What is physically on the medium
// ============================================================================

register('medium-store', (host) => {
  const M = {
    vinyl: {
      label: 'Vinyl', year: '1948', col: 'amber', kind: 'shape',
      holds: 'a wiggle cut into a spiral groove',
      reads: 'a diamond tip rides the wiggle and shakes a magnet',
      scale: 'groove about 50 µm wide, stylus tip about 15 µm',
      cap: 'about 22 minutes a side at 33⅓ rpm',
      note: 'Nothing is counted. The groove is a scale model of the pressure wave, so a scratch is not a lost bit, it is a click that is now part of the music.',
    },
    tape: {
      label: 'Tape', year: '1935', col: 'red', kind: 'shape',
      holds: 'magnetic particles pointed one way or the other',
      reads: 'a coil sees the field change as the tape moves past it',
      scale: 'particles under a micron, tape moving at 38 cm a second',
      cap: 'about 15 minutes a reel at that speed',
      note: 'Also a scale model, magnetised rather than carved. Play it a thousand times and it wears; copy it and the copy is worse, because the noise of the second tape adds to the noise of the first.',
    },
    cd: {
      label: 'CD', year: '1982', col: 'cyan', kind: 'bits',
      holds: 'pits pressed into a spiral, and the flat land between them',
      reads: 'a 780 nm laser; a pit edge scatters the light, so reflection changes',
      scale: 'track pitch 1.6 µm, pits about 0.5 µm wide',
      cap: '74 minutes, 44,100 samples a second, 16 bits, two channels',
      note: 'The first medium in this list that counts. A change from pit to land is a one and no change is a zero, so a scratch is a wrong number that error correction can often work out again. That is why a damaged CD plays perfectly and then stops dead.',
    },
    hdd: {
      label: 'Hard disk', year: '1956', col: 'green', kind: 'bits',
      holds: 'magnetic domains standing up or down in a thin film',
      reads: 'a head flying about 3 nm above a platter spinning at 7,200 rpm',
      scale: 'a bit is tens of nanometres, the flying height is smaller than a smoke particle',
      cap: 'terabytes, and about 5 ms to reach a block that is somewhere else',
      note: 'Magnetism again, like tape, but counted rather than traced, and on a rigid disc so the head can go straight to a place instead of winding to it. The 5 ms is mechanical: the arm has to move and the platter has to come round.',
    },
    ssd: {
      label: 'SSD', year: '1991', col: 'ink2', kind: 'bits',
      holds: 'electrons trapped on a gate inside each cell',
      reads: 'how much charge is there changes the voltage the cell switches at',
      scale: 'nothing moves at all; a cell is tens of nanometres',
      cap: 'terabytes, and about 0.1 ms to reach any block, wherever it is',
      note: 'Four bits a cell means sixteen distinguishable charge levels in one cell, which is why the more a drive holds per cell the sooner it wears out. The charge leaks slowly, so an SSD left unpowered for years is not an archive.',
    },
  };
  const st = { m: 'vinyl' };
  const { controls, stage, setNote } = figure(host, {
    title: 'What is actually on the thing',
    sub: 'Five ways of making a room full of sound survive being put down and picked up again. Two of them keep a shape; three of them keep a count.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(620, w - 24), ox = (w - W) / 2;
      const d = M[st.m];
      const col = p[d.col] || p.ink2;
      const my = 30, mh = 74;

      // A close look at the surface, drawn the way each one actually stores it.
      box(g, ox, my, W, mh, { fill: alpha(p.raised, 0.5), stroke: p.line, r: 6 });
      const scroll = (t * 0.16) % 1;
      const wave = (u) => Math.sin((u + scroll) * TAU * 2.4) * 0.7 + Math.sin((u + scroll) * TAU * 7 + 1) * 0.3;

      if (st.m === 'vinyl') {
        for (const side of [-1, 1]) {
          g.beginPath();
          for (let k = 0; k <= 200; k++) {
            const u = k / 200;
            g.lineTo(ox + 8 + u * (W - 16), my + mh / 2 + wave(u) * 18 + side * 6);
          }
          g.strokeStyle = alpha(col, 0.9); g.lineWidth = 1.6; g.stroke();
        }
      } else if (st.m === 'tape') {
        for (let k = 0; k < 60; k++) {
          const u = k / 59;
          const v = wave(u);
          const x = ox + 10 + u * (W - 20);
          const up = v > 0;
          g.fillStyle = alpha(up ? col : p.cyan, 0.65);
          g.fillRect(x - 2.5, my + mh / 2 - (up ? 16 : 0), 5, 16);
          label(g, up ? 'N' : 'S', x, my + mh / 2 + (up ? -22 : 24),
            { color: alpha(up ? col : p.cyan, 0.8), size: 8, align: 'center', max: 12, ...mono });
        }
      } else if (st.m === 'cd') {
        // Pits and lands, with the beam sitting over one of them.
        let x = ox + 12;
        let i = 0;
        while (x < ox + W - 14) {
          const len = 7 + ((i * 7919) % 5) * 4;
          const pit = (i + Math.floor(scroll * 6)) % 2 === 0;
          if (pit) box(g, x, my + mh / 2 - 7, len, 14, { fill: alpha(col, 0.55), stroke: alpha(col, 0.9), r: 2 });
          else line(g, x, my + mh / 2, x + len, my + mh / 2, { color: alpha(p.muted, 0.7), lw: 1.5 });
          x += len + 3; i++;
        }
        const bx = ox + 12 + ((t * 40) % (W - 40));
        line(g, bx, my + 6, bx, my + mh - 6, { color: alpha(p.red, 0.8), lw: 2 });
        label(g, 'laser', bx + 4, my + 12, { color: p.red, size: 9.5, max: 60 });
      } else if (st.m === 'hdd') {
        for (let k = 0; k < 44; k++) {
          const u = k / 43;
          const up = wave(u) > 0;
          const x = ox + 12 + u * (W - 24);
          g.fillStyle = alpha(up ? col : p.amber, 0.6);
          g.fillRect(x - 3, my + mh / 2 - (up ? 18 : -2), 6, 20);
        }
        const hx = ox + 12 + (((t * 0.3) % 1)) * (W - 24);
        g.fillStyle = p.ink;
        g.beginPath(); g.moveTo(hx, my + 16); g.lineTo(hx - 6, my + 4); g.lineTo(hx + 6, my + 4); g.closePath(); g.fill();
        label(g, 'head, 3 nm up', hx + 8, my + 10, { color: p.muted, size: 9.5, max: 120 });
      } else {
        // Cells, each holding one of sixteen charge levels.
        const cols = 16, cw = (W - 24) / cols;
        for (let k = 0; k < cols; k++) {
          const lvl = Math.floor((Math.sin((k / cols + scroll) * TAU * 2) * 0.5 + 0.5) * 15);
          const x = ox + 12 + k * cw;
          box(g, x + 2, my + 10, cw - 4, mh - 20, { fill: alpha(p.line, 0.4), stroke: p.line, r: 3 });
          const fill = ((lvl + 1) / 16) * (mh - 24);
          box(g, x + 3, my + mh - 12 - fill, cw - 6, fill, { fill: alpha(col, 0.6), stroke: 'transparent', r: 2 });
          label(g, String(lvl.toString(16)).toUpperCase(), x + cw / 2, my + mh - 4,
            { color: p.muted, size: 8.5, align: 'center', max: cw, ...mono });
        }
      }

      // What that means, in four plain lines.
      let y = my + mh + 18;
      label(g, `${d.label}, ${d.year}`, ox, y, { color: col, size: 13, weight: 700, max: W * 0.6 });
      label(g, d.kind === 'shape' ? 'keeps a shape' : 'keeps a count', ox + W, y,
        { color: d.kind === 'shape' ? p.amber : p.cyan, size: 11, weight: 650, align: 'right', max: W * 0.4 });
      y += 18;
      for (const [k, v] of [['holds', d.holds], ['read by', d.reads], ['scale', d.scale], ['holds about', d.cap]]) {
        label(g, k, ox, y + 6, { color: p.muted, size: 9.5, max: 72, ...mono });
        y += labelWrap(g, v, ox + 78, y + 6, { color: p.ink2, size: 11.5, max: W - 78, maxLines: 2 }) + 4;
      }
      fit(y + 12);
    },
  });

  const upd = () => setNote(`<b>${M[st.m].label}, ${M[st.m].year}.</b> ${M[st.m].note}`);
  controls.append(
    choice('Medium', Object.entries(M).map(([k, v]) => [k, v.label]), { value: 'vinyl', on: (v) => { st.m = v; upd(); } }).node
  );
  upd();
});
