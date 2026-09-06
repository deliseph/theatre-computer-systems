# Session 3: The Machine
**Content.**

*What is a show computer, and why is it configured differently from every other computer they
have ever used?*

This is the session where "a computer" stops being a black box and becomes a set of components
with rates, limits and trade offs you will be choosing between for the rest of your
career.

---

## Before this class

This class has a lab, and
a student whose machine is not ready spends it watching someone else.

### What you must already be able to do

| Skill | Where to get it |
|-------|----------------|
| Convert bits to bytes, and know which is which | [Foundations](/foundations) |
| Powers of two up to 2^16, and why 256 and 512 keep appearing | [Foundations](/foundations) |
| Multiply out a data rate without a calculator | [Foundations](/foundations) |

If the [Foundations](/foundations) page is new to you, do it first. It is forty minutes and it is
assumed by everything below.

### Do these three things

1. **Install the software**, from the list sent to you. A disk benchmark and an audio latency
   tester at minimum. This is the blocking one.
2. **Find your own machine's numbers** before you arrive: how much RAM, what storage, what
   graphics. Five minutes in system information. You will measure the rest in the lab.
3. **Look at one media file you already own** and try to find out what codec is inside it, not
   just its file extension. You will probably fail, and that failure is the point of Block D.
   If you want to arrive ahead: open the same file in a hex viewer and write down the first eight
   bytes. We will read them together.

### Bring

- Your laptop, charged, with the software installed.
- Headphones, for the buffer demonstration.
- The reference card, Block 1 learned.

<!--ready:2-->

---

## Learning outcomes

By the end of this session a student can:

1. Name the components of a computer that constrain real time media work, and say what each one
   limits.
2. Explain why a general purpose operating system cannot guarantee a deadline, and what we do
   about it.
3. Calculate the raw data rate of an audio stream, a video stream and a lighting universe.
4. Explain the relationship between audio buffer size, latency and dropouts, with numbers.
5. Explain how an image becomes numbers, and name the colour models and the reason video separates
   brightness from colour.
6. Distinguish a container from a codec, and uncompressed from lossless from lossy, and choose an
   appropriate playback format for a given job.
7. Read a file as bytes: explain what hex is, identify a format from its magic number, and say what
   a PCM audio sample actually is as a number.
8. Explain the luma and chroma weights, and why video compression is built on them.
9. Describe the steps a lossy codec runs, name the two that lose information and the one that is
   the quality setting, and explain why confetti destroys a bitrate that a locked-off shot does not.
10. Explain additive mixing, state the difference between hitting a colour and rendering one, and
    say what gamma, gamut and colour temperature each control.
11. Explain why a fixture and a display store colour identically, and why two sources at the same
    colour temperature can still fail to match.
12. Write a defensible specification for a show computer against a production brief.

---

## Block plan

| Block | Title |
|-------|-------|
| — | Numbers quiz |
| A | What a show computer actually is |
| — | Break |
| B | The operating system as a traffic cop |
| — | Break |
| C | How sound, light and pictures become numbers |
| D | What a file actually is, and how a codec works |
| — | Break |
| E | Lab: measure your machine, then spec a show machine |
| — | Wrap and homework |

*If the class is split across two shorter meetings, split after Block B.*

---

## Block A: What a show computer actually is

Open with a comparison, on screen: an office laptop specification next to a media server
specification. Same price bracket is not required, the point is which numbers are large.

Then walk the components. For each, the discipline is the same: **what it is, what it limits,
what happens on a show when it runs out.**

### What a computer actually is, before we name the parts

Strip away the case and there are only two ideas.

**One: everything is a number in a memory, and the processor changes numbers.** Fetch an
instruction, work out what it means, do it, repeat. Billions of times a second, and it can only
work on what is already in memory.

**Two: nothing runs from the disk.** A program on a drive is inert. Something has to copy it into
RAM before the processor can touch it, and the same is true of every frame of video and every
second of audio. That single fact explains most of what follows: why RAM size decides how much
media can be held ready, why a slow drive causes a stutter on first play and not on the second, and
why "it is on the server" is not the same as "it is ready".

<!--anim:machine-map-->

The parts, and the one thing each is responsible for:

| Part | What it is responsible for | How it shows up when it is the limit |
|------|---------------------------|--------------------------------------|
| **CPU** | doing the work, one instruction at a time, very fast | audio crackles, video drops frames under load |
| **RAM** | holding what is being worked on right now | machine crawls, disk light on constantly |
| **Storage** | remembering things when the power is off | stutter on the first play, fine on the second |
| **GPU** | the same operation applied to a great many pixels | layer count collapses, an output will not come up |
| **Motherboard and bus** | the roads between all of the above | a fast drive in the wrong slot is not a fast drive |
| **Firmware (BIOS / UEFI)** | starting all of it, before any disk is involved | machine does nothing, or does not see the drive |
| **Power supply** | turning mains into the voltages everything needs | random restarts, and the blame lands elsewhere |

