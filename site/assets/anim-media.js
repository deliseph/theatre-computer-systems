// Animations for how an image becomes numbers, media file formats,
// and Class 5: media over IP.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, h, el,
} from './anim-core.js';

// ============================================================================
// How a picture becomes numbers
// ============================================================================

register('image-sampling', (host) => {
  const state = { res: 96, bits: 8, mono: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a picture becomes numbers',
    sub: 'Exactly the same two ideas as audio. Sampling is how often you measure across space; bit depth is how precisely.',
    note: '&nbsp;',
  });

  // A synthetic scene: a lit cyclorama with a gradient, a hard edge and a soft
  // shadow, so both spatial detail and tonal steps are visible.
  const scene = (u, v) => {
    const wash = 0.55 + 0.4 * Math.cos((u - 0.35) * 2.2) * (1 - v * 0.5);
    const floor = v > 0.72 ? 0.35 : 1;
    const beam = Math.exp(-(((u - 0.66) * 6) ** 2)) * (1 - v) * 0.9;
    const bar = u > 0.12 && u < 0.16 && v < 0.6 ? 0.1 : 1;
    const lum = clamp((wash * floor + beam) * bar, 0, 1);
    return [lum * 255, lum * (200 + 40 * u), lum * (150 + 90 * v)];
  };

  canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const W = Math.min(520, w - 24), H = 190, ox = (w - W) / 2, oy = 26;
      const N = state.res, levels = 2 ** state.bits;
      const cw = W / N, ch = H / Math.round(N * (H / W));
      const rows = Math.round(N * (H / W));

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < N; i++) {
          let [r, gg, b] = scene((i + 0.5) / N, (j + 0.5) / rows);
          const q = (v) => Math.round((v / 255) * (levels - 1)) / (levels - 1) * 255;
          r = q(r); gg = q(gg); b = q(b);
          if (state.mono) { const y = 0.299 * r + 0.587 * gg + 0.114 * b; r = gg = b = q(y); }
          g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
          g.fillRect(ox + i * cw, oy + j * ch, Math.ceil(cw), Math.ceil(ch));
        }
      }
      box(g, ox, oy, W, H, { fill: 'transparent', stroke: p.line, r: 0 });

      const ch3 = state.mono ? 1 : 3;
      const bytes = (N * rows * state.bits * ch3) / 8;
      label(g, `${N} × ${rows} pixels`, ox, 18, { color: p.ink, size: 12, weight: 650, mono: true });
      label(g, `${state.bits} bit → ${levels} levels per channel`, ox + 140, 18, { color: p.muted, size: 11.5, mono: true });
      label(g,
        `uncompressed: ${N} × ${rows} × ${ch3} channel${ch3 > 1 ? 's' : ''} × ${state.bits} bit ÷ 8 = ${bytes > 1e6 ? (bytes / 1e6).toFixed(2) + ' MB' : (bytes / 1e3).toFixed(1) + ' kB'} per frame`,
        ox, oy + H + 22, { color: p.cyan, size: 11.5, mono: true });
      label(g, `at 60 fps that is ${((bytes * 8 * 60) / 1e9).toFixed(2)} Gbit/s`,
        ox, oy + H + 40, { color: p.muted, size: 11.5, mono: true });
    },
  });

  controls.append(
    slider('Resolution', { min: 6, max: 320, step: 2, value: 96, fmt: (v) => `${v} px`, on: (v) => { state.res = v; update(); } }).node,
    slider('Bit depth', { min: 1, max: 8, step: 1, value: 8, fmt: (v) => `${v} bit`, on: (v) => { state.bits = v; update(); } }).node,
    toggle('Greyscale (drop colour)', { on: (v) => { state.mono = v; update(); } }).node
  );

  function update() {
    if (state.res < 30) setNote('<b>Too few samples across space.</b> The picture is still there in outline but the detail is gone, and no amount of processing brings it back. This is the spatial version of the sampling limit: you cannot represent detail finer than your sampling grid.');
    else if (state.bits <= 3) setNote(`<b>Banding.</b> At ${state.bits} bit there are only ${2 ** state.bits} levels per channel, so the smooth wash breaks into visible steps. This is exactly why 10 bit matters on a large LED wall: a slow gradient across 12 m of panel shows every step.`);
    else setNote('Enough samples and enough levels. Note the file size line: an image is just a grid of numbers, and the frame rate turns that into the data rate you have to carry. This is where the 2.5 Gbit/s figure for uncompressed HD comes from.');
  }
  update();
});

