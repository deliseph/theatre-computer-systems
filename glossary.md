# Glossary 詞彙表
## Computer Systems & Networking for Theatre and Entertainment Arts

Roughly 312 terms, grouped by domain. Bring it to every session. Add to it.

**On the Chinese:** 繁中 terms follow Taiwan convention, with common Hong Kong variants noted
where they differ meaningfully. Learn the **English** term as the operational one, because every
menu, every error message, every piece of paperwork and every conversation on an international
crew is in English. The Chinese is there to build the concept. The English is what you say on
headset.

常見地區差異：網路（台）／網絡（港）、數位（台）／數碼（港）、解析度（台）／解像度（港）、
影格（台）／幀（通用）。

---

## A. Foundations 基礎概念

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| Bit | 位元 | One binary digit, 0 or 1. The smallest unit of everything in this module. |
| Byte | 位元組 | Eight bits. One DMX slot is one byte, which is why a DMX level has 256 steps. |
| Binary | 二進位 | Counting with only 0 and 1. Why values keep landing on 256, 512 and 1024. |
| Sampling | 取樣 | Measuring a continuous signal at regular intervals. How sound becomes numbers. |
| Sample rate | 取樣率 | How many measurements per second. 48 kHz is the professional standard. |
| Bit depth | 位元深度 | How precisely each measurement is stored. 24 bit is the production standard. |
| Quantisation | 量化 | Rounding each measurement to the nearest available value. The rounding error is the noise floor. |
| Nyquist frequency | 奈奎斯特頻率 | Half the sample rate. The highest frequency you can represent. 48 kHz gives 24 kHz, above human hearing. |
| Dynamic range | 動態範圍 | The span between the quietest and loudest usable signal. About 6.02 dB per bit. |
| ADC | 類比數位轉換器 | Analogue to digital converter. Where sound becomes numbers. Adds a small, fixed latency. |
| DAC | 數位類比轉換器 | Digital to analogue converter. Where numbers become sound again. |
| Analogue | 類比 | A continuously varying signal. Voltage that looks like the waveform. |
| Digital | 數位（港：數碼） | A signal represented as numbers. Copyable without loss, and requiring a clock. |
| Hexadecimal (hex) | 十六進位 | Base 16, digits 0 to F. One byte is exactly two hex digits, `00` to `FF`, which is the only reason it is used. |
| Two's complement | 二補數 | How a signed number is stored in bytes. At 16 bit it gives the range −32,768 to +32,767, with silence at 0. |
| Endianness | 位元組順序 | Whether the low byte or the high byte is written first. WAV is little endian, AIFF and PNG are big endian. Read one as the other and you get full scale noise. |
| Magic number | 檔案識別碼 | The fixed first bytes that say what a file really is. `FF D8 FF` is always a JPEG, whatever the extension says. |
| Header | 檔頭 | The block at the start of a file describing what follows: rate, channels, size, resolution. A player reads it before it can play anything. |
| Checksum / CRC | 校驗碼 | A value computed over data so a reader can tell it arrived intact. The difference between knowing a file is corrupt and guessing. |
| CPU | 中央處理器 | The general purpose processor. Limits how much work fits between two deadlines. |
| Core | 核心 | One independent processing unit inside a CPU. More cores helps parallel work, not serial work. |
| Clock speed | 時脈速度 | How fast a processor cycles. Matters most for a single serial chain, such as one audio channel of plugins. |
| RAM | 記憶體 | Fast working memory. Limits how much media can be held ready rather than fetched from disk. |
| Storage | 儲存裝置 | Where files live. Judge it by sustained throughput, not by capacity. |
| Sustained throughput | 持續傳輸速率 | The speed a drive can actually hold for minutes. The number that matters for playback. |
| Burst speed | 突發速度 | The peak speed a drive can hit briefly. The number in the advertisement. Not useful to you. |
| SSD | 固態硬碟 | Solid state drive. No moving parts. SATA SSDs read at roughly 550 MB/s. |
| NVMe | NVMe 固態硬碟 | A fast SSD connected over PCIe. Thousands of MB/s. What a media server needs. |
| GPU | 圖形處理器 | Graphics processor. Does three separate jobs: render, decode and output. |
| PCIe | PCIe 匯流排 | The high speed internal bus. Everything fast connects through it and shares its capacity. |
| Bus | 匯流排 | Any shared internal pathway. Shared means contended. |
| Driver | 驅動程式 | Software that lets the operating system talk to hardware. The wrong audio driver is why your first attempt sounded late. |
| ASIO | ASIO | The low latency audio driver standard on Windows. Use it. |
| Core Audio | Core Audio | The built in low latency audio system on macOS. |
| Operating system | 作業系統 | The software that decides which program runs when. Not built for your deadline. |
| Kernel | 核心程式 | The core of the operating system. Where scheduling decisions are made. |
| Real time OS | 即時作業系統 | An operating system that guarantees a deadline. Your show machine is almost certainly not running one. |
| Buffer | 緩衝區 | A holding area that absorbs timing variation. The only defence against jitter, and it costs latency. |
| Buffer size | 緩衝區大小 | How many samples are processed per block. 128 samples at 48 kHz is 2.67 ms. |
| Dropout | 爆音／斷音 | An audible click or gap when a deadline is missed. |
| Latency | 延遲 | Delay. If it is constant, measure it and compensate for it. It is a budget, not a fault. |
| Jitter | 抖動 | Variation in delay. Cannot be compensated for, only absorbed by a buffer. This is what breaks shows. |
| Bandwidth | 頻寬 | How much data a link can carry per second. |
| Data rate | 資料速率 | How much data a signal actually produces per second. Compare it against bandwidth. |
| Firmware | 韌體 | Software inside a device. Fixtures, nodes and switches all run firmware, and it can be out of date. |
| Boot | 開機 | Starting up. How long a system takes to boot from cold is a real operational number. Measure it. |

