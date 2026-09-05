// Colour, properly: additive mixing as DMX levels, what a spectrum does to an
// object, gamma and where the code values go, the chromaticity diagram and the
// gamut triangles, and colour temperature.
//
// The colour matching functions are the single lobe Gaussian fits published by
// Wyman, Sloan and Shirley (JCGT 2013). They are accurate enough to draw a
// correct horseshoe and to render a swatch, and small enough to run in a loop.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp,
} from './anim-core.js';

const mono = { mono: true };

const g2 = (x, mu, s1, s2) => { const s = x < mu ? s1 : s2; const t = (x - mu) / s; return Math.exp(-0.5 * t * t); };
const xbar = (l) => 1.056 * g2(l, 599.8, 37.9, 31.0) + 0.362 * g2(l, 442.0, 16.0, 26.7) - 0.065 * g2(l, 501.1, 20.4, 26.2);
const ybar = (l) => 0.821 * g2(l, 568.8, 46.9, 40.5) + 0.286 * g2(l, 530.9, 16.3, 31.1);
const zbar = (l) => 1.217 * g2(l, 437.0, 11.8, 36.0) + 0.681 * g2(l, 459.0, 26.0, 13.8);

// Linear XYZ to sRGB, then the sRGB transfer curve.
const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);
function xyzToSrgb(X, Y, Z, { clip = true } = {}) {
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  const out = clip;
  const neg = r < -0.001 || g < -0.001 || b < -0.001;
  r = clamp(enc(r), 0, 1); g = clamp(enc(g), 0, 1); b = clamp(enc(b), 0, 1);
  return { rgb: [r * 255, g * 255, b * 255], outOfGamut: neg && out };
}
const css = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;

const LAMBDA = [];
for (let l = 385; l <= 720; l += 5) LAMBDA.push(l);

// Integrate a spectral power distribution into XYZ.
function toXYZ(spd) {
  let X = 0, Y = 0, Z = 0;
  for (const l of LAMBDA) { const p = spd(l); X += p * xbar(l); Y += p * ybar(l); Z += p * zbar(l); }
  return [X, Y, Z];
}

const gaussE = (l, mu, s) => Math.exp(-0.5 * ((l - mu) / s) ** 2);
// Planck's law, relative. c2 = 1.4388e-2 m K, with lambda in nanometres.
const planck = (l, T) => {
  const m = l * 1e-9;
  return 1 / (m ** 5) / (Math.exp(0.014388 / (m * T)) - 1) * 1e-12;
};

// ============================================================================
// 1. Additive mixing, which is what a DMX level is doing
// ============================================================================

