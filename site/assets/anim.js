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

mountAll();
mountVideos();
