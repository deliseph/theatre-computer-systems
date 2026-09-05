// The calculators.
//
// Every tool prints its working, not just its answer. That is deliberate: the
// exam awards method marks, and a student who reads only the result has
// outsourced the one skill being assessed.

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// --- IPv4 helpers -----------------------------------------------------------

const ipToInt = (ip) => ip.trim().split('.').reduce((a, o) => a * 256 + (+o), 0) >>> 0;
const intToIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskOf = (p) => (p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0);
const validIp = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim()) && ip.trim().split('.').every((o) => +o >= 0 && +o <= 255);
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, '0')).join('.');

function subnetFacts(ip, prefix) {
  const m = maskOf(prefix);
  const net = (ipToInt(ip) & m) >>> 0;
  const bcast = (net | (~m >>> 0)) >>> 0;
  const size = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : size - 2;
  return {
    mask: intToIp(m), wildcard: intToIp(~m >>> 0),
    network: intToIp(net), broadcast: intToIp(bcast),
    first: prefix >= 31 ? intToIp(net) : intToIp(net + 1),
    last: prefix >= 31 ? intToIp(bcast) : intToIp(bcast - 1),
    size, usable, netInt: net,
    lastMaskOctet: (m >>> (prefix > 24 ? 0 : prefix > 16 ? 8 : prefix > 8 ? 16 : 24)) & 255,
  };
}

// Which octet the prefix lands in, and the block size within it. This is the
// method taught in class, so the tool must show the same arithmetic.
function blockMath(prefix) {
  const octet = Math.min(3, Math.floor(prefix / 8));
  const bitsInOctet = prefix - octet * 8;
  const maskOctet = bitsInOctet === 0 ? 0 : (256 - 2 ** (8 - bitsInOctet));
  return { octet, maskOctet, block: 256 - maskOctet || 256 };
}

// --- Shared field builders --------------------------------------------------

const field = (label, inner) => `<div class="field"><label>${label}</label>${inner}</div>`;
const inp = (id, val, attrs = '') => `<input id="${id}" value="${val}" ${attrs}>`;
const sel = (id, opts, cur) =>
  `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;

const readout = (big, sub, cls = '') =>
  `<div class="readout ${cls}"><div class="readout-big">${big}</div><div class="readout-sub">${sub}</div></div>`;

// ============================================================================
// Tools
// ============================================================================

const TOOLS = {};

// --- Subnet calculator ------------------------------------------------------

TOOLS.subnet = (root) => {
  root.append(h(`<p class="tool-sub">The four answers a technician needs, with the block-size method
    shown the way it is taught in class. Try <code>10.101.3.150 /26</code>.</p>`));
  root.append(h(`<div class="fields">
    ${field('IP address', inp('sn-ip', '10.101.3.150'))}
    ${field('Prefix', sel('sn-p', Array.from({ length: 25 }, (_, i) => [i + 8, `/${i + 8}  ${intToIp(maskOf(i + 8))}`]), 26))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const ip = $('#sn-ip').value;
    const p = +$('#sn-p').value;
    if (!validIp(ip)) {
      out.innerHTML = readout('Not a valid address', 'Four numbers, each 0 to 255, separated by dots.', 'fail');
      return;
    }
    const f = subnetFacts(ip, p);
    const bm = blockMath(p);
    const octetName = ['first', 'second', 'third', 'fourth'][bm.octet];
    out.innerHTML =
      readout(`${f.network}/${p}`, `Network address. ${f.usable.toLocaleString()} usable hosts, from ${f.first} to ${f.last}.`) +
      `<div class="table-wrap"><table><tbody>
        <tr><td>Subnet mask</td><td><code>${f.mask}</code></td></tr>
        <tr><td>Wildcard</td><td><code>${f.wildcard}</code></td></tr>
        <tr><td><b>Network address</b></td><td><code>${f.network}</code> (not assignable)</td></tr>
        <tr><td><b>First usable</b></td><td><code>${f.first}</code></td></tr>
        <tr><td><b>Last usable</b></td><td><code>${f.last}</code></td></tr>
        <tr><td><b>Broadcast address</b></td><td><code>${f.broadcast}</code> (not assignable)</td></tr>
        <tr><td>Block size</td><td>${f.size.toLocaleString()} addresses</td></tr>
        <tr><td>Usable hosts</td><td>${f.usable.toLocaleString()}</td></tr>
      </tbody></table></div>` +
      `<pre class="working">The method, step by step

1. Block size  = 256 − ${bm.maskOctet}  = <b>${bm.block}</b>
   (${bm.maskOctet} is the last non-zero mask octet of ${f.mask})

2. In the ${octetName} octet the subnets run in steps of ${bm.block}:
   ${blockList(bm, ip)}
   ${ip.split('.')[bm.octet]} falls inside the block starting at ${f.network.split('.')[bm.octet]}

3. Network   = <b>${f.network}</b>   (first in the block)
   Broadcast = <b>${f.broadcast}</b>   (last in the block)
   Usable    = ${f.first} to ${f.last}

4. Usable hosts = 2^(32−${p}) − 2 = ${f.size.toLocaleString()} − 2 = <b>${f.usable.toLocaleString()}</b>

In binary
   address ${toBin(ipToInt(ip))}
   mask    ${toBin(maskOf(p))}
           ${'^'.repeat(p > 24 ? p + 3 : p > 16 ? p + 2 : p > 8 ? p + 1 : p)} network portion</pre>`;
  };

  function blockList(bm, ip) {
    const parts = [];
    for (let v = 0; v < 256 && parts.length < 9; v += bm.block) parts.push(`${v} to ${v + bm.block - 1}`);
    if (256 / bm.block > 9) parts.push('…');
    return parts.join(', ');
  }

  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- Subnet splitter --------------------------------------------------------