// ============================================================================
// Lossy compression, the real mechanism
// ============================================================================

register('lossy-compression', (host) => {
  const state = { keep: 6 };
  const { controls, stage, setNote } = figure(host, {
    title: 'What "lossy" actually throws away',
    sub: 'A real 8 × 8 block transform, the same idea JPEG and every inter frame codec is built on. Drag the quality down and watch the blocks appear.',
    note: '&nbsp;',
  });

  const W = 256, H = 160;
  const src = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H;
    let lum = 130 + 90 * Math.cos((u - 0.3) * 3) * (1 - v * 0.4);
    if (x > W * 0.55 && x < W * 0.6) lum = 245;                        // a hard vertical edge
    if (y > H * 0.7) lum *= 0.45;                                       // floor
    if (((x + y) % 9) < 2 && y > H * 0.78) lum += 45;                   // fine texture
    src[y * W + x] = clamp(lum, 0, 255);
  }

  // Separable 8x8 DCT-II and its inverse. Small enough to run on a slider change.
  const C = (k) => (k === 0 ? Math.SQRT1_2 : 1);
  const cosT = [];
  for (let x = 0; x < 8; x++) { cosT[x] = []; for (let k = 0; k < 8; k++) cosT[x][k] = Math.cos(((2 * x + 1) * k * Math.PI) / 16); }

  function process(keep) {
    const out = new Float32Array(W * H);
    const blk = new Float32Array(64), co = new Float32Array(64);
    for (let by = 0; by < H; by += 8) for (let bx = 0; bx < W; bx += 8) {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = src[(by + y) * W + bx + x] - 128;
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
        let s = 0;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += blk[y * 8 + x] * cosT[x][u] * cosT[y][v];
        // Zig-zag-ish truncation: keep the low-frequency corner only.
        co[v * 8 + u] = (u + v) < keep ? 0.25 * C(u) * C(v) * s : 0;
      }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        let s = 0;
        for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) s += C(u) * C(v) * co[v * 8 + u] * cosT[x][u] * cosT[y][v];
        out[(by + y) * W + bx + x] = clamp(s * 0.25 * 4 + 128, 0, 255);
      }
    }
    return out;
  }

  let cache = process(state.keep);

  canvas(stage, {
    height: 240,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const scale = Math.min(2, (w - 40) / (W * 2 + 16));
      const dw = W * scale, dh = H * scale;
      const ox = (w - (dw * 2 + 16)) / 2, oy = 26;

      const put = (data, x) => {
        const img = g.createImageData(W, H);
        for (let i = 0; i < W * H; i++) {
          const v = data[i];
          img.data[i * 4] = v; img.data[i * 4 + 1] = v * 0.95; img.data[i * 4 + 2] = v * 0.85; img.data[i * 4 + 3] = 255;
        }
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        tmp.getContext('2d').putImageData(img, 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(tmp, x, oy, dw, dh);
        box(g, x, oy, dw, dh, { fill: 'transparent', stroke: p.line, r: 0 });
      };
      put(src, ox);
      put(cache, ox + dw + 16);

      const kept = (state.keep * (state.keep + 1)) / 2;
      label(g, 'original', ox, 18, { color: p.muted, size: 11.5, weight: 600 });
      label(g, `kept ${Math.min(kept, 64)} of 64 coefficients per block`, ox + dw + 16, 18,
        { color: state.keep < 4 ? p.red : p.cyan, size: 11.5, weight: 600 });
      label(g, `roughly ${((Math.min(kept, 64) / 64) * 100).toFixed(0)}% of the data`,
        ox + dw + 16, oy + dh + 20, { color: p.muted, size: 11, mono: true });
    },
  });

  controls.append(
    slider('Quality', { min: 1, max: 15, step: 1, value: 6, fmt: (v) => `${v}`, on: (v) => { state.keep = v; cache = process(v); update(); } }).node
  );

  function update() {
    if (state.keep <= 3) setNote('<b>The 8 × 8 blocks are now visible.</b> Lossy compression describes each block as a sum of patterns, from coarse to fine, and throws the fine ones away. Drop enough and the block itself becomes the detail. This is what "compression artefacts" means, and why a fast camera move on a big LED wall goes mushy at a low bitrate.');
    else if (state.keep >= 12) setNote('Almost everything kept, so it is visually identical and barely smaller. Compression only buys you something when you discard, and the craft is knowing how much you can discard for the surface and the viewing distance you actually have.');
    else setNote('The picture looks intact while a large fraction of the numbers have gone. Our eyes are far more sensitive to coarse structure than to fine detail, and every lossy codec is built on exactly that. Note the hard edge: it is the first thing to suffer, because a sharp edge needs the fine patterns.');
  }
  update();
});

