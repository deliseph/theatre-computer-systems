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
6. Explain what timecode is for and why a large show is built on it, and describe how LTC survives
   being recorded, played back at the wrong level and run backwards.
7. Explain what a dimmer curve does, why square law is the usual default, and where 8 bit dimming
   runs out.
8. Explain how an LED dims, and predict when a camera will see banding.
9. Read a fixture personality, calculate a patch, and identify an address overlap from its symptom.
10. Choose between HTP and LTP for a given channel, and say what each one costs.
11. Explain tracking against cue only, and predict where an edit will appear.
12. Build, measure and document a working cross department trigger chain.

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

### Dimming: what a level actually does

A DMX value is a request. Between the number and the photons sits a **curve**, and the curve
decides how the fade feels. This matters because your eye is not linear: its response to light is
roughly a cube root, so a lamp emitting half its light looks about three quarters as bright.

Send that through a **linear** curve and the top half of the fader does almost nothing you can
see, while everything happens in the bottom third. A slow fade to black sits still, then falls off
a cliff. Send it through a **square law** curve, where output is the square of the fader, and the
squaring almost exactly cancels the cube root in your eye. Fader position and apparent brightness
now move together, which is why square law is the default on most consoles.

<!--anim:dim-curve-->

| Curve | What it does | When you want it |
|-------|-------------|------------------|
| Linear | output equals the level | measuring, calibrating, driving something that is not a lamp |
| Square law | output is the level squared | almost always. Position matches perception. |
| S curve | slow at both ends | when a fade should arrive and settle rather than land |
| Tungsten emulation | adds thermal lag and a warm tail | matching LED to a tungsten rig, or faking the feel of one |

**Then the resolution problem.** An 8 bit dimmer has 256 levels. At the top of a fade one step is
a fraction of a percent and invisible. At the bottom, one step is a large share of what is left,
and the square law makes it worse by squaring an already small number. So a fade that is smooth
for four seconds comes apart in the last half second, **always in the same place**.

<!--anim:dim-resolution-->

16 bit dimming puts 256 intermediate levels between every one of those steps. That is the entire
reason a fixture offers a fine channel, and the reason a designer asking for a five second fade to
black on an 8 bit rig is going to be disappointed by something that is nobody's fault.

### How an LED actually dims, and why the camera sees it

**An LED does not dim.** A filament dims, because you can feed it less power and it glows less. An
LED run at reduced current shifts colour, so instead it is switched fully on and fully off, very
fast, and left on for a fraction of each cycle. That fraction is the level. This is **PWM**, pulse
width modulation, and it is the same trick as everything else in this module: a smooth quantity
turned into a rate.

Your eye averages it and sees a steady dimmer level. A camera shutter does not average, it
**samples**, and if the exposure is short enough to catch only a few PWM cycles, each frame lands
on a different amount of on time. With a rolling shutter, where each row of the sensor starts a
fraction later than the one above, every row catches a different slice, and you get **bands**.

<!--anim:pwm-flicker-->

Nothing is broken when this happens. The fixture is doing exactly what it was told. The fix is one
of three things: raise the PWM frequency in the fixture menu, slow the shutter, or use a fixture
whose PWM rate is high enough that any realistic shutter averages hundreds of cycles. That last one
is what "flicker free" on a spec sheet means, and it is worth checking against **the actual camera
at the actual shutter**, because it will look fine on the monitor in the room and show up on the
broadcast feed.

### A fixture personality, and the footprint

A fixture reads the slot at its address and a run of slots after it. How many, and what each one
means, is the **personality** or **mode**, and it is decided by the fixture, not by the desk.

A modest moving head might use eight:

| Offset | Channel | What one byte buys |
|--------|---------|--------------------|
| +0 | Pan coarse | 256 positions across 540 degrees |
| +1 | Pan fine | 256 steps between each of those |
| +2 | Tilt coarse | 256 positions across 270 degrees |
| +3 | Tilt fine | the same again |
| +4 | Dimmer | 0 to full |
| +5 | Strobe | a byte carved into ranges: off, speed, random, pulse |
| +6 | Colour | a wheel, also carved into ranges |
| +7 | Gobo | the same |

