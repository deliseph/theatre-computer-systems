# Session 6: Media Over IP, and Thinking in Systems
**4 hours. Content.**

*How does the sound and the picture itself travel over the network, and how do we build a system
that survives contact with a real show?*

The heaviest session technically, and the one that closes the argument. Block D is the dress
rehearsal for the practical exam, so protect its full run.

---

## Before this class

**Time needed: 60 minutes.** The final content class pulls on all four before it, so the
preparation is mostly revision rather than new material.

### What you must already be able to do

| Skill | Where to get it |
|-------|----------------|
| Calculate an uncompressed video data rate | Class 2 |
| Explain multicast, IGMP snooping and QoS | Class 3 |
| Distinguish state based from event based control | Class 4 |

### Do these three things

1. **Start Dante Certification Level 1**, linked at the end of this class. It is free, it takes
   about two hours, and the first hour covers exactly what Block A does. If you do one piece of
   preparation in this whole module, make it this one.
2. **Work out the data rate of the largest screen you have ever seen on a show.** Guess its
   resolution, assume 60 fps and 10 bit 4:2:2, and do the arithmetic. Bring the number.
3. **Re-read your Class 3 fault log.** Block C asks you to audit a system for single points of
   failure, and your own diagnostic notes are the best starting material you have.

### Bring

- Your team's trigger chain documentation from Class 4.
- The number from step 2.
- The reference card, Block 5 learned. All of it is examinable.

<!--ready:5-->

---

## Learning outcomes

By the end of this session a student can:

1. Explain how audio over IP works, including subscriptions, latency settings and clock.
2. Explain why clock is the foundation of all networked media, and what happens without it.
3. Compare compressed and uncompressed video over IP and choose appropriately for a job.
4. Trace a pixel pipeline from source to display and name what can go wrong at each stage.
5. Perform a single point of failure audit on a system and propose redundancy.
6. Produce the documentation set that makes a system operable by someone else.

---

## Block plan

| Time | Block | Title |
|------|-------|-------|
| 0:00 to 0:05 | | Numbers quiz |
| 0:05 to 0:55 | A | Audio over IP, and the tyranny of clock |
| 0:55 to 1:05 | | Break |
| 1:05 to 1:55 | B | Video over IP and the pixel pipeline |
| 1:55 to 2:05 | | Break |
| 2:05 to 2:55 | C | Designing for failure, and the paperwork that makes it real |
| 2:55 to 3:05 | | Break |
| 3:05 to 3:55 | D | Studio: design a system, present it |
| 3:55 to 4:00 | | Wrap, and the exam brief |

*If splitting into two 2 hour blocks, split after Block B. Block D must run whole.*

---

## Block A: Audio over IP, and the tyranny of clock (0:05 to 0:55)

### Why it happened

Start with the physical object. If you can, bring a short length of analogue multicore and a
Cat5e patch lead to the front and put them next to each other.

A 48 pair analogue multicore weighs tens of kilograms, takes two people to run, costs a great
deal, and gives you 48 channels in one direction. A single Cat5e lead weighs almost nothing and
gives you hundreds of channels in both directions, repatchable in software from anywhere on the
network.

That is why this happened, and it happened fast. The trade, as always: **flexibility bought with
configuration risk.**

### The ancestors, briefly

- **AES3 (AES/EBU)**, two channels of digital audio down one balanced cable.
- **MADI**, 64 channels down one coaxial or optical cable. Point to point, no addressing, no
  network. Still widely used precisely because there is nothing to configure.

Name them so students recognise the connectors, then move on.

### Dante

The dominant system in live production, so teach it as the worked example.

- **Flows and subscriptions.** You do not "patch a cable". A receiving device *subscribes* to a
  transmitting channel, and the network carries a flow between them. The patch lives in software
  and travels with the show file, not with the copper.
- **Dante Controller** is where that patch is made. Show it. Make a subscription live in front of
  them and let them see audio appear.
