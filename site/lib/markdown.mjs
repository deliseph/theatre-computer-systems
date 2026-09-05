// A small, deliberate Markdown subset parser.
//
// WHY hand-rolled rather than `marked`: the whole site must build on Vercel with
// zero npm install. We fully control the input (12 authored files), so a focused
// parser covering exactly the constructs used is safer than it sounds, and it
// lets us emit the semantic hooks the teaching UI needs (heading ids, table
// wrappers for horizontal scroll, h2-delimited blocks for teach mode).

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

// Stable, readable anchors. Keeps CJK intact so glossary sections anchor properly.
export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/`/g, '')
      .replace(/\*\*/g, '')
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'section'
  );
}

// Sentinel for parked code spans. A private-use codepoint can never appear in
// the source text, so reinsertion is unambiguous.
const MARK = '';

// Inline formatting. Code spans are parked first and restored last, so that
// `**bold**` inside a code span is never mistaken for emphasis.
export function inline(src) {
  const codes = [];
  let s = String(src).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return MARK + (codes.length - 1) + MARK;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => `<a href="${esc(h)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  const restore = new RegExp(MARK + '(\\d+)' + MARK, 'g');
  return s.replace(restore, (_, n) => `<code>${esc(codes[Number(n)])}</code>`);
}

const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isTableRule = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function alignments(ruleLine) {
  return splitRow(ruleLine).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

/**
 * Parse markdown into HTML plus the outline the TOC and teach mode need.
 * Returns { html, headings, blocks } where `blocks` splits the document at
 * every h2, which is what teach mode projects one screen at a time.
 */
export function render(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  const seen = new Map();
  let i = 0;

  const uid = (base) => {
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };

  const buf = [];
  const para = () => {
    if (!buf.length) return;
    const text = buf.join(' ').trim();
    buf.length = 0;
    if (text) out.push(`<p>${inline(text)}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      para();
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      out.push(
        `<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`
      );
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      para();
      const level = h[1].length;
      let raw = h[2].trim();
      // A heading beginning "Extension: " marks material that is not on the
      // spine of the class: worth reading, not worth cutting the lab for.
      const ext = raw.startsWith('Extension: ');
      if (ext) raw = raw.slice(11);
      const id = uid(slugify(raw));
      headings.push({ level, text: raw.replace(/\*\*/g, '').replace(/`/g, ''), id, ext });
      out.push(
        `<h${level} id="${id}" class="hd hd-${level}${ext ? ' hd-ext' : ''}">` +
          (ext ? '<span class="ext-badge">Going deeper</span>' : '') + inline(raw) +
          `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`
      );
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      para();
      out.push('<hr>');
      i++;
      continue;
    }

    // Animation mount point. `<!--anim:id-->` on its own line becomes a host
    // div that assets/anim.js fills in. Keeping the marker in the prose means
    // each animation sits exactly where the idea is taught, and it is carried
    // into teach mode for free.
    const anim = /^<!--\s*anim:([a-z0-9-]+)\s*-->$/.exec(line.trim());
    if (anim) {
      para();
      out.push(`<div class="anim" data-anim="${anim[1]}"></div>`);
      i++;
      continue;
    }

    // Readiness check mount point: `<!--ready:N-->` on its own line.
    const ready = /^<!--\s*ready:(\d+)\s*-->$/.exec(line.trim());
    if (ready) {
      para();
      out.push(`<div class="practice" data-practice="ready" data-class="${ready[1]}"></div>`);
      i++;
      continue;
    }

    // Video mount point. `<!--video:ID|Title|Channel|Why-->` on its own line.
    // Nothing is requested from YouTube until the student clicks, so a class
    // page costs no third-party requests just by being open on a projector.
    const vid = /^<!--\s*video:([A-Za-z0-9_=-]+|list=[A-Za-z0-9_-]+)\|([^|]*)\|([^|]*)\|([^|]*)\s*-->$/.exec(line.trim());
    if (vid) {
      para();
      out.push(`<div class="vid" data-vid="${esc(vid[1])}" data-title="${esc(vid[2].trim())}" ` +
        `data-chan="${esc(vid[3].trim())}" data-why="${esc(vid[4].trim())}"></div>`);
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableRule(lines[i + 1])) {
      para();
      const head = splitRow(line);
      const align = alignments(lines[i + 1]);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      const th = head
        .map((c, n) => `<th style="text-align:${align[n] || 'left'}">${inline(c)}</th>`)
        .join('');
      const tb = rows
        .map(
          (r) =>
            '<tr>' +
            r.map((c, n) => `<td style="text-align:${align[n] || 'left'}">${inline(c)}</td>`).join('') +
            '</tr>'
        )
        .join('');
      // WHY the wrapper: wide tables scroll inside themselves. The page body
      // must never scroll sideways on a phone.
      out.push(
        `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      para();
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${render(body.join('\n')).html}</blockquote>`);
      continue;
    }

    if (/^(\s*)([-*]|\d+\.)\s+(.*)$/.test(line)) {
      para();
      const res = parseList(lines, i);
      out.push(res.html);
      i = res.next;
      continue;
    }

    if (!line.trim()) {
      para();
      i++;
      continue;
    }

    buf.push(line.trim());
    i++;
  }
  para();

  const html = out.join('\n');
  return { html, headings, blocks: splitBlocks(html) };
}