// ============================================================================
// Class 5: clock drift, and the click every ninety seconds
// ============================================================================

register('clock-drift', (host) => {
  const state = { ppm: 0, buffer: 32 };
  const { controls, stage, setNote } = figure(host, {
    title: 'A regular click is always a clock problem',
    sub: 'Two devices, each certain about when a sample happens. Give them slightly different ideas and watch the buffer walk.',
    note: '&nbsp;',
  });

  let level = 0.5, clicks = 0, flash = 0, elapsed = 0, lastClick = 0, interval = 0;

  canvas(stage, {
    height: 250,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      elapsed += dt;
      // A ppm difference means one device produces slightly more samples per
      // second than the other consumes. Sped up here so it is watchable.
      level += (state.ppm / 1e6) * 4000 * dt;
      level = clamp(level, -0.05, 1.05);

      if (level <= 0 || level >= 1) {
        clicks++;
        interval = elapsed - lastClick;
        lastClick = elapsed;
        level = 0.5;
        flash = 1;
      }
      flash = Math.max(0, flash - dt * 2.5);

      // The two clocks
      const drawClock = (x, y, rate, name, col) => {
        g.strokeStyle = col; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.stroke();
        const a = (elapsed * rate * 2.4) % (Math.PI * 2);
        line(g, x, y, x + Math.cos(a - Math.PI / 2) * 20, y + Math.sin(a - Math.PI / 2) * 20, { color: col, lw: 2.5 });
        label(g, name, x, y + 44, { color: p.ink2, size: 11, align: 'center' });
      };
      drawClock(70, 76, 1, 'Device A', p.green);
      drawClock(w - 70, 76, 1 + state.ppm / 1e6 * 3000, 'Device B', state.ppm ? p.red : p.green);

      // Buffer between them
      const bx = 150, bw = w - 300, by = 128, bh = 46;
      box(g, bx, by, bw, bh, { fill: p.raised, stroke: p.line, r: 8 });
      const fill = clamp(level, 0, 1);
      box(g, bx + 3, by + 3, (bw - 6) * fill, bh - 6, {
        fill: fill < 0.1 || fill > 0.9 ? p.red : p.cyan, stroke: 'transparent', r: 5,
      });
      label(g, 'buffer between the two clocks', bx, by - 12, { color: p.muted, size: 10.5, weight: 600 });
      label(g, 'empty', bx, by + bh + 16, { color: p.muted, size: 10, mono: true });
      label(g, 'full', bx + bw, by + bh + 16, { color: p.muted, size: 10, align: 'right', mono: true });

      if (flash > 0) {
        g.globalAlpha = flash;
        label(g, 'CLICK', w / 2, by + bh / 2, { color: p.red, size: 24, weight: 700, align: 'center' });
        g.globalAlpha = 1;
      }

      label(g, `clicks ${clicks}`, 20, hgt - 30, { color: clicks ? p.red : p.muted, size: 12.5, weight: 650, mono: true });
      label(g, interval ? `every ${interval.toFixed(1)} s, and it never changes` : 'no drift, no clicks',
        20, hgt - 12, { color: interval ? p.red : p.green, size: 12, mono: true });
    },
  });

  controls.append(
    slider('Clock difference', { min: 0, max: 60, step: 2, value: 0, fmt: (v) => `${v} ppm`, on: (v) => { state.ppm = v; clicks = 0; lastClick = elapsed; interval = 0; update(); } }).node,
    button('Reset', () => { clicks = 0; level = 0.5; interval = 0; lastClick = elapsed; }).node
  );

  function update() {
    if (!state.ppm) setNote('Both devices agree on when a sample happens, so the buffer sits still and nothing goes wrong. This is what a locked clock looks like, and it is the foundation everything else in this class stands on.');
    else setNote('<b>Now they disagree.</b> One is producing samples slightly faster than the other consumes them, so the buffer walks steadily until it runs out, and you get a click. Then it walks again, and clicks again, at the same interval, forever. <b>A regular periodic click that gets neither better nor worse is a clock problem.</b> Not a cable, which is irregular. Not bandwidth, which is bursty. Not a driver. Go and find the second master.');
  }
  update();
});

// ============================================================================
// Class 5: what fits down the wire
// ============================================================================

