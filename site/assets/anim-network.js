// Animations for Class 3: the network.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, h, el,
} from './anim-core.js';

// --- Shared IPv4 helpers ----------------------------------------------------

const ipToInt = (ip) => ip.trim().split('.').reduce((a, o) => a * 256 + (+o), 0) >>> 0;
const intToIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskOf = (p) => (p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0);
const validIp = (s) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s.trim()) && s.trim().split('.').every((o) => +o <= 255);
const bits32 = (n) => [...Array(32)].map((_, i) => (n >>> (31 - i)) & 1);

// ============================================================================
// The OSI stack, as encapsulation you can watch
// ============================================================================

register('osi-stack', (host) => {
  const LAYERS = [
    { n: 7, name: 'Application', zh: '應用層', add: 'The message itself', show: 'sACN universe 3, 512 levels' },
    { n: 6, name: 'Presentation', zh: '表現層', add: 'Encoding', show: 'byte order, no encryption here' },
    { n: 5, name: 'Session', zh: '會議層', add: 'The conversation', show: 'stateless stream, nothing to set up' },
    { n: 4, name: 'Transport', zh: '傳輸層', add: 'UDP header', show: 'src 5568 → dst 5568' },
    { n: 3, name: 'Network', zh: '網路層', add: 'IP header', show: '10.101.10.14 → 239.255.0.3' },
    { n: 2, name: 'Data link', zh: '資料連結層', add: 'Ethernet header + VLAN tag', show: 'MAC → MAC, VLAN 10' },
    { n: 1, name: 'Physical', zh: '實體層', add: 'Electricity on copper', show: '1000BASE-T over Cat6' },
  ];
  const state = { step: 0, playing: true, sel: null };

  const { controls, stage, setNote } = figure(host, {
    title: 'The OSI stack, and why you diagnose from the bottom',
    sub: 'A lighting cue leaving a console. Each layer wraps what it was given, then the far end unwraps it in reverse.',
    note: '&nbsp;',
  });

  let acc = 0;
  canvas(stage, {
    height: 360,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      if (state.playing) {
        acc += dt;
        if (acc > 0.85) { acc = 0; state.step = (state.step + 1) % 15; }
      }
      const rowH = 40, x0 = 116, colW = Math.min(300, w - x0 - 160);
      const down = state.step < 7;
      const idx = down ? state.step : (state.step < 8 ? 7 : 14 - state.step);

      LAYERS.forEach((L, i) => {
        const y = 22 + i * rowH;
        const active = (down ? i <= idx : i <= idx) && state.step > 0;
        const isNow = i === (down ? idx : idx);
        const col = L.n <= 2 ? p.amber : L.n <= 4 ? p.cyan : p.green;

        box(g, 10, y, 100, rowH - 7, {
          fill: isNow ? alpha(col, 0.28) : p.surface,
          stroke: isNow ? col : p.line, r: 6, lw: isNow ? 2 : 1,
        });
        label(g, String(L.n), 24, y + (rowH - 7) / 2, { color: col, size: 13, weight: 700, mono: true });
        label(g, L.name, 40, y + (rowH - 7) / 2 - 6, { color: p.ink, size: 11.5, weight: 600 });
        label(g, L.zh, 40, y + (rowH - 7) / 2 + 8, { color: p.muted, size: 10 });

        // The growing packet: one nested band per header added
        if (active) {
          const depth = 7 - i;
          const inset = (7 - depth) * 0;
          const bw = colW * (0.22 + 0.11 * depth);
          box(g, x0, y + 3, bw, rowH - 13, {
            fill: alpha(col, isNow ? 0.5 : 0.18), stroke: alpha(col, 0.8), r: 4,
          });
          label(g, L.add, x0 + bw + 10, y + (rowH - 7) / 2 - 6, { color: isNow ? p.ink : p.muted, size: 11 });
          if (isNow) label(g, L.show, x0 + bw + 10, y + (rowH - 7) / 2 + 8, { color: col, size: 10.5, mono: true });
        }
      });

      const dirY = hgt - 22;
      label(g, down ? '▼  wrapping on the way out of the console' : '▲  unwrapping on the way into the node',
        10, dirY, { color: down ? p.cyan : p.amber, size: 12, weight: 600 });
      label(g, 'Diagnose bottom up: link light, VLAN, IP, port, then software.',
        w - 10, dirY, { color: p.muted, size: 11, align: 'right' });
    },
  });

  controls.append(
    button('◀ Step', () => { state.playing = false; state.step = (state.step + 14) % 15; }).node,
    button('Step ▶', () => { state.playing = false; state.step = (state.step + 1) % 15; }).node,
    toggle('Auto', { value: true, on: (v) => { state.playing = v; } }).node
  );

  setNote('Layers 5 and 6 are real and you will rarely troubleshoot them by name. The work happens at 1, 2, 3, 4 and 7, and the order matters: <b>every rung you skip is a rung you come back to.</b> The student who reinstalls the lighting software first has spent forty minutes to arrive back at the link light.');
});

