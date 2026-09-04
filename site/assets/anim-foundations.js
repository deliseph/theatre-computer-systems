// Foundations animations, plus the mechanisms the earlier modules referenced
// in prose but never showed: TCP against UDP, how a switch learns, drop frame,
// EDID negotiation and genlock tearing.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, h, el,
} from './anim-core.js';

// ============================================================================
// The scale of the numbers
// ============================================================================

register('units-scale', (host) => {
  const { controls, stage, setNote } = figure(host, {
    title: 'Bits, bytes, and the size of things',
    sub: 'Everything on a show network, drawn to the same scale. Notice how far apart the ends are.',
    note: '&nbsp;',
  });

  const ITEMS = [
    { n: 'One DMX universe', v: 0.25e6, c: 'amber' },
    { n: 'Word clock', v: 0.05e6, c: 'green' },
    { n: 'One audio channel', v: 1.152e6, c: 'green' },
    { n: '64 channels of Dante', v: 73.7e6, c: 'green' },
    { n: 'One NDI HD stream', v: 160e6, c: 'cyan' },
    { n: '1 Gbit link capacity', v: 1000e6, c: 'muted' },
    { n: 'Uncompressed HD', v: 2490e6, c: 'cyan' },
    { n: 'Uncompressed UHD 4K', v: 9950e6, c: 'red' },
  ];
  let log = true;

  canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const x0 = 178, x1 = w - 96;
      const max = 9950e6, min = 0.05e6;
      const pos = (v) => (log
        ? (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
        : v / max);

      ITEMS.forEach((it, i) => {
        const y = 26 + i * 33;
        const col = it.c === 'muted' ? p.muted : p[it.c];
        const bw = Math.max(2, (x1 - x0) * pos(it.v));
        box(g, x0, y, bw, 20, { fill: alpha(col, 0.7), stroke: col, r: 4 });
        label(g, it.n, x0 - 10, y + 10, { color: p.ink2, size: 12, align: 'right' });
        const txt = it.v >= 1e9 ? `${(it.v / 1e9).toFixed(2)} Gbit/s` : `${(it.v / 1e6).toFixed(it.v < 1e6 ? 2 : 0)} Mbit/s`;
        label(g, txt, x0 + bw + 8, y + 10, { color: col, size: 11, weight: 600, mono: true });
      });

      label(g, log ? 'logarithmic scale, each step is ten times the last' : 'linear scale, true proportions',
        x0, hgt - 12, { color: p.muted, size: 11 });
    },
  });

  controls.append(
    choice('Scale', [['log', 'Logarithmic'], ['lin', 'Linear (true)']],
      { value: 'log', on: (v) => { log = v === 'log'; update(); } }).node
  );

  function update() {
    if (log) setNote('On a logarithmic scale everything is visible, and each step is ten times the one before. Switch to linear to see the true proportion, which is the part that rearranges your intuitions.');
    else setNote('<b>This is the real proportion.</b> Every lighting and audio bar has collapsed to nothing next to uncompressed video. One HD picture is roughly two thousand times a DMX universe. That is why control failures are almost always configuration and video failures are almost always capacity.');
  }
  update();
});

// ============================================================================
// Binary, one octet, clickable
// ============================================================================

