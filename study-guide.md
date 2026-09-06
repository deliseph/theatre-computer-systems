# Study Guide
## Computer Systems & Networking for Theatre and Entertainment Arts

Student facing. One section per session. Use it before the session to know what is coming, and
after the session to check whether it landed.

---

## How to use this module

You are here because the industry you are joining runs on computers and networks, and because the
people who understand them are the people who get called. That is the honest reason.

Three habits will carry you through:

1. **Do the arithmetic.** Every time. A guess and a calculation look the same on the page and are
   completely different in a machine room. Show the working, always.
2. **Diagnose from the bottom up.** Link light, then IP address, then protocol, then software.
   Never start with the software. You will lose hours.
3. **Write it down.** The system you can explain to someone else is the system you actually
   understand. This is also, not coincidentally, criterion 3 of every rubric in this module.

---

## The spine

Learn this sentence. Everything in the module is an unpacking of it.

> **Every signal in a modern show is, at some point, a number in a computer's memory, travelling
> over a shared network, with a deadline.**

### The Four Flows

Any traffic on a show network is one of four kinds. Learn the table, then use it to classify
everything you meet for the rest of your career.

| Flow | Character | Examples | What kills it |
|------|-----------|----------|---------------|
| **Control** | Small, urgent, must arrive | sACN, Art-Net, OSC, MIDI, MSC, RS-232, GPIO | Loss on event based protocols |
| **Media** | Large, continuous, on time and in order | Dante, AES67, NDI, ST 2110 | Bandwidth starvation, jitter |
| **Clock / sync** | Tiny, ruthlessly regular | PTP, word clock, genlock, LTC, MTC | Jitter, a second master |
| **Management** | Housekeeping, no deadline | Remote desktop, file copy, updates | Nothing. It kills everything else. |

---

## Session 1: Why this class exists

### You should be able to

- Say the spine sentence in your own words, with one example from your own specialism.
- Sort any piece of show traffic into one of the Four Flows and say what would break it.
- Explain the difference between latency and jitter using a physical example.
- Estimate whether a signal fits down a wire, to an order of magnitude.

### Key terms
computer, network, protocol, control, media, clock, management, latency, jitter, bandwidth,
data rate, deadline

### Numbers
Block 1 of [the Numbers card](/numbers).

### Self test
1. A designer copies a 4 GB file to the media server during a technical rehearsal. Which flow is
   that, and what could it do to the other three?
2. You are 20 m from the loudspeaker. How much acoustic delay are you experiencing?
3. Which is worse for a show, 10 ms of constant latency or 5 ms of latency that varies randomly
   between 0 and 10 ms? Say why.
4. Rank these by data rate, largest first: one uncompressed HD video stream, one DMX universe,
   64 channels of audio, a word clock signal.
5. Name the three claims from Block 2 and give an example of each from your own specialism.

### Common trap
Thinking "latency is bad". Latency is a budget you spend on purpose. Jitter is the fault.

---

## Session 2: Production visit

### You should be able to
- Find, in a real venue, where control becomes light, where audio becomes sound, and where a
  file becomes a picture.
- Identify switches, patch panels, fibre runs and node positions.
- Draw a legible signal flow sketch from source to output.
- Ask a working technician a specific, informed question.

### Before you go
- Closed shoes, dark clothing, nothing loose. Bring the observation sheet on paper.
- Write down three things you expect to see and one question you want answered.

### On the day
- Touch nothing. Ask before photographing. Never step over a cable. Stay off headset.
- If someone says move, move first and ask afterwards.

### The deliverable
One A4 signal flow sketch of one subsystem, hand drawn. Every box a device you actually saw,
named. Every line labelled with what it carries and what cable it runs on. Mark where the signal
changes form. Mark at least one thing you could not identify with a question mark.

**Honest gaps score better than invented certainty.** A sketch with one question mark on it is
worth more than a confident sketch that is wrong.

### Self test
Two days after the visit, without your notes, draw the network of the venue from memory. Then
check your notes. The gap between the two is your actual learning.

---

## Session 3: The machine

### You should be able to
- Name the components that constrain real time media work and say what each limits.
- Explain why a general purpose operating system cannot guarantee a deadline.
- Calculate raw data rate for audio, video and lighting.
- Explain buffer size, latency and dropouts with numbers.
- Distinguish a codec from a container and choose a playback codec.
- Read a file as bytes: say what hex is, recognise a format from its magic number, and say what a
  PCM sample is as a number.