---

## B. Media formats 媒體格式

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| Codec | 編解碼器 | The compression method. H.264, ProRes, HAP. Says how the picture is stored. |
| Container | 容器格式 | The file wrapper. `.mov`, `.mp4`, `.mkv`. Says how the parts are packed, not how they are compressed. |
| Intra frame | 幀內壓縮 | Every frame is complete on its own. Large files, instant scrubbing. Right for show playback. |
| Inter frame | 幀間壓縮 | Frames described as differences from other frames. Small files, slow jumps. Right for delivery. |
| H.264 / H.265 | H.264／H.265 | Inter frame delivery codecs. What clients send you. Not what you play back from. |
| ProRes | ProRes | Intra frame mezzanine codec. Large, high quality, edits and plays back well. |
| HAP / DXV | HAP／DXV | GPU accelerated intra frame playback codecs. Why a media server can run many layers at once. |
| Transcode | 轉檔 | Converting from one codec to another. Turning delivered H.264 into HAP is not bureaucracy, it is what makes a cue jump instantly. |
| Resolution | 解析度（港：解像度） | Pixel dimensions, width by height. |
| Raster | 點陣 | The grid of pixels making up a picture. |
| Frame rate | 影格率／幀率 | Complete pictures per second. 24, 25, 30, 50, 60. Mismatches cause judder. |
| Pixel | 像素 | One picture element. An RGB pixel needs 3 DMX channels when it is a lighting pixel. |
| Chroma subsampling | 色度取樣 | Storing less colour detail than brightness detail. 4:4:4, 4:2:2, 4:2:0. Cheap compression that fails on fine coloured text. |
| Colour depth | 色彩深度 | Bits per colour component. 8 bit gives 256 steps, 10 bit gives 1024. |
| Colour space | 色彩空間 | The definition of what the numbers mean as colours. Mismatches produce washed out or crushed blacks. |
| Banding | 色帶 | Visible steps in a smooth gradient. The reason 10 bit matters on a large LED wall. |
| Judder | 畫面頓挫 | Uneven motion from a frame rate mismatch. Invisible on a static image, obvious on a slow pan. |
| Tearing | 畫面撕裂 | A visible horizontal split when a frame changes mid draw. A genlock problem. |
| Interlaced | 交錯掃描 | Half the lines per field, an old broadcast technique. Marked `i`, as in 1080i. |
| Progressive | 逐行掃描 | Every line, every frame. Marked `p`, as in 1080p. What you want. |
| PCM | 脈衝編碼調變 | Uncompressed audio. Each sample is simply a whole number saying where the waveform was. Nothing clever, and nothing lost. |
| Luma (Y) | 亮度 | The brightness plane, `0.299 R + 0.587 G + 0.114 B`. The weights are a measurement of the eye, not a convention. |
| Chroma (Cb, Cr) | 色度 | The two colour difference planes. They carry far less detail than luma, which is what makes subsampling almost invisible. |
| Lossless compression | 無失真壓縮 | Smaller, and every original byte comes back exactly. PNG and FLAC. Safe for masters, and useless on content with no repetition. |
| Lossy compression | 失真壓縮 | Smaller by discarding information permanently. Every delivery format you receive. |
| Run length encoding (RLE) | 遊程編碼 | Storing a repeat as a count plus a value. Enormous on a title card, and actually larger than the original on film grain. |
| Entropy coding | 熵編碼 | Short codes for common symbols, long codes for rare ones. The same idea as Morse giving `E` one dot. Lossless. |
| DCT | 離散餘弦轉換 | The transform that rewrites an 8 × 8 block as coefficients from coarse to fine. Reversible on its own; it only sets up the step that is not. |
| Quantisation table | 量化表 | The 64 divisors applied to those coefficients before rounding. This table *is* the quality setting, and it is stored in the file. |
| Macroblock | 巨集區塊 | The block a codec works on. The squares you see when a stream fails were always there; the failure only made them visible. |
| Motion vector | 運動向量 | An instruction saying a block is the one from over there, shifted. Cheaper than resending the block, and it is why predictable motion is cheap. |
| I frame / keyframe | 關鍵影格 | A complete picture, compressed on its own. The only place an inter frame codec can start decoding. |
| P frame | 預測影格 | Stores only what changed since the previous frame. |
| B frame | 雙向預測影格 | Looks both backwards and forwards, and stores least of all. Also why decoding order is not display order. |
| GOP | 影像群組 | Group of pictures. The repeating I, P, B pattern. A long GOP is small and slow to seek in. |
| CBR / VBR | 固定／變動位元率 | Constant bitrate spends the same data every second. Variable bitrate spends it where the picture is hard. VBR looks better; CBR is predictable on a fixed link. |
| Bitrate | 位元率 | Data per second of video. It does not depend on resolution alone: confetti at 1080p can cost more than a locked-off shot at 4K. |
| Additive mixing | 加色混合 | Adding light of different colours. Red plus green is yellow, and nothing in the beam is yellow: the mixing happens in your eye. |
| Gamma | 伽瑪 | The non-linear curve between a stored number and the light emitted. It spends the code values where your eye is sensitive, which is why 8 bit is enough. |
| Gamut | 色域 | The set of colours a device can actually reproduce: the triangle formed by its three primaries. Much smaller than what you can see. |
| Rec.709 / DCI-P3 / Rec.2020 | 色域標準 | Three gamut standards, small to large. HD video, cinema and better walls, and the UHD container that no display fills. |
| Out of gamut | 超出色域 | A colour the source recorded and the display cannot make. Something has to give, and which way it gives is a look. |
| Chromaticity diagram | 色度圖 | The horseshoe. Every visible colour inside it, every display a triangle within it. |
| Colour temperature | 色溫 | Where a white sits along the Planckian locus, in kelvin. It says nothing about how far off that curve you are. |
| Duv / green-magenta | 綠洋紅偏差 | The second axis of white. Two fixtures can share a colour temperature and still not match, and the Kelvin control will not fix it. |
| CRI / TM-30 | 演色性指數 | How faithfully a source renders the colour of the objects it lights. A separate question from hitting a colour target. |
| Spectral power distribution | 光譜功率分布 | What is actually in the beam, wavelength by wavelength. Three narrow spikes and a continuous spectrum can look the same and render differently. |
| CUDA | CUDA | NVIDIA's compute platform. The reason NVIDIA is the industry default: a lot of media software is written against it and has no AMD equivalent. |
| NVENC / NVDEC | 硬體編解碼 | Dedicated encode and decode hardware on the GPU. A codec it does not support falls back to the CPU and the layer count collapses. |
| Mosaic / Eyefinity | 多輸出合併 | Combining several physical outputs into one desktop. NVIDIA's is professional cards only; AMD's works on consumer cards. |
| Head count | 輸出數量 | How many displays one card can drive. Usually four on NVIDIA, up to six on AMD. A hard physical limit, not a setting. |
| Canvas | 畫布 | The total pixel area a media server is producing across all outputs. |

