// Hand-authored data for the interactive exercises.
//
// WHY this is not derived from the markdown: drill cards and glossary cards are
// generated from the tables at build time (see build.mjs), because those stay in
// sync automatically. These three need pedagogy that does not exist in the prose:
// a correct answer, a distractor, and an explanation of why the answer is right.

// Class 1 exercise. Sorting show traffic into the Four Flows.
// `why` is shown after grading, and is the actual teaching payload.
export const flowCards = [
  { t: 'A GO button press on a lighting console', f: 'control', why: 'An event. It fires once. If it is lost, the cue does not happen.' },
  { t: 'A DMX level being held at 50 percent', f: 'control', why: 'State. It repeats about 44 times a second, so a lost packet costs nothing.' },
  { t: '64 channels of Dante from stage to front of house', f: 'media', why: 'Continuous and large. About 74 Mbit/s of audio before overhead.' },
  { t: 'A word clock signal', f: 'clock', why: 'Tiny and ruthlessly regular. Carries no content, only agreement about when.' },
  { t: 'A designer copying a 4 GB file to the media server during a rehearsal', f: 'management', why: 'The villain. No deadline of its own, and it will happily starve everything that has one.' },
  { t: 'An NDI feed of the stage to the director monitor', f: 'media', why: 'Compressed but still large, roughly 100 to 250 Mbit/s for HD.' },
  { t: 'A Windows Update download starting at 19:58', f: 'management', why: 'Housekeeping that does not care what time it is. This is why show machines have updates disabled.' },
  { t: 'Timecode from the playback machine', f: 'clock', why: 'The shared spine every department follows independently.' },
  { t: 'An OSC message telling a video server to jump to a cue', f: 'control', why: 'An event, usually over UDP, with no retry. Fragile by design.' },
  { t: 'A projector reporting its lamp hours to a monitoring system', f: 'management', why: 'Useful, and it can wait. Nothing breaks if it arrives an hour late.' },
  { t: 'PTP grandmaster announcements on a Dante network', f: 'clock', why: 'How devices elect and follow one clock. Two masters is a classic failure.' },
  { t: 'sACN carrying 40 universes to the lighting nodes', f: 'control', why: 'State based, multicast, and tiny: about 10 Mbit/s for all 40.' },
  { t: 'A remote desktop session into the media server from the production office', f: 'management', why: 'Convenient and bursty. Keep it off the show VLAN.' },
  { t: 'Uncompressed 1080p60 to the LED processor over ST 2110', f: 'media', why: 'About 2.5 Gbit/s. Will not fit on a 1 Gbit link.' },
  { t: 'Genlock reference to the video switcher', f: 'clock', why: 'Video agreeing on when a frame starts. The picture equivalent of word clock.' },
  { t: 'A contact closure from the fire alarm stopping the show', f: 'control', why: 'An event, and deliberately the dumbest possible interface, because simplicity is a safety property.' },
  { t: 'A console backing itself up to a network share between shows', f: 'management', why: 'Essential, and it belongs in the gap between performances, not during one.' },
  { t: 'Art-Net from a visualiser to a node during programming', f: 'control', why: 'State based lighting data, UDP port 6454.' },
  { t: 'Two channels of AES3 to the amplifier rack', f: 'media', why: 'Digital audio content. Continuous, and it carries its own embedded clock.' },
  { t: 'A software licence server check on the media server', f: 'management', why: 'The reason air gap policies get quietly violated at 17:00. Plan for it.' },
  { t: 'MIDI Show Control GO sent to the sound playback machine', f: 'control', why: 'An event addressed to a device type and cue number. Old, limited, dependable.' },
  { t: 'The audio stream feeding a delay tower 40 m out', f: 'media', why: 'Continuous audio. Note the tower also needs a deliberate latency offset, which is a budget, not a fault.' },
  { t: 'An antivirus scheduled scan on the playback machine', f: 'management', why: 'A known cause of dropouts. It is on the hygiene checklist for exactly this reason.' },
  { t: 'LTC on an audio channel driving the lighting console', f: 'clock', why: 'Timecode as an audio signal, which is precisely why it can travel down any audio path.' },
];

export const flowMeta = {
  control: { label: 'Control', hint: 'Small, urgent, must arrive' },
  media: { label: 'Media', hint: 'Large, continuous, on time and in order' },
  clock: { label: 'Clock / sync', hint: 'Tiny, ruthlessly regular' },
  management: { label: 'Management', hint: 'Housekeeping, no deadline' },
};

