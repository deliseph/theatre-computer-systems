# Session 3: The Machine
**Content.**

*What is a show computer, and why is it configured differently from every other computer they
have ever used?*

This is the session where "a computer" stops being a black box and becomes a set of components
with rates, limits and trade offs that they will have to choose between for the rest of their
careers.

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
   just its file extension. You will probably fail, and that failure is the point of Block C.

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
7. Write a defensible specification for a show computer against a production brief.

---

## Block plan

| Block | Title |
|-------|-------|
| — | Numbers quiz |
| A | What a show computer actually is |
| — | Break |
| B | The operating system as a traffic cop |
| — | Break |
| C | How sound, light and pictures become numbers, and the files that carry them |
| — | Break |
| D | Lab: measure your machine, then spec a show machine |
| — | Wrap and homework |

*If the class is split across two shorter meetings, split after Block B.*

---

## Block A: What a show computer actually is

Open with a comparison, on screen: an office laptop specification next to a media server
specification. Same price bracket is not required, the point is which numbers are large.

Then walk the components. For each, the discipline is the same: **what it is, what it limits,
what happens on a show when it runs out.**

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

### GPU

- Three separate jobs, and students conflate them: **render** (making pixels), **decode**
  (turning a compressed file into frames), **output** (getting frames to physical connectors).
- **What it limits:** layer counts, effects, output count and resolution.
- **On a show:** dropped frames, tearing, an output that will not come up at the right resolution.
- Note that output count is a hard physical limit. A card with four outputs drives four displays,
  and no amount of software solves that. This is why media servers look the way they do.

### I/O and the bus

- PCIe lanes, Thunderbolt, USB. Everything plugged in shares a finite path to the CPU.
- **On a show:** the classic. A USB to DMX widget on the same controller as a USB drive and a
  USB audio interface, and the lighting output stutters when someone copies a file.
- Rule of thumb worth giving them: for anything show critical, prefer a dedicated network node
  over a USB dongle. USB was designed for convenience, not for a deadline.

### The synthesis

Put this on the board and leave it up:

> A show computer is not a fast computer. It is a **predictable** computer. We trade peak
> performance for the guarantee that the next frame arrives on time, every time, for three hours.

---

## Block B: The operating system as a traffic cop

### Why a general purpose OS cannot promise you anything

- The kernel decides which program runs on which core, and when. That decision is made for
  fairness and throughput, not for your deadline.
- Anything can interrupt: a driver, a background service, an indexing job, a network stack.
- Introduce the term **real time operating system** and then immediately say: your show machine
  is almost certainly not running one. Windows and macOS are not real time systems. We get away
  with it by removing competition, not by adding guarantees.

That is the honest framing, and it justifies everything in the hygiene list below.

### Audio buffers, with the actual maths

The clearest demonstration of a deadline in the whole module. Do this live with an audio
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

**Demo:** set the buffer to 1024, play something percussive live, let them hear it. Drop to 64,
let them hear the difference, then load the CPU (open twenty browser tabs, start a file copy)
until it clicks. They will remember the click.

Then say the sentence: **the buffer is the trade between latency and safety, and there is no
setting that wins both.**

### Drivers

Fast, but name them, because the menus will say these words:
- **ASIO** on Windows, the professional low latency path.
- **Core Audio** on macOS, built in and low latency by default.
- **WASAPI** and **MME** on Windows, the consumer paths. MME is high latency and is the reason a
  student's first attempt sounds late.

### Show machine hygiene

Give this as a checklist. It is directly employable knowledge and they will use it within a year.

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
  calculation from session 1 and have them do 4K UHD themselves. Answer: about 10 Gbit/s.

### Lighting

- One DMX slot is one byte, 0 to 255. That is 256 steps of level.
- 8 bit dimming is visibly stepped on a slow fade to black at low levels. This is why 16 bit
  channels exist: a coarse byte and a fine byte together give 65,536 steps.
- **Demo if you have a 16 bit capable fixture:** run a 30 second fade from 5 percent to 0 in
  8 bit, then in 16 bit. The steps in the 8 bit version are obvious once you know to look, and
  once they see it they cannot unsee it. This is the "if an ordinary person can feel it" test
  passing in front of them.
- Pixel maths, which they will need in session 5: an RGB pixel is 3 channels, so a universe of
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
  exists because our eyes are non-linear too. One sentence at year one. It is the reason two
  systems can agree on the numbers and disagree about the picture.

The arithmetic students should reach for automatically:

```
one frame  =  width × height × channels × bit depth ÷ 8   bytes
data rate  =  that × frame rate
```

### Media files: container, codec, lossless and lossy

Two words students use interchangeably and should not.

- **Container** is the box: `.mov`, `.mp4`, `.mkv`, `.wav`. It says how the parts are packed
  together, and it can usually hold many different things.
- **Codec** is the method: H.264, HAP, ProRes, PCM, FLAC. It says how the content is compressed.
- A `.mov` file can contain almost anything. "It is a .mov" tells you nothing useful. Ask what is
  inside it.

The three compression families, and this is the distinction that decides what you can do with a file:

| Family | What it does | Examples | On a show |
|--------|-------------|----------|-----------|
| **Uncompressed** | Stores every sample and every pixel | WAV/PCM, BMP, TIFF, SDI, ST 2110 | Truth, and enormous |
| **Lossless** | Smaller, and every original number comes back exactly | FLAC, ALAC, PNG, ZIP | Archive, masters, graphics with hard edges |
| **Lossy** | Throws information away permanently for a much smaller file | MP3, AAC, JPEG, H.264, H.265 | Delivery and streaming, never your master |

**Lossy is a one way door.** Decompressing an MP3 and re-encoding it does not restore what was
discarded, it discards more. This is why every generation of a re-encoded file is worse, and why
you keep masters.

<!--anim:lossy-compression-->

The formats you will actually meet, by domain:

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

**The rule to give them, and to repeat until it is automatic:** you receive lossy inter frame
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

The practical rule to give them: **you receive H.264, you play back HAP or ProRes.** The
transcode is not optional bureaucracy, it is what makes a cue jump instantly instead of stalling.

GPU accelerated codecs (HAP, DXV) decompress on the graphics card rather than the CPU, which is
why a media server can play many layers at once. Worth one sentence, not more, at year one.

---

## Block D: Lab

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

## Homework before session 4

1. Finish the machine specification if the team did not complete it in the lab.
2. Learn the storage and buffer numbers in `numbers-to-know.md`.
3. Find the IP address, subnet mask and gateway of your own laptop and write them down. Do not
   change anything. Bring the numbers to session 4.
