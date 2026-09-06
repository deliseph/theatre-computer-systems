// The module map.
//
// Navigation first: sixty five figures across five classes, in the order they
// are taught, so a student who half remembers one can get back to it. That the
// ones they have driven fill in is the second thing it does.
//
// Nothing here is counted and nothing is a target. There is no percentage, no
// total, no bar creeping toward a number, and no message about what is left.
// A map that told you how far behind you were would be a scoreboard with a
// picture on it.

import { touched } from './anim-core.js';
import { cardId } from './review.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

const root = $('#modulemap');
if (root) {
  const seen = (() => {
    try { return JSON.parse(localStorage.getItem('tcs-review') || '{}'); } catch { return {}; }
  })();

  fetch('/assets/data.json').then((r) => r.json()).then((d) => {
    const done = touched();
    const CLASSES = [
      [1, 'Why this class exists'],
      [2, 'The machine'],
      [3, 'The network'],
      [4, 'Control'],
      [5, 'Media and systems'],
    ];

    const state = (c) => {
      const s = seen[cardId(c)];
      if (!s) return '';
      return s.box >= 4 ? ' settled' : ' met';
    };

    root.append(...CLASSES.map(([n, title]) => {
      const figs = d.mapFigures.filter((f) => f.cls === n);
      const cards = d.drillCards.filter((c) => c.tag === `Class ${n}`);
      const myths = d.myths.filter((m) => m.cls === n);

      const tile = (f) => `<a class="mp-fig${done.has(f.name) ? ' on' : ''}" href="${f.to}"
        title="${f.label.replace(/"/g, '&quot;')}"><span>${f.label}</span></a>`;
      const dot = (c, kind) => `<i class="mp-dot mp-${kind}${state(c)}" title="${kind === 'card'
        ? String(c.q).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')
        : String(c.claim).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}"></i>`;

      return h(`<section class="mp-class">
        <h2 class="mp-h"><a href="/class/${n}">Class ${n} · ${title}</a></h2>
        <div class="mp-figs">${figs.map(tile).join('')}</div>
        <div class="mp-rows">
          <div class="mp-row"><span class="mp-k">Numbers</span>
            <span class="mp-dots">${cards.map((c) => dot(c, 'card')).join('')}</span>
            <a class="mp-go" href="${d.classLinks[n].drill}">Practise</a></div>
          <div class="mp-row"><span class="mp-k">Claims</span>
            <span class="mp-dots">${myths.map((m) => dot(m, 'myth')).join('')}</span>
            <a class="mp-go" href="${d.classLinks[n].myths}">Spot the myth</a></div>
        </div>
      </section>`);
    }));
  });
}
