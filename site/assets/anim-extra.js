// Figures for the sections that were carrying their weight in prose alone:
// the Ethernet frame, the address space, Wi-Fi channels, GPU outputs, the LED
// wall chain, tracking data, and what quantum teleportation actually does.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp,
} from './anim-core.js';

const mono = { mono: true };
function fitter(get) {
  let pend = false;
  return (want) => {
    const cv = get();
    if (!cv || pend || Math.abs(cv.h - want) < 3) return;
    pend = true;
    requestAnimationFrame(() => { pend = false; cv.setHeight(Math.round(want)); });
  };
}

// ============================================================================
// 1. What is actually in an Ethernet frame
// ============================================================================

register('frame-anatomy', (host) => {
  const st = { payload: 1500, tag: false };
  const { controls, stage, setNote } = figure(host, {
    title: 'One Ethernet frame, field by field',
    sub: 'Everything on a local wire is this shape. The header is fixed; only the middle changes size.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const F = [
        ['Preamble', 8, 'muted', 'a pattern that lets the receiver lock on. Not counted in the frame.'],
        ['Destination MAC', 6, 'amber', 'who it is for. A switch reads this and nothing else to decide where to send it.'],
        ['Source MAC', 6, 'cyan', 'who sent it. This is the field a switch learns from.'],
      ];
      if (st.tag) F.push(['802.1Q tag', 4, 'green', 'the VLAN number. Added on a trunk, stripped on an access port.']);
      F.push(['EtherType', 2, 'green', 'what is inside: 0x0800 is IPv4, 0x0806 is ARP.']);
      F.push(['Payload', st.payload, 'ink2', 'the packet. 46 bytes minimum, 1,500 by default.']);
      F.push(['FCS', 4, 'red', 'a checksum. Fails and the frame is dropped silently, and the counter goes up.']);

      const total = F.reduce((a, f) => a + f[1], 0);
      const minW = 32;
      const flexTotal = W - F.length * 6;
      // Log weights, then normalised so the row actually fits the canvas.
      // Un-normalised, a 1,500 byte payload alone was wider than the figure.
      const raw = F.map(([, n]) => Math.max(minW, Math.log10(n + 1) * 60));
      const scale = flexTotal / raw.reduce((a, b) => a + b, 0);
      const widths = raw.map((r) => Math.max(minW, r * scale));
      let x = ox, y = 34;
      F.forEach(([name, n, col, why], fi) => {
        const bw = widths[fi];
        const c = p[col] || p.ink2;
        box(g, x, y, bw, 40, { fill: alpha(c, 0.18), stroke: c, r: 4, lw: 1.2 });
        label(g, String(n), x + bw / 2, y + 14, { color: c, size: 12, weight: 700, align: 'center', ...mono });
        label(g, 'bytes', x + bw / 2, y + 29, { color: p.muted, size: 9, align: 'center' });
        x += bw + 6;
      });
      // Field names underneath, staggered so they fit.
      x = ox;
      F.forEach(([name, n, col], i) => {
        const bw = widths[i];
        const ly = y + 52 + (i % 2) * 15;
        line(g, x + bw / 2, y + 42, x + bw / 2, ly - 8, { color: alpha(p.line, 0.8), lw: 1 });
        label(g, name, x + bw / 2, ly, { color: p.ink2, size: 9.5, align: 'center' });
        x += bw + 6;
      });

      let ry = y + 96;
      label(g, `frame on the wire: ${(total - 8).toLocaleString('en-US')} bytes, plus 8 of preamble`,
        ox, ry, { color: p.ink, size: 12, weight: 650, ...mono });
      ry += 22;
      label(g, `overhead: ${(total - 8 - st.payload)} bytes of header and checksum for ${st.payload.toLocaleString('en-US')} bytes of content`,
        ox, ry, { color: p.muted, size: 11.5, ...mono });
      ry += 20;
      const eff = (st.payload / (total + 12)) * 100;   // + interframe gap
      label(g, `efficiency: ${eff.toFixed(1)} % of the wire time is your data`,
        ox, ry, { color: eff < 60 ? p.red : p.green, size: 11.5, weight: 650, ...mono });
      fit(ry + 24);
    },
  });

  const upd = () => {
    cv.once();
    if (st.payload <= 64) setNote('<b>A small payload is mostly overhead.</b> Every frame carries the same 26 bytes of header and checksum whatever it contains, so a stream of tiny packets wastes most of the wire. This is exactly why an audio protocol packs several samples into one packet rather than sending each one, and why a network full of small packets can be busy at a fraction of its rated speed.');
    else if (st.tag) setNote('<b>The 802.1Q tag.</b> Four bytes inserted after the source address, carrying the VLAN number. A trunk port adds it, an access port strips it, and the device at the end never sees it. That is the whole mechanism of VLAN separation: <b>a number in a field</b>, honoured by switches that agree to honour it.');
    else setNote('<b>A switch reads the first two fields and stops.</b> Destination to decide where it goes, source to learn where the sender is. It never opens the payload, which is why it is fast, and why it cannot tell lighting data from a file copy. That distinction has to be made somewhere else, and that somewhere else is the VLAN.');
  };

  controls.append(
    slider('Payload', { min: 46, max: 1500, step: 2, value: 1500, fmt: (v) => `${v} bytes`, on: (v) => { st.payload = v; upd(); } }).node,
    toggle('802.1Q VLAN tag', { on: (v) => { st.tag = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 2. The IPv4 address space, and where the private blocks sit in it
// ============================================================================

register('address-space', (host) => {
  const st = { probe: '192.168.1.20' };
  const BLOCKS = [
    [0, 16777216, 'this network', 'muted'],
    [167772160, 16777216, '10.0.0.0/8 private', 'green'],
    [2886729728, 1048576, '172.16/12 private', 'green'],
    [3232235520, 65536, '192.168/16 private', 'green'],
    [2130706432, 16777216, '127 loopback', 'cyan'],
    [2851995648, 65536, '169.254 link local', 'red'],
    [3758096384, 268435456, '224+ multicast and reserved', 'amber'],
  ];
  const { controls, stage, setNote } = figure(host, {
    title: 'Where a show network lives in the address space',
    sub: 'The whole of IPv4, drawn to scale. The private blocks are the only parts anybody can use freely.',
    note: '&nbsp;',
  });

  const ipToInt = (ip) => ip.trim().split('.').reduce((a, o) => a * 256 + (+o), 0) >>> 0;
  const valid = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim()) && ip.trim().split('.').every((o) => +o >= 0 && +o <= 255);

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 250,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const TOTAL = 4294967296;
      const X = (n) => ox + (n / TOTAL) * W;

      const by = 40, bh = 46;
      box(g, ox, by, W, bh, { fill: alpha(p.line, 0.28), stroke: p.line, r: 4, lw: 1 });
      label(g, 'the entire IPv4 address space, 4.29 billion addresses', ox, 20, { color: p.ink2, size: 11.5, weight: 600 });
      label(g, '0.0.0.0', ox, by + bh + 14, { color: p.muted, size: 9.5, ...mono });
      label(g, '255.255.255.255', ox + W, by + bh + 14, { color: p.muted, size: 9.5, align: 'right', ...mono });

      BLOCKS.forEach(([start, size, name, col], i) => {
        const x = X(start), bw = Math.max(1.5, (size / TOTAL) * W);
        g.fillStyle = alpha(p[col] || p.muted, 0.75);
        g.fillRect(x, by, bw, bh);
      });

      // Everything else is public: say so plainly.
      label(g, 'everything not marked is public address space, issued by a provider, belonging to somebody',
        ox, by + bh + 32, { color: p.muted, size: 11 });

      // Key.
      let ky = by + bh + 54;
      BLOCKS.filter((b) => b[3] !== 'muted').forEach(([, , name, col], i) => {
        const kx = ox + (i % 2) * (W / 2);
        const yy = ky + ((i / 2) | 0) * 18;
        g.fillStyle = alpha(p[col], 0.8); g.fillRect(kx, yy - 5, 10, 10);
        label(g, name, kx + 16, yy, { color: p.ink2, size: 10.5 });
      });

      // The probe.
      const pv = valid(st.probe) ? ipToInt(st.probe) : null;
      if (pv !== null) {
        const x = X(pv);
        line(g, x, by - 10, x, by + bh + 8, { color: p.ink, lw: 2 });
        label(g, st.probe, clamp(x, ox + 30, ox + W - 30), by - 16,
          { color: p.ink, size: 11, weight: 700, align: 'center', ...mono });
      }
      fit(ky + Math.ceil(BLOCKS.filter((b) => b[3] !== 'muted').length / 2) * 18 + 14);
    },
  });

  const upd = () => {
    cv.once();
    const ip = st.probe.trim();
    if (!valid(ip)) { setNote('Not a valid address.'); return; }
    const n = ipToInt(ip);
    const inR = (s, sz) => n >= s && n < s + sz;
    if (inR(2851995648, 65536)) setNote('<b>169.254.x.x.</b> The machine asked for DHCP and nobody answered, so it gave itself an address. It is not broken and it is not configured: it is waiting. No DHCP server, no link, or the wrong VLAN.');
    else if (inR(167772160, 16777216) || inR(2886729728, 1048576) || inR(3232235520, 65536)) setNote('<b>Private space.</b> Not routed on the internet, free for anyone to use, and where every show network you build should live. Notice how small these blocks look against the whole bar: almost all of the address space belongs to somebody.');
    else if (inR(2130706432, 16777216)) setNote('<b>Loopback.</b> This address means "me". Useful for testing that software works before you blame the network.');
    else if (n >= 3758096384) setNote('<b>Multicast and reserved.</b> 224 upwards is not for hosts. sACN uses 239.255.x.x in here, one group per universe, which is why a switch with IGMP snooping can deliver a universe only to the ports that asked for it.');
    else setNote(`<b>Public space.</b> This address belongs to an organisation somewhere. Using it on an isolated rig works and nobody notices, right up until that rig is connected to a venue's internet and traffic for the real owner disappears into your network. This is the Art-Net <code>2.x.x.x</code> trap exactly.`);
  };

  const inp = document.createElement('label');
  inp.className = 'ac ac-text';
  inp.innerHTML = '<span class="ac-l">Address</span><input type="text" value="192.168.1.20" spellcheck="false">';
  inp.querySelector('input').addEventListener('input', (e) => { st.probe = e.target.value; upd(); });
  controls.append(inp,
    choice('Jump to', [['192.168.1.20', '192.168'], ['10.101.3.4', '10.x'], ['169.254.14.201', '169.254'], ['2.0.0.10', 'Art-Net 2.x'], ['239.255.0.1', 'sACN multicast']], {
      value: '192.168.1.20', on: (v) => { st.probe = v; inp.querySelector('input').value = v; upd(); },
    }).node);
  upd();
});

