# Session 1: Why This Class Exists
**Content.**

The whole module is won or lost here. The goal is not to teach a protocol. The goal is that a
year one lighting student leaves the room believing that a computing class is *their* class,
not something bolted on by the curriculum committee.

---

## Before this class

This is the first class, so there is almost nothing to prepare. Come
with the right expectation rather than the right knowledge.

### What you must already be able to do

Nothing. No computing background is assumed anywhere in this module.

### Do these three things

1. **Read the one sentence** below and decide whether you believe it. You will be asked.
   *Every signal in a modern show is, at some point, a number in a computer's memory, travelling
   over a shared network, with a deadline.*
2. **Think of one time** a show you worked on, or watched, had a technical failure. What broke?
   Did anyone know why? Bring it, we will use real examples.
3. **Skim the glossary.** Do not learn it. Just see how much of it you already half know from
   being around a stage.

### Bring

- Something to write with. This class is not a laptop class.
- The glossary, printed or on a phone.

<!--ready:1-->

---

## Learning outcomes

By the end of this session a student can:

1. State the spine sentence in their own words and give one example from their own specialism.
2. Sort any piece of show traffic into one of the Four Flows and say what would break it.
3. Explain the difference between latency and jitter, using a physical example.
4. Estimate whether a given signal will fit down a given wire, to an order of magnitude.
5. Say what they will be assessed on and what to bring to the production visit.

---

## Block plan

| Block | Mode |
|-------|------|
| Cold open: the rig, live, then killed | Demo |
| The argument: why you are here | Lecture, high energy |
| The Four Flows | Lecture plus card sort |
| Break | |
| The two numbers, and latency versus jitter | Demo plus worked maths |
| Course map, assessment, expectations | Admin, brisk |
| Visit briefing and team allocation | Admin |

---

## Block 1: Cold open

Say nothing about the syllabus. Do not introduce yourself yet. Start with the rig running.

**Setup, prepared in advance:** one laptop, one switch, three destinations.
- Laptop sends sACN or Art-Net to a node, which drives a moving light. The light is moving.
- Laptop sends audio via Dante Virtual Soundcard (or an analogue send if Dante is not available)
  to a speaker. Music is playing.
- Laptop sends NDI to a second machine driving the projector. Video is on screen.

Let it run for thirty seconds. Then ask: **"How many cables are carrying the show right now?"**

They will count three or more. Walk over and show them: one Cat lead from the laptop to the
switch. Light, sound and picture, all on one wire.

Then **pull the Cat lead.** Everything stops at once. Light freezes or goes to last look, audio
drops, video freezes.

Plug it back in. Let it recover. Then say the sentence:

> Every signal in a modern show is, at some point, a number in a computer's memory, travelling
> over a shared network, with a deadline.

That is the module. Now introduce yourself.

**Facilitation note:** the freeze behaviour when you pull the lead is itself a lesson. The light
holds its last value (DMX is state based, and the node keeps outputting), the audio stops dead,
the video freezes on a frame. Point it out now without explaining it. Promise it for session 5.

---

## Block 2: The argument

### The three claims

Deliver these as claims to be defended, not facts to be copied.

**Claim 1: your instrument is now a computer.**

Walk the arc for each specialism. Keep it fast, one minute each.

- *Lighting.* Resistance dimmer, to analogue 0 to 10 V, to DMX512 in 1986, to networked control
  in the 2000s, to a modern fixture that boots, runs firmware, has an IP address and can be
  updated over the network. Your moving light is a computer with a lamp in it.
- *Audio.* Analogue desk, to digital desk with a DSP engine, to a mixing surface that is
  a control surface for a computer somewhere else in the building. Every plugin you love is a
  program. The desk is a computer with faders on it.
- *Video.* Slide projector, to VHS, to a media server that is explicitly and openly a computer
  with a professional graphics card. Nobody pretends otherwise here.

**Claim 2: your cable is now a network.**

The industry replaced dedicated single purpose cables with a shared general purpose one.

| Was | Now | What you gained | What you gave up |
|-----|-----|-----------------|------------------|
| Analogue multicore, 48 pairs, heavy | Dante on one Cat lead | Weight, channel count, repatch in software | A cable that could not be misconfigured |
| DMX line per universe | sACN on the show LAN | Hundreds of universes, remote nodes | Physical isolation between departments |
| SDI per screen | NDI or ST 2110 | Routing flexibility, distance | A signal that did not care about switch settings |

The trade is always the same: **flexibility bought with configuration risk.** That is the
sentence to write on the board.

**Claim 3: your craft judgement is now a systems judgement.**

Concrete examples, one per specialism, phrased as artistic decisions:
- Choosing a Dante latency setting of 0.25 ms or 5 ms is deciding whether a musician's in ear
  monitor feels tight or feels wrong.