- State the luma weights and explain why colour can be thinned and brightness cannot.
- Describe the steps a lossy codec runs and name the one that is the quality setting.
- Explain why confetti costs more bitrate than a locked-off shot.
- Write a defensible show machine specification.

### Key terms
CPU, core, RAM, storage, sustained throughput, NVMe, GPU, decode, render, output, PCIe, driver,
ASIO, Core Audio, buffer, dropout, sample rate, bit depth, Nyquist, raster, frame rate, chroma
subsampling, codec, container, intra frame, inter frame, hex, magic number, header, PCM,
endianness, luma, chroma, run length encoding, entropy coding, quantisation, motion vector, GOP,
I frame, P frame, B frame, CBR, VBR

### Numbers
Block 2 of [the Numbers card](/numbers).

### The idea that matters most
A show computer is not a fast computer, it is a **predictable** computer. We trade peak
performance for the guarantee that the next frame arrives on time, for three hours.

### Self test
1. Your buffer is 256 samples at 48 kHz. How many milliseconds is one buffer? What is your
   approximate round trip latency?
2. You need to play four simultaneous layers of a codec running at 700 Mbit/s each. What
   sustained storage throughput do you need, in MB/s? Will a SATA SSD do it?
3. What is the difference between a codec and a container? Someone hands you a `.mov` file. What
   have you learned?
4. Why do we transcode delivered H.264 into HAP or ProRes before a show?
5. A video cue stutters the first time it plays and is perfect the second time. What is happening?
6. Why is 8 bit dimming visibly stepped on a slow fade to black at low level, and what fixes it?
7. A file arrives named `plate.wav`. Its first three bytes are `FF D8 FF`. What is it really, and
   how do you know?
8. One 16 bit audio sample sits at 62 percent of full scale on the positive side. What integer is
   stored, and what two bytes appear in a WAV file, in what order?
9. Write out the luma equation with its three weights. Why is the green weight the largest, and
   what does that fact allow a codec to do?
10. A codec runs six steps. Name the two that lose information, and say which one the quality
    slider controls.
11. Your client's show file is 12 Mbit/s and looks flawless until the confetti drop, where it goes
    to blocks. Explain the mechanism in two sentences, and give two ways to fix it.
12. Why does an intra frame codec make a file three times larger and a cue jump instant?

### Common traps
- Confusing burst speed with sustained speed on storage.
- Confusing bits and bytes. Divide by 8 to go from bit/s to byte/s.
- Assuming a faster machine is a better show machine.
- Believing the file extension. It is a hint. The header is the truth.
- Thinking 4:2:2 means half the picture is gone. The brightness plane is untouched.
- Thinking bitrate is set by resolution alone. It is set by how predictable the picture is.

---

## Session 4: The network

### You should be able to
- Name the seven OSI layers, say what lives at each on a show, and use the model as a fault
  finding ladder rather than a list to recite.
- Convert between CIDR prefix and dotted decimal mask in both directions, from memory.
- Calculate network address, broadcast address, usable range and host count for any address
  and mask.
- Divide a range into a stated number of subnets and write the scheme down.
- Explain what a VLAN is, distinguish access from trunk ports, and design a scheme that separates
  lighting, audio, video and management.
- Distinguish unicast, broadcast and multicast, and explain IGMP snooping.
- Diagnose systematically, from the bottom of the stack upwards.

### Key terms
OSI model, physical, data link, network, transport, session, presentation, application, TCP/IP
model, MAC address, IP address, subnet mask, CIDR, prefix, block size, network address, broadcast
address, usable host range, gateway, DHCP, static addressing, 169.254, switch, managed, unmanaged,
VLAN, 802.1Q, VLAN ID, tag, access port, trunk port, native VLAN, broadcast domain, inter VLAN
routing, QoS, unicast, broadcast, multicast, IGMP snooping, IGMP querier, PoE, fibre, SFP, etherCON

### Numbers
Block 3 of [the Numbers card](/numbers), including the nine bit values, the prefix table and the OSI layers.

### The three things to drill
1. **The nine bit values.** 0, 128, 192, 224, 240, 248, 252, 254, 255. Nine numbers, and they
   unlock every subnet question.
2. **The four subnet answers.** Network, broadcast, first usable, last usable, plus the host
   count. Practise until it takes under a minute without a calculator.
