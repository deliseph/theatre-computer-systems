// How the three signal families got to where they are. Each generation solved
// the previous one's problem and introduced a new one, and the pattern is the
// same in all three: more on one cable, at the cost of something to configure.

import {
  register, figure, canvas, palette, slider, toggle, choice, button,
  box, label, line, alpha, clamp, lerp,
} from './anim-core.js';

const mono = { mono: true };
const fmt = (n) => n.toLocaleString('en-US');

// A shared timeline renderer: a lane of eras, one selected, with a detail card.
function lineage(host, cfg) {
  let sel = cfg.start;
  const { controls, stage, setNote } = figure(host, cfg.figure);

  let cv, pending = false;
  const fit = (want) => {
    if (!cv || pending || Math.abs(cv.h - want) < 3) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; cv.setHeight(Math.round(want)); });
  };
  cv = canvas(stage, {
    height: 340,
    animated: false,
    draw(g, w, hgt) {
      const p = palette();
      const W = Math.min(600, w - 24), ox = (w - W) / 2;
      const E = cfg.eras;
      const t0 = cfg.from, t1 = cfg.to;
      const X = (y) => ox + ((y - t0) / (t1 - t0)) * W;

      // The timeline itself.
      const ty = 78;
      line(g, ox, ty, ox + W, ty, { color: p.line, lw: 2 });
      for (let y = Math.ceil(t0 / 10) * 10; y <= t1; y += 10) {
        line(g, X(y), ty, X(y), ty + 6, { color: p.line, lw: 1 });
        label(g, String(y), X(y), ty + 18, { color: p.muted, size: 10, align: 'center', ...mono });
      }

      E.forEach((e, i) => {
        const x = X(e.year), on = i === sel;
        const col = p[e.col];
        const stalk = 15 + (i % 4) * 15;
        line(g, x, ty, x, ty - stalk, { color: alpha(col, on ? 1 : 0.45), lw: on ? 2.5 : 1.5 });
        g.fillStyle = on ? col : alpha(col, 0.5);
        g.beginPath(); g.arc(x, ty, on ? 6 : 4, 0, 7); g.fill();
        const half = e.short.length * 3;
        const lx = clamp(x, ox + half, ox + W - half);
        label(g, e.short, lx, ty - stalk - 8, {
          color: on ? p.ink : p.muted, size: on ? 11 : 10,
          weight: on ? 700 : 500, align: 'center',
        });
      });

      // The scale bar: how much of the thing fits on one cable.
      const e = E[sel];
      const maxV = Math.max(...E.map((x) => x.scale));
      const by = ty + 46;
      label(g, cfg.scaleLabel, ox, by - 8, { color: p.muted, size: 11 });
      const barX = ox + 108, barW = Math.max(60, W - 108 - 150);
      E.forEach((x, i) => {
        const bh = 15, yy = by + i * 19;
        const frac = Math.log10(x.scale + 1) / Math.log10(maxV + 1);
        box(g, barX, yy, barW, bh, { fill: alpha(p.line, 0.28), stroke: 'transparent', r: 3 });
        box(g, barX, yy, Math.max(3, barW * frac), bh,
          { fill: alpha(p[x.col], i === sel ? 0.75 : 0.22), stroke: i === sel ? p[x.col] : 'transparent', r: 3, lw: 1 });
        label(g, x.short, ox, yy + bh / 2, { color: i === sel ? p.ink : p.muted, size: 10.5, weight: i === sel ? 700 : 500 });
        label(g, x.scaleText, barX + barW + 8, yy + bh / 2,
          { color: i === sel ? p.ink2 : p.muted, size: 10, ...mono });
      });

      // The detail card for the selected era.
      const dy = by + E.length * 19 + 16;
      line(g, ox, dy - 8, ox + W, dy - 8, { color: p.line, lw: 1 });
      label(g, `${e.name}, ${e.year}`, ox, dy + 8, { color: p[e.col], size: 13.5, weight: 700 });
      let ry = dy + 30;
      e.rows.forEach(([k, v]) => {
        label(g, k, ox, ry, { color: p.muted, size: 11, ...mono });
        label(g, v, ox + 150, ry, { color: p.ink2, size: 11.5 });
        ry += 19;
      });
      fit(ry + 8);
    },
  });

  const upd = () => { cv.once(); setNote(cfg.eras[sel].note); };
  controls.append(
    choice('Generation', cfg.eras.map((e, i) => [String(i), e.short]), { value: String(cfg.start), on: (v) => { sel = +v; upd(); } }).node
  );
  upd();
}

// ============================================================================
// 1. Audio: analogue to AES3 to CobraNet to Dante and AVB
// ============================================================================

