// A board to draw on, over the top of whatever screen is up.
//
// Every lecturer reaches a moment where the slide is not the answer and the
// only way through is to draw the thing. That moment is worth about four
// seconds, and if getting to a blank surface costs longer than that, nobody
// bothers and the explanation gets waved in the air instead.
//
// So: one key, and the board is there over the current screen. The same key and
// it is gone, with the slide exactly where it was. What you drew is still there
// when you come back, because the second half of an explanation usually arrives
// after a look at the diagram you were drawing on.

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// Read the theme's own colours, so a stroke on the board is the same red the
// figures use for a fault, and so both themes come out legible.
const pen = (name, fb) => getComputedStyle(document.body).getPropertyValue(name).trim() || fb;
const PENS = () => [
  ['ink', pen('--ink', '#e7e9ee')],
  ['amber', pen('--amber', '#f0a038')],
  ['cyan', pen('--cyan', '#5cbdd2')],
  ['green', pen('--green', '#6cc47f')],
  ['red', pen('--red', '#e2685f')],
];
const WIDTHS = [[2.5, 'Thin'], [5, 'Medium'], [11, 'Thick']];

export function mountBoard() {
  const root = h(`<div class="wb" hidden aria-hidden="true">
    <canvas class="wb-c"></canvas>
    <div class="wb-bar" role="toolbar" aria-label="Board tools">
      <span class="wb-pens" role="radiogroup" aria-label="Pen colour"></span>
      <span class="wb-sizes" role="radiogroup" aria-label="Pen width"></span>
      <button class="wb-b" data-act="erase" aria-pressed="false" title="Rub out (e)">Eraser</button>
      <button class="wb-b" data-act="undo" title="Undo the last stroke (z)">Undo</button>
      <button class="wb-b" data-act="clear" title="Clear the board">Clear</button>
      <span class="wb-sp"></span>
      <button class="wb-b wb-close" data-act="close" title="Back to the screen (w or Escape)">Back to the slide <kbd>w</kbd></button>
    </div>
  </div>`);
  document.body.append(root);

  const cv = $('.wb-c', root);
  const g = cv.getContext('2d');
  // Strokes are kept as points rather than as pixels, so undo is a pop and a
  // repaint, and so a resize or a theme change redraws rather than stretching a
  // bitmap into mush.
  let strokes = [], live = null;
  let colour = PENS()[0][1], width = WIDTHS[1][0], erasing = false;
  let open = false;

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
    cv.style.width = `${innerWidth}px`;
    cv.style.height = `${innerHeight}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  };

  const drawStroke = (s) => {
    if (s.pts.length < 2) {
      // A tap is a dot. Without this a full stop costs you two taps.
      g.fillStyle = s.colour;
      g.beginPath();
      g.arc(s.pts[0].x, s.pts[0].y, s.width / 2, 0, Math.PI * 2);
      g.fill();
      return;
    }
    g.strokeStyle = s.colour;
    g.lineWidth = s.width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    g.beginPath();
    g.moveTo(s.pts[0].x, s.pts[0].y);
    // Quadratics through the midpoints: a hand moving fast enough to be worth
    // watching does not produce points close enough for straight segments to
    // look like a line.
    for (let i = 1; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1];
      g.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    const last = s.pts[s.pts.length - 1];
    g.lineTo(last.x, last.y);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  };

  const paint = () => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of strokes) drawStroke(s);
    if (live) drawStroke(live);
  };

  // --- drawing ---------------------------------------------------------------
  const at = (e) => ({ x: e.clientX, y: e.clientY });
  cv.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    cv.setPointerCapture(e.pointerId);
    live = { colour, width: erasing ? width * 3 : width, erase: erasing, pts: [at(e)] };
    paint();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!live) return;
    // Coalesced events give the points the browser had but did not deliver, so
    // a fast stroke on a good tablet comes out as a curve rather than a polygon.
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) live.pts.push(at(ev));
    paint();
  });
  const end = () => { if (live) { strokes.push(live); live = null; paint(); } };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', end);
  // The board is a drawing surface, not a page: a two finger drag should not
  // scroll the lecture out from under the diagram.
  cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // --- the bar ---------------------------------------------------------------
  const pensEl = $('.wb-pens', root), sizesEl = $('.wb-sizes', root);
  const buildPens = () => {
    pensEl.innerHTML = '';
    for (const [name, hex] of PENS()) {
      const b = h(`<button class="wb-pen" role="radio" data-hex="${hex}" title="${name}" aria-label="${name} pen" aria-checked="false"></button>`);
      b.style.setProperty('--p', hex);
      b.addEventListener('click', () => {
        colour = hex; erasing = false;
        paintBar();
      });
      pensEl.append(b);
    }
  };
  for (const [w, lbl] of WIDTHS) {
    const b = h(`<button class="wb-size" role="radio" data-w="${w}" aria-label="${lbl} pen" aria-checked="false"><i style="height:${Math.min(w, 9)}px"></i></button>`);
    b.addEventListener('click', () => { width = w; paintBar(); });
    sizesEl.append(b);
  }
  const paintBar = () => {
    for (const b of pensEl.children) {
      const on = !erasing && b.dataset.hex === colour;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('on', on);
    }
    for (const b of sizesEl.children) {
      const on = +b.dataset.w === width;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('on', on);
    }
    const er = $('[data-act="erase"]', root);
    er.setAttribute('aria-pressed', String(erasing));
    er.classList.toggle('on', erasing);
  };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'erase') { erasing = !erasing; paintBar(); }
    else if (a === 'undo') { strokes.pop(); paint(); }
    else if (a === 'clear') { strokes = []; paint(); }
    else if (a === 'close') hide();
  });

  // --- showing and hiding ----------------------------------------------------
  const show = () => {
    if (open) return;
    open = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wb-on');
    size();
    buildPens();
    if (!PENS().some(([, hex]) => hex === colour)) colour = PENS()[0][1];
    paintBar();
    $('.wb-close', root).focus({ preventScroll: true });
  };
  const hide = () => {
    if (!open) return;
    open = false;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wb-on');
  };
  const toggle = () => (open ? hide() : show());

  addEventListener('resize', () => { if (open) size(); });
  // A theme swap mid class must not leave white ink on a white board.
  new MutationObserver(() => {
    if (!open) return;
    buildPens();
    paintBar();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { toggle, show, hide, isOpen: () => open };
}