// ============================================================================
// 3. Wi-Fi channels: why 5 GHz, and why not 2.4
// ============================================================================

register('wifi-channels', (host) => {
  const st = { band: '24', width: 20, users: 6 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why a show uses 5 GHz, and why the audience is the problem',
    sub: '2.4 GHz has three channels that do not overlap. Everything in the building is already in them.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 260,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const is24 = st.band === '24';
      const nCh = is24 ? 13 : 25;
      const oy = 46, hgt = 74;

      label(g, is24 ? '2.4 GHz: 13 channels, 5 MHz apart, each 20 MHz wide' : '5 GHz: 25 channels, 20 MHz apart, no overlap',
        ox, 18, { color: p.ink, size: 12, weight: 650 });
      line(g, ox, oy + hgt, ox + W, oy + hgt, { color: p.line, lw: 1.5 });

      // Overlapping humps for 2.4, tidy blocks for 5.
      const chW = W / nCh;
      for (let i = 0; i < nCh; i++) {
        const cx = ox + (i + 0.5) * chW;
        const spread = is24 ? chW * 2 : chW * 0.46;
        const active = is24 ? [0, 5, 10].includes(i) : true;
        g.beginPath();
        for (let k = -spread * 2; k <= spread * 2; k += 2) {
          const a = Math.exp(-0.5 * (k / spread) ** 2);
          g.lineTo(cx + k, oy + hgt - a * hgt * 0.82);
        }
        g.strokeStyle = alpha(active ? p.cyan : p.muted, active ? 0.75 : 0.28);
        g.lineWidth = active ? 1.6 : 1;
        g.stroke();
        if (!is24 || i % 2 === 0) label(g, String(is24 ? i + 1 : 36 + i * 4), cx, oy + hgt + 13,
          { color: p.muted, size: 8.5, align: 'center', ...mono });
      }
      if (is24) {
        [0, 5, 10].forEach((i) => {
          const cx = ox + (i + 0.5) * chW;
          label(g, String(i + 1), cx, oy - 8, { color: p.cyan, size: 11, weight: 700, align: 'center', ...mono });
        });
        label(g, 'only 1, 6 and 11 do not overlap', ox, oy - 26, { color: p.cyan, size: 11 });
      }

      // What is already in the band.
      const users = is24
        ? ['audience phones', 'venue Wi-Fi', 'Bluetooth', 'wireless intercom', 'microwave oven', 'radio remotes']
        : ['venue Wi-Fi', 'your access point', 'some radar (DFS channels)'];
      let uy = oy + hgt + 34;
      label(g, 'already in this band, in a full house:', ox, uy, { color: p.ink2, size: 11.5, weight: 600 });
      uy += 18;
      users.slice(0, st.users).forEach((u, i) => {
        const kx = ox + (i % 3) * (W / 3);
        const yy = uy + ((i / 3) | 0) * 17;
        g.fillStyle = alpha(is24 ? p.red : p.green, 0.7); g.fillRect(kx, yy - 5, 9, 9);
        label(g, u, kx + 14, yy, { color: p.muted, size: 10.5 });
      });
      fit(uy + Math.ceil(Math.min(users.length, st.users) / 3) * 17 + 18);
    },
  });

  const upd = () => {
    cv.once();
    if (st.band === '24') setNote('<b>Three usable channels, and everything in the building is in them.</b> The channels are 5 MHz apart and 20 MHz wide, so they overlap: only 1, 6 and 11 are genuinely independent. Add nine hundred phones, the venue Wi-Fi, Bluetooth, intercom and a microwave in the green room, and the band is full before you arrive.');
    else setNote('<b>5 GHz has far more non-overlapping channels</b>, and most of the crowd is not in it. That is the entire argument, and it is a good one. What it does not do is change the medium: Wi-Fi is still shared, still contended, still with no delivery guarantee. A quieter room is not a promise, and a show critical path still goes down a cable.');
  };

  controls.append(
    choice('Band', [['24', '2.4 GHz'], ['5', '5 GHz']], { value: '24', on: (v) => { st.band = v; upd(); } }).node,
    slider('How full the house is', { min: 1, max: 6, step: 1, value: 6, fmt: (v) => `${v}`, on: (v) => { st.users = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 4. GPU outputs: a hard physical limit, and the two ways round it
// ============================================================================

register('gpu-heads', (host) => {
  const st = { card: 'nvidia', cards: 1, mode: 'direct' };
  const { controls, stage, setNote } = figure(host, {
    title: 'How many screens can one machine actually drive?',
    sub: 'Output count is a physical limit, not a setting. Everything else is a way of working around it.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const perCard = st.card === 'nvidia' ? 4 : 6;
      const heads = perCard * st.cards;
      const screens = st.mode === 'processor' ? heads * 8 : heads;

      // The cards.
      let x = ox, y = 34;
      for (let c = 0; c < st.cards; c++) {
        const cw = Math.min(150, (W - 20) / st.cards - 10);
        box(g, x, y, cw, 54, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 6, lw: 1.4 });
        label(g, st.card === 'nvidia' ? 'NVIDIA' : 'AMD', x + 10, y + 18, { color: p.cyan, size: 11.5, weight: 700 });
        label(g, `${perCard} outputs`, x + 10, y + 36, { color: p.muted, size: 10.5, ...mono });
        for (let i = 0; i < perCard; i++) {
          const px = x + 10 + i * ((cw - 20) / perCard);
          box(g, px, y + 44, 8, 8, { fill: p.amber, stroke: 'transparent', r: 1 });
        }
        x += cw + 10;
      }

      // Where the outputs go.
      const dy = y + 96;
      if (st.mode === 'processor') {
        const bw = Math.min(210, W * 0.4);
        box(g, ox, dy, bw, 34, { fill: alpha(p.green, 0.16), stroke: p.green, r: 6, lw: 1.4 });
        label(g, 'LED processor', ox + 12, dy + 17, { color: p.green, size: 11.5, weight: 650 });
        for (let i = 0; i < heads; i++) line(g, ox + 20 + i * 10, y + 54, ox + 20 + i * 10, dy, { color: alpha(p.amber, 0.6), lw: 1.4 });
        label(g, 'then out to receiving cards behind the panels', ox + bw + 12, dy + 17, { color: p.muted, size: 11 });
      }

      // The screens.
      const sy = st.mode === 'processor' ? dy + 56 : dy;
      const cols = Math.min(12, screens);
      const sw = Math.min(40, (W - 10) / cols - 6);
      for (let i = 0; i < Math.min(screens, 48); i++) {
        const sx = ox + (i % cols) * (sw + 6);
        const yy = sy + ((i / cols) | 0) * (sw * 0.62 + 6);
        box(g, sx, yy, sw, sw * 0.62, { fill: alpha(p.amber, 0.2), stroke: p.amber, r: 2, lw: 1 });
      }
      const rows = Math.ceil(Math.min(screens, 48) / cols);
      const fy = sy + rows * (sw * 0.62 + 6) + 14;
      label(g, st.mode === 'processor'
        ? `${heads} outputs into a processor, then out to as many panels as the processor supports`
        : `${heads} outputs, ${heads} displays. No software changes this.`,
        ox, fy, { color: p.ink, size: 12, weight: 650 });
      fit(fy + 22);
    },
  });

  const upd = () => {
    cv.once();
    const perCard = st.card === 'nvidia' ? 4 : 6;
    if (st.mode === 'processor') setNote('<b>This is what a real wall does.</b> The card drives a small number of outputs into a processor, and the processor maps rectangles of that picture onto panels. So the head count stops being the limit and the <b>canvas</b> becomes the limit instead: how many pixels the machine can render and push, not how many connectors it has.');
    else if (st.card === 'amd') setNote(`<b>Six outputs, through Eyefinity</b>, and on consumer cards too. That is the reason AMD still turns up on wall and multi-screen jobs. What you give up is CUDA, so check what your software actually accelerates before you buy the card with more connectors.`);
    else setNote(`<b>Four outputs, and no amount of software makes it five.</b> More screens means more cards, combining outputs with Mosaic on the professional line, or feeding a processor. NVIDIA's advantage is not the connector count, it is that a great deal of media software is written against CUDA and has no AMD path.`);
  };

  controls.append(
    choice('Card', [['nvidia', 'NVIDIA, 4 heads'], ['amd', 'AMD, 6 heads']], { value: 'nvidia', on: (v) => { st.card = v; upd(); } }).node,
    slider('Cards in the machine', { min: 1, max: 3, step: 1, value: 1, fmt: (v) => v, on: (v) => { st.cards = v; upd(); } }).node,
    choice('Feeding', [['direct', 'Screens directly'], ['processor', 'An LED processor']], { value: 'direct', on: (v) => { st.mode = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. The LED wall chain, and how it fails
// ============================================================================

register('led-pipeline', (host) => {
  const st = { fault: 'none' };
  const CHAIN = [
    ['Content file', 'the raster the designer made'],
    ['Media server', 'composites it onto a canvas'],
    ['Output', 'one video signal, standard raster'],
    ['Processor', 'maps rectangles onto panels'],
    ['Receiving cards', 'each drives a group of panels'],
    ['Panels', 'PWM, like the fixtures in Class 4'],
  ];
  const { controls, stage, setNote } = figure(host, {
    title: 'The LED wall chain, and where it breaks',
    sub: 'Six links. Pick a fault and see which one it actually is, because they all look like "the wall is wrong".',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const bad = { none: -1, mapping: 3, card: 4, pitch: 1, refresh: 5 }[st.fault];

      CHAIN.forEach(([name, why], i) => {
        const bw = (W - 5 * 8) / 6, x = ox + i * (bw + 8), y = 26;
        const on = i === bad;
        box(g, x, y, bw, 62, { fill: on ? alpha(p.red, 0.16) : alpha(p.raised, 0.6), stroke: on ? p.red : p.line, r: 6, lw: on ? 2 : 1 });
        label(g, name, x + bw / 2, y + 20, { color: on ? p.red : p.ink2, size: 9.8, align: 'center', weight: on ? 700 : 600 });
        label(g, why, x + bw / 2, y + 40, { color: p.muted, size: 8.2, align: 'center' });
        if (i < 5) line(g, x + bw, y + 31, x + bw + 8, y + 31, { color: alpha(p.cyan, 0.7), lw: 1.6 });
      });

      // The wall, showing the symptom.
      const wy = 110, ww = Math.min(360, W - 40), wh = ww * 0.42, wx = ox + (W - ww) / 2;
      const cols = 8, rows = 4, pw = ww / cols, phh = wh / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        let hue = ((c / cols) * 0.6 + 0.15) * 255;
        let dead = false, swap = false;
        if (st.fault === 'card' && r === 1 && c >= 2 && c < 5) dead = true;
        if (st.fault === 'mapping' && r === 2) swap = true;
        const shade = st.fault === 'pitch' ? 0.55 : 1;
        g.fillStyle = dead ? '#101318'
          : `rgb(${Math.round((swap ? 240 : hue) * shade)},${Math.round((swap ? 60 : 120) * shade)},${Math.round((swap ? 150 : 220 - hue * 0.4) * shade)})`;
        g.fillRect(wx + c * pw, wy + r * phh, pw - 1.5, phh - 1.5);
        if (st.fault === 'refresh' && (r + Math.floor(c / 2)) % 3 === 0) {
          g.fillStyle = 'rgba(0,0,0,0.42)';
          g.fillRect(wx + c * pw, wy + r * phh, pw - 1.5, phh - 1.5);
        }
      }
      box(g, wx, wy, ww, wh, { fill: 'transparent', stroke: p.line, r: 0, lw: 1 });
      label(g, 'what the audience sees', wx, wy - 9, { color: p.muted, size: 11 });
      fit(wy + wh + 26);
    },
  });

  const upd = () => {
    cv.once();
    const N = {
      none: 'Six links, and every one of them can be the wrong one. The useful habit is the same as everywhere else in this module: <b>do not start at the end</b>. Ask what the picture looks like at each stage, and you will find the link rather than guessing at it.',
      mapping: '<b>The processor mapping is wrong.</b> The picture is correct, the panels are fine, and the rectangles are being sent to the wrong places. It looks like broken content and it is a configuration file. Test with a numbered grid rather than with the show content, and the mapping tells you the truth in two seconds.',
      card: '<b>A receiving card has died.</b> Note the shape of the failure: a <b>rectangle</b>, not scattered pixels, because one card drives a group of panels. Any fault that comes out rectangular is downstream of the processor, and that narrows six links to two.',
      pitch: '<b>The canvas does not match the wall.</b> A 6 m by 3 m wall at 3.9 mm pitch is about 1,536 by 768, which is not a standard raster, so somebody has to decide how a 1920 by 1080 file sits on it. Scale it and it goes soft, crop it and you lose the edges, and that decision is creative. Made by accident, it looks like a quality problem.',
      refresh: '<b>Refresh rate against the camera.</b> The wall is fine to the eye and bands on the broadcast feed, because the exposure is catching only a few refresh cycles. Same arithmetic as the PWM fixtures in Class 4. Ask for the wall’s refresh rate before the shoot, and test with the actual camera at the actual shutter.',
    };
    setNote(N[st.fault]);
  };

  controls.append(choice('Fault', [['none', 'All well'], ['mapping', 'Wrong order on screen'], ['card', 'A block gone black'], ['pitch', 'Soft or cropped'], ['refresh', 'Bands on camera']], {
    value: 'none', on: (v) => { st.fault = v; upd(); },
  }).node);
  upd();
});

// ============================================================================
// 6. Tracking data: position at 60 Hz, and what a dropped packet looks like
// ============================================================================

register('psn-stream', (host) => {
  const st = { rate: 60, loss: 0, objects: 2 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Tracking, and what a lost position actually looks like',
    sub: 'A performer moves continuously. The rig only knows where they were at the last packet it received.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const sw = W, sh = 150, sy = 34;
      box(g, ox, sy, sw, sh, { fill: '#0e1420', stroke: p.line, r: 6, lw: 1 });
      g.save(); g.beginPath(); g.rect(ox + 1, sy + 1, sw - 2, sh - 2); g.clip();

      const held = [];
      for (let o = 0; o < st.objects; o++) {
        // True position, continuous.
        const tx = ox + sw * (0.5 + 0.38 * Math.sin(t * 0.7 + o * 2.1));
        const ty = sy + sh * (0.5 + 0.26 * Math.sin(t * 1.1 + o * 1.3));
        // What the rig knows: the last packet that arrived.
        const period = 1 / st.rate;
        let k = Math.floor(t / period);
        // Deterministic loss, so the picture is stable rather than flickering.
        let tries = 0;
        while (tries < 60 && ((Math.sin(k * 91.7 + o * 13.1) * 43758.5) % 1 + 1) % 1 < st.loss / 100) { k--; tries++; }
        const kt = k * period;
        const kx = ox + sw * (0.5 + 0.38 * Math.sin(kt * 0.7 + o * 2.1));
        const ky = sy + sh * (0.5 + 0.26 * Math.sin(kt * 1.1 + o * 1.3));
        held.push([tx, ty, kx, ky]);

        // The performer.
        g.fillStyle = 'rgba(240,225,200,0.95)';
        g.beginPath(); g.arc(tx, ty, 7, 0, 7); g.fill();
        // The light, pointed where the rig thinks they are.
        const col = o === 0 ? p.amber : p.cyan;
        const rg = g.createRadialGradient(kx, ky, 2, kx, ky, 34);
        rg.addColorStop(0, alpha(col, 0.55)); rg.addColorStop(1, alpha(col, 0));
        g.fillStyle = rg; g.beginPath(); g.arc(kx, ky, 34, 0, 7); g.fill();
        line(g, kx, ky, tx, ty, { color: alpha(p.red, Math.min(1, Math.hypot(tx - kx, ty - ky) / 30)), lw: 1.5, dash: [3, 3] });
      }
      g.restore();

      const err = held.reduce((a, [tx, ty, kx, ky]) => a + Math.hypot(tx - kx, ty - ky), 0) / held.length;
      const perObj = st.rate * 60;                            // bytes per second, order of magnitude
      let y = sy + sh + 26;
      label(g, `${st.rate} updates per second per object, ${st.objects} object${st.objects > 1 ? 's' : ''}`,
        ox, y, { color: p.ink2, size: 11.5, ...mono });
      y += 20;
      label(g, `packet loss ${st.loss} %`, ox, y, { color: st.loss > 0 ? p.red : p.muted, size: 11.5, ...mono });
      label(g, `light is ${err < 4 ? 'on' : err < 16 ? 'trailing' : 'visibly behind'} the performer`,
        ox + 180, y, { color: err < 4 ? p.green : err < 16 ? p.amber : p.red, size: 11.5, weight: 650 });
      y += 24;
      box(g, ox, y, W - 90, 14, { fill: alpha(p.line, 0.35), stroke: 'transparent', r: 3 });
      box(g, ox, y, Math.min(W - 90, (W - 90) * (err / 40)), 14,
        { fill: alpha(err < 4 ? p.green : err < 16 ? p.amber : p.red, 0.6), stroke: 'transparent', r: 3 });
      label(g, 'how far behind', ox + W - 84, y + 7, { color: p.muted, size: 10.5 });
    },
  });

  const upd = () => {
    if (st.loss > 8) setNote('<b>This is why tracking is media, not control.</b> A dropped GO is a cue that did not happen and somebody presses it again. A dropped position is a light sitting where the performer was a moment ago, continuously, and the audience reads that as <b>the light being wrong</b> rather than the network being busy. Nobody in the room will describe this as a network fault, which is exactly why you have to.');
    else if (st.rate <= 30) setNote(`<b>${st.rate} Hz.</b> Halving the rate halves the bandwidth and doubles how stale the position is between updates. On a slow move nobody sees it. On a fast cross it reads as the light lagging, and turning the rate up is the fix, at the cost of doubling the traffic from every tracked object at once.`);
    else setNote(`<b>${st.rate} Hz per object.</b> That is a steady stream with a hard deadline, which puts it in the media flow rather than the control flow whatever the manual calls it. Multiply by the number of tracked objects and it is real bandwidth: this is traffic that has to be planned for, not traffic that fits in the gaps.`);
  };

  controls.append(
    slider('Update rate', { min: 10, max: 120, step: 5, value: 60, fmt: (v) => `${v} Hz`, on: (v) => { st.rate = v; upd(); } }).node,
    slider('Packet loss', { min: 0, max: 30, step: 1, value: 0, fmt: (v) => `${v} %`, on: (v) => { st.loss = v; upd(); } }).node,
    slider('Tracked objects', { min: 1, max: 4, step: 1, value: 2, fmt: (v) => v, on: (v) => { st.objects = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 7. Quantum teleportation, and the channel that carries the bottleneck
// ============================================================================

register('teleport-protocol', (host) => {
  let step = 0, acc = 0;
  const STEPS = [
    ['Share an entangled pair', 'Two particles are prepared together and one is sent to each end. This happens in advance, and it carries no information on its own.'],
    ['Measure, at the sending end', 'The state to be sent is measured together with the local half of the pair. The original state is destroyed doing this, because quantum states cannot be copied.'],
    ['Send two ordinary bits', 'The measurement had four possible outcomes, so it takes exactly two classical bits to describe. <b>These travel down a normal channel, at the speed of light or slower.</b>'],
    ['Apply the correction', 'The receiving end uses those two bits to decide which operation to apply to its half. Only now does it hold the state that was sent.'],
  ];
  const { controls, stage, setNote } = figure(host, {
    title: 'What quantum teleportation actually does',
    sub: 'Four steps. Watch step three, because that is the one the headlines leave out.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 280,
    animated: true,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      acc += dt;
      if (acc > 3.2) { acc = 0; step = (step + 1) % STEPS.length; paint(); }
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const ax = ox + 74, bx = ox + W - 74, my = 96;

      // The two ends.
      [[ax, 'A, sending'], [bx, 'B, receiving']].forEach(([x, lbl]) => {
        box(g, x - 54, my - 40, 108, 80, { fill: alpha(p.raised, 0.7), stroke: p.line, r: 8, lw: 1 });
        label(g, lbl, x, my - 52, { color: p.ink2, size: 11, align: 'center', weight: 600 });
      });

      // The entangled pair, always there once step 0 has happened.
      if (step >= 0) {
        line(g, ax, my + 16, bx, my + 16, { color: alpha(p.green, 0.45), lw: 1.4, dash: [5, 4] });
        label(g, 'entangled pair, shared in advance', (ax + bx) / 2, my + 34,
          { color: p.green, size: 10, align: 'center' });
        [ax, bx].forEach((x) => { g.fillStyle = p.green; g.beginPath(); g.arc(x, my + 16, 5, 0, 7); g.fill(); });
      }

      // The state to send.
      if (step <= 1) {
        g.fillStyle = p.amber; g.beginPath(); g.arc(ax, my - 16, 6, 0, 7); g.fill();
        label(g, 'the state', ax, my - 32, { color: p.amber, size: 10, align: 'center' });
      }
      if (step >= 1) {
        label(g, step === 1 ? 'measured, and destroyed' : 'gone', ax, my - 16,
          { color: p.red, size: 10, align: 'center' });
      }

      // The classical channel: the whole point.
      const cy = my - 62;
      line(g, ax, cy, bx, cy, { color: step >= 2 ? p.red : alpha(p.line, 0.7), lw: step >= 2 ? 2 : 1.2 });
      label(g, 'ordinary classical channel, limited by the speed of light',
        (ax + bx) / 2, cy - 14, { color: step >= 2 ? p.red : p.muted, size: 10, align: 'center' });
      if (step === 2) {
        const u = clamp(acc / 2.4, 0, 1);
        const px = lerp(ax, bx, u);
        g.fillStyle = p.red; g.beginPath(); g.arc(px, cy, 5.5, 0, 7); g.fill();
        label(g, '2 bits', px, cy + 14, { color: p.red, size: 10, align: 'center', ...mono });
      }

      // The result.
      if (step === 3) {
        g.fillStyle = p.amber; g.beginPath(); g.arc(bx, my - 16, 6, 0, 7); g.fill();
        label(g, 'the state, here now', bx, my - 32, { color: p.amber, size: 10, align: 'center' });
      }

      // Step list.
      let y = my + 70;
      STEPS.forEach(([name], i) => {
        const on = i === step;
        g.fillStyle = on ? p.amber : alpha(p.muted, 0.4);
        g.beginPath(); g.arc(ox + 6, y, on ? 5 : 3, 0, 7); g.fill();
        label(g, `${i + 1}. ${name}`, ox + 20, y, { color: on ? p.ink : p.muted, size: 11.5, weight: on ? 700 : 500 });
        y += 21;
      });
    },
  });

  function paint() { setNote(`<b>${STEPS[step][0]}.</b> ${STEPS[step][1]}${step === 2 ? ' Until those bits arrive, the receiving end holds something indistinguishable from noise, and it cannot even tell that anything has happened. That is why teleportation cannot deliver anything sooner than light could have: <b>the classical channel is part of the protocol.</b>' : ''}`); }

  controls.append(button('Next step ›', () => { step = (step + 1) % STEPS.length; acc = 0; paint(); }).node);
  paint();
});

// ============================================================================
// 8. What a computer is: the parts, and what moves between them
// ============================================================================

register('machine-map', (host) => {
  let sel = 'cpu';
  const PARTS = {
    cpu: ['CPU', 'amber', 'Fetches an instruction, decodes it, does it, repeats. Billions of times a second, and it can only work on what is already in RAM.'],
    ram: ['RAM', 'cyan', 'Fast, and it forgets everything when the power goes. Everything the CPU is working on lives here. Too little and the machine starts using the disk as pretend RAM, which is why it suddenly crawls.'],
    disk: ['Storage', 'green', 'Slow, and it remembers. Programs and media live here until something asks for them, and then they are copied into RAM to be used.'],
    gpu: ['GPU', 'red', 'Thousands of simple cores doing the same operation to many pixels at once. Has its own memory, and getting data in and out of it is often the real cost.'],
    bios: ['Firmware / BIOS', 'muted', 'A small program in a chip on the board. It runs first, checks the hardware is there, and then hands over to whatever it finds on the disk.'],
    psu: ['Power supply', 'muted', 'Turns mains into the several low voltages everything else needs. Also the part that fails quietly and takes the blame for other things.'],
    bus: ['The bus', 'ink2', 'The roads between all of it, mostly PCI Express. Bandwidth here is why a fast drive in the wrong slot is not a fast drive.'],
  };
  const { controls, stage, setNote } = figure(host, {
    title: 'The parts, and what actually moves between them',
    sub: 'Six things and the roads between them. Every performance problem in this module is one of these roads being too narrow.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    animated: true,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const pos = {
        cpu: [0.32, 0.16], ram: [0.72, 0.16], gpu: [0.32, 0.62],
        disk: [0.72, 0.62], bios: [0.08, 0.90], psu: [0.72, 0.95],
      };
      const bw = Math.min(122, W * 0.24), bh = 42;
      const SPAN = 210;
      const P = (k) => [ox + pos[k][0] * W, 34 + pos[k][1] * SPAN];

      // The roads, with their real widths.
      const LINKS = [
        ['cpu', 'ram', 'tens of GB/s', 3.2],
        ['cpu', 'gpu', 'PCIe, ~16 GB/s', 2.2],
        ['cpu', 'disk', 'NVMe, ~3 GB/s', 1.5],
        ['gpu', 'disk', '', 0.8],
        ['bios', 'cpu', 'at boot only', 1],
        ['psu', 'ram', '', 1],
      ];
      for (const [a, b, lbl, lw] of LINKS) {
        const [ax, ay] = P(a), [bx, by] = P(b);
        const hot = sel === a || sel === b;
        line(g, ax, ay, bx, by, { color: alpha(hot ? p.amber : p.line, hot ? 0.85 : 0.55), lw: lw * (hot ? 1.4 : 1) });
        if (lbl && hot) {
          // Offset the label perpendicular to the line and give it a chip, or
          // it lands on top of whichever box the line is heading for.
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
          const lx = mx + (-dy / len) * 14, ly = my + (dx / len) * 14;
          const tw = lbl.length * 5.6 + 12;
          box(g, lx - tw / 2, ly - 8, tw, 16, { fill: p.ground, stroke: alpha(p.amber, 0.5), r: 8, lw: 1 });
          label(g, lbl, lx, ly, { color: p.amber, size: 9.5, align: 'center', ...mono });
        }
        // Something moving, so it reads as traffic rather than as a diagram.
        if (hot) {
          const u = (t * 0.6) % 1;
          g.fillStyle = p.amber;
          g.beginPath(); g.arc(lerp(ax, bx, u), lerp(ay, by, u), 3, 0, 7); g.fill();
        }
      }

      for (const [k, [name, col, ]] of Object.entries(PARTS)) {
        if (!pos[k]) continue;
        const [x, y] = P(k);
        const on = k === sel;
        const c = p[col] || p.ink2;
        box(g, x - bw / 2, y - bh / 2, bw, bh, {
          fill: on ? alpha(c, 0.2) : alpha(p.raised, 0.75), stroke: on ? c : p.line, r: 8, lw: on ? 2 : 1,
        });
        label(g, name, x, y, { color: on ? p.ink : p.ink2, size: 11.5, weight: on ? 700 : 600, align: 'center' });
      }

      fit(34 + SPAN + bh / 2 + 20);
    },
  });

  const upd = () => setNote(PARTS[sel][2] + (sel === 'ram'
    ? ' <b>This is the one that surprises people:</b> nothing runs from the disk. It is always copied into RAM first.'
    : ''));
  controls.append(choice('Part', Object.entries(PARTS).filter(([k]) => k !== 'bus').map(([k, v]) => [k, v[0]]), {
    value: 'cpu', on: (v) => { sel = v; upd(); },
  }).node);
  upd();
});

// ============================================================================
// 9. Boot: what happens between the button and the desktop
// ============================================================================

register('boot-sequence', (host) => {
  let step = 0, acc = 0;
  const BOOT = [
    ['Power good', 'The power supply checks its own outputs are stable and tells the board it is safe to start. A machine that does nothing at all when you press the button is usually here.'],
    ['Firmware runs', 'A small program in a chip on the motherboard, the BIOS or UEFI, starts. It is the only software that does not need a working disk.'],
    ['POST', 'Power on self test: is there RAM, is there a processor, is there something to display on. Failures here beep or flash a code, because there is no screen yet to write to.'],
    ['Find a boot device', 'The firmware looks at the drives in a configured order for something bootable. "No boot device" means the disk is missing, dead, or not in that order.'],
    ['Bootloader', 'A tiny program at a known place on the disk, whose only job is to load the real operating system into RAM.'],
    ['Kernel', 'The core of the OS takes over: it claims the hardware, starts the drivers, and sets up memory.'],
    ['Services and drivers', 'Everything that must be running before a person can use the machine. Audio and video interfaces get claimed here, which is why a device unplugged at this moment often needs a restart.'],
    ['Desktop', 'A login screen and a session. Only now is anything you would recognise as the computer actually running.'],
  ];
  const { controls, stage, setNote } = figure(host, {
    title: 'What happens between the button and the desktop',
    sub: 'Eight steps, in order. Knowing the order tells you where a machine stopped.',
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
      if (acc > 2.4) { acc = 0; step = (step + 1) % BOOT.length; paint(); }
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const rowH = 26;
      BOOT.forEach(([name], i) => {
        const y = 30 + i * rowH;
        const done = i < step, on = i === step;
        const col = on ? p.amber : (done ? p.green : p.muted);
        if (i) line(g, ox + 10, y - rowH + 8, ox + 10, y - 6, { color: alpha(done || on ? p.green : p.line, 0.8), lw: 2 });
        g.fillStyle = on ? col : alpha(col, done ? 0.7 : 0.3);
        g.beginPath(); g.arc(ox + 10, y, on ? 7 : 4.5, 0, 7); g.fill();
        label(g, `${i + 1}. ${name}`, ox + 26, y, { color: on ? p.ink : (done ? p.ink2 : p.muted), size: 12, weight: on ? 700 : 500 });
        if (on) {
          const bw = W - 220;
          box(g, ox + 200, y - 6, bw, 12, { fill: alpha(p.line, 0.3), stroke: 'transparent', r: 3 });
          box(g, ox + 200, y - 6, bw * clamp(acc / 2.4, 0, 1), 12, { fill: alpha(p.amber, 0.6), stroke: 'transparent', r: 3 });
        }
      });
      fit(30 + BOOT.length * rowH + 16);
    },
  });

  function paint() { setNote(`<b>${BOOT[step][0]}.</b> ${BOOT[step][1]}`); }
  controls.append(button('Next step ›', () => { step = (step + 1) % BOOT.length; acc = 0; paint(); }).node);
  paint();
});

// ============================================================================
// 10. A computer, a microcontroller, and what each is for
// ============================================================================

register('micro-vs-computer', (host) => {
  let sel = 'mcu';
  const K = {
    mcu: {
      label: 'Microcontroller', col: 'green',
      rows: [['Runs', 'one program, forever, from the moment it powers up'],
        ['Operating system', 'usually none. Your code is the only thing running.'],
        ['Memory', 'kilobytes'],
        ['Boot time', 'milliseconds'],
        ['Timing', '**predictable to the microsecond**, because nothing else is competing'],
        ['On a show', 'a DMX relay box, a button panel, a sensor, a custom trigger'],
        ['Cost', 'a few dollars']],
      note: '<b>It does one thing and it does it on time.</b> No operating system means nothing can decide your code is less important than an update. That predictability is the entire reason a microcontroller is the right answer for a trigger, an interlock or a button panel, and it is exactly what a general purpose machine cannot promise.',
    },
    pc: {
      label: 'A computer', col: 'cyan',
      rows: [['Runs', 'hundreds of programs, sharing one processor by taking turns'],
        ['Operating system', 'required, and it is in charge, not you'],
        ['Memory', 'gigabytes'],
        ['Boot time', 'tens of seconds'],
        ['Timing', 'good on average, **never guaranteed**'],
        ['On a show', 'media server, console, DAW, anything with a screen'],
        ['Cost', 'hundreds to thousands']],
      note: '<b>Everything it is good at comes from sharing.</b> Hundreds of programs take turns on the processor, which is what makes it flexible and what makes its timing a matter of probability rather than promise. That is why Class 2 spends so long on buffers: a buffer is how you buy certainty back from a machine that cannot give it to you directly.',
    },
  };
  const { controls, stage, setNote } = figure(host, {
    title: 'Two kinds of computer, and why a show uses both',
    sub: 'One is flexible and cannot promise you a deadline. The other promises the deadline and can do nothing else.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 280,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const cols = Object.entries(K);
      const cw = (W - 16) / 2;
      cols.forEach(([k, v], i) => {
        const x = ox + i * (cw + 16), on = k === sel;
        const c = p[v.col];
        box(g, x, 24, cw, 34 + v.rows.length * 22, {
          fill: on ? alpha(c, 0.12) : alpha(p.raised, 0.5), stroke: on ? c : p.line, r: 8, lw: on ? 2 : 1,
        });
        label(g, v.label, x + 14, 44, { color: on ? c : p.ink2, size: 13, weight: 700 });
        v.rows.forEach(([kk, vv], r) => {
          const y = 68 + r * 22;
          label(g, kk, x + 14, y, { color: p.muted, size: 10, ...mono });
          label(g, vv.replace(/\*\*/g, ''), x + 14, y + 11,
            { color: vv.includes('**') ? c : p.ink2, size: 10.5, weight: vv.includes('**') ? 700 : 500 });
        });
      });
      fit(24 + 34 + K.mcu.rows.length * 22 + 24);
    },
  });

  const upd = () => setNote(K[sel].note);
  controls.append(choice('Look at', [['mcu', 'Microcontroller'], ['pc', 'A computer']], {
    value: 'mcu', on: (v) => { sel = v; upd(); },
  }).node);
  upd();
});
