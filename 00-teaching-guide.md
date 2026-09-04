# Teaching Guide
## Computer Systems & Networking for Theatre and Entertainment Arts

24 contact hours. Year one BFA, audio / lighting / video specialisms.

---

## 1. The problem this module solves

Year one ALV students arrive fluent in the *artefact* (a speaker, a fixture, a screen) and
blank on the *substrate* (the machine, the protocol, the network). They can patch a light and
cannot say what a universe is. They can run a session in a DAW and cannot say why the buffer
size changes the latency. They will graduate into an industry where the fastest growing point
of failure on a show is a network configuration error, and where the person who can read an IP
schedule is the person who gets the call.

This module is not a computer science course wearing a theatre costume. It teaches the subset
of computing that a working ALV artist touches with their hands, and it teaches it through the
show, never through the abstraction first.

**Design test used throughout:** form follows function follows feeling. Every technical idea in
this module is introduced by the audience experience it protects. Latency is taught because a
late sound breaks a joke. Clock is taught because drift breaks a lip sync. Redundancy is taught
because a black stage is a refund. If a concept cannot be traced back to something an ordinary
audience member could feel, it does not belong in year one.

---

## 2. The spine

One sentence the students should be able to say by the end of session 1, and prove by the end
of session 6:

> **Every signal in a modern show is, at some point, a number in a computer's memory, travelling
> over a shared network, with a deadline.**

Three claims unpack it. They recur in every session.

1. **Your instrument is now a computer.** The console, the mixer, the media server, the plugin,
   the fixture itself. All of them are computers running software.
2. **Your cable is now a network.** Analogue multicore became Dante. DMX became sACN. SDI is
   becoming ST 2110. The signal path is now a shared, addressed, contended resource.
3. **Your craft judgement is now a systems judgement.** Choosing a codec, a buffer size, a
   topology or a latency setting is an artistic decision with an audible and visible result.

### The Four Flows

The single most useful mental model in the module. Introduced in session 1, used to classify
everything afterwards. Any traffic on a show network is one of four kinds:

| Flow | Character | Examples | What kills it |
|------|-----------|----------|---------------|
| **Control** | Small, urgent, must arrive | sACN, Art-Net, OSC, MIDI, MSC, RS-232, GPIO | Loss on event based protocols, latency spikes |
| **Media** | Large, continuous, must arrive on time and in order | Dante, AES67, NDI, ST 2110, SDI over IP | Bandwidth starvation, jitter, buffer underrun |
| **Clock / sync** | Tiny, ruthlessly regular | PTP, word clock, genlock, LTC, MTC | Jitter, a second master, a bad switch |
| **Management** | Housekeeping, bursty, indifferent to time | Remote desktop, file copy, software updates, web | Nothing kills it, **it kills everything else** |

The teaching payload: management traffic is the villain of the module. It is the flow that has
no deadline and therefore no manners, and mixing it onto a show VLAN is the most common
self inflicted wound in the industry.

### The two calculations

Every session includes at least one worked instance of these. By session 6 students do both
unprompted.

- **Data rate maths.** Can this fit down this wire? Channels or pixels, times rate, times depth.
- **Latency budget.** Add every stage from trigger to eardrum or retina. Compare against the
  perceptual threshold. State pass or fail.

### Latency versus jitter

Introduced session 1, hammered in session 4 and session 6. Students routinely conflate them.

- **Latency** is delay. Predictable delay is cheap to fix: you compensate for it.
- **Jitter** is variation in delay. It cannot be compensated for, only absorbed by a buffer,
  and buffers cost latency. Jitter is what actually breaks shows.

Anchor it physically. Sound travels about 3 ms per metre. A person sitting 15 m from the
loudspeaker already accepts 44 ms of acoustic latency without complaint. That reframes a
2 ms network hop as trivial and makes clock jitter the real enemy. This single comparison does
more for year one intuition than an hour of theory.

---

## 3. Session sequence