// ============================================================================
// The subnet mask, in binary, live
// ============================================================================

register('subnet-bits', (host) => {
  const state = { ip: '10.101.3.150', prefix: 26 };
  const { controls, stage, setNote } = figure(host, {
    title: 'The mask is a run of ones',
    sub: 'Drag the prefix and watch the boundary move. Everything to the left is the neighbourhood, everything to the right is the house.',
    note: '&nbsp;',
  });

  const wrap = el('div', 'sb');
  stage.append(wrap);

  function paint() {
    if (!validIp(state.ip)) { wrap.innerHTML = '<p class="sb-bad">Four numbers, each 0 to 255.</p>'; return; }
    const p = state.prefix;
    const ipN = ipToInt(state.ip);
    const m = maskOf(p);
    const net = (ipN & m) >>> 0;
    const bc = (net | (~m >>> 0)) >>> 0;
    const size = 2 ** (32 - p);
    const usable = p >= 31 ? (p === 31 ? 2 : 1) : size - 2;
    const ib = bits32(ipN), mb = bits32(m), nb = bits32(net);

    const row = (label, bits, cls) => `<div class="sb-row">
      <span class="sb-lbl">${label}</span>
      <span class="sb-bits">${bits.map((b, i) =>
        `<i class="sb-b ${i < p ? 'net' : 'host'} ${cls}">${b}</i>${(i + 1) % 8 === 0 && i < 31 ? '<u class="sb-dot">.</u>' : ''}`
      ).join('')}</span></div>`;

    wrap.innerHTML = `
      ${row('address', ib, '')}
      ${row('mask', mb, 'mask')}
      ${row('network', nb, 'res')}
      <div class="sb-axis"><span class="sb-net-lbl" style="width:${(p / 32) * 100}%">network · ${p} bits</span><span class="sb-host-lbl">host · ${32 - p} bits</span></div>
      <div class="sb-out">
        <div><b>${intToIp(net)}/${p}</b><span>network address</span></div>
        <div><b>${intToIp(m)}</b><span>subnet mask</span></div>
        <div><b>${intToIp(p >= 31 ? net : net + 1)}</b><span>first usable</span></div>
        <div><b>${intToIp(p >= 31 ? bc : bc - 1)}</b><span>last usable</span></div>
        <div><b>${intToIp(bc)}</b><span>broadcast</span></div>
        <div><b>${usable.toLocaleString()}</b><span>usable hosts</span></div>
      </div>`;
  }

  const ipIn = h(`<label class="ac ac-text"><span class="ac-l">IP address</span>
    <input type="text" value="${state.ip}" spellcheck="false" autocomplete="off"></label>`);
  ipIn.querySelector('input').addEventListener('input', (e) => { state.ip = e.target.value; paint(); note(); });

  controls.append(
    ipIn,
    slider('Prefix', { min: 8, max: 30, step: 1, value: 26, fmt: (v) => `/${v}`, on: (v) => { state.prefix = v; paint(); note(); } }).node
  );

  function note() {
    if (!validIp(state.ip)) return;
    const p = state.prefix;
    const octet = Math.min(3, Math.floor(p / 8));
    const maskOctet = (maskOf(p) >>> (8 * (3 - octet))) & 255;
    const block = 256 - maskOctet || 256;
    setNote(`Block size is <b>256 − ${maskOctet} = ${block}</b> in the ${['first', 'second', 'third', 'fourth'][octet]} octet, so the subnets run in steps of ${block}. Usable hosts are <b>2^(32−${p}) − 2 = ${(2 ** (32 - p) - 2).toLocaleString()}</b>. The two you never assign are the first address in the block and the last.`);
  }

  paint(); note();
});

// ============================================================================
// Can these two devices talk?
// ============================================================================