---

## C. Networking 網路

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| Private address range | 私有位址範圍 | `10.x`, `172.16` to `172.31`, `192.168.x`. Not routed on the internet. Every show network lives in one. |
| Public address | 公有位址 | Unique on the internet, issued by a provider. A show device never needs one. |
| NAT | 網路位址轉換 | A router swapping private addresses for its one public address and back. Why inbound connections do not just work. |
| APIPA / 169.254.x.x | 自動私有位址 | The address a machine gives itself when DHCP got silence. No server, no link, or the wrong VLAN. |
| Network profile (Windows) | 網路類型 | Windows labelling a network Public or Private. A firewall setting, nothing to do with addresses, and the usual cause of "it works one way". |
| ipconfig / ifconfig | 位址查詢指令 | The first thing you run. Read the address, the mask, the gateway and the MAC, in that order. |
| ping | 連通測試 | Asks "are you there" at layer 3. Proves reachability, never correctness. |
| tracert / traceroute | 路徑追蹤 | Every router between you and the target. On a show network the answer should be one hop. |
| arp -a | ARP 表查詢 | IP to MAC, locally. The fastest way to find a duplicate IP. |
| netstat | 連線狀態查詢 | What is listening and what is connected. Finds two applications fighting over one port. |
| Network | 網路（港：網絡） | Devices sharing a communication medium. The show backbone. |
| Packet | 封包 | The **layer 3** unit, carrying IP addresses. Survives unchanged across every hop of a journey. |
| Protocol | 通訊協定 | The agreed rules for a conversation. sACN, Dante, NDI and OSC are all protocols. |
| Ethernet | 乙太網路 | The dominant wired networking standard. The Cat lead and the switch. |
| Cat5e / Cat6 / Cat6a | Cat5e／Cat6／Cat6a | Copper cable grades. Cat5e handles 1 Gbit, Cat6a handles 10 Gbit to 100 m. |
| Solid core | 實心線 | Cable for permanent installation. Fails if repeatedly flexed. |
| Stranded | 絞線 | Cable for patch leads that move. |
| Shielded (STP) | 遮蔽線 | Cable with a shield against interference. Only works if grounded correctly. |
| RJ45 | RJ45 接頭 | The standard Ethernet connector. The tab snaps. |
| etherCON | etherCON | A ruggedised shell around an RJ45. What you use for anything that gets rigged or stepped on. |
| Fibre | 光纖 | Glass, carrying light. Immune to electrical interference, goes much further than copper. |
| Multi mode | 多模光纖 | Fibre for in building runs, hundreds of metres. |
| Single mode | 單模光纖 | Fibre for long runs, kilometres. |
| SFP | SFP 模組 | A swappable transceiver that turns a switch port into a fibre port. |
| Switch | 交換器 | A **layer 2** box connecting devices on one network. Forwards by MAC address, passes broadcasts on within the VLAN, and cannot reach another network. |
| Managed switch | 網管型交換器 | A switch with configuration: VLANs, IGMP snooping, QoS. More capable and more dangerous. |
| Unmanaged switch | 非網管型交換器 | A switch with no configuration. On a small dedicated network this is often the safer choice. |
| Router | 路由器 | A **layer 3** box joining different networks. Forwards by IP, builds a new frame at every hop, and stops broadcasts. Show networks often have none, deliberately. |
| Access point | 無線基地台 | A **layer 2** box bridging wireless devices onto an existing wired network. It does not create a network, and it does not route. Operator tablets, never show critical control. |
| Layer 3 switch | 三層交換器 | A switch that can also route between its own VLANs. The sensible middle ground on a large permanent installation. |
| NAT | 網路位址轉換 | Network address translation, rewriting addresses between an inside and an outside network. Present in every domestic router, and almost never wanted on a show. |
| Frame | 訊框 | The **layer 2** unit, carrying MAC addresses. Cannot cross a router: it is rebuilt with new MAC addresses at every hop. |
| Segment / datagram | 區段／資料包 | The **layer 4** unit. Segment for TCP, datagram for UDP. Carries the port numbers. |
| Broadcast domain | 廣播網域 | Everything that must receive a broadcast. One VLAN is one broadcast domain, and a router is where it stops. |
| ARP | 位址解析協定 | How a device finds the MAC address for an IP address, by asking the whole network. The bridge between layer 2 and layer 3, and why a duplicate IP is so confusing. |
| TTL | 存活時間 | A hop counter in every packet, decreasing by one at each router. At zero the packet is discarded, so a routing mistake dies rather than circling forever. It is also how traceroute works. |
| ICMP | 網際網路控制訊息協定 | The layer 3 messenger. `ping` and `traceroute` are ICMP, and so are errors like "destination host unreachable". |
| MTU | 最大傳輸單元 | The largest payload a frame will carry, normally 1500 bytes. Every device on the path must agree, or large transfers fail while small ones work. |
| Jumbo frame | 巨型訊框 | A frame carrying about 9000 bytes instead of 1500, used on some professional media networks. Enable it everywhere on the path or nowhere. |
| Port number | 通訊埠 | A **layer 4** number, 0 to 65,535, saying which program on a device should receive the data. sACN is 5568, Art-Net 6454, PTP 319 and 320. |
| Socket | 通訊端 | An IP address plus a port number. What a program actually listens on. |
| OUI | 製造商識別碼 | The first three bytes of a MAC address, identifying the manufacturer. Useful when working out which device is on which switch port. |
| Frame check sequence | 訊框檢查碼 | A checksum on every frame. A frame that fails it is discarded silently, which is why a marginal cable gives you missing data rather than corrupted data. |
| Port | 埠 | A physical socket on a switch, or a numbered software endpoint such as 5568 for sACN. |
| Link light | 連線指示燈 | The LED that means electricity is flowing. It does **not** mean the network is working. |
| MAC address | MAC 位址／實體位址 | A hardware identifier burned into the device. You look it up, you do not set it. |
| IP address | IP 位址 | The address you assign. Identifies a device on a network. |
| IPv4 | IPv4 | The four number addressing scheme, such as `192.168.1.10`. What you will use. |
| Subnet mask | 子網路遮罩 | Says which part of the address is the neighbourhood and which is the house. `255.255.255.0` is `/24`. |
| CIDR | CIDR 標記法 | The slash notation for a mask. `/24` means the first 24 bits are the network. |
| Gateway | 閘道 | The way out to another network. Show networks often have none. |
| DNS | 網域名稱系統 | Turns names into IP addresses. Rarely present on a show network. |
| DHCP | 動態主機設定協定 | Hands out addresses automatically. Convenient, and the address can change. |
| Static IP | 固定 IP | An address you set and that stays. What show systems use, so it can be written on paper. |
| 169.254.x.x | 自動私有位址 | Link local self assignment. It means **"I asked for an address and nobody answered."** Recognise it on sight. |
| Private address range | 私有位址範圍 | `10.x.x.x`, `172.16` to `172.31.x.x`, `192.168.x.x`. Not routed on the public internet. |
| Unicast | 單播 | One sender, one specific receiver. |
| Broadcast | 廣播 | Sent to everything on the network, whether or not it cares. |
| Multicast | 多播／群播 | Sent once, delivered to everyone who subscribed. What sACN and Dante use. |
| IGMP snooping | IGMP 窺探 | How a switch learns which ports actually want a multicast stream. |
| IGMP querier | IGMP 查詢者 | The device that asks the questions keeping subscriptions alive. Missing querier plus snooping on means streams stop minutes later. |
| VLAN | 虛擬區域網路 | Making one switch behave as several separate switches. How departments share infrastructure without sharing traffic. |
| Access port | 存取埠 | A switch port belonging to one VLAN. Most devices plug into these. |
| Trunk port | 主幹埠 | A switch port carrying several tagged VLANs between switches. |
| QoS | 服務品質 | Priority. Decides what goes first when a link is congested. How you protect clock and media from management traffic. |
| Spanning tree | 生成樹協定 | Prevents loops in a network with redundant paths. Can also cause unexpected pauses. |
| PoE | 乙太網路供電 | Power over Ethernet. Note the switch has a **total** power budget, not just a per port rating. |
| TCP | 傳輸控制協定 | Guaranteed, ordered delivery, with retries. Costs latency. Right for commands that must confirm. |
| UDP | 使用者資料流協定 | Send and hope. No guarantee. Right for real time media, because a retransmitted packet is worthless. |
| Ping | Ping | The basic reachability test. Your first tool after the link light. |
| Packet capture | 封包擷取 | Recording actual network traffic, usually with Wireshark. How you see a protocol instead of guessing at it. |
| Topology | 網路拓撲 | The shape of the network. Star, ring, daisy chain. |
| Segmentation | 網段切分 | Keeping traffic apart, physically or by VLAN. |
| Air gap | 網路隔離 | A show network with no connection to any other network, ever. The strongest reliability posture. |
| Firewall | 防火牆 | Controls what traffic may cross between networks. |

