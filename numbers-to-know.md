# Numbers To Know
**Student reference card. Learn these. There is a five minute verbal quiz at the top of every
session, and you may bring this page into the calculate station of the practical exam.**

Print it. Fold it. Put it in the pocket of the jacket you wear to work.

---

## Block 1: Data rates (learn before session 2)

| Thing | Number |
|-------|--------|
| Speed of sound | about 343 m/s, so **3 ms per metre** |
| One audio channel, 48 kHz, 24 bit | **1.152 Mbit/s** |
| 64 audio channels | about 74 Mbit/s of audio, call it 100 Mbit/s on the wire |
| One DMX universe | about **0.25 Mbit/s** |
| Uncompressed 1080p60, 10 bit, 4:2:2 | about **2.5 Gbit/s** |
| Uncompressed UHD 4K 60, 10 bit, 4:2:2 | about **10 Gbit/s** |
| NDI, one HD stream | roughly **100 to 250 Mbit/s** |

**The ranking, and you should be able to say it in your sleep:**
clock < control < audio < video.

**The arithmetic:**
```
audio  =  sample rate  ×  bit depth  ×  channels
video  =  width × height × frame rate × bits per pixel
```

---

## Block 2: The machine (learn before session 4)

| Thing | Number |
|-------|--------|
| Spinning hard disk, sustained read | 100 to 200 MB/s |
| SATA SSD, sustained read | about 550 MB/s |
| NVMe SSD, sustained read | 2,000 to 7,000 MB/s |
| Audio buffer, 128 samples at 48 kHz | **2.67 ms** per buffer |
| Audio buffer, 256 samples at 48 kHz | 5.33 ms per buffer |
| Audio buffer, 512 samples at 48 kHz | 10.67 ms per buffer |
| Round trip latency | roughly **twice the buffer**, plus converter time |
| Dynamic range per bit | **6.02 dB**, so 16 bit is about 96 dB and 24 bit about 144 dB |
| Nyquist | you can only capture frequencies **below half the sample rate** |

**Bits to bytes:** divide by 8. A 2.5 Gbit/s video stream is about 312 MB/s of storage throughput.
Getting this the wrong way round is the most common mistake in the exam.

---

## Block 3: Addressing and the network (learn before session 5)

| Thing | Number |
|-------|--------|
| Cat cable maximum channel length | **100 m** (90 m solid plus 10 m patch) |
| Link speeds you will meet | 100 Mbit, 1 Gbit, 10 Gbit, 25 Gbit |
| `255.255.255.0` | the same as **/24**. First three parts are the network. |
| `169.254.x.x` | **"I asked for an address and nobody answered."** Recognise on sight. |
| Private ranges | `10.x.x.x`, `172.16` to `172.31.x.x`, `192.168.x.x` |
| Art-Net legacy range | often `2.x.x.x` or `10.x.x.x` |
| PoE (802.3af) | up to 12.95 W at the device |
| PoE+ (802.3at) | up to 25.5 W at the device |
| PoE++ (802.3bt) | up to 51 W (Type 3) or 71 W (Type 4) at the device |

**The rule:** two devices can talk directly only if the **network part** of their addresses is
identical under the mask.

**Three symptoms to recognise instantly:**
- `169.254.x.x` → DHCP was expected and there is no DHCP server.
- Intermittent, confusing, both devices misbehaving → **duplicate IP**.
- Works fine, then stops several minutes later → **multicast, snooping on, no querier**.

---

### The nine bit values (learn these first)

| Bits set | Value | Bits set | Value |
|----------|-------|----------|-------|
| 0 | 0 | 5 | 248 |
| 1 | 128 | 6 | 252 |
| 2 | 192 | 7 | 254 |
| 3 | 224 | 8 | 255 |
| 4 | 240 | | |

### The prefix table (learn these second)

| Prefix | Mask | Block size | Usable hosts |
|--------|------|-----------|--------------|
| /16 | 255.255.0.0 | 65,536 | 65,534 |
| /22 | 255.255.252.0 | 1,024 | 1,022 |
| /23 | 255.255.254.0 | 512 | 510 |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |

### The subnet method, four steps