**On the bus, briefly.** Nearly everything talks over **PCI Express**, and it comes in lanes: a
slot might be x1, x4, x8 or x16, and that number is how many lanes it actually gets. A drive rated
at 7 GB/s in a slot with one lane is not a 7 GB/s drive, and the machine will not tell you. This is
the same argument as an oversubscribed switch uplink in Class 3, inside the box.

### CPU

- Cores and clock speed. More cores helps parallel work (video encoding, many plugins). Higher
  clock helps serial work (a single heavy audio chain, a single decode thread).
- **What it limits:** how much processing can happen between one deadline and the next.
- **On a show:** audio dropouts, dropped video frames, a console that stops responding to the
  GO button. Note that CPU shortage looks like a hundred different symptoms.
- Teaching point: audio work is often more sensitive to single core speed than to core count,
  because a plugin chain on one channel is a serial dependency. Video is the opposite.

### RAM

- Capacity and speed. Media servers hold large amounts of decoded frames and pre roll in memory.
- **What it limits:** how much can be held ready rather than fetched.
- **On a show:** a video cue that stutters on its first play and is fine on the second (it is now
  cached), which is one of the most confusing symptoms a year one will meet.

### Storage

This is where the most useful teaching is, because it is where the numbers bite.

| Type | Rough sustained read | Where it belongs |
|------|---------------------|------------------|
| Spinning hard disk | 100 to 200 MB/s | Archive, backup, never playback |
| SATA SSD | about 550 MB/s | Light playback, general use |
| NVMe SSD | 2,000 to 7,000 MB/s | Video playback, multi layer media servers |

- Distinguish **burst** from **sustained**. Marketing quotes burst. A show needs sustained.
- Distinguish capacity from throughput. A 20 TB drive that reads at 150 MB/s cannot play back
  four layers of high bitrate video no matter how much it holds.
- Worked example, do it live: a single layer of a mezzanine codec at 700 Mbit/s is 87.5 MB/s.
  Four layers is 350 MB/s. That is over a SATA SSD's comfortable working range once the operating
  system is also using the disk, and it is nothing at all to an NVMe drive. The specification
  writes itself once you do the arithmetic.

*How storage got from a floppy disk to NVMe, and why a spinning disk collapses on scattered reads,*
*is on [How we got here](/lineage).*

### GPU

<!--anim:gpu-heads-->

- Three separate jobs, and they are easy to run together in your head: **render** (making pixels), **decode**
  (turning a compressed file into frames), **output** (getting frames to physical connectors).
- **What it limits:** layer counts, effects, output count and resolution.
- **On a show:** dropped frames, tearing, an output that will not come up at the right resolution.
- Note that output count is a hard physical limit. A card with four outputs drives four displays,
  and no amount of software solves that. This is why media servers look the way they do.

**The card you choose is a specification decision, not a preference.** Year one needs four facts.

| | NVIDIA | AMD |
|---|--------|-----|
| Displays per card | typically **4** on GeForce and most professional cards | up to **6** on cards built for it, via Eyefinity |
| Combining outputs into one desktop | Mosaic, on the professional cards only | Eyefinity, including on consumer cards |
| Compute for plugins and effects | **CUDA**, plus OpenCL | OpenCL, ROCm and HIP. No CUDA. |
| Hardware encode and decode | NVENC and NVDEC | VCN, through AMF |
| Framelock and genlock across cards | an add-in sync card on the professional line | far less common |

**1. Count the outputs first.** Four heads is the usual ceiling on one card, and six is the reason
AMD still turns up on wall jobs. More outputs than that means more cards, or an output that feeds a
processor which then fans out to panels, which is what most large walls actually do.

**2. CUDA is the reason NVIDIA is the industry default**, not raw speed. A great deal of media
server and post production code is written against CUDA, so on AMD it either falls back to a slower
path or does not run. **Check what your software actually accelerates before buying the faster
card**, because "faster" and "supported" are different questions.

**3. Hardware decode is separate from render.** A card with a dedicated decoder plays many
compressed layers without touching the shaders. It is also why a codec the decoder does not support
falls back to the CPU and the layer count collapses. This is the Class 2 codec conversation arriving
as a purchasing decision.

**4. If frames must change at the same instant across several outputs, you need genlock**, and that
means a sync card and the professional line. Without it, outputs tear against each other on a wall
and nobody can work out why the seam moves.

*The deeper version of this belongs in the show networking and control elective. At year one, the
four facts above are what stops a bad specification.*

### I/O and the bus

- PCIe lanes, Thunderbolt, USB. Everything plugged in shares a finite path to the CPU.
- **On a show:** the classic. A USB to DMX widget on the same controller as a USB drive and a
  USB audio interface, and the lighting output stutters when someone copies a file.
- Rule of thumb: for anything show critical, prefer a dedicated network node
  over a USB dongle. USB was designed for convenience, not for a deadline.

### The synthesis

The line worth keeping in front of you:

