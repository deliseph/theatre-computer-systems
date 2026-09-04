# Session 2: Production Visit
**2 hours. Site visit.**

The visit exists to give every abstract idea in the remaining 16 hours a physical referent.
When you say "amp room" in session 6, they should be able to smell it.

A visit without a task is a tour. This session is built around a hunt.

---

## Learning outcomes

By the end of this session a student can:

1. Locate, in a real venue, where control data becomes light, where audio becomes sound, and
   where a file becomes a picture.
2. Identify the physical network infrastructure of a working venue: switches, patch panels,
   fibre runs, node positions.
3. Draw a legible signal flow sketch of one subsystem, from source to output.
4. Ask a working technician a specific, informed question.

---

## Venue selection

In priority order:

1. **The school's own main house during a production fit up or a technical rehearsal.** Best
   case. Real pressure, real people, no travel.
2. **A commercial receiving house between shows.** Calm, staff have time, but the rig is often
   dark and the systems are not running.
3. **A touring production's get in.** Spectacular, chaotic, hard to talk over, and the crew
   have no time. Only with a very well briefed host.
4. **A broadcast studio or a themed attraction.** Excellent for showing networked video and
   show control at scale, less good for theatre craft context.

**What the venue must have for the session to work:** a comms or machine room you can enter,
a visible network switch, and at least one place where a Cat lead is doing a job that used to
need a different cable.

---

## Pre visit, with the host technician

Send this ahead. It takes them five minutes and doubles the value of the visit.

> We are bringing 20 first year audio, lighting and video students for 2 hours. They know almost
> nothing yet. We are not looking for a tour of the fixtures. We would like to see, and stand
> next to, the following: your main network switch or rack, wherever your DMX or sACN nodes live,
> your amplifier or DSP room, your video or projection position, and wherever your show computers
> sit. If you can spare five minutes to say what breaks most often and how you find it, that is
> the single most valuable thing you can give them.

Ask the host for one war story. A real failure, honestly told, is the most memorable content in
the whole module and no lecturer can manufacture it.

---

## Route and timing

Two hours including travel contingency. Adjust to the building. Split the class into two groups
running the route in opposite directions if the spaces are small, which they will be.

| Length | Location | Focus | Prompt to give them |
|------|----------|-------|---------------------|
| 10 min | Arrival, front of house or stalls | Safety brief, group split, sheets out | "Everything you see today is one of the Four Flows. Label it." |
| 20 min | Control position / FOH | Consoles as computers, operator positions, comms | "What is this console actually connected to? Follow the cables out of the back." |
| 20 min | Machine room / comms rack | Switches, patch panels, fibre, labelling, UPS | "Find the switch. Count the ports in use. Find one label that is wrong." |
| 20 min | Amplifier or DSP room | Audio over IP in the wild, clocking, redundancy | "Where does the network become an analogue speaker cable?" |
| 20 min | Stage and grid | Nodes, DMX runs, fixture data, power and data adjacency | "Find where one Cat lead turns into DMX for many fixtures." |
| 15 min | Video / projection position | Media servers, processors, screen feeds | "How many pixels is that screen, and what is feeding it?" |
| 15 min | Regroup, debrief | Structured debrief, questions to the host | See debrief prompts below |

---

## Observation sheet

Give one per student, printed. Not on a phone. They will use their phone for photos and lose
the sheet in a browser tab otherwise.

### Part A: the hunt (tick and note where)

Find each of these. Write down where it was and one detail about it.

- [ ] **A network switch.** How many ports? Is it in a rack? Is it labelled? Is there more than one?
- [ ] **A point where one Cat cable carries something that used to need a different cable.**
- [ ] **A DMX line.** Where does it start? Is there a terminator on the end of it?
- [ ] **A node or gateway.** Anything converting between network and a local protocol.
- [ ] **A clock master.** Ask a technician which device is the clock. Write down their answer.
- [ ] **A redundant path.** A second cable doing the same job as a first one. Ask why.
- [ ] **A management machine.** A laptop or PC used for configuration rather than for the show.
      Ask whether it is on the show network or a separate one.
- [ ] **A label that is wrong, missing or out of date.** There is always one. Finding it is the
      point.
- [ ] **A single point of failure.** One thing that, if it died, would stop the show.

### Part B: the four flows census

Name one real example of each, seen today, and where it was.

| Flow | What I saw | Where |
|------|-----------|-------|
| Control | | |
| Media | | |
| Clock / sync | | |
| Management | | |

### Part C: numbers

Ask, or estimate, and record:

- How many DMX universes does this venue run?
- How many audio channels travel between stage and control position?
- What is the resolution of the largest screen or projection surface?
- How far is the furthest network run, and is it copper or fibre?
- How long does the whole system take to boot from cold?

### Part D: one question

Write one question for a working technician. Ask it. Write down the answer verbatim.

Good questions, if they need examples: *What breaks most often? How do you know it is the network
and not the device? What is the first thing you check? What would you change about this system if
you could start again?*

### Part E: the sketch (this is the graded deliverable)

Choose **one** subsystem you saw today. Audio, lighting or video, your choice, and it does not
have to be your own specialism.

Draw its signal flow from source to output. On one side of A4, by hand.

Requirements:
- Every box is a real device you actually saw, named.
- Every line is labelled with what it carries (the protocol or signal type) and what physical
  cable it runs on.
- Mark where the signal changes form, for example network to DMX, or digital to analogue.
- Mark at least one thing you could not identify, with a question mark. Honest gaps score better
  than invented certainty.

Due one week later. 10 percent of the module mark.

---

## Debrief (last 15 minutes, on site if possible)

Do this before they scatter. On site, standing up, fast. Memory decays within the hour.

Five prompts, one at a time, hands up, keep it moving:

1. Who found the wrong label? What was it? (Always gets a laugh, always makes the point about
   documentation that session 6 depends on.)
2. What surprised you about how much of this is a computer?
3. Where did you see one cable doing a job that used to need many?
4. What did you see that you could not identify at all? (Write these on a list. This list is
   your session 3 to 6 hook. Refer back to it by name: "remember the box nobody could identify
   in the amp room? That was a Dante bridge, here is what it does.")
5. What is the single point of failure in this venue?

---

## Safety and etiquette, restated on the day

Say this at the door, not in the last session. They will have forgotten.

- Closed shoes. No loose clothing near moving machinery.
- Touch nothing. Not a fader, not a cable, not a lens.
- Ask before photographing. Some productions have strict rules and some staff do not want to be
  in a photo. A no is a no, without discussion.
- Never step over a cable, walk around it.
- Do not stand in a doorway or at the bottom of a ladder.
- Stay off headset channels entirely.
- If anyone says move, move first, ask afterwards.
- Say thank you to the crew. Someone gave up their morning.

---

## If the visit falls through

It happens. The fallback, in one line: run session 2 as a **remote systems teardown**. Use a
published venue technical specification (most receiving houses publish theirs as a PDF) and have
teams reconstruct the venue's network and signal flow from the spec alone, then present. It is a
genuinely good exercise and it is not the same thing. Reschedule the real visit if you possibly
can, ideally as a session 6 systems audit instead.

---

## Homework before session 3

1. Finish the Part E sketch, due in one week.
2. Install the software list. This is now blocking. Session 3 has a lab.
3. Learn the second block of `numbers-to-know.md`.