```
1. Block size      = 256 - (last non-zero mask octet)
2. Find which block the address falls in, counting in steps of the block size
3. Network = first address in the block.  Broadcast = last address in the block.
   Usable  = everything between them.
4. Usable hosts    = 2^(32 - prefix) - 2
```

### The OSI layers

| # | Layer | On a show |
|---|-------|-----------|
| 7 | Application | sACN, Art-Net, Dante, NDI, OSC |
| 6 | Presentation | Codecs, sample formats, encryption |
| 5 | Session | A Dante subscription, an open control session |
| 4 | Transport | TCP and UDP, port 5568 and 6454 |
| 3 | Network | IP addresses, masks, routers, IGMP |
| 2 | Data link | MAC addresses, switches, VLAN tags |
| 1 | Physical | Cable, fibre, connectors, link lights, PoE |

**Diagnose from the bottom up.** Link light, then VLAN, then IP, then port, then software.

### VLAN numbers

| Thing | Number |
|-------|--------|
| VLAN ID range | 1 to 4094 |
| The 802.1Q tag adds | 4 bytes to the Ethernet frame |
| Access port carries | exactly 1 VLAN, untagged |
| Trunk port carries | many VLANs, tagged |
| Subnets from borrowed bits | 2^bits, so 2 bits gives 4 subnets |

---

## Block 4: Protocols (learn before session 6)

| Thing | Number |
|-------|--------|
| DMX512 bit rate | **250 kbit/s** |
| DMX512 slots per universe | **512**, each one byte, 0 to 255 |
| DMX512 maximum refresh | about **44 Hz** (roughly 23 ms per full frame) |
| DMX512 devices per segment | **32** unit loads, then a splitter |
| DMX512 termination | **120 ohms** on the last device |
| RGB pixels per universe | 512 ÷ 3 = **170** |
| RGBW pixels per universe | 512 ÷ 4 = **128** |
| Art-Net | UDP port **6454** |
| sACN (E1.31) | UDP port **5568**, multicast |
| Timecode frame rates | 24, 25, 29.97, 30 |

**The DMX refresh calculation, learn to reproduce it:**
```
512 slots × 11 bits = 5,632 bits
5,632 ÷ 250,000 = 22.5 ms
plus break and mark ≈ 23 ms per frame
1 ÷ 0.023 ≈ 44 frames per second
```

---

## Block 5: Media over IP and perception (learn before session 7)

| Thing | Number |
|-------|--------|
| Dante latency settings | 0.25, 0.5, 1, 2, 5 ms. **1 ms is the safe default.** |
| Channels on a 1 Gbit link, 48 kHz 24 bit | several hundred each way. Bandwidth is rarely the limit. |
| HD-SDI | 1.485 Gbit/s |
| 3G-SDI | 2.97 Gbit/s, carries 1080p60 |
| 12G-SDI | 12 Gbit/s, carries UHD60 |
| ST 2110 network requirement | 10 Gbit minimum for HD, 25 Gbit for UHD |
| PTP accuracy | well under a microsecond |
| In ear monitoring feels wrong beyond | roughly **5 to 10 ms** |
| Audio ahead of picture, detectable at about | **+45 ms** (ITU-R BT.1359) |
| Audio behind picture, detectable at about | **−125 ms** (ITU-R BT.1359) |
| Broadcast delivery tolerance commonly cited | +40 / −60 ms (EBU R37) |

**Why the asymmetry:** thunder always follows lightning, so we are built to accept sound arriving
after picture. Sound arriving before picture is unnatural and we catch it roughly three times faster.

---

## The two things you will be asked to do, in every assessment

**1. Data rate maths.** Will this fit down this wire?
```
channels or pixels  ×  rate  ×  depth  =  bits per second
```

**2. Latency budget.** Add every stage from trigger to eardrum or retina. Compare it against a
perceptual threshold. State pass or fail, and say which threshold you used.

---

## The two definitions people get wrong

**Latency** is delay. If it is constant, you can measure it and compensate for it. A delay tower
is a latency compensation device and nobody calls it a fault.

**Jitter** is delay that varies. You cannot compensate for a number that will not sit still. Your
only defence is a buffer, and a buffer costs latency.

Jitter is what breaks shows.