> A show computer is not a fast computer. It is a **predictable** computer. We trade peak
> performance for the guarantee that the next frame arrives on time, every time, for three hours.

---

### Extension: Booting: what happens between the button and the desktop

Worth knowing in order, because the order tells you where a machine stopped.

<!--anim:boot-sequence-->

Two things fall out of that sequence and both are practical.

**The firmware runs before any disk.** So a machine that beeps or flashes and shows nothing has
failed before it ever looked for an operating system, and no amount of reinstalling helps. "No boot
device" is the opposite: the firmware worked and found nothing to start.

**Interfaces get claimed during startup.** Audio and video devices are taken over by drivers as the
system comes up, which is why a device plugged in at the wrong moment is sometimes invisible until
a restart, and why a show machine is powered on in an order that somebody wrote down.

### Extension: The other kind of computer

Not everything on a show is a computer in the sense above. A great deal of it is a
**microcontroller**: one chip, one program, no operating system, running from the instant it has
power.

<!--anim:micro-vs-computer-->

The trade is exact and it is the trade this whole module keeps returning to. A microcontroller runs
one program, so nothing can decide your code is less important than an update, and its timing is
predictable to the microsecond. It also cannot do anything else. A general purpose computer shares
one processor between hundreds of programs, which is what makes it flexible and what makes its
timing a matter of probability rather than promise.

That is why a rig contains both. The console is a computer. The relay box that fires the pyro on a
contact closure is a microcontroller, deliberately, and it would be a worse product if it were not.

## Block B: The operating system as a traffic cop

### Extension: Operating systems, and why show machines are picky

The operating system is in charge, not you. It decides which program runs next, who owns which
device, and what happens when two things want the same thing. Three you will meet:

| | **Windows** | **macOS** | **Linux** |
|---|---|---|---|
| Where it dominates | media servers, lighting consoles, most show software | audio production, QLab, video editing | consoles, embedded devices, media servers, infrastructure |
| Audio driver model | ASIO for low latency, WDM otherwise | Core Audio, low latency built in | ALSA and JACK, or PipeWire |
| Strength for a show | the widest hardware and software support in the industry | audio latency and stability, with no driver hunting | it can be stripped to exactly what is needed and nothing else |
| Weakness for a show | updates that arrive when they feel like it | narrow hardware choice, and it costs | more configuration, and less commercial show software |

**Why show machines are configured differently.** A general purpose OS is tuned to feel responsive
while doing many things. A show machine has one job and a deadline, so the tuning is the opposite:
turn off the updates, the indexing, the sleep, the power saving, the network discovery and the
antivirus scan, because every one of those is a background task that will decide, at some point, to
run during a cue.

That is not superstition. It is the same argument as the audio buffer, one level up: **you are
buying predictability by giving up flexibility**, and the machine will not make that trade unless
you tell it to.

### Why a general purpose OS cannot promise you anything

- The kernel decides which program runs on which core, and when. That decision is made for
  fairness and throughput, not for your deadline.
- Anything can interrupt: a driver, a background service, an indexing job, a network stack.
- Introduce the term **real time operating system** and then immediately say: your show machine
  is almost certainly not running one. Windows and macOS are not real time systems. We get away
  with it by removing competition, not by adding guarantees.

That is the honest framing, and it justifies everything in the hygiene list below.

### Audio buffers, with the actual maths

The clearest demonstration of a deadline in the whole module, and it is worth hearing rather than reading. With an audio
interface and a synth or a DAW.

The sound card asks for a block of samples. The computer must fill that block before the card
needs it. Miss it and you get a click.

```
Buffer size 128 samples at 48,000 Hz
128 ÷ 48,000 = 0.00267 seconds = 2.67 ms per buffer
```

| Buffer | Time per buffer at 48 kHz | Feels like | Risk |
|--------|--------------------------|------------|------|
| 64 | 1.33 ms | Immediate | High. Any hiccup clicks. |
| 128 | 2.67 ms | Tight, usable for live monitoring | Moderate |
| 256 | 5.33 ms | Fine for most live work | Low |
| 512 | 10.67 ms | Noticeable on percussive monitoring | Very low |
| 1024 | 21.33 ms | Wrong for a performer, fine for playback | Negligible |

<!--anim:buffer-underrun-->

Round trip latency is roughly double the buffer plus converter time, so a 128 sample buffer is
commonly 6 to 8 ms in and out.

**Try it.** Set the buffer to 1024 and play something percussive. Drop to 64 and play it again.
Then load the machine (twenty browser tabs, a file copy running) until it clicks.

Once you have heard the click, the rule states itself: **the buffer is the trade between latency
and safety, and there is no setting that wins both.**

### Why sixty tracks play at once and never drift apart

This is the question every audio student asks eventually, and the answer explains the whole
architecture.

**They are not sixty streams.** The DAW is not running sixty things in parallel and hoping they
stay together. When the driver asks for the next block, the DAW reads the **same sample range from
every track**, applies each track's processing, sums them into **one** buffer, and hands that
single buffer to the card. Sixty tracks and one track are the same job as far as the driver is
concerned. The output was never sixty of anything.