---

## D. Lighting control 燈光控制

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| Dimmer curve | 調光曲線 | The shape between the DMX value and the light. Square law makes fader position match apparent brightness; linear does not. |
| Square law | 平方律 | Output is the level squared. It cancels the cube root in your eye's response, which is why it is the usual default. |
| 16 bit / fine channel | 十六位元細調通道 | A coarse byte plus a fine byte, 65,536 steps. What stops a slow fade or a slow pan from stepping. |
| PWM | 脈寬調變 | How an LED dims: switched fully on and off, fast, on for part of each cycle. Your eye averages it; a camera shutter samples it. |
| Flicker free | 無頻閃 | A PWM rate high enough that any realistic camera shutter averages hundreds of cycles. Test it with the actual camera. |
| Personality / mode | 通道模式 | How many slots a fixture uses and what each one means. Decided by the fixture, not by the desk, and it changes the footprint. |
| Footprint | 佔用通道數 | How many consecutive slots a fixture occupies. Next address equals this address plus this footprint. |
| HTP | 最高優先 | Highest takes precedence. The larger value wins. Safe for dimmers, and it means you cannot take a channel out. |
| LTP | 最後優先 | Latest takes precedence. Necessary for anything that is not a quantity: the highest of two colours is not a colour. |
| Priority (sACN) | 優先權 | A field, 0 to 200, letting a backup sender sit on the same universe and take over cleanly. Art-Net has no equivalent. |
| Tracking | 追蹤式記錄 | A cue records only what it changes, so an edit runs forward into later cues that never mention that channel. |
| Cue only | 單一場記錄 | Every cue stores a complete state. Predictable, and much more work. |
| Block cue | 阻斷場 | A cue with hard values everywhere, so nothing tracks through it. Useful at an act break, damaging everywhere else. |
| Effect engine | 效果引擎 | A shape, a rate and a spread. Nothing moves: fixtures fade at different phases of one curve and your eye reads travel. |
| Spread / offset | 展開／相位偏移 | How the offsets are distributed across the selected fixtures. The control that decides whether an effect reads as one gesture or as travel. |
| DMX512 | DMX512 | The lighting control standard since 1986. 250 kbit/s, 512 slots, still the last hop to almost every fixture. |
| DMX512-A | DMX512-A | The current revision, published by ESTA as E1.11. |
| RS-485 | RS-485 | The balanced electrical standard DMX runs on. Why it survives long runs in a noisy building. |
| Universe | 宇宙（DMX 線路） | 512 channels of DMX data. A quantity of data, **not** a cable. |
| Channel | 通道 | One controllable parameter. One byte, 0 to 255. |
| Slot | 資料槽 | One of the 512 positions in a DMX frame. Often used interchangeably with channel. |
| Address | 位址 | Where a fixture starts listening in the universe. |
| Patch | 迴路對應 | The mapping between control numbers and physical fixtures. |
| Break | 中斷訊號 | The signal marking the start of a DMX frame. |
| Termination | 終端電阻 | A 120 ohm resistor on the last device in a DMX line. Missing it causes reflections and intermittent flicker. |
| Splitter | 分配器 | Takes one DMX line and starts several fresh segments. Necessary past 32 devices. |
| Opto isolator | 光電隔離器 | Electrically separates DMX segments, protecting equipment and cleaning the signal. |
| Daisy chain | 串接／菊鏈 | Device to device to device. The only legal DMX topology. Never a Y split. |
| Unit load | 單位負載 | The electrical demand one device places on an RS-485 segment. 32 maximum per segment. |
| RDM | RDM | Remote Device Management. Bidirectional DMX for discovery, addressing and status. Needs RDM capable splitters. |
| Art-Net | Art-Net | DMX over UDP, port 6454. Very widely supported. Often on `2.x.x.x` or `10.x.x.x`, which is a common addressing trap. |
| sACN / E1.31 | sACN／E1.31 | Streaming ACN. DMX over multicast UDP, port 5568. Has built in priority and defined merging. The modern default. |
| Priority | 優先權 | sACN's mechanism for deciding which source wins on a universe. Essential once there is a backup console. |
| Merge | 合併 | Combining two sources on one universe, usually highest takes precedence. |
| Node | 節點 | A box converting network data to DMX, or the reverse. |
| Gateway | 閘道器 | Any device translating between two protocols. |
| Pixel mapping | 像素映射 | Treating an array of LED pixels as a video surface. Where universe counts explode. |
| Pixel pitch | 點間距 | The distance between LED pixels. Determines resolution and minimum viewing distance. |
| 8 bit dimming | 八位元調光 | 256 steps. Visibly stepped on a slow fade to black at low level. |
| 16 bit dimming | 十六位元調光 | Coarse plus fine byte, 65,536 steps. Smooth fades. Costs a second channel. |
| Dimmer | 調光器 | The device controlling the power to a conventional lamp. |
| Fixture | 燈具 | Any lighting unit. |
| Moving head | 電腦燈／搖頭燈 | A motorised fixture. A computer with a lamp in it, typically 20 to 40 channels. |
| Console | 控台 | The lighting or audio control surface. Increasingly a control surface for a computer elsewhere. |
| Visualiser | 燈光模擬軟體 | Software that renders the rig, so programming can happen without the rig. |

