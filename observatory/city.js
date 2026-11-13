/* Maarif City. Every atlas and every course is a district; each course sits beside the atlas it is built from, joined by
   a road, so the chain reads left to right (atlas, then course). Each Fasl or lesson is a plot that grows one coloured
   floor per step along its ladder. Hover for a label, click to select (the panel shows the chain, the forms, open
   questions, mentor status), double-click or click a sign to fly in. Search with /, filter with the chips (dims, never
   moves anything), turn in quarter steps. Positions never change, so the city stays learnable. */
(function () {
'use strict';
const { $, esc, SOLID, ATLAS_LAY, reduced } = window.OBS;
const svg = $('#svg');
let M = null, rot = 0, cells = [], districts = [], blocks = [], roads = [], W = 0, H = 0;
let pinned = null, focus = null, cam = { x: 0, y: 0, k: 1 }, box = { x: 0, y: 0, w: 1, h: 1 };
const U = 10, FLOOR = 0.85, TOWER = 0.78;
const chips = new Set(); let preset = 'all', query = '';

/* ---------- layout ---------- */
const ROWS = [['mahdaviyat', 'zm'], ['tauheed', 'th'], ['akhlaq', 'ma'], ['mrf', 'taz'], ['adl', 'maad', 'nubuwat', 'imamat']];
const idOf = n => n.kind === 'Atlas' ? n.short.toLowerCase() : (n.id || (n.short === 'MRF' ? 'mrf' : n.short === 'MS' ? 'taz' : n.short.toLowerCase()));
function blocksOf(node) {
  if (node.kind === 'Atlas') return node.kids.map(b => ({ node: b, items: b.kids || [] }));
  const kids = node.kids || [];
  return kids.length && kids[0].kind === 'Bab' ? kids.map(b => ({ node: b, items: b.kids || [] })) : [{ node, items: kids }];
}
function layout() {
  const all = [...M.kids, ...M.courses], byId = {}; all.forEach(n => { byId[idOf(n)] = n; });
  cells = []; districts = []; blocks = []; roads = [];
  let y = 0;
  for (const row of ROWS) {
    let x = 0, rowH = 0; const inRow = [];
    for (const id of row) {
      const node = byId[id]; if (!node) continue;
      const small = node.kind === 'Atlas' && !M.courses.some(c => c.atlas === id); const s = small ? 0.55 : 1;
      const bl = blocksOf(node), total = bl.reduce((n, b) => n + Math.max(b.items.length, 4), 0);
      const DW = Math.max(10, Math.min(46, Math.ceil(Math.sqrt(total) * 1.6)));
      let bx = 0, by = 0, bh = 0, dw = 0; const placed = [];
      for (const b of bl) {
        const n = b.items.length, cols = n ? Math.max(2, Math.ceil(Math.sqrt(n * 1.3))) : 2, rows = n ? Math.ceil(n / cols) : 2;
        if (bx && bx + cols > DW) { bx = 0; by += bh + 1.4; bh = 0; }
        placed.push({ b, x: bx, y: by, cols, rows }); bx += cols + 1.4; bh = Math.max(bh, rows); dw = Math.max(dw, bx - 1.4);
      }
      const D = { node, id, x, y, w: dw * s, h: (by + bh) * s, s, small, blocks: [] };
      for (const p of placed) {
        const B = { node: p.b.node, D, x: x + p.x * s, y: y + p.y * s, w: p.cols * s, h: p.rows * s, empty: !p.b.items.length, cells: [] };
        D.blocks.push(B); blocks.push(B);
        p.b.items.forEach((it, i) => { const c = { node: it, D, B, x: x + (p.x + (i % p.cols)) * s, y: y + (p.y + Math.floor(i / p.cols)) * s, s, lvl: it.levels[0] || 0, course: node.kind !== 'Atlas' }; cells.push(c); B.cells.push(c); });
      }
      districts.push(D); inRow.push(D); x += D.w + (node.kind === 'Atlas' && !small ? 7 : 5); rowH = Math.max(rowH, D.h);
    }
    for (let i = 1; i < inRow.length; i++) if (inRow[i].node.kind === 'Course' && inRow[i - 1].node.kind === 'Atlas') roads.push({ a: inRow[i - 1], b: inRow[i] });
    y += rowH + 6;
  }
  W = Math.max(...districts.map(d => d.x + d.w)); H = Math.max(...districts.map(d => d.y + d.h));
  cells.forEach((c, i) => { c.i = i; c.props = props(c); });
}
function props(c) {
  const n = c.node, l = c.lvl, atlas = !c.course;
  return { written: l >= 1, sabaq: atlas ? l >= 2 : n.kind === 'Sabaq', refined: atlas ? l >= 3 : l >= 2, taught: l >= 4,
    ready: atlas ? l === 3 : l >= 2 && l < 4, q: (n.q || 0) > 0, mentor: !!n.mentor, revising: !!(n.mentor && n.mentor.status === 'revising') };
}

/* ---------- projection ---------- */
function turn(x, y) { return rot === 0 ? [x, y] : rot === 1 ? [H - y, x] : rot === 2 ? [W - x, H - y] : [y, W - x]; }
const P = (x, y, z) => [(x - y) * 0.866 * U, (x + y) * 0.5 * U - z * U];
const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function rectPoly(x, y, w, h) { return pts([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0))); }
function frontOf(x, y, w, h) { return [[x, y + h], [x + w, y + h], [x + w, y], [x, y]].map(([a, b]) => turn(a, b)).reduce((m, c) => c[0] + c[1] > m[0] + m[1] ? c : m); }
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * f))); return `rgb(${c})`; };
function prism(x, y, z0, h, w, col) {
  const z1 = z0 + h, top = [P(x, y, z1), P(x + w, y, z1), P(x + w, y + w, z1), P(x, y + w, z1)];
  const left = [P(x, y + w, z0), P(x + w, y + w, z0), P(x + w, y + w, z1), P(x, y + w, z1)], right = [P(x + w, y, z0), P(x + w, y + w, z0), P(x + w, y + w, z1), P(x + w, y, z1)];
  return `<polygon points="${pts(left)}" fill="${shade(col, .8)}"/><polygon points="${pts(right)}" fill="${shade(col, .93)}"/><polygon points="${pts(top)}" fill="${shade(col, 1.12)}"/>`;
}
const STEP_A = ['in the atlas plan', 'Fasl lesson written', 'used in a hub sabaq', 'refined, deck made', 'taught in class'];
const STEP_C = ['listed in the hub', 'Teacher Copy written', 'refined and proofed', 'class-ready, deck made', 'taught in class'];
const stepOf = c => (c.course ? STEP_C : STEP_A)[c.lvl];