register('can-they-talk', (host) => {
  const state = { a: '192.168.1.10', b: '192.168.2.10', p: 24 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Can these two talk directly?',
    sub: 'Apply the mask to both. If the network portions match, yes. If they do not, no cable will change it.',
    note: '&nbsp;',
  });

  const wrap = el('div', 'sb');
  stage.append(wrap);

  function paint() {
    if (!validIp(state.a) || !validIp(state.b)) { wrap.innerHTML = '<p class="sb-bad">Check both addresses.</p>'; return; }
    const p = state.p;
    const na = (ipToInt(state.a) & maskOf(p)) >>> 0;
    const nb = (ipToInt(state.b) & maskOf(p)) >>> 0;
    const ok = na === nb;

    const row = (name, ip, netInt) => `<div class="sb-row">
      <span class="sb-lbl">${name}</span>
      <span class="sb-bits">${bits32(ipToInt(ip)).map((b, i) =>
        `<i class="sb-b ${i < p ? 'net' : 'host'}">${b}</i>${(i + 1) % 8 === 0 && i < 31 ? '<u class="sb-dot">.</u>' : ''}`).join('')}</span>
      <span class="sb-net">${intToIp(netInt)}</span></div>`;

    wrap.innerHTML = row('A', state.a, na) + row('B', state.b, nb) +
      `<div class="sb-verdict ${ok ? 'ok' : 'no'}">
        <span class="sb-wire"></span>
        <b>${ok ? 'YES, they can talk' : 'NO, different networks'}</b>
        <span>${ok ? `both on ${intToIp(na)}/${p}` : `${intToIp(na)}/${p} and ${intToIp(nb)}/${p}`}</span>
      </div>`;
  }

  const mk = (key, lbl) => {
    const n = h(`<label class="ac ac-text"><span class="ac-l">${lbl}</span>
      <input type="text" value="${state[key]}" spellcheck="false" autocomplete="off"></label>`);
    n.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; paint(); note(); });
    return n;
  };

  controls.append(
    mk('a', 'Device A'), mk('b', 'Device B'),
    slider('Mask', { min: 8, max: 30, step: 1, value: 24, fmt: (v) => `/${v}`, on: (v) => { state.p = v; paint(); note(); } }).node,
    button('The Art-Net trap', () => {
      state.a = '2.0.0.10'; state.b = '192.168.1.20'; state.p = 24;
      controls.querySelectorAll('input[type=text]').forEach((i, n) => { i.value = n ? state.b : state.a; });
      controls.querySelector('input[type=range]').value = 24;
      paint(); note();
    }).node
  );

  function note() {
    if (!validIp(state.a) || !validIp(state.b)) return;
    const ok = ((ipToInt(state.a) & maskOf(state.p)) >>> 0) === ((ipToInt(state.b) & maskOf(state.p)) >>> 0);
    if (state.a.startsWith('2.') || state.b.startsWith('2.')) {
      setNote('<b>This is the number one reason a first year declares a node broken.</b> Art-Net gear has shipped on 2.x.x.x for decades. Same switch, same cable, link lights on both ends, and no possible path. Either move the laptop onto 2.x.x.x, or set the node into the show scheme. The second is the professional answer, and it goes on the IP schedule.');
    } else if (ok) {
      setNote('The network portions match, so a switch between them is enough. Note how widening the mask can make two devices reachable that were not: that also enlarges the broadcast domain, which is usually the opposite of what you want on a show. <b>Fix the address, not the mask.</b>');
    } else {
      setNote('The network portions differ, so there is no direct path however good the cable is. They would need a router, and on a show network the usual answer is that you did not want them talking anyway.');
    }
  }
  paint(); note();
});

// ============================================================================
// VLANs: one switch behaving as several
// ============================================================================

