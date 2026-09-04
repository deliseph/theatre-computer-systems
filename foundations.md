# Foundations
**The number skills the rest of the module assumes. Work through this before Class 2.**

Nothing here is difficult. All of it is assumed by every other class, and a student who has not
met it will spend Class 3 fighting the arithmetic instead of learning the network.

Forty minutes, done properly, once. Then it is yours.

---

## Bits and bytes, and the mistake everybody makes

A **bit** is one binary digit, 0 or 1. A **byte** is eight bits.

The single most common error in this whole subject is confusing the two, because the industry
writes them almost identically:

| Written | Said | Means |
|---------|------|-------|
| `b` (lower case) | bit | 1 binary digit |
| `B` (upper case) | byte | 8 binary digits |
| `Mbps` or `Mbit/s` | megabits per second | how networks are measured |
| `MB/s` | megabytes per second | how storage is measured |

> **Networks are measured in bits. Storage is measured in bytes. To convert, divide or multiply
> by eight.**

That is why a "1 gigabit" network link moves about 125 megabytes per second, and why a video
stream quoted at 2.5 Gbit/s needs about 312 MB/s of disk. Get the divide-by-eight the wrong way
round and your answer is out by a factor of 64.

<!--anim:units-scale-->

### The prefixes

| Prefix | Symbol | Multiplier |
|--------|--------|-----------|
| kilo | k | 1,000 |
| mega | M | 1,000,000 |
| giga | G | 1,000,000,000 |
| tera | T | 1,000,000,000,000 |

There is a second, older convention where kilo means 1,024 rather than 1,000, which is why a
"1 TB" drive shows up as about 931 GB in your operating system. Nothing was stolen from you. The
drive maker counted in thousands and the computer counted in 1,024s. Know it exists, do not lose
sleep over it, and use powers of ten for every calculation in this module.

---

## Powers of two, and why everything lands on 256 and 512

Computers count in twos, so certain numbers keep appearing. Learn this column and half the
module stops looking arbitrary.

| Power | Value | Where you meet it |
|-------|-------|------------------|
| 2^1 | 2 | on or off |
| 2^8 | **256** | one byte: 0 to 255. **One DMX channel.** |
| 2^9 | **512** | **channels in a DMX universe** |
| 2^10 | 1,024 | 10 bit colour depth, one kibibyte |
| 2^16 | 65,536 | 16 bit dimming, 16 bit audio levels |
| 2^24 | 16,777,216 | 24 bit audio, 8 bit RGB colours |
| 2^32 | 4,294,967,296 | every possible IPv4 address |

Notice that a DMX universe holds 512 channels because 512 is a power of two, and each channel
holds 0 to 255 because that is one byte. Neither number was chosen by a lighting designer. They
fell out of the arithmetic.

**The one calculation to be fluent in:**

```
number of values you can represent  =  2 ^ (number of bits)
```

8 bits gives 256 levels. 16 bits gives 65,536. Each extra bit doubles it.

---

## Binary, in the only depth you need

You never have to do binary arithmetic in this module. You have to **read** it, in exactly one
place: subnet masks. That needs one skill and nine numbers.

Each position in an 8 bit group has a value, doubling from right to left:

```
 128   64   32   16    8    4    2    1
```

To read a binary octet, add up the positions that hold a 1.

<!--anim:binary-counter-->

### The nine numbers

A subnet mask is always a solid run of 1s followed by a solid run of 0s, never mixed. That means
only nine values can ever appear in a mask octet. Learn them and subnetting becomes arithmetic
you can do in your head.

| Ones | Value | | Ones | Value |
|------|-------|---|------|-------|
| 0 | 0 | | 5 | 248 |
| 1 | 128 | | 6 | 252 |
| 2 | 192 | | 7 | 254 |
| 3 | 224 | | 8 | 255 |
| 4 | 240 | | | |

If you learn nothing else on this page, learn that column. It is nine numbers, and Class 3
depends on it.

