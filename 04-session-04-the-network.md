# Session 4: The Network
**Content.**

*How does a packet get from a console to a fixture, and what are all the ways that goes wrong?*

The most directly employable session in the module. A first year who leaves this session able to
calculate a subnet, plan a set of VLANs and diagnose a dead link is already useful on a get in.

This session carries three skills that need genuine repetition to stick: the OSI model as a
diagnostic ladder, subnet arithmetic, and VLAN separation. The class introduces them.
The drill happens on the platform, outside class, and it is not optional.

---

## Before this class

This is the heaviest preparation in the
module, and the one that most changes how much you get out of the class. Subnetting does not
absorb in one sitting.

### What you must already be able to do

| Skill | Where to get it |
|-------|----------------|
| The nine mask values: 0, 128, 192, 224, 240, 248, 252, 254, 255 | [Foundations](/foundations) |
| Read a binary octet and give its decimal value | [Foundations](/foundations) |
| Recognise hexadecimal, and know a MAC address when you see one | [Foundations](/foundations) |
| Calculate a data rate and convert it to bytes | Class 2 |

### Do these four things

1. **Learn the nine numbers.** Nine values, and every subnet question in this module and the exam
   depends on them. Twenty minutes.
2. **Watch the two OSI videos** linked at the end of this class. Forty minutes, and the class will
   move much faster for you.
3. **Run the subnetting trainer** until you get five in a row. You are not expected to be good yet.
   You are expected to have met the questions before, so that the method in Block B lands on
   something rather than on nothing.
4. **Find your own laptop's IP address, subnet mask and gateway** and write them on paper. Do not
   change anything. Bring the numbers.

### Bring

- Your laptop, and Wireshark installed.
- The three numbers from step 4.
- The reference card, Block 3 learned.

<!--ready:3-->

---

## Learning outcomes

By the end of this session a student can:

1. Name the seven OSI layers, say what lives at each on a show, and use the model as a fault
   finding ladder rather than as a list to recite.
2. Explain what happens at layers 2, 3 and 4: frames and MAC addresses, packets and IP addresses,
   and ports, including what changes and what stays the same at every hop.
3. Distinguish a switch, a router and an access point by the layer each works at and the job each
   does, and say what is actually inside the box at home that is labelled "router".
4. Convert between CIDR prefix and dotted decimal mask, and calculate the network address,
   broadcast address, usable host range and host count for any given address and mask.
5. Divide an address range into a stated number of subnets and write the resulting scheme down.
6. Explain what a VLAN is, distinguish access from trunk ports, and design a VLAN scheme that
   separates lighting, audio, video and management.
7. Distinguish unicast, broadcast and multicast, and explain why IGMP snooping matters on a show.
8. Diagnose a broken network systematically, from the bottom of the stack upwards.

---

## Block plan

| Block | Title |
|-------|-------|
| — | Numbers quiz |
| A | The OSI model, and the layers you can touch |
| B | Layers 2, 3 and 4, and the three boxes |
| — | Break |
| C | Addressing and subnet arithmetic |
| — | Break |
| D | Switching, VLANs and segmentation |
| — | Break |
| E | Lab, build it, subnet it, break it, fix it |
| — | Wrap and homework |

*If the class is split across two shorter meetings, split after Block C.*

---

## Block A: The OSI model, and the layers you can touch

### Why a first year should learn the OSI model properly

Not so they can recite it. So they have a **ladder to climb when something breaks.**

Almost every wasted hour in a machine room comes from someone starting at the top of the stack,
reinstalling software, when the fault was at the bottom, in a cable. The model gives you an order
of investigation, and the order is what saves the afternoon.

### The seven layers, with what actually lives there on a show

| # | Layer | 繁中 | What it is | On a show |
|---|-------|------|-----------|-----------|
| 7 | **Application** | 應用層 | The protocol that means something to a human | sACN, Art-Net, Dante, NDI, OSC, MSC |
| 6 | **Presentation** | 表現層 | How data is encoded, compressed or encrypted | Codecs, sample formats, TLS |
| 5 | **Session** | 會議層 | Setting up and maintaining a conversation | A Dante subscription, an open TCP control session |
| 4 | **Transport** | 傳輸層 | End to end delivery, and port numbers | TCP or UDP. Port 5568 is sACN, 6454 is Art-Net |
| 3 | **Network** | 網路層 | Addressing across networks | IP addresses, subnet masks, routers, IGMP |
| 2 | **Data link** | 資料連結層 | Delivery on the local wire | MAC addresses, Ethernet frames, switches, VLAN tags |
| 1 | **Physical** | 實體層 | Electricity and light | Cable, connectors, fibre, link lights, PoE |

<!--anim:osi-stack-->

**Be honest with them about layers 5 and 6.** In practical show work you will spend almost all
your time at 1, 2, 3, 4 and 7. Layers 5 and 6 exist, they are real, and you will rarely
troubleshoot them by name. Say so, because a model presented as more useful than it is gets
discarded entirely.

### The model you will actually hear people use

The **TCP/IP model** collapses the same territory into four layers, and this is what most working
engineers say out loud:

| TCP/IP | Covers OSI |
|--------|-----------|
| Network access | 1 and 2 |
| Internet | 3 |
| Transport | 4 |
| Application | 5, 6 and 7 |

Teach OSI because it is what the exam, the textbook and the certification will ask for. Mention
TCP/IP because it is what the room will say.

### The diagnostic ladder

This is the payload of the whole block, and it is worth keeping in front of you for the rest of
the module.

> **Fault find from the bottom up. Never start at the top.**

| Rung | Question | Tool | Typical time |
|------|----------|------|--------------|
| 1. Physical | Is there a link light? Is the cable good? | Your eyes, a cable tester, a known good lead | 30 seconds |
| 2. Data link | Is it on the right VLAN? Any port errors? | Switch port status page | 2 minutes |
| 3. Network | Correct IP and mask? Does it ping? | `ping`, `ipconfig` or `ifconfig` | 2 minutes |
| 4. Transport | Is the traffic on the expected port? | Wireshark | 5 minutes |
| 7. Application | Is the universe, subscription or patch correct? | The product's own software | 10 minutes |

Every rung you skip is a rung you will come back to. The student who reinstalls the lighting
software first has spent forty minutes to arrive back at rung 1.

### Extension: Layer 1 in detail: copper

- Categories: Cat5e (1 Gbit), Cat6 (1 Gbit reliably, 10 Gbit on short runs), Cat6a (10 Gbit to 100 m).
- **The 100 metre rule.** 100 m total channel, conventionally 90 m of solid core plus 10 m of
  stranded patch lead. Past that it does not fail cleanly, it fails intermittently, which is worse.
