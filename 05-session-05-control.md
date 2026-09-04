# Session 5: Control
**Content.**

*How does a computer tell a light, a speaker or a screen what to do, and how do we make three
departments fire on one cue?*

This is where the module pays off for lighting students specifically, and where audio and video
students discover that show control is a shared discipline.

---

## Before this class

Lighter than Class 3, but the lab is a build, so arrive able to set
an IP address without looking it up.

### What you must already be able to do

| Skill | Where to get it |
|-------|----------------|
| Set a static IP and subnet mask on your own machine, in under a minute | Class 3 |
| Say whether two addresses can talk, given a mask | Class 3 |
| Divide a channel count by 512 and round up | [Foundations](/foundations) |

### Do these three things

1. **Practise setting a static IP** on your own laptop, then put it back. Time yourself. Under a
   minute, without a search engine, is the target.
2. **Install a cue application and a software lighting console.** Both free versions are fine. The
   lab builds a chain between them and installation time is lab time lost.
3. **Count the channels** on any fixture you have worked with. Find its manual, find the channel
   count, and work out how many of them fit in one universe. Ten minutes, and it makes Block B
   concrete rather than theoretical.

### Bring

- Your laptop with both applications installed and opened once.
- Your fault log from Class 3.
- The reference card, Block 4 learned.

<!--ready:4-->

---

## Learning outcomes

By the end of this session a student can:

1. Distinguish state based from event based control and predict how each behaves when a packet
   is lost.
2. Describe DMX512 physically and electrically, and calculate its refresh rate limit.
3. Explain the relationship between DMX, Art-Net and sACN, and choose between them.
4. Calculate universe requirements for a pixel based lighting rig.
5. Choose appropriately between OSC, MIDI, MSC, serial and contact closure for a given trigger.
6. Explain what timecode is for and why a large show is built on it.
7. Build, measure and document a working cross department trigger chain.

---

## Block plan

| Block | Title |
|-------|-------|
| — | Numbers quiz |
| A | The anatomy of a control message |
| — | Break |
| B | The lighting family: DMX, Art-Net, sACN |
| — | Break |
| C | The show control family: OSC, MIDI, serial, timecode |
| — | Break |
| D | Lab: build a cross department trigger chain |
| — | Wrap and homework |

*If the class is split across two shorter meetings, split after Block B.*

---

## Block A: The anatomy of a control message

### Callback to session 1

Remember pulling the network cable in session 1. The light held its last look, the audio stopped
dead, the video froze. Today we explain why, and the explanation is the most important idea in
this session.

### State versus event

Every control protocol is one of these two. Students who understand this distinction can predict
the behaviour of a protocol they have never met.

| | **State based** | **Event based** |
|---|---|---|
| The message says | "The level IS 50 percent" | "GO" / "jump to cue 12" |
| Sent | Constantly, repeating, whether or not anything changed | Once, when it happens |
| Examples | DMX512, sACN, Art-Net | OSC, MIDI note, MSC, a GO button, a contact closure |
| If one packet is lost | Nothing. The next one arrives 23 ms later with the same information. | **The cue does not happen.** |
| If the source disappears | The receiver holds the last value it got | Nothing happens, forever |
| Design consequence | Robust by repetition. Wasteful, and that is the point. | Fragile. Needs care, retries, or confirmation. |

<!--anim:state-event-->

This is why the light held and the video froze. DMX repeats itself into eternity, so the node had
a value to keep outputting. The video was waiting for a "go to next" event that never came.

**The design rule to write on the board:**

> Anything that must happen, exactly once, at exactly the right moment, is the fragile part of
> your system. Protect it.

Ask them where the fragile points were in the venue they visited. Good discussion, five minutes.

### The three parts of any control message

Every protocol in this session, without exception, is a way of expressing these three things:

1. **Address.** Which thing? (A DMX channel, an OSC path, a MIDI channel and note.)
2. **Value.** What state, or what action? (A level, a colour, a cue number, a file name.)
3. **Timing.** When, and how fast? (Now, at this timecode, over 3 seconds.)

Introduce it here and then, as each protocol appears in Blocks B and C, ask the class to point at
each of the three parts. By the fourth protocol they will be doing it unprompted, and they will
be able to read a protocol they have never seen before. That transfer is the real objective.

### Control versus media, restated with numbers

From session 1: control is tiny, media is enormous. One DMX universe is about 0.25 Mbit/s. One
uncompressed HD video stream is 2,500 Mbit/s, so ten thousand times larger.

The practical consequence: control traffic almost never runs out of bandwidth. When lighting
control fails on a network, the cause is almost always **configuration** (address, subnet,
multicast, universe number), not **capacity**. Different fault families need different diagnostic
habits. Audio and video failures are often capacity or clock. Lighting failures are almost always
addressing.

