/* Maarif City: every atlas and every course as a district. Each atlas Fasl and each course lesson is a plot; a plot grows
   floors as the work goes along the chain (atlas: written, used in a sabaq, refined, taught; course: Teacher Copy, refined,
   class-ready, taught). Bab blocks sit inside each district. Hover a tower for its numbers and its links across the chain;
   click a district to fly in. Drawn in SVG (isometric), turned in quarter steps. */
(function () {
'use strict';
const { $, esc, SOLID, ATLAS_LAY, COURSE_LAY, side, legendHTML } = window.OBS;
const svg = $('#svg');
let M = null, rot = 0, cells = [], districts = [], W = 0, H = 0, pinned = null, hovered = null, focus = null;
let cam = { x: 0, y: 0, k: 1 }, box = { x: 0, y: 0, w: 1, h: 1 };
const U = 10, FLOOR = 0.85, TOWER = 0.78;

/* ---------- layout: districts, Bab blocks, plots ---------- */
function blocksOf(node) {
  if (node.kind === 'Atlas') return node.kids.map(b => ({ node: b, items: b.kids || [] }));
  const kids = node.kids || [];
  return kids.length && kids[0].kids && kids[0].kind === 'Bab' ? kids.map(b => ({ node: b, items: b.kids || [] })) : [{ node, items: kids }];
}
function layout() {
  const order = ['mahdaviyat', 'ZM', 'tauheed', 'TH', 'akhlaq', 'MA', 'adl', 'maad', 'nubuwat', 'imamat', 'MRF', 'MS'];
  const nodes = [...M.kids, ...M.courses];
  nodes.sort((a, b) => { const ia = order.indexOf(a.kind === 'Atlas' ? a.short.toLowerCase() : a.short), ib = order.indexOf(b.kind === 'Atlas' ? b.short.toLowerCase() : b.short); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  cells = []; districts = [];
  let dx = 0, dy = 0, rowH = 0; const WMAX = 120;
  for (const node of nodes) {
    const blocks = blocksOf(node), total = blocks.reduce((n, b) => n + Math.max(b.items.length, 4), 0);
    const DW = Math.max(12, Math.min(44, Math.ceil(Math.sqrt(total) * 1.7)));
    let bx = 0, by = 0, bh = 0, dw = 0; const placed = [];
    for (const b of blocks) {
      const n = b.items.length, cols = n ? Math.max(2, Math.ceil(Math.sqrt(n * 1.3))) : 2, rows = n ? Math.ceil(n / cols) : 2;
      if (bx && bx + cols > DW) { bx = 0; by += bh + 1; bh = 0; }
      placed.push({ b, x: bx, y: by, cols, rows }); bx += cols + 1; bh = Math.max(bh, rows); dw = Math.max(dw, bx - 1);
    }
    const dh = by + bh;
    if (dx && dx + dw > WMAX) { dx = 0; dy += rowH + 5; rowH = 0; }
    const D = { node, x: dx, y: dy, w: dw, h: dh, blocks: [] };
    for (const p of placed) {
      const blk = { node: p.b.node, x: dx + p.x, y: dy + p.y, w: p.cols, h: p.rows, empty: !p.b.items.length };
      D.blocks.push(blk);
      p.b.items.forEach((it, i) => cells.push({ node: it, x: dx + p.x + (i % p.cols), y: dy + p.y + Math.floor(i / p.cols), lvl: it.levels[0] || 0, course: node.kind !== 'Atlas', D }));
    }
    districts.push(D); dx += dw + 5; rowH = Math.max(rowH, dh);
  }
  W = Math.max(...districts.map(d => d.x + d.w)); H = Math.max(...districts.map(d => d.y + d.h));
}

/* ---------- projection ---------- */
function turn(x, y) { return rot === 0 ? [x, y] : rot === 1 ? [H - y, x] : rot === 2 ? [W - x, H - y] : [y, W - x]; }
const P = (x, y, z) => [(x - y) * 0.866 * U, (x + y) * 0.5 * U - z * U];
const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function rectPoly(x, y, w, h) { const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => turn(a, b)); return pts(c.map(([a, b]) => P(a, b, 0))); }
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * f))); return `rgb(${c})`; };
function prism(x, y, z0, h, w, col, stroke) {
  const a = (X, Y, Z) => P(X, Y, Z), z1 = z0 + h;
  const top = [a(x, y, z1), a(x + w, y, z1), a(x + w, y + w, z1), a(x, y + w, z1)];
  const left = [a(x, y + w, z0), a(x + w, y + w, z0), a(x + w, y + w, z1), a(x, y + w, z1)];
  const right = [a(x + w, y, z0), a(x + w, y + w, z0), a(x + w, y + w, z1), a(x + w, y, z1)];
  return `<polygon points="${pts(left)}" fill="${shade(col, .8)}" stroke="${stroke}" stroke-width=".4"/><polygon points="${pts(right)}" fill="${shade(col, .93)}" stroke="${stroke}" stroke-width=".4"/><polygon points="${pts(top)}" fill="${shade(col, 1.12)}" stroke="${stroke}" stroke-width=".4"/>`;
}