---

## E. Show control 演出控制

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| PJLink | PJLink | A manufacturer independent projector control standard over TCP 4352. Power, input, mute, status. Housekeeping, not creative control. |
| Program change | 音色切換訊息 | The MIDI message most desks and processors expect for recalling a scene or snapshot. |
| Control change | 控制器變化訊息 | A MIDI parameter message, 7 bit, so 128 steps. Coarse for a fade. |
| Show control | 演出控制 | Making departments act together from one trigger or one clock. |
| State based | 狀態式 | The message says what the value **is**, and repeats constantly. A lost packet costs nothing. DMX, sACN. |
| Event based | 事件式 | The message says what should **happen**, once. A lost packet costs you the cue. OSC, MIDI, GO. |
| Cue | Cue／提示 | One instruction to change, at a moment. The atom of theatre operation. |
| Cue list | Cue 表 | The ordered sequence of cues for a show. |
| GO | GO | The instruction to execute the next cue. The single most important event in the building. |
| Trigger | 觸發 | Whatever causes a cue to fire: a button, a timecode value, a MIDI note, a contact closure. |
| OSC | OSC | Open Sound Control. A path plus arguments, such as `/cue/12/start`. Flexible, readable, and with **no standard namespace**, so read the manual every time. |
| MIDI | MIDI | From 1983, musical origin, still everywhere. Notes and control changes used as triggers. |
| MSC | MIDI Show Control | Proper show control over MIDI: GO, STOP, RESUME, addressed to a device type and cue number. Old, limited, dependable. |
| MTC | MIDI 時間碼 | Timecode carried over MIDI. |
| LTC | 線性時間碼 | Timecode as an audio signal. You can hear it. It travels down any audio path, which is exactly why it is used. |
| Timecode | 時間碼 | `hours:minutes:seconds:frames`. The shared clock a large show is built on. |
| Drop frame | 丟幀 | A counting correction for the 29.97 fps rate. A 1953 colour television compromise that still bites people. |
| Frame | 影格／幀 | One picture, and the smallest unit of timecode. |
| RS-232 | RS-232 | Short run serial control. Projectors, screens, machine control. Direct, deterministic and dumb. |
| RS-422 | RS-422 | Balanced serial. Goes further than RS-232. |
| Contact closure | 乾接點 | Two wires. Touching them is a trigger. The dumbest and most reliable interface in the building. |
| GPIO | 通用輸入輸出 | General purpose input and output pins. Contact closure, formalised. |
| Genlock | 同步鎖定 | All video devices agreeing on when a frame starts. Without it, switching mid frame causes tearing. |
| Sync | 同步 | Any mechanism keeping devices in time agreement. |