// Class 3 exercise. A diagnosis simulator.
//
// Each scenario scores the ORDER of investigation, not just the final answer,
// because bottom-up diagnosis is the actual skill being taught. Steps carry a
// `layer` (1 physical, 2 addressing, 3 protocol, 4 software); choosing a high
// layer before ruling out a low one is what loses marks in the exam too.
export const faultScenarios = [
  {
    id: 'dup-ip',
    title: 'Two nodes, both misbehaving',
    brief:
      'Two Art-Net nodes on the same switch. Lighting output is intermittent on both. Unplug either one and the other works perfectly. Nobody changed anything today, but a spare node was swapped in this morning.',
    answer: 'duplicate-ip',
    steps: [
      { id: 'link', layer: 1, label: 'Check the link lights on both node ports', result: 'Both link lights are solid green at 100 Mbit.', useful: true },
      { id: 'ping', layer: 2, label: 'Ping each node from the console laptop', result: 'Both reply, but replies are inconsistent and some time out.', useful: true },
      { id: 'ipcheck', layer: 2, label: 'Read the IP address configured on each node', result: 'Both nodes are set to 2.0.0.21.', useful: true, reveals: true },
      { id: 'swap', layer: 1, label: 'Swap the patch leads between the two nodes', result: 'No change. The fault follows the nodes, not the cables.', useful: true },
      { id: 'reinstall', layer: 4, label: 'Reinstall the lighting software on the console laptop', result: 'Forty minutes gone. Nothing changed.', useful: false },
      { id: 'firmware', layer: 4, label: 'Update the node firmware', result: 'Both nodes reboot. The fault returns immediately.', useful: false },
    ],
    options: [
      { id: 'duplicate-ip', label: 'Duplicate IP address on the two nodes' },
      { id: 'bad-cable', label: 'A damaged patch lead' },
      { id: 'wrong-universe', label: 'Wrong universe number configured' },
      { id: 'switch-fault', label: 'A failing switch port' },
    ],
    explain:
      'The signature of a duplicate IP is exactly this: intermittent, both devices affected, and each works perfectly when the other is unplugged. The spare node came out of the store with the same address as the one it replaced. It is the hardest fault for a first year to name, and the easiest to fix once named.',
  },
  {
    id: 'igmp',
    title: 'It worked all afternoon',
    brief:
      'A Dante system was checked at 14:00 and was perfect. At 19:15, fifteen minutes into the show, audio from the stage boxes drops out entirely. The lighting network, on a separate switch, is unaffected. The audio switch is a new managed model installed last week.',
    answer: 'igmp-no-querier',
    steps: [
      { id: 'link', layer: 1, label: 'Check link lights on the stage box and the switch', result: 'All links are up at 1 Gbit. No errors on the port counters.', useful: true },
      { id: 'ping', layer: 2, label: 'Ping the stage boxes', result: 'All devices reply normally. Addressing is fine.', useful: true },
      { id: 'dante', layer: 3, label: 'Open Dante Controller and look at the subscriptions', result: 'Subscriptions show as subscribed but not receiving. Clock status is healthy.', useful: true },
      { id: 'igmpcfg', layer: 3, label: 'Read the switch multicast configuration', result: 'IGMP snooping is enabled. No querier is configured anywhere on the network.', useful: true, reveals: true },
      { id: 'timing', layer: 3, label: 'Ask what time the fault started relative to the last reboot', result: 'It ran clean for about five hours after the switch was last powered up.', useful: true },
      { id: 'replace', layer: 1, label: 'Replace the stage box with a spare', result: 'Same fault. Twenty minutes lost during a performance.', useful: false },
    ],
    options: [
      { id: 'igmp-no-querier', label: 'IGMP snooping enabled with no querier' },
      { id: 'clock-master', label: 'Two clock masters fighting' },
      { id: 'bandwidth', label: 'The link ran out of bandwidth' },
      { id: 'duplicate-ip', label: 'Duplicate IP address' },
    ],
    explain:
      'Snooping on with no querier is the show killer, and the giveaway is the timing. Everything works while the initial subscriptions hold, then group memberships time out and the switch stops forwarding the multicast. It fails hours later, which is exactly when nobody is looking. Either configure a querier or use a switch that is not half configured.',
  },
  {
    id: 'link-local',
    title: 'The node the console cannot find',
    brief:
      'A new DMX node has been added to a working rig. The console cannot discover it. The node front panel shows 169.254.11.7. Every other node on the rig is on 10.101.1.x with a /24 mask.',
    answer: 'dhcp-no-server',
    steps: [
      { id: 'link', layer: 1, label: 'Check the link light on the node', result: 'Solid, 100 Mbit, connected to a working switch port.', useful: true },
      { id: 'read', layer: 2, label: 'Read the address the node is reporting', result: '169.254.11.7. A self assigned link local address.', useful: true, reveals: true },
      { id: 'mode', layer: 2, label: 'Check whether the node is set to DHCP or static', result: 'The node is set to DHCP. There is no DHCP server on this show network.', useful: true, reveals: true },
      { id: 'ping', layer: 2, label: 'Ping the node from the console', result: 'No reply. The console is on 10.101.1.20, a different network entirely.', useful: true },
      { id: 'cable', layer: 1, label: 'Replace the patch lead', result: 'No change. The link was never the problem.', useful: false },
      { id: 'reboot', layer: 4, label: 'Reboot the lighting console', result: 'Five minutes gone. The node still has the same address.', useful: false },
    ],
    options: [
      { id: 'dhcp-no-server', label: 'Node set to DHCP with no DHCP server present' },
      { id: 'bad-cable', label: 'A damaged patch lead' },
      { id: 'wrong-vlan', label: 'The node is on the wrong VLAN' },
      { id: 'artnet-range', label: 'The node is in the Art-Net 2.x.x.x range' },
    ],
    explain:
      'A 169.254 address means one thing and only one thing: the device asked for an address and nobody answered. Show networks are static precisely so this cannot happen. Set the node to a static address inside the scheme, label it, and add it to the IP schedule.',
  },
  {
    id: 'clock-click',
    title: 'A click every ninety seconds',
    brief:
      'During a technical rehearsal, a regular click appears in the PA. It is not related to any cue. It happens roughly every ninety seconds, does not get worse, does not get better, and appears on every output including the monitors.',
    answer: 'clock-drift',
    steps: [
      { id: 'pattern', layer: 3, label: 'Time the interval between clicks carefully', result: 'Regular. Almost exactly the same interval every time.', useful: true, reveals: true },
      { id: 'clockcfg', layer: 3, label: 'Check which device is the clock master', result: 'Two devices are both configured as preferred master. One was added yesterday.', useful: true, reveals: true },
      { id: 'bandwidth', layer: 3, label: 'Check switch port utilisation', result: 'Under 12 percent on every port. Bandwidth is not close to a limit.', useful: true },
      { id: 'cable', layer: 1, label: 'Replace the network cable to the amplifier rack', result: 'No change. A cable fault would not produce a perfectly regular interval.', useful: false },
      { id: 'buffer', layer: 4, label: 'Increase the Dante latency setting to 5 ms', result: 'The clicks get further apart but do not stop. Masking, not fixing.', useful: false },
      { id: 'driver', layer: 4, label: 'Reinstall the audio drivers on the playback machine', result: 'The click is on every output, including paths that never touch that machine.', useful: false },
    ],
    options: [
      { id: 'clock-drift', label: 'Two clock masters, so devices are drifting apart' },
      { id: 'bandwidth', label: 'The network has run out of bandwidth' },
      { id: 'bad-cable', label: 'A damaged network cable' },
      { id: 'buffer-size', label: 'The audio buffer is set too low' },
    ],
    explain:
      'A regular periodic click that gets neither better nor worse is a clock problem. Nothing else in a network produces that signature. Bandwidth faults are bursty, cable faults are irregular, buffer faults track processing load. Two masters means devices follow different references, drift apart, and a buffer runs dry at a predictable interval.',
  },
  {
    id: 'artnet-subnet',
    title: 'The node that is definitely plugged in',
    brief:
      'A student has connected an Art-Net node straight to their laptop with a known good cable. The node front panel reads 2.0.0.10. The laptop is on 192.168.1.20 with a 255.255.255.0 mask. The node will not appear in the software.',
    answer: 'different-network',
    steps: [
      { id: 'link', layer: 1, label: 'Check the link lights at both ends', result: 'Both ends show link. The cable is fine.', useful: true },
      { id: 'addr', layer: 2, label: 'Write down both addresses and both masks', result: 'Node 2.0.0.10 /8. Laptop 192.168.1.20 /24. The network portions do not match.', useful: true, reveals: true },
      { id: 'ping', layer: 2, label: 'Ping 2.0.0.10 from the laptop', result: 'Destination host unreachable. The laptop has no route to that network.', useful: true },
      { id: 'reconf', layer: 2, label: 'Set the laptop to 2.0.0.20 with a 255.0.0.0 mask', result: 'The node appears immediately in the software.', useful: true, reveals: true },
      { id: 'firmware', layer: 4, label: 'Download new node firmware', result: 'The node is not faulty. Nothing to fix here.', useful: false },
      { id: 'switch', layer: 1, label: 'Insert a switch between the two', result: 'No change. A switch does not join two different networks.', useful: false },
    ],
    options: [
      { id: 'different-network', label: 'The two devices are on different networks under their masks' },
      { id: 'bad-cable', label: 'The cable needs to be a crossover' },
      { id: 'node-dead', label: 'The node has failed' },
      { id: 'wrong-universe', label: 'The universe number is wrong' },
    ],
    explain:
      'Art-Net gear has shipped on 2.x.x.x for decades, and this is the number one reason a first year declares a node broken. Two devices can talk directly only if the network part of their addresses matches under the mask. Either move the laptop onto 2.x.x.x, or set the node into the show scheme. Doing the latter and writing it on the IP schedule is the professional answer.',
  },
];

