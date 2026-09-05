// Animations for Class 2 Block D: what a file actually is at byte level,
// PCM byte by byte, luma and chroma, lossless and lossy compression,
// inter frame prediction. Plus the LTC timecode encoder used in Class 4.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp,
} from './anim-core.js';

const hex2 = (v) => v.toString(16).toUpperCase().padStart(2, '0');
const bin8 = (v) => (v & 255).toString(2).padStart(8, '0');
const asc = (v) => (v >= 32 && v < 127 ? String.fromCharCode(v) : '.');
const mono = { mono: true };

// Several of these figures change shape with the width of the column they land
// in, so they measure what they drew and ask for exactly that much canvas.
// Deferred to the next frame, otherwise a resize would reenter draw().
function fitter(getCv) {
  let pending = false;
  return (want) => {
    const cv = getCv();
    if (!cv || pending || Math.abs(cv.h - want) < 3) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; cv.setHeight(Math.round(want)); });
  };
}

// ============================================================================
// 1. A file is a sequence of bytes: real headers, read field by field
// ============================================================================

const FILES = {
  wav: {
    name: '48k-16bit-stereo.wav',
    bytes: [
      0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x03, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6D, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00,
      0x80, 0xBB, 0x00, 0x00, 0x00, 0xEE, 0x02, 0x00, 0x04, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x08, 0x03, 0x00,
      0x00, 0x00, 0x5C, 0x4F, 0x11, 0x02, 0xA4, 0x9E,
    ],
    fields: [
      [0, 4, 'Magic number: RIFF', 'The first four bytes spell <b>RIFF</b>. This is the container. The file name played no part in that decision, and never does.'],
      [4, 4, 'File size, minus 8', 'A 32 bit number, low byte first: <b>24 08 03 00</b> reads as 0x00030824, which is 198,180 bytes. Written backwards because this is a little endian format.'],
      [8, 4, 'Format: WAVE', 'RIFF is a general container. These four bytes say the thing inside it is audio.'],
      [12, 4, 'Chunk id: "fmt "', 'Note the trailing space. Chunk names are always four bytes, so short names get padded.'],
      [16, 4, 'Chunk size: 16', 'The format block that follows is 16 bytes long. Everything in a file has to say how long it is, or nothing can be skipped.'],
      [20, 2, 'Audio format: 1 = PCM', 'A 1 here means uncompressed PCM. Any other value means a codec, and a player that does not have it will refuse the file.'],
      [22, 2, 'Channels: 2', '02 00 is the number 2, low byte first. Stereo.'],
      [24, 4, 'Sample rate: 48,000', '<b>80 BB 00 00</b> reversed is 0x0000BB80, which is 48,000. This single field is the whole of Block C sitting in a file.'],
      [28, 4, 'Byte rate: 192,000', '48,000 samples x 2 channels x 2 bytes = 192,000 bytes per second. The data rate calculation, stored in the header so a player knows it in advance.'],
      [32, 2, 'Block align: 4', 'One sample across all channels takes 4 bytes. This is how a player finds sample number 12,000 without reading everything before it.'],
      [34, 2, 'Bits per sample: 16', '0x0010 is 16. Now every following pair of bytes has a meaning.'],
      [36, 4, 'Chunk id: "data"', 'The header ends here. From the next field on, this file is nothing but audio.'],
      [40, 4, 'Data size', 'How many bytes of audio follow. Divide by the block align and you have the length in samples, and therefore in seconds.'],
      [44, 2, 'First sample: 0', 'Left channel, value 0. Silence.'],
      [46, 2, 'Second sample: +20,316', '<b>5C 4F</b> reversed is 0x4F5C = 20,316. That is the worked example from the prose, sitting in a real file, low byte first.'],
    ],
  },
  png: {
    name: 'backdrop.png',
    bytes: [
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x07, 0x80, 0x00, 0x00, 0x04, 0x38,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1B, 0x8C, 0x8A, 0x63, 0x00, 0x00, 0x20,
      0x00, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0xED,
    ],
    fields: [
      [0, 8, 'Magic number: PNG', 'Byte 0 is 0x89, deliberately not a text character, so a program that opens the file as text fails immediately instead of quietly corrupting it. Then <b>PNG</b>, then a carriage return and line feed pair that detects a file damaged by being sent as text.'],
      [8, 4, 'Chunk length: 13', 'PNG is big endian: the high byte comes first, the opposite of WAV. There is no universal rule, only what each format chose.'],
      [12, 4, 'Chunk type: IHDR', 'The image header. Every PNG starts with this one.'],
      [16, 4, 'Width: 1920', '0x00000780 is 1920. Read it left to right, because this format is big endian.'],
      [20, 4, 'Height: 1080', '0x00000438 is 1080.'],
      [24, 1, 'Bit depth: 8', '8 bits per channel. Bit depth in a file is the same idea as bit depth in Block C.'],
      [25, 1, 'Colour type: 6', 'Type 6 means truecolour with an alpha channel. This is the byte that tells you whether your backdrop actually carries transparency.'],
      [26, 3, 'Compression, filter, interlace', 'All zero: the standard deflate compression, standard filtering, not interlaced.'],
      [29, 4, 'CRC checksum', 'A checksum over the chunk. If a byte was corrupted in transfer, this will not match, and the reader knows rather than guesses.'],
      [33, 4, 'Chunk length', 'The next chunk is 0x2000 = 8192 bytes long.'],
      [37, 4, 'Chunk type: IDAT', 'The image data itself. Everything from here is compressed pixels.'],
      [41, 3, 'Deflate stream begins', '0x78 0x9C is the standard signature of a zlib deflate stream. Lossless compression, starting right here.'],
    ],
  },
  jpg: {
    name: 'plate.jpg',
    bytes: [
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x10, 0x0B, 0x0C, 0x0E, 0x0C, 0x0A, 0x10, 0x0E, 0x0D, 0x0E, 0x12,
      0x11, 0x10, 0x13, 0x18, 0x28, 0x1A, 0x18, 0x16,
    ],
    fields: [
      [0, 2, 'Magic number: start of image', '<b>FF D8</b>. Every JPEG in the world begins with these two bytes. Rename it to anything you like, they do not change.'],
      [2, 2, 'Marker: APP0', 'JPEG is built from markers, each starting 0xFF. APP0 is the application block.'],
      [4, 2, 'Segment length: 16', 'Big endian again.'],
      [6, 5, 'Identifier: JFIF', 'Readable text inside the header, which is why a text editor showing garbage still shows a few recognisable words.'],
      [20, 2, 'Marker: define quantisation table', '<b>FF DB</b>. This is step 5 of the codec pipeline, stored in the file so the decoder can undo it.'],
      [22, 2, 'Segment length: 67', 'One byte of table id plus 64 table values.'],
      [25, 19, 'The quantisation table itself', 'These numbers <i>are</i> the quality setting. Each of the 64 coefficients in an 8 x 8 block gets divided by one of these before rounding. Small numbers near the start, larger further in: fine detail is rounded hardest. Set the quality slider low in an export dialogue and these numbers get bigger.'],
    ],
  },
};