---

## Hexadecimal, and where you will actually see it

**Hex** counts in sixteens, using 0 to 9 then A to F. One hex digit is exactly four bits, so two
hex digits are exactly one byte. That is the whole reason it exists: it is a compact way to write
binary that humans can read.

| Hex | Decimal | Binary |
|-----|---------|--------|
| 0 | 0 | 0000 |
| 8 | 8 | 1000 |
| A | 10 | 1010 |
| F | 15 | 1111 |
| FF | 255 | 11111111 |

Where it turns up in your working life:

- **MAC addresses**: `00:1D:C1:0A:2B:3C`. Six bytes, twelve hex digits.
- **Colour**: `#F0A038` is red `F0`, green `A0`, blue `38`, each one byte, 0 to 255.
- **Fixture manuals and DMX offsets** occasionally use it.
- **Error codes and firmware**, when something has gone wrong.

You will not be asked to convert hex under exam pressure. You will be asked to recognise it and
not be frightened of it.

---

## Reading a specification sheet without being lied to

A skill worth more than it sounds. Manufacturers are not dishonest, they are selective.

| They print | You should ask |
|-----------|----------------|
| "Up to 7,000 MB/s" | Is that burst or sustained? Sustained is the number that matters. |
| "Supports 4K" | At what frame rate, what chroma, what bit depth? 4K30 8-bit is not 4K60 10-bit. |
| "1 Gigabit network" | Bits, so about 125 MB/s. Not a gigabyte. |
| "Low latency" | How many milliseconds, measured how, at what buffer size? |
| "512 universes" | Output universes, or universes it can process? Not the same number. |
| "8 ports, 30 W PoE" | What is the switch's **total** PoE budget? It is never 8 × 30. |
| "20 TB" | Capacity, which tells you nothing at all about throughput. |

**The habit:** every specification number is meaningless without its unit and its condition.
Write both down. If a number appears without them, that is the question to ask.

---

## The five calculations the module keeps asking for

Everything else is a variation on these. If you can do them, you can do the module.

```
1. Audio data rate    = sample rate × bit depth × channels
                        48,000 × 24 × 64 = 73.7 Mbit/s

2. Video data rate    = width × height × frame rate × bits per pixel
                        1920 × 1080 × 60 × 20 = 2.49 Gbit/s

3. Bits to bytes      = divide by 8
                        2,490 Mbit/s ÷ 8 = 311 MB/s of disk

4. DMX universes      = total channels ÷ 512, rounded UP
                        4,320 ÷ 512 = 8.4 → 9 universes

5. Usable hosts       = 2 ^ (32 − prefix) − 2
                        2 ^ (32 − 26) − 2 = 62
```

The minus two in the last one is the network address and the broadcast address, the two you
never assign to a device.

---

## Check yourself

If you can answer these without a calculator, you are ready. If not, the answer is above.

1. A 1 Gbit link. How many megabytes per second, roughly?
2. How many values can 8 bits represent? How many can 16 bits represent?
3. Why does a DMX universe hold 512 channels rather than 500?
4. Write `11000000` as a decimal number.
5. Which of these can never appear in a subnet mask octet: 192, 200, 240, 255?
6. How many bits is one hex digit? How many bytes is `00:1D:C1:0A:2B:3C`?
7. A drive claims 550 MB/s. A video stream needs 2.0 Gbit/s. Does it fit?
8. A spec says "up to 3,500 MB/s". What is the one word missing, and why does it matter?

*Answers: (1) about 125 MB/s. (2) 256 and 65,536. (3) 512 is a power of two, and the protocol was
built around bytes. (4) 192. (5) 200, because a mask is a solid run of ones and 200 is not.
(6) four bits; six bytes. (7) 2.0 Gbit/s ÷ 8 = 250 MB/s, so yes, comfortably. (8) "sustained".
The printed figure is usually burst, and a show needs the speed the drive can hold for an hour.*