- **Latency setting**, selectable per device: 0.25 ms, 0.5 ms, 1 ms, 2 ms, 5 ms.
  - Lower is tighter and less tolerant of a congested or badly configured network.
  - Higher is safer and costs delay.
  - The whole path runs at the highest setting in use, so one badly set device slows everything.
  - **1 ms is the common, safe default** on a well built network.
  - This is the session 3 buffer trade off appearing again, in a different domain. Point that out
    explicitly, because the transfer is the learning.
- **Redundancy.** Dante devices with two ports can run primary and secondary on two physically
  separate networks. If the primary fails, the secondary is already carrying the same audio, so
  the changeover is inaudible. This is the model to teach for redundancy generally: **not a
  spare in a case, a second path already running.**
- **Bandwidth in practice.** At 48 kHz and 24 bit, a 1 Gbit link comfortably carries several
  hundred channels each way. Bandwidth is rarely the constraint in audio over IP. Clock and
  configuration are.

### Clock, the actual foundation

The idea students find hardest, and the one that explains the most failures.

Every device converting between analogue and digital has to agree on **when a sample happens.**
Not roughly. Exactly, and continuously, for hours.

If two devices disagree even slightly, one of them is producing samples faster than the other is
consuming them. The buffer between them slowly fills or slowly empties. When it runs out, you get
a click. Then another one. Then a click every ninety seconds.

Say the diagnostic signature out loud, because it is the single most useful piece of audio
troubleshooting in this module:

> **A regular, periodic click that gets no better and no worse is a clock problem, not a cable
> problem, not a bandwidth problem and not a driver problem.**

<!--anim:clock-drift-->

How clock is distributed:

- **Word clock.** A dedicated coaxial cable carrying nothing but the tick. Old, simple, effective.
- **PTP (Precision Time Protocol, IEEE 1588).** Clock distributed over the same network as the
  audio, accurate to well under a microsecond. One device is elected **grandmaster** and everyone
  else follows it.
- Dante negotiates a clock master automatically. It is worth knowing which device won, and it is
  worth locking it deliberately on a system that matters.

**The classic failure to describe:** two clock masters on one network. Each is confident. Devices
follow different masters, drift apart, and you get clicks that appear to move around the system.
Link straight back to session 4: the Four Flows table said clock is killed by "a second master".
Here is what that actually sounds like.

### AES67 and interoperability

Honest, short, no marketing.

**AES67** is a standard for audio over IP interoperability. It defines PTP, sample rates, packet
times and stream discovery so that different manufacturers' systems can exchange audio. Dante,
Ravenna, Q-LAN and others can operate in AES67 modes.

The honest year one framing: **interoperability works, and it works within tightly specified
limits.** Channel counts, sample rates and packet times must line up, discovery often does not
cross vendors cleanly, and redundancy features are usually vendor specific and do not carry over.
It is a bridge, not a merger. Plan interop links deliberately and test them early.

---

## Block B: Video over IP and the pixel pipeline (1:05 to 1:55)

### The baseline: SDI

Before the network, one signal, one coaxial cable, no configuration.

| Standard | Capacity | Typical |
|----------|----------|---------|
| HD-SDI | 1.485 Gbit/s | 1080i, 720p |
| 3G-SDI | 2.97 Gbit/s | 1080p60 |
| 6G-SDI | 6 Gbit/s | UHD30 |
| 12G-SDI | 12 Gbit/s | UHD60 |

Note that these numbers match the raw video maths from session 3 almost exactly, because SDI
carries the picture uncompressed. That correspondence is worth pointing out. It makes the numbers
feel real rather than arbitrary.

### The three options for video on a network

| | **NDI** | **SMPTE ST 2110** | **SDI over IP / other** |
|---|---|---|---|
| Compression | Yes, visually lossless at high bitrate | **None** | Varies |
| Typical HD bitrate | roughly 100 to 250 Mbit/s | about 2.5 Gbit/s | varies |
| Network needed | 1 Gbit is workable | **10 Gbit minimum**, 25 Gbit for UHD | varies |
| Latency | Low, but a frame or more | Sub frame | varies |
| Clock requirement | Tolerant | **PTP, mandatory** | varies |
| Discovery and setup | Easy, largely automatic | Complex, engineered | varies |
| Right for | Production monitoring, IMAG feeds, streaming, comfort monitors, most events | Broadcast plant, large permanent installations, show critical uncompressed paths | Point solutions |