/* ---------- drawing ---------- */
function draw() {
  let ground = '', towers = [], labels = '';
  for (const D of districts) {
    ground += `<polygon class="dist" data-d="${districts.indexOf(D)}" points="${rectPoly(D.x - .6, D.y - .6, D.w + 1.2, D.h + 1.2)}" fill="${D.node.kind === 'Atlas' ? '#e8edf7' : '#e2f1ee'}" stroke="#d3d9e4" stroke-width="1"/>`;
    for (const b of D.blocks) ground += `<polygon class="dist" data-d="${districts.indexOf(D)}" points="${rectPoly(b.x - .15, b.y - .15, b.w + .3, b.h + .3)}" fill="${b.empty ? '#f1efe7' : D.node.kind === 'Atlas' ? '#dde5f3' : '#d5ebe6'}"/>`;
    // name at the front corner, Bab names (shown when zoomed in) at each block's front corner
    const mid = turn(D.x + D.w / 2, D.y + D.h / 2), [lx, ly0] = P(mid[0], mid[1], 0), ly = ly0 - 34;
    const pctTxt = D.node.levels.length ? `${D.node.levels.length} ${D.node.kind === 'Atlas' ? 'Fasls' : D.node.unit}` : (D.node.note || 'nothing listed yet');
    const nm = D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course', wpx = Math.max(nm.length * 8.6, pctTxt.length * 6.2) + 22;
    labels += `<g class="dlab" data-d="${districts.indexOf(D)}" data-x="${lx.toFixed(1)}" data-y="${ly.toFixed(1)}" transform="translate(${lx.toFixed(1)},${ly.toFixed(1)})"><rect x="${-wpx / 2}" y="-18" width="${wpx}" height="40" rx="9" fill="#fffdf8" fill-opacity=".92" stroke="${D.node.kind === 'Atlas' ? '#c3d2ee' : '#a8d8cf'}"/><line x1="0" y1="22" x2="0" y2="34" stroke="${D.node.kind === 'Atlas' ? '#9fb3dc' : '#8fcfc3'}" stroke-width="1.5"/><text text-anchor="middle" font-size="15" font-weight="700" fill="${D.node.kind === 'Atlas' ? '#2a5bb8' : '#0b7a70'}" stroke="#fffdf8" stroke-width="4" paint-order="stroke">${esc(D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course')}</text><text y="16" text-anchor="middle" font-size="11.5" fill="#6b736f" stroke="#fffdf8" stroke-width="3" paint-order="stroke">${esc(pctTxt)}</text></g>`;
    for (const b of D.blocks) { const c = [[b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [b.x + b.w, b.y], [b.x, b.y]].map(([a, bb]) => turn(a, bb)).reduce((m, c) => c[0] + c[1] > m[0] + m[1] ? c : m); const [bx, by] = P(c[0], c[1], 0);
      labels += `<text class="blab" x="${bx.toFixed(1)}" y="${(by + 7).toFixed(1)}" text-anchor="middle" font-size="5.5" font-weight="700" fill="#4f5753" stroke="#fffdf8" stroke-width="1.6" paint-order="stroke">${esc(b.node.short || '')}</text>`; }
  }
  cells.forEach((c, i) => { const [x, y] = turn(c.x + .5, c.y + .5); c.rx = x - .5; c.ry = y - .5; c.i = i; });
  const order = cells.slice().sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));
  for (const c of order) {
    const o = (1 - TOWER) / 2; let g = '';
    if (!c.lvl) { g = `<polygon points="${pts([P(c.rx + o, c.ry + o, 0), P(c.rx + 1 - o, c.ry + o, 0), P(c.rx + 1 - o, c.ry + 1 - o, 0), P(c.rx + o, c.ry + 1 - o, 0)])}" fill="${c.course ? '#bfd9d3' : '#c9d4ea'}"/>`; c.top = P(c.rx + .5, c.ry + .5, 0); }
    else { let z = 0; for (let f = 1; f <= c.lvl; f++) { g += prism(c.rx + o, c.ry + o, z, FLOOR, TOWER, SOLID[f], 'rgba(0,0,0,.16)'); z += FLOOR; } c.top = P(c.rx + .5, c.ry + .5, z); }
    towers.push(`<g class="c" data-i="${c.i}">${g}</g>`);
  }
  svg.innerHTML = `<g id="world"><g>${ground}</g><g id="towers">${towers.join('')}</g><g id="beams"></g><g id="labels">${labels}</g></g>`;
  const bb = $('#world').getBBox(); box = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
  apply();
}