- Solid core for permanent installation, stranded for leads that move. A solid core cable flexed
  repeatedly at a stage box fails on the third night.
- Shielded cable helps near dimmers and motors, and only if the shield is grounded correctly. A
  badly terminated shield is worse than none.
- **RJ45** for general use, **etherCON** for anything rigged, moved or stepped on.
- Most network faults on a show are physical. Bad termination, crushed cable, a lead that was
  fine yesterday. This is why we test cables.

### Extension: Layer 1 in detail: fibre

- Multi mode for in building runs of hundreds of metres, single mode for kilometres.
- Immune to electrical interference, which is why it goes between buildings and past dimmer racks.
- **LC** is the common small connector, **opticalCON** the rigged and abused version.
- **SFP** is the swappable transceiver that turns a switch port into a fibre port. Hold one up.

### Extension: Layer 1 in detail: speed and power

| Link speed | Practical use |
|-----------|---------------|
| 100 Mbit | Legacy devices, small nodes, some fixtures |
| 1 Gbit | The default. Very large audio counts and compressed video |
| 10 Gbit | Uncompressed video over IP, large media backbones |
| 25 Gbit and above | 4K uncompressed ST 2110 |

| PoE standard | Common name | Power at the device |
|--------------|-------------|---------------------|
| 802.3af | PoE | up to 12.95 W |
| 802.3at | PoE+ | up to 25.5 W |
| 802.3bt Type 3 | PoE++ | up to 51 W |
| 802.3bt Type 4 | PoE++ | up to 71 W |

The trap worth naming: a switch has a **total** PoE budget, not just a per port rating. Eight
ports rated 30 W does not mean 240 W is available.

### Layer 2, in one line before we go deep

A **switch** learns which device is on which port by watching traffic, then forwards a frame only
where it needs to go. A hub repeated everything to everyone; a switch is selective, and that
selectivity is what makes a modern show network possible.

<!--anim:switch-learning-->

Block B takes this apart properly, along with layers 3 and 4.

---

## Block B: Layers 2, 3 and 4, and the three boxes

Block A gave you the ladder. This block is the three rungs you will actually spend your working
life on, and the three boxes that live on them.

### Why these three and not the others

Layer 1 is the cable, and you met it above. Layer 7 is just the name of the protocol: sACN, Dante,
NDI. Layers 5 and 6 you will almost never touch by name.

**Everything you configure lives at 2, 3 and 4.** Every setting on a switch, every address you
type, every port number in a manual. Learn these three properly and the rest of networking is
vocabulary.

| Layer | Unit of data | The question it answers | What carries it |
|-------|-------------|------------------------|-----------------|
| 4 Transport | segment / datagram | **Which program** on that device? | Port numbers |
| 3 Network | packet | **Which device**, anywhere? | IP addresses |
| 2 Data link | frame | **Which device on this wire?** | MAC addresses |

Read that bottom to top and it is one sentence: get it across this wire, get it to that machine,
give it to the right program.

<!--anim:layer-stack-->

### Layer 2: the frame, and the local wire

<!--anim:frame-anatomy-->

The unit is a **frame**. A frame can only travel within one local network. It cannot cross a
router, and that single fact explains most of what follows.

**MAC address.** Six bytes, written in hex: `00:1D:C1:0A:2B:3C`. Burned into the hardware at the
factory. The first three bytes identify the manufacturer, so `00:1D:C1` tells you who made it,
which is genuinely useful when you are staring at a switch table trying to work out which device
is on port 14.

**How a switch forwards.** It watches the source address of every frame and records which port
that device is on. After that it sends a frame only to the port where the destination lives. A
frame to an address it has not learned yet is flooded to every port, once, and then it learns.

**Error detection, and why a bad cable loses data rather than corrupting it.** Every frame carries
a checksum. If it does not match, the switch **discards the frame silently**. Nothing repairs it
and nothing at layer 2 asks for it again. So a marginal cable does not give you wrong colours or
distorted audio, it gives you *missing* data: dropped packets, a stuttering fixture, a click. That
is why "it looks fine but it is glitching" points at the cable.

**Broadcast domain.** A broadcast is a frame addressed to everybody. Every device on the same
layer 2 network must receive it, look at it, and decide it does not care. A VLAN divides one
switch into several broadcast domains; a router stops broadcasts entirely. Everything within one
broadcast domain competes for the same attention, which is why show networks are kept small and
divided.

**MTU.** The largest frame the network will carry, normally **1500 bytes** of payload. Some
professional media networks use **jumbo frames** of around 9000 bytes to carry more per frame.
The rule: every device on the path must agree. One device at 1500 in a path set to 9000 does not
negotiate down, it drops what it cannot carry, and you get a fault that only appears on large
transfers.

**ARP, the bridge between layers 2 and 3.** You configure IP addresses, but the wire only moves
frames addressed to MAC addresses. So before a device can send to `10.101.10.50`, it shouts
"who has 10.101.10.50?" as a broadcast, and the owner answers with its MAC. That exchange is
**ARP**, and the answers are cached in an ARP table.

Two practical consequences worth knowing now:
- A device that has just changed IP can be unreachable for a minute while a stale ARP entry
  expires. Not a fault. Wait, or clear the table.
- Duplicate IP addresses are so confusing precisely because ARP answers arrive from two different
  machines, and whichever answered last wins, moment to moment.

### Layer 3: the packet, and getting off your own wire

The unit is a **packet**. A packet can cross routers, which is the whole point of layer 3.

**The address is assigned, not burned in**, and it splits into a network part and a host part, as
Class 3's subnet work covers in detail. What matters here is the consequence: **an IP address says
which network you are on, and therefore whether a router has to be involved at all.**

**What a router actually does.** It has an interface in two or more networks. A packet arrives, the
router reads the destination IP, decides which of its interfaces leads there, and sends it out —
**inside a brand new frame, with new MAC addresses.** The IP addresses never change. The MAC
addresses change at every single hop.

That is the most commonly misunderstood thing in networking, so it is worth stating as a rule:

> **Across a whole journey, the IP addresses stay the same and the MAC addresses are rewritten at
> every hop.** Layer 3 is the destination. Layer 2 is only ever the next step.

<!--anim:hop-by-hop-->

**Default gateway.** The router's address on your network, and it means one thing: *"anything not
on my own network, send here."* A device with no gateway can talk to its own network and nowhere
else, which on a deliberately isolated show network is exactly what you want.