register('hex-file', (host) => {
  let key = 'wav', idx = 0, acc = 0;
  const { controls, stage, setNote } = figure(host, {
    title: 'Inside a real file, byte by byte',
    sub: 'The actual opening bytes of three formats. Every field is a number a player has to read before it can play anything.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 250,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const f = FILES[key];
      acc += dt;
      if (acc > 3.4) { acc = 0; idx = (idx + 1) % f.fields.length; paintNote(); }

      // Fit the dump to the column: sixteen bytes a row where there is space,
      // eight where there is not, and shrink the cells if even that is tight.
      const avail = w - 16, offW = 46, gapW = 18;
      const need = (n, cw, aw) => offW + n * cw + gapW + n * aw;
      let perRow = w > 620 ? 16 : 8, cellW = 25, ascW = 10;
      if (need(perRow, cellW, ascW) > avail) {
        const k = Math.max(0.55, (avail - offW - gapW) / (perRow * (cellW + ascW)));
        cellW *= k; ascW *= k;
      }
      const fsz = clamp(12 * (cellW / 25), 8.5, 12);
      const gridW = need(perRow, cellW, ascW);
      const ox = Math.max(8, (w - gridW) / 2);
      const oy = 34;
      const rowH = 22;

      const [fs, fl] = f.fields[idx];

      label(g, f.name, ox, 16, { color: p.ink, size: 12.5, weight: 650, mono: true });
      label(g, `${f.bytes.length} bytes shown`, ox + gridW - 4, 16,
        { color: p.muted, size: 11, align: 'right', mono: true });

      for (let i = 0; i < f.bytes.length; i++) {
        const r = (i / perRow) | 0, c = i % perRow;
        const x = ox + offW + c * cellW, y = oy + r * rowH;
        const on = i >= fs && i < fs + fl;
        if (on) {
          box(g, x - 3, y - 9, cellW - 1, 19, { fill: alpha(p.amber, 0.22), stroke: p.amber, r: 3, lw: 1 });
          box(g, ox + offW + perRow * cellW + gapW + c * ascW - 2, y - 9, ascW, 19,
            { fill: alpha(p.amber, 0.18), stroke: 'transparent', r: 2 });
        }
        if (c === 0) label(g, hex2(r * perRow).padStart(4, '0'), ox, y, { color: p.muted, size: 11, ...mono });
        label(g, hex2(f.bytes[i]), x, y, { color: on ? p.ink : p.ink2, size: fsz, weight: on ? 700 : 500, ...mono });
        label(g, asc(f.bytes[i]), ox + offW + perRow * cellW + gapW + c * ascW, y,
          { color: on ? p.amber : p.muted, size: Math.min(11.5, fsz), ...mono });
      }

      const rows = Math.ceil(f.bytes.length / perRow);
      const by = oy + rows * rowH + 8;
      line(g, ox, by, ox + gridW, by, { color: p.line, lw: 1 });
      label(g, `byte ${fs}${fl > 1 ? ` to ${fs + fl - 1}` : ''}`, ox, by + 18,
        { color: p.muted, size: 11, ...mono });
      label(g, f.fields[idx][2], ox + 86, by + 18,
        { color: p.amber, size: gridW < 330 ? 12 : 13, weight: 650 });

      // Progress through the header, so it is obvious this is a walk, not a loop.
      const pw = gridW * ((idx + acc / 3.4) / f.fields.length);
      line(g, ox, by + 34, ox + gridW, by + 34, { color: p.line, lw: 2 });
      line(g, ox, by + 34, ox + pw, by + 34, { color: p.amber, lw: 2 });
      fit(by + 46);
    },
  });

  function paintNote() { setNote(FILES[key].fields[idx][3]); }

  controls.append(
    choice('File', [['wav', 'WAV audio'], ['png', 'PNG image'], ['jpg', 'JPEG image']], {
      value: 'wav', on: (v) => { key = v; idx = 0; acc = 0; paintNote(); cv.once(); },
    }).node,
    button('Next field ›', () => {
      idx = (idx + 1) % FILES[key].fields.length; acc = 0; paintNote(); cv.once();
    }).node
  );
  paintNote();
});

// ============================================================================
// 2. PCM: one waveform value, all the way down to two bytes
// ============================================================================