/* ---------- camera ---------- */
function apply() {
  const g = $('#world'); if (!g) return;
  g.setAttribute('transform', `translate(${cam.x.toFixed(1)},${cam.y.toFixed(1)}) scale(${cam.k.toFixed(4)})`); svg.classList.toggle('zin', cam.k > 2.4);
  // signs and Bab names keep one size on screen whatever the zoom
  const inv = 1 / cam.k;
  g.querySelectorAll('.dlab').forEach(l => l.setAttribute('transform', `translate(${l.dataset.x},${l.dataset.y}) scale(${(Math.min(1.15, inv * 0.95)).toFixed(4)})`));
  if (cam.k > 2.4) g.querySelectorAll('.blab').forEach(t => { t.setAttribute('font-size', (11 * inv).toFixed(2)); t.setAttribute('stroke-width', (3 * inv).toFixed(2)); });
}
function fitTo(b, pad, animate) {
  const r = svg.getBoundingClientRect(), k = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);
  const to = { k, x: r.width / 2 - (b.x + b.w / 2) * k, y: r.height / 2 - (b.y + b.h / 2) * k };
  if (!animate || window.OBS.reduced) { cam = to; apply(); return; }
  const from = { ...cam }, t0 = performance.now();
  (function step(t) { const p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3); cam = { k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }; apply(); if (p < 1) requestAnimationFrame(step); })(t0);
}
function fitAll(animate) { focus = null; fitTo(box, 40, animate); crumb(); side(pinned ? pinned.node : M); }
function flyTo(D) {
  focus = D; const c = [[D.x - 1, D.y - 1], [D.x + D.w + 1, D.y - 1], [D.x + D.w + 1, D.y + D.h + 1], [D.x - 1, D.y + D.h + 1]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0));
  const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
  fitTo({ x: Math.min(...xs), y: Math.min(...ys) - 5 * U, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) + 7 * U }, 50, true);
  crumb(); side(D.node);
}
function crumb() { $('#crumb').innerHTML = focus ? `<a data-up="0">Maarif</a><span class="sep">›</span><span class="cur">${esc(focus.node.short)}</span>` : `<span class="cur">Maarif</span>`; }