**TTL.** Every packet carries a hop counter that decreases by one at each router. At zero it is
discarded. It exists so a routing mistake produces a packet that dies rather than one that circles
forever. It is also how `traceroute` works: send packets with TTL 1, then 2, then 3, and each
router in turn reports the death.

**ICMP** is the layer 3 messenger. `ping` and `traceroute` are ICMP, and so are the errors:
*destination host unreachable* means a router had nowhere to send it; *request timed out* means
nothing came back, which is a different thing and often means a one-way problem.

**Multicast lives here too.** Addresses in `239.0.0.0` to `239.255.255.255` are multicast, which
is where sACN's `239.255.x.x` comes from, and IGMP is the layer 3 protocol devices use to join and
leave those groups.

### Layer 4: the port, and which program gets it

Layer 3 got the packet to the machine. Something has to decide **which program on that machine**
receives it, because a media server may be running a video player, a control listener and a remote
desktop at once. That is the **port number**.

- Ports run 0 to 65,535.
- An IP address plus a port is a **socket**, and that pair is what a program actually listens on.
- The port is how one device runs many services on one address.

The ports you will meet on a show, worth recognising in a Wireshark capture:

| Port | Protocol | What it is |
|------|----------|-----------|
| 5568 | UDP | sACN (E1.31) lighting |
| 6454 | UDP | Art-Net lighting |
| 319, 320 | UDP | PTP, clock |
| 4440 to 4455 | UDP | Dante audio and control |
| 5353 | UDP | mDNS, how devices discover each other by name |
| 53 | UDP | DNS |
| 22 | TCP | SSH |
| 80, 443 | TCP | Web, including switch configuration pages |

**TCP and UDP are both layer 4**, and the difference is the whole of Class 4's argument in one
place:

| | TCP | UDP |
|---|-----|-----|
| Sets up a connection first | Yes | No |
| Numbers everything and confirms arrival | Yes | No |
| Re-sends what was lost | Yes | No |
| Puts things back in order | Yes | No |
| Costs | Latency, and a connection to maintain | Nothing |
| Right for | A file, a command that must confirm | Anything with a deadline |

Show media runs on UDP, and that is a deliberate choice rather than a compromise. Class 4 explains
why with a working model.

**The layer 4 fault to recognise:** the traffic is visibly arriving, Wireshark shows it, and the
application sees nothing. That is almost always a port problem — the wrong port configured, or a
firewall on the receiving machine quietly discarding it.

### The three boxes

Three devices, three layers, three jobs. They are easy to run together, mostly because the box at
home does all of them at once.

| | **Switch** | **Router** | **Access point** |
|---|-----------|-----------|-----------------|
| Works at | Layer 2 | Layer 3 | Layer 1 and 2 |
| Forwards by | MAC address | IP address | MAC address |
| Joins | Devices on **one** network | **Different** networks | Wireless devices to a wired network |
| Broadcasts | **Passes them on** within the VLAN | **Stops them** | Passes them on |
| Gives out addresses | No | Sometimes, if it runs DHCP | No |
| On a show | Everywhere | Rarely, and deliberately | Operator tablets only |

**A switch** connects devices that are already on the same network. It is the workhorse, and on
most show networks it is the only one of the three you need.

**A router** is the boundary between networks. It is the thing that makes two subnets able to talk,
and equally the thing that stops a broadcast storm in one department reaching another. On a show
network you often want **no router at all**, because the departments are supposed to be isolated.
Adding one is a decision, not a default.

**An access point** does not create a network. It extends an existing wired network to devices
without cables, bridging wireless frames onto the wire. It is a layer 2 device, and everything
from Class 3 about wireless applies: a shared, contended medium with no delivery guarantee.

<!--anim:device-roles-->

**Four boxes, and the hub that explains the other three.** A hub reads nothing and repeats every
signal to every port; a switch reads the destination MAC and sends it only there; a router reads
the destination IP and moves the packet between networks; an access point is a switch on the cable
side and a hub on the radio side, which is exactly why wireless feels the way it does. Hubs
disappeared around 2005 and are worth knowing anyway, because the behaviour did not disappear with
them.

<!--anim:box-roles-->

### Extension: What is actually inside the box you call a router

This one clarification saves more confusion than anything else in the block.

The box from a shop labelled "router" is **five devices in one case**:

1. A **router**, joining your network to the one upstream.
2. A **switch**, which is what those four sockets on the back are.
3. An **access point**, for the wireless.
4. A **firewall and NAT**, deciding what may cross.
5. A **DHCP server**, handing out addresses.

When someone says "just use a router", they usually mean that box. On a show, three of those five
functions are actively unwanted: you do not want DHCP handing out addresses that change, you do
not want NAT between your console and your nodes, and you very often do not want wireless at all.

**This is why show networks use plain switches.** Not because a router is worse, but because four
fifths of that box is solving a problem you do not have and creating three you did not want.

**A layer 3 switch** is the one sensible middle ground: a switch that can also route between its
own VLANs. You will meet them on large permanent installations, where lighting and video genuinely
need one controlled path between them.

### The rule that ties the block together

> **Same network?** A switch is enough. Layer 2 does it.
> **Different networks?** You need a router. That is layer 3, by definition.
> **No cable?** An access point joins wireless devices to a wired network. It does not make a new one.

---

## Block C: Addressing and subnet arithmetic

The hardest 50 minutes in the module for a first year, and the most valuable. Go slowly, do
everything written down, and the arithmetic done out loud.

### The binary you actually need

One octet is 8 bits. Each bit position has a value:

```
 128   64   32   16    8    4    2    1
 ---   --   --   --   --   --   --   --
   1    1    0    0    0    0    0    0   =  128 + 64  =  192
   1    1    1    1    1    1    0    0   =  252
   1    1    1    1    1    1    1    1   =  255
```

That is the whole of the binary requirement. Nine numbers to recognise on sight:

| Bits set | Value | Bits set | Value |
|----------|-------|----------|-------|
| 0 | 0 | 5 | 248 |
| 1 | 128 | 6 | 252 |
| 2 | 192 | 7 | 254 |
| 3 | 224 | 8 | 255 |
| 4 | 240 | | |

Learn this column. It is nine numbers and it unlocks everything that follows.

### The five classes, and the addresses that are already spoken for

You will meet "class C" in manuals, in vendor documentation and from people who learned this in
1998. Classful addressing was replaced by CIDR in 1993, so nothing on your rig actually works this
way, and the vocabulary survives anyway. It is worth ten minutes because the reserved ranges it
defined are still reserved, and you will use several of them every day.

