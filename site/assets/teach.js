// Teach mode: the projector view.
//
// This is not an attempt to auto-generate slides. Auto-slides made from prose
// are worse than the prose. It is the lecturer's own notes, one section per
// screen, at a size readable from the back of a room, plus a stopwatch you
// start when a block starts. The course carries no fixed schedule on purpose:
// blocks are an order of work, not a timetable, so the clock reports elapsed
// time and leaves the judgement to the person in the room.

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
  let started = null;   // epoch ms when the current block's stopwatch began

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

    // The planned window lives on the parent h2, so a sub-section inherits it.
    const block = slides[i].dataset.block || slides[i].dataset.title;
    blockLbl.textContent = block;
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
  }
  setInterval(paintClock, 1000);

  startBtn.addEventListener('click', () => {
    if (started) { started = null; startBtn.textContent = '▶ Start stopwatch'; }
    else { started = Date.now(); startBtn.textContent = '■ Stop'; }
    paintClock();
  });

  $('#tgrid')?.addEventListener('click', toggleGrid);

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
      case 'o': case 'g': e.preventDefault(); toggleGrid(); break;
      case 't': startBtn.click(); break;
      case 'Escape':
        if (!grid.hidden) { grid.hidden = true; break; }
        if (!document.fullscreenElement) location.href = $('.teach-exit').getAttribute('href');
        break;
      default: break;
    }
  });

  show(0);
}
