# The field card: commands and settings

Everything on this page is something you will type or tap while standing in a venue with somebody
waiting. Learn the six commands in the first table by heart. Look the rest up.

**One rule before any of it.** Run the command, then read what it actually says, then decide. Most
wasted time in a machine room is somebody running the right command and not reading the output.

---

## Block 1: The six commands

| What you want to know | Windows | macOS and Linux |
|----------------------|---------|-----------------|
| What is my address? | `ipconfig /all` | `ifconfig` or `ip addr` |
| Is that box alive? | `ping 192.168.1.50` | `ping 192.168.1.50` |
| Where does it stop? | `tracert 192.168.1.50` | `traceroute 192.168.1.50` |
| Who is on this cable? | `arp -a` | `arp -a` |
| Is anything listening? | `netstat -an` | `netstat -an` or `lsof -i` |
| Does the name resolve? | `nslookup name` | `dig name` or `nslookup name` |

On macOS `ifconfig` still works and Linux has largely moved to `ip addr`. Learn `ifconfig` first,
because it is the one that exists on the machine you are standing at.

---

## Block 2: What each one is actually telling you

### `ipconfig /all` and `ifconfig`

The first thing you run, every time, before forming any opinion.

Read four lines and only four:

| Line | What it means | The alarm |
|------|--------------|-----------|
| IPv4 address | who this machine is | `169.254.x.x` means **nobody answered the DHCP request** |
| Subnet mask | how much of that is the network | a mask that does not match the other device is the fault |
| Default gateway | where anything not local gets sent | blank is normal on a show network, and fine |
| Physical address | the MAC, the hardware identity | the number a switch actually learns |

```
Windows          ipconfig /all
                 ipconfig /release   then   ipconfig /renew     ask again for DHCP
                 ipconfig /flushdns                             clear cached names

macOS            ifconfig en0
                 ipconfig getifaddr en0                         just the address
                 sudo ipconfig set en0 DHCP                     ask again for DHCP

Linux            ip addr show
                 ip route show                                  the gateway
```

**`169.254.x.x` is the single most useful thing on this page.** It is APIPA, the address a machine
gives itself when it asked for DHCP and got silence. It means: no DHCP server, or no link, or the
wrong VLAN. It never means the machine is broken.

### `ping`

Asks "are you there" at layer 3. Four outcomes, and each one means something different:

| What you see | What it means |
|--------------|--------------|
| Replies, low and steady times | it is there and the path is healthy |
| Replies with wildly varying times | the path is congested. **This is jitter, measured.** |
| `Request timed out` | it did not answer. It may still be there and firewalled. |
| `Destination host unreachable` | your own machine does not know how to get there. Check the mask. |

Useful flags: `ping -t` on Windows and `ping` on macOS run until you stop them, which is how you
watch a link while somebody wiggles a cable. `ping -s 1472` sends a large packet, which finds MTU
problems that a small ping walks straight past.

**Ping proves reachability, not correctness.** A node that pings and does not output is a normal
Tuesday: the address is right and something above layer 3 is wrong.

### `tracert` and `traceroute`

Shows every router between you and the target. On a flat show network the answer is usually one
hop, and that is the useful part: **if a trace on a show network shows several hops, somebody has
routed traffic that should have been local.**

Where it earns its keep is the venue network: it tells you exactly which box stops answering, so
you know whose problem it is before the conversation starts.

### `arp -a`

Layer 2. A list of the IP addresses this machine has recently talked to and the MAC address behind
each one. Two things it finds that nothing else does:

- **The duplicate IP.** Two devices on one address, and the ARP table flips between two MACs.
  Nothing else diagnoses this so quickly.
- **The device with an address you did not expect**, which is the touring node still set to last
  venue's scheme.

### `netstat -an`

What is listening, and what is connected. On a show machine the useful question is narrow:

```
Windows     netstat -ano | findstr :6454        who has the Art-Net port?
macOS       sudo lsof -i :6454
            sudo lsof -i UDP:5568               sACN
```

If two applications both want a port, the second one loses, silently. This is why two lighting
applications on one laptop is a bad idea, and this is the command that proves it.

### The rest, when you need them