| # | Title | Hours | Core question |
|---|-------|-------|---------------|
| 1 | Why this class exists | 2 | Why is an ALV artist in a computing class? |
| 2 | Production visit | 2 | Where do these systems physically live? |
| 3 | The machine | 4 | What is a show computer, and why is it different? |
| 4 | The network | 4 | How does a packet get from a console to a fixture? |
| 5 | Control | 4 | How does a computer tell a light or a speaker what to do? |
| 6 | Media over IP and systems thinking | 4 | How does the sound and the picture itself travel, and how do we stop it failing? |
| 7 | Practical exam | 4 | Can you build, diagnose and document a small system? |

### Why the visit is at position 2

Recommended, with the trade off stated openly.

**Option A, visit at session 2 (recommended).** Every abstract idea afterwards has a physical
referent. When you say "amplifier room" in session 6, they smell it. Cost: they visit with a
thin vocabulary and will not understand most of what they see, so the observation sheet has to
carry the whole load, and the debrief must be disciplined.

**Option B, visit at session 4, after the network class.** They see far more, because they now
know what a switch and a universe are. Cost: sessions 1 and 3 run abstract, which is exactly
where year one attention is lost.

**Option C, split the visit, 1 hour early and 1 hour late.** Best learning, worst logistics.
Two venue bookings, two travel windows, two risk assessments. Only viable with an in house venue.

**Option D, visit at session 6, as a systems audit.** Turns the visit into an assessment style
exercise. Cost: the whole module runs without a physical anchor. Not recommended for year one.

Take Option A unless the venue is in the same building, in which case take Option C.

### Alternative shape, if the timetable forces different blocks

If 4 hour blocks are not available, sessions 3 to 6 split cleanly into eight 2 hour blocks at
the block boundaries marked in each session file (Block A/B and Block C/D). The labs lose some
momentum, and Block D of session 6 needs the full run, so protect that one.

---

## 4. Assessment map

Total assessment weight is a suggestion. Adjust to programme regulations.

| Instrument | Session | Weight | Assesses |
|-----------|---------|--------|----------|
| Visit observation sheet and signal flow sketch | 2 | 10% | Observation, vocabulary, drawing a system |
| Show machine specification exercise | 3 | 15% | Data rate maths, component reasoning, justification |
| Network build and fault diagnosis log | 4 | 15% | Addressing, switching, systematic diagnosis |
| Cross domain trigger chain, built and documented | 5 | 20% | Protocol choice, integration, latency measurement |
| Team system design and 8 minute presentation | 6 | 15% | Systems thinking, documentation, communication |
| **Practical exam** | 7 | 25% | All of it, under time pressure, alone |

Formative only, not graded: the weekly self test in `study-guide.md`, and the numbers
recall quiz at the top of each session (5 minutes, verbal, no stakes).

### The rubric spine

Four criteria, used on every graded item so students internalise them.

1. **Does it work?** The system does the thing. Binary.
2. **Do the numbers hold?** Bandwidth, latency and channel counts are calculated, not guessed,
   and the calculation is shown.
3. **Can someone else run it?** Documentation, labelling and naming are good enough that a
   substitute operator could take over.
4. **What happens when it breaks?** The student can name the single points of failure and the
   fallback.

Criterion 3 is where year one students lose the most marks and learn the most.

---

## 5. Room, kit and software

### Minimum viable kit (the module runs on this)

- One managed switch with a web interface, 8 ports or more, VLAN and IGMP snooping capable.
- One unmanaged switch, for the contrast demo.
- Assorted Cat5e / Cat6 patch leads, including **one deliberately faulty lead** for session 4.
- One Art-Net / sACN to DMX node, and two DMX fixtures (one basic, one 16 bit moving head).
- One USB audio interface.
- One projector or large display, plus one HDMI source and one long HDMI lead for the EDID demo.
- Students' own laptops.

### Adds that materially improve the module