The rule is one thing: **the leading bits of the first octet**, which is why the boundaries fall on
128, 192, 224 and 240 rather than anywhere that looks sensible.

<!--anim:address-classes-->

| Class | First octet | Starts with | Default mask | What it is now |
|---|---|---|---|---|
| A | 0–127 | `0` | /8 | ordinary space, and 10.x is the private part of it |
| B | 128–191 | `10` | /16 | ordinary space, 172.16–172.31 is the private part |
| C | 192–223 | `110` | /24 | ordinary space, 192.168 is the private part |
| D | 224–239 | `1110` | none | **multicast**, and you use this constantly |
| E | 240–255 | `1111` | none | reserved in 1981, never released |

The ones to actually know:

- **`127.0.0.0/8`, loopback.** Sixteen million addresses spent so that a packet to any of them
  never reaches a wire. `127.0.0.1` is localhost. A service listening only on 127.0.0.1 is
  invisible to every other machine no matter how right your addressing is, and that costs an
  afternoon at least once.
- **`0.0.0.0`.** As a source it means "I have no address yet", which is what a DHCP Discover uses.
  As a route it means the default route.
- **`255.255.255.255`, limited broadcast.** Everything on this wire, and no router ever forwards
  it. All host bits set to one is also the broadcast address for a given network: `.255` on a /24,
  `x.255.255.255` on a /8.
- **`169.254.0.0/16`, link-local.** What a device gives itself when nobody answers DHCP.
- **`10/8`, `172.16/12`, `192.168/16`, private.** Never routed on the public internet, which is why
  every show network on earth can use the same numbers at once.
- **`224.0.0.0/24`, local multicast control.** Never forwarded by a router whatever the TTL says.
  `224.0.0.1` is every host on this wire; `224.0.0.251` is mDNS, which is how Dante Controller
  finds anything at all.
- **`239.0.0.0/8`, organisation-local multicast.** Scoped to your site by design. sACN lives at
  `239.255.0.0/16`, one group per universe, which is exactly why it does not leak to the internet.

And the one that is not reserved and catches everybody: **`2.x.x.x` is ordinary public address
space that somebody actually owns.** Art-Net gear has shipped on it for decades anyway.

---

### The mask is a run of ones

An IPv4 address is 32 bits, written as four octets. The **subnet mask** is also 32 bits, and it is
always a solid run of ones followed by a solid run of zeros. Never mixed.

The ones mark the **network** portion. The zeros mark the **host** portion.

```
IP address    192 . 168 .   1 .  42
              11000000.10101000.00000001.00101010

Subnet mask   255 . 255 . 255 .   0        =  /24
              11111111.11111111.11111111.00000000
              \___________  ___________/ \___  ___/
                          \/                 \/
                       network             host
```

**CIDR notation** just counts the ones. `/24` means 24 ones, which is `255.255.255.0`.

<!--anim:subnet-bits-->

### The prefix table to memorise

| Prefix | Mask | Block size | Usable hosts |
|--------|------|-----------|--------------|
| /16 | 255.255.0.0 | 65,536 | 65,534 |
| /22 | 255.255.252.0 | 1,024 | 1,022 |
| /23 | 255.255.254.0 | 512 | 510 |
| **/24** | **255.255.255.0** | **256** | **254** |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |

### The four calculations

For any address and mask, four answers are needed. Here is the worked example,
then do two more yourself.

**Given `10.101.3.150 /26`:**

```
1. Block size  =  256 − 192  =  64
                  (192 is the last non-zero mask octet, 255.255.255.192)

2. The subnets in the last octet run in steps of 64:
      0 to 63, 64 to 127, 128 to 191, 192 to 255
   150 falls inside 128 to 191.

3. Network address    =  10.101.3.128    (first in the block, not usable)
   Broadcast address  =  10.101.3.191    (last in the block, not usable)
   First usable host  =  10.101.3.129
   Last usable host   =  10.101.3.190

4. Usable hosts  =  2^(32−26) − 2  =  64 − 2  =  62
```

**The two addresses you never assign:** the first in the block is the network address, the last is
the broadcast address. That is where the minus two comes from, every time.

### The question that matters most on a show

> **Can these two devices talk directly?**

Apply the mask to both addresses. If the network portions match, yes. If they do not, no, and no
amount of cable will change it.

Worked examples, call the answers out as a class:

| Device A | Device B | Mask | Talk? | Why |
|----------|----------|------|-------|-----|
| 192.168.1.10 | 192.168.1.99 | /24 | Yes | Both on 192.168.1.0 |
| 192.168.1.10 | 192.168.2.10 | /24 | No | 192.168.1.0 and 192.168.2.0 differ |
| 192.168.1.10 | 192.168.2.10 | /16 | Yes | Both on 192.168.0.0 |
| 10.101.1.50 | 10.101.1.130 | /25 | **No** | .50 is in 0 to 127, .130 is in 128 to 255 |
| 2.0.0.10 | 192.168.1.10 | mixed | No | The Art-Net trap. Different networks entirely. |
| 10.0.0.5 | 10.0.0.5 | /24 | No | Duplicate address. Both devices misbehave. |

<!--anim:can-they-talk-->

**The two masks do not have to agree, and that is where the strange faults live.** Each device
applies its own mask to the other one's address and reaches its own conclusion; nobody consults
anybody. Give A a /8 and B a /24 on the same wire and A decides B is local while B decides A is
remote. A's frames really do arrive. B's replies go to a gateway that has no route back, so
nothing returns, and you can sit watching the traffic land on B while the ping times out. Press
**The mismatched mask** in the figure and read the two verdicts side by side.

Row 4 is the one that surprises them, and it is exactly the fault a half remembered mask
produces. Row 5 is the number one reason a first year declares a node broken.

### Dividing a range into subnets

The skill for planning a show network rather than joining one.

> **Brief: you have `10.101.0.0/16`. Divide it so lighting, audio, video and management each get
> their own network, with room for growth.**

The clean answer, and the one the industry actually uses, is a `/24` per department, because a
`/24` is easy to read, easy to write on a schedule, and holds 254 devices, which is more than
almost any department needs.

```
10.101.10.0/24    lighting      254 usable    10.101.10.1   to 10.101.10.254
10.101.20.0/24    audio         254 usable    10.101.20.1   to 10.101.20.254
10.101.30.0/24    video         254 usable    10.101.30.1   to 10.101.30.254
10.101.90.0/24    management    254 usable    10.101.90.1   to 10.101.90.254
```