register('vlan-switch', (host) => {
  const VLANS = [
    { id: 10, name: 'LX', c: 'amber' },
    { id: 20, name: 'AUDIO', c: 'cyan' },
    { id: 30, name: 'VIDEO', c: 'green' },
    { id: 999, name: 'PARKED', c: 'muted' },
  ];
  const ports = [10, 10, 10, 20, 20, 20, 30, 999];
  const state = { paint: 10, from: -1, trunk: true };

  const { controls, stage, setNote } = figure(host, {
    title: 'One switch, four separate switches',
    sub: 'Click a port to reassign it. Then click SEND on any port and watch exactly which ports the broadcast reaches.',
    note: '&nbsp;',
  });

  let pulse = 0;
  canvas(stage, {
    height: 260,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const n = ports.length;
      const pw = Math.min(74, (w - 40) / n);
      const totalW = pw * n;
      const ox = (w - totalW) / 2;
      const py = 92, ph = 66;

      box(g, ox - 12, 62, totalW + 24, 128, { fill: p.raised, stroke: p.line, r: 10 });
      label(g, 'MANAGED SWITCH', ox - 4, 52, { color: p.muted, size: 10, weight: 700 });

      if (state.from >= 0) pulse += dt;
      const reach = (i) => state.from >= 0 && ports[i] === ports[state.from] && ports[i] !== 999;

      ports.forEach((v, i) => {
        const vl = VLANS.find((x) => x.id === v);
        const col = vl.c === 'muted' ? p.muted : p[vl.c];
        const x = ox + i * pw;
        const lit = reach(i) && pulse > 0.25;
        box(g, x + 5, py, pw - 10, ph, {
          fill: lit ? alpha(col, 0.4) : alpha(col, 0.1),
          stroke: i === state.from ? p.ink : alpha(col, 0.75), r: 6, lw: i === state.from ? 2.5 : 1.5,
        });
        label(g, String(i + 1), x + pw / 2, py + 16, { color: p.ink, size: 12, weight: 700, align: 'center', mono: true });
        label(g, vl.name, x + pw / 2, py + 34, { color: col, size: 9.5, weight: 700, align: 'center' });
        label(g, String(v), x + pw / 2, py + 50, { color: p.muted, size: 10, align: 'center', mono: true });

        if (lit) label(g, '●', x + pw / 2, py + ph + 16, { color: col, size: 14, align: 'center' });
        else if (state.from >= 0 && i !== state.from && pulse > 0.25)
          label(g, '✕', x + pw / 2, py + ph + 16, { color: alpha(p.red, 0.5), size: 12, align: 'center' });
      });

      if (state.from >= 0 && pulse > 0.25) {
        const vl = VLANS.find((x) => x.id === ports[state.from]);
        const got = ports.filter((v, i) => reach(i)).length - 1;
        label(g,
          ports[state.from] === 999
            ? 'Port is parked in VLAN 999. The frame goes nowhere at all, which is the point of parking unused ports.'
            : `Broadcast from port ${state.from + 1} on VLAN ${ports[state.from]} reached ${got} other port${got === 1 ? '' : 's'}. Every other port never saw it.`,
          w / 2, 218, { color: p.ink2, size: 12, align: 'center' });
      } else {
        // Show which VLAN a click will paint. Without this the chooser looks
      // like a control that does nothing until you also click a port.
      {
        const bv = VLANS.find((v) => v.id === state.paint) || VLANS[0];
        const bc = p[bv.c] || p.amber;
        const bx = ox + 4, by = 74;
        g.fillStyle = bc; g.fillRect(bx, by - 6, 11, 11);
        label(g, `assigning: VLAN ${bv.id} ${bv.name}`, bx + 17, by, { color: p.ink2, size: 10.5, weight: 600 });
      }
      label(g, 'Click a port to reassign it to the selected VLAN, then press Send.',
          w / 2, 218, { color: p.muted, size: 12, align: 'center' });
      }
      label(g, `Trunk to the next switch: ${state.trunk ? 'tagged 10, 20, 30' : 'none'}`,
        w / 2, 240, { color: state.trunk ? p.cyan : p.muted, size: 11, align: 'center', mono: true });
    },
  });

  const cvEl = stage.querySelector('canvas');
  cvEl.addEventListener('click', (e) => {
    const r = cvEl.getBoundingClientRect();
    const n = ports.length;
    const pw = Math.min(74, (r.width - 40) / n);
    const ox = (r.width - pw * n) / 2;
    const i = Math.floor((e.clientX - r.left - ox) / pw);
    if (i < 0 || i >= n) return;
    ports[i] = state.paint;
    state.from = -1;
    update();
  });

  controls.append(
    choice('Assign', VLANS.map((v) => [v.id, `${v.id} ${v.name}`]), { value: 10, on: (v) => { state.paint = +v; } }).node,
    button('Send broadcast from port 1', () => { state.from = 0; pulse = 0; }).node,
    button('…from port 4', () => { state.from = 3; pulse = 0; }).node,
    toggle('Trunk uplink', { value: true, on: (v) => { state.trunk = v; update(); } }).node
  );

  function update() {
    setNote('A VLAN is a <b>separate broadcast domain</b>. Ports in different VLANs cannot see each other even though they share a box, a power supply and a backplane. Device ports are <b>access</b> ports carrying one VLAN untagged. The link to the next switch is a <b>trunk</b>, tagged with 802.1Q so the far end knows which VLAN each frame belongs to. Unused ports go in a dead VLAN, because an unused port in VLAN 1 is an open door at 18:00.');
  }
  update();
});

// ============================================================================
// Multicast, IGMP snooping, and the querier that is not there
// ============================================================================