register('bandwidth-pipe', (host) => {
  const state = { link: 1, audio: 64, hd: 0, ndi: 2, uhd: 0 };
  const { controls, stage, setNote } = figure(host, {
    title: 'What actually fits down this wire',
    sub: 'Add sources until it overflows. One uncompressed HD picture is bigger than a thousand channels of audio.',
    note: '&nbsp;',
  });

  const ITEMS = () => [
    { name: 'Dante audio', n: state.audio, each: 1.152e6, c: 'green', unit: 'ch' },
    { name: 'NDI HD', n: state.ndi, each: 160e6, c: 'cyan', unit: 'streams' },
    { name: 'Uncompressed HD', n: state.hd, each: 2.49e9, c: 'amber', unit: 'streams' },
    { name: 'Uncompressed UHD', n: state.uhd, each: 9.95e9, c: 'red', unit: 'streams' },
  ];

  canvas(stage, {
    height: 230,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const cap = state.link * 1e9;
      const items = ITEMS().filter((i) => i.n > 0);
      const total = items.reduce((a, b) => a + b.n * b.each, 0);
      const over = total > cap;

      const x0 = 24, x1 = w - 24, y = 54, hh = 54;
      box(g, x0, y, x1 - x0, hh, { fill: p.raised, stroke: over ? p.red : p.line, r: 8, lw: over ? 2 : 1 });

      let x = x0 + 2;
      items.forEach((it) => {
        const bits = it.n * it.each;
        const ww = ((x1 - x0 - 4) * bits) / Math.max(cap, total);
        box(g, x, y + 2, Math.max(1, ww), hh - 4, { fill: alpha(p[it.c], 0.75), stroke: p[it.c], r: 4 });
        if (ww > 62) label(g, it.name, x + ww / 2, y + hh / 2, { color: p.ground, size: 10.5, weight: 700, align: 'center' });
        x += ww;
      });

      if (over) {
        const capX = x0 + 2 + ((x1 - x0 - 4) * cap) / total;
        line(g, capX, y - 12, capX, y + hh + 12, { color: p.red, lw: 2.5, dash: [5, 4] });
        label(g, `${state.link} Gbit limit`, capX + 6, y - 20, { color: p.red, size: 11, weight: 700 });
      }

      label(g, `${(total / 1e9).toFixed(3)} Gbit/s offered`, x0, y - 16, { color: p.ink, size: 12.5, weight: 650, mono: true });
      label(g, `${((total / cap) * 100).toFixed(0)}% of a ${state.link} Gbit link`, x1, y - 16,
        { color: over ? p.red : p.green, size: 12.5, weight: 650, align: 'right', mono: true });

      items.forEach((it, i) => {
        const bits = it.n * it.each;
        label(g, `${it.name}  ${it.n} ${it.unit} × ${(it.each / 1e6).toFixed(it.each < 1e7 ? 3 : 0)} Mbit = ${(bits / 1e6).toFixed(0)} Mbit/s`,
          x0, 140 + i * 18, { color: p[it.c], size: 11.5, mono: true });
      });
      label(g, over ? 'This does not fit. Compress it, or use a bigger link.' : 'Fits, with headroom.',
        x0, hgt - 12, { color: over ? p.red : p.green, size: 12, weight: 600 });
    },
  });

  controls.append(
    choice('Link', [[1, '1 Gbit'], [10, '10 Gbit'], [25, '25 Gbit']], { value: 1, on: (v) => { state.link = +v; update(); } }).node,
    slider('Dante ch', { min: 0, max: 512, step: 8, value: 64, fmt: (v) => `${v}`, on: (v) => { state.audio = v; update(); } }).node,
    slider('NDI HD', { min: 0, max: 12, step: 1, value: 2, fmt: (v) => `${v}`, on: (v) => { state.ndi = v; update(); } }).node,
    slider('Uncomp HD', { min: 0, max: 8, step: 1, value: 0, fmt: (v) => `${v}`, on: (v) => { state.hd = v; update(); } }).node,
    slider('Uncomp UHD', { min: 0, max: 4, step: 1, value: 0, fmt: (v) => `${v}`, on: (v) => { state.uhd = v; update(); } }).node
  );

  function update() {
    const cap = state.link * 1e9;
    const total = ITEMS().reduce((a, b) => a + b.n * b.each, 0);
    if (total > cap) setNote(`<b>Over by ${((total - cap) / 1e9).toFixed(2)} Gbit/s.</b> Your options are the same three every time: compress it and pay in latency and quality, move to a bigger link, or split it across separate physical networks. There is no fourth option and no setting that makes it fit.`);
    else setNote(`Using ${((total / cap) * 100).toFixed(0)}% of the link. Notice the scale: ${state.audio} channels of Dante is ${((state.audio * 1.152e6) / 1e6).toFixed(0)} Mbit/s, and a single uncompressed HD picture is 2,490 Mbit/s. <b>One HD stream is worth more than two thousand audio channels.</b>`);
  }
  update();
});