register('pcm-bytes', (host) => {
  const state = { pos: 62, bits: 16, little: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'From a waveform to the bytes on disk',
    sub: 'Drag along the waveform. Everything below the picture is what actually gets written to the file for that one sample.',
    note: '&nbsp;',
  });

  const wave = (u) => 0.72 * Math.sin(u * Math.PI * 2 * 1.5) + 0.22 * Math.sin(u * Math.PI * 2 * 4.5 + 1);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(540, w - 24), ox = (w - W) / 2;
      const oy = 18, H = 108, mid = oy + H / 2;

      // The waveform, with sample points marked.
      line(g, ox, mid, ox + W, mid, { color: p.line, lw: 1 });
      g.beginPath();
      for (let i = 0; i <= W; i++) g.lineTo(ox + i, mid - wave(i / W) * (H / 2 - 6));
      g.strokeStyle = alpha(p.cyan, 0.55); g.lineWidth = 1.6; g.stroke();

      const N = 48;
      for (let i = 0; i <= N; i++) {
        const u = i / N, x = ox + u * W, y = mid - wave(u) * (H / 2 - 6);
        line(g, x, mid, x, y, { color: alpha(p.cyan, 0.3), lw: 1 });
        g.fillStyle = alpha(p.cyan, 0.8); g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
      }

      const u = state.pos / 100;
      const val = clamp(wave(u), -1, 1);
      const px = ox + u * W, py = mid - val * (H / 2 - 6);
      line(g, px, oy, px, oy + H, { color: p.amber, lw: 1.5, dash: [3, 3] });
      g.fillStyle = p.amber; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill();

      // The chain: normalised value, integer, binary, hex bytes.
      const full = 2 ** (state.bits - 1);
      const iv = Math.round(val * (full - 1));
      const uv = iv < 0 ? iv + 2 ** state.bits : iv;         // two's complement
      const nb = state.bits / 8;
      let bytes = [];
      for (let i = nb - 1; i >= 0; i--) bytes.push((uv >> (i * 8)) & 255);   // high byte first
      if (state.little) bytes = bytes.slice().reverse();

      // The chain is a label column and a value column, except on a phone,
      // where the value goes underneath instead of running off the edge.
      const narrow = w < 520;
      const vx = narrow ? ox + 6 : ox + 206;
      const fs = narrow ? 11.5 : 13;
      let y = oy + H + 34;
      const step = (lbl, txt, col) => {
        label(g, lbl, ox, y, { color: p.muted, size: 11, ...mono });
        label(g, txt, vx, narrow ? y + 15 : y, { color: col, size: fs, weight: 650, ...mono });
        y += narrow ? 38 : 30;
      };
      step('waveform value', val.toFixed(4), p.ink2);
      step(`x full scale (${full - 1})`, `${val.toFixed(4)} x ${full - 1}`, p.ink2);
      step('rounded to an integer', iv.toLocaleString('en-US'), p.cyan);
      step('as ' + state.bits + ' bit binary',
        Array.from({ length: nb }, (_, i) => bin8((uv >> ((nb - 1 - i) * 8)) & 255)).join(' '), p.ink2);

      label(g, `bytes on disk, ${state.little ? 'low first' : 'high first'}`, ox, y,
        { color: p.muted, size: 11, ...mono });
      bytes.forEach((b, i) => {
        const bx = vx + i * 46;
        const byy = narrow ? y + 24 : y;
        box(g, bx - 6, byy - 13, 40, 26, { fill: alpha(p.amber, 0.16), stroke: p.amber, r: 4, lw: 1.2 });
        label(g, hex2(b), bx + 14, byy, { color: p.amber, size: 14, weight: 700, align: 'center', ...mono });
      });
      y += narrow ? 50 : 30;

      const err = Math.abs(val - iv / (full - 1));
      label(g, `rounding error ${(err * 100).toFixed(4)} %`, ox, y, { color: p.muted, size: 11, ...mono });
      label(g, `${nb} byte${nb > 1 ? 's' : ''} per sample, per channel`, ox, y + 18,
        { color: p.muted, size: 11, ...mono });
      fit(y + 34);
    },
  });

  const upd = () => {
    cv.once();
    if (state.bits === 8) setNote('<b>8 bit.</b> Only 256 levels for the whole waveform, so the rounding error is large enough to hear as a gritty hiss riding on the signal. This is quantisation noise, and it is the reason bit depth exists.');
    else if (state.bits === 24) setNote('<b>24 bit.</b> Three bytes per sample per channel. The rounding error is far below anything a room can reveal, which is why recording and mixing happen here and delivery does not.');
    else if (!state.little) setNote('<b>High byte first.</b> This is what AIFF does. Read a big endian file as little endian and every sample is scrambled: the result is full scale noise, instantly, which is at least an unambiguous symptom.');
    else setNote('16 bit, low byte first: a WAV file. Note that nothing in the file says what the sound <i>is</i>. It is a list of positions, 48,000 of them a second, and the loudspeaker turns the list back into air.');
  };

  controls.append(
    slider('Position in waveform', { min: 0, max: 100, step: 0.5, value: 62, fmt: (v) => `${v.toFixed(0)} %`, on: (v) => { state.pos = v; upd(); } }).node,
    choice('Bit depth', [['8', '8 bit'], ['16', '16 bit'], ['24', '24 bit']], { value: '16', on: (v) => { state.bits = +v; upd(); } }).node,
    toggle('High byte first (AIFF order)', { on: (v) => { state.little = !v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 3. Luma and chroma, and what subsampling really costs
// ============================================================================

register('ycbcr-planes', (host) => {
  const state = { mode: '420', luma: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Splitting a picture into brightness and colour',
    sub: 'The same picture as three planes. Look at how much of the photograph lives in Y alone, then thin the colour and see how little happens.',
    note: '&nbsp;',
  });

  const W = 88, H = 56;
  const src = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H;
    // A stage: deep blue cyclorama, a warm key from the left, a magenta wash
    // from the right, a performer, and two deliberate test bands.
    let r = 22 + 200 * Math.exp(-(((u - 0.22) * 2.4) ** 2)) * (1 - v * 0.5);
    let gg = 30 + 150 * Math.exp(-(((u - 0.26) * 2.2) ** 2)) * (1 - v * 0.55);
    let b = 70 + 150 * (0.4 + 0.6 * u) * (1 - v * 0.3);
    r += 120 * Math.exp(-(((u - 0.84) * 2.6) ** 2)) * (1 - v * 0.4);
    b += 90 * Math.exp(-(((u - 0.84) * 2.6) ** 2)) * (1 - v * 0.4);
    const dx = (u - 0.5) * 2.4, dy = (v - 0.74) * 1.4;
    if (dx * dx + dy * dy < 0.05) { r = 232; gg = 206; b = 178; }          // performer
    // Band 1: fine detail in brightness only, neutral in colour. A gobo
    // texture, a grille, small white text on a dark backdrop.
    if (v > 0.14 && v < 0.32) { const q = x % 2 ? 236 : 26; r = q; gg = q; b = q; }
    // Band 2: fine detail in colour only, at roughly matched brightness.
    // Saturated red against saturated blue is the case subsampling hates.
    if (v > 0.36 && v < 0.54) {
      if (x % 2) { r = 226; gg = 32; b = 42; } else { r = 40; gg = 66; b = 232; }
    }
    if (v > 0.86) { const sc = ((x * 3 + y * 5) % 11) < 3 ? 1.25 : 0.7; r *= sc * 0.5; gg *= sc * 0.5; b *= sc * 0.55; }
    src[(y * W + x) * 3] = clamp(r, 0, 255);
    src[(y * W + x) * 3 + 1] = clamp(gg, 0, 255);
    src[(y * W + x) * 3 + 2] = clamp(b, 0, 255);
  }

  const Y = new Float32Array(W * H), CB = new Float32Array(W * H), CR = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = src[i * 3], g0 = src[i * 3 + 1], b = src[i * 3 + 2];
    const y = 0.299 * r + 0.587 * g0 + 0.114 * b;
    Y[i] = y; CB[i] = (b - y) * 0.564 + 128; CR[i] = (r - y) * 0.713 + 128;
  }

  // Average over a block, then hold the result across the block: exactly what
  // subsampling and its upsample do.
  function thin(plane, bx, by) {
    if (bx === 1 && by === 1) return plane;
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y += by) for (let x = 0; x < W; x += bx) {
      let s = 0, n = 0;
      for (let j = 0; j < by && y + j < H; j++) for (let i = 0; i < bx && x + i < W; i++) { s += plane[(y + j) * W + x + i]; n++; }
      const m = s / n;
      for (let j = 0; j < by && y + j < H; j++) for (let i = 0; i < bx && x + i < W; i++) out[(y + j) * W + x + i] = m;
    }
    return out;
  }

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');

  function blit(g, x, y, w, hgt, fill) {
    const img = octx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const [r, gg, b] = fill(i);
      img.data[i * 4] = clamp(r, 0, 255); img.data[i * 4 + 1] = clamp(gg, 0, 255);
      img.data[i * 4 + 2] = clamp(b, 0, 255); img.data[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(off, x, y, w, hgt);
  }

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 220,
    animated: false,
    draw(g, w) {
      const p = palette();
      const cols = w > 640 ? 4 : 2;
      const pad = 10;
      const pw = Math.min(250, (Math.min(w - 16, 1000) - pad * (cols - 1)) / cols);
      const ph = Math.round(pw * (H / W));
      const total = pw * cols + pad * (cols - 1);
      const ox = (w - total) / 2;

      const [bx, by] = state.mode === '444' ? [1, 1] : state.mode === '422' ? [2, 1] : [2, 2];
      const cb = state.luma ? CB : thin(CB, bx, by);
      const cr = state.luma ? CR : thin(CR, bx, by);
      const yy = state.luma ? thin(Y, bx, by) : Y;

      const panels = [
        ['Reconstructed RGB', (i) => {
          const y = yy[i], u = cb[i] - 128, v = cr[i] - 128;
          return [y + 1.403 * v, y - 0.344 * u - 0.714 * v, y + 1.773 * u];
        }, p.ink],
        ['Y, brightness', (i) => [yy[i], yy[i], yy[i]], p.green],
        ['Cb, blue difference', (i) => { const c = cb[i]; return [128 - (c - 128) * 0.6, 128 - (c - 128) * 0.3, 128 + (c - 128) * 1.1]; }, p.cyan],
        ['Cr, red difference', (i) => { const c = cr[i]; return [128 + (c - 128) * 1.1, 128 - (c - 128) * 0.4, 128 - (c - 128) * 0.5]; }, p.red],
      ];

      panels.forEach((pn, k) => {
        const cx = ox + (k % cols) * (pw + pad);
        const cy = 22 + ((k / cols) | 0) * (ph + 34);
        blit(g, cx, cy, pw, ph, pn[1]);
        box(g, cx, cy, pw, ph, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
        label(g, pn[0], cx, cy - 9, { color: pn[2], size: 11.5, weight: 650 });
      });

      const rows = Math.ceil(4 / cols);
      const fy = 22 + rows * (ph + 34) + 2;
      const stacked = w < 600;
      label(g, 'Y = 0.299 R + 0.587 G + 0.114 B', ox, fy, { color: p.muted, size: 12, ...mono });
      const kept = state.luma ? `luma thinned ${bx}x${by}, chroma full` : state.mode === '444' ? 'nothing thinned' : `chroma thinned ${bx}x${by}`;
      label(g, kept, stacked ? ox : ox + 260, stacked ? fy + 20 : fy,
        { color: p.amber, size: 12, ...mono });
      label(g, 'band 1 is detail in brightness  ·  band 2 is detail in colour only',
        ox, fy + (stacked ? 40 : 20), { color: p.muted, size: 11.5 });
      fit(fy + (stacked ? 56 : 36));
    },
  });

  const upd = () => {
    if (state.luma) setNote('<b>This is the experiment nobody runs twice.</b> Thin the brightness instead of the colour and the top band, the fine detail one, turns to grey mush at once. Exactly the same amount of data thrown away as 4:2:0, and a completely different result. That asymmetry is the whole justification for 4:2:2.');
    else if (state.mode === '444') setNote('Nothing thinned. Look at the three planes: <b>Y is the photograph</b>. Cb and Cr are vague coloured fog carrying almost no detail. Two thirds of the data is spent on the two planes you can barely read.');
    else setNote(`<b>${state.mode === '422' ? '4:2:2' : '4:2:0'}.</b> Colour resolution ${state.mode === '422' ? 'halved horizontally' : 'halved in both directions'}, brightness untouched. The top band, which is detail in brightness, survives perfectly. The <b>second band</b>, which is detail in colour only, smears into mud, and that is the honest cost: red against blue, saturated graphics, thin coloured text. Everywhere else it is close to invisible, which is why a camera output labelled 4:2:2 is not "half quality".`);
  };

  controls.append(
    choice('Chroma sampling', [['444', '4:4:4'], ['422', '4:2:2'], ['420', '4:2:0']], {
      value: '420', on: (v) => { state.mode = v; upd(); cv.once(); },
    }).node,
    toggle('Thin the luma instead (never done)', { on: (v) => { state.luma = v; upd(); cv.once(); } }).node
  );
  upd();
});

// ============================================================================
// 4. Lossless compression, and where it stops working
// ============================================================================

const LL_SETS = {
  flat: { label: 'Title card', build: () => { const a = []; for (let i = 0; i < 64; i++) a.push(i < 6 ? 1 : i < 44 ? 0 : i < 50 ? 1 : 0); return a; } },
  wash: { label: 'Gradient wash', build: () => { const a = []; for (let i = 0; i < 64; i++) a.push(Math.min(5, (i / 11) | 0)); return a; } },
  grain: {
    label: 'Foliage, film grain',
    build: () => {
      const a = []; let s = 7;
      for (let i = 0; i < 64; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; a.push(s % 6); }
      return a;
    },
  },
};

