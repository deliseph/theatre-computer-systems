// Teach mode: the projector view.
//
// This is not an attempt to auto-generate slides. Auto-slides made from prose
// are worse than the prose. It is the lecturer's own notes, one section per
// screen, at a size readable from the back of a room, plus a stopwatch you
// start when a block starts. The course carries no fixed schedule on purpose:
// blocks are an order of work, not a timetable, so the clock reports elapsed
// time and leaves the judgement to the person in the room.

import { mountBoard } from './board.js';

const $ = (s) => document.querySelector(s);
const track = $('#ttrack');
if (track) {
  const slides = [...track.querySelectorAll('.slide')];
  const dots = $('#tdots');
  const clock = $('#tclock');
  const bclock = $('#tbclock');
  const blockLbl = $('#tblock');
  const posLbl = $('#tpos');
  const subLbl = $('#tsub');
  const prevBtn = $('#tprev');
  const nextBtn = $('#tnext');
  const startBtn = $('#tstart');
  const foot = document.querySelector('.teach-foot');
  const locWrap = $('#tloc');
  const locPath = $('#tlocp');
  const classN = document.querySelector('.teach').dataset.class;
  let locTimer = null;
  const LOC_FIG = 'The same figure is on that page, with the same controls. Push it yourself.';
  const LOC_SECTION = 'This section is on that page, under Learn. You can read it again at your own speed.';
  const LOC_WHOLE = 'The whole class is on that page, under Learn. You can read it again at your own speed.';
  const answersBtn = $('#tanswers');
  const ANSWERS_KEY = 'tcs-teach-answers';
  let answersShown = false;
  try { answersShown = localStorage.getItem(ANSWERS_KEY) === 'shown'; } catch { /* private window */ }

  let i = 0;
  // Two clocks, because a lecturer needs two different answers. The class clock
  // says how far into the session you are and never resets. The block clock
  // says how long you have been on this block and resets when the block does.
  // One clock cannot do both: a block timer that has been running since the
  // start is useless, and a class timer that restarts is worse than none.
  let started = null;       // epoch ms when the class stopwatch began
  let blockAt = null;       // epoch ms when the current block began
  let timedBlock = null;    // which block the block clock is timing
  const CKEY = `tcs-clock-${document.body.dataset.cls || location.pathname}`;

  // A four hour class and one stray refresh should not lose the timing, so the
  // start is written down rather than held only in memory.
  const saveClock = () => {
    try {
      if (started) localStorage.setItem(CKEY, JSON.stringify({ started, blockAt, timedBlock }));
      else localStorage.removeItem(CKEY);
    } catch { /* private window */ }
  };
  try {
    const raw = JSON.parse(localStorage.getItem(CKEY) || 'null');
    // Anything older than twelve hours is last week's class, not this one.
    if (raw && raw.started && Date.now() - raw.started < 12 * 3600e3) {
      started = raw.started; blockAt = raw.blockAt || raw.started; timedBlock = raw.timedBlock ?? null;
    }
  } catch { /* private window */ }

  // Thirty seven identical dots are not navigation. Group them by block, so
  // the row reads as the shape of the class rather than as a progress bar.
  let lastBlock = null;
  dots.innerHTML = slides
    .map((s, n) => {
      const b = s.dataset.block || s.dataset.title;
      const gap = b !== lastBlock && n > 0 ? ' tdot-new' : '';
      lastBlock = b;
      return `<button class="tdot${gap}" data-i="${n}" title="${b} — ${s.dataset.title}"></button>`;
    })
    .join('');

  // An overview, because scrubbing one slide at a time to find something is
  // the thing that makes a projector view feel slow in front of a room.
  const grid = document.createElement('div');
  grid.className = 'teach-grid';
  grid.hidden = true;
  grid.innerHTML = slides.map((s, n) => {
    const b = s.dataset.block || s.dataset.title;
    return `<button class="tcard" data-i="${n}"><span class="tcard-b">${b}</span>
      <span class="tcard-t">${s.dataset.title}</span><span class="tcard-n">${n + 1}</span></button>`;
  }).join('');
  document.body.append(grid);
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.tcard');
    if (c) { grid.hidden = true; show(+c.dataset.i); }
  });
  const toggleGrid = () => {
    grid.hidden = !grid.hidden;
    if (!grid.hidden) {
      grid.querySelectorAll('.tcard').forEach((c, k) => c.classList.toggle('on', k === i));
      grid.querySelector('.tcard.on')?.scrollIntoView({ block: 'center' });
    }
  };



  // The locator, big enough for the back row, on the lecturer's key only.
  // It never appears by itself: an address nobody asked for on a projector
  // is an instruction to get your phone out, and this is not that.
  const locBig = document.createElement('div');
  locBig.className = 'teach-loc-big';
  locBig.hidden = true;
  locBig.innerHTML = '<span class="tloc-u"></span><span class="tloc-w"></span>';
  document.body.append(locBig);
  locBig.addEventListener('click', hideLoc);

  // Three screens out of every deck fold a thin "Block C:" divider into the
  // screen that follows, so they carry two headings. The last one is the
  // section the screen is actually about, and the one whose anchor a student
  // wants.
  function locatorFor(n) {
    const hs = slides[n].querySelectorAll('.slide-inner h2[id], .slide-inner h3[id]');
    const id = hs.length ? hs[hs.length - 1].id : '';
    return { id, path: `/class/${classN}#${id || 'tab=content'}` };
  }

  function showLoc() {
    const { id } = locatorFor(i);
    locBig.querySelector('.tloc-u').textContent = location.host + locPath.textContent;
    locBig.querySelector('.tloc-w').textContent =
      slides[i].dataset.fig === '1' ? LOC_FIG : (id ? LOC_SECTION : LOC_WHOLE);
    // The band sits under the footer, so the lecturer keeps Next and Overview.
    locBig.style.paddingBottom = `${foot.offsetHeight + 14}px`;
    locBig.hidden = false;
    clearTimeout(locTimer);
    locTimer = setTimeout(hideLoc, 10000);
  }

  function hideLoc() { clearTimeout(locTimer); locBig.hidden = true; }
  function toggleLoc() { if (locBig.hidden) showLoc(); else hideLoc(); }

  // Hold the note. A figure that prints its own conclusion turns a prediction
  // into a reading exercise, so on the projector the conclusion waits for the
  // room. Nothing is scored, counted or stored per note: it is one class on one
  // paragraph, reset by turning the page.
  const foldable = (root) => [...root.querySelectorAll('.anim-note[data-fold]')];

  function holdAll() {
    for (const n of foldable(track)) {
      n.classList.add('is-held');
      n.querySelector('.anim-note-key')?.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleNote() {
    const list = foldable(slides[i]);
    if (!list.length) return;             // no figure here: the key is quiet
    const anyHeld = list.some((n) => n.classList.contains('is-held'));
    for (const n of list) {
      n.classList.toggle('is-held', !anyHeld);
      n.querySelector('.anim-note-key')?.setAttribute('aria-expanded', String(anyHeld));
    }
  }

  function paintAnswers() {
    document.body.classList.toggle('answers-shown', answersShown);
    const t = answersBtn?.querySelector('span');
    if (t) t.textContent = answersShown ? 'Answers: shown' : 'Answers: held';
    answersBtn?.setAttribute('aria-pressed', String(!answersShown));
  }

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.querySelectorAll('.tdot').forEach((d, k) => d.classList.toggle('on', k === i));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === slides.length - 1;
    posLbl.textContent = `${i + 1} / ${slides.length}`;
    const nx = slides[i + 1];
    const nextLbl = document.getElementById('tnextup');
    if (nextLbl) {
      nextLbl.textContent = nx ? `next: ${nx.dataset.title}` : 'last screen';
      nextLbl.hidden = false;
    }

    locPath.textContent = locatorFor(i).path;
    locWrap.hidden = false;
    // An address must never outlive the screen it belongs to: a room copying
    // a URL while the deck moves on would copy the wrong one.
    hideLoc();

    // The planned window lives on the parent h2, so a sub-section inherits it.
    const block = slides[i].dataset.block || slides[i].dataset.title;
    blockLbl.textContent = block;
    blockLbl.hidden = false;

    // How far through the current block we are, counted in slides.
    const same = slides.filter((s) => (s.dataset.block || s.dataset.title) === block);
    subLbl.textContent = same.length > 1 ? `${same.indexOf(slides[i]) + 1}/${same.length} in block` : '';

    // A new block restarts the block clock, and only the block clock. Moving
    // between screens inside one block must not restart even that, or the
    // timer is useless for the thing it measures.
    if (started && block !== timedBlock) { blockAt = Date.now(); timedBlock = block; saveClock(); }
    holdAll();
    track.scrollTop = 0;
    paintClock();
  }

  // Past an hour the display gains an hours field rather than counting to 240
  // minutes, because a four hour class is the normal case here.
  function hms(ms) {
    const s = Math.floor(ms / 1000);
    const two = (n) => String(n).padStart(2, '0');
    return s >= 3600
      ? `${Math.floor(s / 3600)}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`
      : `${two(Math.floor(s / 60))}:${two(s % 60)}`;
  }
  function paintClock() {
    if (!started) {
      clock.textContent = '00:00';
      clock.className = 'teach-clock';
      if (bclock) { bclock.textContent = ''; bclock.hidden = true; }
      return;
    }
    const now = Date.now();
    clock.textContent = hms(now - started);
    clock.className = 'teach-clock';
    if (bclock) {
      bclock.hidden = false;
      bclock.textContent = `block ${hms(now - (blockAt || started))}`;
    }
  }
  // Four times a second, not once. The stopwatch starts at an arbitrary point
  // in the tick, so at one tick a second the display could sit on 00:00 for
  // most of the first two seconds after the lecturer pressed it.
  setInterval(paintClock, 250);

  const paintBtn = () => { startBtn.textContent = started ? '■ Stop' : '▶ Start stopwatch'; };
  startBtn.addEventListener('click', () => {
    if (started) { started = blockAt = null; timedBlock = null; }
    else {
      started = blockAt = Date.now();
      timedBlock = slides[i].dataset.block || slides[i].dataset.title;
    }
    saveClock();
    paintBtn();
    paintClock();
  });
  paintBtn();

  $('#tgrid')?.addEventListener('click', toggleGrid);

  answersBtn?.addEventListener('click', () => {
    answersShown = !answersShown;
    try { localStorage.setItem(ANSWERS_KEY, answersShown ? 'shown' : 'held'); } catch { /* private window */ }
    paintAnswers();
  });
  paintAnswers();

  $('#tfull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });

  prevBtn.addEventListener('click', () => show(i - 1));
  nextBtn.addEventListener('click', () => show(i + 1));
  dots.addEventListener('click', (e) => {
    const d = e.target.closest('.tdot');
    if (d) show(+d.dataset.i);
  });

  // A surface to draw on, over whatever screen is up. Mounted once, kept for
  // the life of the page, so what was drawn survives going back to the slide
  // and returning: the second half of an explanation usually arrives after a
  // look at the diagram the first half was drawn on.
  const board = mountBoard();
  $('#tboard')?.addEventListener('click', () => board.toggle());

  addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    const type = (e.target.type || '').toLowerCase();
    // A slider inside a figure keeps focus after you drag it, and that is the
    // moment a lecturer presses a key. Only real text entry swallows keys;
    // on a slider the left and right arrows stay with the slider and every
    // other key still drives the deck.
    const textEntry = tag === 'TEXTAREA' || tag === 'SELECT' ||
      (tag === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(type));
    // Escape always gets you out of a text field, so a figure with an input
    // box cannot swallow the whole deck.
    if (textEntry && e.key === 'Escape') { e.target.blur(); e.preventDefault(); return; }
    if (textEntry) return;
    const onSlider = tag === 'INPUT' && type === 'range';
    if (onSlider && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ')) return;
    // Space on a focused button would both press it and turn the page.
    if (e.key === ' ' && tag === 'BUTTON') return;
    if (board.isOpen() && e.key !== 'Escape' && !/^[wWzZeE]$/.test(e.key)) {
      // Turning the page out from under a half drawn diagram is the one thing
      // this feature must never do, so while the board is up the deck keys are
      // inert and only the board's own keys answer.
      if (/^(Arrow|Page|Home|End| )/.test(e.key)) e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); show(i + 1); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); show(i - 1); break;
      case 'Home': show(0); break;
      case 'End': show(slides.length - 1); break;
      case 'f': $('#tfull').click(); break;
      case 'o': case 'g': e.preventDefault(); toggleGrid(); break;
      case 't': startBtn.click(); break;
      case 'n': e.preventDefault(); toggleNote(); break;
      case 'a': e.preventDefault(); answersBtn?.click(); break;
      case 'l': case 'L': e.preventDefault(); toggleLoc(); break;
      case 'w': case 'W': e.preventDefault(); board.toggle(); break;
      case 'z': case 'Z': if (board.isOpen()) { e.preventDefault(); $('.wb [data-act="undo"]')?.click(); } break;
      case 'e': case 'E': if (board.isOpen()) { e.preventDefault(); $('.wb [data-act="erase"]')?.click(); } break;
      case 'Escape':
        if (board.isOpen()) { board.hide(); break; }
        if (!locBig.hidden) { hideLoc(); break; }
        if (!grid.hidden) { grid.hidden = true; break; }
        if (!document.fullscreenElement) location.href = $('.teach-exit').getAttribute('href');
        break;
      default: break;
    }
  });

  show(0);
}