```
Windows     getmac                              MAC addresses only
            route print                         the routing table
            ipconfig /displaydns
            Test-NetConnection host -Port 6454  PowerShell, tests a port not just a host

macOS       networksetup -listallhardwareports  which interface is which
            netstat -rn                         routing table
            nc -vz host 6454                    tests a single port
            arp -a -d                           clear the ARP cache
```

---

## Block 3: Setting an address, on everything you will meet

**When to use static.** Every show device that another device has to find by address gets a static
IP: consoles, nodes, media servers, processors. DHCP is for laptops, phones and anything that only
needs to reach the internet. A show that depends on a DHCP server is a show with an extra thing to
fail at 19:45.

**Write it down before you type it.** The IP schedule is a document, not a memory.

### Windows 11 and 10

Settings → Network & internet → Ethernet → IP assignment → **Edit** → Manual → IPv4 on. Enter the
address, the mask (or the prefix length, `/24`), and leave the gateway blank if there is no route
off this network.

Faster, and the one to learn:

```
ncpa.cpl                                        opens the adapter list directly
```

Then right click the adapter → Properties → Internet Protocol Version 4 → Properties.

**The Windows trap that costs the most time.** Windows labels each network **Public** or
**Private**, and the firewall behaves completely differently between them. On Public it blocks
most inbound traffic, which means your media server can reach the console and the console cannot
reach it. A network you have just plugged into is Public by default.

Settings → Network & internet → Ethernet → **Network profile type** → Private. Do this before
diagnosing anything else, because the symptom is "it works one way", and that symptom sends people
looking at the switch for an hour.

### macOS

System Settings → Network → the interface → **Details** → TCP/IP → Configure IPv4: **Manually**.

macOS has one feature worth knowing: **Locations**. Network → the three dots menu → Locations →
Edit Locations. Make one called `SHOW` with your static addresses and one called `HOME` with DHCP,
and switch between them in two clicks rather than retyping.

```
networksetup -listallnetworkservices
networksetup -setmanual "Ethernet" 192.168.1.20 255.255.255.0
networksetup -setdhcp "Ethernet"
```

macOS will also happily hold **several addresses on one interface**, which is how you talk to a
device on 2.x.x.x and one on 192.168.x.x without re-patching. Add a second configuration under the
same interface.

### iOS and iPadOS

Settings → Wi-Fi → the **ⓘ** next to the network → Configure IP → **Manual**.

You get IP address, subnet mask, router. There is no static option for cellular, and there is no
Ethernet screen unless a USB adapter is attached, in which case it appears as its own entry under
Settings → Ethernet.

**What this is for.** A focus tablet, a remote for a desk, a monitoring page. Note that iOS will
drop a Wi-Fi network with no internet access unless you tell it not to, and that "no internet" is
the normal state of a show network.

### Android

Settings → Network & internet → Internet → the gear next to the network → **Advanced** → IP
settings → **Static**.

The wording moves between manufacturers. Samsung puts it under the network name after a long
press. The fields are the same everywhere: IP address, gateway, prefix length (type `24`, not
`255.255.255.0`), DNS.

**The Android trap.** Many builds require a gateway and a DNS entry even when there is no route off
the network. Put the switch's address, or the device's own address, in both. It does not have to
be reachable, it has to be filled in.

---

## Block 4: What to type when

| Symptom | First command | What you are looking for |
|---------|--------------|-------------------------|
| No link light | none, look at the cable | the physical layer answers before any command does |
| Device not appearing in software | `ipconfig /all` on your machine | are you even on the same network? |
| Your address starts 169.254 | `ipconfig /release` then `/renew` | no DHCP, or wrong VLAN, or no link |
| It pings but the software cannot see it | `netstat -an`, then the firewall | a port, a profile, or an application |
| Works one way only | Windows network profile | Public against Private, almost every time |
| Intermittent, two devices involved | `arp -a` | one address claimed by two MACs |
| Fine on a small switch, broken on the big one | switch config | IGMP snooping, or a missing querier |
| Fine all afternoon, fails during the show | none. Look at what changed. | somebody joined the network, or a query timed out |

> Every line in that table is somewhere in the diagnostic ladder from Class 3. The commands do not
> replace the ladder, they are how you climb one rung of it and get an answer instead of an
> impression.