---

## Block B: The lighting family

### DMX512, physically

Introduced 1986, revised as DMX512-A. It is still the last hop to almost every fixture on earth,
which for a technology this old is remarkable and worth a sentence about why: it is simple,
cheap, and good enough.

- Electrically it is **RS-485**: a balanced, differential pair, which is why it survives long runs
  in an electrically noisy building.
- **250,000 bits per second.**
- **512 slots** per universe, each one byte, so 0 to 255.
- 5 pin XLR is the standard connector. 3 pin exists, is common, is not compliant, and mixing
  DMX and audio cable on 3 pin XLR causes exactly the confusion you would expect.
- **Daisy chain only**, never a star. No splitting a DMX line by putting a Y cable on it.
- **Up to 32 devices** per segment (32 unit loads on an RS-485 segment). Beyond that, a splitter
  or opto isolator, which starts a fresh segment.
- **Terminate the last device**, 120 ohms across the data pair. An unterminated line causes
  reflections, which cause flicker that comes and goes, which will cost a year one student an
  entire afternoon at least once in their life.

### The refresh rate calculation

Do this on the board. It explains a lot of behaviour they will see.

Each slot is sent as 11 bits (a start bit, 8 data bits, 2 stop bits). Plus a break and a mark
before the first slot.

```
512 slots × 11 bits = 5,632 bits
5,632 bits ÷ 250,000 bits per second ≈ 22.5 ms
plus break and mark, so roughly 23 ms per full frame
1 ÷ 0.023 ≈ 44 frames per second maximum
```

<!--anim:dmx-frame-->

So a full DMX universe updates about **44 times per second, at best.** Consequences worth stating:

- That is the ceiling on how smooth a fast chase or a strobe effect can be.
- It is why very fast pixel effects need many universes, not a faster universe. The protocol has
  no faster gear.
- Some devices transmit fewer slots to go faster. This is legal and it is a real technique.

### RDM

One paragraph. **Remote Device Management** adds a return path over the same cable, so a
controller can discover fixtures, read and set their addresses, and read status like lamp hours
and temperature. It is bidirectional DMX. It requires RDM capable splitters, which is why it
often does not work in a venue that has RDM capable fixtures.

### Getting DMX onto the network

DMX ran out of room. A modern rig needs dozens or hundreds of universes, and cannot have dozens
of separate cable runs from the control position. So we put universes inside network packets.

| | **Art-Net** | **sACN (ANSI E1.31)** |
|---|---|---|
| Origin | Artistic Licence, 1998, open | ESTA standard, 2009 |
| Transport | UDP, port 6454 | UDP, port 5568 |
| Default sending mode | Broadcast historically, unicast is now normal and preferred | **Multicast** |
| Addressing convention | Often `2.x.x.x` or `10.x.x.x` | Normal network addressing |
| Priority between sources | Not in the protocol | **Built in, per universe** |
| Multiple sources on one universe | Fights, or last one wins | Defined merging behaviour |
| Typical use | Very widely supported, especially on smaller and older nodes | The modern default on large systems |

**Which to choose.** If everything supports sACN, use sACN, because priority and defined merging
matter as soon as two consoles exist (a main and a backup, which is every professional show). Use
Art-Net when a device only speaks Art-Net, which is still often. Do not run both to the same node
unless you have thought hard about it.

The `2.x.x.x` trap deserves a full minute: an Art-Net node on `2.0.0.10/8` and a laptop on
`192.168.1.5/24` share a cable and cannot talk. This is the number one reason a year one student
declares a node "broken". Link back to session 4, row 4 of the subnet table.

### Universe maths for pixel work

The calculation every lighting student needs and few are taught early enough.

```
One RGB pixel        = 3 DMX channels
One universe         = 512 channels
512 ÷ 3              = 170 RGB pixels per universe (with 2 channels spare)

An RGBW pixel        = 4 channels
512 ÷ 4              = 128 RGBW pixels per universe
```

<!--anim:universe-pack-->

Worked example, do it with the class:

> An LED batten has 60 RGB pixels. You have 24 of them.
> 60 × 24 = 1,440 pixels. × 3 channels = 4,320 channels.
> 4,320 ÷ 512 = 8.4, so **9 universes**, and that is before a single moving light.

Then the follow up question that lands the point: **what is the data rate of 9 universes?**
About 2.25 Mbit/s. Trivial. The constraint on a pixel rig is never bandwidth, it is universe
count, node port count and processing. Bandwidth is not the enemy here. Configuration is.

---

## Block C: The show control family

### OSC

**Open Sound Control.** Despite the name, it is used far more for show control than for sound.