register('binary-counter', (host) => {
  const { controls, stage, setNote } = figure(host, {
    title: 'Read an octet',
    sub: 'Click the bits. Add up the positions holding a 1. That is the whole skill.',
    note: '&nbsp;',
  });

  let bits = [1, 0, 1, 1, 0, 1, 0, 0];   // 180, deliberately not a legal mask octet
  const wrap = el('div', 'bitbox');
  const out = el('div');
  stage.append(wrap, out);

  const paint = () => {
    const val = bits.reduce((a, b, i) => a + (b ? 2 ** (7 - i) : 0), 0);
    wrap.innerHTML = bits.map((b, i) =>
      `<button class="bitb${b ? ' on' : ''}" data-i="${i}"><b>${b}</b><span>${2 ** (7 - i)}</span></button>`).join('');
    const solid = /^1*0*$/.test(bits.join(''));
    const terms = bits.map((b, i) => (b ? 2 ** (7 - i) : null)).filter(Boolean);
    out.innerHTML = `<div class="bitsum">
      <span class="bitsum-eq">${terms.join(' + ') || '0'} =</span>
      <b>${val}</b>
      <span class="bitsum-hex">hex ${val.toString(16).toUpperCase().padStart(2, '0')}</span>
      <span class="bitsum-mask ${solid ? 'ok' : 'no'}">${solid ? 'valid mask octet' : 'not a valid mask octet'}</span>
    </div>`;
    setNote(solid
      ? `A subnet mask octet is always a solid run of ones followed by zeros, so only nine values can ever appear: 0, 128, 192, 224, 240, 248, 252, 254, 255. This one is <b>${val}</b>, with ${terms.length} bit${terms.length === 1 ? '' : 's'} set.`
      : `<b>${val} can never appear in a subnet mask.</b> The ones are not contiguous. That is not a rule someone invented to be awkward: the mask has to split the address into exactly two parts, network then host, and a gap in the middle would split it into three.`);
  };

  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('.bitb');
    if (!b) return;
    bits[+b.dataset.i] ^= 1;
    paint();
  });
  controls.append(
    button('Set /26 mask octet', () => { bits = [1, 1, 0, 0, 0, 0, 0, 0]; paint(); }).node,
    button('Set 255', () => { bits = [1, 1, 1, 1, 1, 1, 1, 1]; paint(); }).node,
    button('Clear', () => { bits = [0, 0, 0, 0, 0, 0, 0, 0]; paint(); }).node
  );
  paint();
});

// ============================================================================
// TCP against UDP
// ============================================================================

register('tcp-udp', (host) => {
  const state = { loss: 25 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why show media uses the unreliable one',
    sub: 'Both paths lose the same packets. Watch what each protocol does about it, and when the packet arrives.',
    note: '&nbsp;',
  });

  let pk = [], spawn = 0, tcpDelivered = 0, udpDelivered = 0, udpLost = 0, tcpLate = 0, seq = 0;

  canvas(stage, {
    height: 270,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const x0 = 92, x1 = w - 130, cut = (x0 + x1) * 0.52;
      const yT = 76, yU = 176;

      [[yT, 'TCP', 'retries until it arrives', p.cyan], [yU, 'UDP', 'sends once, never looks back', p.amber]]
        .forEach(([y, name, sub, col]) => {
          line(g, x0, y, x1, y, { color: alpha(p.line, 1), lw: 8 });
          label(g, name, 10, y - 8, { color: col, size: 13, weight: 700 });
          label(g, sub, 10, y + 9, { color: p.muted, size: 10 });
        });

      spawn += dt;
      if (spawn > 0.5) {
        spawn = 0;
        seq++;
        const drop = Math.random() < state.loss / 100;
        pk.push({ y: yT, x: x0, n: seq, drop, tries: 0, kind: 'tcp' });
        pk.push({ y: yU, x: x0, n: seq, drop, kind: 'udp' });
      }

      for (let i = pk.length - 1; i >= 0; i--) {
        const q = pk[i];
        q.x += 165 * dt;

        if (q.drop && q.x >= cut) {
          if (q.kind === 'udp') {
            udpLost++;
            pk.splice(i, 1);
            continue;
          }
          // TCP notices the loss and sends it again, later.
          q.tries++;
          q.x = x0;
          q.drop = q.tries >= 2 ? false : Math.random() < state.loss / 100;
          continue;
        }
        if (q.x > x1) {
          if (q.kind === 'tcp') { tcpDelivered++; if (q.tries) tcpLate++; }
          else udpDelivered++;
          pk.splice(i, 1);
          continue;
        }
        const col = q.kind === 'tcp' ? p.cyan : p.amber;
        box(g, q.x, q.y - 6, 15, 12, { fill: q.tries ? p.red : col, stroke: 'transparent', r: 3 });
        if (q.tries) label(g, `retry ${q.tries}`, q.x + 7, q.y - 16, { color: p.red, size: 9, align: 'center', mono: true });
      }

      line(g, cut, 40, cut, hgt - 46, { color: alpha(p.red, 0.5), lw: 2, dash: [4, 4] });
      label(g, `${state.loss}% loss here`, cut, 30, { color: p.red, size: 10.5, align: 'center' });

      box(g, x1 + 12, yT - 26, 108, 52, { fill: p.surface, stroke: p.line, r: 7 });
      label(g, 'all arrive', x1 + 66, yT - 10, { color: p.green, size: 11, weight: 650, align: 'center' });
      label(g, `${tcpLate} arrived late`, x1 + 66, yT + 8, { color: tcpLate ? p.red : p.muted, size: 10.5, align: 'center', mono: true });

      box(g, x1 + 12, yU - 26, 108, 52, { fill: p.surface, stroke: p.line, r: 7 });
      label(g, `${udpDelivered} arrived`, x1 + 66, yU - 10, { color: p.green, size: 11, weight: 650, align: 'center' });
      label(g, `${udpLost} simply gone`, x1 + 66, yU + 8, { color: udpLost ? p.amber : p.muted, size: 10.5, align: 'center', mono: true });

      label(g, 'For real time media a retransmitted packet is worthless: its moment has already passed.',
        10, hgt - 12, { color: p.ink2, size: 11.5 });
    },
  });

  controls.append(
    slider('Packet loss', { min: 0, max: 60, step: 5, value: 25, fmt: (v) => `${v}%`, on: (v) => { state.loss = v; tcpLate = udpLost = tcpDelivered = udpDelivered = 0; } }).node,
    button('Reset', () => { pk = []; tcpLate = udpLost = tcpDelivered = udpDelivered = 0; }).node
  );

  setNote('TCP is the reliable one and it gets everything through, eventually, by sending it again. UDP is the unreliable one and simply loses what it loses. For a file that is an easy choice. For a sample of audio due at a specific instant, <b>the retransmission arrives after the moment it was needed</b>, so all TCP bought you was a stall. Reliability and timeliness are different goals, and show media chooses timeliness. That is why Dante, sACN, NDI and ST 2110 all sit on UDP.');
});