- Choosing 8 bit or 16 bit dimmer control is deciding whether a slow fade to black is smooth or
  visibly stepped.
- Choosing a codec is deciding whether a fast camera move on a 12 m LED wall is crisp or mushy.

None of those are IT decisions. All of them are made by the artist, and all require the numbers.

### The industry reality, said plainly

Two minutes, no motivational tone.

Show networks fail more often than show power does. When they fail, the people who fix them are
the people who understand them, and those people are increasingly the ALV heads of department,
not an external IT contractor who does not know what a cue is. Being that person is the single
most reliable way for a year one ALV student to become employable fast. That is the honest
reason this module exists.

---

## Block 3: The Four Flows

Introduce the model on the board, then make them use it immediately.

| Flow | Character | Examples | What kills it |
|------|-----------|----------|---------------|
| **Control** | Small, urgent, must arrive | sACN, Art-Net, OSC, MIDI, MSC, RS-232, GPIO | Loss on event based protocols, latency spikes |
| **Media** | Large, continuous, on time and in order | Dante, AES67, NDI, ST 2110 | Bandwidth starvation, jitter, buffer underrun |
| **Clock / sync** | Tiny, ruthlessly regular | PTP, word clock, genlock, LTC, MTC | Jitter, a second master, a bad switch |
| **Management** | Housekeeping, bursty, no deadline | Remote desktop, file copy, updates, web browsing | Nothing. **It kills everything else.** |

<!--anim:four-flows-->

### Card sort exercise (15 minutes)

Prepare a deck of about 24 cards, one item per card. Groups of three. They sort into the four
columns and then defend two of their choices.

Suggested cards, with the intended answer and the teaching point:

| Card | Flow | Why it is a good card |
|------|------|-----------------------|
| A GO button press on a lighting console | Control | Event, fires once, loss is fatal |
| A DMX level being held at 50 percent | Control | State, repeats constantly, loss is survivable |
| 64 channels of Dante from stage to FOH | Media | Continuous, bandwidth heavy |
| A word clock signal | Clock | Tiny, absolutely regular |
| A designer copying a 4 GB video file to the media server during rehearsal | Management | The villain. Discuss loudly. |
| An NDI feed of the stage to the director's monitor | Media | Compressed, tolerant, still large |
| A Windows Update download | Management | Ask what happens if this runs at 19:58 |
| Timecode from the playback machine | Clock | The spine of a big show |
| An OSC message telling a video server to jump to a cue | Control | Event, loss is fatal, no retry by default |
| A projector's lamp hours being read by a monitoring system | Management | Useful, and it can wait |

Debrief question, the one that matters: **"Which flows can share a wire safely, and which
cannot?"** Do not answer it yet. Tell them session 4 answers it. Leaving a real question open
across three weeks is good pedagogy.

---

## Break

---

## Block 4: The two numbers

### Data rate maths

Do this on the board, slowly, with them calling out the numbers.

**Audio, one channel, CD style quality but professional rate:**

```
48,000 samples per second  ×  24 bits per sample  =  1,152,000 bits per second
                                                  =  1.152 Mbit/s per channel
```

So 64 channels is about 74 Mbit/s of actual audio, call it 100 Mbit/s once the network overhead
is added. A 1 Gbit/s Cat lead swallows that without noticing. This is why a single Cat5e can
replace a 48 pair analogue multicore that took two people to coil.

**Video, one HD picture:**

```
1920 × 1080 = 2,073,600 pixels per frame
× 60 frames per second = 124,416,000 pixels per second
× 20 bits per pixel (10 bit, 4:2:2 colour) = 2,488,320,000 bits per second
                                           ≈ 2.5 Gbit/s
```

That does **not** fit down a 1 Gbit link. One uncompressed HD picture is bigger than a thousand
channels of audio. Say that out loud, because it rearranges their intuitions permanently.

**Lighting, for scale:**

```
DMX512: 512 slots at roughly 44 refreshes per second ≈ 0.25 Mbit/s per universe
```

A hundred universes of lighting control is still smaller than one channel pair of audio. Control
is tiny. Media is enormous. Clock is nothing. Management is unbounded.

Write the ranking on the board and leave it up: **clock < control < audio < video.**

### Latency budget, and the physical anchor

Sound travels at about 343 metres per second, so roughly **3 milliseconds per metre**.

Ask a student in the back row how far they are from the speaker. Say 15 m. That is 44 ms of
delay they are currently experiencing and have never once complained about.

Now put up a latency chain for a typical digital audio path and add it up with them:

| Stage | Typical |
|-------|---------|
| Microphone to converter (analogue to digital) | about 0.5 ms |
| Console processing | 1 to 2 ms |
| Dante network, at the 1 ms setting | 1 ms |
| Amplifier DSP and conversion back to analogue | about 1 ms |
| **Total electronic path** | **about 4 ms** |
| Air, 15 m to the back row | 44 ms |

