# Teaching platform

The interactive site for the five taught classes. Static, zero dependencies.

## Local

```bash
node build.mjs      # renders ../*.md into ./public
node serve.mjs      # http://localhost:4173
```

## How it is built

`build.mjs` reads the authored markdown one directory up, so the markdown stays the single
source of truth and nothing is duplicated. It emits 16 static routes into `public/`.

| Piece | File |
|-------|------|
| Markdown subset parser | `lib/markdown.mjs` |
| Site generator, routes, search index | `build.mjs` |
| Exercise data written by hand | `data/interactive.mjs` |
| Shell: theme, nav, tabs, search, progress | `assets/app.js` |
| Nine calculators | `assets/tools.js` |
| Subnetting trainer, fault sim, flows sort, drills | `assets/practice.js` |
| Projector mode and block timer | `assets/teach.js` |
| Design system | `assets/styles.css` |

Flashcards for the numbers drill and the glossary are generated from the markdown tables at
build time, so they cannot drift out of sync with what is taught.

`data/interactive.mjs` holds only what the prose cannot supply: a correct answer, a distractor
and an explanation. That is the Four Flows deck, the fault scenarios and the model answers.

## Deploying

Vercel builds from the **repository root**, using `vercel.json` at the repo root:

```
buildCommand      node courses/theatre-computer-systems/site/build.mjs
outputDirectory   courses/theatre-computer-systems/site/public
installCommand    echo 'no dependencies'
```

Root directory is left as the repository root on purpose. Pointing Vercel at this folder
instead would cut the build off from `../*.md` unless "include files outside the root
directory" is enabled, and the markdown must not be duplicated to work around that.

`site/vercel.json` carries the equivalent settings for the case where this folder is deployed
standalone. In that case put a copy of the markdown in `site/content/`, which `build.mjs`
prefers over `../` when it exists.

## Adding a class

1. Write the markdown alongside the others.
2. Add an entry to `CLASSES` in `build.mjs`: file, title, the study-guide and
   reference-card section keys, and which tools and practice widgets the class page should carry.

Teach mode splits at every `##` and `###`, one section per screen, and its clock is a plain
stopwatch you start when a block starts. The course deliberately carries no fixed schedule:
blocks are an order of work, not a timetable.