// ============================================================================
// How a switch learns
// ============================================================================

register('switch-learning', (host) => {
  const state = { hub: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why a switch is not a hub',
    sub: 'Send a frame from A to C and watch who else has to deal with it.',
    note: '&nbsp;',
  });

  const NAMES = ['A', 'B', 'C', 'D'];
  const MACS = ['00:1D:C1:0A:2B:01', '00:1D:C1:0A:2B:02', '00:1D:C1:0A:2B:03', '00:1D:C1:0A:2B:04'];
  let table = new Map();
  let from = 0, to = 2, phase = 0, timer = 0, sending = false;

  const send = () => { sending = true; phase = 0; timer = 0; table.set(MACS[from], from); };

  canvas(stage, {
    height: 280,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const n = 4, pw = Math.min(110, (w - 60) / n), ox = (w - pw * n) / 2;
      const devY = 34, swY = 138;

      if (sending) {
        timer += dt;
        if (timer > 1.1) { timer = 0; phase++; if (phase > 2) { sending = false; table.set(MACS[to], to); } }
      }

      box(g, ox, swY, pw * n, 46, { fill: p.raised, stroke: p.line, r: 8 });
      label(g, state.hub ? 'HUB' : 'SWITCH', ox + 12, swY + 23, { color: p.muted, size: 11, weight: 700 });

      const known = table.has(MACS[to]);
      const flood = state.hub || !known;

      NAMES.forEach((nm, i) => {
        const x = ox + i * pw;
        const isSrc = i === from, isDst = i === to;
        const gets = sending && phase >= 1 && (flood ? i !== from : isDst);
        box(g, x + 8, devY, pw - 16, 44, {
          fill: gets ? alpha(isDst ? p.green : p.red, 0.3) : p.surface,
          stroke: isSrc ? p.amber : gets ? (isDst ? p.green : p.red) : p.line, r: 7, lw: isSrc ? 2 : 1.5,
        });
        label(g, nm, x + pw / 2, devY + 16, { color: p.ink, size: 15, weight: 700, align: 'center' });
        label(g, isSrc ? 'sender' : gets ? (isDst ? 'for me' : 'discard') : '—',
          x + pw / 2, devY + 33, { color: gets ? (isDst ? p.green : p.red) : p.muted, size: 9.5, align: 'center' });

        if (sending && phase >= 1 && gets) {
          const y = swY - (swY - devY - 44) * clamp(timer / 1.1, 0, 1);
          box(g, x + pw / 2 - 6, y, 12, 10, { fill: isDst ? p.green : alpha(p.red, 0.7), stroke: 'transparent', r: 3 });
        }
        if (sending && phase === 0 && isSrc) {
          const y = devY + 44 + (swY - devY - 44) * clamp(timer / 1.1, 0, 1);
          box(g, x + pw / 2 - 6, y, 12, 10, { fill: p.amber, stroke: 'transparent', r: 3 });
        }
      });

      // MAC table
      const tx = ox, ty = swY + 62;
      label(g, state.hub ? 'A hub has no table. It repeats everything to everyone.' : 'MAC address table',
        tx, ty, { color: p.muted, size: 11, weight: 600 });
      if (!state.hub) {
        [...table.entries()].forEach(([mac, port], i) => {
          label(g, `${mac}  →  port ${port + 1}`, tx, ty + 20 + i * 16, { color: p.cyan, size: 11, mono: true });
        });
        if (!table.size) label(g, 'empty — the switch has not seen any traffic yet', tx, ty + 20, { color: p.muted, size: 11, mono: true });
      }

      if (sending && phase >= 1) {
        label(g, flood ? 'FLOODED to every port' : `forwarded ONLY to port ${to + 1}`,
          ox + pw * n, ty, { color: flood ? p.red : p.green, size: 11.5, weight: 650, align: 'right' });
      }
    },
  });

  controls.append(
    toggle('Use a hub instead', { on: (v) => { state.hub = v; table.clear(); update(); } }).node,
    button('Send A → C', () => { from = 0; to = 2; send(); }).node,
    button('Send C → A', () => { from = 2; to = 0; send(); }).node,
    button('Forget the table', () => { table.clear(); }).node
  );

  function update() {
    if (state.hub) setNote('A hub repeats every frame to every port, so every device has to receive it, inspect it and throw most of it away. On a show network that means your lighting node is spending effort on audio it will never use. Hubs are gone for exactly this reason.');
    else setNote('A switch <b>learns</b>: it watches the source address of every frame and records which port that device is on. The first frame to an unknown destination is flooded, and after that it is forwarded only where it needs to go. Send A to C, then C to A, and watch the table fill and the flooding stop. That selectivity is what makes a modern show network possible.');
  }
  update();
});

