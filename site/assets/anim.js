// Entry point: pull in every animation module, then mount whatever the page
// actually asked for. Modules register themselves on import, so mounting must
// happen last.

import { mountAll, mountVideos, setGuessFirst, TEACH } from './anim-core.js';
import './anim-signal.js';
import './anim-network.js';
import './anim-control.js';
import './anim-media.js';
import './anim-foundations.js';
import './anim-file.js';
import './anim-colour.js';
import './anim-light.js';
import './anim-systems.js';
import './anim-lineage.js';
import './anim-extra.js';
import './anim-sync.js';
import './anim-analogue.js';
import './anim-deep.js';

mountAll();
mountVideos();

// Guess first. The button only exists where there is something to hold, so it
// is hidden in the shell and revealed here, on a page that actually mounted a
// figure. It says which way it is set, not what it would do: a control that
// describes its own future state is the one people press by mistake.
const gbtn = document.getElementById('guessbtn');
if (gbtn && !TEACH && document.querySelector('.anim-fig')) {
  const paint = () => {
    const on = document.body.classList.contains('guess-first');
    gbtn.setAttribute('aria-pressed', String(on));
    gbtn.querySelector('.guess-t').textContent = on ? 'Guessing first' : 'Guess first';
  };
  gbtn.hidden = false;
  gbtn.addEventListener('click', () => {
    setGuessFirst(!document.body.classList.contains('guess-first'));
    paint();
  });
  paint();
}

// A link straight to a figure lands before the canvas has any height, so the
// reader ends up a screen above the thing they asked for. app.js has already
// opened the panel it lives in; this only corrects for the height it gains.
if (location.hash.startsWith('#fig-')) {
  const t = document.getElementById(location.hash.slice(1));
  if (t) requestAnimationFrame(() => t.scrollIntoView({ block: 'center' }));
}