<!--anim:bandwidth-pipe-->

The teaching point for year one: **compression buys you bandwidth and costs you latency and, at
some level, quality.** ST 2110 refuses that trade and pays for it in infrastructure. Neither is
correct in general. Both are correct for particular jobs.

Practical guidance to give them plainly: NDI is enormously useful and is used constantly in the
industry, and it is not automatically the right choice for a show critical main screen feed
unless the network was designed for it. Know which of those two situations you are in.

### The pixel pipeline

Trace it on the board, left to right, and name the failure at every stage. This diagram is the
one students photograph.

```
SOURCE  ──▶  PROCESSOR  ──▶  DISTRIBUTION  ──▶  DISPLAY
(server,     (scaler,        (SDI, HDMI,       (projector,
 camera,      switcher,       fibre, IP)        LED wall,
 laptop)      LED processor)                    screen)
```

| Stage | What can go wrong | The symptom |
|-------|------------------|-------------|
| Source | Wrong resolution or frame rate output | Scaling artefacts, judder |
| Source to processor | **EDID** negotiation fails | Wrong resolution, no picture, a resolution you did not ask for |
| Source to processor | **HDCP** copy protection | Black screen, or a screen that works on one output and not another |
| Processor | Frame rate conversion | Judder on slow pans, the most visible fault to an audience |
| Processor | Colour space or levels mismatch | Washed out blacks, or crushed blacks |
| Distribution | Cable length limits, especially HDMI | Sparkles, intermittent dropout, works on a short lead |
| Display | Genlock absent | Tearing, a visible horizontal split on motion |
| Display | LED processor mapping wrong | The picture is on the wall, in the wrong place or the wrong order |

Four of these deserve a proper explanation.

**EDID.** The display tells the source what it can accept, and the source picks a mode based on
that conversation. When the conversation fails, through a long cable, a splitter or a switcher,
the source guesses, and it guesses wrong. This is why a projector shows the wrong resolution and
why plugging into a different socket "fixes" it. EDID managers exist purely to hold this
conversation steady on a real system.

<!--anim:edid-->

**HDCP.** Copy protection built into HDMI. It refuses to pass a protected signal through
equipment it does not trust. In a theatre this produces a black screen with no useful error and
it will happen the first time someone plugs a consumer streaming device into a professional
switcher. Say the phrase "if the screen is black and everything looks correct, suspect HDCP",
because it will save them an hour one day.

**Frame rate mismatch.** A 24 fps source on a 60 Hz display cannot divide evenly, so frames are
repeated unevenly. On a static image nobody notices. On a slow camera pan across a face, everyone
notices and nobody can say why. Best example in the module of a technical fault the audience
feels without being able to name it.

**Genlock.** All the video devices agree on when a frame starts. Without it, a switch between
sources can happen mid frame and you see a tear. Genlock is to video what word clock is to audio,
and PTP increasingly does both jobs. Draw that parallel explicitly, it consolidates Block A.

<!--anim:genlock-->

---

## Block C: Designing for failure, and the paperwork (2:05 to 2:55)

### The single point of failure audit

The most valuable professional habit in this session. Teach it as a procedure, not a concept.

For each component in the system, ask: **if this fails right now, mid show, what does the
audience see and hear?**

Sort every answer into three columns:

| Consequence | Response |
|-------------|----------|
| Nothing visible, we fix it in the interval | Accept it. Note it. Carry a spare. |
| Degraded, the show continues | Have a documented workaround and make sure the operator knows it |
| **The show stops** | **Design it out, or duplicate it** |

Then apply the audit to something concrete, ideally the venue from session 2. Ten minutes with
the class calling out components. It goes better than it sounds, because everyone has an opinion
about what would be worst.

### Redundancy patterns