<!--anim:fixture-channels-->

Two things follow, and both cause real faults.

**16 bit position.** Coarse times 256 plus fine gives 65,536 positions instead of 256. One step of
coarse on a long throw is a visible jump, so a slow pan on 8 bit stutters. Two slots buy movement
that arrives smoothly, which is the same argument as 16 bit dimming, one department along.

**Ranges inside a byte.** Strobe, colour and gobo pack a whole behaviour into one value using
bands. The same DMX value means different things on two fixtures, so the manual's channel chart is
not optional reading.

### Patching arithmetic

Patching is addition, and the mistake is always the same one.

```
next address  =  this address  +  this fixture's footprint
```

<!--anim:dmx-patch-->

When two fixtures overlap, both read the same numbers and both obey them. The symptom is a light
that half works: right colour, wrong movement, or a fixture that flickers whenever a completely
different one moves. Nothing on the desk shows it, because as far as the desk is concerned the
patch is fine.

The version that catches people out is subtler. The footprint comes from the fixture's **mode**,
so someone changing a mode in a fixture menu changes the footprint without touching the patch, and
a rig that was clean this morning has overlaps this afternoon. **Leave gaps when you patch.** They
cost nothing and they save an hour.

### RDM

One paragraph. **Remote Device Management** adds a return path over the same cable, so a
controller can discover fixtures, read and set their addresses, and read status like lamp hours
and temperature. It is bidirectional DMX. It requires RDM capable splitters, which is why it
often does not work in a venue that has RDM capable fixtures.

### Effects, which are not programmed one cue at a time

A rig that appears to be doing something complicated is usually doing something very simple to
every fixture at a different moment. An effect engine holds three numbers:

- a **shape**, a curve over one cycle: sine, ramp, step, triangle
- a **rate**, how many cycles per second
- a **spread**, how the offsets are distributed across the selected fixtures

<!--anim:effect-engine-->

Nothing moves. Twelve lamps fade at twelve different phases of the same curve, and your eye reads
travel. **Spread is the control that matters artistically**, because it decides whether the rig
reads as one gesture or as movement along a line, and the shape barely changes that.

Two practical consequences. **An effect is state, not events**, so it keeps running when the
network stops, which is the Class 1 point about state protocols arriving in a useful place. And an
effect running on top of a cue is a second source claiming the same channels, so everything in the
next section applies to it.

### When two sources want the same channel

A show network usually has more than one thing capable of writing to a universe: the main console,
a backup, a media server doing pixel mapping, a house desk somebody forgot about. When two of them
claim the same slot, something has to decide, and there are only two rules.

<!--anim:htp-ltp-->

**HTP, highest takes precedence.** The bigger number wins. Nobody can black out a channel somebody
else is holding up, which is why this is the traditional rule for dimmers and why it is safe. The
cost is that you cannot take a light *out* while another source is holding it, so a busking desk
left at 30 percent puts a quiet floor under the whole show and every blackout has a glow in it.

**LTP, latest takes precedence.** Whoever moved last owns it. This is necessary for anything that
is not a quantity: the highest of red and blue is not a colour, and the highest of two pan
positions is not a position. So moving lights are LTP and dimmers are usually HTP, often inside the
same desk. The cost is that a stray source can steal a channel and nothing in the numbers tells you
which one did it.

**On a network this stops being theoretical.** Art-Net and sACN both allow several senders on one
universe. sACN has a **priority** field, 0 to 200, so a backup console can sit on the same universe
at lower priority and take over cleanly when the main one stops sending. Art-Net has no such field,
which is why an Art-Net rig with two senders is decided by whichever packet arrived most recently,
and why two people can each be certain the rig is theirs.

### Cues, and the idea that confuses everybody once

A **cue** is not a picture of the stage. It is a set of changes plus a set of times, and the times
are the part people forget: a fade time, sometimes a separate one for up and down, a delay before
it starts, and sometimes a follow that fires the next cue automatically.

The confusing part is what a cue stores.

