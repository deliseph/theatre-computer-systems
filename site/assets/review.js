// Spaced retrieval.
//
// The drills tested you and then forgot. Everything reset on reload, nothing
// ever came due, and the only number worth beating was one high score. So the
// site could tell a student they had answered 200 cards and not which four
// they keep missing.
//
// This is a Leitner box: a card you get right moves up and comes back later, a
// card you miss drops to the front and comes back tomorrow. It is the oldest
// and cheapest implementation of the spacing effect, it needs one small object
// in localStorage, and it turns an endless deck into a sitting that ends.
//
// The design rule it is held to: a key, not a cage. It never nags, it has no
// streak to break, missing a week costs nothing but a few cards coming due,
// and finishing says so and stops.

const KEY = 'tcs-review';
const DAY = 86400000;

// Box 0 is "missed, come back tomorrow". A card missed in this sitting is also
// re-queued in memory so it is seen again before you leave, which the store
// deliberately does not model: the day count and the sitting are different
// things and conflating them makes the due count climb while you work.
export const INTERVALS = [1, 1, 3, 7, 21, 60];

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const write = (v) => {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window */ }
};

/** A stable id for a card, so a deck rebuilt at build time keeps its history. */
export const cardId = (c) => `${c.tag || 'x'}|${(c.q || c.text || '').slice(0, 80)}`;

/** Cards this student has never seen, plus cards whose due date has passed. */
export function due(cards, now = Date.now()) {
  const st = read();
  const fresh = [], ready = [];
  for (const c of cards) {
    const s = st[cardId(c)];
    if (!s) fresh.push(c);
    else if (s.due <= now) ready.push({ c, due: s.due });
  }
  // Oldest overdue first: those are the ones closest to being forgotten.
  ready.sort((a, b) => a.due - b.due);
  return { fresh, ready: ready.map((r) => r.c) };
}

/** How many cards are waiting, split into new and returning. */
export function counts(cards, now = Date.now()) {
  const { fresh, ready } = due(cards, now);
  const st = read();
  const learning = cards.filter((c) => { const s = st[cardId(c)]; return s && s.box <= 1; }).length;
  const known = cards.filter((c) => { const s = st[cardId(c)]; return s && s.box >= 4; }).length;
  return { fresh: fresh.length, ready: ready.length, learning, known, total: cards.length };
}

/**
 * Record an answer. Right moves the card up one box, wrong sends it back to
 * the front, because a card you have just missed is not a card you know.
 */
export function grade(card, right, now = Date.now()) {
  const st = read();
  const id = cardId(card);
  const prev = st[id] || { box: 0, seen: 0 };
  const box = right ? Math.min(INTERVALS.length - 1, prev.box + 1) : 0;
  st[id] = { box, due: now + INTERVALS[box] * DAY, seen: (prev.seen || 0) + 1, last: now };
  write(st);
  return st[id];
}

/** When the next card comes back, for the "nothing due" message. */
export function nextDue(cards, now = Date.now()) {
  const st = read();
  let soonest = Infinity;
  for (const c of cards) {
    const s = st[cardId(c)];
    if (s && s.due > now && s.due < soonest) soonest = s.due;
  }
  return soonest === Infinity ? null : soonest;
}

export function describeWhen(ts, now = Date.now()) {
  if (ts == null) return null;
  const d = Math.round((ts - now) / DAY);
  if (d <= 0) return 'later today';
  if (d === 1) return 'tomorrow';
  if (d < 7) return `in ${d} days`;
  if (d < 14) return 'in a week';
  return `in ${Math.round(d / 7)} weeks`;
}

/** Forget everything, for a student who wants to start the deck again. */
export function reset() { write({}); }
