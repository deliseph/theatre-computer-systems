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
5. Trace one signal in their own specialism end to end, naming what it is, where it goes and what
   its deadline is at every stage.
6. State the six working habits of productive diagnosis and explain why each one exists.
7. Say what they will be assessed on and what to bring to the production visit.

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

This class opens with a rig already running, before anyone has said a word about a syllabus.

**What is set up:** one laptop, one switch, three destinations.
- Laptop sends sACN or Art-Net to a node, which drives a moving light. The light is moving.
- Laptop sends audio via Dante Virtual Soundcard (or an analogue send if Dante is not available)
  to a speaker. Music is playing.
- Laptop sends NDI to a second machine driving the projector. Video is on screen.

It runs for thirty seconds. Then the question: **how many cables are carrying the show right
now?**

Most people count three or more. It is one: a single Cat lead from the laptop to the switch.
Light, sound and picture, all on one wire.

Then the lead comes out. Everything stops at once: the light freezes or goes to its last look, the
audio drops, the video freezes on a frame.

It goes back in, and the show recovers. The sentence that follows is the spine of the whole
module:

> Every signal in a modern show is, at some point, a number in a computer's memory, travelling
> over a shared network, with a deadline.

That is the module.

**Watch how the three departments failed differently**, because it is the first real thing this
class teaches. The light held its last value, the audio stopped dead, the video froze on a frame.
Three identical cable pulls, three different failures. Why that happens is Class 4, and it is
worth carrying the question until then.

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
sentence worth writing down.

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

The model is worth having in your head before the examples, because you will use it immediately.

| Flow | Character | Examples | What kills it |
|------|-----------|----------|---------------|
| **Control** | Small, urgent, must arrive | sACN, Art-Net, OSC, MIDI, MSC, RS-232, GPIO | Loss on event based protocols, latency spikes |
| **Media** | Large, continuous, on time and in order | Dante, AES67, NDI, ST 2110 | Bandwidth starvation, jitter, buffer underrun |
| **Clock / sync** | Tiny, ruthlessly regular | PTP, word clock, genlock, LTC, MTC | Jitter, a second master, a bad switch |
| **Management** | Housekeeping, bursty, no deadline | Remote desktop, file copy, updates, web browsing | Nothing. **It kills everything else.** |

<!--anim:four-flows-->

### Card sort exercise (15 minutes)

A deck of about 24 cards, one item per card, sorted in threes into the four
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
cannot?"** That one is not answered yet. Class 3 answers it. A real question left open
across three weeks is good pedagogy.

---

## Break

---

## Block 4: The two numbers

### Data rate maths

Work it through slowly, out loud, with the numbers in front of you.

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

The ranking, worth keeping in front of you: **clock < control < audio < video.**

### Latency budget, and the physical anchor

Sound travels at about 343 metres per second, so roughly **3 milliseconds per metre**.

Ask a student in the back row how far they are from the speaker. Say 15 m. That is 44 ms of
delay they are currently experiencing and have never once complained about.

Here is a latency chain for a typical digital audio path, added up:

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

Perceptual anchors worth carrying from here on:

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

## Block 4b: Trace one signal, all the way

This is the exercise the rest of the module refers back to, and it is worth doing properly rather
than describing.

**The three questions.** At any point in any chain, in any department, there are only three
questions worth asking, and you will still be asking them in twenty years:

1. **What is it here?** Air pressure, a voltage, a number in memory, a packet on a wire, a photon.
2. **Where is it going next?** Which box, over what, sharing with what else.
3. **What is its deadline?** Now, this frame, this millisecond, or whenever.

Answer those at every stage of a chain and you can diagnose it. Fail to answer them and you are
guessing, and guessing on a show is expensive.

<!--anim:signal-chain-->

### The exercise, in pairs, on paper

Take the chain from **your own** specialism. Draw it as boxes and arrows, left to right, from the
human at one end to the human at the other. For every arrow, write:

- what the signal *is* at that point
- which of the Four Flows it belongs to
- what happens if that arrow is cut

Fifteen minutes, then swap with a pair from a different department and find one thing in their
chain that they have not accounted for. You will find one. Everybody does, and it is almost always
the clock, because clock is the flow with no obvious cable.

**What the exercise is really teaching.** Nobody can hold a whole show system in their head. What
you can hold is a method for walking one, and the method is the three questions. That is why this
appears in Class 1 rather than at the end.

## Block 4c: How to be wrong productively

Everything after this class is diagnosis, so the working method is worth stating on day one. These
are not study tips. They are how the job is done, and a first year who works this way is more
useful in a technical rehearsal than a third year who does not.

**Evidence beats intuition, every time.** "It should work" has never fixed anything. Look at the
link light, read the address, check the number. Your intuition is a way of choosing what to look
at, not a substitute for looking.

**Change one thing.** Change two and you have learned nothing, whichever way it goes. This is
slower for the first ten minutes and much faster for the next hour.

**Write down what you changed.** A show has fifty people touching it. Half of all "mystery faults"
are somebody else's undocumented fix from yesterday, and the other half are your own.

**Halve the problem.** Do not walk a chain end to end. Test in the middle: is it working here? Now
you have eliminated half the system with one measurement. Six of those and you are inside any rig
in the world.

**Know what normal looks like.** Record the healthy state while it is healthy. "Is 12 percent bad?"
is unanswerable unless somebody wrote down what it was on a good day.

**Say what you actually know.** On headset, "the node has no link light" is useful and "the network
is broken" is not, because the second one is a conclusion and it might be wrong. Report the
observation, then your best guess, and mark which is which.

> These six lines are examined. They are also the shortest description of the difference between
> somebody who is trusted with a rig and somebody who is not.

## Block 5: Course map and expectations

The shape of the module, quickly:

- The shape: 2 intro, 2 visit, 16 content, 4 practical exam.
- The assessment map and the four criteria rubric. Spend the most time on criterion 3,
  "can someone else run it", because it is the one most people underestimate.
- The glossary is a working tool. Bring it every session. Add to it.
- `numbers-to-know.md` is a memorisation task. There is a five minute verbal quiz at the start
  of every session. It carries no marks and it is not optional.
- Software install list, due before Class 2.

---

## Block 6: Visit briefing

- Venue, meeting point, travel time, arrival time. Arrive early, a production visit does not wait.
- Dress: closed shoes, dark clothing, no loose jewellery. Bring a torch if they own one.
- **Etiquette:** touch nothing, ask before photographing anything, never step over a cable, do
  not stand in a doorway, keep off headset channels, and if someone says move, move first and
  ask after.
- Teams of three, allocated now, not on the day.
- The observation sheet for the visit is in `02-session-02-production-visit.md`, and it is worth reading through
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

**If this class interested you**, the map of where each direction leads, what is free and what costs, is on [Where to go next](/next).

### The index this module checks itself against

**[showstack](https://showstack-inky.vercel.app/)**, the open index of live entertainment
technology. Protocols with their ports and multicast ranges, standards with their designations,
hardware and software with what each one actually speaks, and bilingual EN / 繁中 vocabulary, with
a citation on every fact and a free JSON API.

Three ways to use it in this module:

- **Check a number before you repeat it.** Every port and date in these notes was verified against
  it.
- **The interop checker**: pick two products, get the protocols they share and in which direction.
  That is the question this whole module is teaching you to ask.
- **The field tools**, 62 of them, for the calculations this module does not examine but the job
  needs: DIP switch addressing, bridle angle, voltage drop, noise dose, RF intermod, beam angle.

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