3. **Access versus trunk.** Device ports are access ports carrying one VLAN untagged. Switch to
   switch links are trunks carrying several VLANs tagged.

### The rule that solves most faults
Two devices can talk directly only if the **network part** of their addresses is identical under
the mask. Apply the mask to both. If the network portions differ, no cable will fix it.

### The diagnostic ladder
Link light, then VLAN, then IP and mask, then port and protocol, then software. Every rung you
skip is a rung you come back to. Write your hypothesis down **before** you test it.

### Self test
1. Device A is `192.168.1.10/24`, device B is `192.168.2.10/24`. Can they talk? What single change
   would fix it, and what does that change cost you?
2. `10.101.3.150/26`. Give the network address, broadcast address, first and last usable host, and
   the usable host count.
3. Can `10.101.1.50/25` talk to `10.101.1.130/25`? Show why.
4. Divide `192.168.7.0/24` into eight equal subnets. What is the prefix, the block size, and the
   network address of the fifth subnet?
5. You need one network holding 100 devices. What is the smallest prefix that works, and how many
   usable addresses does it give you?
6. A node shows `169.254.14.201`. What has happened, and what do you do?
7. A device is plugged in, the link light is solid, and nothing pings. Which OSI layer would you
   suspect, and what is the most likely cause?
8. What is the difference between an access port and a trunk port? Which does a DMX node plug into?
9. Why do we park unused switch ports in a dead VLAN instead of leaving them in VLAN 1?
10. A system works perfectly all afternoon and audio drops out fifteen minutes into the show. What
    do you suspect, and why does the timing point at it?
11. Two devices behave intermittently and each works when the other is unplugged. What is the fault?
12. When is an unmanaged switch the **better** choice? Give a real scenario.
13. Name the four segmentation options and say what each one gives up.
14. Why is Wi-Fi acceptable for a focus tablet and not for show critical control?

### Common traps
- "The link light is on so the network is fine." It means electricity.
- "It is plugged in so it is connected." Wrong VLAN gives you a perfect link and no connection.
- "I will widen the mask until it works." That joins networks you meant to separate and enlarges
  the broadcast domain. Fix the address, not the mask.
- "A VLAN is a security feature." It is a separation feature, and it is not a firewall.
- "A managed switch is better." Half configured is worse than unmanaged.
- Forgetting to save the switch configuration to non volatile memory. It survives until the next
  power cycle, and not one second longer.

## Session 5: Control

### You should be able to
- Distinguish state based from event based control and predict loss behaviour.
- Describe DMX512 physically and electrically, and calculate its refresh limit.
- Explain how DMX, Art-Net and sACN relate, and choose between them.
- Calculate universe requirements for a pixel rig.
- Choose between OSC, MIDI, MSC, serial and contact closure for a given trigger.
- Explain what timecode is for and why a large show is built on it.
- Build, measure and document a cross department trigger chain.

### Key terms
state based, event based, DMX512, RS-485, universe, slot, channel, break, mark, termination,
splitter, opto isolator, RDM, Art-Net, sACN, E1.31, priority, merge, node, gateway, OSC, MIDI,
MSC, MTC, LTC, timecode, drop frame, RS-232, RS-422, contact closure, GPIO, TCP, UDP

### Numbers
Block 4 of [the Numbers card](/numbers).

### The idea that matters most
**State based** control repeats itself constantly, so a lost packet costs you nothing. **Event
based** control fires once, so a lost packet costs you the cue. Anything that must happen exactly
once at exactly the right moment is the fragile part of your system. Protect it.

### Self test
1. You pull the network cable mid show. The moving light holds its last look and the video
   freezes. Explain both, using state versus event.
2. Reproduce the DMX refresh calculation from first principles. Why does 44 Hz matter artistically?
3. 30 LED battens, 40 RGBW pixels each. How many universes? Show the working.
4. Then: what is the data rate of that many universes, and is bandwidth your problem here?
5. An Art-Net node is on `2.0.0.10/8`. Your console laptop is on `192.168.1.20/24`. They are on the
   same switch and cannot see each other. Why, and what are your two options?
6. When would you choose sACN over Art-Net? Name the specific feature that decides it.
7. Why do almost all show media protocols use UDP, the one with no delivery guarantee?
8. Name one artistic cost of running a show on timecode rather than on cues.