// ============================================================================
// Drop frame
// ============================================================================

register('dropframe', (host) => {
  const state = { df: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why 29.97 drops frame numbers',
    sub: 'One hour of real time, run fast. Watch the gap open between the timecode and the wall clock.',
    note: '&nbsp;',
  });

  let secs = 0;

  canvas(stage, {
    height: 230,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      secs += dt * 240;                       // 4 minutes of show per second
      if (secs > 3600) secs = 0;

      // At 29.97 fps, non-drop timecode counts 30 frames per second of code,
      // so it falls behind real time by a factor of 1000/1001.
      const tcSeconds = state.df ? secs : secs * (1000 / 1001);
      const fmt = (s) => {
        const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = Math.floor(s % 60);
        const ff = Math.floor((s % 1) * 29.97);
        const p2 = (v) => String(v).padStart(2, '0');
        return `${p2(hh)}:${p2(mm)}:${p2(ss)}${state.df ? ';' : ':'}${p2(ff)}`;
      };
      const drift = secs - tcSeconds;

      label(g, 'wall clock', 24, 40, { color: p.muted, size: 11, weight: 600 });
      label(g, fmt(secs).slice(0, 8), 24, 74, { color: p.ink, size: 30, weight: 700, mono: true });

      label(g, state.df ? 'timecode, drop frame' : 'timecode, non drop', 24, 122, { color: p.muted, size: 11, weight: 600 });
      label(g, fmt(tcSeconds), 24, 156, { color: state.df ? p.green : p.red, size: 30, weight: 700, mono: true });

      const bx = w - 250, bw = 220;
      box(g, bx, 52, bw, 22, { fill: p.raised, stroke: p.line, r: 5 });
      const frac = clamp(drift / 4, 0, 1);
      box(g, bx + 2, 54, (bw - 4) * frac, 18, { fill: drift > 1 ? p.red : p.amber, stroke: 'transparent', r: 4 });
      label(g, 'drift against the wall clock', bx, 42, { color: p.muted, size: 10.5 });
      label(g, `${drift.toFixed(2)} s`, bx, 92, { color: drift > 1 ? p.red : p.ink2, size: 18, weight: 700, mono: true });
      label(g, `after ${Math.floor(secs / 60)} minutes of show`, bx, 114, { color: p.muted, size: 10.5, mono: true });

      label(g, state.df
        ? 'Frame NUMBERS 0 and 1 are skipped at the start of each minute, except every tenth minute.'
        : 'Every frame is numbered, so the code slowly falls behind: about 3.6 seconds per hour.',
        24, hgt - 34, { color: p.ink2, size: 12 });
      label(g, 'Nothing is dropped from the picture. Only the numbering changes.',
        24, hgt - 14, { color: p.muted, size: 11 });
    },
  });

  controls.append(
    choice('Counting', [['df', 'Drop frame (29.97 DF)'], ['ndf', 'Non drop (29.97 NDF)']],
      { value: 'df', on: (v) => { state.df = v === 'df'; secs = 0; update(); } }).node
  );

  function update() {
    if (state.df) setNote('Drop frame skips two frame <b>numbers</b> at the top of most minutes, which keeps the timecode reading in step with the clock on the wall. Written with a semicolon before the frames. This is what a broadcast show runs on when the rate is 29.97.');
    else setNote('<b>Watch the drift.</b> Non drop numbers every frame, so after an hour the timecode reads about 3.6 seconds earlier than real time. Neither is wrong; they answer different questions. The failure is mixing them, or mixing frame rates at all, which produces a drift that appears slowly and gets worse across the show.');
  }
  update();
});

