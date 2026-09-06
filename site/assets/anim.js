// Entry point: pull in every animation module, then mount whatever the page
// actually asked for. Modules register themselves on import, so mounting must
// happen last.

import { mountAll, mountVideos } from './anim-core.js';
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

// A link straight to a figure lands before the canvas has any height, so the
// reader ends up a screen above the thing they asked for. app.js has already
// opened the panel it lives in; this only corrects for the height it gains.
if (location.hash.startsWith('#fig-')) {
  const t = document.getElementById(location.hash.slice(1));
  if (t) requestAnimationFrame(() => t.scrollIntoView({ block: 'center' }));
}
