# Session 6: Media Over IP, and Thinking in Systems
**Content.**

*How does the sound and the picture itself travel over the network, and how do we build a system
that survives contact with a real show?*

The heaviest session technically, and the one that closes the argument. Block D is the dress
rehearsal for the practical exam, so protect its full run.

---

## Before this class

The final content class pulls on all four before it, so the
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
5. Describe how PTP measures offset, and name two things that break the assumption it rests on.
6. Add up a latency budget across a chain and say which stages are worth spending on.
7. Size a link for a given set of media flows, and explain why oversubscription is fatal for media.
8. Perform a single point of failure audit on a system and propose redundancy.
9. Write a commissioning procedure that tests the failure rather than the success.
10. Produce the documentation set that makes a system operable by someone else.

---

## Block plan

| Block | Title |
|-------|-------|
| — | Numbers quiz |
| A | Audio over IP, and the tyranny of clock |
| — | Break |
| B | Video over IP and the pixel pipeline |
| — | Break |
| C | Designing for failure, and the paperwork that makes it real |
| — | Break |
| D | Studio: design a system, present it |
| | Wrap, and the exam brief |

*If the class is split across two shorter meetings, split after Block B. Block D must run whole.*

---

## Block A: Audio over IP, and the tyranny of clock

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

- **CobraNet** and **EtherSound**, the first audio over Ethernet systems, from the late 1990s.
  Layer 2 only, fixed latency, dedicated network. You will still meet CobraNet in installations.
- **Ravenna**, the open standards route, close to a default in broadcast. Dante discovers; Ravenna
  is configured.

Worth recognising the connectors on sight. The full story, and what each generation charged for
what it solved, is on [How we got here](/lineage).

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
  - This is the Class 2 buffer trade off appearing again, in a different domain. Point that out
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
Link straight back to Class 3: the Four Flows table said clock is killed by "a second master".
Here is what that actually sounds like.

### PTP, the mechanism, and the switch that quietly ruins it

Clock is the foundation of this whole block, so it is worth knowing how the agreement is actually
reached rather than treating it as magic.

**Four messages.** The grandmaster sends a `Sync` and notes the moment it left. The follower notes
the moment it arrived. Then the follower sends a `Delay_Req` and notes when it left, and the
grandmaster notes when it arrived and reports that back. Now both ends have four timestamps, and:

```
path delay  =  ((t2 − t1) + (t4 − t3)) ÷ 2
offset      =  (t2 − t1) − path delay
```

<!--anim:ptp-sync-->

Read the divide by two carefully, because everything that goes wrong is hiding in it. **PTP
assumes the two directions take the same amount of time.** When that is true, the arithmetic is
exact. When it is not, the follower lands exactly halfway between and reports itself as locked.

Two things break the assumption:

- **A switch that is not PTP aware.** It queues the timing messages behind whatever else it is
  carrying, so the delay it adds is different each way and changes second to second. A PTP aware
  switch either corrects the timestamp for the time the message spent inside it (**transparent
  clock**) or terminates and regenerates the timing itself (**boundary clock**). This is why the
  switch model matters on a Dante or AES67 system, and it is not a preference.
- **An asymmetric path.** One direction takes an extra hop, or a different link speed. The offset
  error is half the difference, permanently.

**The failure mode is the point.** A clock problem does not usually look like a clock problem. It
looks like audio that is fine for an hour and then starts clicking, or a stream that drifts out of
sync overnight and is fine again after a restart. That is why the clock is the first thing to
check when a system is intermittently wrong, and the last thing anyone actually checks.

**The two roles to be able to name.** The **grandmaster** is elected, automatically, by the Best
Master Clock algorithm comparing advertised quality. If nobody is configured to win, the election
can be won by whatever cheap device happens to boot first, and it will be re-run whenever that
device is unplugged. On a show, **you choose the grandmaster and you lock it.**

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

## Block B: Video over IP and the pixel pipeline

### The baseline: SDI

Before the network, one signal, one coaxial cable, no configuration.

| Standard | Capacity | Typical |
|----------|----------|---------|
| HD-SDI | 1.485 Gbit/s | 1080i, 720p |
| 3G-SDI | 2.97 Gbit/s | 1080p60 |
| 6G-SDI | 6 Gbit/s | UHD30 |
| 12G-SDI | 12 Gbit/s | UHD60 |