register('lossless-compress', (host) => {
  let key = 'flat', data = LL_SETS.flat.build(), scan = 0;
  const { controls, stage, setNote } = figure(host, {
    title: 'Run length encoding, running',
    sub: 'One row of 64 bytes. The encoder walks left to right, counts repeats, and writes a count and a value instead of the run.',
    note: '&nbsp;',
  });

  const runsOf = (arr, upTo) => {
    const out = [];
    for (let i = 0; i < upTo;) { let j = i; while (j < upTo && arr[j] === arr[i]) j++; out.push([j - i, arr[i]]); i = j; }
    return out;
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 260,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      scan += dt * 16;
      if (scan > 68) scan = 0;
      const upTo = clamp(Math.floor(scan), 0, 64);
      const cols = [p.cyan, p.amber, p.green, p.red, p.ink2, p.muted];

      const W = Math.min(560, w - 24), ox = (w - W) / 2, cw = W / 64;
      const oy = 24;

      label(g, 'raw bytes', ox, 14, { color: p.muted, size: 11.5, ...mono });
      for (let i = 0; i < 64; i++) {
        g.fillStyle = i < upTo ? cols[data[i]] : alpha(cols[data[i]], 0.28);
        g.fillRect(ox + i * cw, oy, cw - 0.6, 26);
      }
      const sx = ox + upTo * cw;
      line(g, sx, oy - 5, sx, oy + 32, { color: p.ink, lw: 2 });

      const runs = runsOf(data, upTo);
      label(g, 'encoded tokens', ox, oy + 54, { color: p.muted, size: 11.5, ...mono });
      let tx = ox;
      const ty = oy + 78;
      for (const [n, v] of runs) {
        const tw = 46;
        if (tx + tw > ox + W) break;
        box(g, tx, ty - 13, tw - 4, 26, { fill: alpha(cols[v], 0.18), stroke: cols[v], r: 4, lw: 1.2 });
        label(g, `${n}×`, tx + 4, ty, { color: p.ink2, size: 11.5, ...mono });
        g.fillStyle = cols[v]; g.fillRect(tx + 26, ty - 7, 13, 14);
        tx += tw;
      }

      // Size comparison, in real bytes: 1 per raw byte, 2 per token.
      const raw = 64, enc = runsOf(data, 64).length * 2;
      const bw = Math.min(420, W);
      const by = oy + 138;
      const bar = (y, wid, col, txt) => {
        box(g, ox, y, bw, 20, { fill: alpha(p.line, 0.35), stroke: 'transparent', r: 4 });
        box(g, ox, y, Math.max(3, wid), 20, { fill: alpha(col, 0.55), stroke: col, r: 4, lw: 1 });
        label(g, txt, ox + bw + 12, y + 10, { color: col, size: 12, weight: 650, ...mono });
      };
      // Both bars share a scale, so a result that came out larger than the
      // original actually looks larger rather than running off the end.
      const sc = bw / Math.max(raw, enc);
      bar(by, raw * sc, p.muted, `${raw} bytes raw`);
      bar(by + 30, enc * sc, enc <= raw ? p.green : p.red, `${enc} bytes encoded`);
      label(g, enc <= raw ? `${(raw / enc).toFixed(1)}:1, and perfectly reversible` : `${((enc / raw - 1) * 100).toFixed(0)} % LARGER than the original`,
        ox, by + 76, { color: enc <= raw ? p.green : p.red, size: 12.5, weight: 650 });
      fit(by + 94);
    },
  });

  const upd = () => {
    data = LL_SETS[key].build(); scan = 0;
    if (key === 'flat') setNote('<b>A title card.</b> Long runs of identical bytes, a handful of tokens, an enormous saving, and every original byte comes back exactly. This is why a caption or a logo plate is almost free.');
    else if (key === 'wash') setNote('<b>A gradient.</b> Runs still exist but they are short, so the saving is modest. Real lossless codecs do better than this by predicting each byte from its neighbours and encoding only the difference, which turns a smooth wash back into long runs of near zero.');
    else setNote('<b>Grain and foliage.</b> Almost no repetition, so nearly every run is length 1 and each one costs two bytes where the original cost one. <b>The file gets bigger.</b> This is not a bug in RLE, it is the hard limit of lossless: you cannot compress what has no pattern, and it is exactly why delivery formats are lossy.');
  };

  controls.append(choice('Content', Object.entries(LL_SETS).map(([k, v]) => [k, v.label]), {
    value: 'flat', on: (v) => { key = v; upd(); },
  }).node);
  upd();
});

// ============================================================================
// 5. The codec pipeline, one stage at a time
// ============================================================================

const STAGES = [
  ['1. Colour transform', 'RGB → YCbCr', false, 1.0,
   'Brightness is separated from colour. Nothing is lost yet: this step is perfectly reversible, and its only purpose is to put the important information in one plane so the next step can attack the other two.'],
  ['2. Chroma subsampling', '4:4:4 → 4:2:0', true, 0.5,
   '<b>Lossy.</b> Half the colour samples are averaged away. Half the file gone, and on normal picture content it is close to invisible, because your eye reads the Y plane. It shows on saturated hard edges: red text on blue, a thin magenta line.'],
  ['3. Split into blocks', '8 × 8 pixels', false, 0.5,
   'Bookkeeping only. The picture is cut into small squares so the transform has something small enough to work on. Those squares are the blocks you see when a stream fails, and they were there all along.'],
  ['4. Transform', 'blocks → frequencies', false, 0.5,
   'Each block is rewritten as a set of frequency coefficients: one number for the average brightness, then progressively finer patterns. Still reversible, still no loss. It has simply been re-sorted so the important numbers are at the front.'],
  ['5. Quantisation', 'divide, then round', true, 0.5,
   '<b>This is the quality slider.</b> Every coefficient is divided by a table value and rounded. Fine detail rounds to zero and is gone permanently. Nothing else in the chain does what this does, and the numbers in that table are stored in the file so a decoder can undo the division, but not the rounding.'],
  ['6. Entropy coding', 'pack the zeros', false, 0.5,
   'Lossless. All those zeros produced by step 5 are packed away with run length and entropy coding. The saving here is large precisely because step 5 made so many zeros, which is why quality and file size move together.'],
];

register('codec-pipeline', (host) => {
  let q = 55, idx = 0, acc = 0;
  const { controls, stage, setNote } = figure(host, {
    title: 'What a codec actually does, in order',
    sub: 'Six steps. Only two lose anything, and only one of them is the setting you touch.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      acc += dt;
      if (acc > 2.8) { acc = 0; idx = (idx + 1) % STAGES.length; paint(); }

      const cols = w > 700 ? 3 : 2;
      const rows = Math.ceil(STAGES.length / cols);
      const pad = 12, bw = Math.min(200, (Math.min(w - 16, 860) - pad * (cols - 1)) / cols), bh = 84;
      const tight = bw < 178;
      const total = bw * cols + pad * (cols - 1), ox = (w - total) / 2, oy = 16;

      // Size after each stage, in arbitrary units, so the shrink is visible.
      const qFactor = lerp(0.34, 0.03, q / 100);
      let size = 1;
      const sizes = STAGES.map((s, i) => {
        if (i === 1) size *= 0.5;
        if (i === 4) size *= 1;
        if (i === 5) size = 0.5 * qFactor;
        return size;
      });

      STAGES.forEach((s, i) => {
        const x = ox + (i % cols) * (bw + pad), y = oy + ((i / cols) | 0) * (bh + pad);
        const on = i === idx;
        const col = s[2] ? p.red : p.green;
        box(g, x, y, bw, bh, {
          fill: on ? alpha(col, 0.16) : alpha(p.raised, 0.6),
          stroke: on ? col : p.line, r: 8, lw: on ? 2 : 1,
        });
        label(g, s[0], x + 12, y + 17, { color: on ? p.ink : p.ink2, size: tight ? 11.5 : 12.5, weight: 700 });
        label(g, s[1], x + 12, y + 35, { color: p.muted, size: tight ? 10.5 : 11.5, ...mono });
        // The badge gets its own line: on a phone it collided with the sub.
        label(g, s[2] ? 'LOSSY' : 'lossless', x + 12, y + 53,
          { color: s[2] ? p.red : p.green, size: 10.5, weight: 700 });
        const inner = bw - 24;
        box(g, x + 12, y + 64, inner, 10, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 3 });
        box(g, x + 12, y + 64, Math.max(3, inner * sizes[i]), 10, { fill: alpha(col, 0.6), stroke: 'transparent', r: 3 });
      });

      const fy = oy + rows * (bh + pad) + 8;
      label(g, 'quality setting', ox, fy + 10, { color: p.muted, size: 11.5, ...mono });
      const bw2 = Math.min(300, total - 160);
      box(g, ox + 110, fy + 2, bw2, 16, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 4 });
      box(g, ox + 110, fy + 2, (bw2 * q) / 100, 16, { fill: alpha(p.amber, 0.6), stroke: p.amber, r: 4, lw: 1 });
      label(g, `final size ${(sizes[5] * 100).toFixed(1)} % of the original`, ox, fy + 38,
        { color: p.amber, size: 12.5, weight: 650, ...mono });
      fit(fy + 54);
    },
  });

  function paint() {
    setNote(`<b>${STAGES[idx][0]}.</b> ${STAGES[idx][4]}`);
  }

  controls.append(
    slider('Quality (step 5)', { min: 5, max: 100, step: 1, value: 55, fmt: (v) => `${v}`, on: (v) => { q = v; cv.once(); } }).node,
    button('Next step ›', () => { idx = (idx + 1) % STAGES.length; acc = 0; paint(); cv.once(); }).node
  );
  paint();
});