---

## F. Audio over IP 網路音訊

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| AES3 / AES-EBU | AES3／AES-EBU | Two channels of digital audio down one balanced cable. The ancestor. |
| MADI | MADI | 64 channels down one coaxial or optical cable. Point to point, nothing to configure, still widely used for exactly that reason. |
| Dante | Dante | The dominant audio over IP system in live production. Hundreds of channels over standard Ethernet. |
| Flow | 資料流 | The stream of audio a transmitter sends across the network. |
| Subscription | 訂閱 | A receiver asking for a specific transmitted channel. The patch lives in software, not in copper. |
| Dante Controller | Dante Controller | The software where subscriptions are made. Where the patch actually is. |
| Dante latency setting | Dante 延遲設定 | 0.25, 0.5, 1, 2 or 5 ms. The whole path runs at the highest setting in use. 1 ms is the safe default. |
| AES67 | AES67 | An interoperability standard for audio over IP. Works within tightly specified limits. A bridge, not a merger. |
| Ravenna | Ravenna | Another audio over IP system, common in broadcast, AES67 compatible. |
| Word clock | 字時鐘 | A dedicated cable carrying nothing but the sample tick. Old, simple, effective. |
| PTP | 精確時間協定 | IEEE 1588. Clock distributed over the same network as the media, accurate to well under a microsecond. |
| Grandmaster | 主時鐘 | The device elected to be the clock everyone follows. Two of them is a classic failure. |
| Clock master | 時鐘主控 | Whichever device is the clock reference. Worth knowing which one won, and worth locking deliberately. |
| Drift | 漂移 | Two devices slowly disagreeing about time. Produces a regular periodic click, forever. |
| Redundancy | 備援 | A second path already carrying the load. Not a spare in a case. |
| Primary / secondary | 主要／備援 | Dante's two physically separate networks carrying the same audio. Changeover is inaudible. |
| DSP | 數位訊號處理 | Digital signal processing. Every EQ, compressor and delay in a digital system. |