TOOLS.split = (root) => {
  root.append(h(`<p class="tool-sub">Divide a range into equal subnets. This is the planning skill:
    borrow enough bits that 2^bits is at least the number of networks you need.</p>`));
  root.append(h(`<div class="fields">
    ${field('Base network', inp('sp-ip', '10.101.1.0'))}
    ${field('Base prefix', sel('sp-p', Array.from({ length: 17 }, (_, i) => [i + 8, `/${i + 8}`]), 24))}
    ${field('Subnets needed', inp('sp-n', '4', 'type="number" min="2" max="64"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const ip = $('#sp-ip').value;
    const base = +$('#sp-p').value;
    const want = Math.max(2, Math.min(64, num($('#sp-n').value, 4)));
    if (!validIp(ip)) { out.innerHTML = readout('Not a valid address', 'Check the four octets.', 'fail'); return; }

    const bits = Math.ceil(Math.log2(want));
    const np = base + bits;
    if (np > 30) { out.innerHTML = readout('Too many subnets', `A /${base} cannot be split ${want} ways and still leave usable hosts.`, 'fail'); return; }

    const f0 = subnetFacts(ip, base);
    const block = 2 ** (32 - np);
    const rows = [];
    for (let i = 0; i < 2 ** bits; i++) {
      const netInt = (f0.netInt + i * block) >>> 0;
      const s = subnetFacts(intToIp(netInt), np);
      rows.push(`<tr><td>${i + 1}${i < want ? '' : ' <span style="opacity:.5">(spare)</span>'}</td>
        <td><code>${s.network}/${np}</code></td>
        <td><code>${s.first}</code> to <code>${s.last}</code></td>
        <td><code>${s.broadcast}</code></td><td>${s.usable}</td></tr>`);
    }

    out.innerHTML =
      readout(`/${np}`, `${2 ** bits} subnets of ${subnetFacts(ip, np).usable} usable hosts each. Mask ${intToIp(maskOf(np))}.`) +
      `<pre class="working">To get ${want} subnets you must borrow enough bits that 2^bits ≥ ${want}

   2^${bits} = ${2 ** bits}  ≥ ${want}   so borrow <b>${bits} bits</b>

   /${base} + ${bits} = <b>/${np}</b>      mask ${intToIp(maskOf(np))}
   Block size = 2^(32−${np}) = <b>${block}</b> addresses
   Usable per subnet = ${block} − 2 = <b>${subnetFacts(ip, np).usable}</b></pre>` +
      `<div class="table-wrap"><table><thead><tr><th>#</th><th>Network</th><th>Usable range</th><th>Broadcast</th><th>Hosts</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- VLAN planner -----------------------------------------------------------

TOOLS.vlan = (root) => {
  root.append(h(`<p class="tool-sub">Plan the separation, then produce the paperwork. The convention
    here matches the VLAN ID to the third octet, so anyone reading <code>10.101.20.14</code> knows it
    is audio on VLAN 20 without opening a document.</p>`));
  root.append(h(`<div class="fields">
    ${field('Base', inp('vl-base', '10.101'))}
    ${field('Ports per VLAN', inp('vl-ports', '6', 'type="number" min="1" max="24"'))}
    ${field('First port', inp('vl-start', '1', 'type="number" min="1"'))}
  </div>`));
  root.append(h(`<div class="chip-row" id="vl-chips"></div>`));
  const out = h('<div></div>');
  root.append(out);

  const DEPTS = [
    { id: 10, name: 'LX', label: 'Lighting', carries: 'sACN, Art-Net, console to node', on: true },
    { id: 20, name: 'AUDIO', label: 'Audio', carries: 'Dante primary, console to stage box', on: true },
    { id: 30, name: 'VIDEO', label: 'Video', carries: 'NDI, media server to processor', on: true },
    { id: 40, name: 'COMMS', label: 'Comms', carries: 'Intercom, IP beltpacks', on: false },
    { id: 50, name: 'AUTO', label: 'Automation', carries: 'Motion control, safety monitoring', on: false },
    { id: 90, name: 'MGMT', label: 'Management', carries: 'Remote desktop, file copy, updates', on: true },
  ];

  $('#vl-chips', root).innerHTML = DEPTS.map(
    (d) => `<button class="chip${d.on ? ' on' : ''}" data-id="${d.id}">${d.label}</button>`
  ).join('');

  const run = () => {
    const base = $('#vl-base').value.trim().replace(/\.$/, '');
    const per = Math.max(1, num($('#vl-ports').value, 6));
    let port = Math.max(1, num($('#vl-start').value, 1));
    const chosen = DEPTS.filter((d) => $(`.chip[data-id="${d.id}"]`, root).classList.contains('on'));

    if (!/^\d{1,3}\.\d{1,3}$/.test(base)) {
      out.innerHTML = readout('Base must be two octets', 'For example 10.101, which becomes 10.101.&lt;vlan&gt;.0/24.', 'fail');
      return;
    }

    const rows = chosen.map((d) => {
      const from = port; const to = port + per - 1; port = to + 1;
      return `<tr><td><code>${d.id}</code></td><td><b>${d.name}</b></td>
        <td><code>${base}.${d.id}.0/24</code></td><td>${d.carries}</td>
        <td><code>${from}–${to}</code></td></tr>`;
    });
    const parkFrom = port;

    out.innerHTML =
      readout(`${chosen.length} VLANs`, `${base}.x.0/24 per department, 254 usable each. Ports ${$('#vl-start').value} to ${parkFrom - 1} assigned, ${parkFrom} upward parked.`) +
      `<div class="table-wrap"><table><thead><tr><th>VLAN</th><th>Name</th><th>Subnet</th><th>Carries</th><th>Ports</th></tr></thead><tbody>
        ${rows.join('')}
        <tr><td><code>999</code></td><td><b>PARKED</b></td><td>none</td><td>Every unused port, going nowhere</td><td><code>${parkFrom}+</code></td></tr>
      </tbody></table></div>` +
      `<pre class="working">Configuration order (wording differs by vendor, the sequence does not)

1. Create VLANs        ${chosen.map((d) => d.id).join(', ')}, 999
2. Device ports        access, untagged, one VLAN each
3. Switch-to-switch    trunk, tagged, carrying ${chosen.map((d) => d.id).join(', ')}
4. Native VLAN         set deliberately, identical at both ends
5. Unused ports        access, VLAN 999, going nowhere
6. Switch management   ${base}.90.1 on the management VLAN
7. Default password    changed, and written in the handover pack
8. <b>Save to non-volatile memory</b>   ← the step everyone forgets
9. Export the config    stored with the show paperwork

Host block convention inside each /24
   .1  to .9     infrastructure (switches, gateways)
   .10 to .49    consoles and servers
   .50 to .199   nodes and endpoints
   .200 up       temporary and test devices</pre>` +
      `<p class="note"><b>Remember.</b> These VLANs cannot talk to each other without a router, and on
       a show that is usually the entire point. Add inter-VLAN routing only where a specific named
       thing needs to cross, and then allow only that thing.</p>`;
  };

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chip.classList.toggle('on');
    run();
  });
  root.addEventListener('input', run);
  run();
};

// --- Data rate --------------------------------------------------------------

TOOLS.datarate = (root) => {
  root.append(h(`<p class="tool-sub">Will this fit down this wire? One uncompressed HD picture is
    bigger than a thousand channels of audio, and that comparison rearranges most people's
    intuitions permanently.</p>`));
  root.append(h(`<div class="chip-row">
    <button class="chip on" data-mode="audio">Audio</button>
    <button class="chip" data-mode="video">Video</button></div>`));
  const fields = h('<div></div>');
  const out = h('<div></div>');
  root.append(fields, out);
  let mode = 'audio';

  const paint = () => {
    fields.innerHTML = mode === 'audio'
      ? `<div class="fields">
          ${field('Channels', inp('dr-ch', '64', 'type="number" min="1"'))}
          ${field('Sample rate', sel('dr-sr', [[44100, '44.1 kHz'], [48000, '48 kHz'], [96000, '96 kHz'], [192000, '192 kHz']], 48000))}
          ${field('Bit depth', sel('dr-bd', [[16, '16 bit'], [24, '24 bit'], [32, '32 bit float']], 24))}
        </div>`
      : `<div class="fields">
          ${field('Width', inp('dr-w', '1920', 'type="number"'))}
          ${field('Height', inp('dr-h', '1080', 'type="number"'))}
          ${field('Frame rate', sel('dr-f', [[24, '24'], [25, '25'], [30, '30'], [50, '50'], [60, '60'], [120, '120']], 60))}
          ${field('Chroma', sel('dr-c', [[3, '4:4:4 (full)'], [2, '4:2:2'], [1.5, '4:2:0']], 2))}
          ${field('Bit depth', sel('dr-bd2', [[8, '8 bit'], [10, '10 bit'], [12, '12 bit']], 10))}
        </div>`;
    run();
  };

  const run = () => {
    let bits, working, extra = '';
    if (mode === 'audio') {
      const ch = num($('#dr-ch')?.value, 64), sr = num($('#dr-sr')?.value, 48000), bd = num($('#dr-bd')?.value, 24);
      bits = ch * sr * bd;
      working = `channels × sample rate × bit depth

  ${ch} × ${sr.toLocaleString()} × ${bd}
  = <b>${bits.toLocaleString()} bit/s</b>
  = ${(bits / 1e6).toFixed(2)} Mbit/s of audio payload

  Per channel: ${sr.toLocaleString()} × ${bd} = ${((sr * bd) / 1e6).toFixed(3)} Mbit/s`;
      extra = `<p class="note">Add roughly 20 to 30 percent for packet overhead on a real network.
        Call it <b>${(bits * 1.25 / 1e6).toFixed(0)} Mbit/s</b> on the wire. Bandwidth is rarely the
        constraint in audio over IP. Clock and configuration are.</p>`;
    } else {
      const w = num($('#dr-w')?.value, 1920), ht = num($('#dr-h')?.value, 1080);
      const f = num($('#dr-f')?.value, 60), c = num($('#dr-c')?.value, 2), bd = num($('#dr-bd2')?.value, 10);
      const bpp = c * bd;
      bits = w * ht * f * bpp;
      working = `width × height × frame rate × bits per pixel

  Pixels per frame   ${w} × ${ht} = ${(w * ht).toLocaleString()}
  Pixels per second  × ${f} = ${(w * ht * f).toLocaleString()}
  Bits per pixel     ${c === 3 ? '3 components' : c === 2 ? '2 components average (4:2:2)' : '1.5 components average (4:2:0)'} × ${bd} bit = <b>${bpp}</b>

  = ${(w * ht * f).toLocaleString()} × ${bpp}
  = <b>${(bits / 1e9).toFixed(2)} Gbit/s</b> uncompressed`;
      const sdi = bits <= 1.485e9 ? 'HD-SDI (1.485 Gbit/s)' : bits <= 2.97e9 ? '3G-SDI (2.97 Gbit/s)'
        : bits <= 6e9 ? '6G-SDI' : bits <= 12e9 ? '12G-SDI' : 'beyond 12G-SDI, needs multiple links';
      extra = `<p class="note"><b>Carrying it.</b> Uncompressed this needs ${sdi}, or ST 2110 on a
        ${bits > 8e9 ? '25 Gbit' : '10 Gbit'} network with PTP. Compressed with NDI it drops to roughly
        100 to 250 Mbit/s and fits a 1 Gbit link comfortably, at the cost of a frame of latency and
        some quality.</p>`;
    }

    const gbit = bits / 1e9;
    const fits1g = bits <= 1e9;
    out.innerHTML =
      readout(
        gbit >= 1 ? `${gbit.toFixed(2)} Gbit/s` : `${(bits / 1e6).toFixed(1)} Mbit/s`,
        `${(bits / 8 / 1e6).toFixed(1)} MB/s of storage throughput. ` +
        (fits1g ? 'Fits a 1 Gbit link with room to spare.' : `Does NOT fit a 1 Gbit link. It needs ${Math.ceil(gbit)}× that capacity.`),
        fits1g ? 'pass' : 'fail'
      ) + `<pre class="working">${working}</pre>` + extra;
  };

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip[data-mode]');
    if (!chip) return;
    root.querySelectorAll('.chip[data-mode]').forEach((c) => c.classList.toggle('on', c === chip));
    mode = chip.dataset.mode;
    paint();
  });
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  paint();
};