<!--anim:cue-tracking-->

**Tracking.** A cue only records the channels it changes. Anything it does not mention keeps doing
whatever it was doing. Change a wash in cue 12 and the change runs forward through every later cue
that never mentions that wash. This is the point rather than a fault: on a show with four hundred
cues, you want to change the warm wash once.

**Cue only.** Every cue stores a complete state, so an edit stays exactly where you put it.
Predictable, and much more work.

Almost every professional console is tracking, and almost every first year student is surprised
once, in a technical rehearsal, when a note in cue 12 turns up in cue 40. Knowing the word
**tracking** is what turns that from a mystery into a setting.

**The related trap.** "Blocking" a cue means deliberately recording a hard value into every channel
so that nothing tracks through it, usually to protect an act break. A show with blocks everywhere
has thrown away the reason to use tracking, and a show with none can have a note from act one
reappear in act three.

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

**OSC in audio, specifically.** Most current digital mixing desks accept OSC, and this is how a
sound department automates itself without a show control system: a playback machine sends
`/ch/03/mix/on 1` before a cue and the channel is open before the actor speaks. Two patterns cover
almost all of it:

| Pattern | Example | Why |
|---------|---------|-----|
| A playback application drives the desk | QLab or Reaper sends OSC to the console at a cue | one operator, one GO, no missed unmute |
| The desk drives something else | a scene recall sends OSC to a media server | the audio desk is already the thing being operated |

**The thing to check before promising it:** whether the desk's OSC implementation is *receive
only*, and whether it needs a specific port and a specific enable switch buried in a setup menu.
Both are common, both are in the manual, and neither is discoverable by guessing.

### MIDI, and MSC

- **MIDI** is from 1983, musical instrument origin, still everywhere. Notes, control changes,
  program changes. Cheap, reliable, and universally supported.
- Using a MIDI note as a trigger is common, crude and works.
- **MIDI Show Control (MSC)** is a proper show control layer on top of MIDI: commands like GO,
  STOP, RESUME, addressed to a device type and a cue number. Designed for exactly our industry.
  It is old, limited and still in use because it is dependable.
- **MTC (MIDI Time Code)** carries timecode over MIDI. See below.

**What you will actually do with MIDI.** Three jobs, and they cover nearly everything:

| Job | Message | Note |
|-----|---------|------|
| Fire a cue in another department | a **note on**, one note per cue | crude, instant, universally supported |
| Recall a scene or a snapshot | a **program change** | what most desks and processors expect |
| Move a fader or a parameter live | a **control change**, value 0 to 127 | 7 bit, so 128 steps, which is coarse for a fade |

Two practical points and then move on. MIDI over a **DIN cable** is a physical link between two
boxes and has no addressing beyond its 16 channels; **MIDI over USB** is a connection to one
computer and dies when that computer sleeps. And a control change carries **7 bits**, so a fade
driven by MIDI has 128 steps, which is the resolution argument from the lighting block arriving in
a different department.

### PJLink, and controlling a projector

Projectors are the department that everyone forgets is on the network until somebody has to turn
forty of them off.

**PJLink** is a manufacturer independent standard for basic projector control over IP, on **TCP
port 4352**. It is deliberately small: power on and off, input select, mute, and a status query
that reports lamp hours, errors and whether the thing is actually on.

```
%1POWR 1        turn on
%1POWR 0        turn off
%1INPT 31       select input
%1POWR ?        are you on?
```

That is roughly the whole vocabulary, and that is the point. It is supported across brands, so one
control system can look after a mixed rig, and it is the reason a venue can shut down its projectors
from one button rather than forty remote controls.

**What it does not do.** Anything creative. Lens control, geometry, blending and colour are all
manufacturer specific, over the manufacturer's own protocol or a web interface. PJLink is
housekeeping, and housekeeping is worth automating: **a projector that reports its own lamp hours
and its own error state is a projector that tells you it is dying before the show does.**

*Depth on any of these protocols belongs in the show networking and control elective. At year one
the useful knowledge is which one to reach for, and what each one refuses to do.*

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