Note the third octet matches the VLAN ID we will assign in Block C. That is not a requirement,
it is a convention, and it means anyone reading `10.101.20.14` knows immediately that it is audio
on VLAN 20. **Conventions that let someone read the answer off the address are worth more than
clever ones.**

Now the tighter version, which is the exam style question:

> **Brief: you have only `10.101.1.0/24` and you need four separate networks.**

```
Four subnets needs 2 borrowed bits, because 2^2 = 4.
/24 + 2 = /26.  Mask 255.255.255.192.  Block size 64.  62 usable each.

10.101.1.0/26     lighting     usable 10.101.1.1   to 10.101.1.62    bcast .63
10.101.1.64/26    audio        usable 10.101.1.65  to 10.101.1.126   bcast .127
10.101.1.128/26   video        usable 10.101.1.129 to 10.101.1.190   bcast .191
10.101.1.192/26   management   usable 10.101.1.193 to 10.101.1.254   bcast .255
```

**The rule:** to get N subnets, borrow enough bits that 2^bits is greater than or equal to N.

### Extension: Within a range, reserve blocks by device type

Any scheme works. Having one, writing it down, and labelling the devices to match is the skill.

```
.1   to .9     infrastructure (switches, gateways)
.10  to .49    consoles and servers
.50  to .199   nodes and endpoints
.200 up        temporary and test devices
```

### Extension: Public and private addresses, and the other thing called "public network"

<!--anim:address-space-->

**Where a packet actually goes when it leaves the building.** Your laptop has a private address
that means nothing outside your network, so the router swaps it for the one public address the ISP
gave you and writes down which port it used for you. From there nobody is steering: each router
looks at the destination, picks the neighbour it thinks is closer, takes one off the time to live
and forgets the packet exists. The reply comes back addressed to the building, and the note the
router wrote on the way out is the only reason it reaches the right machine.

<!--anim:home-to-world-->

That note is also the answer to two questions students always ask: why an incoming connection
needs a rule set up in advance, and why restarting the router drops every connection through it at
once.

Two different things share the word, and mixing them up wastes an evening.

**Private address ranges.** Three blocks of the address space are reserved for private use. They
are not routed on the internet, anybody can use them, and every show network you will ever build
lives in one of them.

| Range | Prefix | Where you meet it |
|-------|--------|-------------------|
| `10.0.0.0` to `10.255.255.255` | /8 | large rigs, and the traditional Art-Net alternative |
| `172.16.0.0` to `172.31.255.255` | /12 | corporate networks, and rarely on a show |
| `192.168.0.0` to `192.168.255.255` | /16 | small rigs, almost every venue, every home router |
| `2.0.0.0` to `2.255.255.255` | /8 | not private. Art-Net's legacy default, and a real public range. |

That last row is the one worth flagging. Art-Net historically used `2.x.x.x`, which is genuinely
public address space belonging to somebody else. On an isolated show network it works and nobody
notices. Plug that network into a venue's internet connection and traffic for real hosts vanishes
into your rig. **Use `10.x.x.x` for new Art-Net work.**

**A public address** is one that is unique on the internet, issued by a provider. A show device
never needs one. If a device on your rig has a public address, someone has connected the show
network to the building network, and that is a decision, not an accident.

**NAT**, in one sentence: a router swaps private addresses for its one public address on the way
out and swaps them back on the way in, which is why a whole venue shares one internet address.
Year one needs to know the word and that it is why inbound connections do not just work.

**And the other meaning.** Windows separately labels each network it joins **Public** or
**Private**, and this has nothing to do with addresses: it is a firewall setting. On Public,
Windows blocks most inbound traffic, so your machine can reach the console and the console cannot
reach your machine. A network you have just plugged into is Public by default.

> "It works one way" on a Windows machine is the network profile until proven otherwise. It is on
> the [field card](/field), with the click path.

### Static, DHCP, and the address that means failure

- **DHCP** hands out addresses automatically. The address can change.
- **Static** means you set it and it stays.

Show systems are static almost everywhere, for one reason: **an address that can change is an
address you cannot write on a piece of paper.**

- `169.254.x.x` means **"I asked for an address and nobody answered."** Recognise it on sight. It
  is the single most useful diagnostic number in the module.
- Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- Art-Net gear has historically shipped on `2.x.x.x`.

---

**The four messages, in order.** Discover, Offer, Request, Acknowledge. The first and third are
broadcasts because a device with no address cannot send to anybody in particular, and because any
other server that offered needs to hear which offer was taken so it can put its address back.

<!--anim:dhcp-lease-->

Two things worth having in your hands before a get-in: a broadcast stops at a router, so DHCP does
not cross one without a relay configured to carry it; and two DHCP servers on one broadcast domain
is a race the device wins differently every time it boots, which is the intermittent fault that
eats an afternoon.

## Block D: Switching, VLANs and segmentation

### Managed versus unmanaged

| | Unmanaged | Managed |
|---|---|---|
| Configuration | None. Plug in. | Web interface, settings, a password you will lose |
| VLANs | No | Yes |
| IGMP snooping | Usually no | Yes, and it must be set up |
| QoS | No | Yes |
| Port statistics | No | Yes, and genuinely useful |
| Right for | A small isolated network, a temporary rig | Anything shared, large or permanent |

The honest advice: on a small dedicated network an unmanaged switch is often the **safer** choice,
because there is nothing to configure wrongly. Complexity is a cost. Choose it deliberately.

### What a VLAN actually is

A **VLAN (Virtual Local Area Network)** makes one physical switch behave as several separate
switches. Ports in different VLANs cannot see each other, even though they are in the same box,
plugged into the same power supply, sharing the same backplane.

Say precisely what it separates: **a VLAN is a separate broadcast domain.** A broadcast sent on
VLAN 10 never reaches VLAN 20. Neither does a multicast, an ARP request, or a misconfigured
device shouting at everybody.

Why this matters on a show: it lets one physical infrastructure carry lighting, audio, video and
management while keeping them apart. That is the flexibility side of the trade named in Class 1.

### How the separation is carried: 802.1Q

The standard is **IEEE 802.1Q**, and the mechanism is a **tag**: four extra bytes inserted into
the Ethernet frame carrying a **VLAN ID** from 1 to 4094.

- A device sending normal traffic has no idea VLANs exist. It sends an ordinary untagged frame.
- The **switch** adds the tag on the way in and strips it on the way out.
- The tag only needs to exist on links that carry more than one VLAN.