register('audio-lineage', (host) => lineage(host, {
  figure: {
    title: 'How audio got onto a network',
    sub: 'Every step put more channels on one cable, and every step added something to configure.',
    note: '&nbsp;',
  },
  from: 1980, to: 2025, start: 4,
  scaleLabel: 'audio channels on one cable',
  eras: [
    {
      short: 'Analogue', name: 'Analogue line level', year: 1980, col: 'muted', scale: 1,
      scaleText: '1 per pair',
      rows: [
        ['what it is', 'a voltage that looks like the sound, on a balanced pair'],
        ['channels', 'one, per pair. A 48 channel show is a 48 pair loom.'],
        ['distance', 'long, but noise and loss accumulate with every metre and every stage'],
        ['clock', 'none needed. There is nothing to keep in step.'],
        ['still used', 'yes, everywhere, at the ends of every chain'],
      ],
      note: '<b>The baseline.</b> Simple, universal, and it has one fatal property at scale: every metre and every connector adds noise you can never remove. A 48 channel multicore is heavy, expensive, and it is the reason everything after this exists.',
    },
    {
      short: 'AES3', name: 'AES3 (AES/EBU)', year: 1985, col: 'cyan', scale: 2,
      scaleText: '2 per pair',
      rows: [
        ['what it is', 'two channels of digital audio down one balanced pair, on XLR'],
        ['channels', 'two. S/PDIF is the same idea on coax or optical, for consumers.'],
        ['distance', 'about 100 m on decent cable'],
        ['clock', 'self clocking. The data carries its own timing.'],
        ['still used', 'yes. Amplifier inputs, processor links, anything point to point.'],
      ],
      note: '<b>Digital, but still point to point.</b> Note how it carries its own clock: the bits are biphase mark encoded, exactly like the LTC timecode in Class 4, so the receiver recovers timing from the transitions. Two channels per cable is not a network, it is a better wire.',
    },
    {
      short: 'MADI', name: 'MADI (AES10)', year: 1991, col: 'green', scale: 64,
      scaleText: '64 per cable',
      rows: [
        ['what it is', '64 channels down one coaxial or optical cable'],
        ['channels', '64, fixed, in a fixed order'],
        ['distance', '100 m on coax, kilometres on fibre'],
        ['clock', 'one master, wired. No negotiation.'],
        ['still used', 'yes, and precisely because there is nothing to configure'],
      ],
      note: '<b>Still not a network.</b> No addressing, no discovery, no switch: channel 12 is channel 12 because it is in the twelfth slot. That rigidity is why MADI survives in broadcast and recording, where a link that cannot be misconfigured is worth more than one that is flexible.',
    },
    {
      short: 'CobraNet', name: 'CobraNet', year: 1996, col: 'amber', scale: 64,
      scaleText: '64 per 100 Mbit link',
      rows: [
        ['what it is', 'the first widely used audio over Ethernet'],
        ['channels', 'up to 64 each way on a 100 Mbit link, in bundles of 8'],
        ['network', 'layer 2 only. Cannot be routed, needs a dedicated network.'],
        ['latency', 'fixed, 5.33 ms, sometimes 2.67 or 1.33'],
        ['still used', 'in installations, mostly being replaced'],
      ],
      note: '<b>The first one that was really a network.</b> It proved the idea and it showed the cost: a dedicated layer 2 network that could not be routed, a latency you took rather than chose, and switches that had to be exactly right. Everything since has been an argument about how much of that to give back.',
    },
    {
      short: 'Dante', name: 'Dante', year: 2006, col: 'amber', scale: 512,
      scaleText: 'up to 512 each way',
      rows: [
        ['what it is', 'audio over standard IP networks, routable'],
        ['channels', 'hundreds. Limited by the link, not by the protocol.'],
        ['network', 'ordinary managed switches. Can share with other traffic, carefully.'],
        ['latency', 'you choose it: 0.15 ms to 5 ms'],
        ['clock', 'PTP, elected automatically, and the thing that goes wrong'],
        ['still used', 'it is the industry default'],
      ],
      note: '<b>Dante won by being ordinary.</b> Routable IP, standard switches, and a latency you set rather than accept. What it costs you is the clock: the whole system now depends on a PTP election you did not make and cannot see, which is why Class 5 spends so long on grandmasters and PTP aware switches.',
    },
    {
      short: 'AVB / Milan', name: 'AVB, and Milan', year: 2011, col: 'green', scale: 420,
      scaleText: 'reserved, guaranteed',
      rows: [
        ['what it is', 'a set of IEEE standards built into the switches themselves'],
        ['the idea', 'the network reserves bandwidth in advance for each stream'],
        ['network', 'every switch in the path must be AVB capable. No exceptions.'],
        ['latency', 'guaranteed, not just typical'],
        ['Milan', 'the pro audio profile, so devices from different makers interoperate'],
        ['still used', 'yes, in systems specified for it from the start'],
      ],
      note: '<b>The strongest guarantee, and the hardest sell.</b> AVB does not ask the network to behave, it makes the switches promise in advance. That is genuinely better engineering, and it means every switch in the path must support it, which is why it lost the general market and kept the systems that were designed around it.',
    },
    {
      short: 'Ravenna', name: 'Ravenna', year: 2010, col: 'cyan', scale: 512,
      scaleText: 'limited by the link',
      rows: [
        ['what it is', 'audio over IP built on open standards from the start'],
        ['built on', 'RTP and PTPv2, the same pieces AES67 later specified'],
        ['where it lives', 'broadcast, where it is close to the default'],
        ['sample rates', 'up to 384 kHz, and channel counts limited only by the link'],
        ['against Dante', 'more open, less turnkey. Dante discovers, Ravenna is configured.'],
      ],
      note: '<b>The broadcast answer to the same question.</b> Ravenna was built on published standards rather than one company\'s stack, which is why it feels less automatic than Dante and why it slots into a broadcast plant more comfortably. AES67 later formalised almost exactly what Ravenna was already doing, which is why the two get along so easily.',
    },
    {
      short: 'AES67', name: 'AES67', year: 2013, col: 'cyan', scale: 512,
      scaleText: 'interoperability layer',
      rows: [
        ['what it is', 'not a product. A set of rules for making the others talk.'],
        ['it specifies', 'RTP, PTPv2, 48 kHz, 1 ms packets, a discovery method'],
        ['who uses it', 'Dante, Ravenna, Q-LAN and Livewire all have an AES67 mode'],
        ['the catch', 'the common ground is narrow. You lose the features either side of it.'],
        ['and', 'ST 2110-30, the audio part of the broadcast standard, is AES67'],
      ],
      note: '<b>The peace treaty.</b> AES67 is not a competitor, it is the agreement that lets rival systems exchange audio. Switching a device into AES67 mode usually means giving up the convenience its own ecosystem provides, so it is what you use at a boundary rather than everywhere.',
    },
  ],
}));

// ============================================================================
// 2. Lighting: DMX to Art-Net to sACN
// ============================================================================