register('multicast-igmp', (host) => {
  const state = { mode: 'snoop-noquerier', clock: 0, running: true };
  const { controls, stage, setNote } = figure(host, {
    title: 'The failure that waits until the show',
    sub: 'A Dante stream to two subscribers. Let the clock run and watch the middle option.',
    note: '&nbsp;',
  });

  const SUBS = [1, 4];      // ports that asked for the stream
  const N = 6;
  let pk = [], spawn = 0, timeout = 0;

  canvas(stage, {
    height: 270,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      timeout += dt;
      const expired = state.mode === 'snoop-noquerier' && timeout > 9;

      const pw = Math.min(80, (w - 60) / N);
      const ox = (w - pw * N) / 2;
      const srcY = 44, swY = 108, portY = 172;

      box(g, ox, swY, pw * N, 42, { fill: p.raised, stroke: p.line, r: 8 });
      label(g, 'SWITCH', ox + 10, swY + 21, { color: p.muted, size: 10, weight: 700 });
      label(g, state.mode === 'none' ? 'no snooping'
        : state.mode === 'snoop-noquerier' ? 'snooping ON, querier MISSING'
          : 'snooping ON, one querier', ox + pw * N - 10, swY + 21,
        { color: state.mode === 'good' ? p.green : state.mode === 'none' ? p.amber : p.red, size: 11, align: 'right', mono: true });

      box(g, ox, srcY - 16, 120, 32, { fill: p.surface, stroke: p.cyan, r: 6 });
      label(g, 'Dante source', ox + 60, srcY, { color: p.cyan, size: 11, weight: 650, align: 'center' });

      spawn += dt;
      if (spawn > 0.4 && !expired) {
        spawn = 0;
        const targets = state.mode === 'none' ? [...Array(N).keys()] : SUBS;
        targets.forEach((i) => pk.push({ i, y: swY + 42, life: 0 }));
      }

      for (let i = 0; i < N; i++) {
        const x = ox + i * pw;
        const sub = SUBS.includes(i);
        const getting = !expired && (state.mode === 'none' || sub);
        box(g, x + 6, portY, pw - 12, 46, {
          fill: getting ? alpha(p.cyan, 0.22) : p.surface,
          stroke: sub ? alpha(p.cyan, 0.8) : p.line, r: 6,
        });
        label(g, sub ? 'subscribed' : 'not asked', x + pw / 2, portY + 16,
          { color: sub ? p.cyan : p.muted, size: 9.5, align: 'center' });
        label(g, getting ? 'AUDIO' : (sub && expired ? 'SILENT' : '—'), x + pw / 2, portY + 33,
          { color: getting ? p.ink : (sub && expired ? p.red : p.muted), size: 11, weight: 650, align: 'center', mono: true });
      }

      for (let i = pk.length - 1; i >= 0; i--) {
        const q = pk[i];
        q.life += dt;
        q.y += 90 * dt;
        if (q.y > portY) { pk.splice(i, 1); continue; }
        box(g, ox + q.i * pw + pw / 2 - 5, q.y, 10, 9, { fill: p.cyan, stroke: 'transparent', r: 2 });
      }

      // Clock: the whole point is that this fails late
      const mins = Math.floor(timeout * 40);
      const timeStr = `14:00 + ${String(Math.floor(mins / 60)).padStart(1, '0')}h ${String(mins % 60).padStart(2, '0')}m`;
      label(g, timeStr, ox, hgt - 12, { color: expired ? p.red : p.muted, size: 12, weight: 650, mono: true });
      if (expired) label(g, 'group membership timed out — the switch stopped forwarding',
        ox + 130, hgt - 12, { color: p.red, size: 11.5 });
    },
  });

  controls.append(
    choice('Switch', [
      ['none', 'Unmanaged, no snooping'],
      ['snoop-noquerier', 'Snooping on, no querier'],
      ['good', 'Snooping on, one querier'],
    ], { value: 'snoop-noquerier', on: (v) => { state.mode = v; timeout = 0; pk = []; update(); } }).node,
    button('Restart the clock', () => { timeout = 0; pk = []; }).node
  );

  function update() {
    if (state.mode === 'none') setNote('No snooping, so the switch floods the multicast to every port whether it asked or not. On a small network this is fine and it is why an unmanaged switch often just works. On a large one every device wastes effort discarding traffic it never wanted.');
    else if (state.mode === 'snoop-noquerier') setNote('<b>This is the show killer.</b> Snooping is on, so the switch only forwards where a join was heard, but nothing on the network is asking the questions that keep those joins alive. It works perfectly for hours, then the memberships time out and the audio stops. Perfect at 14:00, dead at 19:15. <b>Recognise that timing signature.</b>');
    else setNote('Snooping on with exactly one querier. The stream reaches only the ports that asked, the memberships are refreshed, and it keeps working. Either configure it properly or use a switch with nothing to configure. The half measure is worse than neither.');
  }
  update();
});

// ============================================================================
// Layers 2, 3 and 4: what each one addresses
// ============================================================================