// ============================================================================
// 6. Inter frame prediction: measured, on real pixels
// ============================================================================

register('motion-vectors', (host) => {
  let mode = 'lock', showVec = true, acc = 0, result = null;
  const { controls, stage, setNote } = figure(host, {
    title: 'Why confetti breaks your bitrate',
    sub: 'Two consecutive frames, block matched for real. The arrows are the motion vectors the encoder found; the bar is how much difference it still has to send.',
    note: '&nbsp;',
  });

  const SW = 128, SH = 80, BS = 8;
  const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
  const cA = mk(), cB = mk();

  // One scene, drawn at an arbitrary time, so two frames one frame apart can be
  // compared exactly the way an encoder compares them.
  function scene(ctx, time) {
    const pan = mode === 'pan' ? time * 26 : 0;
    ctx.fillStyle = '#101828'; ctx.fillRect(0, 0, SW, SH);
    if (mode === 'cut' && time > 1.6) {
      ctx.fillStyle = '#2a1030'; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = '#d24a7a'; ctx.fillRect(10, 20, 108, 40);
      ctx.fillStyle = '#ffd9a0'; ctx.fillRect(30, 30, 20, 20);
      return;
    }
    ctx.fillStyle = '#1b3a5c';
    for (let i = -2; i < 8; i++) ctx.fillRect(((i * 22 - pan) % 176 + 176) % 176 - 22, 8, 14, 54);
    ctx.fillStyle = '#e0b070';
    ctx.fillRect(((46 - pan) % 176 + 176) % 176 - 22, 30, 18, 34);
    ctx.beginPath(); ctx.arc(((55 - pan) % 176 + 176) % 176 - 22, 26, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#243447'; ctx.fillRect(0, 64, SW, 16);
    if (mode === 'confetti') {
      for (let i = 0; i < 220; i++) {
        const s = Math.sin(i * 12.9898) * 43758.5453;
        const rx = s - Math.floor(s);
        const s2 = Math.sin(i * 78.233) * 12345.6789;
        const ry = s2 - Math.floor(s2);
        const x = (rx * SW + time * (18 + ry * 40)) % SW;
        const y = (ry * SH + time * (52 + rx * 70)) % SH;
        ctx.fillStyle = ['#ff6b6b', '#ffd166', '#6bd6ff', '#c77dff'][i & 3];
        ctx.fillRect(x, y, 2.4, 2.4);
      }
    }
  }

  function measure(time) {
    const a = cA.getContext('2d'), b = cB.getContext('2d');
    scene(a, time - 1 / 25);
    scene(b, time);
    const pa = a.getImageData(0, 0, SW, SH).data, pb = b.getImageData(0, 0, SW, SH).data;
    const lum = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const bx = SW / BS, by = SH / BS;
    const vecs = [], R = 6;
    let total = 0, intra = 0;
    // Sum of absolute differences for one candidate offset, on every other
    // pixel of the block. Returns Infinity if the candidate falls off frame.
    const sadAt = (i, j, dx, dy) => {
      let sad = 0;
      for (let y = 0; y < BS; y += 2) {
        const sy = j * BS + y, ry = sy + dy;
        if (ry < 0 || ry >= SH) return Infinity;
        for (let x = 0; x < BS; x += 2) {
          const sx = i * BS + x, rx = sx + dx;
          if (rx < 0 || rx >= SW) return Infinity;
          sad += Math.abs(lum(pb, (sy * SW + sx) * 4) - lum(pa, (ry * SW + rx) * 4));
        }
      }
      return sad;
    };
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
      // Start from "nothing moved" and only leave it for a candidate that is
      // genuinely better. A real encoder does the same, because a vector costs
      // bits of its own: this is why a flat wall does not sprout arrows.
      let best = sadAt(i, j, 0, 0), bdx = 0, bdy = 0;
      let bestCost = best;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (!dx && !dy) continue;
        const sad = sadAt(i, j, dx, dy);
        const cost = sad + 14 * (Math.abs(dx) + Math.abs(dy));   // the vector is not free
        if (cost < bestCost) { bestCost = cost; best = sad; bdx = dx; bdy = dy; }
      }
      // Cost of coding this block on its own, for the comparison bar.
      let e = 0, m = 0;
      for (let y = 0; y < BS; y += 2) for (let x = 0; x < BS; x += 2) m += lum(pb, ((j * BS + y) * SW + i * BS + x) * 4);
      m /= 16;
      for (let y = 0; y < BS; y += 2) for (let x = 0; x < BS; x += 2) e += Math.abs(lum(pb, ((j * BS + y) * SW + i * BS + x) * 4) - m);
      total += best; intra += e;
      vecs.push([i, j, bdx, bdy, best]);
    }
    result = { vecs, total, intra, bx, by };
  }

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      acc += dt;
      if (!result || acc > 0.14) { acc = 0; measure(t); }

      const narrow = w < 560;
      const scale = Math.min(3.4, (Math.min(w, 700) - 44) / 2 / SW);
      const pw = SW * scale, ph = SH * scale;
      const ox = (w - (pw * 2 + 16)) / 2, oy = 24;

      g.imageSmoothingEnabled = false;
      g.drawImage(cA, ox, oy, pw, ph);
      g.drawImage(cB, ox + pw + 16, oy, pw, ph);
      box(g, ox, oy, pw, ph, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      box(g, ox + pw + 16, oy, pw, ph, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      label(g, narrow ? 'previous' : 'previous frame', ox, 14, { color: p.muted, size: 11.5, weight: 600 });
      label(g, narrow ? 'this frame + vectors' : 'this frame, with the vectors found',
        ox + pw + 16, 14, { color: p.amber, size: 11.5, weight: 600 });

      if (showVec && result) {
        const bx0 = ox + pw + 16;
        for (const [i, j, dx, dy, sad] of result.vecs) {
          const cx = bx0 + (i * BS + BS / 2) * scale, cy = oy + (j * BS + BS / 2) * scale;
          const bad = sad > 900;
          if (dx === 0 && dy === 0 && !bad) {
            g.fillStyle = alpha(p.green, 0.75);
            g.beginPath(); g.arc(cx, cy, 1.6, 0, 7); g.fill();
          } else {
            const col = bad ? p.red : p.amber;
            line(g, cx, cy, cx + dx * scale * 1.4, cy + dy * scale * 1.4, { color: col, lw: 1.6 });
            g.fillStyle = col;
            g.beginPath(); g.arc(cx + dx * scale * 1.4, cy + dy * scale * 1.4, 2, 0, 7); g.fill();
          }
        }
      }

      if (result) {
        const bw = Math.min(420, pw * 2 - 52);
        const by0 = oy + ph + 34;
        const ratio = clamp(result.total / Math.max(1, result.intra), 0, 1.4);
        label(g, narrow ? 'difference still to send' : 'difference still to send, against coding this frame on its own',
          ox, by0 - 12, { color: p.muted, size: 11.5 });
        box(g, ox, by0, bw, 22, { fill: alpha(p.line, 0.35), stroke: 'transparent', r: 5 });
        const col = ratio > 0.6 ? p.red : ratio > 0.25 ? p.amber : p.green;
        box(g, ox, by0, Math.max(4, bw * clamp(ratio, 0, 1)), 22, { fill: alpha(col, 0.55), stroke: col, r: 5, lw: 1 });
        label(g, `${(ratio * 100).toFixed(0)} %`, ox + bw + 12, by0 + 11,
          { color: col, size: 13, weight: 700, ...mono });
        const zero = result.vecs.filter((v) => !v[2] && !v[3]).length;
        label(g, `${zero} of ${result.vecs.length} blocks unchanged`, ox, by0 + 42,
          { color: p.muted, size: 11.5, ...mono });
        fit(by0 + 58);
      }
    },
  });

  const upd = () => {
    result = null;
    if (mode === 'lock') setNote('<b>A locked-off shot.</b> Nearly every block finds itself unchanged, the vectors are all zero, and there is almost nothing left to send. A whole second of this costs less than a single still picture.');
    else if (mode === 'pan') setNote('<b>A camera move.</b> Everything moved, but it all moved the same way, so the vectors agree and the encoder only has to send a direction plus a small correction. Motion is not the problem. <b>Unpredictable</b> motion is.');
    else if (mode === 'confetti') setNote('<b>Confetti.</b> Every block is looking for a match that does not exist, so the vectors scatter and the difference stays large. The encoder now has two options and you will not like either: spend far more bits, or round harder and turn the picture to mud. This is the answer to the question the content designer is about to ask you.');
    else setNote('<b>A hard cut.</b> For one frame, nothing in the previous picture helps. The encoder has to send a complete I frame, which is why a cut costs a spike of bitrate and why a stream that fails often fails exactly at a cut.');
  };

  controls.append(
    choice('On screen', [['lock', 'Locked-off shot'], ['pan', 'Camera pan'], ['confetti', 'Confetti'], ['cut', 'Hard cut']], {
      value: 'lock', on: (v) => { mode = v; upd(); },
    }).node,
    toggle('Show motion vectors', { value: true, on: (v) => { showVec = v; } }).node
  );
  upd();
});