register('lighting-lineage', (host) => lineage(host, {
  figure: {
    title: 'How lighting control ran out of room, twice',
    sub: 'One cable per dimmer, then 512 levels per cable, then as many universes as the network can carry.',
    note: '&nbsp;',
  },
  from: 1975, to: 2020, start: 2,
  scaleLabel: 'DMX universes on one cable',
  eras: [
    {
      short: '0 to 10 V', name: 'Analogue control, 0 to 10 V', year: 1975, col: 'muted', scale: 0.002,
      scaleText: '1 dimmer per wire',
      rows: [
        ['what it is', 'a voltage per dimmer, one wire each, back to the desk'],
        ['scale', 'a 96 way rig is a 96 core cable'],
        ['resolution', 'continuous, in principle. Noise in practice.'],
        ['still used', 'rarely, and only on old installations'],
      ],
      note: '<b>One wire per channel.</b> The limit is not electrical, it is physical: the cable gets thicker every time the designer wants another dimmer. Multiplexing was inevitable, and the first attempts, like AMX192, were analogue and fragile.',
    },
    {
      short: 'DMX512', name: 'DMX512', year: 1986, col: 'amber', scale: 1,
      scaleText: '1 universe, 512 slots',
      rows: [
        ['what it is', 'a serial data stream, RS-485, 250,000 bits per second'],
        ['carries', '512 slots of one byte each, repeated forever'],
        ['refresh', 'about 44 complete frames per second, at best'],
        ['topology', 'daisy chain, terminated, roughly 32 devices per run'],
        ['direction', 'one way only. The desk never learns anything back.'],
        ['still used', 'universally. It is the last hop into almost every fixture.'],
      ],
      note: '<b>Thirty five years old and still the last metre of nearly every rig.</b> It survives because it is dumb: no addressing, no negotiation, no state. A fixture reads the slots at its address and obeys. Everything that came after DMX is a way of carrying DMX, not a replacement for it.',
    },
    {
      short: 'RDM', name: 'RDM (E1.20)', year: 2006, col: 'green', scale: 1,
      scaleText: 'same cable, both ways',
      rows: [
        ['what it is', 'a return path over the same pair, between DMX frames'],
        ['lets you', 'discover fixtures, read and set addresses, read lamp hours and errors'],
        ['needs', 'RDM capable splitters, which is why it often does not work'],
        ['still used', 'yes, where the infrastructure supports it'],
      ],
      note: '<b>DMX, but it answers back.</b> The idea is obvious and the deployment is not: one non-RDM splitter anywhere in the chain silently blocks the return path, so a venue full of RDM fixtures can have no RDM at all. Check the splitters, not the fixtures.',
    },
    {
      short: 'Art-Net', name: 'Art-Net', year: 1998, col: 'cyan', scale: 32768,
      scaleText: '32,768 universes',
      rows: [
        ['what it is', 'DMX universes carried in UDP packets, port 6454'],
        ['scale', '32,768 universes in Art-Net 4'],
        ['addressing', 'broadcast originally, unicast and multicast added later'],
        ['the legacy trap', 'the traditional 2.x.x.x range is real public address space'],
        ['priority', 'none. Two senders on one universe is a race.'],
        ['still used', 'widely, and free to implement, which is why'],
      ],
      note: '<b>Free, early and everywhere.</b> Art-Net solved the universe count problem years before there was a standard, and it is still the default on a great deal of equipment. Its two weaknesses matter on a big rig: broadcast by default floods a network, and with no priority field, two senders on one universe is decided by whichever packet arrived last.',
    },
    {
      short: 'sACN', name: 'Streaming ACN (E1.31)', year: 2009, col: 'amber', scale: 63999,
      scaleText: '63,999 universes',
      rows: [
        ['what it is', 'the ANSI standard for DMX over IP, UDP port 5568'],
        ['scale', '63,999 universes'],
        ['addressing', 'multicast by default, one group per universe'],
        ['priority', '0 to 200, so a backup desk can sit on the same universe'],
        ['sync', 'synchronisation packets, so universes change together'],
        ['still used', 'the default choice for new work'],
      ],
      note: '<b>The grown up version.</b> Multicast means a switch with IGMP snooping delivers each universe only to the ports that asked for it, instead of flooding everything. The priority field means a backup console is a configuration rather than a gamble. Both of those are why sACN is what you specify now, and both depend on the network being set up properly, which is Class 3.',
    },
  ],
}));

// ============================================================================
// 3. Video: what the connector can actually carry
// ============================================================================

const LINKS = [
  ['VGA', 1987, null, 'analogue RGBHV, no fixed ceiling, degrades with length'],
  ['DVI single link', 1999, 3.96, 'digital TMDS. 1920 × 1200 at 60.'],
  ['DVI dual link', 1999, 7.92, 'two TMDS links in one connector'],
  ['HDMI 1.4', 2009, 8.16, 'adds 4K at 30, audio return, ethernet channel'],
  ['3G-SDI', 2006, 2.7, 'BNC, locking, long runs. Broadcast.'],
  ['HDMI 2.0', 2013, 14.4, '4K at 60, 8 bit 4:4:4'],
  ['DP 1.2', 2010, 17.28, 'packetised, and MST: several displays from one port'],
  ['12G-SDI', 2015, 11.88, '4K at 60 on one BNC'],
  ['DP 1.4', 2016, 25.92, 'plus DSC, visually lossless, which changes the answer'],
  ['HDMI 2.1', 2017, 42.6, 'FRL signalling replaces TMDS. 8K at 60.'],
  ['DP 2.1', 2022, 77.4, 'UHBR. 80 Gbit/s raw.'],
];