### Access ports and trunk ports

The two words you will meet in every switch menu, and the two that get confused.

| | **Access port** | **Trunk port** |
|---|---|---|
| Carries | Exactly one VLAN | Several VLANs |
| Frames are | Untagged | Tagged with the VLAN ID |
| You plug in | A console, a node, a server, a laptop | Another switch, or a device that is VLAN aware |
| Configured as | "VLAN 20 untagged" | "VLANs 10, 20, 30, 90 tagged" |

**The rule of thumb:** device ports are access ports. Switch to switch links are trunks.

<!--anim:vlan-switch-->

**The native (untagged) VLAN on a trunk** is the one VLAN whose frames cross the trunk without a
tag. It exists for backward compatibility and it is a classic source of confusion. Set it
deliberately, set it the same at both ends, and write it down.

### Two switches, one spare cable, and the whole network stops

The single most destructive thing anybody can do to a show network takes four seconds and looks
helpful: patch a second cable between two switches that are already connected.

<!--anim:broadcast-storm-->

Nothing is faulty when this happens. Every device does exactly its job. A switch floods a
broadcast out of every port except the one it arrived on, so switch A sends it down the second
link to switch B, which floods it back. **An IP packet carries a time to live and every router
decrements it; an Ethernet frame carries nothing of the kind.** No copy is ever discarded, so they
double on every pass. In a few seconds the link is saturated, both switches are spending all their
processing on flooding, and their MAC tables are relearning the same source address on alternating
ports many times a second.

The symptom is that the entire network dies, including the parts nowhere near the loop, and every
link light is on solid. Unplug either end of either cable and it clears instantly, which is how it
is usually found and why it is so often blamed on the wrong thing.

The fix is **spanning tree**: the switches talk to each other, agree which path to keep, and put
the other into a blocking state. The cable stays in and stops being used, and if the working path
fails the blocked one takes over. RSTP does that in about a second; the original 1990 spanning
tree took thirty to fifty, which on a show is the difference between a glitch and a cue that does
not happen. If your switches support RSTP, this is what redundancy is meant to look like. If they
do not, the rule is simply that there is one path between any two points and you check it.

---

### The failure that looks like broken hardware

Worth its own moment, because it is on the exam and it wastes hours in real life.

> A device is plugged in. The link light is solid green. Nothing works. Nothing pings.

If the port is assigned to the wrong VLAN, the physical connection is perfect and the logical
connection does not exist. Layer 1 is fine, layer 2 has quietly put the device in a different
building. This is why the diagnostic ladder has a rung 2, and why "the link light is on" proves
only that electricity is flowing.

### VLANs cannot talk to each other, and on a show that is the point

Two VLANs need a **router**, or a layer 3 switch, to exchange traffic. Without one they are
isolated, permanently.

On a corporate network that isolation is a problem to be solved. On a show network it is usually
the entire objective. Do not add inter VLAN routing because it feels incomplete. Add it only
where a specific, named thing needs to cross, and then allow only that thing.

### Extension: A worked VLAN scheme

The design worth learning, and the one reproduced in the lab.

| VLAN ID | Name | Subnet | Carries | Switch ports |
|---------|------|--------|---------|--------------|
| 10 | LX | 10.101.10.0/24 | sACN, Art-Net, console to node | 1 to 6 |
| 20 | AUDIO | 10.101.20.0/24 | Dante primary, console to stage box | 7 to 12 |
| 30 | VIDEO | 10.101.30.0/24 | NDI, media server to processor | 13 to 18 |
| 90 | MGMT | 10.101.90.0/24 | Remote desktop, file copy, updates, web | 19 to 22 |
| 999 | PARKED | none | Every unused port, going nowhere | 23, 24 |

Three design decisions in that table worth naming out loud:

1. **The VLAN ID matches the third octet.** Anyone reading `10.101.20.14` knows it is audio on
   VLAN 20 without opening a document.
2. **Management is a VLAN of its own**, because the villain of Class 1 has no deadline and
   therefore no manners.
3. **Unused ports are parked in a dead VLAN**, not left in the default VLAN 1. An unused port in
   VLAN 1 is an open door for anyone who plugs a laptop into the rack at 18:00.

### Configuring it, in the order the menus ask

Vendors differ in wording. The sequence does not.

1. Create the VLANs, by ID and name.
2. Assign each device port as an **access** port in one VLAN, untagged.
3. Assign each switch to switch link as a **trunk**, tagged, listing the VLANs it must carry.
4. Set the native VLAN on the trunk deliberately, and identically at both ends.
5. Park every unused port in the dead VLAN.
6. Set the switch's own management address, and put it on the management VLAN.
7. **Change the default password**, and put it in the handover pack.
8. Save the configuration to non volatile memory. A switch that loses its config on the next power
   cycle has not been configured, it has been temporarily persuaded.
9. Export the configuration to a file and store it with the show paperwork.

Step 8 catches people every single time. Say it twice.

### Unicast, broadcast, multicast

| Mode | Sends to | Show example | Problem |
|------|---------|--------------|---------|
| **Unicast** | One specific device | Art-Net to a named node, most TCP | 40 nodes means 40 copies |
| **Broadcast** | Everything in the broadcast domain | Older Art-Net setups, ARP | Every device must process it |
| **Multicast** | Everyone who subscribed | sACN, Dante, ST 2110 | Needs the switch to be clever |

### IGMP snooping, the one that ruins shows

Multicast asks switches to deliver a stream only to ports that asked for it. The switch learns
that by listening to join messages, which is **IGMP snooping**. Something on the network must ask
the questions that keep those joins alive, which is the **IGMP querier**.

| State | What happens |
|-------|--------------|
| No snooping (unmanaged switch) | Multicast floods everywhere, like broadcast. Fine small, fails large. |
| **Snooping on, querier missing** | **Subscriptions time out and streams stop, minutes after everything looked fine.** |
| Snooping on, exactly one querier | It works as designed |

<!--anim:multicast-igmp-->

The middle row is the killer because it fails *later*. Perfect at 14:00, dead at 19:15. Every
first year should recognise that timing signature.

**Rule of thumb:** use an unmanaged switch, or a managed switch configured properly. Never a
managed switch configured halfway. The half measure is worse than neither.

### Extension: QoS

Priority. When a link is congested, the switch decides what goes first. Clock traffic gets the
highest priority, then media, then everything else.

Tie it back to the Four Flows: QoS is how you protect flows that have a deadline from the flow
that has none. It is the technical answer to the villain of Class 1.

