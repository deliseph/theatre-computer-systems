# How we got here

Nothing in this module was designed. It accumulated, one problem at a time, and every generation
solved the previous one's limit and introduced a new one of its own.

This page is not examinable as history. It is here because **knowing why something exists tells you
what it refuses to do**, and that is the knowledge that keeps working when the product names change.

One pattern runs through all of it:

> Each step put more on one cable, and charged for it in something you now have to configure.

*Every date, port number and multicast range on this page was checked against*
*[showstack](https://showstack-inky.vercel.app/), the open index of live entertainment technology,*
*which carries a citation on each entry. Where this page summarises, showstack has the source.*

---

## Block 1: Audio, from a voltage to a network

Audio started as the thing it is: a voltage that looks like the sound. Everything since has been an
argument about how to get more of those down fewer cables without the noise.

<!--anim:audio-lineage-->

**The three moments that matter.**

**AES3 made it digital but not networked.** Two channels on one pair, self clocking, point to point.
Worth noticing that it carries its own timing in the transitions, exactly like the LTC timecode in
Class 4: the same trick, twice, for the same reason.

**CobraNet proved audio over Ethernet, and showed the bill.** A dedicated layer 2 network that could
not be routed, a latency you took rather than chose. It worked, and everything since has been an
argument about how much of that restriction to give back.

**Dante won by being ordinary.** Routable IP, standard managed switches, latency you set. What it
charges you is the clock: your system now depends on a PTP election you did not make and cannot see.
That is why Class 5 spends so long on grandmasters and PTP aware switches, and it is the direct cost
of the convenience.

**AVB took the opposite bet.** Rather than asking the network to behave, it makes the switches
promise bandwidth in advance. Better engineering, and it requires every switch in the path to
support it, which is why it kept the systems designed around it and lost the general market.
**Milan** is its professional audio profile, so devices from different manufacturers interoperate.

**Ravenna took the open route.** Built on published standards (RTP, PTPv2) rather than one
company's stack, which is why it feels less automatic than Dante and why it slots into a broadcast
plant more comfortably. Dante discovers; Ravenna is configured. AES67 later formalised almost
exactly what Ravenna was already doing, which is why the two get along so easily.

**AES67 is not a competitor.** It is the peace treaty: a narrow set of rules (RTP, PTPv2, 48 kHz,
1 ms packets) that lets Dante, Ravenna, Q-LAN and Livewire exchange audio. You use it at a boundary,
because switching a device into AES67 mode usually means giving up whatever its own ecosystem
provides. **ST 2110-30**, the audio part of the broadcast video standard, is AES67.

---

## Block 2: Lighting, from one wire per dimmer to the network

<!--anim:lighting-lineage-->

**DMX512 is nearly forty years old and is still the last metre of almost every rig.** It survives
because it is dumb: no addressing, no negotiation, no state, no return path. A fixture reads the
slots at its address and obeys. Everything after it is a way of **carrying** DMX, not of replacing
it, which is why the universe is still the unit even on a network that has no idea what a universe
is.

Then it ran out of room twice.

**First, the number of universes.** Art-Net (1998) put universes in UDP packets years before there
was a standard, it was free to implement, and it is still the default on a great deal of kit. Two
weaknesses matter on a large rig: it broadcast by default, which floods a network, and it has **no
priority field**, so two senders on one universe is settled by whichever packet arrived last.

**Then, the way they were carried.** sACN (E1.31, 2009) is the ANSI standard: multicast by default,
so a switch with IGMP snooping delivers each universe only to the ports that asked; a **priority**
field from 0 to 200, so a backup console is a configuration rather than a gamble; and
synchronisation packets so universes change together. Both of its advantages depend on the network
being set up properly, which is exactly why Class 3 exists.

**The legacy trap worth repeating.** Art-Net traditionally used `2.x.x.x`, which is real public
address space belonging to somebody else. Isolated, it works and nobody notices. Connected to a
venue's internet, traffic for real hosts disappears into your rig. Use `10.x.x.x` for new work.

---

## Block 3: Video connectors, one number getting bigger

The whole connector story is a single number growing, because somebody kept wanting more pixels,
more frames or more bits than the previous cable could carry.

<!--anim:video-link-->

| | Year | Analogue or digital | Carries audio | The point of it |
|---|------|--------------------|---------------|-----------------|
| VGA | 1987 | analogue RGBHV | no | universal, and it degrades with every metre |
| DVI | 1999 | digital TMDS | no | the first mass digital link. Dual link doubles it. |
| HDMI | 2002 | digital TMDS, then FRL | **yes** | one cable for picture and sound, plus content protection |
| DisplayPort | 2006 | digital, **packetised** | yes | computer oriented, and one port can drive several displays |
| SDI | 1989 | digital, on BNC | embedded | long runs, locking connectors, no negotiation at all |

**Three things worth carrying away.**

**Digital did not make it better, it made it different.** VGA degrades gradually: a long run gets
soft and you can still work. Digital links are fine until they are not, and then there is no
picture at all. That cliff is why an HDMI run that "works on the bench" is not a result.

**DisplayPort sends packets, HDMI sends a stream.** That is why DisplayPort can carry several
independent displays down one cable and one port on a card can drive a wall, and it is why the
GPU comparison in Class 2 is really a DisplayPort conversation.

**SDI persists because it refuses to negotiate.** No handshake, no EDID, no HDCP, no content
protection to fail at the worst moment. It is a locking BNC that either carries a picture or does
not, over long runs, and that predictability is why broadcast never left.

> The connector table changes every few years. The arithmetic does not: pixels × lines × frames ×
> bits, then compare it to what the cable carries. Learn the arithmetic.

---

## Block 3b: Video on a network, and why there are three answers

This one is **not a progression**, and treating it as one is the mistake. NDI did not replace
ST 2022-6 and ST 2110 did not replace NDI. They are three different trades between bandwidth,
latency, and how much network you had to build first.

<!--anim:video-ip-lineage-->

| | Bandwidth, HD | Latency | Network it needs | Right for |
|---|--------------|---------|------------------|-----------|
| **ST 2022-6** | about 3 Gbit/s | none | 10 Gbit, engineered | moving an existing SDI plant onto IP |
| **NDI** | 100 to 250 Mbit/s | a frame or more | the one you already have | monitoring, IMAG, streaming, comfort feeds |
| **NDI HX** | 8 to 20 Mbit/s | more again | almost anything | remote contribution, cameras over Wi-Fi |
| **JPEG XS / 2110-22** | 250 to 600 Mbit/s | a few **lines** | 1 to 10 Gbit | live paths that cannot afford a frame |
| **ST 2110** | about 2.5 Gbit/s | sub frame | 10 Gbit plus PTP | broadcast plant, permanent installation |

**Read the latency column, not the bandwidth column.** Bandwidth is a purchasing decision and
latency is an artistic one. A frame at 25 fps is 40 ms, which is where lip sync starts to show, so
a feed that goes to a screen beside a live performer is a different problem from a feed that goes
to a director's monitor.

**NDI won the middle of the market by asking for nothing.** Plug it into the network you already
have and devices find each other. That is genuinely valuable, and it is also why it turns up on
show critical paths where nobody designed the network, which is the one place it does not belong.
Know which of those two situations you are in.

**ST 2110's separated essences is the idea to steal.** Video, audio and ancillary data travel as
separate multicast flows, so a device subscribes to what it needs: a timecode reader takes
40 kbit/s instead of 2.5 Gbit/s. The cost is that the parts can now arrive separately, so PTP stops
being infrastructure and becomes the thing the picture is made of. And note where the two families
finally meet: **ST 2110-30, the audio part, is AES67.** The audio lineage and the video lineage end
in the same place.

## Block 4: Parallel and serial, and why serial won everything

Sending eight bits at once down eight wires is obviously faster than sending them one after another.
It was obviously faster for about twenty years, and then it stopped.

<!--anim:serial-parallel-->

**Skew is the reason.** Every conductor is a slightly different length with slightly different
characteristics, so its bit arrives slightly early or late. That difference is fixed by the cable.
As speed rises the **bit period shrinks and the skew does not**, so eventually the eight bits no
longer fit inside one sampling window and the byte cannot be reassembled. Making the cable faster
makes the problem worse.

A single line has nothing to agree with, so it can be driven far faster than any of the eight
individually, and eight times a very high rate beats eight lines at a low one.

| Parallel | Became | Year |
|----------|--------|------|
| IDE / PATA ribbon | SATA | 2003 |
| SCSI | SAS | 2004 |
| PCI | PCI Express | 2004 |
| Parallel printer port | USB | 1996 |
| Analogue RGBHV (VGA) | TMDS (DVI, HDMI) | 1999 |

Every one of those is the same story. **This is also why DMX is serial**, at 250,000 bits per
second down one pair, and why AES3, SDI, HDMI and Ethernet all are. There is no fast parallel
interface left on any machine you will use.

---

## Block 5: Storage, and how the same space kept holding more

<!--anim:storage-lineage-->

**The optical line is one rule applied three times.** Capacity is set by how small a mark you can
reliably read, and that is set by your wavelength. 780 nm infrared for CD, 650 nm red for DVD,
405 nm blue violet for Blu-ray, and the pits shrink each time. Layers, read by refocusing deeper
into the same disc, multiply it again. The physical object never changed.

Blu-ray ended the line, and not because the physics stopped: **networks got faster than discs**.
The format did not fail, the problem it solved stopped being a problem, which is the most common
way a technology in this industry dies.

**Flash changed the question.** Density stopped coming from making the mark smaller and started
coming from **stacking cells upward** (3D NAND, now over two hundred layers) and from storing
several bits in one cell, which costs endurance. And once nothing had to move, the interface became
the bottleneck: SATA was designed around a device that seeks, so **NVMe** exists because flash does
not.

### Why this matters on a show

<!--anim:disk-access-->

The number that ends the argument is not throughput, it is what happens to throughput when the
work gets awkward.

| | One file, in order | Scattered blocks |
|---|-------------------|------------------|
| Spinning disk | about 180 MB/s | about 1 MB/s |
| Flash / NVMe | 3,500 MB/s and up | still hundreds of MB/s |

A hard disk reading one file in order is perfectly respectable, and that is the figure on the box.
A media server playing six layers is not reading one file in order. **Judge a show drive by what it
does under the awkward case**, because the awkward case is the job.

---

## Block 6: What is coming, and what to believe about it

Two honest categories, and the difference between them matters more than either.

### Already here: dedicated compute for pattern work

Machine learning hardware, sold as an **NPU** or a tensor unit, is a processor built for one shape
of arithmetic: many small multiplications in parallel. In production tools it is already doing
unglamorous, useful jobs:

- **Upscaling and frame interpolation**, so an HD plate can fill a 4K wall better than a plain
  scaler manages
- **Denoise and cleanup** on camera feeds, especially at high gain
- **Keying and rotoscoping** without a green screen, which changes what is possible on a fast turnaround
- **Deciding where the bits go** inside an encoder, which is the codec quantisation argument from
  Class 2 with a better guess about what the eye will notice
- **Speech to text** for live captioning and surtitles

The pattern is worth naming: **it is very good at judgement calls that used to need a person and a
lot of time, and it is not deterministic.** A show wants deterministic. So the sound place for it
today is in preparation and in things that degrade gracefully, and not yet in the signal path where
a wrong guess is a visible failure in front of an audience.

### Not here yet, and be careful who is selling it

Quantum computing is real research and it is not a faster computer. It is a different machine that
is dramatically better at a small number of specific problems, and no better at anything you do.
The related idea, quantum key distribution, is about **detecting whether somebody has listened to a
link**, not about sending data faster.

Nothing about it moves a video frame across a venue more quickly, and nothing in this module gets
easier because of it. Treat a claim otherwise as marketing.

> The test to apply to any new technology in this industry is the same one as everywhere else in
> this module: **what problem did it solve, and what did it charge you for solving it?** If a
> product cannot answer the second half, nobody has finished thinking about it yet.