The lesson lands by itself: the entire digital signal chain costs less than three metres of air.
Latency, when it is known and constant, is a budget you spend deliberately.

<!--anim:sound-distance-->

### Latency versus jitter

- **Latency** is delay. Constant delay can be measured and compensated. A delay tower is
  literally a latency compensation device, and nobody calls it a fault.
- **Jitter** is delay that changes. You cannot compensate for a number that will not sit still.
  Your only defence is a buffer, and a buffer costs latency.

<!--anim:latency-jitter-->

Perceptual anchors to give them now, and to repeat all module:

| Threshold | Number | Where it comes from |
|-----------|--------|---------------------|
| Musician's in ear monitoring feels wrong beyond | roughly 5 to 10 ms | Practitioner consensus, varies by player |
| Audio ahead of picture becomes detectable at about | +45 ms | ITU-R BT.1359 detectability |
| Audio behind picture becomes detectable at about | −125 ms | ITU-R BT.1359 detectability |
| Broadcast delivery tolerance commonly cited | +40 / −60 ms | EBU R37 |
| A cue firing late enough to break a laugh | roughly 100 ms | Craft judgement, not a standard |

Note the asymmetry and explain it: we are evolved to accept sound arriving after picture,
because thunder always follows lightning. Sound arriving *before* picture is unnatural, and we
catch it three times faster. This is a good example of a technical spec derived from perception.

---

## Block 5: Course map and expectations

Brisk. Put the seven session table on screen. Cover:

- The shape: 2 intro, 2 visit, 16 content, 4 practical exam.
- The assessment map and the four criteria rubric. Spend the most time on criterion 3,
  "can someone else run it", because it is the one they will underestimate.
- The glossary is a working tool. Bring it every session. Add to it.
- `numbers-to-know.md` is a memorisation task. There is a five minute verbal quiz at the start
  of every session. It carries no marks and it is not optional.
- Software install list, due before session 3.

---

## Block 6: Visit briefing

- Venue, meeting point, travel time, arrival time. Arrive early, a production visit does not wait.
- Dress: closed shoes, dark clothing, no loose jewellery. Bring a torch if they own one.
- **Etiquette:** touch nothing, ask before photographing anything, never step over a cable, do
  not stand in a doorway, keep off headset channels, and if someone says move, move first and
  ask after.
- Teams of three, allocated now, not on the day.
- Hand out the observation sheet from `02-session-02-production-visit.md` and walk through it
  for two minutes so they know what they are hunting for.

---

## Common misconceptions in this session

- **"So it is all just IT."** No. IT optimises for throughput, security and uptime averaged over
  a day. Show networks optimise for a guaranteed deadline at 19:32 tonight. The priorities are
  genuinely different, and that difference is why show networks are configured by ALV people.
- **"Wireless would be easier."** Wireless is a shared, contended medium with no delivery
  guarantee and a variable delay. It is acceptable for an operator's tablet. It is not
  acceptable for anything that must happen.
- **"Latency is bad."** Latency is a budget. Say it every time you hear this.
- **"The audience cannot tell."** The audience cannot *name* it. They can absolutely feel it.

---

## Sources and further study

Everything here is free and checkable. Two habits worth starting now: read the actual standard
rather than a summary of it, and read the manufacturer's own documentation rather than a forum post.

**Where the rules actually live.** Somebody decided each of these and wrote it down, and knowing
that the documents exist is itself professional knowledge.

| Body | What they publish | Cost |
|------|------------------|------|
| [ESTA Technical Standards Program](https://tsp.esta.org) | DMX512-A (E1.11), sACN (E1.31), and the rest of the entertainment standards | **Free** |
| [AES](https://www.aes.org) | AES3, AES67 | Paid, abstracts free |
| [SMPTE](https://www.smpte.org) | ST 2110, SDI, timecode | Paid, abstracts free |
| [IEEE 802](https://www.ieee802.org) | Ethernet (802.3), VLANs (802.1Q), PoE, PTP (1588) | Free drafts, paid finals |
| [Video Services Forum](https://vsf.tv/technical-recommendations/) | Technical Recommendations behind ST 2110 and IPMX | **Free** |

The ESTA one matters most to you. **Every published ESTA standard is free**, and the two you will
use for the rest of your career are linked in Class 4.

**A note on the links in this module.** Standards bodies and manufacturers keep their documents at
stable addresses. Third-party videos do not always survive. If a link here is dead, search the
title and the channel rather than assuming the resource has gone.

---

## Homework before session 2

1. Read the study guide section for session 1 and self test.
2. Learn the first block of `numbers-to-know.md` (the data rate numbers).
3. Read the observation sheet. Write down three things you expect to see at the venue and one
   question you want answered. Bring both to the visit.