// ============================================================================
// 7. LTC: how a timecode number becomes a sound
// ============================================================================

register('ltc-encode', (host) => {
  let fps = 25, running = true, tc = 0, showSync = true;
  const { controls, stage, setNote } = figure(host, {
    title: 'How timecode becomes something a cable can carry',
    sub: 'LTC is an audio signal. Eighty bits per frame, encoded so it survives being recorded, played back at the wrong level, or run backwards.',
    note: '&nbsp;',
  });

  const bcd = (v, n) => Array.from({ length: n }, (_, i) => (v >> i) & 1);

  function bits(h, m, s, f) {
    const b = new Array(80).fill(0);
    const put = (start, arr) => arr.forEach((v, i) => { b[start + i] = v; });
    put(0, bcd(f % 10, 4)); put(8, bcd((f / 10) | 0, 2));
    put(16, bcd(s % 10, 4)); put(24, bcd((s / 10) | 0, 3));
    put(32, bcd(m % 10, 4)); put(40, bcd((m / 10) | 0, 3));
    put(48, bcd(h % 10, 4)); put(56, bcd((h / 10) | 0, 2));
    // Sync word: 0011111111111101, the same in every frame.
    const sync = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1];
    put(64, sync);
    return b;
  }

  const FIELD = (i) => {
    if (i >= 64) return ['sync', 4];
    if (i < 4 || (i >= 8 && i < 10)) return ['frames', 0];
    if ((i >= 16 && i < 20) || (i >= 24 && i < 27)) return ['seconds', 1];
    if ((i >= 32 && i < 36) || (i >= 40 && i < 43)) return ['minutes', 2];
    if ((i >= 48 && i < 52) || (i >= 56 && i < 58)) return ['hours', 3];
    return ['user bits and flags', 5];
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      if (running) tc += dt;
      const totalF = Math.floor(tc * fps);
      const f = totalF % fps, s = ((totalF / fps) | 0) % 60,
        m = (((totalF / fps) | 0) / 60 | 0) % 60, hh = ((((totalF / fps) | 0) / 3600) | 0) % 24;
      const b = bits(hh, m, s, f);
      const cols = [p.amber, p.cyan, p.green, p.red, p.ink, p.muted];

      const W = Math.min(600, w - 24), ox = (w - W) / 2;

      // The number a human reads.
      const str = [hh, m, s, f].map((v) => String(v).padStart(2, '0')).join(':');
      label(g, str, ox, 24, { color: p.ink, size: 30, weight: 700, ...mono });
      label(g, `${fps} fps  ·  80 bits every frame  ·  ${(fps * 80).toLocaleString('en-US')} bits per second`, ox + 210, 26,
        { color: p.muted, size: 11.5, ...mono });

      // All 80 bits, coloured by which field they belong to.
      const cw = W / 80, by0 = 58;
      label(g, 'the 80 bit frame', ox, by0 - 10, { color: p.muted, size: 11, ...mono });
      for (let i = 0; i < 80; i++) {
        const [, ci] = FIELD(i);
        const isSync = i >= 64;
        const col = cols[ci];
        g.fillStyle = b[i] ? alpha(col, isSync && showSync ? 0.95 : 0.75) : alpha(col, 0.2);
        g.fillRect(ox + i * cw, by0, cw - 0.5, 22);
      }
      if (showSync) box(g, ox + 64 * cw - 1, by0 - 3, 16 * cw, 28, { fill: 'transparent', stroke: p.ink, r: 3, lw: 1.5 });

      // Key.
      const keys = [['frames', 0], ['seconds', 1], ['minutes', 2], ['hours', 3], ['sync word', 4], ['user bits', 5]];
      keys.forEach((k, i) => {
        const kx = ox + i * Math.min(96, W / 6);
        g.fillStyle = cols[k[1]]; g.fillRect(kx, by0 + 32, 10, 10);
        label(g, k[0], kx + 15, by0 + 37, { color: p.muted, size: 10.5 });
      });

      // The waveform for a window of bits: biphase mark.
      const start = (Math.floor(tc * 10) % 80);
      const N = 16;
      const wy = by0 + 92, amp = 26;
      label(g, `biphase mark, bits ${start} to ${start + N - 1}`, ox, wy - 40, { color: p.muted, size: 11, ...mono });
      const bcw = W / N;
      let level = 1;
      g.beginPath();
      g.moveTo(ox, wy - level * amp);
      for (let i = 0; i < N; i++) {
        const bit = b[(start + i) % 80];
        const x0 = ox + i * bcw;
        level = -level;                                   // transition at every boundary
        g.lineTo(x0, wy - -level * amp);
        g.lineTo(x0, wy - level * amp);
        if (bit) {                                        // a 1 adds one in the middle
          g.lineTo(x0 + bcw / 2, wy - level * amp);
          level = -level;
          g.lineTo(x0 + bcw / 2, wy - level * amp);
        }
        g.lineTo(x0 + bcw, wy - level * amp);
      }
      g.strokeStyle = p.green; g.lineWidth = 2; g.stroke();

      for (let i = 0; i < N; i++) {
        const bi = (start + i) % 80;
        const x0 = ox + i * bcw;
        line(g, x0, wy - amp - 8, x0, wy + amp + 8, { color: alpha(p.line, 0.7), lw: 1, dash: [2, 3] });
        label(g, String(b[bi]), x0 + bcw / 2, wy + amp + 20,
          { color: bi >= 64 ? p.ink : cols[FIELD(bi)[1]], size: 11.5, align: 'center', weight: 650, ...mono });
      }
      label(g, 'one transition per bit cell = 0    ·    two = 1', ox, wy + amp + 44,
        { color: p.muted, size: 11.5, ...mono });
      fit(wy + amp + 60);
    },
  });

  const upd = () => {
    setNote(`At ${fps} fps this is ${fps * 80} bits a second, which lands in the audio band, and that is the point: <b>LTC is a sound</b>, so any recorder, any cable and any desk channel that carries audio will carry it. Because the information is in the <i>transitions</i> and not in the level, it survives a bad gain setting. Because the sync word never changes and is asymmetric, a reader knows which way round the frame is, and therefore whether the machine is running backwards.`);
  };

  controls.append(
    choice('Frame rate', [['24', '24'], ['25', '25'], ['30', '30']], { value: '25', on: (v) => { fps = +v; upd(); } }).node,
    toggle('Highlight the sync word', { value: true, on: (v) => { showSync = v; } }).node,
    button('Reset clock', () => { tc = 0; }).node,
    toggle('Run', { value: true, on: (v) => { running = v; } }).node
  );
  upd();
});