// ============================================================================
// Class 5: redundancy that is actually running
// ============================================================================

register('failover', (host) => {
  const state = { kind: 'dual', failed: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'A spare in a case is not redundancy',
    sub: 'Cut the primary path and watch how long the audience hears nothing.',
    note: '&nbsp;',
  });

  let gap = 0, booting = 0;

  canvas(stage, {
    height: 240,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const x0 = 120, x1 = w - 120;
      const yP = 66, yS = 132;

      const dual = state.kind === 'dual';
      let live;
      if (!state.failed) { live = 'primary'; gap = 0; booting = 0; }
      else if (dual) { live = 'secondary'; }
      else { booting += dt; live = booting > 4 ? 'secondary' : 'none'; if (live === 'none') gap += dt; }

      // Paths
      const path = (y, name, active, dead) => {
        line(g, x0, y, x1, y, { color: dead ? alpha(p.red, 0.35) : active ? p.green : alpha(p.line, 1), lw: 8 });
        label(g, name, 10, y - 8, { color: dead ? p.red : active ? p.green : p.muted, size: 12, weight: 650 });
        label(g, dead ? 'FAILED' : active ? 'carrying audio' : (dual ? 'carrying the same audio' : 'in a flight case'),
          10, y + 9, { color: p.muted, size: 10 });
        if (!dead) {
          for (let i = 0; i < 8; i++) {
            const px = x0 + (((t * 150 + i * 60) % (x1 - x0)));
            if (active || dual) box(g, px, y - 5, 9, 10, { fill: active ? p.green : alpha(p.cyan, 0.5), stroke: 'transparent', r: 3 });
          }
        }
      };
      path(yP, 'Primary', live === 'primary', state.failed);
      path(yS, dual ? 'Secondary' : 'Cold spare', live === 'secondary', false);

      if (state.failed) {
        const cx = (x0 + x1) / 2;
        line(g, cx, yP - 22, cx, yP + 22, { color: p.red, lw: 2.5, dash: [5, 4] });
      }

      // Output
      box(g, x1 + 10, 82, 104, 66, { fill: p.surface, stroke: live === 'none' ? p.red : p.green, r: 8, lw: 2 });
      label(g, 'AUDIENCE', x1 + 62, 100, { color: p.muted, size: 9.5, weight: 700, align: 'center' });
      label(g, live === 'none' ? 'SILENCE' : 'sound', x1 + 62, 120,
        { color: live === 'none' ? p.red : p.green, size: 14, weight: 700, align: 'center' });
      if (!dual && state.failed && live === 'none')
        label(g, `${(4 - booting).toFixed(1)} s`, x1 + 62, 138, { color: p.red, size: 11, align: 'center', mono: true });

      label(g, gap > 0 ? `audience heard nothing for ${gap.toFixed(1)} s` : 'no audible gap',
        20, hgt - 14, { color: gap > 0 ? p.red : p.green, size: 12.5, weight: 650 });
    },
  });

  controls.append(
    choice('Design', [['dual', 'Dual path, both running'], ['cold', 'Cold spare in a case']],
      { value: 'dual', on: (v) => { state.kind = v; state.failed = false; gap = 0; booting = 0; update(); } }).node,
    toggle('Cut the primary', { on: (v) => { state.failed = v; if (!v) { gap = 0; booting = 0; } update(); } }).node
  );

  function update() {
    if (state.kind === 'dual') setNote('Two physically separate networks carrying the same audio. The secondary was already running before the failure, so there is nothing to switch on and nothing to boot: the changeover is inaudible. This is what Dante primary and secondary does, and it is the model for redundancy generally.');
    else setNote('<b>A cold spare protected the second half, not the show.</b> A backup that has to be found, powered, booted and patched is a spare part, not redundancy. Redundancy that is not already carrying the load is not redundancy. Note also that the dual path costs double the infrastructure, and that complexity has its own failure modes: this is a design decision with a price, not a virtue.');
  }
  update();
});