<!--anim:daw-mixdown-->

**And sync is not maintained, it is structural.** Every track is a list of samples, and the
playhead is a single number: sample 480,000 is ten seconds in, on every track, always. There is no
per-track clock, so there is nothing to drift. Position is **arithmetic on one counter**, not a
measurement of a signal.

That is worth sitting with, because it is the exact opposite of everything in Class 5. Two separate
machines have two crystals and therefore drift, which is why PTP exists. One machine has one sample
counter and therefore cannot. **Drift is a symptom of having more than one clock.**

Three things follow, and all three turn up in practice:

- **It fails as a dropout, not as drift.** Run out of time and the card plays whatever was in the
  buffer, which is a click. Nothing goes out of sync, because sync was never the fragile part.
- **The disk never touches the audio thread.** A separate thread reads ahead into memory, so a slow
  drive causes dropouts rather than lateness. That is the Class 2 storage argument arriving with a
  mechanism.
- **Parallel work is per track, serial work is not.** Twelve tracks can be processed on several
  cores inside one buffer period. One track with twenty plugins in series cannot, because each one
  needs the previous one's output. This is why clock speed still matters on a machine with plenty
  of cores.

### Extension: The complication: some plugins have to look ahead

A lookahead limiter cannot limit a peak it has not seen yet, so it holds the audio back a couple of
thousand samples in order to see it coming. A linear phase EQ does the same. Those tracks now come
out **late**, and the others do not.

<!--anim:pdc-align-->

The DAW's answer is **plugin delay compensation**: add up the delay of every path, find the longest,
and delay everything else to match it. The transients line up again, exactly, and the price is on
the label: the whole mix is now as late as the slowest path. **A session gets less responsive as it
gets heavier, and that is the arithmetic working, not the CPU struggling.**

Then the case it cannot fix. **A track being recorded is arriving from the outside world right
now**, and you cannot delay a live signal into the past. So it stays uncompensated, the performer
hears themselves offset against the mix, and the fix is to monitor around it rather than to argue
with the maths. This is the single most common "why does overdubbing feel wrong" question, and it
has a real answer.

### Drivers

Quickly, because the menus will use these words:
- **ASIO** on Windows, the professional low latency path.
- **Core Audio** on macOS, built in and low latency by default.
- **WASAPI** and **MME** on Windows, the consumer paths. MME is high latency and is the reason a
  student's first attempt sounds late.

### Show machine hygiene

A checklist. It is directly employable, and you will use it within a year.

- [ ] Automatic updates off, and a stated policy for when updates do happen.
- [ ] Sleep, hibernate and display power saving off. Power plan set to maximum performance.
- [ ] Wi-Fi and Bluetooth off on a show machine unless there is a reason.
- [ ] Notifications, indexing, cloud sync and auto backup off.
- [ ] Antivirus scoped or removed. Scheduled scans are a known cause of dropouts.
- [ ] No web browser, no email, no personal use. A show machine is not a computer, it is
      an instrument.
- [ ] Named, labelled, with a fixed IP, and documented.
- [ ] A tested restore image, and the show files backed up somewhere that is not this machine.

Ask: which of these did you see obeyed or broken at the venue last week? Good link back.

---

## Block C: How sound, light and pictures become numbers

The conceptual heart of the module. Everything is sampling and quantising, in every domain.

### Audio

- **Sampling rate.** How often we measure. 48 kHz is the professional default for anything that
  will meet video. 44.1 kHz is the CD legacy. 96 kHz exists and mostly costs you bandwidth.
- **Nyquist.** You can only represent frequencies below half the sample rate. 48 kHz gives you up
  to 24 kHz, which is above human hearing, which is why 48 kHz is enough.
- **Bit depth.** How precisely we measure. Each bit is about 6.02 dB of dynamic range, so 16 bit
  is about 96 dB and 24 bit is about 144 dB. We use 24 bit for headroom in production, not
  because anyone can hear 144 dB of range.
- **The consequence:** the numbers from session 1. 48 kHz × 24 bit = 1.152 Mbit/s per channel.

<!--anim:sampling-->

**Where the 6.02 dB comes from, and why it matters.** Rounding each measurement to the nearest
available level leaves an error. That error is a signal in its own right, and it is audible: it is
the noise floor. Each extra bit halves the size of the step and therefore buys about 6 dB more
range, which is the whole of the arithmetic.

The part worth understanding is the *character* of the error rather than its size. At low bit
depths the error follows the shape of the signal, so it is not hiss, it is **distortion**
correlated with the music, and your ear finds that immediately. Adding a small amount of noise
before rounding, called **dither**, breaks the correlation: the error gets very slightly larger
and sounds much better, because patterned distortion has become plain hiss. This is why a
mastering engineer dithers on the way down to 16 bit instead of simply truncating.

<!--anim:quantise-noise-->

