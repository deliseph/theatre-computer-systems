// Animations for Class 3: the network.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, labelWrap, textWidth, drawnSize, line, alpha, clamp, lerp, h, el, fitter,
} from './anim-core.js';

// --- Shared IPv4 helpers ----------------------------------------------------

const mono = { mono: true };
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
  const state = { a: '10.101.1.10', b: '10.101.2.10', pa: 24, pb: 24 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Can these two talk directly?',
    sub: 'Apply each device\u2019s own mask to the other one\u2019s address. They do not have to agree, and when they disagree the fault is one of the strangest on a show floor.',
    note: '&nbsp;',
  });

  const wrap = el('div', 'sb');
  stage.append(wrap);

  function paint() {
    if (!validIp(state.a) || !validIp(state.b)) { wrap.innerHTML = '<p class="sb-bad">Check both addresses.</p>'; return; }
    const ia = ipToInt(state.a), ib = ipToInt(state.b);
    // Each device decides for itself, using its own mask. That is the whole
    // point: nobody consults anybody.
    const aSaysLocal = ((ia & maskOf(state.pa)) >>> 0) === ((ib & maskOf(state.pa)) >>> 0);
    const bSaysLocal = ((ib & maskOf(state.pb)) >>> 0) === ((ia & maskOf(state.pb)) >>> 0);
    const netA = (ia & maskOf(state.pa)) >>> 0;
    const netB = (ib & maskOf(state.pb)) >>> 0;

    const row = (name, ip, p, netInt, thinks) => `<div class="sb-row">
      <span class="sb-lbl">${name} /${p}</span>
      <span class="sb-bits">${bits32(ipToInt(ip)).map((b, i) =>
    `<i class="sb-b ${i < p ? 'net' : 'host'}">${b}</i>${(i + 1) % 8 === 0 && i < 31 ? '<u class="sb-dot">.</u>' : ''}`).join('')}</span>
      <span class="sb-net">${intToIp(netInt)}/${p}</span>
      <span class="sb-think ${thinks ? 'yes' : 'no'}">${thinks ? 'thinks: local' : 'thinks: remote'}</span></div>`;

    let cls, head, detail;
    if (aSaysLocal && bSaysLocal) {
      cls = 'ok'; head = 'YES, both ways';
      detail = `both see ${intToIp(netA)}/${state.pa === state.pb ? state.pa : `${state.pa} and /${state.pb}`} as their own network`;
    } else if (!aSaysLocal && !bSaysLocal) {
      cls = 'no'; head = 'NO, and both of them know it';
      detail = `${intToIp(netA)}/${state.pa} and ${intToIp(netB)}/${state.pb}, so both send to a gateway`;
    } else {
      cls = 'half'; head = 'THEY DISAGREE, and this is the nasty one';
      const who = aSaysLocal ? ['A', 'B'] : ['B', 'A'];
      detail = `${who[0]} thinks ${who[1]} is on this wire and speaks to it directly. ${who[1]} thinks ${who[0]} is somewhere else and posts every reply to its gateway.`;
    }

    wrap.innerHTML = row('A', state.a, state.pa, netA, aSaysLocal)
      + row('B', state.b, state.pb, netB, bSaysLocal)
      + `<div class="sb-verdict ${cls}">
        <span class="sb-wire"></span>
        <b>${head}</b>
        <span>${detail}</span>
      </div>`;
  }

  const mk = (key, lbl) => {
    const n = h(`<label class="ac ac-text"><span class="ac-l">${lbl}</span>
      <input type="text" value="${state[key]}" spellcheck="false" autocomplete="off" aria-label="${lbl} address"></label>`);
    n.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; paint(); note(); });
    return n;
  };

  controls.append(
    mk('a', 'Device A'), mk('b', 'Device B'),
    slider('A\u2019s mask', { min: 8, max: 30, step: 1, value: 24, fmt: (v) => `/${v}`, on: (v) => { state.pa = v; paint(); note(); } }).node,
    slider('B\u2019s mask', { min: 8, max: 30, step: 1, value: 24, fmt: (v) => `/${v}`, on: (v) => { state.pb = v; paint(); note(); } }).node,
    button('The Art-Net trap', () => { preset('2.0.0.10', '192.168.1.20', 24, 24); }).node,
    button('The mismatched mask', () => { preset('10.101.1.10', '10.101.2.10', 8, 24); }).node
  );

  // Both presets set four values, and the controls have to follow the state or
  // the figure says one thing and the sliders say another.
  function preset(a, b, pa, pb) {
    state.a = a; state.b = b; state.pa = pa; state.pb = pb;
    controls.querySelectorAll('input[type=text]').forEach((i, n) => { i.value = n ? b : a; });
    const r = controls.querySelectorAll('input[type=range]');
    if (r[0]) r[0].value = pa;
    if (r[1]) r[1].value = pb;
    controls.querySelectorAll('.ac-v').forEach((v, n) => { v.textContent = `/${n ? pb : pa}`; });
    paint(); note();
  }

  function note() {
    if (!validIp(state.a) || !validIp(state.b)) return;
    const ia = ipToInt(state.a), ib = ipToInt(state.b);
    const aLocal = ((ia & maskOf(state.pa)) >>> 0) === ((ib & maskOf(state.pa)) >>> 0);
    const bLocal = ((ib & maskOf(state.pb)) >>> 0) === ((ia & maskOf(state.pb)) >>> 0);
    if (aLocal !== bLocal) {
      const wide = aLocal ? 'A' : 'B';
      const narrow = aLocal ? 'B' : 'A';
      setNote(`<b>A wider mask does not let you see more of the network. It only changes what one device believes.</b> ${wide} has the wider mask, so it decides ${narrow} is on this wire and speaks to it directly, and those frames really do arrive. ${narrow} has the narrower mask, decides ${wide} is somewhere else, and posts every reply to its gateway. If there is no gateway, or it has no route back, the replies never return. The symptom is the one that wastes an afternoon: you can see the packets arriving on ${narrow} in Wireshark, and the ping still fails. <b>A mask is a private opinion, not a shared setting</b>, and two devices on one wire with different masks is a fault even when one of them appears to work.`);
    } else if (state.a.startsWith('2.') || state.b.startsWith('2.')) {
      setNote('<b>This is the number one reason a first year declares a node broken.</b> Art-Net gear has shipped on 2.x.x.x for decades. Same switch, same cable, link lights on both ends, and no possible path. Either move the laptop onto 2.x.x.x, or set the node into the show scheme. The second is the professional answer, and it goes on the IP schedule.');
    } else if (aLocal) {
      setNote('The network portions match, so a switch between them is enough. Note how widening the mask can make two devices reachable that were not: that also enlarges the broadcast domain, which is usually the opposite of what you want on a show. <b>Fix the address, not the mask.</b>');
    } else {
      setNote('The network portions differ, so there is no direct path however good the cable is. They would need a router, and on a show network the usual answer is that you did not want them talking anyway. Both devices agree about this, which is why it fails cleanly and predictably in both directions.');
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

  // One geometry, shared by the drawing and the click test, so a row is always
  // clicked where it is drawn. Below the width where the name and the header
  // fields fit side by side, the fields drop under the name and the row grows.
  const geom = (w) => {
    const x0 = 22, bw = Math.min(w - 44, 720);
    const stacked = bw < 470;
    return { x0, bw, stacked, rowH: stacked ? 96 : 66, qx: stacked ? 56 : 200 };
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 250,
    animated: false,
    draw(g, w) {
      const p = palette();
      const { x0, bw, stacked, rowH, qx } = geom(w);

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
        const nameW = stacked ? bw - 66 : qx - 66;
        label(g, L.name, x0 + 56, y + 20, { color: p.ink, size: 13.5, weight: 650, max: nameW });
        label(g, L.unit, x0 + 56, y + 38, { color: p.muted, size: 11, max: nameW, mono: true });

        const rest = bw - (qx - x0) - 14;
        const qy = stacked ? y + 58 : y + 20;
        label(g, L.q, x0 + qx, qy, { color: on ? col : p.ink2, size: 12.5, weight: on ? 650 : 500, max: rest });
        label(g, L.fields.map(([k, v]) => `${k} ${v}`).join('   ·   '), x0 + qx, qy + 18,
          { color: on ? p.ink2 : p.muted, size: 10.5, max: rest, mono: true });
      });

      const fy = 16 + LAYERS.length * rowH + 10;
      const fh = labelWrap(g, 'Read bottom to top: get it across this wire, get it to that machine, give it to the right program.',
        x0, fy, { color: p.muted, size: 11.5, max: bw, maxLines: 3 });
      fit(fy + fh + 8);
    },
  });

  const cvEl = stage.querySelector('canvas');
  cvEl.addEventListener('click', (e) => {
    const r = cvEl.getBoundingClientRect();
    const i = Math.floor((e.clientY - r.top - 16) / geom(r.width).rowH);
    if (i >= 0 && i < LAYERS.length) { sel = i; paint(); }
  });

  controls.append(
    choice('Layer', LAYERS.map((L, i) => [i, `${L.n} ${L.name}`]), {
      value: 2, on: (v) => { sel = +v; paint(); },
    }).node
  );

  function paint() {
    // Clicking a row on the canvas is not a control, so nothing else would
    // redraw the highlight it just moved.
    cv.once();
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

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 300,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      if (playing) { acc += dt; if (acc > 1.7) { acc = 0; hop = (hop + 1) % HOPS.length; } }
      const h = HOPS[hop];

      const boxes = [
        { n: 'Console', ip: '10.101.10.20', short: '.10.20' },
        { n: 'Switch A', ip: '', short: '' },
        { n: 'Router', ip: '.10.1 / .20.1', short: '.10.1/.20.1' },
        { n: 'Switch B', ip: '', short: '' },
        { n: 'Node', ip: '10.101.20.50', short: '.20.50' },
      ];
      // Five boxes share the width they have. The old floor of 96px each meant
      // 480px of boxes in 318px of canvas on a phone, so they printed over each
      // other; the addresses fall back to their last octets at that size.
      const gap = Math.max(4, w * 0.014);
      const bw = (w - 40 - gap * (boxes.length - 1)) / boxes.length;
      const bx = (i) => 20 + i * (bw + gap);
      const tight = bw < 88;
      boxes.forEach((b, i) => {
        const x = bx(i);
        const active = i === hop || i === hop + 1;
        box(g, x, 46, bw, 52, {
          fill: active ? alpha(p.cyan, 0.14) : p.surface,
          stroke: i === 2 ? p.amber : active ? p.cyan : p.line, r: 8, lw: i === 2 ? 2 : 1,
        });
        label(g, b.n, x + bw / 2, 66, { color: p.ink, size: 11.5, weight: 650, align: 'center', max: bw - 6 });
        const ip = tight ? b.short : b.ip;
        if (ip) label(g, ip, x + bw / 2, 84, { color: p.muted, size: 9.5, align: 'center', max: bw - 4, mono: true });
        if (i === 2) label(g, tight ? 'layer 3' : 'layer 3 boundary', x + bw / 2, 112,
          { color: p.amber, size: 9.5, align: 'center', max: bw * 2 });
      });

      // The segment currently carrying the packet
      const segX = bx(hop) + bw;
      box(g, segX, 68, Math.max(4, gap), 8, { fill: p.cyan, stroke: 'transparent', r: 4 });

      // The headers, layered. Each row is one claim, and on a narrow canvas the
      // source and the destination stack rather than being cut in half.
      const hx = 24, hw = w - 48;
      let hy = 140;
      const row = (indent, tone, kicker, src, dst) => {
        const x = hx + indent, iw = hw - indent * 2;
        const one = `${src}   →   ${dst}`;
        const fits = textWidth(g, one, { size: 12, weight: 600, mono: true }) <= iw - 24;
        const bh = fits ? 40 : 56;
        box(g, x, hy, iw, bh, { fill: alpha(tone, 0.14), stroke: tone, r: 7 });
        label(g, kicker, x + 12, hy + 13, { color: tone, size: 9.5, weight: 700, max: iw - 24 });
        if (fits) {
          label(g, one, x + 12, hy + 29, { color: p.ink, size: 12, weight: 600, max: iw - 24, mono: true });
        } else {
          label(g, src, x + 12, hy + 29, { color: p.ink, size: 12, weight: 600, max: iw - 24, mono: true });
          label(g, `→   ${dst}`, x + 12, hy + 45, { color: p.ink, size: 12, weight: 600, max: iw - 24, mono: true });
        }
        hy += bh + 6;
      };
      row(0, p.amber, 'LAYER 2 FRAME — rewritten every hop', `src ${MACS[h.srcMac]}`, `dst ${MACS[h.dstMac]}`);
      row(16, p.cyan, 'LAYER 3 PACKET — never changes', 'src 10.101.10.20', 'dst 10.101.20.50');
      row(32, p.green, 'LAYER 4 — never changes', 'src port 49152', 'dst port 5568');

      hy += 6;
      hy += labelWrap(g, `Hop ${hop + 1} of ${HOPS.length}: ${h.from} → ${h.to}   ·   on ${h.net}`,
        hx, hy, { color: p.ink2, size: 12, weight: 600, max: hw, maxLines: 2 });
      fit(hy + 10);
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

// ============================================================================
// How a device that knows nothing gets an address
// ============================================================================

register('dhcp-lease', (host) => {
  const STEPS = [
    { k: 'D', name: 'Discover', from: 'the new device', to: 'everybody',
      src: '0.0.0.0', dst: '255.255.255.255',
      what: 'It has no address, so it cannot send to anyone in particular. It shouts to the whole broadcast domain: is there a DHCP server here?' },
    { k: 'O', name: 'Offer', from: 'the server', to: 'the new device',
      src: '10.101.10.1', dst: 'the device, by MAC',
      what: 'A server that heard it picks a free address from its pool and offers it, along with the mask, the gateway and the DNS servers.' },
    { k: 'R', name: 'Request', from: 'the new device', to: 'everybody',
      src: '0.0.0.0', dst: '255.255.255.255',
      what: 'It broadcasts again, naming the offer it is taking. Broadcast, not unicast, so any other server that also offered knows to put its address back.' },
    { k: 'A', name: 'Acknowledge', from: 'the server', to: 'the new device',
      src: '10.101.10.1', dst: '10.101.10.57',
      what: 'Confirmed, with a lease time. The device now has an address it may use until roughly halfway through that lease, when it will ask to keep it.' },
  ];
  const st = { step: 0, servers: 1, lease: 86400 };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a device with no address gets one',
    sub: 'Four messages, and the first two have to be shouted because the device cannot yet address anybody. Discover, Offer, Request, Acknowledge.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    controls,
    draw(g, w, hgt, t) {
      const p = palette();
      const W = Math.min(640, w - 24), ox = (w - W) / 2;
      const S = STEPS[st.step];
      const none = st.servers === 0;

      // The device, the wire, the server or servers.
      const devX = ox + 66, srvX = ox + W - 66, midY = 74;
      const addr = none ? '169.254.11.7' : st.step >= 3 ? '10.101.10.57' : '0.0.0.0';
      box(g, devX - 62, midY - 26, 124, 52, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 7 });
      label(g, 'new device', devX, midY - 8, { color: p.cyan, size: 11, align: 'center', max: 116 });
      label(g, addr, devX, midY + 10, { color: none ? p.red : p.ink2, size: 11, align: 'center', max: 116, ...mono });

      if (none) {
        box(g, srvX - 62, midY - 26, 124, 52, { fill: alpha(p.line, 0.3), stroke: p.line, r: 7 });
        label(g, 'no server', srvX, midY, { color: p.muted, size: 11, align: 'center', max: 116 });
      } else {
        for (let i = 0; i < st.servers; i++) {
          const sy = midY + (st.servers > 1 ? (i === 0 ? -32 : 32) : 0);
          box(g, srvX - 62, sy - 22, 124, 44, {
            fill: alpha(i === 0 ? p.green : p.red, 0.14), stroke: i === 0 ? p.green : p.red, r: 7,
          });
          label(g, i === 0 ? 'DHCP server' : 'a second one', srvX, sy - 4,
            { color: i === 0 ? p.green : p.red, size: 10.5, align: 'center', max: 116 });
          label(g, i === 0 ? '10.101.10.x' : '192.168.1.x', srvX, sy + 11,
            { color: p.muted, size: 10, align: 'center', max: 116, ...mono });
        }
      }

      // The message in flight for the step being looked at.
      if (!none) {
        const toServer = st.step === 0 || st.step === 2;
        const u = (t * 0.6) % 1;
        const x = toServer ? lerp(devX + 62, srvX - 62, u) : lerp(srvX - 62, devX + 62, u);
        const bcast = st.step === 0 || st.step === 2;
        g.fillStyle = bcast ? p.amber : p.green;
        g.beginPath(); g.arc(x, midY, 6, 0, Math.PI * 2); g.fill();
        if (bcast) {
          // A broadcast reaches everything on the wire, so draw it doing that.
          g.strokeStyle = alpha(p.amber, 0.35); g.lineWidth = 1;
          for (const r of [12, 20, 28]) { g.beginPath(); g.arc(x, midY, r * (0.6 + u * 0.4), 0, Math.PI * 2); g.stroke(); }
        }
        line(g, devX + 62, midY, srvX - 62, midY, { color: alpha(p.line, 1), lw: 1.5 });
      }

      // The four letters, as a chain.
      let y = 138;
      const gap = 8;
      const bw = (W - gap * 3) / 4;
      STEPS.forEach((x2, i) => {
        const bx = ox + i * (bw + gap), on = i === st.step && !none;
        box(g, bx, y, bw, 42, {
          fill: on ? alpha(p.amber, 0.16) : alpha(p.raised, 0.6),
          stroke: on ? p.amber : p.line, r: 6, lw: on ? 2 : 1,
        });
        label(g, x2.k, bx + bw / 2, y + 15, { color: on ? p.amber : p.muted, size: 14, weight: 700, align: 'center', max: bw - 8, ...mono });
        label(g, x2.name, bx + bw / 2, y + 32, { color: on ? p.ink2 : p.muted, size: 9.5, align: 'center', max: bw - 6 });
      });
      y += 54;

      if (none) {
        y += labelWrap(g, 'No server answered, so after a few seconds the device gives itself an address in 169.254. It can now talk to anything else that did the same, and to nothing else at all. That is what a 169.254 address means every single time you see one: the device asked and nobody replied.',
          ox, y, { color: p.red, size: 12, max: W, maxLines: 4 });
      } else {
        label(g, `${S.from} → ${S.to}`, ox, y, { color: p.ink2, size: 11.5, weight: 650, max: W });
        y += 18;
        label(g, `src ${S.src}   dst ${S.dst}`, ox, y, { color: p.muted, size: 10.5, max: W, ...mono });
        y += 18;
        y += labelWrap(g, S.what, ox, y, { color: p.ink2, size: 11.5, max: W, maxLines: 3 }) + 6;
        if (st.step === 3) {
          const hrs = st.lease / 3600;
          y += labelWrap(g, `Lease ${hrs >= 1 ? `${hrs} hours` : `${st.lease / 60} minutes`}. It will ask to renew at about half of that, and if the server has gone by then it keeps the address until the lease runs out and only then falls back to 169.254.`,
            ox, y, { color: p.muted, size: 11, max: W, maxLines: 3 });
        }
      }
      fit(y + 16);
    },
  });

  const upd = () => {
    if (st.servers === 0) setNote('<b>169.254 is not an address, it is a complaint.</b> The device asked four times, nobody answered, and it gave itself something so it could at least talk to other machines in the same position. On a show this is the single most common network fault and the fastest to diagnose: a 169.254 address means DHCP was expected and no server replied, so either the server is off, or you are on the wrong VLAN, or the link is not what you think it is.');
    else if (st.servers === 2) setNote('<b>Two DHCP servers on one broadcast domain is a show-stopper, and an intermittent one.</b> Both hear the Discover and both offer; the device takes whichever arrives first, which is a race it wins differently every time it boots. Half the rig ends up on one subnet and half on the other, and the symptom is that some things can see each other and some cannot, apparently at random. It is almost always somebody plugging in a domestic router as a switch.');
    else if (st.step === 0) setNote('<b>The first message is a shout because it has to be.</b> The device has no address, does not know the server\'s address, and does not know the gateway. All it can do is broadcast to the whole domain and hope something is listening. This is also why DHCP does not cross a router without help: a broadcast stops at the router, so a relay has to carry it over.');
    else if (st.step === 2) setNote('<b>The Request is broadcast too, and that is deliberate.</b> The device names the offer it is accepting, out loud, so any other server that also offered an address hears that it was not chosen and returns that address to its pool. Sent quietly to one server, every other server would hold an address that nobody is using.');
    else setNote('<b>Four messages: Discover, Offer, Request, Acknowledge.</b> At the end the device has an address, a mask, a gateway and a DNS server, and a lease saying how long it may keep them. It will try to renew at about halfway through. The whole exchange usually takes under a second, which is why it feels like plugging in simply works.');
  };

  controls.append(
    choice('Step', STEPS.map((s, i) => [String(i), `${s.k} · ${s.name}`]), { value: '0', on: (v) => { st.step = +v; upd(); } }).node,
    choice('On this wire', [['1', 'One DHCP server'], ['2', 'Two servers'], ['0', 'No server at all']],
      { value: '1', on: (v) => { st.servers = +v; upd(); } }).node,
    choice('Lease', [['600', '10 minutes'], ['86400', '24 hours']], { value: '86400', on: (v) => { st.lease = +v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// A VPN on a show laptop: which destinations still leave by the show NIC
// ============================================================================

register('vpn-routes', (host) => {
  // What a laptop on a show network actually tries to reach, and how each one
  // is matched. The routing table picks the most specific match, which is the
  // whole reason some of this survives a tunnel and some of it does not.
  const DESTS = [
    { k: 'local', label: 'A node on this subnet', addr: '10.101.10.40', why: 'sACN unicast, a web page on a node, ping',
      match: 'on-link 10.101.10.0/24' },
    { k: 'other', label: 'A node on another subnet', addr: '10.101.20.40', why: 'the audio VLAN, through the show router',
      match: 'default route' },
    { k: 'mcast', label: 'sACN multicast', addr: '239.255.0.1', why: 'the normal way lighting data moves',
      match: 'multicast, per interface' },
    { k: 'mdns', label: 'Dante discovery', addr: '224.0.0.251', why: 'mDNS, how Dante Controller finds anything',
      match: 'multicast, per interface' },
    { k: 'bcast', label: 'Art-Net broadcast', addr: '10.255.255.255', why: 'older nodes, and Art-Net polling',
      match: 'broadcast, per interface' },
    { k: 'net', label: 'A licence server', addr: '198.51.100.9', why: 'the thing the VPN was turned on for',
      match: 'default route' },
  ];
  const MODES = {
    off: { label: 'VPN off', note: 'One interface, one default route.' },
    split: { label: 'Split tunnel', note: 'Only the company prefixes go into the tunnel.' },
    full: { label: 'Full tunnel', note: 'The default route points at the tunnel.' },
    blocked: { label: 'Full tunnel, LAN access blocked', note: 'The client also refuses local traffic.' },
  };
  const st = { mode: 'off', overlap: false };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'What a VPN does to a show laptop',
    sub: 'A VPN does not encrypt your show network. It adds a second interface and rewrites the routing table, and the routing table is what decides which of these still reaches anything.',
    note: '&nbsp;',
  });

  challenge('Find the setting where the licence server works and every show destination still does, then break it with a company range that overlaps the show.',
    () => st.mode === 'split' && st.overlap);

  // Where each destination goes. Directly connected routes beat a default
  // route, which is why same-subnet traffic normally survives a full tunnel.
  const routeOf = (d) => {
    if (st.mode === 'off') return d.k === 'net' ? 'wan' : 'show';
    if (st.mode === 'blocked') return d.k === 'net' ? 'tunnel' : 'dropped';
    const localish = d.k === 'local' || d.k === 'mcast' || d.k === 'mdns' || d.k === 'bcast';
    if (st.mode === 'split') {
      if (d.k === 'net') return 'tunnel';
      if (st.overlap) return 'tunnel';                  // the company claims 10/8
      return 'show';
    }
    // Full tunnel: on-link survives, everything routed does not. Multicast and
    // broadcast depend on the client, and most of them do not carry it.
    if (d.k === 'local') return 'show';
    if (localish) return 'maybe';
    return 'tunnel';
  };

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 340,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(680, w - 24), ox = (w - W) / 2;
      const stacked = W < 520;

      // The two interfaces the laptop now has.
      const ifH = 40;
      const half = (W - 12) / 2;
      const on = st.mode !== 'off';
      box(g, ox, 18, half, ifH, { fill: alpha(p.cyan, 0.14), stroke: p.cyan, r: 7 });
      label(g, 'show NIC  10.101.10.20/24', ox + 10, 38, { color: p.cyan, size: 11, max: half - 20, ...mono });
      box(g, ox + half + 12, 18, half, ifH, {
        fill: on ? alpha(p.amber, 0.14) : alpha(p.line, 0.25),
        stroke: on ? p.amber : p.line, r: 7, lw: on ? 2 : 1,
      });
      label(g, on ? 'VPN adapter  10.8.0.6' : 'VPN adapter  (down)', ox + half + 22, 38,
        { color: on ? p.amber : p.muted, size: 11, max: half - 20, ...mono });

      let y = 72;
      label(g, MODES[st.mode].note + (st.overlap && st.mode !== 'off' ? '  The company claims 10.0.0.0/8.' : ''),
        ox, y, { color: p.muted, size: 11, max: W });
      y += 16;

      // One row per destination: what it is, and where it actually goes.
      const rowH = stacked ? 46 : 34;
      const nameW = stacked ? W : clamp(W * 0.34, 150, 240);
      const addrW = stacked ? 0 : clamp(W * 0.2, 110, 150);
      const OUT = {
        show: ['out the show NIC', p.green],
        wan: ['out to the internet', p.green],
        tunnel: ['into the tunnel', p.amber],
        maybe: ['most clients drop it', p.red],
        dropped: ['refused by the client', p.red],
      };
      DESTS.forEach((d, i) => {
        const ry = y + i * rowH;
        const r = routeOf(d);
        const [txt, col] = OUT[r];
        const bad = r === 'maybe' || r === 'dropped' || (r === 'tunnel' && d.k !== 'net');
        label(g, d.label, ox, ry + 12, { color: p.ink2, size: 11.5, weight: 600, max: nameW - 8 });
        label(g, d.why, ox, ry + 26, { color: p.muted, size: 9.5, max: stacked ? W : nameW - 8 });
        if (!stacked) label(g, d.addr, ox + nameW, ry + 12, { color: p.muted, size: 10.5, max: addrW - 8, ...mono });
        const tx = stacked ? ox : ox + nameW + addrW;
        const tw = stacked ? W : W - nameW - addrW;
        const ty = stacked ? ry + 38 : ry + 12;
        box(g, tx, ty - 10, Math.min(tw, textWidth(g, txt, { size: 10.5 }) + 18), 20,
          { fill: alpha(col, bad ? 0.16 : 0.14), stroke: col, r: 4, lw: 1 });
        label(g, txt, tx + 9, ty, { color: col, size: 10.5, weight: 600, max: tw - 18 });
      });
      y += DESTS.length * rowH + 8;

      const broken = DESTS.filter((d) => d.k !== 'net' && routeOf(d) !== 'show').length;
      const summary = broken > 0
        ? `${broken} of the five show destinations no longer reach anything. Nothing is broken on the network and nothing is broken on the node; the laptop simply decided to send them somewhere else.`
        : st.mode === 'off'
          ? 'Everything leaves by the interface it should. This is the state you are trying to get back to.'
          : 'Every show destination still leaves by the show NIC, and the licence server goes down the tunnel. This is the only arrangement that is both useful and safe, and it depends entirely on the company range not overlapping the show range.';
      y += labelWrap(g, summary, ox, y, { color: broken === 0 ? p.green : p.red, size: 11.5, max: W, maxLines: 3 });
      fit(y + 18);
    },
  });

  const upd = () => {
    if (st.mode === 'off') setNote('<b>One interface, one default route, and everything behaves.</b> Worth looking at before the others, because this is the state you are trying to get back to. Note that the licence server and the node leave by different routes for different reasons: the node because it is on this wire, the server because it is not.');
    else if (st.mode === 'blocked') setNote('<b>This is the one that makes people think the node is dead.</b> Many corporate clients have a setting that refuses local network access while connected, on the grounds that a laptop bridging a hostile LAN and the company network is a risk. It is a reasonable position and it makes the machine useless for show control. The link light is on, the address is right, and nothing answers.');
    else if (st.mode === 'full') setNote('<b>Same subnet still works, and almost nothing else does.</b> A directly connected route is more specific than a default route, so unicast to a node on your own wire survives. Anything through the show router is now going to the tunnel instead. Multicast and broadcast are worse: sACN, Art-Net polling and Dante’s mDNS discovery are not carried by most clients, so the console sees no nodes and Dante Controller sees an empty list, which reads as a hardware fault and is not one.');
    else if (st.overlap) setNote('<b>Split tunnel, and the company range swallowed the show.</b> The tunnel claims 10.0.0.0/8 because somebody at head office picked it years ago, and your show is on 10.101.x. That is more specific than nothing and it is applied first, so every show address now goes to a concentrator in another country. This is the failure that survives every obvious check: the addresses are right, the mask is right, the cable is right.');
    else setNote('<b>Split tunnel is the arrangement to ask for.</b> Only the company prefixes go into the tunnel and everything else keeps its normal route, so the licence check works and the rig still answers. Ask which prefixes it claims before you trust it, and put the answer on the IP schedule next to everything else.');
  };

  controls.append(
    choice('VPN', Object.entries(MODES).map(([k, v]) => [k, v.label]), { value: 'off', on: (v) => { st.mode = v; upd(); } }).node,
    toggle('Company range overlaps the show', { on: (v) => { st.overlap = v; upd(); } }).node
  );
  upd();
});