### Common traps
- "A universe is a cable." A universe is 512 channels of data.
- "OSC is a standard so devices will understand each other." Read the manufacturer's manual.
- "DMX is old so it is bad." It is old because it is simple and good enough.

---

## Session 6: Media over IP and systems thinking

### You should be able to
- Explain audio over IP: subscriptions, latency settings, clock.
- Explain why clock is the foundation of all networked media.
- Compare compressed and uncompressed video over IP and choose for a job.
- Trace a pixel pipeline and name what goes wrong at each stage.
- Perform a single point of failure audit and propose redundancy.
- Produce the documentation that makes a system operable by someone else.

### Key terms
AES3, MADI, Dante, flow, subscription, Dante Controller, redundancy, primary, secondary, word
clock, PTP, grandmaster, AES67, SDI, 3G-SDI, 12G-SDI, NDI, ST 2110, EDID, HDCP, genlock, colour
space, chroma subsampling, single point of failure, air gap, IP schedule, patch sheet, universe
map, handover pack

### Numbers
Block 5 of [the Numbers card](/numbers).

### The three ideas that matter most
1. **Clock is the foundation.** A regular periodic click that gets no better and no worse is a
   clock problem. Not a cable, not bandwidth, not a driver.
2. **Redundancy that is not already running is not redundancy, it is a spare part.** A backup
   machine that takes four minutes to boot protected the second half, not the show.
3. **Documentation is the deliverable.** A system only you can run is a system that fails the
   moment you are ill.

### Self test
1. Two devices on a Dante network are set to 0.25 ms and 5 ms. What latency does the path run at,
   and why?
2. Your system clicks every ninety seconds, regularly, forever. Where do you look first, and what
   do you rule out immediately?
3. Uncompressed 1080p60 10 bit 4:2:2 is roughly what data rate? Does it fit on a 1 Gbit link?
   What are your options if it does not?
4. The projector shows a black screen. Everything else looks correct and the cables are good.
   Name two likely causes and how you would tell them apart.
5. What is genlock, and what is the audio equivalent?
6. A camera pan looks juddery on the big screen and nobody can say why. What would you check?
7. Do a single point of failure audit on your own final year project rig. Three items, sorted
   into the three consequence columns.
8. Give the three naming convention rules and say why rule 2 matters at 18:00.

### Common traps
- "Clock is an audio thing." Genlock and PTP do the same job for video.
- "Compressed means worse." It means a different trade. Ask what the job needs.
- "Fast enough for audio" is nowhere near fast enough for uncompressed video.

---

## Session 7: Practical exam

Four stations, individually assessed. Build, diagnose, calculate, document and defend.

### How to prepare, in priority order

1. **Practise the arithmetic until it is fast.** Universe counts, data rates, latency budgets.
   Do them on paper, timed. This is the most improvable part of your mark.
2. **Practise diagnosing.** Get a friend to break a working setup while you are out of the room.
   Write symptom, hypothesis, test, result, conclusion. The written reasoning earns marks
   independently of whether you find the fault, so practise writing it.
3. **Practise setting a static IP** on Windows, on macOS and on a node, until it takes you under a
   minute on each and you never have to look it up.
4. **Practise drawing a signal flow diagram fast and legibly.** Boxes named, lines labelled with
   protocol and medium.
5. **Learn [the Numbers card](/numbers) completely.** You may bring it to the calculate station, and you
   will still be faster if you know it.

### What loses marks, from the sessions that came before
- Arithmetic without working shown.
- Diagnosis by reseating cables at random.
- A diagram whose labels do not match the labels on the actual devices.
- No answer at all to "what happens when this breaks".
- Invented certainty where a question mark would have been honest.

---

## Further reading, if you want it

None of this is required. It is here because some of you will want it, and because knowing where
the actual standards live is itself professional knowledge.

- **ESTA / PLASA technical standards.** The bodies that publish E1.11 (DMX512-A) and E1.31 (sACN).
  Worth knowing these documents exist and are purchasable, because "someone decided this and wrote
  it down" is a useful thing to internalise about the industry.
- **AES and SMPTE.** The standards bodies behind AES3, AES67 and ST 2110.
- **Your manufacturers' own documentation.** Audinate publish genuinely good free Dante training.
  Console manufacturers publish networking guides. These are the most practically useful reading
  available to you, and they are free.
- **Venue technical specifications.** Most receiving houses publish theirs. Read three of them.
  You will learn more about how real systems are described than from any textbook.