register('additive-mixing', (host) => {
  const st = { r: 255, g: 96, b: 32, wide: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Additive mixing, which is what your DMX levels are doing',
    sub: 'Three numbers, 0 to 255 each. That is a colour, and it is also three slots in a universe.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 250,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const R = Math.min(66, W / 7.5);
      const cx = ox + W * 0.27, cy = 84;

      // The three beams, drawn with lighten compositing, which is what light does.
      g.save();
      g.globalCompositeOperation = 'lighter';
      const beams = [[st.r, 0, 0, -R * 0.62, -R * 0.36], [0, st.g, 0, R * 0.62, -R * 0.36], [0, 0, st.b, 0, R * 0.72]];
      for (const [r, gg, b, dx, dy] of beams) {
        g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        g.beginPath(); g.arc(cx + dx, cy + dy, R, 0, 7); g.fill();
      }
      g.restore();

      const mixed = [st.r, st.g, st.b];
      const sx = ox + W * 0.56;
      box(g, sx, 22, W * 0.42, 124, { fill: css(mixed), stroke: p.line, r: 8, lw: 1 });
      const hex = mixed.map((v) => (v | 0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
      label(g, 'the mix', sx, 12, { color: p.muted, size: 11 });

      let y = 168;
      const rows = [['red', st.r, '#ff4d4d'], ['green', st.g, '#54d17a'], ['blue', st.b, '#5b8bff']];
      rows.forEach(([n, v, c], i) => {
        const rx = ox, ry = y + i * 22;
        label(g, n, rx, ry, { color: p.muted, size: 11.5, ...mono });
        const bw = W * 0.34;
        box(g, rx + 52, ry - 7, bw, 14, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 3 });
        box(g, rx + 52, ry - 7, Math.max(2, (bw * v) / 255), 14, { fill: c, stroke: 'transparent', r: 3 });
        label(g, String(v | 0).padStart(3, ' '), rx + 60 + bw, ry, { color: p.ink2, size: 11.5, ...mono });
        label(g, `DMX slot ${i + 1}`, rx + 98 + bw, ry, { color: p.muted, size: 11, ...mono });
      });
      label(g, `hex  ${hex}`, sx, 168, { color: p.amber, size: 13, weight: 650, ...mono });
      label(g, `8 bit per channel, so ${(256 ** 3).toLocaleString('en-US')} colours`, sx, 190,
        { color: p.muted, size: 11, ...mono });
      label(g, 'a pixel and a fixture store this identically', sx, 210, { color: p.muted, size: 11 });
    },
  });

  const upd = () => {
    cv.once();
    const { r, g, b } = st;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 30) setNote('All three near zero. <b>Black is the absence of light</b>, not a colour you can add. This is why a lighting desk cannot make a shadow, and why a video wall showing black still glows a little.');
    else if (mx - mn < 18) setNote('All three roughly equal gives white or grey. <b>Only the brightness changes, not the colour</b>, and that is the definition of neutral: equal amounts of the three primaries.');
    else if (r > 200 && g > 200 && b < 60) setNote('Red plus green makes <b>yellow</b>. Nothing in the beam is yellow: two lights land in the same place and your eye reports one colour. That single fact is what makes both a video wall and an LED fixture possible.');
    else setNote('Three numbers, and the eye reports one colour. The same three bytes drive a pixel on an LED wall and three DMX slots on a colour changer. <b>The mixing happens in you</b>, not in the fixture.');
  };

  controls.append(
    slider('Red', { min: 0, max: 255, value: 255, fmt: (v) => v, on: (v) => { st.r = v; upd(); } }).node,
    slider('Green', { min: 0, max: 255, value: 96, fmt: (v) => v, on: (v) => { st.g = v; upd(); } }).node,
    slider('Blue', { min: 0, max: 255, value: 32, fmt: (v) => v, on: (v) => { st.b = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. What a spectrum does to an object: the CRI lesson, computed
// ============================================================================

const SOURCES = {
  rgb: {
    label: 'RGB LED',
    spd: (l) => 1.00 * gaussE(l, 452, 11) + 0.95 * gaussE(l, 522, 17) + 0.90 * gaussE(l, 632, 9),
  },
  rgbw: {
    label: 'RGB + white',
    spd: (l) => 0.55 * gaussE(l, 452, 11) + 0.5 * gaussE(l, 522, 17) + 0.5 * gaussE(l, 632, 9)
      + 0.55 * gaussE(l, 452, 10) + 0.95 * gaussE(l, 572, 58),
  },
  rgbal: {
    label: 'RGB + amber + lime',
    spd: (l) => 0.7 * gaussE(l, 452, 11) + 0.55 * gaussE(l, 522, 17) + 0.6 * gaussE(l, 632, 9)
      + 0.7 * gaussE(l, 590, 10) + 0.75 * gaussE(l, 555, 32),
  },
  tung: { label: 'Tungsten 3,000 K', spd: (l) => planck(l, 3000) * 0.9 },
  day: { label: 'Daylight 5,600 K', spd: (l) => planck(l, 5600) * 2.6 },
};

const SWATCHES = [
  ['skin', (l) => 0.30 + 0.42 / (1 + Math.exp(-(l - 600) / 28)) - 0.07 * gaussE(l, 542, 13)],
  ['red costume', (l) => 0.04 + 0.74 / (1 + Math.exp(-(l - 606) / 11))],
  ['blue costume', (l) => 0.04 + 0.55 * gaussE(l, 458, 34)],
  ['foliage', (l) => 0.04 + 0.30 * gaussE(l, 552, 26) + 0.40 / (1 + Math.exp(-(l - 702) / 11))],
  ['neutral grey', () => 0.45],
];

register('spectral-render', (host) => {
  const st = { src: 'rgb', wb: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why two fixtures at the same colour temperature do not match',
    sub: 'The swatches are computed: the light’s spectrum multiplied by the object’s reflectance, integrated against the eye’s response.',
    note: '&nbsp;',
  });

  // D65, the white point sRGB is defined against.
  const D65 = [0.95047, 1.0, 1.08883];

  function render(srcKey, balanced) {
    const spd = SOURCES[srcKey].spd;
    const white = toXYZ(spd);
    return SWATCHES.map(([name, refl]) => {
      const [X, Y, Z] = toXYZ((l) => spd(l) * refl(l));
      let v;
      if (balanced) {
        // Von Kries style adaptation in XYZ: divide by the source's own white,
        // then re-illuminate with D65. Crude, standard, and enough to make the
        // comparison about rendering rather than about the white point.
        v = [(X / white[0]) * D65[0], (Y / white[1]) * D65[1], (Z / white[2]) * D65[2]];
      } else {
        const n = white[1] || 1;
        v = [X / n, Y / n, Z / n];
      }
      const { rgb } = xyzToSrgb(v[0] * 0.92, v[1] * 0.92, v[2] * 0.92);
      return { name, rgb };
    });
  }

  let cv;
  cv = canvas(stage, {
    height: 330,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const spd = SOURCES[st.src].spd;

      // The spectrum of the source, drawn in its own colours.
      const ph = 92, py = 20;
      let peak = 0;
      for (const l of LAMBDA) peak = Math.max(peak, spd(l));
      for (let i = 0; i < W; i++) {
        const l = 385 + (i / W) * 335;
        const v = spd(l) / (peak || 1);
        const [X, Y, Z] = [xbar(l), ybar(l), zbar(l)];
        const { rgb } = xyzToSrgb(X * 0.9, Y * 0.9, Z * 0.9);
        g.fillStyle = css(rgb);
        g.globalAlpha = 0.25 + 0.75 * v;
        g.fillRect(ox + i, py + ph - Math.max(1, v * ph), 1.4, Math.max(1, v * ph));
        g.globalAlpha = 1;
      }
      box(g, ox, py, W, ph, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      label(g, `${SOURCES[st.src].label}: what is actually in the beam`, ox, 12,
        { color: p.ink, size: 11.5, weight: 650 });
      [400, 500, 600, 700].forEach((l) => {
        const x = ox + ((l - 385) / 335) * W;
        line(g, x, py + ph, x, py + ph + 5, { color: p.line, lw: 1 });
        label(g, `${l}`, x, py + ph + 14, { color: p.muted, size: 10, align: 'center', ...mono });
      });
      label(g, 'nm', ox + W + 6, py + ph + 14, { color: p.muted, size: 10, ...mono });

      // The swatches, under this light and under tungsten for comparison.
      const now = render(st.src, st.wb);
      const ref = render('tung', st.wb);
      const sw = Math.min(96, (W - 4 * 10) / 5), sy = py + ph + 42;
      now.forEach((s, i) => {
        const x = ox + i * (sw + 10);
        box(g, x, sy, sw, 46, { fill: css(s.rgb), stroke: p.line, r: 5, lw: 1 });
        box(g, x, sy + 52, sw, 20, { fill: css(ref[i].rgb), stroke: p.line, r: 5, lw: 1 });
        label(g, s.name, x, sy + 88, { color: p.muted, size: 10.5 });
      });
      label(g, 'under this light', ox, sy - 10, { color: p.ink2, size: 11, weight: 600 });
      label(g, 'the same objects under tungsten', ox, sy + 62 + 20 + 26,
        { color: p.muted, size: 10.5 });
      label(g, 'reflectance curves are approximations, chosen to be typical rather than measured',
        ox, sy + 62 + 20 + 44, { color: p.muted, size: 10 });
    },
  });

  const upd = () => {
    cv.once();
    if (st.src === 'rgb') setNote('<b>Three narrow spikes.</b> Look at the gaps: almost no energy between 470 and 510, or between 545 and 620. An object whose colour lines up with a spike comes back <b>over saturated</b>, poster-like, and one that sits in a gap has almost nothing to reflect and comes back muddy or the wrong hue. Compare the two rows: the blue costume has gone violet, the foliage has gone flat, the skin has lost its warmth. The fixture can still hit any colour <i>target</i>; what it cannot do is <b>render</b> what it lights.');
    else if (st.src === 'rgbw' || st.src === 'rgbal') setNote(`<b>${SOURCES[st.src].label}.</b> The extra emitters fill in the gaps, so there is something for every object to reflect across most of the range, and the two rows move closer together. This is what you are paying for in a seven colour fixture, and it is why a spec sheet talks about CRI or TM-30 and not only about colour temperature.`);
    else setNote('<b>A continuous spectrum.</b> Every wavelength is present, so every object has something to reflect and colours render the way the designer expects. This is the reference everything else is measured against, and the reason tungsten refuses to die.');
  };

  controls.append(
    choice('Source', Object.entries(SOURCES).map(([k, v]) => [k, v.label]), { value: 'rgb', on: (v) => { st.src = v; upd(); } }).node,
    toggle('White balance to this source', { value: true, on: (v) => { st.wb = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 3. Gamma: where the code values actually go
// ============================================================================

register('gamma-curve', (host) => {
  const st = { bits: 5, gamma: 2.2, coded: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'Gamma, and why the dark end gets the codes',
    sub: 'A ramp stored with a limited number of code values. Store light linearly and the shadows band first, because that is where your eye is looking.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 290,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const levels = 2 ** st.bits;

      const strip = (y, hgt, fn, title) => {
        for (let i = 0; i < W; i++) {
          const u = i / W;
          const v = clamp(fn(u), 0, 1);
          const q = Math.round(v * 255);
          g.fillStyle = `rgb(${q},${q},${q})`;
          g.fillRect(ox + i, y, 1.4, hgt);
        }
        box(g, ox, y, W, hgt, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
        label(g, title, ox, y - 8, { color: p.ink2, size: 11, weight: 600 });
      };

      // Linear coding: quantise the light value itself.
      strip(22, 46, (u) => {
        const lin = u;                                   // light, linear
        const qd = Math.round(lin * (levels - 1)) / (levels - 1);
        return Math.pow(qd, 1 / 2.2);                    // to screen
      }, `stored linear, ${st.bits} bit`);

      // Gamma coding: quantise the perceptual value, then linearise.
      strip(100, 46, (u) => {
        const code = Math.pow(u, 1 / st.gamma);
        const qd = Math.round(code * (levels - 1)) / (levels - 1);
        const lin = Math.pow(qd, st.gamma);
        return Math.pow(lin, 1 / 2.2);
      }, `stored with gamma ${st.gamma.toFixed(1)}, ${st.bits} bit`);

      // The curve, with the code positions marked along it.
      const cy = 178, ch = 92;
      box(g, ox, cy, W, ch, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      g.beginPath();
      for (let i = 0; i <= W; i++) { const u = i / W; g.lineTo(ox + i, cy + ch - Math.pow(u, st.gamma) * ch); }
      g.strokeStyle = p.amber; g.lineWidth = 2; g.stroke();
      line(g, ox, cy + ch, ox + W, cy, { color: alpha(p.muted, 0.5), lw: 1, dash: [4, 4] });
      for (let k = 0; k < levels; k++) {
        const u = k / (levels - 1);
        const yv = Math.pow(u, st.gamma);
        line(g, ox + u * W, cy + ch, ox + u * W, cy + ch - 6, { color: p.cyan, lw: 1 });
        line(g, ox, cy + ch - yv * ch, ox + 6, cy + ch - yv * ch, { color: p.green, lw: 1 });
      }
      label(g, 'code value', ox + W / 2, cy + ch + 16, { color: p.muted, size: 10.5, align: 'center', ...mono });
      label(g, 'light out', ox + 8, cy + 10, { color: p.muted, size: 10.5, ...mono });
      label(g, `${levels} codes, spaced evenly along the bottom, bunched at the dark end of the light axis`,
        ox, cy + ch + 34, { color: p.muted, size: 11 });
    },
  });

  const upd = () => {
    cv.once();
    if (st.bits <= 5) setNote(`<b>${2 ** st.bits} codes.</b> The top strip stores light itself, so the codes are spread evenly across light and the shadows get almost none: that is where the banding appears first, and it is exactly where your eye is most sensitive. The lower strip spends its codes where perception is, and looks smooth with the same number of bits.`);
    else setNote(`At ${st.bits} bit both look acceptable, which is the honest answer: gamma is a coding efficiency, not magic. It buys roughly the same picture in fewer bits. Drag the bit depth down and the difference reappears, and that is what an 8 bit delivery file is living on.`);
  };

  controls.append(
    slider('Bit depth', { min: 3, max: 8, step: 1, value: 5, fmt: (v) => `${v} bit`, on: (v) => { st.bits = v; upd(); } }).node,
    slider('Gamma', { min: 1, max: 3, step: 0.1, value: 2.2, fmt: (v) => v.toFixed(1), on: (v) => { st.gamma = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 4. The chromaticity diagram and the gamut triangles
// ============================================================================

const GAMUTS = {
  r709: { label: 'Rec.709 / sRGB', pts: [[0.640, 0.330], [0.300, 0.600], [0.150, 0.060]], col: 'cyan' },
  p3: { label: 'DCI-P3', pts: [[0.680, 0.320], [0.265, 0.690], [0.150, 0.060]], col: 'amber' },
  r2020: { label: 'Rec.2020', pts: [[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]], col: 'green' },
};

register('colour-gamut', (host) => {
  const st = { show: { r709: true, p3: true, r2020: false }, px: 0.62, py: 0.32 };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'The gamut triangle, and what "out of gamut" means',
    sub: 'Every colour a human can see is inside the horseshoe. Every colour a display can make is inside its triangle. Those are not the same shape.',
    note: '&nbsp;',
  });

  challenge('Find a colour your eye can see that Rec.709 cannot make, then one that nothing here can.',
    () => { const inside = (pts) => { let s = 0;
        for (let i = 0; i < 3; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 3];
          s += Math.sign((bx - ax) * (st.py - ay) - (by - ay) * (st.px - ax)); }
        return Math.abs(s) === 3; };
      return !inside(GAMUTS.r709.pts) && !inside(GAMUTS.r2020.pts); });

  // Spectral locus, computed from the colour matching functions.
  const locus = [];
  for (let l = 400; l <= 660; l += 2) {
    const X = xbar(l), Y = ybar(l), Z = zbar(l), s = X + Y + Z;
    locus.push([X / s, Y / s]);
  }

  let cv;
  cv = canvas(stage, {
    height: 320,
    animated: false,
    draw(g, w) {
      const p = palette();
      const S = Math.min(272, w - 220, 300);
      const ox = Math.max(12, (w - (S + 190)) / 2), oy = 20;
      const X0 = 0, X1 = 0.75, Y0 = 0, Y1 = 0.85;
      const px = (x) => ox + ((x - X0) / (X1 - X0)) * S;
      const py = (y) => oy + S - ((y - Y0) / (Y1 - Y0)) * S;

      // Fill the horseshoe with the closest displayable colour.
      const path = new Path2D();
      locus.forEach(([x, y], i) => (i ? path.lineTo(px(x), py(y)) : path.moveTo(px(x), py(y))));
      path.closePath();
      g.save(); g.clip(path);
      for (let iy = 0; iy < S; iy += 2) for (let ix = 0; ix < S; ix += 2) {
        const x = X0 + (ix / S) * (X1 - X0), y = Y1 - (iy / S) * (Y1 - Y0);
        if (y <= 0.0001) continue;
        const Y = 1, X = (x / y) * Y, Z = ((1 - x - y) / y) * Y;
        let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
        let gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
        let bb = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
        // Negative means the colour is outside sRGB, so show the nearest thing
        // it can print rather than black, then normalise to full brightness.
        r = Math.max(0, r); gg = Math.max(0, gg); bb = Math.max(0, bb);
        const mx2 = Math.max(r, gg, bb) || 1;
        r /= mx2; gg /= mx2; bb /= mx2;
        g.fillStyle = `rgb(${(enc(r) * 255) | 0},${(enc(gg) * 255) | 0},${(enc(bb) * 255) | 0})`;
        g.fillRect(ox + ix, oy + iy, 2, 2);
      }
      g.restore();
      g.strokeStyle = p.ink; g.lineWidth = 1.2; g.stroke(path);

      for (const [k, gm] of Object.entries(GAMUTS)) {
        if (!st.show[k]) continue;
        const c = p[gm.col];
        g.beginPath();
        gm.pts.forEach(([x, y], i) => (i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))));
        g.closePath();
        g.strokeStyle = c; g.lineWidth = 2; g.stroke();
      }
      // D65 white point.
      g.fillStyle = p.ink; g.beginPath(); g.arc(px(0.3127), py(0.3290), 3, 0, 7); g.fill();

      // The colour under test.
      const inside = (pts, x, y) => {
        let s = 0;
        for (let i = 0; i < 3; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 3];
          s += Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax));
        }
        return Math.abs(s) === 3;
      };
      const tx = px(st.px), ty = py(st.py);
      line(g, tx - 8, ty, tx + 8, ty, { color: p.ink, lw: 1.5 });
      line(g, tx, ty - 8, tx, ty + 8, { color: p.ink, lw: 1.5 });
      g.strokeStyle = p.ink; g.lineWidth = 1.5;
      g.beginPath(); g.arc(tx, ty, 6, 0, 7); g.stroke();

      label(g, 'x', ox + S / 2, oy + S + 16, { color: p.muted, size: 10.5, align: 'center', ...mono });
      label(g, 'y', ox - 8, oy + S / 2, { color: p.muted, size: 10.5, align: 'right', ...mono });

      // Verdict panel.
      const rx = ox + S + 22;
      let ry = oy + 10;
      label(g, `x ${st.px.toFixed(3)}   y ${st.py.toFixed(3)}`, rx, ry, { color: p.ink, size: 12, weight: 650, ...mono });
      ry += 26;
      for (const [k, gm] of Object.entries(GAMUTS)) {
        const ok = inside(gm.pts, st.px, st.py);
        const c = p[gm.col];
        g.fillStyle = st.show[k] ? c : alpha(c, 0.3);
        g.fillRect(rx, ry - 5, 10, 10);
        label(g, gm.label, rx + 16, ry, { color: st.show[k] ? p.ink2 : p.muted, size: 11.5 });
        label(g, ok ? 'inside' : 'OUT', rx + 16, ry + 16, { color: ok ? p.green : p.red, size: 11.5, weight: 700, ...mono });
        ry += 40;
      }
    },
  });

  const upd = () => {
    cv.once();
    const inside = (pts) => {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 3];
        s += Math.sign((bx - ax) * (st.py - ay) - (by - ay) * (st.px - ax));
      }
      return Math.abs(s) === 3;
    };
    const in709 = inside(GAMUTS.r709.pts), in2020 = inside(GAMUTS.r2020.pts);
    if (!in709 && in2020) setNote('<b>Outside Rec.709, inside Rec.2020.</b> A camera shooting wide gamut can record this colour and a normal screen cannot show it. Something has to give, and what gives is decided by the conversion: clip it to the edge of the triangle and it goes flat, or squeeze the whole picture inwards and every other colour shifts too. That choice is a look, and somebody should be making it deliberately.');
    else if (!in709 && !in2020) setNote('<b>Outside every triangle.</b> Your eye can see it, no display in this list can make it. This region is exactly why a lighting designer’s deep congo blue never photographs, and why the camera is not lying: it is telling you what fits.');
    else setNote('Inside the triangles, so every display here can reproduce it. Note how small even the largest triangle is against the horseshoe. <b>Every screen you have ever looked at has been showing you a subset</b>, and it never once mentioned it.');
  };

  controls.append(
    slider('x', { min: 0.02, max: 0.72, step: 0.005, value: 0.62, fmt: (v) => v.toFixed(3), on: (v) => { st.px = v; upd(); } }).node,
    slider('y', { min: 0.02, max: 0.83, step: 0.005, value: 0.32, fmt: (v) => v.toFixed(3), on: (v) => { st.py = v; upd(); } }).node,
    toggle('Rec.709 / sRGB', { value: true, on: (v) => { st.show.r709 = v; upd(); } }).node,
    toggle('DCI-P3', { value: true, on: (v) => { st.show.p3 = v; upd(); } }).node,
    toggle('Rec.2020', { on: (v) => { st.show.r2020 = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. Colour temperature, and the green axis nobody prints on the fixture
// ============================================================================

register('colour-temperature', (host) => {
  const st = { k: 3200, duv: 0 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Colour temperature, and the axis nobody prints on the fixture',
    sub: 'Kelvin is one number on a curve. Two sources can share it and still not match, because there is a second axis.',
    note: '&nbsp;',
  });

  const locusPt = (T) => {
    const [X, Y, Z] = toXYZ((l) => planck(l, T));
    const s = X + Y + Z;
    return [X / s, Y / s];
  };

  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;

      // The Planckian locus as a strip of rendered whites.
      const sy = 24, sh = 56;
      for (let i = 0; i < W; i++) {
        const T = 1800 * Math.pow(10000 / 1800, i / W);
        const [X, Y, Z] = toXYZ((l) => planck(l, T));
        const n = Y || 1;
        const { rgb } = xyzToSrgb((X / n) * 0.92, 0.92, (Z / n) * 0.92);
        g.fillStyle = css(rgb);
        g.fillRect(ox + i, sy, 1.4, sh);
      }
      box(g, ox, sy, W, sh, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      [2000, 3200, 4300, 5600, 8000].forEach((T) => {
        const x = ox + (Math.log(T / 1800) / Math.log(10000 / 1800)) * W;
        line(g, x, sy + sh, x, sy + sh + 5, { color: p.line, lw: 1 });
        label(g, `${(T / 1000).toFixed(T < 10000 ? 1 : 0)}k`, x, sy + sh + 15, { color: p.muted, size: 10, align: 'center', ...mono });
      });
      const kx = ox + (Math.log(st.k / 1800) / Math.log(10000 / 1800)) * W;
      line(g, kx, sy - 6, kx, sy + sh + 6, { color: p.ink, lw: 2 });
      label(g, 'warm, more red', ox, 14, { color: p.muted, size: 10.5 });
      label(g, 'cool, more blue', ox + W, 14, { color: p.muted, size: 10.5, align: 'right' });

      // Two patches: the target on the locus, and the actual source pushed off it.
      const [X, Y, Z] = toXYZ((l) => planck(l, st.k));
      const n = Y || 1;
      const base = [(X / n) * 0.92, 0.92, (Z / n) * 0.92];
      const shifted = [base[0] * (1 - st.duv * 0.22), base[1] * (1 + st.duv * 0.30), base[2] * (1 - st.duv * 0.22)];
      const pw = Math.min(180, W / 2 - 14), pyy = sy + sh + 40;
      box(g, ox, pyy, pw, 74, { fill: css(xyzToSrgb(...base).rgb), stroke: p.line, r: 6, lw: 1 });
      box(g, ox + pw + 20, pyy, pw, 74, { fill: css(xyzToSrgb(...shifted).rgb), stroke: p.line, r: 6, lw: 1 });
      label(g, `on the curve, ${st.k.toLocaleString('en-US')} K`, ox, pyy - 9, { color: p.ink2, size: 11, weight: 600 });
      label(g, `same K, ${st.duv > 0 ? '+' : ''}${st.duv.toFixed(2)} off the curve`, ox + pw + 20, pyy - 9,
        { color: st.duv === 0 ? p.ink2 : p.red, size: 11, weight: 600 });
      label(g, st.duv === 0 ? 'identical, because the second axis is zero'
        : (st.duv > 0 ? 'greener. The fixture still reports the same Kelvin.' : 'more magenta. The fixture still reports the same Kelvin.'),
        ox, pyy + 96, { color: p.muted, size: 11.5 });
    },
  });

  const upd = () => {
    cv.once();
    if (st.duv !== 0) setNote('<b>Both of these are the same colour temperature.</b> Kelvin only says where you are along the curve, not how far off it you are sitting. Green or magenta deviation is the second axis, sometimes printed as Duv or as a plus or minus green control, and it is the usual reason two fixtures set to 5,600 K still do not match on camera. Correct it with the green control, or with a minus green gel, not with the Kelvin knob.');
    else if (st.k < 3000) setNote(`${st.k.toLocaleString('en-US')} K. Warm. This is roughly where a tungsten lamp sits, and the reason a "white" light indoors reads as warm and nobody notices: your eye adapts, and the camera does not until you tell it to.`);
    else setNote(`${st.k.toLocaleString('en-US')} K. The whole strip is white light, all of it, at different points on the same curve. <b>White is not a colour, it is an agreement</b>, and the agreement is what a white balance sets.`);
  };

  controls.append(
    slider('Colour temperature', { min: 1800, max: 10000, step: 50, value: 3200, fmt: (v) => `${v.toLocaleString('en-US')} K`, on: (v) => { st.k = v; upd(); } }).node,
    slider('Green / magenta', { min: -1, max: 1, step: 0.05, value: 0, fmt: (v) => (v === 0 ? 'on curve' : v > 0 ? `+${v.toFixed(2)} green` : `${v.toFixed(2)} magenta`), on: (v) => { st.duv = v; upd(); } }).node
  );
  upd();
});