### Video

- **Raster.** Width times height in pixels.
- **Frame rate.** How many complete pictures per second. Note that 24, 25, 30, 50 and 60 all
  exist in the wild and that mismatches between them cause judder that is visible on a slow pan.
- **Bit depth per component.** 8 bit gives 256 steps per colour, 10 bit gives 1024. Banding on a
  slow gradient across a large LED wall is the practical reason 10 bit matters.
- **Chroma subsampling.** 4:4:4 keeps full colour, 4:2:2 halves horizontal colour resolution,
  4:2:0 halves it both ways. Our eyes are much more sensitive to brightness than to colour, so
  this is cheap compression that mostly works, until you put fine coloured text on screen, when
  it very visibly does not.
- **The consequence:** 1080p60, 10 bit, 4:2:2 is about 2.5 Gbit/s uncompressed. Repeat the
  calculation from Class 1 and do 4K UHD yourself. Answer: about 10 Gbit/s.

### Lighting

- One DMX slot is one byte, 0 to 255. That is 256 steps of level.
- 8 bit dimming is visibly stepped on a slow fade to black at low levels. This is why 16 bit
  channels exist: a coarse byte and a fine byte together give 65,536 steps.
- **Demo if you have a 16 bit capable fixture:** run a 30 second fade from 5 percent to 0 in
  8 bit, then in 16 bit. The steps in the 8 bit version are obvious once you know to look, and
  once they see it they cannot unsee it. This is the "if an ordinary person can feel it" test
  passing in front of them.
- Pixel maths, which comes back in Class 4: an RGB pixel is 3 channels, so a universe of
  512 channels holds 170 RGB pixels.

### Images, and why this is the same idea twice

Audio is sampled in time. An image is exactly the same two ideas sampled in **space**, and saying
that out loud is worth more than either explanation on its own.

| | Audio | Image |
|---|-------|-------|
| Sampling | how often you measure, in Hz | how finely you measure across the frame, in pixels |
| The limit | Nyquist: nothing above half the sample rate | nothing finer than the pixel grid |
| Quantisation | bit depth, 16 or 24 bit | bit depth per colour channel, 8 or 10 bit |
| Too few samples | aliasing, a false low frequency | aliasing, moiré on fine stripes and LED panels |
| Too few levels | audible noise floor | visible banding on a gradient |

<!--anim:image-sampling-->

**Colour models**, because the menus will use these words:

- **RGB** stores red, green and blue per pixel. It is how a screen physically works and how a
  media server usually thinks. Three channels, all equally precious.
- **YCbCr** stores brightness (Y) separately from two colour difference channels. Video uses it
  because our eyes are far more sensitive to brightness than to colour, so the colour channels can
  be stored at lower resolution. **This is the whole basis of chroma subsampling**, which comes
  next, and it is why 4:2:2 is a video term and not an audio one.
- **Gamma** is the non-linear curve between the stored number and the light actually emitted. It
  exists because our eyes are non-linear too. It is the reason two systems can agree on the
  numbers and disagree about the picture, and it gets its own section below.

The arithmetic worth reaching for automatically:

```
one frame  =  width × height × channels × bit depth ÷ 8   bytes
data rate  =  that × frame rate
```

### Colour: what the three numbers actually mean

This belongs to all three specialisms at once. A pixel on an LED wall and a colour mixing fixture
store colour the same way, and both are lying to you in the same useful manner.

**Additive mixing.** Red plus green makes yellow. Nothing in the beam is yellow: two lights land in
the same place and the eye reports one colour. That single fact is what makes a video wall and an
LED fixture possible, and it is why lighting and video colour are the same subject.

<!--anim:additive-mixing-->

Three bytes, one colour. On a screen those bytes are a pixel. On a rig they are three DMX slots.
The arithmetic does not change when the job title does.

#### Gamma, and where the code values go

Your eye's response to light is roughly a cube root: doubling the photons does not double the
sensation. So if you spend your code values evenly across *light*, you waste most of them at the
bright end, where the eye cannot tell two neighbours apart, and starve the dark end, where it can.

**Gamma encoding spends the codes where the perception is.** Store the roughly cube rooted value,
and 8 bits is enough for a picture that looks smooth. Store light linearly in 8 bits and the
shadows band.

<!--anim:gamma-curve-->

This is the same argument as bit depth, one step further on: bit depth asks how many levels there
are, gamma asks where you put them. Two consequences follow.

- A file, a camera and a screen must agree on the curve. When they do not, the picture comes out
  washed out or with crushed blacks, and nothing is broken. **A gamma mismatch is a paperwork
  failure, not an equipment failure.**
- The same reasoning is why lighting consoles have dimmer curves. Same eye, same maths, different
  department, and it comes back in Class 4.

Two questions this raises are answered where they are actually decided: **which colours a fixture
can render** is in Class 4 with the rest of lighting, and **which colours a display can reproduce**
is in Class 5 with the pixel pipeline.

### The formats you will actually meet, by domain