### Segmentation strategy

Four options. Argue for one before you read on.

**Option 1: fully separate physical networks.**
- Gains: near total isolation, simple to reason about, very hard to break catastrophically.
- Gives up: cable weight, cost, switch count, any cross department integration without a bridge.

**Option 2: one physical network, VLANs per department.**
- Gains: one infrastructure, one cable per position, integration where you allow it.
- Gives up: isolation is now a setting rather than a physical fact. One wrong port assignment
  joins two departments. Needs someone competent and available.

**Option 3: separate show network plus a separate management network.**
- Gains: the villain is physically excluded.
- Gives up: a second infrastructure, and people will plug the wrong thing into the wrong socket.

**Option 4: air gapped show network, no internet, ever.**
- Gains: the strongest reliability and security posture available.
- Gives up: remote support, licence activation, cloud content delivery. It will be quietly
  violated unless there is a written procedure for bridging the gap.

**Recommendation:** small show, Option 1, because simplicity is reliability. Large show, Option 2
combined with Option 3, because you need the flexibility and you have the staff. Option 4 where a
failure is a safety issue.

### VPNs, and why the node stopped answering

A VPN does not encrypt your show network and it does not sit between your laptop and the rig. It
adds a **second network interface** and it **rewrites the routing table**, and the routing table is
what decides where each packet goes. Everything that follows is a consequence of that one fact.

<!--anim:vpn-routes-->

The routing table always picks the most specific match, so the results are not uniform and that is
what makes this confusing to diagnose:

- **A node on your own subnet usually still works.** A directly connected route is more specific
  than a default route, so unicast to something on your own wire survives even a full tunnel. This
  is why the fault looks intermittent: half your tests pass.
- **Anything through the show router does not.** Its route was the default route, and the default
  route now points at the tunnel.
- **Multicast and broadcast are the ones that hurt.** sACN on 239.255.x.x, Art-Net polling, and
  the mDNS that Dante Controller uses to find anything at all. Most VPN clients do not carry them.
  The console reports no nodes and Dante Controller shows an empty list, which reads exactly like
  a dead switch and is not one.
- **DNS moves too.** A full tunnel usually pushes its own resolvers, so local names and `.local`
  addresses stop resolving even when the addresses behind them are fine.
- **Some clients refuse local traffic outright** while connected, as a deliberate policy. The link
  light is on, the address is right, and nothing answers.
- **An overlapping range is the worst version.** If the company tunnel claims `10.0.0.0/8` and your
  show is on `10.101.x`, every show address is matched by the tunnel and sent to a concentrator in
  another country. Every obvious check passes.

**What can and cannot be read.** Two directions, and they are different questions.

From the show network's side: the tunnel is encrypted, so a switch, a monitor port or anybody
else on the show LAN sees only encrypted packets going to one remote address. They cannot read
what is inside. That is the whole point of it.

From the far end's side: the company network sees whatever is routed into the tunnel, and nothing
else. It cannot see your show traffic unless a route sends it there, which is exactly what the
overlapping range above does by accident. The real risk is not eavesdropping, it is that a laptop
holding both a show network and a corporate tunnel is a **path between two networks that were
meant to be separate**, and it is a path nobody drew on the schedule.

**The working rule.** No VPN on a machine that is doing show control. If a licence check or a
support session genuinely needs one, ask for split tunnel, ask which prefixes it claims, write
that answer on the IP schedule, and turn it off before the doors open. A VPN that reconnects by
itself when it sees a network is the reason "it worked yesterday" is true and useless.

---

### Wireless

<!--anim:wifi-channels-->

Put plainly. Wi-Fi is a **shared, contended medium with no delivery guarantee and
variable delay**, and in a room with 900 audience phones it degrades at exactly the moment you
need it.

- Acceptable: an operator focus tablet, a monitoring dashboard, a projector remote.
- Not acceptable: anything that must happen. No show critical control, no media, no clock.
- If you must, use a dedicated access point on a dedicated channel, and keep the wired path primary.

**The two things called 5G, which are not related at all.** This confusion is deliberate on
somebody's part and it costs real time in venues, so name it early.

| | **5 GHz Wi-Fi** | **5G mobile** |
|---|-----------------|---------------|
| What it is | a **radio band** that Wi-Fi uses | a **generation** of mobile phone network |
| Who runs it | you, on your own access point | a network operator, on licensed spectrum |
| The 5 means | five gigahertz, a frequency | the fifth generation, after 4G |
| Range | shorter than 2.4 GHz, and it hates walls | kilometres, from a mast |
| On a show | a dedicated AP for a focus tablet | a backup internet link, or nothing |

A phone showing "5G" in the corner is on a mobile network. A phone connected to `VENUE-WIFI-5G` is
on a Wi-Fi network using the 5 GHz band. **Neither one tells you anything about the other**, and a
device that "has 5G" may have either.

Two practical consequences. Wi-Fi's 5 GHz band is the one to use on a show, because it has far more
non-overlapping channels than 2.4 GHz and the audience's phones and every wireless microphone
remote are crowded into 2.4. And 6 GHz, sold as **Wi-Fi 6E** and **Wi-Fi 7**, is better again for
exactly the same reason: it is emptier, for now.

> The general rule holds regardless of the band. **Wi-Fi is a shared medium with no delivery
> guarantee.** A better band buys you a less crowded room, not a promise.

---

## Block E: Lab, build it, subnet it, break it, fix it

Prepare the faults in advance. This lab lives or dies on preparation.

### Part 1: subnet on paper (10 minutes, individual)

Before anyone touches a switch. Six questions, on paper, working shown. Use the platform's
subnetting trainer to generate a fresh set if you want different numbers per student.

1. `10.101.3.150/26`. Network, broadcast, first usable, last usable, host count.
2. `192.168.4.200/28`. Same four answers.
3. Can `10.101.1.50/25` talk to `10.101.1.130/25`? Show why.
4. Divide `192.168.7.0/24` into eight equal subnets. List the network address of each.
5. A node reports `169.254.9.44`. What happened, and what is the fix?
6. You need 100 devices in one network. What is the smallest prefix that holds them?

*Answers: (1) .128, .191, .129, .190, 62. (2) .192, .207, .193, .206, 14. (3) No, .50 is in the
0 to 127 block and .130 is in the 128 to 255 block. (4) /27, block size 32, so .0 .32 .64 .96
.128 .160 .192 .224. (5) DHCP with no server, set a static address in the scheme. (6) /25, which
holds 126.*