register('video-link', (host) => {
  const st = { res: '3840x2160', fps: 60, bits: 8, chroma: 3 };
  const { controls, stage, setNote } = figure(host, {
    title: 'Will this picture fit down that cable?',
    sub: 'The connector evolution is one number getting bigger. Pick a format and see exactly where each generation stops.',
    note: '&nbsp;',
  });

  let cv;
  cv = canvas(stage, {
    height: 360,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(580, w - 24), ox = (w - W) / 2;
      const [pw, ph] = st.res.split('x').map(Number);
      // Blanking overhead: reduced blanking adds roughly 5 per cent.
      const need = (pw * ph * st.fps * st.bits * st.chroma * 1.05) / 1e9;

      label(g, `${pw} × ${ph}  ·  ${st.fps} fps  ·  ${st.bits} bit  ·  ${st.chroma === 3 ? '4:4:4' : st.chroma === 2 ? '4:2:2' : '4:2:0'}`,
        ox, 16, { color: p.ink, size: 12, weight: 650, ...mono });
      label(g, `${pw} × ${ph} × ${st.fps} × ${st.bits} × ${st.chroma} × 1.05 ÷ 1e9  =  ${need.toFixed(2)} Gbit/s`,
        ox, 36, { color: p.amber, size: 12, weight: 650, ...mono });

      const maxCap = 80;
      const rowH = 26, oy = 58;
      LINKS.forEach((L, i) => {
        const [name, year, cap, note] = L;
        const y = oy + i * rowH;
        const ok = cap === null ? null : cap >= need;
        const col = ok === null ? p.muted : (ok ? p.green : p.red);
        label(g, name, ox, y + 9, { color: ok === false ? p.muted : p.ink2, size: 11.5, weight: ok ? 650 : 500 });
        label(g, String(year), ox + 118, y + 9, { color: p.muted, size: 10.5, ...mono });
        const bx = ox + 156, bw = W - 232;
        box(g, bx, y + 2, bw, 14, { fill: alpha(p.line, 0.35), stroke: 'transparent', r: 3 });
        if (cap !== null) {
          const frac = Math.min(1, Math.log10(cap + 1) / Math.log10(maxCap + 1));
          box(g, bx, y + 2, Math.max(3, bw * frac), 14, { fill: alpha(col, 0.6), stroke: col, r: 3, lw: 1 });
          label(g, `${cap} Gbit/s`, bx + 6, y + 9, { color: p.ink, size: 10, ...mono });
        } else {
          label(g, 'analogue', bx + 6, y + 9, { color: p.muted, size: 10, ...mono });
        }
        // Where the requirement falls across the scale.
        const nf = Math.min(1, Math.log10(need + 1) / Math.log10(maxCap + 1));
        line(g, bx + bw * nf, y, bx + bw * nf, y + 18, { color: p.amber, lw: 1.5 });
        label(g, ok === null ? '—' : (ok ? 'fits' : 'no'), ox + W - 62, y + 9,
          { color: col, size: 11, weight: 700, ...mono });
      });
      label(g, 'the amber line is what you asked for', ox + 156, oy + LINKS.length * rowH + 12,
        { color: p.muted, size: 10.5 });
    },
  });

  const upd = () => {
    cv.once();
    const [pw, ph] = st.res.split('x').map(Number);
    const need = (pw * ph * st.fps * st.bits * st.chroma * 1.05) / 1e9;
    const first = LINKS.find((L) => L[2] !== null && L[2] >= need);
    if (!first) setNote(`<b>${need.toFixed(1)} Gbit/s, and nothing on the list carries it uncompressed.</b> This is where DSC and JPEG XS come in: compress it visually losslessly and the same cable does carry it. That is the same trade as everywhere else in this module, arriving in a connector.`);
    else if (st.chroma < 3) setNote(`<b>${need.toFixed(2)} Gbit/s.</b> Dropping the chroma is what made this fit, and it is the Class 2 argument arriving as a cable choice: the brightness plane is untouched, so on normal content nobody sees it, and on fine coloured text everybody does. The earliest connector that carries it is <b>${first[0]}</b>, from ${first[1]}.`);
    else setNote(`<b>${need.toFixed(2)} Gbit/s.</b> The earliest connector that carries this is <b>${first[0]}</b>, from ${first[1]}. Notice that the whole connector story is one number getting bigger: every generation exists because somebody wanted more pixels, more frames or more bits, and the previous cable ran out. ${first[0].startsWith('DP') ? 'DisplayPort does it by sending packets rather than a continuous stream, which is also how one port drives several displays.' : ''}`);
  };

  controls.append(
    choice('Resolution', [['1920x1080', '1080p'], ['2560x1440', '1440p'], ['3840x2160', '4K UHD'], ['7680x4320', '8K']], { value: '3840x2160', on: (v) => { st.res = v; upd(); } }).node,
    choice('Frame rate', [['24', '24'], ['30', '30'], ['60', '60'], ['120', '120']], { value: '60', on: (v) => { st.fps = +v; upd(); } }).node,
    choice('Bit depth', [['8', '8 bit'], ['10', '10 bit'], ['12', '12 bit']], { value: '8', on: (v) => { st.bits = +v; upd(); } }).node,
    choice('Chroma', [['3', '4:4:4'], ['2', '4:2:2'], ['1.5', '4:2:0']], { value: '3', on: (v) => { st.chroma = +v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 4. Parallel against serial, and why serial won everything
// ============================================================================

register('serial-parallel', (host) => {
  const st = { skew: 0.35, rate: 1, mode: 'both' };
  const { controls, stage, setNote } = figure(host, {
    title: 'Why every fast connector is one wire, not eight',
    sub: 'Parallel looks obviously faster. Push the speed up and watch what happens to it.',
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
      const bitW = 46 / st.rate;

      // Eight lines, each with its own small delay. That delay is fixed by the
      // cable; the bit period shrinks as you go faster, so the ratio is what
      // matters, and the ratio is what kills it.
      const oy = 34;
      label(g, '8 parallel lines, one bit each', ox, 18, { color: p.cyan, size: 11.5, weight: 650 });
      let worst = 0;
      for (let i = 0; i < 8; i++) {
        const y = oy + i * 15;
        const lag = st.skew * ((i * 37) % 11) / 10;
        worst = Math.max(worst, lag);
        line(g, ox + 74, y, ox + W - 40, y, { color: alpha(p.line, 0.6), lw: 1 });
        label(g, `bit ${i}`, ox, y, { color: p.muted, size: 10, ...mono });
        for (let k = -1; k < 14; k++) {
          const x = ox + 74 + ((t * 90 * st.rate + k * bitW + lag * bitW) % (W - 118));
          const on = ((k + i) % 3) !== 0;
          if (x > ox + 74 && x < ox + W - 40) {
            g.fillStyle = on ? p.cyan : alpha(p.cyan, 0.18);
            g.fillRect(x, y - 5, Math.max(2, bitW * 0.62), 10);
          }
        }
      }
      // The sampling instant: everything must have arrived by now.
      const sx = ox + W - 46;
      line(g, sx, oy - 8, sx, oy + 8 * 15, { color: p.amber, lw: 2 });
      label(g, 'sample here', sx + 4, oy - 14, { color: p.amber, size: 10, ...mono });

      const ratio = (worst * 100);
      const broken = worst > 0.5;
      label(g, broken
        ? `skew is ${ratio.toFixed(0)} % of one bit period: the byte is scrambled`
        : `skew is ${ratio.toFixed(0)} % of one bit period: still readable`,
        ox, oy + 8 * 15 + 16, { color: broken ? p.red : p.green, size: 12, weight: 650 });

      // The serial line: one pair, eight times the rate, nothing to align.
      const sy = oy + 8 * 15 + 44;
      label(g, '1 serial line, same eight bits, eight times the rate', ox, sy - 10,
        { color: p.green, size: 11.5, weight: 650 });
      line(g, ox + 74, sy + 14, ox + W - 40, sy + 14, { color: alpha(p.line, 0.6), lw: 1 });
      label(g, 'data', ox, sy + 14, { color: p.muted, size: 10, ...mono });
      for (let k = -1; k < 60; k++) {
        const x = ox + 74 + ((t * 90 * st.rate * 8 + k * (bitW / 4)) % (W - 118));
        const on = (k % 3) !== 0;
        if (x > ox + 74 && x < ox + W - 40) {
          g.fillStyle = on ? p.green : alpha(p.green, 0.18);
          g.fillRect(x, sy + 9, Math.max(1.5, (bitW / 4) * 0.62), 10);
        }
      }
      label(g, 'no other line to agree with, so there is no skew to fail',
        ox + 74, sy + 38, { color: p.muted, size: 11 });
    },
  });

  const upd = () => {
    if (st.skew > 0.5) setNote('<b>This is why parallel stopped.</b> Every conductor has a slightly different length and a slightly different characteristic, so its bits arrive slightly early or late. That difference, the <b>skew</b>, is fixed by the cable. Go faster and the bit period shrinks while the skew does not, so eventually the byte cannot be reassembled. Making the cable faster makes it worse.');
    else setNote('At this speed the skew is a small fraction of one bit period, so all eight bits are still inside the sampling window and the byte reads correctly. <b>Now push the rate up.</b> The lines are unchanged; the window is what shrinks.');
  };

  controls.append(
    slider('Data rate', { min: 0.4, max: 4, step: 0.1, value: 1, fmt: (v) => `${v.toFixed(1)}x`, on: (v) => { st.rate = v; st.skew = 0.35 * v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 5. How a disk actually finds your file
// ============================================================================

register('disk-access', (host) => {
  const st = { kind: 'hdd', pattern: 'seq' };
  const { controls, stage, setNote } = figure(host, {
    title: 'How a drive finds the next frame',
    sub: 'A platter has to move something. Flash does not. That one difference is the whole argument.',
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
      const R = 86, cx = ox + R + 20, cy = 118;

      // Where the next few reads are.
      const blocks = [];
      for (let i = 0; i < 7; i++) {
        const u = st.pattern === 'seq' ? 0.34 + i * 0.022 : ((Math.sin(i * 91.7) * 43758.5) % 1 + 1) % 1 * 0.62 + 0.28;
        const a = st.pattern === 'seq' ? (i * 0.55) : (((Math.sin(i * 12.9) * 4375.5) % 1 + 1) % 1) * 6.28;
        blocks.push([u, a]);
      }
      const idx = Math.floor(t * 1.6) % blocks.length;
      const [tu, ta] = blocks[idx];

      if (st.kind === 'hdd') {
        // The platter, spinning, and a head that has to be moved.
        g.fillStyle = alpha(p.line, 0.28);
        g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
        g.fillStyle = alpha(p.ground, 1);
        g.beginPath(); g.arc(cx, cy, R * 0.22, 0, 7); g.fill();
        for (let r = 0.3; r < 1; r += 0.09) {
          g.strokeStyle = alpha(p.line, 0.5); g.lineWidth = 0.6;
          g.beginPath(); g.arc(cx, cy, R * r, 0, 7); g.stroke();
        }
        const spin = t * 5.2;
        blocks.forEach(([u, a], i) => {
          const ang = a + spin;
          const bx = cx + Math.cos(ang) * R * u, by = cy + Math.sin(ang) * R * u;
          g.fillStyle = i === idx ? p.amber : alpha(p.cyan, 0.5);
          g.fillRect(bx - 3, by - 3, 6, 6);
        });
        // The arm, easing towards the current radius: that easing is the seek.
        const armR = R * tu;
        const ax = cx + armR, ay = cy;
        line(g, cx + R + 40, cy - 60, ax, ay, { color: p.red, lw: 3 });
        g.fillStyle = p.red; g.beginPath(); g.arc(ax, ay, 4, 0, 7); g.fill();
        label(g, 'the head has to be moved, then the platter has to come round',
          ox, cy + R + 24, { color: p.muted, size: 11 });
      } else {
        // Flash: a grid of cells, any of which is equally close.
        const cols = 14, rows = 9, cw = (R * 2) / cols, chh = (R * 1.6) / rows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const hit = blocks.some(([u, a], k) => k === idx && Math.floor(u * 90) % (cols * rows) === i);
          g.fillStyle = hit ? p.amber : alpha(p.line, 0.35);
          g.fillRect(cx - R + c * cw, cy - R * 0.8 + r * chh, cw - 2, chh - 2);
        }
        label(g, 'every cell is the same distance away: there is nothing to move',
          ox, cy + R + 24, { color: p.muted, size: 11 });
      }

      // The numbers, which are the actual lesson.
      const rx = ox + R * 2 + 60;
      const seek = st.kind === 'hdd' ? (st.pattern === 'seq' ? 0.2 : 9.0) : 0.05;
      const iops = st.kind === 'hdd' ? (st.pattern === 'seq' ? 1200 : 110) : (st.pattern === 'seq' ? 90000 : 60000);
      const mbs = st.kind === 'hdd' ? (st.pattern === 'seq' ? 180 : 1.2) : (st.pattern === 'seq' ? 3500 : 900);
      let ry = 38;
      const row = (k, v, col) => {
        label(g, k, rx, ry, { color: p.muted, size: 11, ...mono });
        label(g, v, rx, ry + 18, { color: col, size: 14, weight: 700, ...mono });
        ry += 46;
      };
      row('time to reach a block', `${seek.toFixed(2)} ms`, seek > 3 ? p.red : p.green);
      row('reads per second', fmt(iops), iops < 500 ? p.red : p.green);
      row('throughput', `${fmt(mbs)} MB/s`, mbs < 100 ? p.red : p.green);
      label(g, st.pattern === 'seq' ? 'reading one file, in order' : 'reading scattered blocks',
        rx, ry - 12, { color: p.ink2, size: 11.5 });
    },
  });

  const upd = () => {
    if (st.kind === 'hdd' && st.pattern === 'rand') setNote('<b>This is the number that ends the argument.</b> A spinning disk reading scattered blocks does about 110 reads a second, because each one waits for the head to move and then for the platter to bring the data round. Sequential, the same drive does fine. So a hard disk is perfectly good at playing one file and hopeless the moment six layers are being read at once, which is exactly what a media server does.');
    else if (st.kind === 'hdd') setNote('<b>One file, in order.</b> The head barely moves, so a spinning disk manages a respectable 180 MB/s. This is the number on the box, and it is true, and it is measured under the one condition a show almost never provides.');
    else setNote('<b>Flash has nothing to move.</b> Every cell is the same distance away, so scattered blocks cost almost the same as sequential ones. That is the whole reason a media server is built on NVMe: not the peak figure, but that the figure barely changes when the workload gets awkward.');
  };

  controls.append(
    choice('Drive', [['hdd', 'Spinning disk'], ['ssd', 'Flash / NVMe']], { value: 'hdd', on: (v) => { st.kind = v; upd(); } }).node,
    choice('What it is reading', [['seq', 'One file, in order'], ['rand', 'Scattered blocks']], { value: 'seq', on: (v) => { st.pattern = v; upd(); } }).node
  );
  upd();
});

// ============================================================================
// 6. Storage media: how the same space kept holding more
// ============================================================================

register('storage-lineage', (host) => lineage(host, {
  figure: {
    title: 'How the same piece of plastic kept holding more',
    sub: 'Every jump came from making the mark smaller, and making the mark smaller needed a shorter wavelength or a different physics.',
    note: '&nbsp;',
  },
  from: 1980, to: 2025, start: 5,
  scaleLabel: 'capacity, on a log scale',
  eras: [
    {
      short: 'Floppy', name: '3.5 inch floppy disk', year: 1987, col: 'muted', scale: 0.0014,
      scaleText: '1.44 MB',
      rows: [
        ['how it reads', 'a magnetic head touching a spinning plastic disc'],
        ['capacity', '1.44 MB, which is about 8 seconds of 48 kHz stereo audio'],
        ['the limit', 'the head has to physically touch, so the track cannot get much finer'],
        ['speed', 'about 0.06 MB/s'],
      ],
      note: '<b>Where the mental model comes from.</b> A head touching a spinning surface: everything up to the hard disk is a refinement of this. The limit is mechanical, so making it hold more means making the tracks finer, and a head in contact can only be so precise.',
    },
    {
      short: 'CD', name: 'Compact Disc', year: 1982, col: 'cyan', scale: 0.7,
      scaleText: '700 MB',
      rows: [
        ['how it reads', 'a 780 nm infrared laser reading pits pressed into the disc'],
        ['capacity', '700 MB, or 74 minutes of 44.1 kHz 16 bit audio'],
        ['why that audio format', 'the disc size was chosen to fit a symphony. Genuinely.'],
        ['the jump', 'no contact, so the marks can be far smaller than a magnetic head allows'],
      ],
      note: '<b>Light instead of contact.</b> Nothing touches the disc, so the marks can be as small as the laser can resolve. That is the first appearance of the rule that governs everything after it: <b>capacity is set by how small a mark you can read, and that is set by your wavelength.</b>',
    },
    {
      short: 'DVD', name: 'DVD', year: 1996, col: 'cyan', scale: 4.7,
      scaleText: '4.7 GB, 8.5 dual layer',
      rows: [
        ['how it reads', 'a 650 nm red laser. Shorter wavelength, smaller pits.'],
        ['capacity', '4.7 GB single layer, 8.5 GB dual layer'],
        ['the trick', 'a second layer, read by refocusing the laser deeper into the disc'],
        ['the jump', 'roughly seven times a CD, from the same piece of plastic'],
      ],
      note: '<b>Same disc, shorter wavelength.</b> 780 nm to 650 nm, and the pits shrink accordingly. Then a second layer, reached by refocusing rather than by flipping the disc. Two ideas, seven times the capacity, and the physical object did not change at all.',
    },
    {
      short: 'Blu-ray', name: 'Blu-ray', year: 2006, col: 'green', scale: 25,
      scaleText: '25 GB, 100 GB triple',
      rows: [
        ['how it reads', 'a 405 nm blue violet laser'],
        ['capacity', '25 GB per layer, up to 100 GB on triple layer discs'],
        ['the jump', 'the shortest wavelength that was practical to manufacture'],
        ['what ended it', 'not a technical limit. Networks got faster than discs.'],
      ],
      note: '<b>The end of the optical line, and not for a technical reason.</b> Blue violet at 405 nm is where the wavelength argument ran out of cheap physics, and by the time it arrived, delivering a file over a network was easier than shipping a disc. The format did not fail; the problem it solved stopped being a problem.',
    },
    {
      short: 'HDD', name: 'Hard disk', year: 1990, col: 'amber', scale: 20000,
      scaleText: 'up to 20 TB',
      rows: [
        ['how it reads', 'a head flying nanometres above a spinning magnetic platter'],
        ['capacity', 'terabytes, and still the cheapest per terabyte'],
        ['the catch', 'reaching a block means moving the head and waiting for the platter'],
        ['on a show', 'fine for one file in order, hopeless for many at once'],
      ],
      note: '<b>Back to magnetism, but flying rather than touching.</b> Density came from perpendicular recording and ever finer heads, and it worked so well that capacity stopped being the interesting number. What stayed the same is the mechanical part, and that is what a media server cannot tolerate.',
    },
    {
      short: 'SSD / NVMe', name: 'Flash, and NVMe', year: 2010, col: 'green', scale: 8000,
      scaleText: 'TB, with no moving part',
      rows: [
        ['how it reads', 'charge trapped in cells. Nothing moves, ever.'],
        ['density from', 'stacking cells vertically, 3D NAND, now over 200 layers'],
        ['and from', 'storing several bits per cell, at a cost in endurance'],
        ['NVMe', 'a protocol designed for flash rather than inherited from disks'],
        ['on a show', 'scattered reads cost nearly the same as sequential ones'],
      ],
      note: '<b>The mark stopped being a mark.</b> Nothing is written on a surface: charge is trapped in a cell, and density comes from stacking cells upward rather than shrinking them sideways. NVMe matters as much as the flash does, because SATA was a protocol designed around a device that had to seek, and flash does not. <b>The interface was the bottleneck once the physics stopped being one.</b>',
    },
  ],
}));

// ============================================================================
// 7. Video over IP: three answers, and they are answers to different questions
// ============================================================================

register('video-ip-lineage', (host) => lineage(host, {
  figure: {
    title: 'Video on a network, and why there are three answers',
    sub: 'Not a progression. Three different trades between bandwidth, latency and how much network you had to build.',
    note: '&nbsp;',
  },
  from: 1988, to: 2025, start: 2,
  scaleLabel: 'HD streams that fit on one 1 Gbit link',
  eras: [
    {
      short: 'SDI', name: 'SDI, the baseline', year: 1989, col: 'muted', scale: 0.01,
      scaleText: 'not a network at all',
      rows: [
        ['what it is', 'uncompressed video on one 75 ohm coax, BNC, point to point'],
        ['rates', 'HD-SDI 1.485 Gbit/s, 3G 2.97, 12G 11.88 for 4K at 60'],
        ['latency', 'essentially none. It is a wire.'],
        ['negotiation', 'none. No EDID, no HDCP, no handshake to fail.'],
        ['still used', 'everywhere, and it is not going anywhere'],
      ],
      note: '<b>The thing everything else is measured against.</b> One cable, one picture, no negotiation, long runs, locking connectors. Its limit is exactly its virtue: one cable carries one signal in one direction, so a large facility becomes a very large amount of coax and a router the size of a wardrobe.',
    },
    {
      short: 'ST 2022-6', name: 'ST 2022-6', year: 2012, col: 'amber', scale: 0.4,
      scaleText: 'less than one',
      rows: [
        ['what it is', 'the whole SDI stream, uncompressed, wrapped in IP packets'],
        ['bandwidth', 'about 3 Gbit/s for HD. Two do not fit on a 10 Gbit link comfortably.'],
        ['the idea', 'change the transport, change nothing else'],
        ['the limit', 'video, audio and data stay braided together, as on SDI'],
        ['still used', 'as a transition step, mostly superseded by 2110'],
      ],
      note: '<b>The obvious first attempt, and it worked.</b> Take what SDI carries and put it in packets. Nothing above the transport has to change, so it was easy to adopt, and it inherits SDI\'s one weakness: everything travels together, so a monitor that only wants the picture still receives all of it.',
    },
    {
      short: 'NDI', name: 'NDI', year: 2015, col: 'green', scale: 7,
      scaleText: 'about 7 HD streams',
      rows: [
        ['what it is', 'compressed video over ordinary networks, with discovery that just works'],
        ['bandwidth', 'roughly 100 to 250 Mbit/s for HD. NDI HX is far less.'],
        ['network', '1 Gbit is workable. No special switches, no PTP required.'],
        ['latency', 'low, but a frame or more, and it varies'],
        ['right for', 'monitoring, IMAG, streaming, comfort feeds, anything on the office network'],
      ],
      note: '<b>NDI won the middle of the market by asking for nothing.</b> Plug it into the network you already have, and devices find each other. It compresses, so it costs you a frame or so of latency and a small amount of quality, and it does not guarantee anything. For a show critical main screen feed on a network nobody designed, that combination is a risk. For everything else it is enormously useful.',
    },
    {
      short: 'JPEG XS', name: 'JPEG XS, and ST 2110-22', year: 2019, col: 'cyan', scale: 2,
      scaleText: 'about 2 to 4 HD streams',
      rows: [
        ['what it is', 'visually lossless compression, roughly 4:1 to 10:1'],
        ['latency', 'a few lines, not a frame. Sub frame, by design.'],
        ['why it exists', '2.5 Gbit/s per stream is too much; a frame of delay is too slow'],
        ['and', 'repeated encode and decode passes do not accumulate visible damage'],
        ['still used', 'growing, especially for remote production'],
      ],
      note: '<b>The compromise that refuses both compromises.</b> Full uncompressed is too much bandwidth; NDI\'s frame of latency is too slow for a live path. JPEG XS compresses only within a few lines of the picture, so the delay is a fraction of a frame. "Visually lossless" is an engineering claim about typical material, not a guarantee, and it can still be provoked by fine coloured text and hard saturated edges.',
    },
    {
      short: 'ST 2110', name: 'SMPTE ST 2110', year: 2017, col: 'red', scale: 0.4,
      scaleText: 'less than one',
      rows: [
        ['what it is', 'uncompressed, with video, audio and data as separate flows'],
        ['bandwidth', 'about 2.5 Gbit/s for HD. 10 Gbit minimum, 25 for UHD.'],
        ['clock', 'PTP, mandatory. It is the only thing holding the parts together.'],
        ['audio', 'ST 2110-30, which is AES67. The families meet here.'],
        ['right for', 'broadcast plant, large permanent installations'],
      ],
      note: '<b>The one idea worth stealing even if you never use it.</b> Separating the essences means a device takes only what it needs: a timecode reader takes 40 kbit/s instead of 2.5 Gbit/s. The cost is that the parts can now arrive separately, so the shared clock stops being infrastructure and becomes the thing the picture is made of. Take away PTP and you do not have a degraded video system, you have three unrelated streams.',
    },
  ],
}));

// ============================================================================
// 8. The speed limit, which is the one thing no technology gets around
// ============================================================================

const MEDIA = {
  copper: { label: 'Copper', v: 0.66, note: 'twisted pair or coax, roughly two thirds of light in vacuum' },
  fibre: { label: 'Standard fibre', v: 0.68, note: 'glass core, refractive index about 1.47' },
  hollow: { label: 'Hollow core fibre', v: 0.997, note: 'light travels in air down the middle. Real, deployed, expensive.' },
  radio: { label: 'Radio or free space', v: 1.0, note: 'the actual speed of light. Nothing beats this.' },
};

const MARKS = [
  [0.04, 'one frame at 25 fps', 'red'],
  [0.01, 'in-ear monitoring starts to feel late', 'amber'],
  [0.002, 'a large venue, end to end', 'green'],
];

register('speed-limit', (host) => {
  const st = { km: 1, med: 'fibre', proc: 8 };
  const { controls, stage, setNote } = figure(host, {
    title: 'The floor under every latency budget',
    sub: 'Distance divided by the speed of light in whatever you are sending it down. No protocol, codec or future technology moves this number.',
    note: '&nbsp;',
  });

  let cv, pend = false;
  const fit = (want) => {
    if (!cv || pend || Math.abs(cv.h - want) < 3) return;
    pend = true;
    requestAnimationFrame(() => { pend = false; cv.setHeight(Math.round(want)); });
  };
  cv = canvas(stage, {
    height: 300,
    animated: false,
    draw(g, w) {
      const p = palette();
      const W = Math.min(560, w - 24), ox = (w - W) / 2;
      const c = 299792.458;                          // km per second, in vacuum
      const v = c * MEDIA[st.med].v;
      const oneWay = (st.km / v) * 1000;             // ms
      const round = oneWay * 2;
      const total = round + st.proc;

      // Every medium, so the comparison is visible rather than asserted.
      let y = 30;
      label(g, `${st.km >= 1 ? st.km.toLocaleString('en-US') : st.km} km, one way`, ox, 14,
        { color: p.ink, size: 12, weight: 650, ...mono });
      const maxMs = (st.km / (c * 0.66)) * 1000;
      for (const [k, m] of Object.entries(MEDIA)) {
        const ms = (st.km / (c * m.v)) * 1000;
        const on = k === st.med;
        const bw = W - 210;
        label(g, m.label, ox, y + 7, { color: on ? p.ink : p.muted, size: 11.5, weight: on ? 700 : 500 });
        box(g, ox + 132, y, bw, 15, { fill: alpha(p.line, 0.3), stroke: 'transparent', r: 3 });
        box(g, ox + 132, y, Math.max(2, bw * (ms / (maxMs || 1))), 15,
          { fill: alpha(on ? p.amber : p.muted, on ? 0.7 : 0.3), stroke: on ? p.amber : 'transparent', r: 3, lw: 1 });
        label(g, `${ms < 1 ? ms.toFixed(3) : ms.toFixed(2)} ms`, ox + 140 + bw, y + 7,
          { color: on ? p.ink2 : p.muted, size: 11, ...mono });
        y += 24;
      }
      label(g, MEDIA[st.med].note, ox, y + 6, { color: p.muted, size: 11 });

      // The budget: propagation there and back, plus everything else. The
      // thresholds are stacked above it, because three of them at one height
      // just overprint each other.
      const by = y + 66;
      const scale = (W - 60) / Math.max(0.06, total);
      label(g, 'a round trip, plus the boxes at each end', ox, by - 10, { color: p.ink2, size: 11.5, weight: 600 });
      box(g, ox, by, Math.max(2, round * scale), 22, { fill: alpha(p.amber, 0.55), stroke: p.amber, r: 4, lw: 1 });
      box(g, ox + Math.max(2, round * scale), by, Math.max(2, st.proc * scale), 22,
        { fill: alpha(p.cyan, 0.4), stroke: p.cyan, r: 4, lw: 1 });
      label(g, `${total.toFixed(1)} ms`, ox + W - 46, by + 11, { color: p.ink, size: 13, weight: 700, ...mono });
      label(g, `${round.toFixed(2)} ms of physics`, ox + 4, by + 34, { color: p.amber, size: 11, ...mono });
      label(g, `${st.proc} ms of equipment`, ox + 4, by + 52, { color: p.cyan, size: 11, ...mono });

      // The thresholds that decide whether it matters.
      MARKS.forEach(([sec, lbl, col], i) => {
        const ms = sec * 1000;
        if (ms > total * 1.6) return;
        const x = ox + Math.min(W - 8, ms * scale);
        const ly = by - 52 + i * 14;
        line(g, x, ly - 3, x, by + 28, { color: alpha(p[col], 0.85), lw: 1.3, dash: [4, 3] });
        const flip = x > ox + W - 190;
        label(g, lbl, flip ? x - 5 : x + 5, ly, { color: p[col], size: 9.5, align: flip ? 'right' : 'left' });
      });
      fit(by + 66);
    },
  });

  const upd = () => {
    cv.once();
    const c = 299792.458;
    const oneWay = (st.km / (c * MEDIA[st.med].v)) * 1000;
    const round = oneWay * 2;
    if (st.km <= 5) setMicro();
    else if (round + st.proc > 40) setNote(`<b>${(round + st.proc).toFixed(0)} ms round trip.</b> Past one frame at 25 fps, and ${round.toFixed(0)} ms of that is the distance itself. No codec, protocol or purchase reduces it: the only levers are a shorter path, a faster medium, or not needing the round trip. This is why remote production is designed around <b>not asking a question and waiting for the answer</b>.`);
    else setNote(`<b>${round.toFixed(2)} ms of propagation, ${st.proc} ms of equipment.</b> At this distance the boxes still dominate, so the useful work is in the buffers and the processing. Notice where that stops being true: past roughly ${Math.round((10 - st.proc) * (c * MEDIA[st.med].v) / 2000)} km the physics is the larger number and no amount of tuning helps.`);
    function setMicro() {
      setNote(`<b>${round.toFixed(3)} ms.</b> Inside a building, propagation is nothing: light crosses a large venue in about two microseconds. Everything you measure in a venue is <b>equipment</b>, which is good news, because equipment is a choice. The physics only starts to matter when the path leaves the building.`);
    }
  };

  controls.append(
    slider('Distance', { min: 0, max: 4.3, step: 0.05, value: 0, fmt: (v) => { const km = Math.round(10 ** v * 10) / 10; return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('en-US')} km`; }, on: (v) => { st.km = Math.round(10 ** v * 10) / 10; upd(); } }).node,
    choice('Medium', Object.entries(MEDIA).map(([k, m]) => [k, m.label]), { value: 'fibre', on: (v) => { st.med = v; upd(); } }).node,
    slider('Equipment at both ends', { min: 0, max: 60, step: 1, value: 8, fmt: (v) => `${v} ms`, on: (v) => { st.proc = v; upd(); } }).node
  );
  upd();
});
