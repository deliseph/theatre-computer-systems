# Computer Systems & Networking for Theatre and Entertainment Arts

An interactive teaching platform for a module taught to year one BFA students specialising in
**audio, lighting and video**: five taught classes, a production visit and a practical exam.

It answers one question, repeatedly, from different angles:

> Why does an audio, lighting or video artist need to understand computers and networks, and how
> do those systems actually reach the loudspeaker, the fixture and the screen?

---

## The spine

Everything hangs off one sentence, which students should be able to say by the end of Class 1 and
prove by the end of Class 5:

> **Every signal in a modern show is, at some point, a number in a computer's memory, travelling
> over a shared network, with a deadline.**

Under it sits one model that recurs in every class, **the Four Flows**. Any traffic on a show
network is control, media, clock, or management, and each has a character and a specific thing
that kills it. Management traffic is the villain of the module: it has no deadline, therefore no
manners, and putting it on a show VLAN is the most common self-inflicted wound in the industry.

---

## The module

| # | Class | Core question |
|---|-------|---------------|
| 1 | Why this class exists | Why is an ALV artist in a computing class? |
| — | Production visit | Where do these systems physically live? |
| 2 | The machine | What is a show computer, and why is it configured differently? |
| 3 | The network | How does a packet get from a console to a fixture? |
| 4 | Control | How does a computer tell a light or a speaker what to do? |
| 5 | Media over IP and systems | How does the picture itself travel, and how do we stop it failing? |
| — | Practical exam | Can you build, diagnose and document a small system? |

The web platform publishes the **five taught classes** and the production visit's observation
sheet. The **practical exam and the teaching guide are deliberately not in this repository**:
publishing the exam's fault library and mark scheme would defeat the assessment, and the teaching
guide is the lecturer's own working document. Both live in a private pack.

---

## What is in the platform

- **A preparation path.** Every class states what you must already be able to do and where to get
  it, three concrete tasks, and what to bring. A five question readiness check tests the
  prerequisite rather than the content, and names the exact thing to go and fix.
- **59 interactive explainers**, placed inline where each idea is taught. Every one shows a real
  mechanism with the numbers used in the prose, and the controls exist to break it: starve the
  clock with a file copy, drag a subnet boundary through 32 bits, contain a broadcast inside a
  VLAN, watch IGMP memberships time out hours after everything looked fine.
- **15 calculators**, each printing its working, because the exam awards method marks.
- **Teach mode**, a projector view with one section per screen and a block timer that reads its
  planned duration from the block plan.
- **Practice**: an endless subnetting trainer, a fault diagnosis simulator scored on the order you
  investigate in, the Four Flows sort, and flashcards generated from the reference tables.
- **A bilingual glossary**, 334 terms, English and 繁體中文, following [showstack](https://showstack-inky.vercel.app/) where the two overlap.

---

## Repo layout

| Path | What |
|------|------|
| `foundations.md` | Bits and bytes, powers of two, binary, hex. The primer everything assumes. |
| `01`, `03` to `06` | The five taught classes |
| `02-session-02-production-visit.md` | The venue visit, with observation sheet |
| `study-guide.md` | Student facing, per class, with self tests |
| `glossary.md` | 334 terms, EN and 繁中 |
| `field-commands.md` | The field card: commands, and setting an address on four platforms |
| `lineage.md` | How we got here: why each technology exists and what it charged for it |
| `numbers-to-know.md` | The reference card |
| `site/` | The static site generator and the platform itself |

---

## Running it

Zero dependencies. Node 18 or newer.

```bash
node site/build.mjs     # renders the markdown into site/public
node site/serve.mjs     # http://localhost:4173
```

## Deploying

`vercel.json` at the repo root configures the build:

```
buildCommand      node courses/theatre-computer-systems/site/build.mjs
outputDirectory   courses/theatre-computer-systems/site/public
installCommand    echo 'no dependencies'
```

Adjust those two paths to `site/build.mjs` and `site/public` when this folder is the repo root.

---

## Design notes

**The markdown is the single source of truth.** The generator reads it and emits static HTML.
Flashcards and drill cards are generated from the reference tables at build time, so they cannot
drift from what is taught. Explainers are placed with a `<!--anim:id-->` marker in the prose, so
they sit exactly where the idea is introduced and are carried into teach mode for free. The build
fails if a marker is not alone on its line.

**No dependencies, deliberately.** A hand-rolled markdown subset parser and vanilla JavaScript,
so the site builds anywhere Node runs with nothing to install and nothing to go stale.

**Nothing phones home.** Video embeds are click-to-load, so a class page open on a projector makes
no third-party requests until a student presses play. Progress is stored per browser and never
leaves the device.

---

## Licence

Not yet chosen. Until one is added here, treat this as **all rights reserved**: readable, not
licensed for reuse.