// ============================================================================
// EDID and HDCP
// ============================================================================

register('edid', (host) => {
  const state = { chain: 'direct', hdcp: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why the projector shows the wrong thing',
    sub: 'The source asks the display what it can accept. Break the conversation and watch it guess.',
    note: '&nbsp;',
  });

  let step = 0, timer = 0;

  canvas(stage, {
    height: 260,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      timer += dt;
      if (timer > 1.3) { timer = 0; step = (step + 1) % 4; }

      const long = state.chain === 'long', split = state.chain === 'split';
      const edidOk = state.chain === 'direct' || state.chain === 'manager';
      const blocked = state.hdcp && state.chain !== 'direct';

      const boxes = state.chain === 'direct'
        ? [['Media server', 0.08], ['Projector', 0.72]]
        : state.chain === 'manager'
          ? [['Media server', 0.04], ['EDID manager', 0.36], ['Switcher', 0.62], ['Projector', 0.86]]
          : [['Media server', 0.04], [split ? 'Splitter' : '40 m HDMI', 0.4], ['Projector', 0.78]];

      boxes.forEach(([name, fx], i) => {
        const x = 20 + (w - 160) * fx;
        box(g, x, 74, 128, 48, { fill: p.surface, stroke: p.line, r: 8 });
        label(g, name, x + 64, 98, { color: p.ink2, size: 11.5, weight: 600, align: 'center' });
        if (i < boxes.length - 1) line(g, x + 128, 98, 20 + (w - 160) * boxes[i + 1][1], 98, { color: p.line, lw: 3 });
      });

      // The handshake, animated
      const msgs = [
        ['source → display', 'what can you accept?', p.amber],
        ['display → source', edidOk ? 'I do 1920×1080 @60, 8 bit' : '…no reply', edidOk ? p.cyan : p.red],
        ['source decides', edidOk ? 'output 1920×1080 @60' : 'guessing: 1024×768 @60', edidOk ? p.green : p.red],
        ['HDCP check', blocked ? 'REFUSED — untrusted device in path' : 'ok', blocked ? p.red : p.green],
      ];
      const [who, what, col] = msgs[step];
      label(g, who, 20, 158, { color: p.muted, size: 11, weight: 600 });
      label(g, what, 20, 184, { color: col, size: 17, weight: 650, mono: true });

      const outcome = blocked ? 'BLACK SCREEN, no error message'
        : edidOk ? '1920 × 1080 @ 60, correct' : 'wrong resolution, letterboxed and soft';
      box(g, w - 236, 148, 216, 52, {
        fill: alpha(blocked || !edidOk ? p.red : p.green, 0.14),
        stroke: blocked || !edidOk ? p.red : p.green, r: 8,
      });
      label(g, 'On the screen', w - 128, 166, { color: p.muted, size: 10, align: 'center' });
      label(g, outcome, w - 128, 186, { color: blocked || !edidOk ? p.red : p.green, size: 11.5, weight: 650, align: 'center' });

      label(g, 'EDID is the conversation. HDCP is the bouncer. Both fail silently.',
        20, hgt - 14, { color: p.muted, size: 11.5 });
    },
  });

  controls.append(
    choice('Signal path', [
      ['direct', 'Direct'], ['long', 'Long HDMI run'], ['split', 'Through a splitter'], ['manager', 'With an EDID manager'],
    ], { value: 'direct', on: (v) => { state.chain = v; step = 0; update(); } }).node,
    toggle('Source is HDCP protected', { on: (v) => { state.hdcp = v; update(); } }).node
  );

  function update() {
    if (state.hdcp && state.chain !== 'direct') setNote('<b>HDCP.</b> Copy protection refuses to pass a protected signal through equipment it does not trust, and it tells you nothing: you get a black screen while every cable, every resolution and every setting looks correct. If the screen is black and everything looks right, suspect HDCP. It will happen the first time someone plugs a consumer streaming device into a professional switcher.');
    else if (state.chain === 'long' || state.chain === 'split') setNote('<b>The EDID conversation has failed.</b> The display told the source what it can accept, but the long run or the splitter did not carry the reply, so the source guessed and guessed low. This is why a projector shows the wrong resolution, and why plugging into a different socket appears to fix it.');
    else if (state.chain === 'manager') setNote('An EDID manager holds the conversation steady on the source side, so the source always sees a stable, correct answer no matter what is between it and the display. This is why they exist on real systems, and why a video engineer carries one.');
    else setNote('Direct connection, so the conversation works: the display declares what it accepts, the source picks a mode from that list, and the picture is correct. Now break it with one of the other paths.');
  }
  update();
});

