# Session 7: Practical Exam
**4 hours. Assessment. 25 percent of the module.**

> **STATUS: DRAFT SKELETON.** Per the brief, the exam is to be developed separately. What
> follows is the structural proposal, so the module hangs together and so sessions 1 to 6 can
> point at it honestly. The open items at the foot of this file need a working session against
> the actual lab kit before this is issued to students.

---

## Design principles

Stated first, because they determine every later decision.

1. **It must be practical, not written.** The module taught hands and judgement. A written paper
   would assess neither, and would reward the students who read rather than the students who built.
2. **It must be individual.** Sessions 3, 4, 5 and 6 were all team assessed. Somewhere the
   module has to find out what each student can do alone.
3. **It must be diagnostic, not just constructive.** Building a working system is half the job.
   Finding out why a system that should work does not is the other half, and it is the half that
   employs people.
4. **It must reward the arithmetic.** A student who guesses correctly and a student who
   calculates correctly should not receive the same mark.
5. **It must be survivable.** Year one, first practical exam, four hours. Design it so that a
   student who fails one station can still pass the exam.

---

## Proposed structure: four stations, rotating

Four stations, 45 minutes each, 15 minutes of rotation and reset between. Students rotate
individually or in pairs depending on cohort size and kit availability.

| Station | Assesses | Sessions drawn on |
|---------|----------|-------------------|
| **A. Build** | Configure a small working system from a written brief | 4, 5 |
| **B. Diagnose** | Find and fix three planted faults, working systematically | 4, 5 |
| **C. Calculate** | Data rate, latency budget, universe count, storage throughput | 3, 5, 6 |
| **D. Document and defend** | Produce the paperwork, then answer questions on it | 2, 6 |

### Station A: build (45 minutes)

Given a written brief, a switch, cables, a node, a fixture and a laptop, produce a working system.

Draft task shape:
- Set static IPs on all devices according to a stated convention.
- Get sACN or Art-Net from a software console through the node to a fixture.
- Get a cue application triggering a change via OSC or MIDI.
- Label everything.

Assessed on: it works, addressing is correct and conventional, cabling is tidy and terminated
correctly, labels match the paperwork.

### Station B: diagnose (45 minutes)

A pre built system that does not work. Three planted faults, of graded difficulty. The student
records symptom, hypothesis, test, result and conclusion for each, in writing, **before** acting.

Fault library to draw from, all met in sessions 4 and 5:
- Damaged patch lead.
- Wrong subnet mask.
- Duplicate IP address.
- Device on DHCP with no server, sitting on `169.254.x.x`.
- Missing DMX terminator.
- Wrong universe number in the node.
- Art-Net device on `2.x.x.x` while the console is on `192.168.x.x`.
- Device on the wrong VLAN.
- Multicast with snooping enabled and no querier.

**Marking note that matters:** the written diagnostic reasoning must carry marks independently of
whether the fault was found. A student who reasons correctly and runs out of time has demonstrated
the skill. A student who finds it by randomly reseating cables has not.

### Station C: calculate (45 minutes)

Closed book except for `numbers-to-know.md`, which they may bring. Written, on paper, working
shown.

Draft question shapes:
- Universe count for a stated pixel rig, including the arithmetic.
- Data rate for a stated video format, and whether it fits a stated link.
- Storage sustained throughput required for a stated number of playback layers in a stated codec.
- A latency budget across a stated signal path, totalled, with a pass or fail judgement against a
  perceptual threshold, and one sentence justifying the judgement.
- One question requiring a **choice with a justification**, for example Art-Net or sACN for a
  given rig, or NDI or ST 2110 for a given screen.

The last one is the one that separates the top of the cohort.

### Station D: document and defend (45 minutes)

Given a small system that is already built and running, produce:
- A signal flow diagram.
- An IP schedule.
- A single point of failure analysis, three items, sorted into the three consequence columns.

Then a five minute viva at the station. Two questions, drawn from a bank, for example: *if this
switch dies mid show, what does the audience experience, and what do you do?*

Assessed against criteria 3 and 4 of the module rubric, primarily.

---

## Draft weighting

| Station | Weight within the exam |
|---------|-----------------------|
| A. Build | 30% |
| B. Diagnose | 30% |
| C. Calculate | 20% |
| D. Document and defend | 20% |

Rationale: build and diagnose carry the most because they are the practical skills the module
exists to produce. Calculate is capped at 20% so that a student who is weak on arithmetic under
time pressure can still pass on demonstrated competence.

---

## Access, fairness and contingency

- Students with additional time provision need a station design that scales. Four independent
  45 minute stations handle this cleanly, which is one reason to prefer this structure over a
  single long task.
- Kit failure during the exam is a real risk. Every station needs a spare of its critical item,
  prepared and tested the day before.
- If a station fails irrecoverably for one student, the fallback is a re sit of that station only,
  not the whole exam. Write this into the brief so it is a stated policy rather than an
  improvisation.

---

## Open items, for a working session

- [ ] Confirm the exact kit available for four simultaneous stations, and reduce or duplicate
      stations accordingly. This constrains everything else.
- [ ] Write the Station A brief in full, with the exact addressing convention to be used.
- [ ] Select and prepare the three faults per Station B set, and produce at least two variant
      sets so that later rotations cannot be told the answers by earlier ones.
- [ ] Write the Station C paper, in two variants, plus a full mark scheme with method marks.
      Method marks matter here: award for correct method with an arithmetic slip.
- [ ] Write the Station D viva question bank, at least twelve questions.
- [ ] Write the student facing exam brief, issued at the end of session 6, stating structure,
      timing, what to bring, and the re sit policy.
- [ ] Decide individual versus pairs at Stations A and B, against cohort size.
- [ ] Confirm the whole thing against programme assessment regulations, including moderation and
      the second marking requirement.
- [ ] Dry run the full rotation with a colleague, timed. Four hours goes faster than it reads.