- A second node and a short DMX line with a terminator, for the termination demo.
- Two Dante enabled devices, or two laptops running Dante Virtual Soundcard.
- A cable tester, and a fibre patch lead with an SFP module to hold up.
- A rack mount PDU or a labelled patch panel, purely as an object lesson in labelling.

### Free or low cost software (all sessions were designed around these)

| Tool | Used for | Session |
|------|----------|---------|
| Wireshark | Packet capture, seeing Art-Net and sACN on the wire | 4, 5 |
| Dante Controller + Dante Virtual Soundcard | Audio over IP patching, clock, latency | 6 |
| sACN View / Art-Net viewer | Seeing lighting data without a console | 5 |
| A free lighting control application with sACN output | Sending control | 5 |
| QLab (free tier) or an open source cue player | Show control, OSC and MIDI out | 5 |
| Bitfocus Companion | Glue between protocols, a genuinely industry standard tool | 5 |
| OBS Studio + NDI Tools | Video over IP, encoding, bandwidth observation | 6 |
| A disk benchmark utility and an audio latency tester | Machine measurement | 3 |
| draw.io or equivalent | Signal flow and network diagrams | 2, 6 |

### Room setup notes

Put the demo rig on a table at the front, cabled and visible, for the whole module. Do not
tidy it away between sessions. Students should be able to walk up and trace a cable with a
finger. A visible, touchable rig is worth more than any slide.

---

## 6. Delivery notes

**Pace.** Year one attention in a 4 hour block collapses at about 50 minutes. Every 4 hour
session in this pack is four blocks of roughly 50 minutes with 10 minute breaks and a buffer.
Do not run over into a break. The break is load bearing.

**Order within a block.** Demo, then explain, then let them do it. Never explain first. A
protocol described before it has been seen is a list of acronyms.

**Vocabulary discipline.** Correct terminology from day one, gently and every time. Year one is
exactly when "channel", "circuit", "address" and "universe" get welded together wrongly, and it
takes years to unpick. The glossary is a working tool, not a reference appendix. Ask students to
bring it.

**Bilingual delivery.** Where the class is HK or TW, key terms are given EN / 繁中 in the
glossary. Teach the English term as the operational term, because the paperwork, the menus and
the error messages are all English. Use 繁中 to build the concept, then hand back the English
label. Chinese in this module is for understanding, English is for the job.

**Mixed specialisms.** Every session includes at least one worked example from each of audio,
lighting and video. Resist letting the class split into tribes. The whole argument of the module
is that the substrate is shared, so the examples must be shared too.

**Common misconceptions to watch for.** Each session file lists the specific ones. Three appear
in every cohort:
- "The network is either working or not." (It is a spectrum, and most failures are partial.)
- "Latency is bad." (Latency is a budget. Unmanaged latency is bad. Jitter is bad.)
- "Wireless is the same as wired but without the cable." (It is a shared, contended, unreliable
  medium with no delivery guarantee.)

**When you are behind.** The compressible content, in order of what to cut first: session 3
Block C colour theory detail, session 5 Block C serial control, session 6 Block A AES67 interop
detail. Never cut the labs. The labs are the module.

---

## 7. Preparation checklist per session

- [ ] Demo rig cabled, powered and tested the day before, not on the morning.
- [ ] The deliberately broken things prepared (bad cable, wrong subnet, duplicate IP, missing
      terminator). Sessions 4 and 5 depend on these.
- [ ] Student laptops: send the software install list one week ahead. Half of them will not have
      done it, so have a USB stick with installers.
- [ ] Glossary printed or shared, one per student, for the whole module.
- [ ] The numbers recall quiz for the top of the session (5 questions from `numbers-to-know.md`).

---

## 8. Open items

- **Session 7 practical exam** is a draft skeleton in `07-session-07-practical-exam.md`. It needs
  the final station design, the mark scheme weightings and the fault library written against the
  actual lab kit available. Flagged for a working session.
- Consider a shared class wiki or Notion space where each cohort adds to the glossary. The
  glossary is the artefact students keep after the module ends.
