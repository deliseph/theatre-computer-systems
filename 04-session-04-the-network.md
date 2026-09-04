# Session 4: The Network
**4 hours. Content.**

*How does a packet get from a console to a fixture, and what are all the ways that goes wrong?*

The most directly employable session in the module. A first year who leaves this session able to
calculate a subnet, plan a set of VLANs and diagnose a dead link is already useful on a get in.

This session carries three skills that need genuine repetition to stick: the OSI model as a
diagnostic ladder, subnet arithmetic, and VLAN separation. The classroom hours introduce them.
The drill happens on the platform, outside class, and it is not optional.

---

## Before this class

**Time needed: 90 minutes, spread over several days.** This is the heaviest preparation in the
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
2. Convert between CIDR prefix and dotted decimal mask, and calculate the network address,
   broadcast address, usable host range and host count for any given address and mask.
3. Divide an address range into a stated number of subnets and write the resulting scheme down.
4. Explain what a VLAN is, distinguish access from trunk ports, and design a VLAN scheme that
   separates lighting, audio, video and management.
5. Distinguish unicast, broadcast and multicast, and explain why IGMP snooping matters on a show.
6. Diagnose a broken network systematically, from the bottom of the stack upwards.

---

## Block plan

| Length | Block | Title |
|------|-------|-------|
| 5 min | | Numbers quiz |
| 50 min | A | The OSI model, and the layers you can touch |
| 10 min | | Break |
| 50 min | B | Addressing and subnet arithmetic |
| 10 min | | Break |
| 50 min | C | Switching, VLANs and segmentation |
| 10 min | | Break |
| 50 min | D | Lab, build it, subnet it, break it, fix it |
| 5 min | | Wrap and homework |

*If splitting into two 2 hour blocks, split after Block B.*

---

## Block A: The OSI model, and the layers you can touch (50 min)

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

This is the payload of the whole block. Write it on the board and leave it up for the rest of
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

### Layer 1 in detail: copper

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

### Layer 1 in detail: fibre

- Multi mode for in building runs of hundreds of metres, single mode for kilometres.
- Immune to electrical interference, which is why it goes between buildings and past dimmer racks.
- **LC** is the common small connector, **opticalCON** the rigged and abused version.
- **SFP** is the swappable transceiver that turns a switch port into a fibre port. Hold one up.

### Layer 1 in detail: speed and power

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

### Layer 2: MAC addresses and what a switch actually does

- A **MAC address** is burned into the hardware, six bytes, written `00:1D:C1:0A:2B:3C`. You look
  it up, you do not set it.
- A **switch** learns which MAC address is on which port by watching traffic, and builds a table.
  After that it forwards a frame only to the port where that MAC lives.
- This is why a switch is not a hub. A hub repeated everything to everyone. A switch is selective,
  and that selectivity is what makes a modern show network possible.

<!--anim:switch-learning-->
- **VLAN tags live here**, at layer 2. That matters in Block C.

---

## Block B: Addressing and subnet arithmetic (50 min)

The hardest 50 minutes in the module for a first year, and the most valuable. Go slowly, do
everything on the board, and make them calculate out loud.

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

Make them learn this column. It is nine numbers and it unlocks everything that follows.

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

For any address and mask, a technician needs four answers. Do this worked example on the board,
then make them do two more themselves.

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

### Within a range, reserve blocks by device type

Any scheme works. Having one, writing it down, and labelling the devices to match is the skill.

```
.1   to .9     infrastructure (switches, gateways)
.10  to .49    consoles and servers
.50  to .199   nodes and endpoints
.200 up        temporary and test devices
```

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

## Block C: Switching, VLANs and segmentation (50 min)

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

### A worked VLAN scheme

The design to give them, and the one they will reproduce in the lab.

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

### QoS

Priority. When a link is congested, the switch decides what goes first. Clock traffic gets the
highest priority, then media, then everything else.

Tie it back to the Four Flows: QoS is how you protect flows that have a deadline from the flow
that has none. It is the technical answer to the villain of Class 1.

### Segmentation strategy

Four options. Have them argue for one before you give your view.

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

### Wireless

Said firmly, one slide. Wi-Fi is a **shared, contended medium with no delivery guarantee and
variable delay**, and in a room with 900 audience phones it degrades at exactly the moment you
need it.

- Acceptable: an operator focus tablet, a monitoring dashboard, a projector remote.
- Not acceptable: anything that must happen. No show critical control, no media, no clock.
- If you must, use a dedicated access point on a dedicated channel, and keep the wired path primary.

---

## Block D: Lab, build it, subnet it, break it, fix it (50 min)

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
- **"IP addresses just work."** They work when someone designed a scheme and wrote it down.
- **"A managed switch is better."** More capable and more dangerous. Half configured is worse.
- **"Multicast reduces network traffic."** Only when the switches cooperate.
- **"We can use the venue Wi-Fi."** No.

---

## Sources and further study

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

## Homework before session 5

1. Write up your fault log properly: symptom, hypothesis, test, result, conclusion, for each fault.
2. **Subnetting drill on the platform until you can score 10 out of 10 twice in a row.** This is
   the one piece of homework in the module that needs genuine repetition. Twenty minutes a night
   for four nights beats three hours the day before the exam.
3. Produce a full VLAN and IP scheme for this rig: two lighting consoles, four DMX nodes, one audio
   console, two stage boxes, one media server, one management laptop. Give VLAN IDs, subnets, port
   assignments and a naming convention, and state the convention at the top.
4. Learn the addressing block of `numbers-to-know.md`. The 169.254 one will be in the quiz.