// Model answers for the self-test questions. The study guide deliberately ships
// questions without answers; a platform students revise from alone needs both.
export const selfTest = {
  1: [
    { q: 'A designer copies a 4 GB file to the media server during a technical rehearsal. Which flow is that, and what could it do to the other three?', a: 'Management. It has no deadline of its own, so it will take whatever bandwidth is available and starve control, media and clock traffic that do have deadlines. This is why management traffic is kept off the show VLAN.' },
    { q: 'You are 20 m from the loudspeaker. How much acoustic delay are you experiencing?', a: 'About 58 ms. Sound travels roughly 3 ms per metre, so 20 × 2.92 is about 58 ms. You have never complained about it, which is the point.' },
    { q: 'Which is worse, 10 ms of constant latency or 5 ms of latency that varies randomly between 0 and 10 ms?', a: 'The variable one. Constant latency can be measured and compensated for, which is exactly what a delay tower does. Variation cannot be compensated for, only absorbed by a buffer, and the buffer costs you latency anyway.' },
    { q: 'Rank by data rate, largest first: one uncompressed HD video stream, one DMX universe, 64 channels of audio, a word clock signal.', a: 'Video (about 2.5 Gbit/s), then 64 channels of audio (about 74 Mbit/s), then one DMX universe (about 0.25 Mbit/s), then word clock, which carries no content at all. Clock is less than control is less than audio is less than video.' },
    { q: 'Name the three claims and give an example of each from your own specialism.', a: 'Your instrument is now a computer. Your cable is now a network. Your craft judgement is now a systems judgement. The examples vary by specialism, and the third one is the one that matters: choosing a latency setting, a bit depth or a codec is an artistic decision made on technical grounds.' },
  ],
  2: [
    { q: 'Your buffer is 256 samples at 48 kHz. How many milliseconds is one buffer, and what is your approximate round trip latency?', a: '256 ÷ 48000 = 5.33 ms per buffer. Round trip is roughly double, plus converter time, so expect somewhere around 12 to 14 ms in and out.' },
    { q: 'You need four simultaneous layers at 700 Mbit/s each. What sustained storage throughput do you need, and will a SATA SSD do it?', a: '4 × 700 = 2800 Mbit/s. Divide by 8 to get 350 MB/s. A SATA SSD tops out around 550 MB/s, so it is inside the number but with very little headroom once the operating system also uses the disk. Specify NVMe.' },
    { q: 'What is the difference between a codec and a container? Someone hands you a .mov file. What have you learned?', a: 'The container is the wrapper, the codec is the compression method. A .mov can hold almost anything, so you have learned essentially nothing. Ask what codec is inside it.' },
    { q: 'Why do we transcode delivered H.264 into HAP or ProRes before a show?', a: 'H.264 is inter frame, so frames are described as differences from other frames and jumping to an arbitrary point is expensive. HAP and ProRes are intra frame, so every frame stands alone and a cue jump is instant. The transcode is what makes the cue behave.' },
    { q: 'A video cue stutters the first time and is perfect the second time. What is happening?', a: 'The first play is reading from disk. The second is coming from memory or a decoded cache. It points at storage throughput or at insufficient pre-roll, not at the GPU.' },
    { q: 'Why is 8 bit dimming visibly stepped on a slow fade to black, and what fixes it?', a: '8 bit gives 256 steps, and at the bottom of a fade the steps between adjacent levels are a large proportion of the remaining output, so you see them. 16 bit dimming uses a coarse and a fine byte for 65,536 steps. It costs a second DMX channel per parameter.' },
    { q: 'A file arrives named plate.wav. Its first three bytes are FF D8 FF. What is it really, and how do you know?', a: 'A JPEG. Every JPEG begins FF D8 FF, and that magic number is written by the encoder. The extension was typed by a person, so it is a hint; the header is the truth. Renaming a file changes nothing inside it, which is also why a rename is never a transcode.' },
    { q: 'One 16 bit sample sits at 62 percent of full scale, positive. What integer is stored, and what bytes appear in a WAV file, in what order?', a: '0.62 x 32,767 is 20,316, which is 0x4F5C. WAV is little endian, so the bytes on disk are 5C 4F, low byte first. Read that file as big endian and every sample is scrambled: the symptom is instant full scale noise, not a subtle artefact.' },
    { q: 'Write the luma equation with its weights. Why is green the largest, and what does that allow a codec to do?', a: 'Y = 0.299 R + 0.587 G + 0.114 B. The weights are a measurement of the eye rather than a convention: our brightness perception is dominated by green and barely touched by blue. Because we read detail in brightness and not in colour, a codec can throw away most of the colour resolution and almost nobody notices. That is 4:2:2 and 4:2:0.' },
    { q: 'A lossy codec runs six steps. Name the two that lose information, and say which one the quality slider controls.', a: 'Chroma subsampling (step 2) and quantisation (step 5). The quality slider is step 5: it sets how coarsely each frequency coefficient is divided and rounded. Fine detail rounds to zero and is gone permanently. Everything else in the chain, including the last step, is reversible.' },
    { q: 'A show file at 12 Mbit/s looks flawless until the confetti drop, where it goes to blocks. Explain the mechanism, and give two fixes.', a: 'Inter frame compression predicts each frame from the last one. Confetti changes every pixel unpredictably, so no motion vector finds a match and the encoder has to send far more data or round harder; at a capped bitrate it rounds harder, and you see the blocks. Fixes: raise the bitrate or switch to VBR so the hard shots get the data they need, or transcode to an intra frame codec such as HAP or ProRes, which does not predict at all.' },
    { q: 'Why does an intra frame codec make a file three times larger and a cue jump instantly?', a: 'It refuses the inter frame saving on purpose: every frame is complete on its own. Nothing has to be decoded before it, so any frame is available immediately. With a long GOP the player must find the last I frame and decode forward through every P and B frame to reach the one you asked for, which is fine for streaming and hopeless for cueing.' },
  ],
  3: [
    { q: 'Device A is 192.168.1.10/24, device B is 192.168.2.10/24. Can they talk? What single change would fix it, and what does it cost?', a: 'No. Under a /24 mask the network portions are 192.168.1 and 192.168.2, which differ. Widening both masks to /16 puts them in one network. The cost is a much larger broadcast domain, which is the opposite of what you usually want on a show. Changing one address is the better fix.' },
    { q: 'A node shows 169.254.14.201. What has happened and what do you do?', a: 'It is set to DHCP and no DHCP server answered, so it self assigned. Set it to a static address inside your scheme, label it, and add it to the IP schedule.' },
    { q: 'A system works all afternoon and audio drops out fifteen minutes into the show. What do you suspect, and why does the timing point at it?', a: 'Multicast with IGMP snooping enabled and no querier. Group memberships hold at first and then time out, so it fails hours after everything looked correct. The delayed onset is the signature.' },
    { q: 'Two devices behave intermittently and each works when the other is unplugged. What is the fault?', a: 'A duplicate IP address. It is the hardest network fault for a first year to name and the easiest to fix once named.' },
    { q: 'When is an unmanaged switch the better choice?', a: 'On a small, dedicated, single purpose network, for example a lighting only rig in a studio theatre. There is nothing to configure and therefore nothing to configure wrongly. Complexity is a cost you should choose deliberately, not accept by default.' },
    { q: 'Name the four segmentation options and say what each gives up.', a: 'Separate physical networks give up cable weight, cost and easy integration. VLANs give up physical isolation, since separation becomes a setting. A separate management network gives up a second infrastructure and invites wrong-socket errors. A full air gap gives up remote support, licensing and cloud delivery, and needs a written procedure for when the gap is bridged.' },
    { q: 'Why is Wi-Fi acceptable for a focus tablet and not for show critical control?', a: 'It is a shared, contended medium with no delivery guarantee and variable delay, and it degrades most in a room full of audience phones, which is exactly when you need it. A focus tablet can tolerate a dropped message. A cue cannot.' },
  ],
  4: [
    { q: 'You pull the network cable mid show. The moving light holds its last look and the video freezes. Explain both.', a: 'DMX and sACN are state based and repeat constantly, so the node still has a valid last value and keeps outputting it. The video was waiting for an event, a go-to-next message that never arrived, so nothing happened at all. State recovers, events do not.' },
    { q: 'Reproduce the DMX refresh calculation. Why does 44 Hz matter artistically?', a: '512 slots × 11 bits = 5632 bits. 5632 ÷ 250000 = 22.5 ms, plus break and mark is about 23 ms, so 1 ÷ 0.023 is about 44 frames per second. It is the ceiling on how smooth a fast chase or strobe can be, and the protocol has no faster gear. Fast pixel effects need more universes, not a quicker one.' },
    { q: '30 LED battens, 40 RGBW pixels each. How many universes?', a: '30 × 40 = 1200 pixels. RGBW is 4 channels, so 4800 channels. 4800 ÷ 512 = 9.375, so 10 universes.' },
    { q: 'What is the data rate of that many universes, and is bandwidth your problem?', a: 'About 2.5 Mbit/s in total. Bandwidth is nowhere near a constraint. Your constraints are universe count, node port count and processing, and your likely fault family is addressing, not capacity.' },
    { q: 'An Art-Net node is on 2.0.0.10/8 and the laptop is on 192.168.1.20/24, same switch, cannot see each other. Why, and what are your two options?', a: 'The network portions differ under their masks, so there is no direct path. Either move the laptop onto the 2.x.x.x network, or reconfigure the node into the show addressing scheme. The second is the professional answer, and it goes on the IP schedule.' },
    { q: 'When would you choose sACN over Art-Net, and what feature decides it?', a: 'When more than one source can send to a universe, which is every professional show with a backup console. sACN has priority and defined merging built into the protocol. Art-Net does not.' },
    { q: 'Why do almost all show media protocols use UDP, the one with no delivery guarantee?', a: 'Because for real time media a retransmitted packet is worthless. By the time it arrives its moment has passed. Reliability and timeliness are different goals, and show media chooses timeliness.' },
    { q: 'Name one artistic cost of running a show on timecode rather than on cues.', a: 'Timecode is precise and it does not listen. A cue based show breathes with the performance and waits for the laugh. A timecode show does not. Which is correct depends entirely on the work.' },
  ],
  5: [
    { q: 'Two Dante devices are set to 0.25 ms and 5 ms. What latency does the path run at?', a: '5 ms. The whole path runs at the highest setting in use, so one badly set device slows everything downstream of it.' },
    { q: 'Your system clicks every ninety seconds, regularly, forever. Where do you look and what do you rule out?', a: 'Clock. A regular periodic click that gets neither better nor worse is a clock problem. Rule out bandwidth immediately, because that is bursty, and rule out cable faults, because those are irregular. Look for two clock masters.' },
    { q: 'Uncompressed 1080p60 10 bit 4:2:2 is roughly what rate? Does it fit a 1 Gbit link?', a: 'About 2.5 Gbit/s, so no, by a factor of about two and a half. Options are compression such as NDI, a 10 Gbit link for ST 2110, or keeping it on SDI where 3G carries it comfortably.' },
    { q: 'The projector shows black. Everything looks correct and the cables are good. Two likely causes?', a: 'HDCP refusing to pass a protected source through equipment it does not trust, or an EDID negotiation failure leaving the source outputting a mode the projector cannot lock to. Test by substituting a known non-protected source, and by connecting the source directly to the display to take the switcher out of the EDID conversation.' },
    { q: 'What is genlock, and what is the audio equivalent?', a: 'Genlock is all video devices agreeing on when a frame starts, so a switch between sources does not happen mid frame and tear. The audio equivalent is word clock, and PTP increasingly does both jobs on one network.' },
    { q: 'A camera pan looks juddery and nobody can say why. What do you check?', a: 'Frame rate mismatch through the chain. A 24 or 25 fps source on a 60 Hz display cannot divide evenly, so frames repeat unevenly. It is invisible on a static image and obvious on a slow pan, which is the best example in the module of a fault an audience feels without being able to name.' },
    { q: 'Give the three naming convention rules and say why the second matters at 18:00.', a: 'Be consistent before you are clever. Make the label on the device, the name in the software and the name on the diagram match exactly. Include location or function, not just a number. The second matters because at 18:00 the person reading the diagram has never been in the building, and an approximate match costs them the twenty minutes you do not have.' },
  ],
};