---

## G. Video over IP and the pixel pipeline 網路影像與訊號鏈

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| SDI | 串列數位介面 | Uncompressed digital video on coaxial cable. One signal, one cable, no configuration. |
| 3G-SDI | 3G-SDI | 2.97 Gbit/s. Carries 1080p60. |
| 12G-SDI | 12G-SDI | 12 Gbit/s. Carries UHD 4K 60. |
| NDI | NDI | Compressed video over standard networks, roughly 100 to 250 Mbit/s for HD. Easy, tolerant, widely used. Know whether your job can accept the compression and the frame of latency. |
| SMPTE ST 2110 | ST 2110 | Uncompressed video over IP, with video, audio and data as separate streams. Needs PTP and 10 Gbit minimum. Broadcast and large installation scale. |
| HDMI | HDMI | Consumer and prosumer video connector. Short runs, EDID negotiation, HDCP copy protection. Three ways to lose an afternoon. |
| DisplayPort | DisplayPort | Computer video output standard. Common on media server graphics cards. |
| EDID | EDID | The conversation where a display tells a source what it can accept. When it fails, the source guesses, and it guesses wrong. |
| HDCP | HDCP | Copy protection in HDMI. Produces a black screen with no useful error. If the screen is black and everything looks correct, suspect HDCP. |
| Scaler | 縮放器 | Converts one resolution to another. |
| Switcher | 切換台 | Selects and mixes between video sources. |
| LED processor | LED 處理器 | Turns a video signal into the data an LED wall needs, and maps it to the physical panel layout. |
| Media server | 媒體伺服器 | The computer playing back and processing video for a show. Openly a computer, unlike a lighting console. |
| IMAG | 現場影像放大 | Image magnification. Live camera of the stage on screens, so the back row can see faces. |
| Projection mapping | 投影對位 | Aligning projected images onto a non flat surface. |