| Domain | Container | Common codecs | Note |
|--------|-----------|---------------|------|
| Audio | `.wav`, `.aiff` | PCM (uncompressed) | The show playback default. No decode cost, no surprises. |
| Audio | `.flac` | FLAC (lossless) | Half the size, bit identical. Good for archive. |
| Audio | `.mp3`, `.m4a` | MP3, AAC (lossy) | What clients send. Convert before a show. |
| Image | `.png` | PNG (lossless) | Hard edges, text, logos, anything with transparency. |
| Image | `.jpg` | JPEG (lossy) | Photographs. Wrong for text and graphics. |
| Image | `.tif`, `.exr` | uncompressed or lossless | Masters, high dynamic range content. |
| Video | `.mov` | ProRes, HAP, DXV (intra frame) | **What you play back from.** |
| Video | `.mp4` | H.264, H.265 (inter frame, lossy) | **What you receive.** Transcode it. |

**The rule, worth repeating until it is automatic:** you receive lossy inter frame
media, you play back intra frame media, and the transcode is a required step in your workflow,
not an optional tidy-up.

### Intra frame against inter frame

The distinction that decides whether a cue jump is instant or stalls.

**Intra frame versus inter frame**, the distinction that matters for playback:

| | Intra frame | Inter frame |
|---|---|---|
| Examples | ProRes, DNxHD, HAP, DXV, Motion JPEG | H.264, H.265, VP9 |
| Each frame is | Complete on its own | Described as a difference from other frames |
| File size | Large | Small |
| Scrubbing and instant jump | Fast and cheap | Slow and expensive |
| Right for | Show playback | Delivery, streaming, review copies |

<!--anim:intra-inter-->

The practical rule: **you receive H.264, you play back HAP or ProRes.** The
transcode is not optional bureaucracy, it is what makes a cue jump instantly instead of stalling.

GPU accelerated codecs (HAP, DXV) decompress on the graphics card rather than the CPU, which is
why a media server can play many layers at once. Worth one sentence, not more, at year one.

---

## Block D: What a file actually is, and how a codec works

Block C turned the world into numbers. This block is about what happens to those numbers once
they have to be stored, and it answers the question every MDT student eventually asks: *what is
actually inside the file?*

### A file is a sequence of bytes. That is all it is.

Not a picture, not a sound. A long row of numbers, each one 0 to 255.

**Hex** is how humans read those numbers. One byte is exactly two hex digits, so a byte is
`00` to `FF`. That is the whole reason hex exists in this context: it lines up perfectly with
bytes in a way decimal does not.

| Byte value | Decimal | Hex | Binary |
|-----------|---------|-----|--------|
| smallest | 0 | `00` | `00000000` |
| | 15 | `0F` | `00001111` |
| | 128 | `80` | `10000000` |
| largest | 255 | `FF` | `11111111` |

### The extension is a hint. The header is the truth.

Every media format starts with a **magic number**: a few fixed bytes that say what the file
really is. Rename a JPEG to `.wav` and the extension lies, but the first bytes do not.

| First bytes (hex) | As text | Format |
|------------------|---------|--------|
| `52 49 46 46` … `57 41 56 45` | `RIFF` … `WAVE` | WAV audio |
| `46 4F 52 4D` … `41 49 46 46` | `FORM` … `AIFF` | AIFF audio |
| `89 50 4E 47 0D 0A 1A 0A` | `‰PNG` | PNG image |
| `FF D8 FF` | — | JPEG image |
| `… 66 74 79 70` | `ftyp` | MP4 / MOV container |
| `1A 45 DF A3` | — | Matroska / MKV |

This is exactly why "it is a `.mov`" tells you nothing useful. The container says how the parts
are packed. What is inside is a separate question, and the bytes are where the answer lives.

<!--anim:hex-file-->

**On a show this matters twice.** A file that will not play is often a file whose extension was
changed by hand rather than transcoded. And a media server that rejects a file usually rejects
the *codec inside*, not the container it arrived in.

### Audio, byte by byte: what PCM really is

Uncompressed audio is called **PCM**, pulse code modulation, and the name is grander than the
idea. Each sample is simply a whole number describing where the waveform was at that instant.

At 16 bit, that number is a **signed integer from −32,768 to +32,767.** Silence is 0. Full
positive peak is +32,767. Each sample takes two bytes.

```
waveform value   0.62 of full scale
  × 32,767   =   20,316
  in hex     =   4F 5C          ← the two bytes actually written to the file
```

So a stereo 48 kHz 24 bit recording is: three bytes per sample, two channels, 48,000 times a
second. Which is the data rate calculation from Class 1, arriving from the other direction.

<!--anim:pcm-bytes-->

**Two details you will meet in a manual and should not be frightened by:**

- **Endianness.** Whether the low byte or the high byte comes first. WAV puts the low byte first,
  AIFF puts the high byte first. It matters only when something reads a file wrongly, and the
  symptom is unmistakable: loud, harsh noise rather than the recording.