Note that these numbers match the raw video maths from Class 2 almost exactly, because SDI
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

Put plainly: NDI is enormously useful and is used constantly in the
industry, and it is not automatically the right choice for a show critical main screen feed
unless the network was designed for it. Know which of those two situations you are in.

**Two more sit between those columns**, and they matter enough to name. **ST 2022-6** wraps the
whole SDI stream in packets, changing the transport and nothing else, which made it easy to adopt
and left everything braided together. **JPEG XS**, standardised into ST 2110 as **2110-22**,
compresses within a few lines rather than a whole frame, so it costs a fraction of a frame of
latency instead of a whole one. That is the option for a live path that cannot afford NDI's frame
and cannot afford 2110's bandwidth.

*Side by side, with the latency and bandwidth of each, on [How we got here](/lineage).*

### Extension: Inside ST 2110, and the one idea worth stealing from it

Even if you never touch a broadcast plant, ST 2110 contains one idea that changes how you think
about a video signal.

**It separates the essences.** An SDI cable carries video, audio and ancillary data braided into
one stream, so everything travels together and everything is routed together. ST 2110 sends them
as **separate multicast flows**: video on one, each audio group on another, ancillary data on a
third. A monitor that only needs the picture subscribes to the picture. A device that only needs
the timecode takes 40 kbit/s instead of 2.5 Gbit/s.

The cost is that the parts can now arrive separately, which is why PTP is not optional here: the
only thing holding the picture and the sound together is that both are timestamped against the
same clock. **Take away the shared clock and you have not got a video system, you have got three
unrelated streams.**

| Part of the family | What it does |
|--------------------|--------------|
| ST 2110-20 | uncompressed video |
| ST 2110-30 | uncompressed audio, which is AES67 |
| ST 2110-40 | ancillary data, including timecode |
| ST 2110-22 | compressed video, usually JPEG XS, for when 2.5 Gbit/s a stream is too much |
| ST 2059 | the PTP profile that makes all of the above agree |

**ST 2022-7, seamless protection.** Send the same stream twice, down two physically separate
networks, and let the receiver rebuild from whichever packets arrive. Lose a switch and the
picture does not flinch, because the other copy was already there. This is the one redundancy
scheme in this module that survives a failure with **no visible glitch at all**, and the reason it
can is that it never had to detect the failure or switch anything.

That is worth carrying into every system you design, at any budget: **the fastest failover is the
one that already happened.**

### Extension: Visually lossless, and what that phrase is doing

Between "uncompressed" and "H.264" sits a category the industry calls **visually lossless**, or
mezzanine compression: JPEG XS, TICO, and the intra frame codecs from Class 2 wearing a different
hat. Roughly 4:1 to 10:1, intra frame only, sub frame latency, and designed so that repeated
encode and decode passes do not accumulate visible damage.

It is not lossless. It is lossy compression tuned so that the loss lands below what the eye finds
on normal picture content at normal viewing distance, which means it can still be provoked: fine
coloured text, hard saturated edges, noise. The phrase is an engineering claim about typical
material, not a guarantee, and knowing that is the difference between using it well and being
surprised by it once.

### Gamut: the triangle inside the horseshoe

Every colour a human can see fits inside one horseshoe shaped region. Every colour a given display
can make fits inside the **triangle** formed by its three primaries. Those are not the same shape,
and the triangle is much smaller than people expect.

| Gamut | Where you meet it |
|-------|------------------|
| Rec.709 / sRGB | ordinary HD video, most computer content, most projectors |
| DCI-P3 | cinema, better LED walls, recent phones and displays |
| Rec.2020 | the UHD container standard. No display fills it. |

<!--anim:colour-gamut-->

When a colour sits outside the triangle something has to give, and the choice is a look: clip it to
the edge and it goes flat, or squeeze the whole picture inwards and every other colour shifts with
it. Somebody should be making that choice deliberately.

This is also the honest reason a lighting designer's deep congo blue never photographs. The camera
is not failing. It is telling you what fits.

### The LED wall pipeline, end to end

<!--anim:led-pipeline-->

An LED wall is not a screen you plug into. It is a chain, and every link can be the one that is
wrong.

```
content file  →  media server canvas  →  output  →  processor  →  receiving cards  →  panels
```

