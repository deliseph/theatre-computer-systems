// What a picture actually is, in the two forms you will be handed one.
//
// A raster is measurements on a grid. A vector is instructions for drawing.
// The difference decides whether a logo survives being put on a twelve metre
// wall, and it is the single most common avoidable disaster in the art pack a
// video department receives.
//
// Both figures do the real thing rather than illustrating it. The raster panel
// genuinely rasterises the shape at the chosen resolution and scales that up,
// and the compositing panel runs the actual over operator per pixel, both ways
// round, so the fringe on screen is the fringe you would get.

import {
  register, figure, canvas, palette, slider, toggle, choice,
  box, label, labelWrap, line, alpha, clamp, fitter,
} from './anim-core.js';

const mono = { mono: true };

// A shape with a curve, a corner and a thin part: the three things that show up
// a low sample count. Drawn in a 0..1 space so it can be rendered at any size.
function glyph(g, s) {
  g.beginPath();
  g.moveTo(0.18 * s, 0.80 * s);
  g.lineTo(0.38 * s, 0.16 * s);
  g.lineTo(0.50 * s, 0.16 * s);
  g.lineTo(0.70 * s, 0.80 * s);
  g.lineTo(0.58 * s, 0.80 * s);
  g.lineTo(0.44 * s, 0.34 * s);
  g.lineTo(0.30 * s, 0.80 * s);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(0.72 * s, 0.30 * s, 0.13 * s, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(0.14 * s, 0.62 * s);
  g.lineTo(0.74 * s, 0.62 * s);
  g.lineTo(0.74 * s, 0.665 * s);
  g.lineTo(0.14 * s, 0.665 * s);
  g.closePath();
  g.fill();
}

register('raster-vector', (host) => {
  const st = { src: 24, smooth: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why one logo survives the wall and the other does not',
    sub: 'The same mark, stored two ways. One is a grid of measurements. The other is a set of instructions, and instructions can be carried out at any size.',
    note: '&nbsp;',
  });

  // The raster side is really rasterised at the chosen size and then scaled up.
  // Drawing a fake pixel grid would have been easier and would have been a lie.
  const off = document.createElement('canvas');
  const og = off.getContext('2d');

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 340,
    animated: false,
    controls,
    draw(g, w) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const side = Math.min(238, (W - 20) / 2);
      const y = 34;

      // --- stored as a grid of measurements ----------------------------------
      off.width = off.height = st.src;
      og.setTransform(1, 0, 0, 1, 0, 0);
      og.clearRect(0, 0, st.src, st.src);
      og.fillStyle = p.cyan;
      glyph(og, st.src);

      label(g, 'RASTER', ox, y - 12, { color: p.cyan, size: 10, weight: 700, max: side });
      label(g, `${st.src} × ${st.src} measured`, ox + side, y - 12,
        { color: p.muted, size: 9.5, align: 'right', max: side, ...mono });
      box(g, ox, y, side, side, { fill: alpha(p.line, 0.3), stroke: p.line, r: 6, lw: 1 });
      g.save();
      g.beginPath(); g.rect(ox + 1, y + 1, side - 2, side - 2); g.clip();
      g.imageSmoothingEnabled = st.smooth;
      g.drawImage(off, ox, y, side, side);
      g.restore();

      // --- stored as instructions ---------------------------------------------
      const vx = ox + W - side;
      label(g, 'VECTOR', vx, y - 12, { color: p.green, size: 10, weight: 700, max: side });
      label(g, 'drawn at this size', vx + side, y - 12,
        { color: p.muted, size: 9.5, align: 'right', max: side, ...mono });
      box(g, vx, y, side, side, { fill: alpha(p.line, 0.3), stroke: p.line, r: 6, lw: 1 });
      g.save();
      g.beginPath(); g.rect(vx + 1, y + 1, side - 2, side - 2); g.clip();
      g.translate(vx, y);
      g.fillStyle = p.green;
      glyph(g, side);
      g.restore();

      // --- the arithmetic that explains the difference ------------------------
      let ry = y + side + 26;
      const have = st.src * st.src;
      const need = Math.round(side) * Math.round(side);
      const rows = [
        ['pixels actually measured', have.toLocaleString(), p.cyan],
        ['pixels this panel needs', need.toLocaleString(), p.ink2],
        ['so this share is invented', `${(100 * (1 - have / need)).toFixed(1)} %`, need > have ? p.red : p.green],
      ];
      rows.forEach(([k, v, tone], i) => {
        label(g, k, ox, ry + i * 22, { color: p.muted, size: 11.5, max: W * 0.6 });
        label(g, v, ox + W, ry + i * 22, { color: tone, size: 11.5, weight: 650, align: 'right', max: W * 0.38, ...mono });
      });
      ry += rows.length * 22 + 8;
      const capH = labelWrap(g, st.smooth
        ? 'Smoothing averages between the measurements it has. It cannot add a measurement nobody took, so the edges go soft rather than sharp.'
        : 'With smoothing off you can see exactly what was stored. Every block is one measurement, held across the area it was asked to cover.',
        ox, ry, { color: p.ink, size: 11.5, weight: 600, max: W, maxLines: 3 });
      fit(ry + capH + 10);
    },
  });

  const upd = () => {
    cv.once();
    setNote(`<b>A vector has no resolution, so it cannot have the wrong one.</b> It is a list of instructions, and the machine carries them out at whatever size you ask for, at the moment you ask. The raster on the left was measured once at ${st.src} × ${st.src} and every size after that is an argument about how to spread ${(st.src * st.src).toLocaleString()} measurements over more area than they came from. <b>No amount of processing adds information nobody recorded.</b> This is why a logo, a wayfinding sign and a gobo should arrive as vector, and why a photograph cannot.`);
  };

  controls.append(
    slider('Stored resolution', { min: 6, max: 220, step: 1, value: 24, fmt: (v) => `${v} px`, on: (v) => { st.src = v; upd(); } }).node,
    toggle('Smooth the upscale', { value: false, on: (v) => { st.smooth = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// The fourth channel, and the two ways of storing it
// ============================================================================

register('alpha-composite', (host) => {
  const st = { opacity: 100, stored: 'straight', assumed: 'straight' };
  const { controls, stage, setNote } = figure(host, {
    title: 'The alpha channel, and the fringe that means it was read wrong',
    sub: 'A fourth number per pixel, saying how much of that pixel there is. Everything about compositing follows from one line of arithmetic, including the fault.',
    note: '&nbsp;',
  });

  const hexRGB = (hex) => {
    const m = hex.replace('#', '');
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  };

  const tmp = document.createElement('canvas');
  const tmpG = tmp.getContext('2d');

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 330,
    animated: false,
    controls,
    draw(g, w) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const pw = Math.round(Math.min(268, (W - 16) / 2)), ph = Math.round(pw * 0.62);
      const y = 34;
      const fg = hexRGB(p.amber), bgA = hexRGB(p.cyan), bgB = hexRGB(p.ground);

      // The composite is computed per pixel, both ways, so the fringe on screen
      // is the fringe the arithmetic produces rather than a drawing of one.
      //
      // It goes through an offscreen canvas rather than straight to the stage:
      // putImageData ignores the transform, so on a 2x display it would land at
      // half position and half size. drawImage respects it.
      const build = (assume) => {
        const img = tmpG.createImageData(pw, ph);
        const d = img.data;
        for (let py = 0; py < ph; py++) {
          for (let px = 0; px < pw; px++) {
            // Background: a hard split, so an edge fault shows against both.
            const dark = px > pw / 2;
            const B = dark ? bgB : bgA;
            // Foreground: a disc with a soft edge, which is where alpha lives.
            const cx = pw / 2, cy = ph / 2, r = Math.min(pw, ph) * 0.34;
            const dist = Math.hypot(px - cx, py - cy);
            const edge = clamp((r - dist) / (r * 0.28), 0, 1);
            const a = edge * (st.opacity / 100);
            // What the file holds. Premultiplied means the colour has already
            // been multiplied by the coverage before it was written down. A
            // straight file holds the object's own colour wherever the object
            // is, and black where it is not: without that last part the fault
            // would wash the whole background, and the whole point is that it
            // only ever appears on the edge.
            const stored = st.stored === 'pre' ? fg.map((c) => c * a) : fg.map((c) => (a > 0 ? c : 0));
            const i = (py * pw + px) * 4;
            for (let k = 0; k < 3; k++) {
              // over, straight:        s·a + d·(1−a)
              // over, premultiplied:   s   + d·(1−a)
              const v = assume === 'pre' ? stored[k] + B[k] * (1 - a) : stored[k] * a + B[k] * (1 - a);
              d[i + k] = clamp(v, 0, 255);
            }
            d[i + 3] = 255;
          }
        }
        return img;
      };

      const panel = (x, assume, title) => {
        label(g, title, x, y - 12, { color: p.muted, size: 10, weight: 700, max: pw });
        tmp.width = pw; tmp.height = ph;
        tmpG.putImageData(build(assume), 0, 0);
        g.drawImage(tmp, x, y, pw, ph);
        box(g, x, y, pw, ph, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      };
      panel(ox, 'straight', 'READ AS STRAIGHT');
      panel(ox + W - pw, 'pre', 'READ AS PREMULTIPLIED');

      // Which of the two is the right one for what the file holds.
      const rightX = st.stored === 'pre' ? ox + W - pw : ox;
      box(g, rightX - 2, y - 2, pw + 4, ph + 4, { fill: 'transparent', stroke: p.green, r: 2, lw: 2 });
      label(g, '↑ correct for this file', rightX, y + ph + 15, { color: p.green, size: 10.5, max: pw });
      const wrongX = st.stored === 'pre' ? ox : ox + W - pw;
      label(g, st.stored === 'pre' ? '↑ dark fringe' : '↑ bright fringe', wrongX, y + ph + 15,
        { color: p.red, size: 10.5, max: pw });

      let ry = y + ph + 58;
      label(g, 'THE WHOLE OF COMPOSITING', ox, ry - 14, { color: p.muted, size: 10, weight: 700, max: W });
      const eqs = [
        ['straight, or unassociated', 'out = src × a  +  dst × (1 − a)'],
        ['premultiplied, or associated', 'out = src      +  dst × (1 − a)'],
      ];
      eqs.forEach(([k, v], i) => {
        label(g, k, ox, ry + i * 20, { color: p.muted, size: 10.5, max: W * 0.44 });
        label(g, v, ox + W, ry + i * 20, { color: p.ink, size: 11, align: 'right', max: W * 0.54, ...mono });
      });
      ry += eqs.length * 20 + 12;
      const capH = labelWrap(g, 'The premultiplied form has done the multiply already. Do it a second time and the edges go dark; skip it when it was never done and they go bright. That is the entire fault.',
        ox, ry, { color: p.ink, size: 11.5, weight: 600, max: W, maxLines: 3 });
      fit(ry + capH + 10);
    },
  });

  const upd = () => {
    cv.once();
    if (st.stored === 'pre') setNote(`<b>The file is premultiplied, so its colour has already been multiplied by its coverage.</b> A compositor that multiplies again is squaring the alpha, and squaring a number below one makes it smaller, which is why the soft edge goes <b>dark</b>. On a title over a light background it reads as a grey halo, and the usual first guess, that the key is wrong or the artwork has a background on it, is wrong.`);
    else setNote(`<b>The file is straight, so its colour is the pure colour and the coverage is kept separately.</b> A compositor that adds it without multiplying puts full strength colour into a pixel that should only be partly covered, so the soft edge goes <b>bright</b>. Both faults live on the edge and nowhere else, which is the tell: the middle of the graphic always looks fine.`);
  };

  controls.append(
    choice('The file holds', [['straight', 'Straight alpha'], ['pre', 'Premultiplied']],
      { value: 'straight', on: (v) => { st.stored = v; upd(); } }).node,
    slider('Opacity', { min: 0, max: 100, step: 1, value: 100, fmt: (v) => `${v}%`, on: (v) => { st.opacity = v; upd(); } }).node
  );
  upd();
});