- **Signed against unsigned.** 8 bit WAV stores 0 to 255 with silence at 128; everything above
  8 bit is signed with silence at 0. Get it wrong and you get a large DC offset and a thump.

### Luma and chroma: why video splits brightness from colour

Class C introduced YCbCr. Here is the actual arithmetic, because the numbers explain the reason.

```
Y   =  0.299 R  +  0.587 G  +  0.114 B     brightness
Cb  =  the blue difference, B − Y, scaled
Cr  =  the red  difference, R − Y, scaled
```

**Look at the weights.** Green counts for nearly 60 percent of brightness, red about 30, blue
only 11. That is not a convention, it is a measurement of the human eye: our brightness
perception is dominated by green and barely touched by blue.

That single fact is what the whole of video compression is built on. Because we see brightness
detail far better than colour detail, you can throw away most of the colour resolution and almost
nobody notices. Split any picture into its three planes and it is obvious: **the Y plane looks
like the photograph. The Cb and Cr planes look like vague coloured fog.**

<!--anim:ycbcr-planes-->

That is why it is **4:2:2**, never "half the pixels". The brightness is untouched. Only the
colour is thinned.

### Extension: Lossless compression: making it smaller and getting it all back

Two ideas do most of the work, and neither loses anything.

**Run length encoding.** Repetition is stored as a count.

```
raw    AAAAAAAABBBCCCCCCCCCC        21 bytes
RLE    8A 3B 10C                     6 bytes
```

**Entropy coding.** Common symbols get short codes, rare symbols get long ones. The same idea as
Morse code giving `E` a single dot.

Both are perfectly reversible, so **the original bytes come back exactly.** This is what PNG and
FLAC do, and it is why they are safe for masters.

The catch, and it is the reason lossless is not the answer to everything: **compression needs
repetition to find.** A flat colour graphic or a title card shrinks enormously. A photograph of
foliage, or film grain, has almost no repetition and barely shrinks at all.

<!--anim:lossless-compress-->

### Lossy compression: the pipeline a codec actually runs

Every lossy image and video codec runs roughly the same six steps. Knowing the order tells you
what each quality setting is actually doing.

| Step | What happens | Lossy? |
|------|-------------|--------|
| 1. Colour transform | RGB becomes YCbCr, separating brightness from colour | No |
| 2. Chroma subsampling | Colour resolution halved, to 4:2:2 or 4:2:0 | **Yes** |
| 3. Split into blocks | The picture is cut into 8 × 8 blocks | No |
| 4. Transform | Each block becomes frequency coefficients, coarse to fine | No |
| 5. **Quantisation** | Coefficients divided by a table and rounded. Fine detail rounds to zero | **Yes, and this is the main one** |
| 6. Entropy coding | All those zeros are packed away losslessly | No |

**Step 5 is the quality slider.** It is not a vague "amount of compression": it is literally how
coarsely the numbers get rounded before they are stored. Round harder, more coefficients become
zero, the file gets smaller, and the fine detail is gone permanently.

Notice that the loss happens in only two of six steps, and the last step is lossless. That is why
a well-set codec looks perfect and a badly-set one shows blocks: the blocks were always there,
they only become visible when step 5 throws away the detail that was hiding them.

<!--anim:codec-pipeline-->

### Inter frame: the part that decides your bitrate

Everything above compresses one picture. Video adds the biggest saving of all: **most of a frame
looks like the frame before it.**

- An **I frame** is a complete picture, compressed on its own. Also called a keyframe.
- A **P frame** stores only what changed since the last frame.
- A **B frame** looks both backwards and forwards, and stores even less.
- The repeating pattern of them is the **GOP**, the group of pictures.

The mechanism is **motion vectors**. Rather than re-sending a block that has simply moved, the
encoder says *"this block is the one from over there, shifted eleven pixels right and two down"*,
and then stores only the small remaining difference.

<!--anim:motion-vectors-->

**This is the single most useful thing to understand about video on a show**, because it explains
bitrate behaviour that otherwise looks random:

| On screen | What the encoder faces | Result |
|-----------|----------------------|--------|
| A locked-off shot of a set | Almost nothing changes between frames | Tiny bitrate, looks perfect |
| A slow camera move | Everything moves, but predictably | Motion vectors cope well |
| Confetti, water, fire, snow | Every pixel changes unpredictably, and nothing can be predicted from the last frame | **Bitrate explodes, or the picture falls apart** |
| A hard cut | No previous frame to refer to | Forces a new I frame |

So when a content designer asks why their confetti cannon looks like mud on the LED wall at the
same bitrate that made the rest of the show look flawless, that is the answer, and it is not a
fault in the system.

**CBR against VBR.** Constant bitrate spends the same data every second whatever is on screen.
Variable bitrate spends less on the easy shots and more on the hard ones. VBR looks better for
the same average size; CBR is predictable, which matters when you are budgeting a fixed link.

### And this is why we transcode for playback

Now the rule from Block C has a mechanism behind it.