- **The canvas** is the total pixel area the server is producing. A 6 m by 3 m wall at 3.9 mm pitch
  is about 1,536 by 768 pixels, which is not a standard raster, so somebody has to decide how a
  1920 by 1080 file is placed on it. That decision is a creative one and it is usually made by
  accident.
- **The processor** takes a normal video output and maps rectangles of it onto panels. If the
  mapping is wrong the wall shows the right picture in the wrong order, which looks like a fault
  in the content and is not.
- **Receiving cards** sit behind groups of panels. One dead card takes out its group, which is why
  a wall fails in rectangles rather than in pixels.
- **Scan rate and refresh rate are different numbers.** Refresh rate is how many times a second the
  wall redraws, often 1,920 Hz or 3,840 Hz on a wall meant for camera. Scan rate is how the driver
  multiplexes rows, and it is why a cheap wall photographs badly even at a high refresh number.

**And this is where Class 4 comes back.** The panels dim by PWM, exactly like the fixtures, so the
same shutter arithmetic applies: a camera whose exposure catches only a few refresh cycles records
bands. Ask for the wall's refresh rate before the shoot, not after, and test with **the actual
camera at the actual shutter**.

**Low level grey scale** is the other thing that separates a good wall from a cheap one. Near
black, a wall runs out of PWM steps in the same way an 8 bit dimmer runs out at the bottom of a
fade, so dark content posterises into blocks. It is the identical failure as the fade to black in
Class 4, one department along, and you now know both the cause and the word for it.

### The pixel pipeline

Trace it left to right and name the failure at every stage. This diagram is the
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

### The latency budget, added up honestly

Every box in the chain costs time. None of them is unreasonable on its own, they all add, and the
total is what the performer feels and what the audience sees against the picture.

<!--anim:latency-budget-->

The two numbers worth carrying in your head:

| Threshold | What happens |
|-----------|--------------|
| about **10 ms** electrical | a performer on in-ear monitors starts to feel their own voice arriving late, and compensates by backing off the microphone |
| about **40 ms** | lip sync becomes visible: the sound and the mouth have separated |

Three things follow, and they are the whole of latency management.

1. **The buffer is almost always the biggest single lever**, and plugins are the second. Both are
   choices somebody made, usually while the room was empty and quiet.
2. **Constant latency can be compensated. Variation cannot.** A system that always takes 12 ms is
   better than one that averages 6 ms and occasionally spikes to 20. This is the jitter argument
   from Class 1, arriving with numbers attached.
3. **The audience is not comparing you to zero.** Sound has always taken about 3 ms per metre, so a
   listener 20 m back has been hearing a 58 ms delay all their life without complaint. That is why
   a delay tower works, and it is why the electrical budget matters more than the total.

**Where video and audio disagree.** A video processor that takes two frames is spending 80 ms at
25 fps, which is already past the lip sync threshold on its own. The fix is not to make the video
faster, it is to **delay the audio to match**, deliberately, with a measured number rather than by
ear. Measuring it is a commissioning task, and it belongs in the paperwork.

### Designing the network the media has to cross

Everything in Class 3 was about making a network work. This is about making one that can carry a
show, which is a different question, and it comes down to three numbers you can work out on paper
before anybody buys anything.

**1. Add up what has to cross each link, at peak.** Not the average. The moment when every camera
is live, every screen is fed and somebody is transferring content.

```
16 channels of Dante, 48 kHz 24 bit    16 × 1.152 Mbit/s   ≈    18 Mbit/s
4 full NDI HD feeds                     4 × 140 Mbit/s     ≈   560 Mbit/s
12 universes of sACN                   12 × 0.25 Mbit/s    ≈     3 Mbit/s
1 uncompressed HD feed                                     ≈ 2,500 Mbit/s
                                                             ------------
                                                             ≈ 3,081 Mbit/s
```

**2. Compare it to the link, then halve your answer.** A 1 Gbit link does not carry 1 Gbit of show
traffic. Design to about **60 to 70 percent** of a link's rated speed and you have room for
bursts, for retransmission, for the thing nobody told you about, and for the file copy that will
happen whatever the policy says. The example above needs 10 Gbit, and not marginally.

**3. Look at the uplinks, not the ports.** A 48 port gigabit switch with two 10 Gbit uplinks can
have 48 Gbit arriving and 20 Gbit leaving. That ratio is **oversubscription**, and it is fine for
an office and fatal for media, because the traffic that gets dropped when an uplink saturates is
whatever arrived at the wrong microsecond, which is exactly your clock and your audio.