/* ---------- drawing ---------- */
function draw() {
  let ground = '', towers = [], signs = '', babl = '', roofs = '', marks = '';
  for (const R of roads) {
    const a = R.a, b = R.b, y0 = b.y + Math.min(b.h, a.h) / 2;
    ground += `<polygon points="${rectPoly(a.x + a.w + .6, y0 - .7, b.x - a.x - a.w - 1.2, 1.4)}" fill="#e6e1d2"/><polygon points="${rectPoly(a.x + a.w + .6, y0 - .07, b.x - a.x - a.w - 1.2, .14)}" fill="#fffdf8"/>`;
  }
  districts.forEach((D, di) => {
    ground += `<polygon class="dist" data-d="${di}" points="${rectPoly(D.x - .6, D.y - .6, D.w + 1.2, D.h + 1.2)}" fill="${D.node.kind === 'Atlas' ? '#e8edf7' : '#e2f1ee'}" stroke="#d3d9e4"/>`;
    D.blocks.forEach(B => {
      ground += `<polygon class="blk" data-d="${di}" data-b="${blocks.indexOf(B)}" points="${rectPoly(B.x - .15 * D.s, B.y - .15 * D.s, B.w + .3 * D.s, B.h + .3 * D.s)}" fill="${B.empty ? '#f1efe7' : D.node.kind === 'Atlas' ? '#dde5f3' : '#d5ebe6'}"/>`;
      const f = frontOf(B.x, B.y, B.w, B.h), [bx, by] = P(f[0] + .2, f[1] + .2, 0);
      const ur = B.node.ur ? (B.node.ur.length > 26 ? B.node.ur.slice(0, 25) + '…' : B.node.ur) : '';
      if (B.node !== D.node) babl += `<g class="blab" data-x="${bx.toFixed(1)}" data-y="${by.toFixed(1)}"><text text-anchor="middle" y="9" font-size="11" font-weight="700" fill="#4f5753" stroke="#fffdf8" stroke-width="3" paint-order="stroke">${esc(B.node.short)}</text>${ur ? `<text text-anchor="middle" y="24" font-size="10.5" fill="#6b736f" stroke="#fffdf8" stroke-width="3" paint-order="stroke" font-family="Noto Nastaliq Urdu,serif" direction="rtl">${esc(ur)}</text>` : ''}</g>`;
    });
    const mid = turn(D.x + D.w / 2, D.y + D.h / 2), [lx, ly0] = P(mid[0], mid[1], 0);
    const lv = D.node.levels, n = lv.length || 1, cnt = k => lv.filter(l => l >= k).length;
    const nm = D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course';
    const line = lv.length ? (D.node.kind === 'Atlas' ? `${cnt(1)} written · ${cnt(2)} in a sabaq · ${cnt(4)} taught` : `${lv.length} ${D.node.unit} · ${cnt(2)} refined · ${cnt(4)} taught`) : (D.node.note || 'nothing listed yet');
    const wpx = Math.max(nm.length * 9, line.length * 6.1) + 24;
    let barH = '';
    if (lv.length) { let bx = -wpx / 2 + 12; for (let k = 4; k >= 1; k--) { const own = (cnt(k) - (k < 4 ? cnt(k + 1) : 0)) / n * (wpx - 24); if (own > .3) { barH += `<rect x="${bx.toFixed(1)}" y="20" width="${own.toFixed(1)}" height="5" fill="${SOLID[k]}"/>`; bx += own; } } barH = `<rect x="${-wpx / 2 + 12}" y="20" width="${wpx - 24}" height="5" rx="2.5" fill="#e7e5dc"/>` + barH; }
    signs += `<g class="sign" data-d="${di}" data-x="${lx.toFixed(1)}" data-y="${(ly0 - 30).toFixed(1)}"><line x1="0" y1="32" x2="0" y2="44" stroke="#b9c4bf" stroke-width="1.5"/><rect x="${-wpx / 2}" y="-20" width="${wpx}" height="${lv.length ? 52 : 44}" rx="10" fill="#fffdf8" fill-opacity=".95" stroke="${D.node.kind === 'Atlas' ? '#c3d2ee' : '#a8d8cf'}"/><text text-anchor="middle" y="-3" font-size="15" font-weight="700" fill="${D.node.kind === 'Atlas' ? '#2a5bb8' : '#0b7a70'}">${esc(nm)}</text><text text-anchor="middle" y="13" font-size="11.5" fill="#6b736f">${esc(line)}</text>${barH}</g>`;
  });
  cells.forEach(c => { const [x, y] = turn(c.x + c.s / 2, c.y + c.s / 2); c.rx = x - c.s / 2; c.ry = y - c.s / 2; });
  const order = cells.slice().sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));
  for (const c of order) {
    const w = TOWER * c.s, o = (c.s - w) / 2, fh = FLOOR * c.s; let g = '';
    if (!c.lvl) { g = `<polygon points="${pts([P(c.rx + o, c.ry + o, 0), P(c.rx + o + w, c.ry + o, 0), P(c.rx + o + w, c.ry + o + w, 0), P(c.rx + o, c.ry + o + w, 0)])}" fill="${c.course ? '#bfd9d3' : '#c9d4ea'}"/>`; c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, 0); }
    else { let z = 0; for (let f = 1; f <= c.lvl; f++) { g += prism(c.rx + o, c.ry + o, z, fh, w, SOLID[f]); z += fh; } c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, z); }
    towers.push(`<g class="c" data-i="${c.i}">${g}</g>`);
    if (c.lvl >= 1) roofs += `<text class="roof" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 2).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="#1d211f" stroke="#fffdf8" stroke-width="2.5" paint-order="stroke">${esc(c.node.short)}</text>`;
    if (c.props.q) marks += `<circle class="mk" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 4).toFixed(1)}" r="3.4" fill="#b4382a" stroke="#fff" stroke-width="1"/>`;
    if (c.node.mentor) { const col = { 'with mentor': '#2a5bb8', revising: '#b4382a', final: '#2c7a35' }[c.node.mentor.status] || '#6b736f'; marks += `<g class="mk flag" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 2).toFixed(1)}"><line x1="0" y1="0" x2="0" y2="-12" stroke="#1d211f" stroke-width="1"/><path d="M0,-12 L8,-9 L0,-6Z" fill="${col}"/></g>`; }
  }
  svg.innerHTML = `<g id="world"><g id="ground">${ground}</g><g id="towers">${towers.join('')}</g><g id="beams"></g><g id="babl">${babl}</g><g id="roofs">${roofs}</g><g id="marks">${marks}</g><g id="signs">${signs}</g></g>`;
  const gb = $('#ground').getBBox(), tb = $('#towers').getBBox(), x0 = Math.min(gb.x, tb.x), y0 = Math.min(gb.y, tb.y);
  box = { x: x0, y: y0 - 50, w: Math.max(gb.x + gb.width, tb.x + tb.width) - x0, h: Math.max(gb.y + gb.height, tb.y + tb.height) - y0 + 50 };
  apply(); paintFilter(); minimap();
}