// ============================================================================
// Genlock and tearing
// ============================================================================

register('genlock', (host) => {
  const state = { lock: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'Tearing, and what genlock prevents',
    sub: 'A moving edge on screen. Without a shared reference the switch happens mid frame.',
    note: '&nbsp;',
  });

  let phase = 0, tearY = 0.5, tearAge = 99;

  canvas(stage, {
    height: 260,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const W = Math.min(520, w - 40), H = 168, ox = (w - W) / 2, oy = 26;

      phase += dt * 0.9;
      tearAge += dt;
      // Without genlock the source and display disagree about when a frame
      // starts, so a new frame lands partway down the raster.
      if (!state.lock && tearAge > 0.55) { tearAge = 0; tearY = 0.2 + Math.random() * 0.6; }

      const barX = (ph) => ((ph % 1) * (W - 60));
      const upper = barX(phase);
      const lower = state.lock ? upper : barX(phase - 0.09);
      const split = state.lock ? 1 : tearY;

      g.save();
      g.beginPath(); g.rect(ox, oy, W, H); g.clip();
      g.fillStyle = alpha(p.cyan, 0.1); g.fillRect(ox, oy, W, H);
      g.fillStyle = p.amber;
      g.fillRect(ox + upper, oy, 60, H * split);
      g.fillRect(ox + lower, oy + H * split, 60, H * (1 - split));
      g.restore();

      box(g, ox, oy, W, H, { fill: 'transparent', stroke: p.line, r: 0 });

      if (!state.lock && tearAge < 0.4) {
        line(g, ox, oy + H * split, ox + W, oy + H * split, { color: p.red, lw: 1.5, dash: [6, 4] });
        label(g, 'tear', ox + W - 6, oy + H * split - 10, { color: p.red, size: 11, weight: 700, align: 'right' });
      }

      label(g, state.lock ? 'genlocked: every device starts its frame at the same instant'
        : 'no reference: the new frame arrives partway down the picture',
        ox, oy + H + 24, { color: state.lock ? p.green : p.red, size: 12, weight: 600 });
      label(g, 'Genlock is to video what word clock is to audio, and PTP increasingly does both.',
        ox, oy + H + 44, { color: p.muted, size: 11 });
    },
  });

  controls.append(toggle('Genlock reference connected', { on: (v) => { state.lock = v; update(); } }).node);

  function update() {
    if (state.lock) setNote('All devices agree on when a frame starts, so a switch between sources happens at the frame boundary and the picture stays whole. On a large installation that reference is distributed to everything, and increasingly PTP carries it alongside the audio clock on the same network.');
    else setNote('<b>The bar is broken in two.</b> The display started drawing before the new frame arrived, so the top of the picture is one frame and the bottom is the next. On a static image nobody notices. On movement, and on a large screen, everybody does, and nobody can say what is wrong.');
  }
  update();
});