| Pattern | How it works | Cost | Failure it survives |
|---------|-------------|------|---------------------|
| **Dual network path** | Two physically separate networks carrying the same data, e.g. Dante primary and secondary | Double the infrastructure | Cable, switch, port failure |
| **Backup console tracking** | A second console follows the main and can be switched to | A second console and the discipline to keep it in sync | Console failure, operator error |
| **Backup playback machine** | A second machine, same content, ready to be switched | A second machine and content sync discipline | Machine failure |
| **Manual fallback** | A human can do the thing by hand | Training, rehearsal, a written procedure | Everything, badly, slowly |
| **Cold spare** | A device in a case | Cheap | Only failures where you have time to swap |

<!--anim:failover-->

The principle to state clearly, and to repeat: **redundancy that is not already running is not
redundancy, it is a spare part.** A backup machine that takes four minutes to boot has not
protected the show, it has protected the second half.

Also worth a sentence: redundancy adds complexity, and complexity adds failure modes. A badly
implemented redundant system fails more often than a simple one. Redundancy is a design decision
with a cost, not a virtue.

### Power and network are the same problem

A switch on unprotected power is a network failure waiting to happen. Ask: where does the switch
get power? Is it on the same circuit as something a stagehand might unplug? Is there a UPS, and
has anyone tested how long it actually lasts?

Two minutes, and it reliably produces a moment of realisation in a class that has been thinking
about protocols for four hours.

### Security on show networks

Frame it as a genuine tension, not as rules.

The tension: vendors want remote support, cloud licensing and updates. Shows want a network that
cannot change during the run. Both positions are reasonable. Somebody has to decide.

Practical positions, in decreasing order of safety:
- **Air gap.** No internet on the show network, ever. Strongest, and it is quietly violated by
  the first person who needs a licence activation at 17:00, so it needs a written procedure for
  when and how the gap is bridged.
- **Separate management network** with controlled internet, and a documented rule about what may
  cross to the show network.
- **Firewalled show network.** Convenient, and it depends on a configuration nobody in the
  building fully understands.

Non negotiables to give them as habits, not policies:
- No software updates during a production period. Update between shows, never during.
- USB discipline. A found USB stick does not go in the media server.
- Change the default password on every managed switch and every node. Write it in the handover
  pack, not on a sticky note on the rack.
- Know who has remote access and be able to revoke it.

### The documentation set

The real deliverable of a system designer, and the criterion year one students most underestimate.

| Document | What it contains | Who reads it at 18:00 on a Friday |
|----------|-----------------|-----------------------------------|
| **Signal flow diagram** | Every device, every connection, what each line carries and on what medium | Everybody |
| **IP schedule** | Device name, IP, mask, VLAN, switch and port, purpose | Whoever is diagnosing |
| **Patch sheet** | Physical connections, socket by socket | The person recabling in the dark |
| **Universe map** | Universe number to node to port to fixture range | The lighting programmer |
| **Naming convention** | The rule, stated once, at the top | Everybody, forever |
| **Backup and version record** | Where the show files live, which is current, when it was last saved | The person after the crash |
| **Handover pack** | All of the above, plus passwords, plus known issues | Your replacement |

Naming conventions, three rules, and they are the most portable thing in this session:
1. **Be consistent before you are clever.** A mediocre convention applied everywhere beats a
   perfect one applied to half the rig.
2. **The label on the device, the name in the software and the name on the diagram must match
   exactly.** Not approximately.
3. **Include the location or the function**, not just a number. `SW-STAGE-L` beats `Switch 3`
   at 18:00 when the person reading it has never been in this building before.

---

## Block D: Studio, design a system, present it (3:05 to 3:55)

**Assessed, 15 percent.** This is the dress rehearsal for the practical exam. Say that.

Teams of four. Each team draws one brief. 35 minutes to design, then 8 minute presentations.

### Brief 1: a mid scale drama, 400 seats, three week run

- 24 moving lights, 60 conventional dimmer channels, 8 LED battens of 40 RGBW pixels each.
- 16 radio microphones, 12 line inputs, a 12 output PA, plus foldback.
- One projection surface at 1920 × 1080, 30 video cues.
- One control position at the rear of the stalls, one machine room 40 m away.
- Cue based operation. One operator on lighting, one on sound.

### Brief 2: a corporate conference, 1,200 delegates, two days, in a hotel ballroom