/* ---------- links across the chain ---------- */
let byKey = new Map(), byNode = new Map();
function index() { byKey = new Map(); byNode = new Map(); cells.forEach(c => { byNode.set(c.node, c); if (c.node.key) byKey.set(c.node.key, c); }); }
function linked(node) {
  if (node.kind === 'Fasl') return (node.kids || []).map(s => byNode.get(s)).filter(Boolean);
  if (node.kind === 'Sabaq') return (node.fkeys || []).map(k => byKey.get(k)).filter(Boolean);
  return [];
}
function beams(c) {
  const g = $('#beams'); if (!g) return;
  if (!c) { g.innerHTML = ''; return; }
  const to = linked(c.node);
  let h = `<circle cx="${c.top[0]}" cy="${c.top[1]}" r="3.2" fill="none" stroke="#1d211f" stroke-width="1.2"/>`;
  for (const t of to) { const [x1, y1] = c.top, [x2, y2] = t.top, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.35 - 20;
    h += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="#0b7a70" stroke-width="1.4" opacity=".85"/><circle cx="${x2}" cy="${y2}" r="2.6" fill="#0b7a70"/>`; }
  g.innerHTML = h;
}

/* ---------- pointer: hover, pin, pan, zoom ---------- */
let drag = null;
svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, id: e.pointerId }; });
svg.addEventListener('pointermove', e => {
  if (drag && (e.buttons & 1) && (drag.moved || Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4)) { if (!drag.moved) svg.setPointerCapture(drag.id); drag.moved = true; cam.x = drag.cx + e.clientX - drag.x; cam.y = drag.cy + e.clientY - drag.y; apply(); svg.classList.add('grabbing'); return; }
  const t = e.target.closest && e.target.closest('.c'); const c = t ? cells[+t.dataset.i] : null;
  if (c !== hovered) { hovered = c; if (!pinned) { beams(c); side(c ? c.node : focus ? focus.node : M); } }
});
svg.addEventListener('pointerup', e => {
  svg.classList.remove('grabbing'); const d = drag; drag = null; if (d && d.moved) return;
  const el = document.elementFromPoint(e.clientX, e.clientY) || e.target, t = el.closest && el.closest('.c'), dl = el.closest && el.closest('[data-d]');
  if (t) { const c = cells[+t.dataset.i]; pinned = pinned === c ? null : c; beams(pinned || c); side((pinned || c).node); return; }
  pinned = null; beams(null);
  if (dl) flyTo(districts[+dl.dataset.d]); else side(focus ? focus.node : M);
});
svg.addEventListener('pointerleave', () => { hovered = null; if (!pinned) { beams(null); side(focus ? focus.node : M); } });
svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), k = Math.max(0.2, Math.min(14, cam.k * f));
  cam.x = mx - (mx - cam.x) * (k / cam.k); cam.y = my - (my - cam.y) * (k / cam.k); cam.k = k; apply(); }, { passive: false });
$('#rotL').onclick = () => { rot = (rot + 3) % 4; redraw(); };
$('#rotR').onclick = () => { rot = (rot + 1) % 4; redraw(); };
$('#fit').onclick = () => { pinned = null; beams(null); fitAll(true); };
$('#crumb').addEventListener('click', e => { if (e.target.closest('[data-up]')) { pinned = null; beams(null); fitAll(true); } });
addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = null; beams(null); fitAll(true); } });
addEventListener('resize', () => { if (focus) flyTo(focus); else fitAll(false); });
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); pinned = null; beams(null); fitAll(true); });
function redraw() { const f = focus; draw(); index(); if (f) { focus = null; flyTo(f); } else fitAll(false); beams(pinned); }

window.OBS.start(m => {
  M = m;
  $('#legend').innerHTML = legendHTML(ATLAS_LAY) + `<span class="muted" style="max-width:220px;line-height:1.4;margin-top:4px">Course towers climb the same colours: Teacher Copy, refined, class-ready, taught.</span>`;
  layout(); draw(); index(); fitAll(false); side(M);
});
})();