register('layer-stack', (host) => {
  const LAYERS = [
    {
      n: 4, name: 'Transport', unit: 'segment / datagram', c: 'green',
      q: 'Which program on that device?',
      fields: [['src port', '5568'], ['dst port', '5568'], ['protocol', 'UDP']],
      wrong: 'The traffic arrives, Wireshark shows it, and the application sees nothing. Wrong port, or a firewall on the receiving machine.',
    },
    {
      n: 3, name: 'Network', unit: 'packet', c: 'cyan',
      q: 'Which device, anywhere?',
      fields: [['src IP', '10.101.10.20'], ['dst IP', '239.255.0.1'], ['TTL', '64']],
      wrong: 'No route, or the wrong network entirely. Ping fails, or you get "destination host unreachable".',
    },
    {
      n: 2, name: 'Data link', unit: 'frame', c: 'amber',
      q: 'Which device on THIS wire?',
      fields: [['src MAC', '00:1D:C1:0A:2B:3C'], ['dst MAC', '01:00:5E:7F:00:01'], ['VLAN', '10']],
      wrong: 'Link light on, nothing reachable. Wrong VLAN, or a frame discarded for a bad checksum, which looks like missing data rather than corrupt data.',
    },
  ];
  let sel = 2;

  const { controls, stage, setNote } = figure(host, {
    title: 'The three layers you actually configure',
    sub: 'One cue leaving a lighting console. Click a layer to see what it addresses and what it looks like when it is wrong.',
    note: '&nbsp;',
  });

  canvas(stage, {
    height: 250,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const rowH = 66, x0 = 22, bw = Math.min(w - 44, 720);

      LAYERS.forEach((L, i) => {
        const y = 16 + i * rowH;
        const col = p[L.c];
        const on = i === sel;
        box(g, x0, y, bw, rowH - 12, {
          fill: on ? alpha(col, 0.16) : p.surface,
          stroke: on ? col : p.line, r: 8, lw: on ? 2 : 1,
        });
        box(g, x0 + 10, y + 10, 34, 34, { fill: on ? col : p.raised, stroke: alpha(col, 0.7), r: 7 });
        label(g, String(L.n), x0 + 27, y + 27, {
          color: on ? p.ground : col, size: 15, weight: 700, align: 'center', mono: true,
        });
        label(g, L.name, x0 + 56, y + 20, { color: p.ink, size: 13.5, weight: 650 });
        label(g, L.unit, x0 + 56, y + 38, { color: p.muted, size: 11, mono: true });
        label(g, L.q, x0 + 200, y + 20, { color: on ? col : p.ink2, size: 12.5, weight: on ? 650 : 500 });

        // Header fields, which is what the layer actually carries
        const fx = x0 + 200;
        label(g, L.fields.map(([k, v]) => `${k} ${v}`).join('   ·   '), fx, y + 38,
          { color: on ? p.ink2 : p.muted, size: 10.5, mono: true });
      });

      label(g, 'Read bottom to top: get it across this wire, get it to that machine, give it to the right program.',
        x0, hgt - 14, { color: p.muted, size: 11.5 });
    },
  });

  const cv = stage.querySelector('canvas');
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const i = Math.floor((e.clientY - r.top - 16) / 66);
    if (i >= 0 && i < LAYERS.length) { sel = i; paint(); }
  });

  controls.append(
    choice('Layer', LAYERS.map((L, i) => [i, `${L.n} ${L.name}`]), {
      value: 2, on: (v) => { sel = +v; paint(); },
    }).node
  );

  function paint() {
    const L = LAYERS[sel];
    setNote(`<b>Layer ${L.n}, ${L.name}.</b> The unit is a ${L.unit}, and it answers: <i>${L.q}</i><br>
      <b>When it is wrong:</b> ${L.wrong}`);
  }
  paint();
});

// ============================================================================
// What changes at every hop, and what does not
// ============================================================================