- Screen wall at 5,760 × 1,080 fed by a media server, plus two IMAG side screens.
- Three camera IMAG. Presenter laptops must connect and work within thirty seconds each.
- 32 channels of audio, simultaneous interpretation into two languages, a live stream.
- Everything rigged in one overnight call and struck immediately after.
- The client will bring an unannounced video file at 08:45 on day two.

### Brief 3: a touring concert, arena scale, eleven cities

- LED wall at 3,840 × 2,160, plus four IMAG screens.
- 96 audio channels, 120 lighting universes.
- Timecode locked show, with pyro and automation cues following the same timecode.
- Four hour load in, per city. Different local crew every night.
- A failure on stage is visible to 15,000 people.

### Required deliverables

Presented in 8 minutes, with a one page handout.

1. **A system diagram.** Devices, connections, protocols, media.
2. **A network design.** Segmentation strategy, chosen and justified against the four options
   from session 4. Switch count and placement. Copper or fibre for each significant run.
3. **An IP schedule extract.** At least the convention, plus ten real example rows.
4. **A bandwidth budget.** The heaviest link in the system, with the arithmetic.
5. **A latency budget.** One complete path from trigger to audience, staged and totalled, with a
   pass or fail against a stated perceptual threshold.
6. **A failure analysis.** Three single points of failure, with the response for each, sorted
   into the three consequence columns.
7. **One deliberate simplification.** Something you chose *not* to do, and why. Argue it.

### Marking

The four criteria rubric, and criterion 4 (what happens when it breaks) carries the most weight
here. Teams that build an elegant system with no failure analysis should not score well, and
should be told exactly why in front of the group, kindly and clearly. It is the last lesson
before the exam and it is the one that transfers to their professional life.

### Presentation discipline

8 minutes, hard stop. Two minutes of questions. Every team member speaks. Practise the hard stop,
because a technical briefing that overruns is a real professional failure and this is a cheap
place to learn it.

---

## Common misconceptions in this session

- **"Clock is an audio thing."** Clock is a media thing. Genlock and PTP do the same job for video.
- **"Redundancy means having a spare."** Redundancy means a second path already carrying the load.
- **"Compressed means worse."** Compressed means a different trade. NDI is used professionally
  every day. The question is whether the trade suits the job.
- **"The network is fast enough, so video over IP is fine."** Uncompressed HD is 2.5 Gbit/s.
  Fast enough for audio is nowhere near fast enough for uncompressed video.
- **"It works, so the documentation can wait."** It works today, with you in the room. Criterion 3.
- **"Security is IT's problem."** The show network is the ALV department's problem, including
  its security posture.

---

## Sources and further study

### The one worth doing properly

**[Dante Certification, Levels 1 to 3](https://www.audinate.com/learning/training-certification)**,
from Audinate. Free, online, and the single most useful non-university qualification a first year
audio or systems student can hold. It covers IP addressing, VLANs, QoS and multicast alongside the
Dante-specific material, so it reinforces Class 3 as well as this one. Level 1 is a couple of hours.

Certification lasts three years and carries AVIXA renewal units, which matters if you later go for
CTS. Put Level 1 on your CV before you graduate.

### Read

| Source | Why | Cost |
|--------|-----|------|
| [NDI documentation](https://docs.ndi.video/all) | How compressed video over IP actually behaves, from the people who make it | Free |
| [NDI bandwidth white paper](https://docs.ndi.video/all/getting-started/white-paper/bandwidth) | Published bitrates to check your own arithmetic against | Free |
| [VSF Technical Recommendations](https://vsf.tv/technical-recommendations/) | The recommendations ST 2110 was built from, including IPMX | Free |
| [AES67 overview](https://www.aes.org) | What interoperability does and does not promise | Abstract free |

### Look at a real one

Most receiving houses publish a technical specification. Read three of them, from venues of
different sizes, and find the network section in each. You will learn more about how real systems
are described, and about how much is left unsaid, than from any textbook.

---

## Homework before session 7

1. Refine your team's system design pack in light of the feedback given in the room. Submit it.
2. Revise the whole of `numbers-to-know.md`. All of it is examinable.
3. Read the exam brief in `07-session-07-practical-exam.md` and bring one question about it.