// Readiness checks. Five questions per class, answered BEFORE the class, that
// test the prerequisite rather than the class content. A wrong answer points at
// the specific thing to go and fix, which is the only useful output of a
// pre-class quiz.
export const readiness = {
  1: [
    { q: 'A show network fails during a performance. Whose problem is it, most often, in a modern venue?',
      a: ['The ALV department that built it', 'The venue IT contractor', 'The manufacturer', 'Nobody, it is unavoidable'],
      c: 0, fix: 'Nothing to revise. This class exists to make that answer true for you.' },
    { q: 'Sound travels roughly how far in one millisecond?',
      a: ['About 34 cm', 'About 3.4 m', 'About 3.4 cm', 'About 34 m'],
      c: 0, fix: 'About 343 m/s, so roughly 3 ms per metre. It is on the reference card, Block 1.', to: { route: '/class/1', id: 'fig-sound-distance' } },
    { q: 'Which is larger: one uncompressed HD video stream, or 64 channels of digital audio?',
      a: ['The video, by a very long way', 'The audio', 'About the same', 'Depends on the cable'],
      c: 0, fix: 'Video is about 2.5 Gbit/s and 64 audio channels about 74 Mbit/s. Read Foundations, the five calculations.', to: { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' } },
    { q: 'You have no computing background at all. Is that a problem for this module?',
      a: ['No, none is assumed', 'Yes, you should defer', 'Only for the exam', 'Only for lighting students'],
      c: 0, fix: 'No preparation needed.' },
    { q: 'What should you bring to Class 1?',
      a: ['Something to write with, and the glossary', 'A laptop and three monitors', 'Nothing at all', 'Your own switch'],
      c: 0, fix: 'Class 1 is not a laptop class. Bring a pen.' },
  ],
  2: [
    { q: 'A 1 Gbit/s network link moves roughly how many megabytes per second?',
      a: ['125 MB/s', '1000 MB/s', '8000 MB/s', '12.5 MB/s'],
      c: 0, fix: 'Networks are bits, storage is bytes. Divide by 8. Foundations, bits and bytes.', to: { route: '/foundations', id: 'bits-and-bytes-and-the-mistake-everybody-makes' } },
    { q: 'How many different values can 8 bits represent?',
      a: ['256', '8', '128', '65,536'],
      c: 0, fix: '2^8 = 256, which is why one DMX channel has 256 levels. Foundations, powers of two.', to: { route: '/foundations', id: 'powers-of-two-and-why-everything-lands-on-256-and-512' } },
    { q: 'A drive is advertised at "up to 7,000 MB/s". Which word is missing?',
      a: ['Sustained', 'Encrypted', 'Sequential', 'Certified'],
      c: 0, fix: 'Marketing quotes burst. A show needs sustained. Foundations, reading a spec sheet.', to: { route: '/foundations', id: 'reading-a-specification-sheet-without-being-lied-to' } },
    { q: 'Which of these is a container rather than a codec?',
      a: ['.mov', 'H.264', 'ProRes', 'HAP'],
      c: 0, fix: 'The container is the box, the codec is the compression method. Class 2 Block C.', to: { route: '/class/2', id: 'the-formats-you-will-actually-meet-by-domain' } },
    { q: 'Have you installed the software for the lab?',
      a: ['Yes, and opened each one once', 'Not yet', 'Some of it', 'I will do it in class'],
      c: 0, fix: 'Do it before you arrive. Installing during the lab costs you the lab.' },
  ],
  3: [
    { q: 'Which of these can NEVER appear as an octet in a subnet mask?',
      a: ['200', '192', '248', '254'],
      c: 0, fix: 'A mask is a solid run of ones. Learn the nine values in Foundations.', to: { route: '/foundations', id: 'the-nine-numbers' } },
    { q: 'What is binary 11000000 in decimal?',
      a: ['192', '240', '128', '96'],
      c: 0, fix: '128 + 64 = 192. Foundations, binary in the only depth you need.', to: { route: '/foundations', id: 'binary-in-the-only-depth-you-need' } },
    { q: 'How many usable host addresses does a /26 give you?',
      a: ['62', '64', '30', '126'],
      c: 0, fix: '2^(32−26) − 2 = 62. The minus two is the network and broadcast addresses.', to: { route: '/class/3', id: 'the-four-calculations' } },
    { q: 'A device shows the address 169.254.11.7. What does that mean?',
      a: ['It asked for an address and nobody answered', 'It is on the Art-Net range', 'It is a multicast address', 'The cable is faulty'],
      c: 0, fix: 'Link-local self-assignment: DHCP was expected and no server replied. Reference card, Block 3.', to: { route: '/class/3', id: 'static-dhcp-and-the-address-that-means-failure' } },
    { q: "Do you know your own laptop's IP address, subnet mask and gateway right now?",
      a: ['Yes, written down', 'No', 'Only the IP', 'I do not know where to look'],
      c: 0, fix: 'Find them before class. ipconfig on Windows, ifconfig or System Settings on macOS.' },
  ],
  4: [
    { q: 'Can 10.101.1.50/25 talk directly to 10.101.1.130/25?',
      a: ['No, they are in different blocks', 'Yes, same third octet', 'Yes, same subnet', 'Only through a switch'],
      c: 0, fix: 'A /25 splits at 128, so .50 and .130 are in different networks. Use the subnet tool.', to: { route: '/class/3', id: 'fig-can-they-talk' } },
    { q: 'One RGB pixel needs how many DMX channels?',
      a: ['3', '1', '4', '512'],
      c: 0, fix: 'Three, one per colour, so 170 RGB pixels fit in a universe. Foundations, calculation four.', to: { route: '/class/4', id: 'fig-universe-pack' } },
    { q: 'How long does it take you to set a static IP on your own machine?',
      a: ['Under a minute, from memory', 'A few minutes with a search engine', 'I have never done it', 'I would need help'],
      c: 0, fix: 'Practise it before class. The lab is a build and this is the first step of it.' },
    { q: '4,320 channels needs how many universes?',
      a: ['9', '8', '8.4', '10'],
      c: 0, fix: '4,320 ÷ 512 = 8.4, and you always round UP. Partial universes still cost a universe.', to: { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' } },
    { q: 'Have you installed a cue application and a software lighting console?',
      a: ['Yes, both opened once', 'One of them', 'Neither', 'I will do it in class'],
      c: 0, fix: 'Both, before you arrive. The lab builds a chain between them.' },
  ],
  5: [
    { q: 'Uncompressed 1080p60 10-bit 4:2:2 is roughly what data rate?',
      a: ['2.5 Gbit/s', '250 Mbit/s', '25 Gbit/s', '2.5 Mbit/s'],
      c: 0, fix: '1920 × 1080 × 60 × 20 bits. Redo the video calculation from Class 2.', to: { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' } },
    { q: 'IGMP snooping is enabled and there is no querier. What happens?',
      a: ['It works, then stops minutes later', 'It fails immediately', 'Nothing, it is fine', 'Only broadcast is affected'],
      c: 0, fix: 'Group memberships time out, so it fails late. Revisit Class 3, multicast.', to: { route: '/class/3', id: 'igmp-snooping-the-one-that-ruins-shows' } },
    { q: 'You pull the network cable. Which recovers by itself when you plug it back in?',
      a: ['State based control, like DMX', 'Event based control, like an OSC cue', 'Both', 'Neither'],
      c: 0, fix: 'State repeats constantly so it self-corrects; an event fired into a cut cable is gone. Class 4 Block A.', to: { route: '/class/4', id: 'fig-state-event' } },
    { q: 'What does QoS do on a show network?',
      a: ['Serves traffic that has a deadline before traffic that does not', 'Increases total bandwidth', 'Encrypts the show traffic', 'Assigns IP addresses'],
      c: 0, fix: 'Priority, not capacity. Class 3, Block C.', to: { route: '/class/3', id: 'qos' } },
    { q: 'Have you started Dante Certification Level 1?',
      a: ['Yes', 'Not yet', 'I did not know about it', 'I will do it after'],
      c: 0, fix: 'Free, about two hours, and the first hour is exactly Block A of this class. Link is at the end of Class 5.' },
  ],
};

// Where a fact is taught. Keyed by the drill card's tag plus its question text,
// exactly as twoColumnCards() builds it. The value is a route and an id on that
// page: a figure host (fig-<name>) when the section carries one, otherwise the
// heading that teaches it. Arithmetic the module assumes rather than teaches
// points at Foundations. A card with no entry shows no pointer, which is the
// honest state until somebody decides where it belongs.
export const taughtAt = {
  // Class 1: the two calculations, and the physical anchor.
  'Class 1::Speed of sound': { route: '/class/1', id: 'fig-sound-distance' },
  'Class 1::One audio channel, 48 kHz, 24 bit': { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' },
  'Class 1::64 audio channels': { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' },
  'Class 1::One DMX universe': { route: '/class/4', id: 'fig-dmx-frame' },
  'Class 1::Uncompressed 1080p60, 10 bit, 4:2:2': { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' },
  'Class 1::Uncompressed UHD 4K 60, 10 bit, 4:2:2': { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' },
  'Class 1::NDI, one HD stream': { route: '/class/5', id: 'fig-bandwidth-pipe' },

  // Class 2: the machine, and what a file is.
  'Class 2::Spinning hard disk, sustained read': { route: '/class/2', id: 'storage' },
  'Class 2::SATA SSD, sustained read': { route: '/class/2', id: 'storage' },
  'Class 2::NVMe SSD, sustained read': { route: '/class/2', id: 'storage' },
  'Class 2::Audio buffer, 128 samples at 48 kHz': { route: '/class/2', id: 'fig-buffer-underrun' },
  'Class 2::Audio buffer, 256 samples at 48 kHz': { route: '/class/2', id: 'fig-buffer-underrun' },
  'Class 2::Audio buffer, 512 samples at 48 kHz': { route: '/class/2', id: 'fig-buffer-underrun' },
  'Class 2::Round trip latency': { route: '/class/2', id: 'audio-buffers-with-the-actual-maths' },
  'Class 2::Dynamic range per bit': { route: '/class/2', id: 'fig-quantise-noise' },
  'Class 2::Nyquist': { route: '/class/2', id: 'fig-sampling' },
  'Class 2::One byte in hex': { route: '/foundations', id: 'hexadecimal-and-where-you-will-actually-see-it' },
  'Class 2::16 bit signed sample range': { route: '/class/2', id: 'fig-pcm-bytes' },
  'Class 2::Luma weights': { route: '/class/2', id: 'fig-ycbcr-planes' },
  'Class 2::52 49 46 46': { route: '/class/2', id: 'fig-hex-file' },
  'Class 2::FF D8 FF': { route: '/class/2', id: 'fig-hex-file' },
  'Class 2::89 50 4E 47': { route: '/class/2', id: 'fig-hex-file' },
  'Class 2::The lossy steps in a codec': { route: '/class/2', id: 'fig-codec-pipeline' },
  'Class 2::What sets bitrate': { route: '/class/2', id: 'fig-motion-vectors' },
  'Class 2::Light in glass fibre': { route: '/class/3', id: 'layer-1-in-detail-fibre' },
  'Class 2::Sound in air': { route: '/class/1', id: 'fig-sound-distance' },
  'Class 2::A frame at 25 fps': { route: '/class/5', id: 'fig-av-align' },
  'Class 2::Camera to LED wall, typical': { route: '/class/5', id: 'fig-latency-budget' },
  'Class 2::Precedence window': { route: '/class/5', id: 'fig-delay-tower' },
  'Class 2::Delay tower setting': { route: '/class/5', id: 'fig-delay-tower' },

  // Class 3: addressing, and the wire under it.
  'Class 3::Cat cable maximum channel length': { route: '/class/3', id: 'layer-1-in-detail-copper' },
  'Class 3::Link speeds you will meet': { route: '/class/3', id: 'layer-1-in-detail-speed-and-power' },
  'Class 3::255.255.255.0': { route: '/class/3', id: 'fig-subnet-bits' },
  'Class 3::169.254.x.x': { route: '/class/3', id: 'static-dhcp-and-the-address-that-means-failure' },
  'Class 3::Private ranges': { route: '/class/3', id: 'fig-address-space' },
  'Class 3::Art-Net legacy range': { route: '/class/4', id: 'getting-dmx-onto-the-network' },
  'Class 3::PoE (802.3af)': { route: '/class/3', id: 'layer-1-in-detail-speed-and-power' },
  'Class 3::PoE+ (802.3at)': { route: '/class/3', id: 'layer-1-in-detail-speed-and-power' },
  'Class 3::PoE++ (802.3bt)': { route: '/class/3', id: 'layer-1-in-detail-speed-and-power' },
  'Class 3::VLAN ID range': { route: '/class/3', id: 'fig-vlan-switch' },
  'Class 3::The 802.1Q tag adds': { route: '/class/3', id: 'how-the-separation-is-carried-8021q' },
  'Class 3::Access port carries': { route: '/class/3', id: 'access-ports-and-trunk-ports' },
  'Class 3::Trunk port carries': { route: '/class/3', id: 'access-ports-and-trunk-ports' },
  'Class 3::Subnets from borrowed bits': { route: '/class/3', id: 'dividing-a-range-into-subnets' },

  // Class 4: the control protocols.
  'Class 4::DMX512 bit rate': { route: '/class/4', id: 'dmx512-physically' },
  'Class 4::DMX512 slots per universe': { route: '/class/4', id: 'fig-dmx-frame' },
  'Class 4::DMX512 maximum refresh': { route: '/class/4', id: 'fig-dmx-frame' },
  'Class 4::DMX512 devices per segment': { route: '/class/4', id: 'dmx512-physically' },
  'Class 4::DMX512 termination': { route: '/class/4', id: 'dmx512-physically' },
  'Class 4::RGB pixels per universe': { route: '/class/4', id: 'fig-universe-pack' },
  'Class 4::RGBW pixels per universe': { route: '/class/4', id: 'fig-universe-pack' },
  'Class 4::Art-Net': { route: '/class/4', id: 'getting-dmx-onto-the-network' },
  'Class 4::sACN (E1.31)': { route: '/class/4', id: 'getting-dmx-onto-the-network' },
  'Class 4::Timecode frame rates': { route: '/class/4', id: 'fig-dropframe' },

  // Class 5: media over IP, and what a person can perceive.
  'Class 5::Dante latency settings': { route: '/class/5', id: 'dante' },
  'Class 5::Channels on a 1 Gbit link, 48 kHz 24 bit': { route: '/foundations', id: 'the-five-calculations-the-module-keeps-asking-for' },
  'Class 5::HD-SDI': { route: '/class/5', id: 'the-baseline-sdi' },
  'Class 5::3G-SDI': { route: '/class/5', id: 'the-baseline-sdi' },
  'Class 5::12G-SDI': { route: '/class/5', id: 'the-baseline-sdi' },
  'Class 5::ST 2110 network requirement': { route: '/class/5', id: 'fig-bandwidth-pipe' },
  'Class 5::PTP accuracy': { route: '/class/5', id: 'fig-ptp-sync' },
  'Class 5::In ear monitoring feels wrong beyond': { route: '/class/5', id: 'fig-av-align' },
  'Class 5::Audio ahead of picture, detectable at about': { route: '/class/5', id: 'fig-av-align' },
  'Class 5::Audio behind picture, detectable at about': { route: '/class/5', id: 'fig-av-align' },
  'Class 5::Broadcast delivery tolerance commonly cited': { route: '/class/5', id: 'fig-av-align' },
};