/* ---------- camera ---------- */
function apply() {
  const g = $('#world'); if (!g) return;
  g.setAttribute('transform', `translate(${cam.x.toFixed(1)},${cam.y.toFixed(1)}) scale(${cam.k.toFixed(4)})`);
  const inv = 1 / cam.k, k = cam.k;
  svg.classList.toggle('z1', k > 1.5); svg.classList.toggle('z2', k > 2.2); svg.classList.toggle('z3', k > 3.4);
  const fix = (sel, s) => g.querySelectorAll(sel).forEach(l => l.setAttribute('transform', `translate(${l.dataset.x},${l.dataset.y}) scale(${s.toFixed(4)})`));
  fix('.sign', Math.min(1.1, inv * 0.95));
  const fd = focus ? districts.indexOf(focus.D) : -1;   // the district you are in shows its numbers in the panel, so its sign steps aside
  g.querySelectorAll('.sign').forEach(sg => { sg.style.display = k > 2.2 || +sg.dataset.d === fd ? 'none' : ''; });
  if (k > 1.5) fix('.blab', inv);
  if (k > 2.2) fix('.mk', inv);
  if (k > 3.4) fix('.roof', inv);
  viewport();
}
function fitBox(b, pad, animate) {
  const r = svg.getBoundingClientRect(), k = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);
  const to = { k, x: r.width / 2 - (b.x + b.w / 2) * k, y: r.height / 2 - (b.y + b.h / 2) * k };
  if (!animate || reduced) { cam = to; apply(); return; }
  const from = { ...cam }, t0 = performance.now();
  (function step(t) { const p = Math.min(1, (t - t0) / 550), e = 1 - Math.pow(1 - p, 3); cam = { k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }; apply(); if (p < 1) requestAnimationFrame(step); })(t0);
}
function areaBox(x, y, w, h, lift) { const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0)); const xs = c.map(p => p[0]), ys = c.map(p => p[1]); return { x: Math.min(...xs), y: Math.min(...ys) - lift, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) + lift }; }
function fitAll(animate) { focus = null; fitBox(box, 30, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function flyTo(D, animate = true) { focus = { D }; apply(); fitBox(areaBox(D.x - 1, D.y - 1, D.w + 2, D.h + 2, 6 * U), 40, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function flyToBlock(B, animate = true) { focus = { D: B.D, B }; fitBox(areaBox(B.x - 2, B.y - 2, B.w + 4, B.h + 4, 6 * U * B.D.s), 90, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function crumb() {
  let h = focus ? `<a data-up="all">Maarif</a><span class="sep">›</span>` : `<span class="cur">Maarif</span>`;
  if (focus) h += focus.B ? `<a data-up="d">${esc(focus.D.node.short)}</a><span class="sep">›</span><span class="cur">${esc(focus.B.node.short)}</span>` : `<span class="cur">${esc(focus.D.node.short)}</span>`;
  $('#crumb').innerHTML = h;
}

/* ---------- filters, search, dimming ---------- */
const PRESETS = { all: { t: 'Show everything', f: () => true }, ready: { t: 'Ready to teach', f: c => c.props.ready }, needs: { t: 'Needs me', f: c => c.props.q || c.props.revising }, taught: { t: 'Already taught', f: c => c.props.taught } };
const CHIPS = [['written', 'Written'], ['sabaq', 'In a sabaq'], ['refined', 'Refined'], ['taught', 'Taught'], ['q', 'Open questions'], ['mentor', 'With mentor']];
const norm = t => String(t || '').toLowerCase().replace(/\b([sblf])0+(\d)/g, '$1$2');
function matches(c) {
  if (!PRESETS[preset].f(c)) return false;
  for (const k of chips) if (!c.props[k]) return false;
  if (query) { const q = norm(query); if (!norm(c.node.code + ' ' + (c.node.ur || '')).includes(q)) return false; }
  return true;
}
const filtering = () => preset !== 'all' || chips.size > 0 || !!query;
function paintFilter() {
  const on = filtering(); let n = 0;
  const g = $('#towers'); if (!g) return;
  for (const el of g.children) { const c = cells[+el.dataset.i], m = !on || matches(c); if (m && on) n++; el.classList.toggle('dim', !m); }
  $('#count').textContent = on ? `${n} match${n === 1 ? '' : 'es'}` : '';
  $('#clear').hidden = !on;
  $('#chips').innerHTML = CHIPS.map(([k, t]) => { const tot = cells.filter(c => c.props[k]).length; return `<button type="button" class="chip${chips.has(k) ? ' on' : ''}" data-chip="${k}" aria-pressed="${chips.has(k)}">${t}<span>${tot}</span></button>`; }).join('');
  svg.classList.toggle('filtering', on); pinPaint();
}
function searchList() {
  const out = $('#results'), q = norm(query.trim());
  if (!q) { out.hidden = true; searchList.hits = []; return; }
  const hits = [];
  districts.forEach(D => { if (norm(D.node.code + ' ' + D.node.short + ' ' + (D.node.ur || '')).includes(q)) hits.push({ t: D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course', k: 'District', go: () => flyTo(D) }); });
  blocks.forEach(B => { if (B.node !== B.D.node && norm(B.node.code + ' ' + (B.node.ur || '')).includes(q)) hits.push({ t: B.node.code, s: B.node.ur, k: 'Bab', go: () => flyToBlock(B) }); });
  cells.forEach(c => { if (norm(c.node.code + ' ' + (c.node.ur || '')).includes(q)) hits.push({ t: c.node.code, s: c.node.ur, k: c.node.kind, go: () => select(c, true) }); });
  searchList.hits = hits.slice(0, 8); searchList.at = 0;
  out.innerHTML = searchList.hits.length ? searchList.hits.map((h, i) => `<button type="button" data-hit="${i}" class="${i ? '' : 'at'}"><b>${esc(h.t)}</b><span class="k">${esc(h.k)}</span>${h.s ? `<span class="u" dir="rtl">${esc(h.s)}</span>` : ''}</button>`).join('') + (hits.length > 8 ? `<div class="more">${hits.length - 8} more: keep typing</div>` : '') : '<div class="more">Nothing found</div>';
  out.hidden = false;
}

/* ---------- selection, chain, panel ---------- */
let byKey = new Map(), byNode = new Map(), byCode = new Map();
function index() { byKey = new Map(); byNode = new Map(); byCode = new Map(); cells.forEach(c => { byNode.set(c.node, c); byCode.set(c.node.code, c); if (c.node.key) byKey.set(c.node.key, c); }); }
function chainOf(c) {
  const n = c.node; if (n.kind === 'Fasl') return (n.kids || []).map(s => byNode.get(s)).filter(Boolean);
  if (n.kind === 'Sabaq') return (n.fkeys || []).map(k => byKey.get(k)).filter(Boolean); return [];
}
function beams() {
  const g = $('#beams'); if (!g) return; if (!pinned) { g.innerHTML = ''; return; }
  const c = pinned, to = chainOf(c);
  let h = `<circle cx="${c.top[0]}" cy="${c.top[1]}" r="4" fill="none" stroke="#1d211f" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  for (const t of to) { const [x1, y1] = c.top, [x2, y2] = t.top, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.3 - 18;
    h += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="#0b7a70" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".9"/><circle cx="${x2}" cy="${y2}" r="3" fill="#0b7a70"/>`; }
  g.innerHTML = h;
}
function pinPaint() {
  const g = $('#towers'); if (!g) return;
  const keep = pinned ? new Set([pinned, ...chainOf(pinned)].map(c => c.i)) : null;
  for (const el of g.children) el.classList.toggle('faded', !!keep && !keep.has(+el.dataset.i));
  beams();
}
function select(c, fly) { pinned = c; if (fly) flyToBlock(c.B); pinPaint(); panel(c); hashSet(); }
function unpin() { if (!pinned) return; pinned = null; pinPaint(); panel(null); hashSet(); }
const FORMS = [['tc', 'Teacher Copy'], ['handout', 'Handout'], [['refined', 'proof'], 'Refined'], [['main', 'extra'], 'Deck'], ['qa', 'QA deck'], ['audio', 'Audio'], ['tafseer', 'Tafseer']];
function groupRows(levels, lay) {
  const n = levels.length || 1, cnt = k => levels.filter(l => l >= k).length;
  return `<div class="rows">${lay.slice(1).map((t, i) => { const v = cnt(i + 1); return `<div><span><i style="background:${SOLID[i + 1]}"></i>${t}</span><b>${v} <small>${Math.round(v / n * 100)}%</small></b></div><div class="mini"><span style="width:${(v / n * 100).toFixed(1)}%;background:${SOLID[i + 1]}"></span></div>`; }).join('')}</div>`;
}
function panel(c) {
  const el = $('#side');
  if (!c) {
    const node = focus ? (focus.B ? focus.B.node : focus.D.node) : null;
    if (!node) { const lv = M.kids.flatMap(a => a.levels); el.innerHTML = `<span class="kind">Maarif</span><h2>All atlases and courses</h2><p class="muted">${lv.length.toLocaleString()} atlas Fasls in ${M.kids.length} atlases, and ${M.courses.length} courses. Each course stands beside the atlas it is built from. Click a sign to fly in, click a tower to select it, or press / to search.</p>${groupRows(lv, ATLAS_LAY)}`; return; }
    el.innerHTML = `<span class="kind">${esc(node.kind)}</span><h2>${esc(node.code)}</h2>${node.ur ? `<div class="ur" lang="ur" dir="rtl">${esc(node.ur)}</div>` : ''}${node.note ? `<p class="muted">${esc(node.note)}</p>` : ''}${node.levels.length ? groupRows(node.levels, node.lay || ATLAS_LAY) : ''}
      <div class="links">${node.wm ? `<a class="btn" href="${esc(node.wm)}" target="wm">Open in Work Map</a>` : ''}${node.rm ? `<a class="btn" href="${esc(node.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>`;
    return;
  }
  const n = c.node, steps = c.course ? STEP_C : STEP_A;
  let h = `<span class="kind">${esc(n.kind)}${c.course ? '' : ' · atlas'}</span><h2>${esc(n.code)}</h2>${n.ur ? `<div class="ur" lang="ur" dir="rtl">${esc(n.ur)}</div>` : ''}`;
  const link = (t, code) => code && byCode.has(code) ? `<a data-goto="${esc(code)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`;
  let chain = [];
  if (n.kind === 'Fasl') { const ss = n.kids || []; chain = [`<b>${esc(n.short)}</b>`, ss.length ? ss.map(s => link(s.code, s.code)).join('<br>') : '<span class="none">no sabaq yet</span>', ss.filter(s => s.L).map(s => `<span>${esc(s.L)}</span>`).join('<br>') || '<span class="none">none</span>']; }
  else if (n.kind === 'Sabaq') { const fs = chainOf(c); chain = [fs.length ? fs.map(f => link(f.node.code, f.node.code)).join('<br>') : '<span class="none">none listed</span>', `<b>${esc(n.short)}</b>`, n.L ? `<span>${esc(n.L)}</span>` : '<span class="none">not yet</span>']; }
  if (chain.length) h += `<div class="chain"><span class="ck">Atlas Fasl</span><span class="ck">Hub sabaq</span><span class="ck">Class lesson</span>${chain.map(x => `<span class="cv">${x}</span>`).join('')}</div>`;
  h += `<div class="ladder">${steps.map((t, i) => `<div class="${i <= c.lvl ? 'on' : ''}"><i style="background:${i <= c.lvl ? SOLID[i] : '#e7e5dc'}"></i>${t}</div>`).join('')}</div>`;
  if (n.has) { const has = new Set(n.has); h += `<div class="card"><h3>Forms</h3><div class="forms">${FORMS.map(([k, t]) => { const on = (Array.isArray(k) ? k : [k]).some(x => has.has(x)); return `<span class="form${on ? ' on' : ''}">${on ? '✓ ' : ''}${t}</span>`; }).join('')}</div>${n.rm ? `<a class="small" href="${esc(n.rm)}?t=files" target="rm">Open the files in Reading Mode</a>` : ''}</div>`; }
  if (n.q || n.notes) h += `<div class="card"><h3>Waiting on you</h3>${n.q ? `<div class="r"><span>Open questions</span><b class="red">${n.q}</b></div>` : ''}${n.notes ? `<div class="r"><span>Editor notes</span><b>${n.notes}</b></div>` : ''}${n.q && n.rm ? `<a class="small" href="${esc(n.rm)}?t=questions" target="rm">Answer them in Reading Mode</a>` : ''}</div>`;
  if (n.mentor) h += `<div class="card"><h3>Mentor</h3><div class="r"><span>${esc(n.mentor.status)}${n.mentor.round ? ', round ' + n.mentor.round : ''}</span><b>${esc((n.mentor.updated || '').slice(0, 10))}</b></div>${n.mentor.note ? `<p class="muted">${esc(n.mentor.note)}</p>` : ''}</div>`;
  if (n.note) h += `<p class="muted">${esc(n.note)}</p>`;
  h += `<div class="links">${n.wm ? `<a class="btn" href="${esc(n.wm)}" target="wm">Open in Work Map</a>` : ''}${n.rm ? `<a class="btn" href="${esc(n.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>`;
  h += `<p class="keys">← → next in this Bab · [ ] along the chain · Esc to let go</p>`;
  el.innerHTML = h;
}

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(c, x, y) { if (!c) { tip.hidden = true; return; } tip.innerHTML = `<b>${esc(c.node.code)}</b> · ${esc(stepOf(c))}${c.props.q ? ` · <span class="red">${c.node.q} open questions</span>` : ''}`; tip.hidden = false; tip.style.left = (x + 14) + 'px'; tip.style.top = (y + 14) + 'px'; }

/* ---------- mini-map ---------- */
let mm = null;
function minimap() {
  const cv = $('#mini'), ctx = cv.getContext('2d'), Wc = cv.width, Hc = cv.height, k = Math.min(Wc / box.w, Hc / box.h) * 0.92;
  mm = { k, ox: (Wc - box.w * k) / 2 - box.x * k, oy: (Hc - box.h * k) / 2 - box.y * k };
  ctx.clearRect(0, 0, Wc, Hc);
  districts.forEach(D => { const c = [[D.x, D.y], [D.x + D.w, D.y], [D.x + D.w, D.y + D.h], [D.x, D.y + D.h]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0));
    ctx.beginPath(); c.forEach(([x, y], i) => { const X = mm.ox + x * mm.k, Y = mm.oy + y * mm.k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    const lv = D.node.levels, f = lv.length ? lv.filter(l => l >= 2).length / lv.length : 0;
    ctx.fillStyle = D.node.kind === 'Atlas' ? `rgba(42,91,184,${(0.18 + f * 0.8).toFixed(2)})` : `rgba(11,122,112,${(0.3 + f * 0.6).toFixed(2)})`; ctx.fill(); });
  viewport();
}
function viewport() {
  const v = $('#vp'), cv = $('#mini'); if (!mm || !v) return; const r = svg.getBoundingClientRect();
  const x0 = (-cam.x) / cam.k, y0 = (-cam.y) / cam.k, x1 = (r.width - cam.x) / cam.k, y1 = (r.height - cam.y) / cam.k;
  const L = Math.max(0, mm.ox + x0 * mm.k), T = Math.max(0, mm.oy + y0 * mm.k), R2 = Math.min(cv.width, mm.ox + x1 * mm.k), B2 = Math.min(cv.height, mm.oy + y1 * mm.k);
  Object.assign(v.style, { left: L + 'px', top: T + 'px', width: Math.max(4, R2 - L) + 'px', height: Math.max(4, B2 - T) + 'px' });
}
$('#mini').addEventListener('click', e => { const r = e.target.getBoundingClientRect(), x = (e.clientX - r.left - mm.ox) / mm.k, y = (e.clientY - r.top - mm.oy) / mm.k, s = svg.getBoundingClientRect(); cam.x = s.width / 2 - x * cam.k; cam.y = s.height / 2 - y * cam.k; apply(); });

/* ---------- URL: focus, selection and filters can be bookmarked ---------- */
function hashSet() {
  const q = new URLSearchParams(); if (focus) q.set('d', focus.D.id); if (focus && focus.B) q.set('b', focus.B.node.short); if (pinned) q.set('p', pinned.node.code);
  if (chips.size) q.set('f', [...chips].join(',')); if (preset !== 'all') q.set('v', preset); if (rot) q.set('r', rot);
  const h = q.toString(); history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
}
function hashRead() {
  const q = new URLSearchParams(location.hash.slice(1));
  rot = (+q.get('r') || 0) % 4; (q.get('f') || '').split(',').filter(k => CHIPS.some(c => c[0] === k)).forEach(k => chips.add(k)); if (PRESETS[q.get('v')]) preset = q.get('v');
  return q;
}

/* ---------- pointer and keys ---------- */
let drag = null, lastClick = 0;
const cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const t = el && el.closest && el.closest('#towers .c'); return t ? cells[+t.dataset.i] : null; };
svg.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, id: e.pointerId }; });
svg.addEventListener('pointermove', e => {
  if (drag && (e.buttons & 1) && (drag.moved || Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4)) { if (!drag.moved) svg.setPointerCapture(drag.id); drag.moved = true; cam.x = drag.cx + e.clientX - drag.x; cam.y = drag.cy + e.clientY - drag.y; apply(); svg.classList.add('grabbing'); tip.hidden = true; return; }
  const r = svg.parentNode.getBoundingClientRect(); showTip(cellAt(e), e.clientX - r.left, e.clientY - r.top);
});
svg.addEventListener('pointerleave', () => { tip.hidden = true; });
svg.addEventListener('pointerup', e => {
  svg.classList.remove('grabbing'); const d = drag; drag = null; if (d && d.moved) return;
  const now = Date.now(), dbl = now - lastClick < 320; lastClick = now;
  const c = cellAt(e), el = document.elementFromPoint(e.clientX, e.clientY), sg = el && el.closest && el.closest('[data-d]');
  if (c) { if (dbl) flyToBlock(c.B); else if (pinned === c) unpin(); else select(c, false); return; }
  if (sg && sg.closest('.sign')) { flyTo(districts[+sg.dataset.d]); return; }
  if (dbl && sg) { const b = sg.dataset.b; if (b != null) flyToBlock(blocks[+b]); else flyTo(districts[+sg.dataset.d]); return; }
  unpin();
});
svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), k = Math.max(0.15, Math.min(16, cam.k * f));
  cam.x = mx - (mx - cam.x) * (k / cam.k); cam.y = my - (my - cam.y) * (k / cam.k); cam.k = k; apply(); }, { passive: false });
$('#side').addEventListener('click', e => { const a = e.target.closest('[data-goto]'); if (a) { const c = byCode.get(a.dataset.goto); if (c) select(c, true); } });
$('#crumb').addEventListener('click', e => { const a = e.target.closest('[data-up]'); if (!a) return; unpin(); if (a.dataset.up === 'd' && focus) flyTo(focus.D); else fitAll(true); });
$('#chips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (!b) return; const k = b.dataset.chip; if (chips.has(k)) chips.delete(k); else chips.add(k); paintFilter(); hashSet(); });
$('#preset').addEventListener('change', e => { preset = e.target.value; paintFilter(); hashSet(); });
$('#clear').addEventListener('click', () => { chips.clear(); preset = 'all'; $('#preset').value = 'all'; query = ''; qi.value = ''; searchList(); paintFilter(); hashSet(); });
const qi = $('#q');
const goHit = h => { query = ''; qi.value = ''; $('#results').hidden = true; paintFilter(); h.go(); };
qi.addEventListener('input', () => { query = qi.value; searchList(); paintFilter(); });
qi.addEventListener('keydown', e => {
  const hits = searchList.hits || [];
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && hits.length) { e.preventDefault(); searchList.at = (searchList.at + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; [...$('#results').querySelectorAll('[data-hit]')].forEach((b, i) => b.classList.toggle('at', i === searchList.at)); }
  if (e.key === 'Enter' && hits[searchList.at]) { e.preventDefault(); goHit(hits[searchList.at]); qi.blur(); }
  if (e.key === 'Escape') { query = ''; qi.value = ''; $('#results').hidden = true; paintFilter(); qi.blur(); }
});
$('#results').addEventListener('mousedown', e => { const b = e.target.closest('[data-hit]'); if (!b) return; e.preventDefault(); goHit(searchList.hits[+b.dataset.hit]); });
qi.addEventListener('blur', () => setTimeout(() => { $('#results').hidden = true; }, 150));
$('#rotL').onclick = () => turnBy(3); $('#rotR').onclick = () => turnBy(1);
$('#fit').onclick = () => { unpin(); fitAll(true); };
$('#zin').onclick = () => zoomBy(1.4); $('#zout').onclick = () => zoomBy(1 / 1.4);
$('#help').onclick = () => { $('#helpbox').hidden = !$('#helpbox').hidden; };
$('#helpbox').addEventListener('click', e => { if (e.target.closest('[data-close]')) $('#helpbox').hidden = true; });
function zoomBy(f) { const r = svg.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2, k = Math.max(0.15, Math.min(16, cam.k * f)); cam.x = mx - (mx - cam.x) * (k / cam.k); cam.y = my - (my - cam.y) * (k / cam.k); cam.k = k; apply(); }
function turnBy(d) { rot = (rot + d) % 4; const f = focus, p = pinned; draw(); if (f && f.B) flyToBlock(f.B, false); else if (f) flyTo(f.D, false); else fitAll(false); if (p) { pinned = p; pinPaint(); } hashSet(); }
function stepAlong(d) { if (!pinned) return; const list = pinned.B.cells, i = list.indexOf(pinned), n = list[i + d]; if (n) select(n, false); }
function stepChain(d) { if (!pinned) return; const ch = chainOf(pinned); if (ch.length) select(ch[d > 0 ? 0 : ch.length - 1], true); }
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (e.key === '/') { e.preventDefault(); qi.focus(); return; }
  if (e.key === 'Escape') { if (!$('#helpbox').hidden) { $('#helpbox').hidden = true; return; } if (pinned) unpin(); else if (focus && focus.B) flyTo(focus.D); else if (focus) fitAll(true); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); stepAlong(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); stepAlong(-1); }
  if (e.key === ']') stepChain(1); if (e.key === '[') stepChain(-1);
  if (e.key === 'q' || e.key === 'Q') turnBy(3); if (e.key === 'e' || e.key === 'E') turnBy(1);
  if (e.key === 'f' || e.key === 'F') { unpin(); fitAll(true); }
  if (e.key === '+' || e.key === '=') zoomBy(1.4); if (e.key === '-') zoomBy(1 / 1.4);
  if (e.key === '?') $('#helpbox').hidden = !$('#helpbox').hidden;
});
addEventListener('resize', () => { if (focus && focus.B) flyToBlock(focus.B, false); else if (focus) flyTo(focus.D, false); else fitAll(false); });
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); unpin(); fitAll(true); });

window.OBS.start(m => {
  M = m; const q = hashRead();
  $('#preset').innerHTML = Object.entries(PRESETS).map(([k, v]) => `<option value="${k}"${k === preset ? ' selected' : ''}>${v.t}</option>`).join('');
  layout(); draw(); index();
  const D = districts.find(d => d.id === q.get('d')), B = D && D.blocks.find(b => b.node.short === q.get('b')), p = byCode.get(q.get('p') || '');
  if (B) flyToBlock(B, false); else if (D) flyTo(D, false); else fitAll(false);
  if (p) select(p, false); else panel(null);
});
})();