---

## H. Systems and working practice 系統與現場實務

| English | 繁中 | What it is, and why it matters |
|---------|------|-------------------------------|
| Grandmaster | 主時鐘 | The clock everything else follows. Elected automatically unless you choose it, and on a show you choose it. |
| Boundary clock | 邊界時鐘 | A switch that terminates and regenerates PTP rather than passing it through. What makes timing survive a network. |
| Transparent clock | 透明時鐘 | A switch that corrects each timing message for the time it spent inside. The other way to keep PTP honest. |
| Path asymmetry | 路徑不對稱 | The two directions taking different times. PTP averages them, so the follower is wrong by half the difference and reports itself locked. |
| Latency budget | 延遲預算 | The total of every stage in the chain. About 10 ms is where a performer on in-ears feels it, about 40 ms is where lip sync shows. |
| Oversubscription | 超額訂閱 | More traffic able to arrive at a switch than can leave it. Fine for an office, fatal for media. |
| ST 2022-7 | 無縫保護 | Send the same stream down two networks and rebuild from whichever packets arrive. The fastest failover is the one that already happened. |
| Essence separation | 訊號分離 | ST 2110 sending video, audio and data as separate flows. Only the shared clock holds them together. |
| Visually lossless | 視覺無損 | Lossy compression tuned so the loss lands below what the eye finds on normal content. A claim about typical material, not a guarantee. |
| Commissioning | 系統驗收 | Proving the system works, in writing, before the client finds out. Test the failure, not the success. |
| Single point of failure | 單點故障 | One thing that, if it fails, stops the show. Find them all, then decide about each. |
| Failure mode | 故障模式 | The specific way something breaks, and what the audience then experiences. |
| Failover | 故障切換 | Automatic changeover to a backup path. Only real if the backup is already running. |
| Cold spare | 冷備品 | A replacement device in a case. Cheap, and only covers failures where you have time to swap. |
| Manual fallback | 人工備援 | A human doing the thing by hand. Covers everything, badly and slowly, and only if it was rehearsed. |
| Signal flow | 訊號流程 | The path from source to output, drawn. The first document anyone asks for. |
| IP schedule | IP 配置表 | Device name, IP, mask, VLAN, switch, port, purpose. The document you diagnose from. |
| Patch sheet | 接線表 | The physical connections, socket by socket. The document you recable from, in the dark. |
| Universe map | 宇宙配置表 | Universe number to node to port to fixture range. |
| Naming convention | 命名規則 | The rule for naming devices. Be consistent before you are clever, and make the label, the software name and the diagram match exactly. |
| Handover pack | 交接資料 | Everything the next person needs: diagrams, schedules, passwords, known issues. |
| Version control | 版本控制 | Knowing which show file is current and being able to get back to yesterday's. |
| Backup | 備份 | A copy somewhere that is not the machine that will fail. |
| Rack | 機櫃 | The standard 19 inch equipment frame. |
| UPS | 不斷電系統 | Uninterruptible power supply. Ask how long it actually lasts, and whether anyone has tested it. |
| Machine room | 機房 | Where the computers, switches and processing live. |
| Amp room | 功放室 | Where the amplifiers live, and usually where the network becomes a speaker cable. |
| FOH | 前台控制位置 | Front of house. The control position in the auditorium. |
| Get in / load in | 進場／裝台 | Bringing the production into the venue. |
| Get out / load out | 出場／拆台 | Taking it out again, usually at speed, usually at night. |
| Fit up | 裝台 | Building the set and rig in the venue. |
| Tech rehearsal | 技術排練 | Where the technical elements meet the performance for the first time. Where systems fail publicly. |
| Show file | 演出檔案 | The saved state of a console or server. Back it up before every performance. |

---

## The seven terms most often used wrongly by first year students

Learn these properly now. Getting them welded together wrongly takes years to unpick.

| Term | What it is **not** | What it **is** |
|------|-------------------|----------------|
| **Universe** | A cable | 512 channels of DMX data, which may arrive over a network |
| **Channel** | A physical socket | One controllable parameter, one byte, 0 to 255 |
| **Latency** | A fault | A delay, which is a budget you spend deliberately |
| **Jitter** | The same as latency | Variation in delay. The actual fault. |
| **Codec** | A file format | The compression method. The container is the format. |
| **Redundancy** | A spare in a case | A second path already carrying the load |
| **Bandwidth** | Speed | Capacity per second. Compare it against your data rate. |

---

## Add your own

Every cohort meets terms this glossary does not have. Write them here as you meet them, with the
date and where you met them. The version of this document you have written on is worth more than
the version you were given.

| English | 繁中 | What it is | Where I met it |
|---------|------|-----------|----------------|
| | | | |
| | | | |
| | | | |