// ============================================================================
// 8. Quantisation noise: what bit depth is actually buying
// ============================================================================

register('quantise-noise', (host) => {
  const st = { bits: 4, dither: false, gain: 1 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Where the noise floor comes from',
    sub: 'The staircase is what gets stored. The gap between the staircase and the wave is the error, and that error is a sound.',
    note: '&nbsp;',
  });

  // A deterministic pseudo random source, so the picture is stable frame to
  // frame and the dither is visible as a property rather than as flicker.
  const rnd = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (x - Math.floor(x)) - 0.5; };
  const wave = (u) => 0.8 * Math.sin(u * Math.PI * 2 * 1.5) + 0.14 * Math.sin(u * Math.PI * 2 * 6.5);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const N = 150;
      const levels = 2 ** st.bits;
      const step = 2 / (levels - 1);

      const H = 118, oy = 20, mid = oy + H / 2;
      line(g, ox, mid, ox + W, mid, { color: alpha(p.line, 0.8), lw: 1 });

      // Every available level, drawn, because the whole point is that there
      // are only this many places a sample is allowed to land.
      if (levels <= 64) {
        for (let k = 0; k < levels; k++) {
          const v = -1 + k * step;
          line(g, ox, mid - (v * H) / 2, ox + W, mid - (v * H) / 2, { color: alpha(p.line, 0.5), lw: 0.6 });
        }
      }

      g.beginPath();
      for (let i = 0; i <= W; i++) g.lineTo(ox + i, mid - (wave(i / W) * H) / 2);
      g.strokeStyle = alpha(p.cyan, 0.75); g.lineWidth = 1.6; g.stroke();

      const errs = [];
      g.beginPath();
      for (let i = 0; i < N; i++) {
        const u = i / N;
        const v = wave(u);
        const d = st.dither ? rnd(i) * step : 0;
        const q = clamp(Math.round((v + d + 1) / step) * step - 1, -1, 1);
        errs.push(q - v);
        const x0 = ox + u * W, x1 = ox + ((i + 1) / N) * W, y = mid - (q * H) / 2;
        if (!i) g.moveTo(x0, y); else g.lineTo(x0, y);
        g.lineTo(x1, y);
      }
      g.strokeStyle = p.amber; g.lineWidth = 1.6; g.stroke();

      // The error, on its own, amplified so it can be seen.
      const ey = oy + H + 54, eh = 56;
      box(g, ox, ey - eh / 2, W, eh, { fill: alpha(p.raised, 0.5), stroke: p.line, r: 4, lw: 1 });
      line(g, ox, ey, ox + W, ey, { color: alpha(p.line, 0.8), lw: 1 });
      g.beginPath();
      errs.forEach((e, i) => {
        const x = ox + (i / N) * W;
        const y = ey - clamp((e / step) * 2, -1, 1) * (eh / 2 - 3);
        if (!i) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.strokeStyle = p.red; g.lineWidth = 1.4; g.stroke();
      label(g, 'the error, on its own. This is the noise floor, and you can hear it.',
        ox, ey - eh / 2 - 10, { color: p.red, size: 11.5, weight: 600 });

      // The numbers.
      const rms = Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / errs.length);
      const snr = 20 * Math.log10(1 / (rms || 1e-9));
      let y = ey + eh / 2 + 26;
      const row = (a, b, c) => { label(g, a, ox, y, { color: p.muted, size: 11, ...mono });
        label(g, b, ox + 210, y, { color: c, size: 12.5, weight: 650, ...mono }); y += 22; };
      row('levels available', `${levels.toLocaleString('en-US')}  (${st.bits} bit)`, p.ink2);
      row('theoretical dynamic range', `${(st.bits * 6.02).toFixed(1)} dB   (6.02 dB per bit)`, p.cyan);
      row('measured here', `${snr.toFixed(1)} dB below full scale`, p.amber);
      fit(y + 12);
    },
  });

  const upd = () => {
    if (st.bits <= 4) setNote(`<b>${2 ** st.bits} levels for the whole waveform.</b> Look at the error trace: it follows the shape of the signal, so it is not hiss, it is <b>distortion</b>. That is the ugly kind of error, because it is correlated with the music and your ear finds it immediately.`);
    else if (st.dither) setNote('<b>Dither on.</b> A tiny amount of noise added <i>before</i> rounding breaks the correlation between the error and the signal. The measured error is very slightly larger, and it sounds much better, because it has turned patterned distortion into plain hiss. This is why a mastering engineer dithers on the way down to 16 bit rather than just truncating.');
    else setNote(`At ${st.bits} bit the error is small and mostly uncorrelated, so it behaves like hiss sitting about ${(st.bits * 6.02).toFixed(0)} dB below full scale. That figure is where <b>6.02 dB per bit</b> comes from: each extra bit halves the step and buys another 6 dB of range. 24 bit is not for hearing 144 dB, it is headroom so that a quiet take recorded conservatively still has room above the floor.`);
  };

  controls.append(
    slider('Bit depth', { min: 2, max: 10, step: 1, value: 4, fmt: (v) => `${v} bit`, on: (v) => { st.bits = v; upd(); } }).node,
    toggle('Dither before rounding', { on: (v) => { st.dither = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 9. Why a DAW plays sixty tracks at once and never drifts
// ============================================================================

register('daw-mixdown', (host) => {
  const st = { tracks: 8, buf: 256, cost: 0.10 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How sixty tracks come out as one, on time',
    sub: 'They are not sixty streams. They are one buffer, filled from sixty lists, before the card asks for it.',
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
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const period = st.buf / 48000;                       // seconds per buffer
      const shown = Math.min(12, st.tracks);
      const lane = 15, laneW = W * 0.52, oy = 40;

      // One playhead, which is a sample index, not a clock per track.
      const cycle = 6;
      const ph = (t % cycle) / cycle;
      const px = ox + ph * laneW;
      const sampleIdx = Math.floor(ph * 48000 * 4);

      label(g, `playhead at sample ${sampleIdx.toLocaleString('en-US')}`, ox, 14,
        { color: p.ink, size: 12, weight: 650, ...mono });
      label(g, `= ${(sampleIdx / 48000).toFixed(3)} s, on every track, always`, ox + 250, 14,
        { color: p.muted, size: 11 });

      for (let i = 0; i < shown; i++) {
        const y = oy + i * lane;
        line(g, ox, y, ox + laneW, y, { color: alpha(p.line, 0.55), lw: 1 });
        // A different waveform per track, so it is clear they are different data.
        g.beginPath();
        for (let k = 0; k <= laneW; k += 2) {
          const u = k / laneW;
          const a = Math.sin(u * 60 + i * 1.7) * Math.sin(u * 7 + i) * 5.2;
          g.lineTo(ox + k, y + a);
        }
        g.strokeStyle = alpha(p.cyan, 0.6); g.lineWidth = 1; g.stroke();
        label(g, String(i + 1).padStart(2, ' '), ox - 18, y, { color: p.muted, size: 9.5, ...mono });
      }
      if (st.tracks > shown) {
        label(g, `+ ${st.tracks - shown} more`, ox - 18, oy + shown * lane + 4, { color: p.muted, size: 9.5, ...mono });
      }

      // The block being read: the SAME sample range on every track at once.
      const bw = Math.max(4, (st.buf / 48000 / 4) * laneW);
      box(g, px, oy - 10, bw, shown * lane + 6, { fill: alpha(p.amber, 0.2), stroke: p.amber, r: 2, lw: 1.2 });
      line(g, px, oy - 16, px, oy + shown * lane + 2, { color: p.amber, lw: 1.5 });

      // Sum into one buffer, which is what actually leaves the machine.
      const sx = ox + laneW + 34, sy = oy + (shown * lane) / 2 - 22;
      line(g, px + bw, oy + (shown * lane) / 2, sx - 8, sy + 22, { color: alpha(p.amber, 0.7), lw: 2 });
      box(g, sx, sy, W - laneW - 34, 44, { fill: alpha(p.green, 0.14), stroke: p.green, r: 6, lw: 1.5 });
      g.save(); g.beginPath(); g.rect(sx + 4, sy + 4, W - laneW - 42, 36); g.clip();
      g.beginPath();
      for (let k = 0; k <= W - laneW - 42; k += 2) {
        const u = k / (W - laneW - 42);
        let a = 0;
        for (let i = 0; i < Math.min(st.tracks, 24); i++) a += Math.sin(u * 60 + i * 1.7) * Math.sin(u * 7 + i);
        g.lineTo(sx + 4 + k, sy + 22 + (a / Math.sqrt(Math.min(st.tracks, 24))) * 7);
      }
      g.strokeStyle = p.green; g.lineWidth = 1.4; g.stroke(); g.restore();
      label(g, 'one mix buffer', sx, sy - 9, { color: p.green, size: 11, weight: 650 });
      label(g, `${st.buf} samples`, sx, sy + 58, { color: p.muted, size: 10.5, ...mono });

      // The deadline. Work per buffer against the time available.
      const budget = period * 1000;
      const work = st.tracks * st.cost;
      const late = work > budget;
      const dy = oy + shown * lane + 40;
      label(g, 'work to do in one buffer period', ox, dy - 8, { color: p.ink2, size: 11.5, weight: 600 });
      const dw = W - 90;
      box(g, ox, dy, dw, 20, { fill: alpha(p.line, 0.35), stroke: 'transparent', r: 4 });
      box(g, ox, dy, Math.min(dw, dw * (work / budget)), 20,
        { fill: alpha(late ? p.red : p.green, 0.55), stroke: late ? p.red : p.green, r: 4, lw: 1 });
      line(g, ox + dw, dy - 5, ox + dw, dy + 25, { color: p.ink, lw: 2 });
      label(g, 'deadline', ox + dw + 6, dy + 10, { color: p.ink, size: 10, ...mono });
      label(g, `${st.tracks} tracks × ${st.cost.toFixed(2)} ms = ${work.toFixed(2)} ms, and there are ${budget.toFixed(2)} ms`,
        ox, dy + 38, { color: late ? p.red : p.muted, size: 11.5, ...mono });
      if (late) label(g, 'CLICK', ox + dw - 54, dy + 10, { color: p.red, size: 13, weight: 800, ...mono });
      fit(dy + 56);
    },
  });

  const upd = () => {
    const budget = (st.buf / 48000) * 1000;
    const work = st.tracks * st.cost;
    if (work > budget) setNote(`<b>${work.toFixed(1)} ms of work and ${budget.toFixed(2)} ms to do it in.</b> The card asks for the next block and it is not ready, so it plays whatever is in the buffer, and that discontinuity is the click. Note what did <i>not</i> happen: nothing went out of sync. It failed as a <b>dropout</b>, not as drift, and that is the whole point of the design.`);
    else setNote(`<b>Sync is not maintained here, it is structural.</b> Every track is a list of samples, and the playhead is one number: sample 480,000 is ten seconds in, on every track, forever. There is no per-track clock to drift, because there is no per-track clock. The mixer reads the same sample range from all ${st.tracks} tracks, sums them into <b>one</b> buffer, and hands that to the card. Sixty tracks and one track are the same job to the driver.`);
  };

  controls.append(
    slider('Tracks', { min: 1, max: 64, step: 1, value: 8, fmt: (v) => v, on: (v) => { st.tracks = v; upd(); } }).node,
    choice('Buffer', [['64', '64'], ['128', '128'], ['256', '256'], ['512', '512'], ['1024', '1024']], { value: '256', on: (v) => { st.buf = +v; upd(); } }).node,
    slider('Work per track', { min: 0.01, max: 1.2, step: 0.01, value: 0.10, fmt: (v) => `${v.toFixed(2)} ms`, on: (v) => { st.cost = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 10. Plugin delay compensation, and the one case it cannot fix
// ============================================================================

register('pdc-align', (host) => {
  const st = { pdc: true, live: false };
  const TR = [
    ['Drums', 0, 'dry'],
    ['Bass', 1024, 'linear phase EQ'],
    ['Mix bus', 2048, 'lookahead limiter'],
    ['Vocal, being recorded', 0, 'live input'],
  ];
  const { controls, stage, setNote } = figure(host, {
    title: 'Why the tracks still line up when the plugins do not',
    sub: 'Some processing has to look ahead, which means it runs late. The DAW hides that by making everything else late to match.',
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
      const maxD = Math.max(...TR.map((t) => t[1]));
      const scale = (W - 190) / 4096;
      const oy = 34;

      label(g, 'a transient at the same moment on every track', ox, 16, { color: p.ink2, size: 11.5, weight: 600 });

      TR.forEach(([name, delay, why], i) => {
        const y = oy + i * 46;
        const isLive = i === 3;
        const shift = st.pdc ? (isLive && st.live ? 0 : maxD - delay) : 0;
        const out = delay + shift;
        label(g, name, ox, y + 8, { color: p.ink2, size: 11.5 });
        label(g, why, ox, y + 24, { color: p.muted, size: 10 });
        const lx = ox + 150, lw = W - 190;
        line(g, lx, y + 14, lx + lw, y + 14, { color: alpha(p.line, 0.6), lw: 1 });
        // The transient, where it actually comes out.
        const tx = lx + out * scale;
        const col = isLive && st.live && st.pdc ? p.red : (out === maxD || (st.pdc && !(isLive && st.live)) ? p.green : p.amber);
        line(g, tx, y + 4, tx, y + 24, { color: col, lw: 2.5 });
        g.fillStyle = col; g.beginPath(); g.arc(tx, y + 14, 3.5, 0, 7); g.fill();
        if (delay) label(g, `plugin: ${delay} samples`, lx + lw + 8, y + 8, { color: p.muted, size: 9.5, ...mono });
        if (shift) label(g, `+ ${shift} delayed to match`, lx + lw + 8, y + 22, { color: p.cyan, size: 9.5, ...mono });
      });

      // The alignment line, and what the compensation cost.
      const ax = ox + 150 + (st.pdc ? maxD : 0) * scale;
      line(g, ax, oy - 6, ax, oy + 4 * 46 - 12, { color: alpha(p.ink, 0.55), lw: 1, dash: [4, 3] });
      const ms = (maxD / 48000) * 1000;
      const fy = oy + 4 * 46 + 4;
      label(g, st.pdc
        ? `everything delayed to ${maxD} samples = ${ms.toFixed(1)} ms of monitoring latency`
        : 'no compensation: the transients arrive at three different moments',
        ox, fy, { color: st.pdc ? p.cyan : p.red, size: 12, weight: 650 });
      fit(fy + 26);
    },
  });

  const upd = () => {
    cv.once();
    if (!st.pdc) setNote('<b>Compensation off.</b> A lookahead limiter cannot limit a peak it has not seen yet, so it holds the audio back 2,048 samples in order to see it coming. That track now comes out late. The others do not. The mix does not sound wrong so much as <b>smeared</b>: the kick and the bass no longer land together, and no amount of nudging fixes it because the delay is inside a plugin.');
    else if (st.live) setNote('<b>The case compensation cannot fix.</b> A track being recorded is arriving from the outside world right now, and you cannot delay a live signal into the past to match the others. So the DAW leaves it uncompensated and the performer hears themselves 42.7 ms early relative to the mix, or the mix late relative to themselves. That is the real reason overdubbing onto a heavily processed session feels wrong, and the fix is to <b>monitor around it</b>, not to argue with the maths.');
    else setNote('<b>Compensation on.</b> The DAW adds up the delay of every path, finds the longest, and delays everything else to match it. All the transients now line up, exactly, and the price is on the label: the whole mix is 42.7 ms late. That is why a session gets less responsive as it gets heavier, and it is not the CPU, it is the arithmetic doing its job.');
  };

  controls.append(
    toggle('Delay compensation', { value: true, on: (v) => { st.pdc = v; upd(); } }).node,
    toggle('Recording a live input', { on: (v) => { st.live = v; upd(); } }).node
  );
  upd();
});