- Runs over UDP (usually) or TCP, on whatever port you configure.
- The message is a **path** plus **arguments**:
  ```
  /cue/12/start
  /eos/chan/5/level         75
  /qlab/workspace/go
  ```
- **Strength:** human readable, flexible, carries real data types (numbers, text, floats), and
  almost every modern show product speaks it.
- **Weakness, and it is a real one:** there is no standard namespace. Every manufacturer invents
  its own paths. `/cue/12/start` on one product means nothing on another. You must read the
  manufacturer's OSC documentation every single time. Tell them this plainly, because the
  flexibility looks like a promise it does not keep.
- It is event based. A lost OSC message is a cue that did not happen.

### MIDI, and MSC

- **MIDI** is from 1983, musical instrument origin, still everywhere. Notes, control changes,
  program changes. Cheap, reliable, and universally supported.
- Using a MIDI note as a trigger is common, crude and works.
- **MIDI Show Control (MSC)** is a proper show control layer on top of MIDI: commands like GO,
  STOP, RESUME, addressed to a device type and a cue number. Designed for exactly our industry.
  It is old, limited and still in use because it is dependable.
- **MTC (MIDI Time Code)** carries timecode over MIDI. See below.

### Serial, RS-232 and RS-422

Still everywhere in projectors, motorised screens, blinds, older video switchers and machine
control.

- RS-232 is short run and point to point. RS-422 is balanced and goes further.
- Often carried over a network now, via a serial to Ethernet gateway.
- Why it survives: it is direct, deterministic and dumb. When it works, it always works.

### Contact closure and GPIO

The dumbest interface in the building, and the most reliable. Two wires. Touching them is a
trigger.

Give it real respect out loud, because year one students assume newer is better. When the fire
alarm has to stop the show, the interface is a contact closure, not an OSC message. Simplicity
is a safety property.

### TCP versus UDP

The choice underneath everything above.

| | **TCP** | **UDP** |
|---|---|---|
| Delivery | Guaranteed, in order, retried | Not guaranteed. Send and hope. |
| Cost of that | Latency, and a connection to maintain | None |
| If a packet is lost | Resent, everything after it waits | Gone |
| Right for | A cue list sync, a file transfer, a command that must confirm | Streaming state, media, anything where a late packet is useless |
| Used by | Some show control, most management | DMX over IP, Dante, NDI, OSC usually |

The insight to give them, which is genuinely counterintuitive: **for real time media, a
retransmitted packet is worthless.** By the time it arrives, its moment has passed. That is why
almost all show media runs on UDP, the "unreliable" one. Reliability and timeliness are different
goals, and we choose timeliness.

<!--anim:tcp-udp-->

### Timecode

The spine of any large show.

- **LTC (Linear Time Code)** is an audio signal carrying the clock. You can hear it, it sounds
  like a fax machine, and it can travel down any audio path, which is exactly why it is used.
- **MTC (MIDI Time Code)** is the same idea over MIDI.
- Format: `hours : minutes : seconds : frames`.

**What is actually in the sound.** Each frame of LTC is **80 bits**. Sixteen of them are the time
itself, stored as BCD digits: four bits for frame units, two for frame tens, four for second
units, and so on up to hours. Thirty two are **user bits**, free for a reel number or a date.
The last sixteen are a **sync word**, `0011111111111101`, identical in every frame ever recorded.

Three design decisions in that layout explain why LTC has outlived almost everything it was
designed alongside:

- The bits are encoded **biphase mark**: a transition at every bit boundary, and one extra in the
  middle of the cell for a `1`. The information lives in the transitions rather than in the level,
  so gain, polarity and a mediocre recording do not matter.
- 25 fps at 80 bits is 2,000 bits a second. **That is audio**, so any cable, recorder, desk channel
  or radio mic path that carries sound carries timecode.
- The sync word is asymmetric, so a reader can tell which way round it arrived. That is how a
  machine knows the source is **running backwards**, and it is why LTC works while a deck is
  shuttling.

<!--anim:ltc-encode-->

<!--anim:dropframe-->
- Frame rates: 24, 25, 29.97, 30. **29.97 drop frame** exists because of a colour television
  compromise from 1953 and it still bites people. One sentence, do not go down the hole.
- **The critical rule:** everything on the show must agree on the frame rate. A machine at 25 fps
  following a source at 30 fps drifts, and drift is the failure mode that appears slowly, gets
  worse across the show, and looks like nothing is wrong at the top.

**Why a big show is built on timecode.** In cue based operation, an operator presses GO and
everything after it is relative. In timecode operation, every department follows the same clock
independently. Lighting, video, audio, automation and pyro each know what to do at 00:14:22:07,
and none of them depend on the others. It is decentralised, repeatable and precise to a frame.