Inter frame compression is superb for delivery and hostile to a show, because reaching an
arbitrary frame means finding the last I frame and decoding forward through every P and B frame
between. Intra frame codecs such as ProRes, HAP and DXV throw that saving away deliberately:
every frame is complete, files are much larger, and any frame is instantly available.

> **You receive inter frame. You play back intra frame.** The transcode is not tidying up. It is
> what converts a file optimised for sending into a file optimised for cueing.

---

## Block E: Lab

Two parts. Part 1 is individual and diagnostic. Part 2 is the assessed exercise.

### Part 1: measure your own machine (20 minutes)

Each student, on their own laptop, records real numbers. The point is that these stop being
abstractions the moment you measure your own machine.

| Measurement | Tool | Record |
|-------------|------|--------|
| Sustained disk read and write | Any disk benchmark | MB/s |
| Audio round trip latency at 128 and at 512 samples | Audio interface control panel or a latency tester | ms at each |
| Lowest buffer size that runs clean under load | DAW plus a deliberate CPU load | samples |
| RAM installed and free | System monitor | GB |
| GPU model and video memory | System information | model, GB |

Then answer, in writing: **based on these numbers, what is this machine good for on a show, and
what would you not trust it with?** Two sentences. That question is the whole skill.

### Part 2: spec a show machine (30 minutes, assessed, 15 percent)

Teams of three. Each team draws one brief. Deliver a one page specification plus the arithmetic.

**Brief 1: a studio theatre play.** 120 seats. One projection surface, 1920 × 1080. Twelve video
cues, longest 4 minutes. Sound effects playback, 8 outputs, no live mixing on this machine. One
operator, running lighting and sound from the same position. Budget is tight and the machine may
also need to run the lighting visualiser during production week.

**Brief 2: a musical, 900 seats, three week run.** Two projection surfaces plus an upstage LED
panel wall, total pixel canvas approximately 5,600 × 1,080. Sixty video cues, timecode locked to
the band. Show critical: a failure stops the show. Backup expected.

**Brief 3: an arena concert, touring.** Four IMAG screens plus a 20 m LED wall at 3,840 × 2,160.
Live camera input. Content changes daily. Travels in a truck, gets rigged in four hours, and one
operator maintains it across eleven cities.

Required in the specification:
1. CPU, RAM, storage (type, capacity **and** required sustained throughput), GPU (including
   output count), network interfaces.
2. **The arithmetic.** Total pixel canvas, chosen codec, resulting data rate, and therefore the
   storage throughput requirement. Show the working. A specification without arithmetic scores zero.
3. Chosen playback codec, with a justification.
4. One paragraph: what happens when this machine fails, and what you have done about it.
5. One paragraph: what you deliberately did **not** buy, and why. This is the interesting one.

Marked against the four criteria rubric. Criterion 4, failure, is worth as much as criterion 1.

---

## Common misconceptions in this session

- **"More expensive is better."** Predictability beats peak performance. A machine that is fast
  on average and occasionally stalls is worse than a slower machine that never does.
- **"The file is 4K so it will look better."** Not if the codec is inter frame and the disk
  cannot sustain the read, and not if the surface is 1080p anyway.
- **"Lower buffer is better."** Lower buffer is lower latency and higher risk. It is a choice
  with a cost, made per job.
- **"The GPU makes it faster."** The GPU does specific jobs. It does nothing for a disk that
  cannot keep up.
- **"MOV is a format."** MOV is a container. Ask what is inside it.

---

## Sources and further study

**If this class interested you:** Ben Eater's 8 bit computer series builds one from individual wires, and the Nand2Tetris book does it from logic gates upward. Both are on [Where to go next](/next).

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

- **[NDI documentation](https://docs.ndi.video/all)**, and specifically its
  [bandwidth white paper](https://docs.ndi.video/all/getting-started/white-paper/bandwidth).
  Real published figures for what a compressed HD stream actually costs. Compare them against the
  uncompressed arithmetic you did in this class, and notice how large the gap is.
- **Your own machine.** The most useful reading in this class is the measurement you took in the
  lab. Keep those numbers. When you are asked to spec a machine in two years, you will want a
  reference point you personally trust.
- **Manufacturer system requirement pages** for the media server you are most likely to meet.
  Read one properly. They are written by people who have had this argument many times, and the
  numbers they give are the ones that survive contact with a show.

**On file formats.** The best way to internalise container against codec is to open a file and
look. `ffprobe` (part of FFmpeg, free) prints exactly what is inside any media file: container,
codec, resolution, frame rate, bit depth, chroma subsampling and bitrate. Run it on three files
from three sources and the distinction stops being theoretical.

---

## Homework before Class 3

1. Finish the machine specification if the team did not complete it in the lab.
2. Learn the storage and buffer numbers in `numbers-to-know.md`.
3. Find the IP address, subnet mask and gateway of your own laptop and write them down. Do not
   change anything. Bring the numbers to Class 3.