register('hop-by-hop', (host) => {
  const HOPS = [
    { from: 'Console', to: 'Switch A', srcMac: 'CONSOLE', dstMac: 'ROUTER-L', net: '10.101.10.0/24' },
    { from: 'Switch A', to: 'Router', srcMac: 'CONSOLE', dstMac: 'ROUTER-L', net: '10.101.10.0/24' },
    { from: 'Router', to: 'Switch B', srcMac: 'ROUTER-R', dstMac: 'NODE', net: '10.101.20.0/24' },
    { from: 'Switch B', to: 'Node', srcMac: 'ROUTER-R', dstMac: 'NODE', net: '10.101.20.0/24' },
  ];
  const MACS = {
    CONSOLE: '00:1D:C1:0A:2B:01', 'ROUTER-L': '00:1D:C1:0A:2B:AA',
    'ROUTER-R': '00:1D:C1:0A:2B:BB', NODE: '00:1D:C1:0A:2B:50',
  };
  let hop = 0, playing = true, acc = 0;

  const { controls, stage, setNote } = figure(host, {
    title: 'What changes at every hop, and what never does',
    sub: 'One packet from a console to a node, across a router. Watch the MAC addresses. Then watch the IP addresses.',
    note: '&nbsp;',
  });

  canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      if (playing) { acc += dt; if (acc > 1.7) { acc = 0; hop = (hop + 1) % HOPS.length; } }
      const h = HOPS[hop];

      const boxes = [
        { n: 'Console', ip: '10.101.10.20', x: 0.02 },
        { n: 'Switch A', ip: '', x: 0.245 },
        { n: 'Router', ip: '.10.1 / .20.1', x: 0.47 },
        { n: 'Switch B', ip: '', x: 0.695 },
        { n: 'Node', ip: '10.101.20.50', x: 0.92 },
      ];
      const bw = Math.max(96, (w - 40) * 0.17);
      boxes.forEach((b, i) => {
        const x = 20 + (w - 40 - bw) * b.x;
        const active = i === hop || i === hop + 1;
        box(g, x, 46, bw, 52, {
          fill: active ? alpha(p.cyan, 0.14) : p.surface,
          stroke: i === 2 ? p.amber : active ? p.cyan : p.line, r: 8, lw: i === 2 ? 2 : 1,
        });
        label(g, b.n, x + bw / 2, 66, { color: p.ink, size: 11.5, weight: 650, align: 'center' });
        if (b.ip) label(g, b.ip, x + bw / 2, 84, { color: p.muted, size: 9.5, align: 'center', mono: true });
        if (i === 2) label(g, 'layer 3 boundary', x + bw / 2, 112, { color: p.amber, size: 9.5, align: 'center' });
      });

      // The segment currently carrying the packet
      const segX = 20 + (w - 40 - bw) * boxes[hop].x + bw;
      const segW = (20 + (w - 40 - bw) * boxes[hop + 1].x) - segX;
      box(g, segX, 68, Math.max(4, segW), 8, { fill: p.cyan, stroke: 'transparent', r: 4 });

      // The headers, layered
      const hx = 24, hy = 140, hw = w - 48;
      box(g, hx, hy, hw, 40, { fill: alpha(p.amber, 0.14), stroke: p.amber, r: 7 });
      label(g, 'LAYER 2 FRAME — rewritten every hop', hx + 12, hy + 13,
        { color: p.amber, size: 9.5, weight: 700 });
      label(g, `src ${MACS[h.srcMac]}   →   dst ${MACS[h.dstMac]}`, hx + 12, hy + 29,
        { color: p.ink, size: 12, weight: 600, mono: true });

      box(g, hx + 16, hy + 46, hw - 32, 38, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 7 });
      label(g, 'LAYER 3 PACKET — never changes', hx + 28, hy + 58, { color: p.cyan, size: 9.5, weight: 700 });
      label(g, 'src 10.101.10.20   →   dst 10.101.20.50', hx + 28, hy + 74,
        { color: p.ink, size: 12, weight: 600, mono: true });

      box(g, hx + 32, hy + 90, hw - 64, 34, { fill: alpha(p.green, 0.14), stroke: p.green, r: 7 });
      label(g, 'LAYER 4 — never changes', hx + 44, hy + 101, { color: p.green, size: 9.5, weight: 700 });
      label(g, 'src port 49152   →   dst port 5568', hx + 44, hy + 116,
        { color: p.ink, size: 12, weight: 600, mono: true });

      label(g, `Hop ${hop + 1} of ${HOPS.length}: ${h.from} → ${h.to}   ·   on ${h.net}`,
        hx, hgt - 12, { color: p.ink2, size: 12, weight: 600 });
    },
  });

  controls.append(
    button('◀', () => { playing = false; hop = (hop + HOPS.length - 1) % HOPS.length; }).node,
    button('Step ▶', () => { playing = false; hop = (hop + 1) % HOPS.length; }).node,
    toggle('Auto', { value: true, on: (v) => { playing = v; } }).node
  );

  setNote('<b>The amber row changes at every single hop. The cyan and green rows never change at all.</b> The MAC addresses only ever name the next step on this wire, so the router strips the old frame and builds a new one. The IP addresses name the final destination and survive the whole journey, and the ports name the program at the far end. This is why layer 2 is "which device on this wire" and layer 3 is "which device anywhere", and why a router is the boundary between the two.');
});

// ============================================================================
// Switch, router, access point: three boxes, three jobs
// ============================================================================