// --- Latency budget ---------------------------------------------------------

TOOLS.latency = (root) => {
  root.append(h(`<p class="tool-sub">Add every stage from trigger to eardrum, then compare against a
    perceptual threshold and state pass or fail. Note how much of the budget is air, not electronics.</p>`));
  const rows = h('<div class="rows" id="lat-rows"></div>');
  root.append(rows);
  root.append(h(`<div class="chip-row">
    <button class="chip" id="lat-add">+ Add a stage</button>
    <button class="chip" data-preset="digital">Digital audio path</button>
    <button class="chip" data-preset="video">Video path</button>
    <button class="chip" data-preset="iem">In-ear monitoring</button></div>`));
  root.append(h(`<div class="fields">
    ${field('Distance to audience (m)', inp('lat-d', '15', 'type="number" min="0" step="0.5"'))}
    ${field('Threshold', sel('lat-t', [
      [10, 'In-ear monitoring, 10 ms'],
      [20, 'Live monitoring, 20 ms'],
      [45, 'Audio ahead of picture, 45 ms'],
      [125, 'Audio behind picture, 125 ms'],
      [100, 'Cue late enough to break a laugh, 100 ms'],
    ], 20))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const PRESETS = {
    digital: [['Microphone to converter', 0.5], ['Console processing', 1.5], ['Dante at 1 ms', 1], ['Amplifier DSP and conversion', 1]],
    video: [['Camera capture', 8], ['Switcher processing', 16], ['Scaler', 16], ['LED processor', 8], ['Panel refresh', 16]],
    iem: [['Microphone to converter', 0.5], ['Console processing', 1.2], ['Dante at 0.25 ms', 0.25], ['IEM transmitter', 3]],
  };

  const addRow = (label = '', ms = '') => rows.append(h(`<div class="row-item">
    <input type="text" value="${label}" placeholder="Stage, for example console processing">
    <input type="number" value="${ms}" step="0.1" min="0" placeholder="ms">
    <button class="row-del" title="Remove">✕</button></div>`));

  const load = (key) => { rows.innerHTML = ''; PRESETS[key].forEach(([l, m]) => addRow(l, m)); run(); };

  const run = () => {
    const items = [...rows.querySelectorAll('.row-item')].map((r) => {
      const i = r.querySelectorAll('input');
      return { label: i[0].value || 'Unnamed stage', ms: num(i[1].value, 0) };
    });
    const d = num($('#lat-d').value, 0);
    const air = d * 2.92;
    const elec = items.reduce((a, b) => a + b.ms, 0);
    const total = elec + air;
    const thr = num($('#lat-t').value, 20);
    const pass = elec <= thr;

    out.innerHTML = readout(
      `${elec.toFixed(2)} ms`,
      `Electronic path. Plus ${air.toFixed(0)} ms of air at ${d} m, so ${total.toFixed(0)} ms total to the listener. ` +
      (pass ? `Inside the ${thr} ms threshold.` : `OVER the ${thr} ms threshold by ${(elec - thr).toFixed(1)} ms.`),
      pass ? 'pass' : 'fail'
    ) + `<pre class="working">${items.map((i) => `  ${i.label.padEnd(34, '.')} ${i.ms.toFixed(2).padStart(7)} ms`).join('\n')}
  ${''.padEnd(34, ' ')} ${'-------'.padStart(7)}
  Electronic path${''.padEnd(19, '.')} <b>${elec.toFixed(2).padStart(7)} ms</b>
  Air at ${d} m (2.92 ms per metre)${''.padEnd(Math.max(0, 34 - 32 - String(d).length), '.')} ${air.toFixed(2).padStart(7)} ms
  ${''.padEnd(34, ' ')} ${'-------'.padStart(7)}
  Total to the listener${''.padEnd(13, '.')} <b>${total.toFixed(2).padStart(7)} ms</b></pre>` +
      `<p class="note"><b>The point of this tool.</b> The whole digital chain here costs
      ${elec.toFixed(1)} ms, and the audience is already accepting ${air.toFixed(0)} ms of air without
      ever complaining. Latency that is known and constant is a budget you spend. Jitter is the fault.</p>`;
  };

  root.addEventListener('click', (e) => {
    if (e.target.closest('#lat-add')) { addRow(); run(); return; }
    const p = e.target.closest('.chip[data-preset]');
    if (p) { load(p.dataset.preset); return; }
    if (e.target.closest('.row-del')) { e.target.closest('.row-item').remove(); run(); }
  });
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  load('digital');
};

// --- DMX universes ----------------------------------------------------------

TOOLS.universe = (root) => {
  root.append(h(`<p class="tool-sub">The calculation every lighting student needs and few are taught
    early enough. Watch what happens to the data rate: the constraint is never bandwidth.</p>`));
  const rows = h('<div class="rows" id="u-rows"></div>');
  root.append(rows);
  root.append(h(`<div class="chip-row">
    <button class="chip" id="u-add">+ Add fixture type</button>
    <button class="chip" data-add="rgb">RGB pixel batten</button>
    <button class="chip" data-add="rgbw">RGBW pixel batten</button>
    <button class="chip" data-add="mover">Moving head</button>
    <button class="chip" data-add="dim">Dimmer channel</button></div>`));
  const out = h('<div></div>');
  root.append(out);

  const KIT = {
    rgb: ['LED batten, 60 RGB pixels', 24, 180],
    rgbw: ['LED batten, 40 RGBW pixels', 24, 160],
    mover: ['Moving head', 18, 32],
    dim: ['Dimmer channel', 24, 1],
  };

  const addRow = (label = '', count = 1, ch = 1) => rows.append(h(`<div class="row-item" style="grid-template-columns:1fr 78px 78px 34px">
    <input type="text" value="${label}" placeholder="Fixture type">
    <input type="number" value="${count}" min="0" title="How many">
    <input type="number" value="${ch}" min="1" title="Channels each">
    <button class="row-del" title="Remove">✕</button></div>`));

  const run = () => {
    const items = [...rows.querySelectorAll('.row-item')].map((r) => {
      const i = r.querySelectorAll('input');
      return { label: i[0].value || 'Unnamed', count: num(i[1].value, 0), ch: num(i[2].value, 1) };
    });
    const total = items.reduce((a, b) => a + b.count * b.ch, 0);
    const universes = Math.ceil(total / 512);
    const rate = universes * 0.25;

    out.innerHTML = readout(
      `${universes} universe${universes === 1 ? '' : 's'}`,
      `${total.toLocaleString()} channels total. That is ${rate.toFixed(2)} Mbit/s of control data, which is nothing.`
    ) + `<pre class="working">${items.map((i) => `  ${i.label.padEnd(30, '.')} ${String(i.count).padStart(4)} × ${String(i.ch).padStart(3)} ch = ${String(i.count * i.ch).padStart(6)} ch`).join('\n')}
  ${''.padEnd(30, ' ')} ${'------'.padStart(20)}
  Total channels${''.padEnd(16, '.')} ${String(total).padStart(20)} ch

  ${total} ÷ 512 = ${(total / 512).toFixed(2)}  →  round UP  →  <b>${universes} universes</b>

  Data rate  ${universes} × 0.25 Mbit/s = <b>${rate.toFixed(2)} Mbit/s</b>

Reference
  RGB pixel  = 3 channels   →  512 ÷ 3 = 170 pixels per universe
  RGBW pixel = 4 channels   →  512 ÷ 4 = 128 pixels per universe</pre>` +
      `<p class="note"><b>Read the data rate again.</b> ${rate.toFixed(2)} Mbit/s on a 1000 Mbit/s link.
       Your constraints on a pixel rig are universe count, node port count and processing. When
       lighting control fails on a network the cause is almost always addressing, not capacity.</p>`;
  };

  root.addEventListener('click', (e) => {
    if (e.target.closest('#u-add')) { addRow(); run(); return; }
    const a = e.target.closest('.chip[data-add]');
    if (a) { addRow(...KIT[a.dataset.add]); run(); return; }
    if (e.target.closest('.row-del')) { e.target.closest('.row-item').remove(); run(); }
  });
  root.addEventListener('input', run);
  addRow(...KIT.rgbw); addRow(...KIT.mover);
  run();
};

// --- DMX refresh ------------------------------------------------------------

TOOLS.dmx = (root) => {
  root.append(h(`<p class="tool-sub">Why a full universe refreshes about 44 times a second, and why
    some devices transmit fewer slots to go faster.</p>`));
  root.append(h(`<div class="fields">
    ${field('Slots transmitted', inp('dx-s', '512', 'type="number" min="1" max="512"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const slots = Math.max(1, Math.min(512, num($('#dx-s').value, 512)));
    const bits = slots * 11;
    const dataMs = (bits / 250000) * 1000;
    const frameMs = dataMs + 0.5; // break plus mark before break, approximated
    const hz = 1000 / frameMs;
    out.innerHTML = readout(
      `${hz.toFixed(1)} Hz`,
      `${frameMs.toFixed(2)} ms per full frame with ${slots} slots. A full 512-slot universe manages about 44 Hz.`
    ) + `<pre class="working">Each slot is sent as 11 bits: 1 start bit + 8 data bits + 2 stop bits

  ${slots} slots × 11 bits          = ${bits.toLocaleString()} bits
  ${bits.toLocaleString()} ÷ 250,000 bit/s     = ${dataMs.toFixed(2)} ms of data
  plus break and mark          ≈ <b>${frameMs.toFixed(2)} ms per frame</b>

  1 ÷ ${(frameMs / 1000).toFixed(5)} s              ≈ <b>${hz.toFixed(1)} frames per second</b></pre>` +
      `<p class="note"><b>Why it matters artistically.</b> ${hz.toFixed(0)} Hz is the ceiling on how
      smooth a fast chase or a strobe can be. The protocol has no faster gear, so fast pixel effects
      need more universes, not a quicker one.</p>`;
  };
  root.addEventListener('input', run);
  run();
};

// --- Storage throughput -----------------------------------------------------

TOOLS.storage = (root) => {
  root.append(h(`<p class="tool-sub">Capacity is not throughput. A 20 TB drive that reads at 150 MB/s
    cannot play four layers of video no matter how much it holds.</p>`));
  root.append(h(`<div class="fields">
    ${field('Layers', inp('st-l', '4', 'type="number" min="1"'))}
    ${field('Bitrate each (Mbit/s)', inp('st-b', '700', 'type="number" min="1"'))}
    ${field('Headroom', sel('st-h', [[1, 'None, the raw number'], [1.3, '30 percent'], [1.5, '50 percent (recommended)'], [2, '100 percent']], 1.5))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const l = num($('#st-l').value, 4), b = num($('#st-b').value, 700), hd = num($('#st-h').value, 1.5);
    const mbit = l * b;
    const mbyte = mbit / 8;
    const need = mbyte * hd;
    const drive = need < 150 ? ['Spinning disk', 'Adequate, and only for a single light layer.']
      : need < 450 ? ['SATA SSD', 'Inside a SATA SSD’s working range, with the operating system also using the disk.']
        : need < 3000 ? ['NVMe SSD', 'Specify NVMe. A SATA SSD tops out around 550 MB/s and you would have no headroom.']
          : ['NVMe in RAID', 'A single drive will not hold this. Specify an NVMe array.'];

    out.innerHTML = readout(`${need.toFixed(0)} MB/s`, `${drive[0]} required. ${drive[1]}`,
      need < 450 ? 'pass' : need < 3000 ? '' : 'fail'
    ) + `<pre class="working">  ${l} layers × ${b} Mbit/s      = ${mbit.toLocaleString()} Mbit/s
  ÷ 8 to convert to bytes  = <b>${mbyte.toFixed(1)} MB/s</b> raw
  × ${hd} headroom            = <b>${need.toFixed(0)} MB/s</b> sustained

Sustained read, by drive class
  Spinning disk    100 to 200 MB/s
  SATA SSD         about 550 MB/s
  NVMe SSD         2,000 to 7,000 MB/s

Judge a drive by SUSTAINED throughput, never by the burst figure in the advertisement,
and never by capacity.</pre>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- Audio buffer -----------------------------------------------------------

TOOLS.buffer = (root) => {
  root.append(h(`<p class="tool-sub">The trade between latency and safety. There is no setting that
    wins both, and the right answer changes per job.</p>`));
  root.append(h(`<div class="fields">
    ${field('Buffer size', sel('bf-b', [[32, '32 samples'], [64, '64'], [128, '128'], [256, '256'], [512, '512'], [1024, '1024'], [2048, '2048']], 128))}
    ${field('Sample rate', sel('bf-r', [[44100, '44.1 kHz'], [48000, '48 kHz'], [96000, '96 kHz']], 48000))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const b = num($('#bf-b').value, 128), r = num($('#bf-r').value, 48000);
    const one = (b / r) * 1000;
    const rt = one * 2 + 1.5; // converters add roughly 1.5 ms in and out combined
    const verdict = rt < 7 ? ['pass', 'Tight enough for live monitoring, and intolerant of any hiccup.']
      : rt < 14 ? ['', 'Comfortable for most live work.']
        : ['fail', 'Wrong for a performer monitoring themselves. Fine for playback.'];

    out.innerHTML = readout(`${one.toFixed(2)} ms`,
      `per buffer. Round trip approximately ${rt.toFixed(1)} ms. ${verdict[1]}`, verdict[0]
    ) + `<pre class="working">  ${b} samples ÷ ${r.toLocaleString()} Hz = ${(b / r).toFixed(6)} s = <b>${one.toFixed(3)} ms</b> per buffer

  Round trip ≈ (2 × buffer) + converter time
             ≈ (2 × ${one.toFixed(2)}) + 1.5 ≈ <b>${rt.toFixed(1)} ms</b>

At ${(r / 1000).toFixed(1)} kHz
   64  →  ${((64 / r) * 1000).toFixed(2)} ms   immediate, high risk of clicks
   128 →  ${((128 / r) * 1000).toFixed(2)} ms   tight, usable for live monitoring
   256 →  ${((256 / r) * 1000).toFixed(2)} ms   fine for most live work
   512 →  ${((512 / r) * 1000).toFixed(2)} ms   noticeable on percussive monitoring
   1024 → ${((1024 / r) * 1000).toFixed(2)} ms  wrong for a performer, fine for playback</pre>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- Bits, bytes and prefixes ----------------------------------------------

TOOLS.units = (root) => {
  root.append(h(`<p class="tool-sub">The most common arithmetic error in this subject. Networks are
    measured in <b>bits</b>, storage in <b>bytes</b>, and the factor between them is eight.</p>`));
  // Bytes per second that one of the chosen unit represents, plus whether the
  // unit is a bit unit. A lookup, never eval: the page must stay CSP-clean.
  const UNITS = {
    mbit: { per: 1e6 / 8, bits: true, label: 'Mbit/s' },
    gbit: { per: 1e9 / 8, bits: true, label: 'Gbit/s' },
    kbit: { per: 1e3 / 8, bits: true, label: 'kbit/s' },
    mbyte: { per: 1e6, bits: false, label: 'MB/s' },
    gbyte: { per: 1e9, bits: false, label: 'GB/s' },
    byte: { per: 1, bits: false, label: 'B/s' },
  };
  root.append(h(`<div class="fields">
    ${field('Value', inp('un-v', '2490', 'type="number" step="any"'))}
    ${field('Unit', sel('un-u', Object.entries(UNITS).map(([k, u]) => [k, u.label]), 'mbit'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const v = num($('#un-v').value, 0);
    const u = UNITS[$('#un-u').value] || UNITS.mbit;
    const Bps = v * u.per;
    const bps = Bps * 8;
    const isBits = u.bits;

    const links = [['100 Mbit', 100e6], ['1 Gbit', 1e9], ['10 Gbit', 10e9], ['25 Gbit', 25e9]];
    const fits = links.map(([n, cap]) =>
      `<tr><td>${n} link</td><td>${((bps / cap) * 100).toFixed(1)}%</td>
       <td style="color:var(--${bps <= cap ? 'green' : 'red'})">${bps <= cap ? 'fits' : 'does not fit'}</td></tr>`).join('');

    out.innerHTML = readout(
      bps >= 1e9 ? `${(bps / 1e9).toFixed(3)} Gbit/s` : `${(bps / 1e6).toFixed(1)} Mbit/s`,
      `is the same as ${Bps >= 1e6 ? `${(Bps / 1e6).toFixed(1)} MB/s` : `${(Bps / 1e3).toFixed(1)} kB/s`} of storage throughput.`
    ) + `<pre class="working">You entered a ${isBits ? 'BIT' : 'BYTE'} figure.

  ${isBits ? `${(bps / 1e6).toFixed(1)} Mbit/s ÷ 8 = <b>${(Bps / 1e6).toFixed(2)} MB/s</b>`
    : `${(Bps / 1e6).toFixed(1)} MB/s × 8 = <b>${(bps / 1e6).toFixed(2)} Mbit/s</b>`}

Networks are quoted in bits per second.   Storage is quoted in bytes per second.
Divide by 8 going from network to disk.   Multiply by 8 going the other way.</pre>` +
      `<div class="table-wrap"><table><thead><tr><th>Link</th><th>Utilisation</th><th></th></tr></thead><tbody>${fits}</tbody></table></div>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- Binary, decimal and hex ------------------------------------------------

TOOLS.binhex = (root) => {
  root.append(h(`<p class="tool-sub">Click the bits. This is the whole binary requirement of the
    module: read an octet, and recognise the nine values a subnet mask can hold.</p>`));
  const bitsRow = h('<div class="bitbox"></div>');
  const out = h('<div></div>');
  root.append(bitsRow, out);
  let bits = [1, 1, 0, 0, 0, 0, 0, 0];

  const paint = () => {
    const val = bits.reduce((a, b, i) => a + (b ? 2 ** (7 - i) : 0), 0);
    bitsRow.innerHTML = bits.map((b, i) =>
      `<button class="bitb${b ? ' on' : ''}" data-i="${i}">
        <b>${b}</b><span>${2 ** (7 - i)}</span></button>`).join('');

    const solid = /^1*0*$/.test(bits.join(''));
    const ones = bits.filter(Boolean).length;
    out.innerHTML = readout(String(val),
      `binary ${bits.join('')} · hex ${val.toString(16).toUpperCase().padStart(2, '0')} · ${ones} bit${ones === 1 ? '' : 's'} set`) +
      `<pre class="working">  ${bits.map((b, i) => (b ? String(2 ** (7 - i)) : null)).filter(Boolean).join(' + ') || '0'} = <b>${val}</b>

  As a subnet mask octet: ${solid
    ? `<b>VALID</b>, a solid run of ${ones} one${ones === 1 ? '' : 's'}`
    : '<b>INVALID</b>. A mask is always a solid run of ones then zeros, never mixed.'}

The nine values a mask octet can ever hold
  0   128   192   224   240   248   252   254   255</pre>`;
  };

  bitsRow.addEventListener('click', (e) => {
    const b = e.target.closest('.bitb');
    if (!b) return;
    bits[+b.dataset.i] ^= 1;
    paint();
  });
  paint();
};

// --- PoE budget -------------------------------------------------------------

TOOLS.poe = (root) => {
  root.append(h(`<p class="tool-sub">The trap: a switch has a <b>total</b> power budget, not just a
    per port rating. Eight ports rated 30 W is never 240 W available.</p>`));
  const rows = h('<div class="rows" id="poe-rows"></div>');
  root.append(rows);
  root.append(h(`<div class="chip-row">
    <button class="chip" data-add="af">+ PoE device (12.95 W)</button>
    <button class="chip" data-add="at">+ PoE+ device (25.5 W)</button>
    <button class="chip" data-add="bt3">+ PoE++ Type 3 (51 W)</button>
    <button class="chip" data-add="bt4">+ PoE++ Type 4 (71 W)</button></div>`));
  root.append(h(`<div class="fields">
    ${field('Switch total PoE budget (W)', inp('poe-b', '130', 'type="number" min="0"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const KIT = { af: ['Art-Net node', 12.95], at: ['Wireless access point', 25.5], bt3: ['PTZ camera', 51], bt4: ['LED panel driver', 71] };

  const addRow = (label, w, n = 1) => rows.append(h(`<div class="row-item" style="grid-template-columns:1fr 78px 78px 34px">
    <input type="text" value="${label}">
    <input type="number" value="${n}" min="0" title="How many">
    <input type="number" value="${w}" step="0.05" min="0" title="Watts each">
    <button class="row-del" title="Remove">✕</button></div>`));

  const run = () => {
    const items = [...rows.querySelectorAll('.row-item')].map((r) => {
      const i = r.querySelectorAll('input');
      return { label: i[0].value || 'Device', n: num(i[1].value, 0), w: num(i[2].value, 0) };
    });
    const total = items.reduce((a, b) => a + b.n * b.w, 0);
    const budget = num($('#poe-b').value, 0);
    const ports = items.reduce((a, b) => a + b.n, 0);
    const over = total > budget;

    out.innerHTML = readout(`${total.toFixed(1)} W`,
      `across ${ports} port${ports === 1 ? '' : 's'}, against a ${budget} W switch budget. ` +
      (over ? `OVER by ${(total - budget).toFixed(1)} W.` : `${(budget - total).toFixed(1)} W spare.`),
      over ? 'fail' : 'pass'
    ) + `<pre class="working">${items.map((i) =>
      `  ${i.label.padEnd(26, '.')} ${String(i.n).padStart(3)} × ${i.w.toFixed(2).padStart(6)} W = ${(i.n * i.w).toFixed(2).padStart(7)} W`).join('\n')}
  ${''.padEnd(26, ' ')} ${'--------'.padStart(19)}
  Total draw${''.padEnd(16, '.')} ${total.toFixed(2).padStart(19)} W
  Switch budget${''.padEnd(13, '.')} ${budget.toFixed(2).padStart(19)} W

Standards
  802.3af   PoE       up to 12.95 W at the device
  802.3at   PoE+      up to 25.5 W
  802.3bt   Type 3    up to 51 W
  802.3bt   Type 4    up to 71 W</pre>` +
      (over ? `<p class="note"><b>This will not work.</b> A switch over its PoE budget does not
        share the shortfall politely: it drops power to ports, usually the highest numbered or
        lowest priority ones, and usually when everything powers up together. Split across two
        switches or specify a bigger budget.</p>` : '');
  };

  root.addEventListener('click', (e) => {
    const a = e.target.closest('.chip[data-add]');
    if (a) { addRow(...KIT[a.dataset.add]); run(); return; }
    if (e.target.closest('.row-del')) { e.target.closest('.row-item').remove(); run(); }
  });
  root.addEventListener('input', run);
  addRow('Art-Net node', 12.95, 4);
  addRow('Wireless access point', 25.5, 2);
  run();
};

// --- Timecode ---------------------------------------------------------------

TOOLS.timecode = (root) => {
  root.append(h(`<p class="tool-sub">Timecode arithmetic, including the 29.97 drop frame rule that
    exists because of a colour television compromise from 1953 and still bites people.</p>`));
  root.append(h(`<div class="fields">
    ${field('Start', inp('tc-a', '00:14:22:07'))}
    ${field('Offset', inp('tc-b', '00:02:30:00'))}
    ${field('Operation', sel('tc-op', [['+', 'Add'], ['-', 'Subtract']], '+'))}
    ${field('Frame rate', sel('tc-f', [[24, '24'], [25, '25'], [29.97, '29.97 DF'], [2997, '29.97 NDF'], [30, '30']], 25))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const parse = (s) => {
    const m = /^(\d{1,2}):(\d{1,2}):(\d{1,2})[:;](\d{1,2})$/.exec(s.trim());
    return m ? m.slice(1).map(Number) : null;
  };
  // Drop frame skips frame numbers 0 and 1 at the start of each minute except
  // every tenth minute. The clock stays right; the frame NUMBERS are what drop.
  const toFrames = ([hh, mm, ss, ff], fps, df) => {
    const base = Math.round(fps);
    let n = ((hh * 3600 + mm * 60 + ss) * base) + ff;
    if (df) { const tm = hh * 60 + mm; n -= 2 * (tm - Math.floor(tm / 10)); }
    return n;
  };
  const fromFrames = (n, fps, df) => {
    const base = Math.round(fps);
    if (df) {
      const d = Math.floor(n / 17982), r = n % 17982;
      n += 18 * d + 2 * Math.floor((Math.max(r, 2) - 2) / 1798);
    }
    const ff = n % base, tot = Math.floor(n / base);
    const p = (v) => String(v).padStart(2, '0');
    return `${p(Math.floor(tot / 3600))}:${p(Math.floor(tot / 60) % 60)}:${p(tot % 60)}${df ? ';' : ':'}${p(ff)}`;
  };

  const run = () => {
    const raw = $('#tc-f').value;
    const df = raw === '29.97';
    const fps = raw === '2997' ? 29.97 : num(raw, 25);
    const a = parse($('#tc-a').value), b = parse($('#tc-b').value);
    if (!a || !b) { out.innerHTML = readout('Format is hh:mm:ss:ff', 'For example 00:14:22:07.', 'fail'); return; }

    const fa = toFrames(a, fps, df), fb = toFrames(b, fps, df);
    const res = $('#tc-op').value === '+' ? fa + fb : Math.max(0, fa - fb);
    const secs = res / (df ? 30000 / 1001 : fps);

    out.innerHTML = readout(fromFrames(res, fps, df),
      `${res.toLocaleString()} frames · ${secs.toFixed(2)} seconds of real time at ${df ? '29.97' : fps} fps`
    ) + `<pre class="working">  start   ${$('#tc-a').value}  = ${fa.toLocaleString()} frames
  offset  ${$('#tc-b').value}  = ${fb.toLocaleString()} frames
  ${$('#tc-op').value === '+' ? 'sum' : 'difference'}${''.padEnd(16, ' ')}= <b>${res.toLocaleString()} frames</b>

${df ? `Drop frame: frame NUMBERS 0 and 1 are skipped at the start of every minute
except every tenth minute, so the count keeps pace with real time. Nothing
is dropped from the picture. Written with a semicolon: 00:01:00;02`
  : `Non drop: every frame is numbered, so at 29.97 the timecode slowly
falls behind the wall clock, by about 3.6 seconds per hour.`}

The rule that matters on a show: every machine must agree on the frame rate.
A device at 25 following a source at 30 drifts, and drift appears slowly and
gets worse across the show.</pre>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- LED wall / pixel canvas ------------------------------------------------

TOOLS.ledwall = (root) => {
  root.append(h(`<p class="tool-sub">Panels to pixels to data rate. The question that decides
    whether one media server output is enough, or whether you need a second machine.</p>`));
  root.append(h(`<div class="fields">
    ${field('Panel width (px)', inp('lw-pw', '128', 'type="number" min="1"'))}
    ${field('Panel height (px)', inp('lw-ph', '128', 'type="number" min="1"'))}
    ${field('Panels across', inp('lw-x', '24', 'type="number" min="1"'))}
    ${field('Panels down', inp('lw-y', '8', 'type="number" min="1"'))}
    ${field('Pitch (mm)', inp('lw-p', '3.9', 'type="number" step="0.1" min="0.5"'))}
    ${field('Frame rate', sel('lw-f', [[25, '25'], [30, '30'], [50, '50'], [60, '60']], 60))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const pw = num($('#lw-pw').value, 128), ph = num($('#lw-ph').value, 128);
    const nx = num($('#lw-x').value, 1), ny = num($('#lw-y').value, 1);
    const pitch = num($('#lw-p').value, 3.9), fps = num($('#lw-f').value, 60);
    const W = pw * nx, H = ph * ny, px = W * H;
    const mW = (W * pitch) / 1000, mH = (H * pitch) / 1000;
    const bits = px * fps * 24;                     // 8-bit RGB from the server
    const src = W <= 1920 && H <= 1080 ? '1080p, one output'
      : W <= 3840 && H <= 2160 ? 'UHD, one modern output'
        : 'beyond a single UHD output, so plan multiple outputs or a canvas split';

    out.innerHTML = readout(`${W} × ${H}`,
      `${px.toLocaleString()} pixels · ${mW.toFixed(2)} m × ${mH.toFixed(2)} m at ${pitch} mm pitch`
    ) + `<pre class="working">  Canvas    ${pw} × ${nx} = ${W} px wide
            ${ph} × ${ny} = ${H} px high
  Pixels    ${W} × ${H} = <b>${px.toLocaleString()}</b>
  Physical  ${mW.toFixed(2)} m × ${mH.toFixed(2)} m   (pitch ${pitch} mm)

  Source feed at ${fps} fps, 8 bit RGB
            ${px.toLocaleString()} × ${fps} × 24 bit = <b>${(bits / 1e9).toFixed(2)} Gbit/s</b>

  Minimum viewing distance rule of thumb: pitch in mm ≈ metres
            ${pitch} mm → do not seat anyone closer than about ${pitch.toFixed(1)} m

  Output    ${src}

If pixel mapped as lighting instead of video
            ${px.toLocaleString()} × 3 ch ÷ 512 = <b>${Math.ceil((px * 3) / 512).toLocaleString()} universes</b></pre>` +
      `<p class="note">${px > 2073600
        ? `<b>This canvas is larger than 1080p.</b> Feeding it from a single 1080p output means the processor is scaling up, and you lose the resolution you paid for. Check what the server is actually outputting, not what the wall can accept.`
        : `The canvas fits inside a 1080p output, so a single feed carries it natively. Note the universe count if anyone suggests pixel mapping it from a lighting console instead.`}</p>`;
  };
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
};

// --- Delay time -------------------------------------------------------------

TOOLS.delaytime = (root) => {
  root.append(h(`<p class="tool-sub">Aligning a delay tower or a fill speaker. This is latency used
    deliberately as a tool, which is the point Class 1 makes.</p>`));
  root.append(h(`<div class="fields">
    ${field('Distance, main to delay (m)', inp('dt-d', '32', 'type="number" step="0.1" min="0"'))}
    ${field('Air temperature (°C)', inp('dt-t', '20', 'type="number" step="1"'))}
    ${field('Extra offset (ms)', inp('dt-o', '5', 'type="number" step="0.5"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const d = num($('#dt-d').value, 0), temp = num($('#dt-t').value, 20), off = num($('#dt-o').value, 0);
    const c = 331.3 + 0.606 * temp;                 // speed of sound with temperature
    const ms = (d / c) * 1000;
    const total = ms + off;

    out.innerHTML = readout(`${total.toFixed(1)} ms`,
      `delay to dial into the tower. ${ms.toFixed(1)} ms of flight time plus ${off} ms of deliberate offset.`
    ) + `<pre class="working">  Speed of sound at ${temp} °C
            331.3 + 0.606 × ${temp} = <b>${c.toFixed(1)} m/s</b>

  Flight time
            ${d} m ÷ ${c.toFixed(1)} m/s = ${(d / c).toFixed(4)} s = <b>${ms.toFixed(2)} ms</b>

  Plus offset ${off} ms          total <b>${total.toFixed(1)} ms</b>

At 20 °C sound covers about 2.92 ms per metre, which is the figure to carry
in your head. A 10 °C swing across a long outdoor run moves the alignment by
about ${(Math.abs((d / (331.3 + 0.606 * (temp + 10))) - (d / c)) * 1000).toFixed(1)} ms over this distance.</pre>` +
      `<p class="note"><b>Why the extra offset.</b> Aligning exactly to the flight time makes both
      sources arrive together, and the ear then localises to whichever is louder. Adding a few
      milliseconds makes the main system arrive first, so the audience localises to the stage and
      the tower only adds level. That is the Haas effect, and it is a craft decision made with a
      number.</p>`;
  };
  root.addEventListener('input', run);
  run();
};

// --- Ported from showstack -------------------------------------------------
//
// The arithmetic below is the same as showstack's tested implementations
// (MIT licensed, https://github.com/deliseph/showstack, scripts/toolmath.mjs).
// Kept identical on purpose: two copies of the same sum that drift apart is
// worse than one copy in the wrong repository.

// DMX start address to 9 way DIP switch positions. The near universal
// convention is plain binary of the address itself, switch 1 = 1 through
// switch 9 = 256. A minority of older fixtures use binary of (address - 1),
// and this says so rather than silently picking one, because an address set
// confidently and wrongly is exactly the failure the tool exists to prevent.
function dipSwitches(address, minusOne = false) {
  const a = Number(address);
  if (!Number.isInteger(a) || a < 1 || a > 512) return null;
  const v = minusOne ? a - 1 : a;
  if (v > 511) return null;   // 512 in plain binary would need a tenth switch
  return Array.from({ length: 9 }, (_, i) => Boolean((v >> i) & 1));
}

TOOLS.dip = (root) => {
  root.append(h(`<p class="tool-sub">Set a fixture's address on a bank of nine switches, and read a
    bank somebody else set. The convention is plain binary of the address, and the exception is
    named rather than hidden.</p>`));
  root.append(h(`<div class="fields">
    ${field('DMX start address', inp('dp-a', '274', 'type="number" min="1" max="512"'))}
    ${field('Fixture convention', sel('dp-m', [[0, 'Plain binary (almost all fixtures)'], [1, 'Binary of address − 1 (some older fixtures)']], 0))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const a = Math.max(1, Math.min(512, num($('#dp-a').value, 1)));
    const minusOne = $('#dp-m').value === '1';
    const sw = dipSwitches(a, minusOne);
    if (!sw) {
      out.innerHTML = readout('Not settable',
        `Address ${a} in plain binary needs a tenth switch. Either the fixture uses the address − 1 convention, or this address cannot be set on a nine way bank.`);
      return;
    }
    const v = minusOne ? a - 1 : a;
    const on = sw.map((s, i) => (s ? 2 ** i : 0)).filter(Boolean);
    const cells = sw.map((s, i) => `<div class="dipsw ${s ? 'on' : ''}">
        <b>${i + 1}</b><span>${2 ** i}</span><i>${s ? 'ON' : 'off'}</i></div>`).join('');
    out.innerHTML = readout(
      sw.map((s) => (s ? '1' : '0')).join(''),
      `Switches ${on.length ? sw.map((s, i) => (s ? i + 1 : null)).filter(Boolean).join(', ') : 'none'} up. Read switch 1 first.`
    ) + `<div class="dipbank">${cells}</div>`
      + `<pre class="working">${minusOne ? `address − 1 = ${a} − 1 = ${v}\n` : `address     = ${v}\n`}
  ${v} in binary  = ${v.toString(2).padStart(9, '0').split('').reverse().join('')}   (switch 1 on the left)
  switches up   = ${on.length ? on.join(' + ') + ' = ' + on.reduce((x, y) => x + y, 0) : 'none'}</pre>`
      + `<p class="note"><b>Check it against the fixture, not against this page.</b> Nearly every
      fixture uses plain binary, so address 1 is switch 1 up. If a rig comes back one channel low
      across the board, that is the other convention, and it is a five second fix once you know the
      word for it. Arithmetic from <a href="https://showstack-inky.vercel.app/tools/">showstack</a>.</p>`;
  };
  root.addEventListener('input', run);
  run();
};

// Photometrics: beam diameter d = 2 t tan(theta / 2), and the inverse square
// law E = I / d². Works for the field angle too; you choose which you enter.
TOOLS.beam = (root) => {
  root.append(h(`<p class="tool-sub">How big the pool is at that distance, and how much light is in
    it. The two questions a focus session asks over and over.</p>`));
  root.append(h(`<div class="fields">
    ${field('Throw distance', inp('bm-t', '8', 'type="number" min="0.5" step="0.5"'))}
    ${field('Beam or field angle', inp('bm-a', '26', 'type="number" min="1" max="179"'))}
    ${field('Centre intensity (candela, optional)', inp('bm-i', '150000', 'type="number" min="0"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const t = Math.max(0.1, num($('#bm-t').value, 8));
    const a = Math.max(1, Math.min(179, num($('#bm-a').value, 26)));
    const cd = Math.max(0, num($('#bm-i').value, 0));
    const d = 2 * t * Math.tan((a * Math.PI / 180) / 2);
    const lux = cd > 0 ? cd / (t * t) : 0;
    out.innerHTML = readout(
      `${d.toFixed(2)} m across`,
      `A ${a}° beam at ${t} m throw${cd > 0 ? `, and ${Math.round(lux)} lux in the middle of it` : ''}.`
    ) + `<pre class="working">diameter = 2 × throw × tan(angle ÷ 2)

  2 × ${t} × tan(${a}° ÷ 2)   = 2 × ${t} × ${Math.tan((a * Math.PI / 180) / 2).toFixed(4)}
                        = <b>${d.toFixed(2)} m</b>${cd > 0 ? `

illuminance = candela ÷ throw²      (the inverse square law)

  ${cd.toLocaleString()} ÷ ${t}²          = <b>${Math.round(lux).toLocaleString()} lux</b>  (${(lux * 0.09290304).toFixed(0)} footcandles)` : ''}</pre>`
      + `<p class="note"><b>Double the throw and you quarter the light.</b> That is the inverse
      square law, and it is why a back light on a deep stage needs far more than the front light
      does. Note also that beam angle and field angle are different numbers: beam is where the
      intensity has fallen to half, field is where it has fallen to a tenth, so the field is always
      the wider figure and the one that decides whether two pools touch. Arithmetic from
      <a href="https://showstack-inky.vercel.app/tools/">showstack</a>.</p>`;
  };
  root.addEventListener('input', run);
  run();
};

// Current from load: single phase I = W / (V × pf), three phase adds √3.
TOOLS.power = (root) => {
  root.append(h(`<p class="tool-sub">What that rig actually draws, and whether it fits the socket
    you were offered.</p>`));
  root.append(h(`<div class="fields">
    ${field('Total load', inp('pw-w', '3600', 'type="number" min="0"'))}
    ${field('Supply voltage', sel('pw-v', [[230, '230 V (HK, TW, EU, UK)'], [120, '120 V (US)'], [110, '110 V'], [208, '208 V (US three phase)'], [400, '400 V (three phase)']], 230))}
    ${field('Phase', sel('pw-p', [[1, 'Single phase'], [3, 'Three phase']], 1))}
    ${field('Power factor', inp('pw-f', '1', 'type="number" min="0.1" max="1" step="0.05"'))}
  </div>`));
  const out = h('<div></div>');
  root.append(out);

  const run = () => {
    const w = Math.max(0, num($('#pw-w').value, 0));
    const v = num($('#pw-v').value, 230);
    const ph = num($('#pw-p').value, 1);
    const pf = Math.max(0.1, Math.min(1, num($('#pw-f').value, 1)));
    const amps = ph === 3 ? w / (Math.sqrt(3) * v * pf) : w / (v * pf);
    const common = [10, 13, 16, 32, 63, 125];
    const fits = common.find((c) => amps <= c * 0.8);
    out.innerHTML = readout(
      `${amps.toFixed(2)} A`,
      `${w.toLocaleString()} W at ${v} V, ${ph === 3 ? 'three phase' : 'single phase'}${pf < 1 ? `, power factor ${pf}` : ''}.`
    ) + `<pre class="working">${ph === 3
      ? `amps = watts ÷ (√3 × volts × power factor)

  ${w.toLocaleString()} ÷ (1.732 × ${v} × ${pf})  = <b>${amps.toFixed(2)} A per phase</b>`
      : `amps = watts ÷ (volts × power factor)

  ${w.toLocaleString()} ÷ (${v} × ${pf})       = <b>${amps.toFixed(2)} A</b>`}</pre>`
      + `<p class="note"><b>Design to 80 percent of the breaker</b>, not to 100. ${fits
        ? `This load sits inside a <b>${fits} A</b> supply on that basis.`
        : 'This load is past 125 A at 80 percent, so it is a distro conversation rather than a socket one.'}
      A breaker that trips at 95 percent on a warm afternoon has not failed, it has done its job,
      and it has done it during the show. Arithmetic from
      <a href="https://showstack-inky.vercel.app/tools/">showstack</a>.</p>`;
  };
  root.addEventListener('input', run);
  run();
};

// --- Mount ------------------------------------------------------------------

for (const node of document.querySelectorAll('[data-tool]')) {
  const fn = TOOLS[node.dataset.tool];
  if (!fn) continue;
  const head = node.querySelector('.tool-h');
  // Prefixed, because a tool sits on a class page next to the prose and a bare
  // id collides with a heading slug: /class/2 had two "storage" and /class/4
  // two "timecode", which made those anchors ambiguous.
  if (head && !head.id) head.id = `tool-${node.dataset.tool}`;
  fn(node);
}
