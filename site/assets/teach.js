// Teach mode: the projector view.
//
// This is not an attempt to auto-generate slides. Auto-slides made from prose
// are worse than the prose. It is the lecturer's own notes, one section per
// screen, at a size readable from the back of a room, with the one thing a
// four-hour class actually needs: a block timer that says whether you are on
// time. Timing is the hardest part of teaching a long session, and it is the
// part no document can help with.

const $ = (s) => document.querySelector(s);
const track = $('#ttrack');
if (track) {
  const slides = [...track.querySelectorAll('.slide')];
  const dots = $('#tdots');
  const clock = $('#tclock');
  const blockLbl = $('#tblock');
  const posLbl = $('#tpos');
  const subLbl = $('#tsub');
  const prevBtn = $('#tprev');
  const nextBtn = $('#tnext');
  const startBtn = $('#tstart');

  let i = 0;
  let started = null;   // epoch ms when the current block timer began
  let planned = 0;      // planned minutes for the current slide, 0 if untimed

  dots.innerHTML = slides
    .map((s, n) => `<button class="tdot" data-i="${n}" title="${s.dataset.title}"></button>`)
    .join('');

  // Titles carry their planned window, e.g. "Block A: … (0:05 to 0:55)".
  // That is the only place the plan lives, so parse it rather than duplicate it.
  function plannedMinutes(title) {
    const m = /\((\d+):(\d+)\s+to\s+(\d+):(\d+)\)/.exec(title);
    if (!m) return 0;
    const from = +m[1] * 60 + +m[2];
    const to = +m[3] * 60 + +m[4];
    return Math.max(0, to - from);
  }

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.querySelectorAll('.tdot').forEach((d, k) => d.classList.toggle('on', k === i));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === slides.length - 1;
    posLbl.textContent = `${i + 1} / ${slides.length}`;

    // The planned window lives on the parent h2, so a sub-section inherits it.
    const block = slides[i].dataset.block || slides[i].dataset.title;
    planned = plannedMinutes(block);
    const blockName = block.replace(/\s*\([^)]*\)\s*$/, '');
    blockLbl.textContent = planned ? `${blockName} · ${planned} min` : blockName;
    blockLbl.hidden = false;

    // How far through the current block we are, counted in slides.
    const same = slides.filter((s) => (s.dataset.block || s.dataset.title) === block);
    subLbl.textContent = same.length > 1 ? `${same.indexOf(slides[i]) + 1}/${same.length} in block` : '';

    // A new block restarts the block clock, which is what a lecturer expects.
    if (started) started = Date.now();
    track.scrollTop = 0;
    paintClock();
  }

  function paintClock() {
    if (!started) {
      clock.textContent = '00:00';
      clock.className = 'teach-clock';
      return;
    }
    const s = Math.floor((Date.now() - started) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    clock.textContent = `${mm}:${ss}`;
    clock.className = 'teach-clock';
    if (planned) {
      const frac = s / (planned * 60);
      if (frac >= 1) clock.className = 'teach-clock over';
      else if (frac >= 0.8) clock.className = 'teach-clock warn';
    }
  }
  setInterval(paintClock, 1000);

  startBtn.addEventListener('click', () => {
    if (started) { started = null; startBtn.textContent = '▶ Start block timer'; }
    else { started = Date.now(); startBtn.textContent = '■ Stop'; }
    paintClock();
  });

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

  addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); show(i + 1); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); show(i - 1); break;
      case 'Home': show(0); break;
      case 'End': show(slides.length - 1); break;
      case 'f': $('#tfull').click(); break;
      case 't': startBtn.click(); break;
      case 'Escape':
        if (!document.fullscreenElement) location.href = $('.teach-exit').getAttribute('href');
        break;
      default: break;
    }
  });

  show(0);
}