register('device-roles', (host) => {
  const state = { dev: 'switch', msg: 'broadcast' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Switch, router, access point',
    sub: 'Same three messages through each box. The differences are the whole reason all three exist.',
    note: '&nbsp;',
  });

  let pulse = 0, sending = false;

  canvas(stage, {
    height: 260,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      if (sending) { pulse += dt; if (pulse > 2.4) { sending = false; pulse = 0; } }

      const cx = w / 2, cy = 112;
      const col = state.dev === 'switch' ? p.cyan : state.dev === 'router' ? p.amber : p.green;
      const nameMap = { switch: 'SWITCH', router: 'ROUTER', ap: 'ACCESS POINT' };
      const layerMap = { switch: 'layer 2', router: 'layer 3', ap: 'layer 2' };

      box(g, cx - 84, cy - 30, 168, 60, { fill: alpha(col, 0.16), stroke: col, r: 10, lw: 2 });
      label(g, nameMap[state.dev], cx, cy - 8, { color: col, size: 14, weight: 700, align: 'center' });
      label(g, layerMap[state.dev], cx, cy + 12, { color: p.muted, size: 10.5, align: 'center', mono: true });

      // Left: same network. Right: different network (or wireless for an AP)
      const leftLbl = '10.101.10.0/24';
      const rightLbl = state.dev === 'router' ? '10.101.20.0/24'
        : state.dev === 'ap' ? 'wireless clients' : '10.101.10.0/24';
      [[60, leftLbl, -1], [w - 60, rightLbl, 1]].forEach(([x, lbl, side]) => {
        box(g, x - 56, cy - 26, 112, 52, { fill: p.surface, stroke: p.line, r: 8 });
        label(g, side < 0 ? 'Console' : state.dev === 'ap' ? 'Tablet' : 'Node',
          x, cy - 6, { color: p.ink2, size: 11.5, weight: 600, align: 'center' });
        label(g, lbl, x, cy + 12, { color: p.muted, size: 9.5, align: 'center', mono: true });
        line(g, side < 0 ? x + 56 : cx + 84, side < 0 ? cy : cy, side < 0 ? cx - 84 : x - 56, cy,
          { color: alpha(p.line, 1), lw: 5, dash: state.dev === 'ap' && side > 0 ? [4, 4] : null });
      });

      // Outcome
      let verdict, vcol;
      if (state.msg === 'broadcast') {
        if (state.dev === 'router') { verdict = 'STOPPED. A router does not forward broadcasts. This is its most useful property.'; vcol = p.amber; }
        else { verdict = 'PASSED ON. Everything in this broadcast domain has to receive it and decide it does not care.'; vcol = p.cyan; }
      } else if (state.msg === 'same') {
        verdict = state.dev === 'router'
          ? 'Never reaches the router. Same network, so the switch handles it and the router is not involved.'
          : 'DELIVERED, by MAC address, straight to the port where that device lives.';
        vcol = p.green;
      } else {
        if (state.dev === 'router') { verdict = 'ROUTED. New frame, new MAC addresses, same IP addresses. This is the only box that can do this.'; vcol = p.green; }
        else { verdict = 'DROPPED. Different network, and this box cannot reach it. No cable fixes this.'; vcol = p.red; }
      }

      if (sending && pulse > 0.2) {
        const reach = !(state.msg === 'broadcast' && state.dev === 'router')
          && !(state.msg === 'other' && state.dev !== 'router');
        const x = 116 + (w - 232) * Math.min(1, (pulse - 0.2) / 1.1) * (reach ? 1 : 0.42);
        box(g, x, cy - 6, 14, 12, { fill: reach ? p.green : p.red, stroke: 'transparent', r: 3 });
        if (!reach && pulse > 0.9) label(g, '✕', cx, cy - 44, { color: p.red, size: 20, weight: 700, align: 'center' });
      }

      label(g, verdict, w / 2, hgt - 34, { color: vcol, size: 12.5, weight: 600, align: 'center' });
      label(g, 'A switch joins one network. A router joins two. An access point adds wireless to one.',
        w / 2, hgt - 12, { color: p.muted, size: 11, align: 'center' });
    },
  });

  controls.append(
    choice('Box', [['switch', 'Switch'], ['router', 'Router'], ['ap', 'Access point']],
      { value: 'switch', on: (v) => { state.dev = v; sending = true; pulse = 0; update(); } }).node,
    choice('Send', [['broadcast', 'A broadcast'], ['same', 'To the same network'], ['other', 'To another network']],
      { value: 'broadcast', on: (v) => { state.msg = v; sending = true; pulse = 0; update(); } }).node
  );

  function update() {
    const notes = {
      switch: 'A <b>switch</b> connects devices that are already on the same network, forwarding by MAC address. It passes broadcasts on within the VLAN, and it cannot reach another network at all. On most show networks this is the only box you need.',
      router: 'A <b>router</b> is the boundary between networks. It forwards by IP address, builds a new frame at every hop, and <b>stops broadcasts</b>. On a show you often want no router, because the departments are supposed to be isolated. Adding one is a decision, not a default.',
      ap: 'An <b>access point</b> does not create a network. It bridges wireless devices onto an existing wired one, at layer 2, and everything about wireless applies: a shared, contended medium with no delivery guarantee. Operator tablets, not show critical control.',
    };
    setNote(notes[state.dev]);
  }
  update();
});