The trade off, and it is a real artistic one worth discussing with them for two minutes:
**timecode is precise and it does not listen.** A cue based show breathes with the performance.
A timecode show does not wait for the laugh. Which is correct depends entirely on the work, and
that is an artistic decision made on technical grounds, which is the whole argument of this
module in one example.

<!--anim:timecode-vs-cue-->

---

## Block D: Lab, build a cross department trigger chain

**Assessed, 20 percent.** The largest formative piece before the exam.

Teams of four, one from each specialism where the cohort allows. Each team builds a chain where
**one trigger fires all three departments.**

### The required chain

```
   TRIGGER
      │
      ▼
   ┌──────────────────────┐
   │  Cue playback app    │  (QLab, Companion, or equivalent)
   └──┬────────┬────────┬─┘
      │        │        │
      ▼        ▼        ▼
   AUDIO   LIGHTING   VIDEO
   plays    changes    changes
```

- The trigger is a GO button, a MIDI note, or timecode. Team's choice, and they must justify it.
- Lighting must change via **sACN or Art-Net** to a node or a visualiser.
- Video must change via **OSC or MIDI** to a second application or machine.
- Audio must play from the cue application.

### Required deliverables

1. **It works.** Demonstrated live to the lecturer. One trigger, three departments.
2. **A signal flow diagram.** Every box named, every line labelled with protocol and physical
   medium. Same standard as the session 2 sketch, done properly this time.
3. **An IP schedule** for everything on the network.
4. **A measured latency.** From trigger to each of the three outputs. Method is their choice
   (a phone camera at high frame rate pointed at the trigger and the output works, and is a
   genuinely used professional technique). State the method and the number.
5. **A failure analysis.** Name three things that would break this chain, and what you would do
   about each. At least one must be a network fault from session 4.
6. **One paragraph on protocol choice.** Why OSC and not MIDI here, or the reverse. Trade offs
   named.

### Deliberate difficulties to introduce, once they have it working

Do not give these until the chain runs. Then walk round and do one to each team.

- Unplug the network mid cue. Ask them to explain what happened to each department, using the
  state versus event model from Block A. This is the session 1 cold open, closed.
- Change one node's IP by one digit. Time how long they take to find it.
- Ask them to add a fourth department, and see whether their diagram made that easy or hard.
  This is criterion 3 of the rubric arriving in person.

---

## Common misconceptions in this session

- **"DMX is old so it is bad."** DMX is old because it is good enough and simple. Simplicity is
  a reliability property.
- **"Art-Net and sACN are the same."** Different transport, different addressing conventions,
  different priority behaviour. The distinction matters as soon as there are two consoles.
- **"A universe is a cable."** A universe is 512 channels of data. It might arrive over a
  network and never touch a DMX cable until the last hop.
- **"More universes means more bandwidth is needed."** Lighting control is tiny. The constraint
  is universe count and node ports, not bandwidth.
- **"UDP is unreliable so it is worse."** For real time media, a retransmitted packet is
  worthless. UDP is the correct choice, not a compromise.
- **"OSC is a standard so devices will understand each other."** OSC standardises the envelope,
  not the address. Read the manual.
- **"Timecode is more professional than cue based operation."** It is more precise and less
  responsive. Different tool, different work.

---

## Sources and further study

The two documents below are the actual standards behind almost everything in this class, they are
free, and most working technicians have never opened either. Read the first ten pages of each.

| Standard | What it is | Link |
|----------|-----------|------|
| **ANSI E1.11** | DMX512-A. The timing diagram, the electrical spec, the 32 device limit and the termination requirement, from the source. | [Free PDF](https://tsp.esta.org/tsp/documents/docs/ANSI%20E1.11%20-%202024.pdf) |
| **ANSI E1.31** | sACN. Universes, multicast addressing, priority and merging. | [Free PDF](https://tsp.esta.org/tsp/documents/docs/E1-31-2016.pdf) |

Both come from the [ESTA Technical Standards Program](https://tsp.esta.org), where every published
standard is free.

**For OSC**, there is no equivalent: the specification standardises the envelope, not the address.
The only useful documentation is the manufacturer's own OSC reference for the specific product in
front of you, and you will read a new one on every job. That is not a gap in your knowledge, it is
the nature of the protocol, and knowing that saves you looking for a standard that does not exist.

**For timecode**, SMPTE ST 12 is the document, and it is paid. The practical knowledge you need is
the frame rate list and the drop frame rule, both of which are in the reference card.

---

## Homework before session 6

1. Finish and submit the trigger chain documentation pack.
2. Calculate the universe requirement for this rig: 36 LED battens of 40 RGBW pixels each, plus
   18 moving heads at 32 channels each, plus 24 conventional dimmer channels. Show the working.
3. Learn the protocol block of `numbers-to-know.md`. The DMX refresh calculation will be in the quiz.