// Collect one list run starting at `start`. Handles nesting by indent and
// hanging-indent continuation lines, which is all the source uses.
function parseList(lines, start) {
  const baseIndent = /^(\s*)/.exec(lines[start])[1].length;
  const ordered = /^\s*\d+\./.test(lines[start]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);

    if (m && m[1].length === baseIndent) {
      items.push({ text: [m[3]], children: [] });
      i++;
      continue;
    }

    if (m && m[1].length > baseIndent && items.length) {
      const nested = parseList(lines, i);
      items[items.length - 1].children.push(nested.html);
      i = nested.next;
      continue;
    }

    // A continuation of the current item: indented, and not a new bullet.
    if (!m && lines[i].trim() && /^\s+/.test(lines[i]) && items.length) {
      items[items.length - 1].text.push(lines[i].trim());
      i++;
      continue;
    }

    break;
  }

  const tag = ordered ? 'ol' : 'ul';
  let isTask = false;
  const body = items
    .map((it) => {
      const text = it.text.join(' ').trim();
      const kids = it.children.join('');
      const task = /^\[( |x|X)\]\s*(.*)$/.exec(text);
      if (task) {
        isTask = true;
        const checked = task[1].toLowerCase() === 'x' ? ' checked' : '';
        return `<li class="task"><label><input type="checkbox" class="tick"${checked}><span>${inline(task[2])}</span></label>${kids}</li>`;
      }
      return `<li>${inline(text)}${kids}</li>`;
    })
    .join('');

  return { html: `<${tag}${isTask ? ' class="tasklist"' : ''}>${body}</${tag}>`, next: i };
}

// Split rendered HTML for teach mode.
//
// Splitting at h2 alone gives about nine screens for a four hour class, which
// is far too coarse to teach from. Splitting at h3 as well gives one screen per
// idea, roughly five minutes each, which is what a projector view needs. Each
// slide remembers its parent h2 so the toolbar can still show which block it
// belongs to and how long that block is meant to take.
function splitBlocks(html) {
  const parts = html.split(/(?=<h[23] )/);
  const blocks = [];
  let parent = 'Opening';

  for (const part of parts) {
    if (!part.trim()) continue;
    const m = /^<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<a class="anchor"/.exec(part);
    if (!m) {
      blocks.push({ id: 'opening', title: 'Opening', level: 2, parent, html: part });
      continue;
    }
    const level = Number(m[1]);
    // Drop the "Going deeper" badge before it becomes a slide title, or every
    // extension slide is named after its badge.
    const title = m[3].replace(/<span class="ext-badge">.*?<\/span>/g, '')
      .replace(/<[^>]+>/g, '').trim();
    if (level === 2) parent = title;
    blocks.push({ id: m[2], title, level, parent, html: part });
  }
  return blocks;
}