// ============================================================================
// The five classes, and every address that is spoken for
// ============================================================================

register('address-classes', (host) => {
  // The class is decided by the leading bits of the first octet, which is why
  // the boundaries fall on 128, 192, 224 and 240 rather than on round numbers.
  const CLASSES = [
    { k: 'A', lo: 0, hi: 127, bits: '0', pfx: '/8', col: 'cyan', hosts: '16,777,214 hosts each', n: '128 networks' },
    { k: 'B', lo: 128, hi: 191, bits: '10', pfx: '/16', col: 'green', hosts: '65,534 hosts each', n: '16,384 networks' },
    { k: 'C', lo: 192, hi: 223, bits: '110', pfx: '/24', col: 'amber', hosts: '254 hosts each', n: '2,097,152 networks' },
    { k: 'D', lo: 224, hi: 239, bits: '1110', pfx: 'n/a', col: 'red', hosts: 'multicast groups', n: 'no hosts, no subnets' },
    { k: 'E', lo: 240, hi: 255, bits: '1111', pfx: 'n/a', col: 'muted', hosts: 'reserved, never used', n: 'experimental' },
  ];
  // Reserved blocks, in the order a match should be reported: most specific first.
  const SPECIAL = [
    { lo: '127.0.0.0', hi: '127.255.255.255', name: 'Loopback', why: 'Never leaves the machine. 127.0.0.1 is localhost, and the whole /8 is set aside for it, so 127.9.9.9 is your own machine too.' },
    { lo: '0.0.0.0', hi: '0.255.255.255', name: 'This network', why: 'As a source it means "I do not have an address yet", which is what a DHCP Discover uses. As a route it means the default route.' },
    { lo: '169.254.0.0', hi: '169.254.255.255', name: 'Link-local', why: 'What a device gives itself when DHCP does not answer. It can reach others that did the same and nothing else.' },
    { lo: '10.0.0.0', hi: '10.255.255.255', name: 'Private', why: 'RFC 1918. Never routed on the public internet, which is why every show network in the world can use it at once.' },
    { lo: '172.16.0.0', hi: '172.31.255.255', name: 'Private', why: 'RFC 1918, the awkward one: 172.16 to 172.31, not the whole of 172.' },
    { lo: '192.168.0.0', hi: '192.168.255.255', name: 'Private', why: 'RFC 1918, and the range every domestic router ships on.' },
    { lo: '224.0.0.0', hi: '224.0.0.255', name: 'Local multicast control', why: 'Never forwarded by a router, whatever the TTL says. 224.0.0.1 is every host on this wire, 224.0.0.251 is mDNS, which is how Dante finds anything.' },
    { lo: '239.0.0.0', hi: '239.255.255.255', name: 'Organisation-local multicast', why: 'Scoped to your site by design. sACN lives at 239.255.0.0/16, one group per universe, which is exactly why it does not leak onto the internet.' },
    { lo: '255.255.255.255', hi: '255.255.255.255', name: 'Limited broadcast', why: 'Everything on this wire, and no router ever forwards it. This is what a DHCP Discover is addressed to.' },
    { lo: '2.0.0.0', hi: '2.255.255.255', name: 'Ordinary public space, and the Art-Net trap', why: 'Perfectly normal public addresses that Art-Net gear has shipped on for decades. Nothing reserved about it, which is the problem.' },
  ];
  const toInt = (ip) => ip.split('.').reduce((a, o) => a * 256 + (+o), 0) >>> 0;

  const st = { oct: 239, rest: '255.0.1' };
  const { controls, stage, setNote } = figure(host, {
    title: 'The five classes, and every address that is already spoken for',
    sub: 'Classful addressing has been obsolete since 1993 and the vocabulary is still in every manual. The rule is one thing: the leading bits of the first octet.',
    note: '&nbsp;',
  });

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(680, w - 24), ox = (w - W) / 2;
      const cls = CLASSES.find((c) => st.oct >= c.lo && st.oct <= c.hi);
      const col = p[cls.col] || p.muted;
      const addr = `${st.oct}.${st.rest}`;
      const ai = toInt(addr);

      // The whole first-octet space, to scale, so the halving is visible.
      const barY = 22, barH = 30;
      CLASSES.forEach((c) => {
        const x = ox + (c.lo / 256) * W;
        const bw = ((c.hi - c.lo + 1) / 256) * W;
        const on = c === cls;
        box(g, x, barY, bw - 1, barH, {
          fill: alpha(p[c.col] || p.muted, on ? 0.5 : 0.16),
          stroke: on ? (p[c.col] || p.muted) : 'transparent', r: 3, lw: on ? 2 : 0,
        });
        if (bw > 22) label(g, c.k, x + bw / 2, barY + barH / 2,
          { color: on ? p.ink : p.muted, size: 12, weight: 700, align: 'center', max: bw - 4, ...mono });
      });
      label(g, '0', ox, barY + barH + 12, { color: p.muted, size: 9.5, max: 30, ...mono });
      label(g, '255', ox + W, barY + barH + 12, { color: p.muted, size: 9.5, align: 'right', max: 30, ...mono });
      for (const b of [128, 192, 224, 240]) {
        const x = ox + (b / 256) * W;
        line(g, x, barY, x, barY + barH + 4, { color: alpha(p.line, 1), lw: 1 });
        label(g, String(b), x, barY + barH + 12, { color: p.muted, size: 9.5, align: 'center', max: 40, ...mono });
      }

      // The first octet in binary, with the bits that decided it lit.
      let y = barY + barH + 30;
      const b8 = (st.oct >>> 0).toString(2).padStart(8, '0');
      const cw = Math.min(30, (W - 130) / 8);
      label(g, `${st.oct} =`, ox, y + 12, { color: p.muted, size: 12, max: 60, ...mono });
      b8.split('').forEach((bit, i) => {
        const x = ox + 60 + i * cw;
        const decided = i < cls.bits.length;
        box(g, x, y, cw - 3, 26, {
          fill: decided ? alpha(col, 0.35) : alpha(p.line, 0.3), stroke: decided ? col : 'transparent', r: 3, lw: 1,
        });
        label(g, bit, x + (cw - 3) / 2, y + 13, { color: decided ? p.ink : p.muted, size: 13, weight: 700, align: 'center', max: cw, ...mono });
      });
      label(g, `starts ${cls.bits} → class ${cls.k}`, ox + 60 + 8 * cw + 12, y + 13,
        { color: col, size: 11.5, weight: 650, max: Math.max(20, ox + W - (ox + 60 + 8 * cw + 12)) });
      y += 38;

      label(g, `Class ${cls.k}: ${cls.n}, ${cls.hosts}${cls.pfx !== 'n/a' ? `, default mask ${cls.pfx}` : ''}`,
        ox, y, { color: p.ink2, size: 11.5, max: W });
      y += 20;

      // Is this address already spoken for?
      const hit = SPECIAL.find((sp) => ai >= toInt(sp.lo) && ai <= toInt(sp.hi));
      const bcast = st.rest === '255.255.255' || addr === '255.255.255.255';
      if (hit) {
        box(g, ox, y, W, 28, { fill: alpha(p.amber, 0.14), stroke: p.amber, r: 6 });
        label(g, `${addr} is in ${hit.lo}–${hit.hi}: ${hit.name}`, ox + 10, y + 14,
          { color: p.amber, size: 11.5, weight: 650, max: W - 20 });
        y += 36;
        y += labelWrap(g, hit.why, ox, y, { color: p.ink2, size: 11.5, max: W, maxLines: 3 }) + 8;
      } else {
        box(g, ox, y, W, 28, { fill: alpha(p.green, 0.12), stroke: p.green, r: 6 });
        label(g, `${addr} is ordinary public address space, assigned to somebody`, ox + 10, y + 14,
          { color: p.green, size: 11.5, weight: 650, max: W - 20 });
        y += 36;
      }
      if (bcast) {
        y += labelWrap(g, 'All host bits set to one is the broadcast address for that network, and it is never a usable host address. On a /24 that is .255; on a /8 it is x.255.255.255.',
          ox, y, { color: p.muted, size: 11, max: W, maxLines: 2 }) + 6;
      }
      fit(y + 14);
    },
  });

  const upd = () => {
    const cls = CLASSES.find((c) => st.oct >= c.lo && c.hi >= st.oct);
    const addr = `${st.oct}.${st.rest}`;
    const ai = toInt(addr);
    const hit = SPECIAL.find((sp) => ai >= toInt(sp.lo) && ai <= toInt(sp.hi));
    if (cls.k === 'D') setNote('<b>Class D is multicast, and it is the one class you still use every day.</b> A class D address is not a machine, it is a group: anything that wants that stream joins the group and the switches work out where to deliver it. sACN puts one universe on one group inside 239.255.0.0/16, which is organisation-local scope, meaning it is scoped to your site on purpose. 224.0.0.x is the local control range and no router ever forwards it, which is where mDNS lives and therefore how Dante Controller finds anything.');
    else if (cls.k === 'E') setNote('<b>Class E was reserved in 1981 for future use and the future never arrived.</b> 240.0.0.0 upwards is still set aside, most stacks refuse to route it, and proposals to release it appear every few years and go nowhere. It is worth a sentence only so that you recognise it as unusable rather than as a mistake.');
    else if (hit && hit.name === 'Loopback') setNote('<b>127 is your own machine, and the whole /8 is spent on it.</b> Sixteen million addresses reserved so that a packet to any of them never reaches a wire. That is why localhost still works with the cable out, and why a service listening on 127.0.0.1 is invisible to everything else on the network no matter how correct your addressing is. That last one costs students an afternoon at least once.');
    else if (hit && hit.name === 'Private') setNote('<b>Private ranges are the reason every show network can use the same numbers.</b> 10.0.0.0/8, 172.16 to 172.31, and 192.168 are guaranteed never to be routed on the public internet, so they are yours to design with. That is also why they collide with company VPN ranges, and why the Art-Net trap on 2.x.x.x is such a shock: 2 is ordinary public space that somebody actually owns.');
    else setNote(`<b>The class is decided by the leading bits, and nothing else.</b> A leading 0 is class A, 10 is class B, 110 is class C, 1110 is multicast and 1111 is reserved. That is why the boundaries fall on 128, 192, 224 and 240 rather than anywhere sensible looking. CIDR replaced the whole idea in 1993, because a class B was too big for almost everybody and a class C was too small, and now the mask is written down instead of guessed from the address. The words survive in manuals, and this is what they meant.`);
  };

  controls.append(
    slider('First octet', { min: 0, max: 255, step: 1, value: 239, fmt: (v) => `${v}`, on: (v) => { st.oct = v; upd(); } }).node,
    choice('The rest', [['255.0.1', '.255.0.1'], ['0.0.1', '.0.0.1'], ['101.1.20', '.101.1.20'], ['255.255.255', '.255.255.255']],
      { value: '255.0.1', on: (v) => { st.rest = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// Two switches, one loop, and no time to live
// ============================================================================

register('broadcast-storm', (host) => {
  const st = { loop: false, stp: false, t: 0 };
  const { controls, stage, setNote, challenge } = figure(host, {
    title: 'Two switches, one spare cable, and the network is gone',
    sub: 'One broadcast frame into a loop. An IP packet has a time to live that counts down; an Ethernet frame has nothing of the kind, so nothing ever stops it.',
    note: '&nbsp;',
  });

  challenge('Make the storm, then stop it without unplugging anything.',
    () => st.loop && st.stp);

  let elapsed = 0;

  let cv;
  const fit = fitter(() => cv);
  cv = canvas(stage, {
    height: 320,
    controls,
    draw(g, w, hgt, t, dt) {
      const p = palette();
      const W = Math.min(660, w - 24), ox = (w - W) / 2;
      const storming = st.loop && !st.stp;
      if (storming) elapsed = Math.min(6, elapsed + dt);
      else elapsed = 0;

      // Copies double on every pass round the loop. A pass is quick, so this
      // is deliberately slowed; the shape is the honest part, not the clock.
      const passes = Math.floor(elapsed * 6);
      const copies = storming ? Math.min(2 ** passes, 2 ** 20) : 1;
      const load = storming ? Math.min(1, copies / 4096) : 0.02;

      const ax = ox + W * 0.28, bx = ox + W * 0.72, sy = 76;
      const bw = Math.min(150, W * 0.3);

      // The two links between the switches. The second one is the whole story.
      const linkCol = storming ? p.red : p.cyan;
      line(g, ax + bw / 2, sy + 6, bx - bw / 2, sy + 6, { color: alpha(linkCol, 0.9), lw: storming ? 4 : 2 });
      if (st.loop) {
        const blocked = st.stp;
        line(g, ax + bw / 2, sy + 30, bx - bw / 2, sy + 30, {
          color: blocked ? alpha(p.muted, 0.7) : alpha(linkCol, 0.9),
          lw: storming ? 4 : 2, dash: blocked ? [5, 4] : undefined,
        });
        if (blocked) {
          const mx = (ax + bx) / 2;
          box(g, mx - 34, sy + 20, 68, 20, { fill: alpha(p.amber, 0.18), stroke: p.amber, r: 4 });
          label(g, 'blocked', mx, sy + 30, { color: p.amber, size: 10, align: 'center', max: 62 });
        }
      }

      for (const [x, name] of [[ax, 'Switch A'], [bx, 'Switch B']]) {
        box(g, x - bw / 2, sy - 24, bw, 44, {
          fill: storming ? alpha(p.red, 0.16) : alpha(p.cyan, 0.12),
          stroke: storming ? p.red : p.cyan, r: 7, lw: 2,
        });
        label(g, name, x, sy - 2, { color: storming ? p.red : p.cyan, size: 12, weight: 650, align: 'center', max: bw - 10 });
      }

      // Frames on the wire.
      if (st.loop || true) {
        const n = storming ? Math.min(14, 2 + passes * 2) : 1;
        for (let i = 0; i < n; i++) {
          const u = ((t * (storming ? 1.6 : 0.5)) + i / n) % 1;
          const onLower = st.loop && !st.stp && i % 2 === 1;
          const yy = sy + (onLower ? 30 : 6);
          const x = onLower ? lerp(bx - bw / 2, ax + bw / 2, u) : lerp(ax + bw / 2, bx - bw / 2, u);
          g.fillStyle = storming ? p.red : p.amber;
          g.beginPath(); g.arc(x, yy, 4, 0, Math.PI * 2); g.fill();
        }
      }

      let y = sy + 64;
      // What the wire is carrying.
      label(g, 'link utilisation', ox, y + 9, { color: p.muted, size: 10.5, max: 110, ...mono });
      const barX = ox + 118, barW = W - 178;
      box(g, barX, y, barW, 16, { fill: alpha(p.line, 0.4), stroke: 'transparent', r: 3 });
      box(g, barX, y, Math.max(2, barW * load), 16,
        { fill: alpha(load > 0.7 ? p.red : load > 0.3 ? p.amber : p.green, 0.6), stroke: load > 0.7 ? p.red : p.green, r: 3, lw: 1 });
      label(g, `${(load * 100).toFixed(0)} %`, ox + W, y + 9, { color: p.ink2, size: 11, align: 'right', max: 54, ...mono });
      y += 28;

      const rows = storming
        ? [[`copies of one frame: ${copies.toLocaleString('en-US')}`, p.red],
          ['the MAC table is relearning the same address on both ports, many times a second', p.red],
          ['no frame has ever been discarded, because nothing counts them down', p.red]]
        : st.loop
          ? [['one path forwarding, one path blocked, and the loop is still physically there', p.green],
            ['if the forwarding path fails, the blocked one takes over in about a second', p.muted],
            ['nothing was unplugged; the switches agreed which link to stop using', p.muted]]
          : [['one path, no loop, and a broadcast is delivered once to every port', p.green],
            ['this is the state you think you are in when somebody adds a spare cable', p.muted],
            ['add the second link below and watch what a frame with no time to live does', p.muted]];
      for (const [txt, col] of rows) {
        y += labelWrap(g, txt, ox, y, { color: col, size: 11.5, max: W, maxLines: 2 }) + 5;
      }
      fit(y + 12);
    },
  });

  const upd = () => {
    if (st.loop && !st.stp) setNote('<b>Nothing here is faulty. Every device is doing exactly its job.</b> Switch A floods a broadcast out of every port except the one it arrived on, which includes the second link. Switch B does the same and sends it back. An IP packet carries a time to live that every router decrements, and a frame at layer 2 carries nothing of the kind, so the copies never die: they double on every pass. In a few seconds the link is full, both switches are spending everything on flooding, and their MAC tables are relearning the same source address on alternating ports many times a second. The whole network stops, including the parts nowhere near the loop. Unplug either cable and it clears instantly, which is how it is usually found.');
    else if (st.loop && st.stp) setNote('<b>Spanning tree leaves the cable in and stops using it.</b> The switches talk to each other, agree which path to keep and put the other into a blocking state, so there is one active path and no loop. Take the working path away and the blocked one comes up: RSTP does that in about a second, the original 1990 spanning tree took thirty to fifty, which on a show is the difference between a glitch and a cue that does not happen. If your switches support it, this is what redundancy is supposed to look like.');
    else setNote('<b>One path between two switches, and a broadcast reaches every port once.</b> This is the state everybody assumes they are in. It stops being true the moment somebody patches a spare cable between two panels to be helpful, or plugs both ends of a ring into a rack that was never configured for one, or cross-patches a Dante secondary network into the primary switch.');
  };

  controls.append(
    toggle('A second cable between them', { on: (v) => { st.loop = v; elapsed = 0; upd(); } }).node,
    toggle('Spanning tree running', { on: (v) => { st.stp = v; elapsed = 0; upd(); } }).node
  );
  upd();
});