| Shape | What it gives you | What it costs |
|-------|------------------|---------------|
| One switch, everything on it | simplest thing that works, no uplink to oversubscribe | a single point of failure, and a hard limit on size |
| Star: edge switches to one core | tidy cabling, familiar | the core is now the whole show; uplinks must be sized properly |
| Two independent networks, primary and secondary | survives a switch, and is what Dante and ST 2022-7 expect | twice the hardware, twice the discipline, and it must be tested |

**Multicast is the sharpest edge here.** A single uncompressed video flow arriving at a switch with
no IGMP snooping is sent to every port, so a 2.5 Gbit/s stream lands on the 1 Gbit port that a
lighting node is using and takes the lighting down. The failure appears in a department that has
nothing to do with the change that caused it, which is why this is the fault that takes longest to
find and why Class 3 spent so long on it.

### What you leave behind

The last thing a system does is get handed over, and this part is graded in the exam because it is
the part that gets skipped.

**A system nobody can operate without you is not finished.** Neither is one nobody can fix at
19:45 when you are on a plane. The test is simple and unforgiving: could a competent person who
has never seen this rig restore it from your paperwork?

Three things make that true, and they take an afternoon:

- **Labels that match the drawing.** Every one, both ends, in the same scheme the documentation
  uses. A label that says something different from the paperwork is worse than no label.
- **Addresses written down somewhere other than in the devices.** The IP schedule, the DMX patch,
  the universe map, the PTP grandmaster. When a node is replaced at short notice, this is the
  document that decides whether it takes four minutes or forty.
- **A one page "if it breaks" sheet.** Not the manual. The three things that go wrong most often on
  this specific rig, and what to do about each, in the order to try them.

## Block C: Designing for failure, and the paperwork

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

<!--anim:spof-map-->


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

Non negotiables, as habits rather than policies:
- No software updates during a production period. Update between shows, never during.
- USB discipline. A found USB stick does not go in the media server.
- Change the default password on every managed switch and every node. Write it in the handover
  pack, not on a sticky note on the rack.
- Know who has remote access and be able to revoke it.

### Extension: Commissioning: proving it works before the client does

A system that has never been tested under load has not been tested. Commissioning is the
difference between "we built it" and "we know what it does", and it is a written procedure, not a
feeling.

**Test the failure, not the success.** Everybody tests that the show plays. Almost nobody tests
what happens when the thing they installed for redundancy is actually needed, which is how a
venue discovers that the backup switch was never patched, or that the secondary playback machine
has last week's content on it. **A redundant path nobody has ever cut over to is a theory.**

A minimum commissioning list for a small show system:

| Test | How you know it passed |
|------|------------------------|
| Pull the primary network cable, mid playback | the show continues; write down how long the gap was |
| Pull the primary power feed | the same, and note what needed a manual restart |
| Run every output at full level for twenty minutes | nothing thermally throttles, nothing drifts |
| Copy a large file across the show network during a cue | the cue is unaffected, which is the QoS and VLAN design being proved |
| Measure end to end latency, audio and video | a number written on the paperwork, not an impression |
| Restart every device in turn | it comes back on its own, with the right address, without a laptop |
| Leave it running overnight, then look at it | clock still locked, no memory creep, no dropped nodes |

**Write down what normal looks like.** Record the healthy state while it is healthy: switch port
counts, PTP offset, the media server's frame rate, the temperature. During a show, "is this
number bad" is unanswerable unless somebody wrote down what the number was on a good day.

### Extension: Monitoring during the show

Two rules, and neither is technical.

**Watch the thing that fails slowly.** Sudden failures announce themselves. The ones that hurt are
gradual: a clock drifting, a drive filling, a fan dying, an interface retrying. Put those on a
screen that somebody actually looks at.

**Alarms that nobody acts on are worse than no alarms**, because they train the room to ignore the
screen. Fewer alerts, each with an owner and an action, beats a dashboard nobody reads.

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

## Block D: Studio, design a system, present it

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
   from Class 3. Switch count and placement. Copper or fibre for each significant run.
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

**If this class interested you:** Dante Certification is free and runs to three levels, and AVIXA's CTS is the general AV credential. Both are on [Where to go next](/next).

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