### Part 2: build and separate (20 minutes, groups of four)

Each group gets a managed switch, four leads and four machines.

1. Design a VLAN scheme for two departments plus management, using the worked table as a model.
   Write it on paper **first**, including VLAN IDs, subnets and port assignments.
2. Configure the VLANs on the switch. Access ports for devices, and park the unused ports.
3. Set static IPs to match your scheme.
4. Prove the separation: devices inside a VLAN can ping each other, devices across VLANs cannot.
   **The failed ping is the deliverable.** Demonstrate it.
5. Save the configuration to non volatile memory and export it.
6. Produce the IP schedule: device name, IP, mask, VLAN, switch port, purpose.

The paperwork is the deliverable, not the ping. Say so before they start.

### Part 3: break and diagnose (15 minutes, assessed)

Rotate groups between prepared fault stations. Each group keeps a fault log: symptom, hypothesis,
test, result, conclusion. **The hypothesis is written before the test is run.** That single
discipline is what separates a technician from someone pressing buttons.

| # | Fault | Expected symptom | Rung | The lesson |
|---|-------|-----------------|------|-----------|
| 1 | Damaged patch lead | No link light | 1 | Always look at the link light first |
| 2 | Wrong subnet mask on one device | Some devices reachable, one not | 3 | The mask defines the neighbourhood |
| 3 | Duplicate IP on two devices | Intermittent, both misbehave | 3 | The worst fault to diagnose. Teach the signature. |
| 4 | Device on DHCP, no DHCP server | `169.254.x.x` | 3 | Recognise 169.254 on sight |
| 5 | **Device port on the wrong VLAN** | **Link light on, nothing reachable** | 2 | Physical connection is not logical connection |
| 6 | **Trunk missing a VLAN** | One department works between switches, another does not | 2 | Trunks must list every VLAN they carry |
| 7 | 120 m cable run | Works, then fails under load | 1 | Limits are real even when they seem to work |
| 8 | Multicast, snooping on, no querier | Works, then stops minutes later | 3 | The show killer. Give this to your strongest group. |

### Part 4: see the packets (5 minutes, demo)

With Wireshark, capture sACN or Art-Net from a software console. Filter to UDP port 5568 or 6454.
Open one packet, find the universe number, find the level data, then move a fader and watch the
bytes change.

Small moment, long memory. The protocol stops being an acronym and becomes visible bytes.

---

## Common misconceptions in this session

- **"The link light is on, so the network is fine."** It means electricity. Nothing more.
- **"It is plugged in, so it is connected."** Fault 5 exists to prove otherwise.
- **"A VLAN is a security feature."** It is a separation feature. Useful for security, and it is
  not a firewall.
- **"I will just widen the mask until it works."** That joins networks you meant to keep apart,
  and it enlarges the broadcast domain. Fix the address, not the mask.
- **"A device on a /8 can see everything, so it can reach the ones on a /24."** A mask is a
  private opinion, not a shared setting. The /8 device decides the /24 device is on this wire and
  speaks to it directly, and those frames arrive. The /24 device decides the other one is somewhere
  else and posts every reply to its gateway, which either does not exist or has no route back. You
  can watch the packets land in Wireshark and still fail to ping. Two masks on one wire is a fault
  even when one direction appears to work.
- **"IP addresses just work."** They work when someone designed a scheme and wrote it down.
- **"A managed switch is better."** More capable and more dangerous. Half configured is worse.
- **"Multicast reduces network traffic."** Only when the switches cooperate.
- **"The VPN is encrypted, so it cannot affect the show network."** A VPN does not sit between your
  laptop and the rig. It adds an interface and rewrites the routing table, and the routing table
  decides where every packet goes. Same-subnet unicast usually survives, so half your tests pass;
  multicast, broadcast, mDNS discovery and anything through the show router do not. The encryption
  is real and it is not the part that breaks your show.
- **"A loop is fine, the switches will work it out."** Only if spanning tree is running. Without it
  a single broadcast is copied forever, because a frame at layer 2 has no time to live to count
  down, and the copies double on every pass until the network stops. Nothing is faulty and every
  link light is on.
- **"We can use the venue Wi-Fi."** No.

---

## Sources and further study

**If this class interested you:** Cisco's Networking Academy runs a free Networking Basics course, and CCNA is the road after it. Both are on [Where to go next](/next).

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

This class covers the three things that need genuine repetition, so this list is longer than the
others. Work through it in order.

### Watch

<!--video:LkolbURrtTs|OSI Model: A Practical Perspective, Part 1|Practical Networking|The clearest treatment of the layer model as something you use rather than recite. Watch it before Class 3 if you can.-->

<!--video:0aGqGKrRE0g|OSI Model: A Practical Perspective, Part 2|Practical Networking|Part 2 follows a packet through the layers. This is the same idea as the encapsulation explainer above, at a slower pace.-->

<!--video:list=PLIFyRwBY_4bQUE4IB5c4VPRyDoLgOdExE|Subnetting Mastery, the full series|Practical Networking|Seven parts, and the best free subnetting teaching available. If the arithmetic in this class did not land, this is the fix. Do the practice examples with a pen, not in your head.-->

### Read

| Source | Why | Cost |
|--------|-----|------|
| [ANSI E1.31 (sACN)](https://tsp.esta.org/tsp/documents/docs/E1-31-2016.pdf) | The multicast addressing and priority rules, from the actual standard | Free |
| [IEEE 802.1Q](https://www.ieee802.org/1/pages/802.1Q.html) | What a VLAN tag really is, at the source | Free drafts |
| [Audinate: Dante network design](https://www.audinate.com/learning/training-certification) | The best free treatment of QoS, IGMP and switch selection for show networks | Free |

### Do

The subnetting trainer on this platform generates new questions endlessly. **Twenty minutes a
night for a week beats three hours the day before.** Target: ten correct in a row, twice.

---

## Homework before Class 4

1. Write up your fault log properly: symptom, hypothesis, test, result, conclusion, for each fault.
2. **Subnetting drill on the platform until you can score 10 out of 10 twice in a row.** This is
   the one piece of homework in the module that needs genuine repetition. Twenty minutes a night
   for four nights beats three hours the day before the exam.
3. Produce a full VLAN and IP scheme for this rig: two lighting consoles, four DMX nodes, one audio
   console, two stage boxes, one media server, one management laptop. Give VLAN IDs, subnets, port
   assignments and a naming convention, and state the convention at the top.
4. Learn the addressing block of `numbers-to-know.md`. The 169.254 one will be in the quiz.
