/* Maarif City. Every atlas and every course is a district; each course sits beside the atlas it is built from, joined by
   a road, so the chain reads left to right (atlas, then course). Each Fasl or lesson is a plot that grows one coloured
   floor per step along its ladder. Hover for a label, click to select (the panel shows the chain, the forms, open
   questions, mentor status), double-click or click a sign to fly in. Search with /, filter with the chips (dims, never
   moves anything), turn in quarter steps. Positions never change, so the city stays learnable. */
(function () {
'use strict';
const { $, esc, SOLID, PAL, ATLAS_LAY, reduced, stageOf } = window.OBS;
document.documentElement.style.setProperty('--accent', PAL.accent); document.documentElement.style.setProperty('--accent-wash', PAL.accentWash);
(() => { const st = document.getElementById('stage'); if (st) { st.style.background = PAL.bg; st.dataset.pal = PAL.dark ? 'dark' : 'light'; } })();
(() => { const lg = document.getElementById('legend'); if (!lg) return; const sw = (c, t, x) => `<span><i style="background:${c}"></i>${t}${x ? ` <small>(${x})</small>` : ''}</span>`;
  lg.innerHTML = sw(SOLID[1], 'Written', 'course: Teacher Copy') + sw(SOLID[2], 'In a sabaq', 'refined') + sw(SOLID[3], 'Refined, deck', 'class-ready') + sw(SOLID[4], 'Taught')
    + `<span><i style="background:repeating-linear-gradient(0deg,${PAL.L[0]} 0 3px,${PAL.L[1]} 3px 6px)"></i>Class lesson <small>(one slab per form; pale: planned)</small></span>`
    + sw(PAL.flatA, 'Not started') + `<span><i style="background:${PAL.blkE};border:1.5px dashed ${PAL.dashP}"></i>Bab not settled <small>(dotted: old atlas Bab kept as a placeholder)</small></span>`
    + `<span><i style="background:${PAL.q};border-radius:50%"></i>Open questions</span>` + `<span><i style="background:transparent;border:1.5px dashed ${SOLID[1]}"></i>Being written</span>` + `<span><i style="background:${PAL.accentWash};border:1.5px solid ${PAL.accent}"></i>Changed today</span>`; })();
const svg = $('#svg');
let M = null, rot = 0, cells = [], districts = [], blocks = [], roads = [], W = 0, H = 0;
let pinned = null, focus = null, cam = { x: 0, y: 0, k: 1 }, box = { x: 0, y: 0, w: 1, h: 1 };
const U = 10, FLOOR = 0.85, TOWER = 0.78;
const chips = new Set(); let preset = 'all', query = '', W0 = null, hovEl = null, lastKey = null, booted = false;

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
      const bare = node.kind === 'Atlas' && !node.levels.some(l => l > 0), small = node.kind === 'Atlas' && !M.courses.some(c => c.atlas === id); const s = bare ? 0.4 : small ? 0.55 : 1;
      const bl = blocksOf(node), total = bl.reduce((n, b) => n + Math.max(b.items.length, 4), 0);
      const DW = Math.max(10, Math.min(46, Math.ceil(Math.sqrt(total) * 1.6)));
      let bx = 0, by = 0, bh = 0, dw = 0; const placed = [];
      for (const b of bl) {
        const n = b.items.length, cols = n ? Math.max(2, Math.ceil(Math.sqrt(n * 1.3))) : 2, rowsS = n ? Math.ceil(n / cols) : 2;
        const Ls = b.items.filter(it => it.Lnode).map(it => it.Lnode).sort((m, k) => m.n - k.n);   // class lessons, in teaching order
        const rows = rowsS + (Ls.length ? 1 + Math.ceil(Ls.length / cols) : 0);
        if (bx && bx + cols > DW) { bx = 0; by += bh + 1.4; bh = 0; }
        placed.push({ b, x: bx, y: by, cols, rows, rowsS, Ls }); bx += cols + 1.4; bh = Math.max(bh, rows); dw = Math.max(dw, bx - 1.4);
      }
      const D = { node, id, x, y, w: dw * s, h: (by + bh) * s, s, small, bare, blocks: [], fresh: [] };
      for (const p of placed) {
        const B = { node: p.b.node, D, x: x + p.x * s, y: y + p.y * s, w: p.cols * s, h: p.rows * s, empty: !p.b.items.length, cells: [] };
        D.blocks.push(B); blocks.push(B);
        p.b.items.forEach((it, i) => { const c = { node: it, D, B, x: x + (p.x + (i % p.cols)) * s, y: y + (p.y + Math.floor(i / p.cols)) * s, s, lvl: it.levels[0] || 0, course: node.kind !== 'Atlas' }; cells.push(c); B.cells.push(c); });
        p.Ls.forEach((L, j) => { const c = { node: L, D, B, isL: true, x: x + (p.x + (j % p.cols)) * s, y: y + (p.y + p.rowsS + 1 + Math.floor(j / p.cols)) * s, s, lvl: L.taught ? 4 : 1, course: true }; cells.push(c); B.cells.push(c); });
        B.rowsS = p.rowsS; B.hasL = p.Ls.length > 0;
      }
      districts.push(D); inRow.push(D); x += D.w + (node.kind === 'Atlas' && !small ? 7 : 5); rowH = Math.max(rowH, D.h);
    }
    for (let i = 1; i < inRow.length; i++) if (inRow[i].node.kind === 'Course' && inRow[i - 1].node.kind === 'Atlas') roads.push({ a: inRow[i - 1], b: inRow[i] });
    y += rowH + 6;
  }
  W = Math.max(...districts.map(d => d.x + d.w)); H = Math.max(...districts.map(d => d.y + d.h));
  cells.forEach((c, i) => { c.i = i; c.props = props(c); });
}
const FORMS_L = [['tc', 'Teacher Copy'], ['handout', 'Handout'], [['refined', 'proof'], 'Refined'], [['main', 'extra'], 'Deck'], ['qa', 'QA deck'], ['tafseer', 'Tafseer'], ['flow', 'Flowchart'], ['audio', 'Audio']];
const formsOf = n => { const h = new Set(n.has || []); return FORMS_L.filter(([k]) => (Array.isArray(k) ? k : [k]).some(x => h.has(x))); };
function props(c) {
  const n = c.node, l = c.lvl, atlas = !c.course;
  if (c.isL) { const s = n.sab || {}, f = formsOf(n); return { written: true, sabaq: true, refined: f.some(x => x[1] === 'Refined'), taught: n.taught, ready: !n.taught && f.some(x => x[1] === 'Deck'), q: (s.q || 0) > 0, mentor: !!s.mentor, revising: !!(s.mentor && s.mentor.status === 'revising') }; }
  if (n.kind === 'Sabaq') { const st = stageOf(n.has); return { written: st >= 1, sabaq: true, refined: st >= 2, taught: false, ready: false, q: (n.q || 0) > 0, mentor: !!n.mentor, revising: !!(n.mentor && n.mentor.status === 'revising') }; }
  return { written: l >= 1, sabaq: atlas ? l >= 2 : n.kind === 'Sabaq', refined: atlas ? l >= 3 : l >= 2, taught: l >= 4,
    ready: atlas ? l === 3 : l >= 2 && l < 4, q: (n.q || 0) > 0, mentor: !!n.mentor, revising: !!(n.mentor && n.mentor.status === 'revising'), running: !!n.running };
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
const stepOf = c => c.isL ? `class lesson, ${c.node.taught ? 'taught' : 'planned'}, ${formsOf(c.node).length} forms made` : c.node.kind === 'Sabaq' ? ['listed in the hub', 'Teacher Copy written', 'refined'][Math.min(2, stageOf(c.node.has))] + (c.node.Lnode ? `, became ${c.node.Lnode.short}` : '') : (c.course ? STEP_C : STEP_A)[c.lvl] + (c.node.running ? ', being written now' : '');

/* ---------- drawing ---------- */
function draw() {
  byNodeTmp = new Map(cells.map(c => [c.node, c]));
  let ground = '', towers = [], signs = '', babl = '', roofs = '', marks = '', fresh = '';
  for (const R of roads) {
    const a = R.a, b = R.b, y0 = b.y + Math.min(b.h, a.h) / 2;
    ground += `<polygon points="${rectPoly(a.x + a.w + .6, y0 - .7, b.x - a.x - a.w - 1.2, 1.4)}" fill="${PAL.road}"/><polygon points="${rectPoly(a.x + a.w + .6, y0 - .07, b.x - a.x - a.w - 1.2, .14)}" fill="${PAL.halo}"/>`;
  }
  const gm = groundMatrix();
  districts.forEach((D, di) => {
    ground += `<polygon class="dist" data-d="${di}" points="${rectPoly(D.x - .6, D.y - .6, D.w + 1.2, D.h + 1.2)}" fill="${D.node.kind === 'Atlas' ? PAL.distA : PAL.distC}" stroke="${PAL.distLine}"/>`;
    D.blocks.forEach(B => {
      ground += `<polygon class="blk" data-d="${di}" data-b="${blocks.indexOf(B)}" points="${rectPoly(B.x - .15 * D.s, B.y - .15 * D.s, B.w + .3 * D.s, B.h + .3 * D.s)}" fill="${B.node.plan === 'placeholder' ? PAL.blkP : B.empty ? PAL.blkE : D.node.kind === 'Atlas' ? PAL.blkA : PAL.blkC}"${B.node.plan === 'provisional' ? ` stroke="${PAL.dashP}" stroke-dasharray="5 3"` : B.node.plan === 'placeholder' ? ' stroke="${PAL.dashP2}" stroke-dasharray="1 3.5"' : ''} vector-effect="non-scaling-stroke" stroke-width="1.3"/>`;
      const f = frontOf(B.x, B.y, B.w, B.h), [bx, by] = P(f[0] + .2, f[1] + .2, 0);
      const ur = B.node.ur ? (B.node.ur.length > 26 ? B.node.ur.slice(0, 25) + '…' : B.node.ur) : '';
      if (B.node !== D.node) {   // the Bab number lies flat in the street along the block's front edge, where no plot covers it
        const ax = gm, cx = B.x + B.w / 2, cy = B.y + B.h / 2, ct = turn(cx, cy);
        const edges = [[[B.x, B.y + B.h], [B.x + B.w, B.y + B.h]], [[B.x, B.y], [B.x + B.w, B.y]], [[B.x, B.y], [B.x, B.y + B.h]], [[B.x + B.w, B.y], [B.x + B.w, B.y + B.h]]].map(([p1, p2]) => {
          const t1 = turn(...p1), t2 = turn(...p2), s1 = P(t1[0], t1[1], 0), s2 = P(t2[0], t2[1], 0), dx = s2[0] - s1[0], dy = s2[1] - s1[1];
          return { m: [(t1[0] + t2[0]) / 2, (t1[1] + t2[1]) / 2], par: Math.abs(dx * ax[1] - dy * ax[0]) < 1e-3 * Math.hypot(dx, dy) * Math.hypot(ax[0], ax[1]) + 1e-9 }; });
        const e = edges.filter(x => x.par).reduce((m, x) => x.m[0] + x.m[1] > m.m[0] + m.m[1] ? x : m);
        const v = [e.m[0] - ct[0], e.m[1] - ct[1]], L = Math.hypot(...v) || 1, off = 0.72 * D.s, at = [e.m[0] + v[0] / L * off, e.m[1] + v[1] / L * off], [gx, gy] = P(at[0], at[1], 0);
        ground += `<text class="gnum" transform="matrix(${gm.map(v => v.toFixed(3)).join(' ')} ${gx.toFixed(1)} ${gy.toFixed(1)})" font-size="${(1.05 * D.s).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-weight="800" fill="${D.node.kind === 'Atlas' ? PAL.gnumA : PAL.gnumC}">${esc(B.node.short)}</text>`; }
      if (B.node !== D.node && ur) babl += `<g class="blab" data-x="${bx.toFixed(1)}" data-y="${by.toFixed(1)}"><text text-anchor="middle" y="16" font-size="13.5" fill="${PAL.ink}" stroke="${PAL.halo}" stroke-width="4" paint-order="stroke" font-family="Noto Nastaliq Urdu,serif" direction="rtl">${esc(ur)}</text></g>`;
    });
    const mid = turn(D.x + D.w / 2, D.y + D.h / 2), [lx, ly0] = P(mid[0], mid[1], 0);
    const lv = D.node.levels, n = lv.length || 1, cnt = k => lv.filter(l => l >= k).length;
    const nm = D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course';
    const line = lv.length ? (D.node.kind === 'Atlas' ? (cnt(1) ? `${cnt(1)} of ${lv.length} Fasls written, ${cnt(4)} taught` : `${lv.length} Fasls planned, none written yet`) : `${cnt(1)} of ${lv.length} ${D.node.unit} written, ${cnt(4)} taught`) : (D.node.note || 'nothing listed yet');
    const fl = D.fresh.length ? `updated ${rel(D.fresh[0].when)}` : '';
    const wpx = Math.max(nm.length * 9, line.length * 6.1) + 24;
    let barH = '';
    if (lv.length) { let bx = -wpx / 2 + 12; for (let k = 4; k >= 1; k--) { const own = (cnt(k) - (k < 4 ? cnt(k + 1) : 0)) / n * (wpx - 24); if (own > .3) { barH += `<rect x="${bx.toFixed(1)}" y="20" width="${own.toFixed(1)}" height="5" fill="${SOLID[k]}"/>`; bx += own; } } barH = `<rect x="${-wpx / 2 + 12}" y="20" width="${wpx - 24}" height="5" rx="2.5" fill="${PAL.track}"/>` + barH; }
    signs += `<g class="sign" data-d="${di}" data-x="${lx.toFixed(1)}" data-y="${(ly0 - 30).toFixed(1)}"><line x1="0" y1="32" x2="0" y2="44" stroke="${PAL.post}" stroke-width="1.5"/><rect x="${-wpx / 2}" y="-20" width="${wpx}" height="${(lv.length ? 52 : 44) + (fl ? 15 : 0)}" rx="10" fill="#fffdf8" fill-opacity=".95" stroke="${D.node.kind === 'Atlas' ? PAL.track : PAL.track}"/><text text-anchor="middle" y="-3" font-size="15" font-weight="700" fill="${D.node.kind === 'Atlas' ? PAL.signA : PAL.signC}">${esc(nm)}</text><text text-anchor="middle" y="13" font-size="11.5" fill="${PAL.ink2}">${esc(line)}</text>${barH}${fl ? `<text text-anchor="middle" y="${lv.length ? 41 : 33}" font-size="11" font-weight="600" fill="${PAL.accent}">● ${esc(fl)}</text>` : ''}</g>`;
  });
  cells.forEach(c => { const [x, y] = turn(c.x + c.s / 2, c.y + c.s / 2); c.rx = x - c.s / 2; c.ry = y - c.s / 2; });
  let paths = '';
  for (const c of cells) if (c.isL) { const sc = byNodeTmp.get(c.node.sab); if (!sc) continue; const a = P(sc.rx + sc.s / 2, sc.ry + sc.s / 2, 0), b = P(c.rx + c.s / 2, c.ry + c.s / 2, 0);
    paths += `<path data-i="${c.i}" d="M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)}" stroke="${c.node.taught ? PAL.path : PAL.pathP}" stroke-width="2" ${c.node.taught ? '' : 'stroke-dasharray="4 3"'} vector-effect="non-scaling-stroke" stroke-linecap="round" opacity=".9"/>`; }
  const order = cells.slice().sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));
  for (const c of order) {
    const w = TOWER * c.s, o = (c.s - w) / 2, fh = FLOOR * c.s; let g = '';
    if (c.isL) { const f = Math.max(1, formsOf(c.node).length), sh = 0.42 * c.s, wl = 0.9 * c.s, ol = (c.s - wl) / 2, pal = c.node.taught ? PAL.L : PAL.Lp; let z = 0;
      for (let k = 0; k < f; k++) { g += prism(c.rx + ol, c.ry + ol, z, sh, wl, pal[k % 2]); z += sh; } c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, z);
      if (c.fresh) fresh += `<polygon class="fr" data-i="${c.i}" points="${pts([P(c.rx, c.ry, 0), P(c.rx + c.s, c.ry, 0), P(c.rx + c.s, c.ry + c.s, 0), P(c.rx, c.ry + c.s, 0)])}"/>`;
      towers.push(`<g class="c L" data-i="${c.i}">${g}</g>`);
      roofs += `<text class="lroof" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 3).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="${PAL.lroof}" stroke="${PAL.halo}" stroke-width="3" paint-order="stroke">${esc(c.node.short)}</text>`;
      continue; }
    const lv = c.node.kind === 'Sabaq' ? Math.min(2, stageOf(c.node.has)) : c.lvl;
    if (!lv) { g = `<polygon points="${pts([P(c.rx + o, c.ry + o, 0), P(c.rx + o + w, c.ry + o, 0), P(c.rx + o + w, c.ry + o + w, 0), P(c.rx + o, c.ry + o + w, 0)])}" fill="${c.course ? PAL.flatC : PAL.flatA}"/>`; c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, 0); }
    else { let z = 0; for (let f = 1; f <= lv; f++) { g += prism(c.rx + o, c.ry + o, z, fh, w, SOLID[f]); z += fh; } c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, z); }
    if (c.node.running) { const z0 = lv ? (c.top[1] - P(c.rx + c.s / 2, c.ry + c.s / 2, 0)[1]) / -U : 0; g += wire(c.rx + o, c.ry + o, z0, fh, w, SOLID[Math.min(4, lv + 1)]); c.top = P(c.rx + c.s / 2, c.ry + c.s / 2, z0 + fh); }
    if (c.fresh) fresh += `<polygon class="fr" data-i="${c.i}" points="${pts([P(c.rx, c.ry, 0), P(c.rx + c.s, c.ry, 0), P(c.rx + c.s, c.ry + c.s, 0), P(c.rx, c.ry + c.s, 0)])}"/>`;
    towers.push(`<g class="c" data-i="${c.i}">${g}</g>`);
    if (lv >= 1) roofs += `<text class="roof" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 2).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="${PAL.ink}" stroke="${PAL.halo}" stroke-width="2.5" paint-order="stroke">${esc(c.node.short)}</text>`;
    if (c.props.q) marks += `<circle class="mk" data-i="${c.i}" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 4).toFixed(1)}" cx="11" cy="-5" r="3.4" fill="${PAL.q}" stroke="#fff" stroke-width="1"/>`;
    if (c.node.mentor) { const col = PAL.mentor[c.node.mentor.status] || '#6b736f'; marks += `<g class="mk flag" data-i="${c.i}" data-x="${c.top[0].toFixed(1)}" data-y="${(c.top[1] - 2).toFixed(1)}"><g transform="translate(-12,0)"><line x1="0" y1="0" x2="0" y2="-12" stroke="#1d211f" stroke-width="1"/><path d="M0,-12 L8,-9 L0,-6Z" fill="${col}"/></g></g>`; }
  }
  svg.innerHTML = `<g id="world"><g id="ground">${ground}</g><g id="fresh">${fresh}</g><g id="paths">${paths}</g><g id="towers">${towers.join('')}</g><g id="beams"></g><g id="babl">${babl}</g><g id="roofs">${roofs}</g><g id="marks">${marks}</g><g id="signs">${signs}</g></g>`;
  const gb = $('#ground').getBBox(), tb = $('#towers').getBBox(), x0 = Math.min(gb.x, tb.x), y0 = Math.min(gb.y, tb.y);
  box = { x: x0, y: y0 - 50, w: Math.max(gb.x + gb.width, tb.x + tb.width) - x0, h: Math.max(gb.y + gb.height, tb.y + tb.height) - y0 + 50 };
  const core = districts.filter(D => !D.bare).map(D => areaBox(D.x - 1, D.y - 1, D.w + 2, D.h + 2, 6 * U));
  if (core.length) { const x0 = Math.min(...core.map(b => b.x)), y0 = Math.min(...core.map(b => b.y)); boxCore = { x: x0, y: y0 - 30, w: Math.max(...core.map(b => b.x + b.w)) - x0, h: Math.max(...core.map(b => b.y + b.h)) - y0 + 30 }; } else boxCore = box;
  apply(); paintFilter(); minimap();
}
let boxCore = null;
function wire(x, y, z0, h, w, col) {   // a floor being written now: an outline, not yet filled
  const z1 = z0 + h, top = [P(x, y, z1), P(x + w, y, z1), P(x + w, y + w, z1), P(x, y + w, z1)];
  const left = [P(x, y + w, z0), P(x + w, y + w, z0), P(x + w, y + w, z1), P(x, y + w, z1)], right = [P(x + w, y, z0), P(x + w, y + w, z0), P(x + w, y + w, z1), P(x + w, y, z1)];
  const st = `fill="${col}" fill-opacity=".18" stroke="${shade(col, .8)}" stroke-width="1.2" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"`;
  return `<polygon points="${pts(left)}" ${st}/><polygon points="${pts(right)}" ${st}/><polygon points="${pts(top)}" ${st}/>`;
}
const rel = when => { const t = Date.parse(String(when).replace(' UTC', '').replace(' ', 'T') + 'Z'), now = W0 && W0.made ? Date.parse(String(W0.made).replace(' UTC', '').replace(' ', 'T') + 'Z') : Date.now(), m = Math.max(0, (now - t) / 6e4);
  return m < 60 ? `${Math.round(m)} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };

/* ---------- camera ---------- */
function apply() {
  const g = $('#world'); if (!g) return;
  g.setAttribute('transform', `translate(${cam.x.toFixed(1)},${cam.y.toFixed(1)}) scale(${cam.k.toFixed(4)})`);
  const inv = 1 / cam.k, k = cam.k;
  svg.classList.toggle('z1', k > 1.5); svg.classList.toggle('z2', k > 2.2); svg.classList.toggle('z3', k > 3.4);
  const fix = (sel, s) => g.querySelectorAll(sel).forEach(l => l.setAttribute('transform', `translate(${l.dataset.x},${l.dataset.y}) scale(${s.toFixed(4)})`));
  fix('.sign', Math.min(1.1, inv * 0.95));
  if (k > 0.9) fix('.lroof', Math.min(1.3, inv * 1.1));
  svg.classList.toggle('z0', k > 0.9);
  const fd = focus ? districts.indexOf(focus.D) : -1;   // the district you are in shows its numbers in the panel, so its sign steps aside
  g.querySelectorAll('.sign').forEach(sg => { sg.style.display = k > 2.2 || +sg.dataset.d === fd ? 'none' : ''; });
  unclash(g.querySelectorAll('.sign'));
  if (k > 1.5) fix('.blab', inv);
  if (k > 2.2) fix('.mk', inv);
  if (k > 3.4) fix('.roof', inv);
  viewport();
}
function unclash(list) {
  const placed = [];
  list.forEach(sg => { if (sg.style.display === 'none') return; let dy = 0;
    for (let tries = 0; tries < 6; tries++) { const r = sg.getBoundingClientRect(), hit = placed.find(p => r.left < p.right && r.right > p.left && r.top + dy < p.bottom && r.bottom + dy > p.top);
      if (!hit) break; dy += hit.bottom - (r.top + dy) + 6; }
    if (dy) sg.setAttribute('transform', sg.getAttribute('transform').replace(/translate\(([^,]+),([^)]+)\)/, (m, x, y) => `translate(${x},${(+y + dy / cam.k).toFixed(1)})`));
    placed.push(sg.getBoundingClientRect()); });
}
function fitBox(b, pad, animate) {
  const r = svg.getBoundingClientRect(), k = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);
  const to = { k, x: r.width / 2 - (b.x + b.w / 2) * k, y: r.height / 2 - (b.y + b.h / 2) * k };
  if (!animate || reduced) { cam = to; apply(); return; }
  const from = { ...cam }, t0 = performance.now();
  (function step(t) { const p = Math.min(1, (t - t0) / 550), e = 1 - Math.pow(1 - p, 3); cam = { k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }; apply(); if (p < 1) requestAnimationFrame(step); })(t0);
}
function areaBox(x, y, w, h, lift) { const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0)); const xs = c.map(p => p[0]), ys = c.map(p => p[1]); return { x: Math.min(...xs), y: Math.min(...ys) - lift, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) + lift }; }
function fitAll(animate) { focus = null; fitBox(boxCore || box, 30, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function flyTo(D, animate = true) { focus = { D }; apply(); fitBox(areaBox(D.x - 1, D.y - 1, D.w + 2, D.h + 2, 6 * U), 40, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function flyToBlock(B, animate = true) { focus = { D: B.D, B }; fitBox(areaBox(B.x - 2, B.y - 2, B.w + 4, B.h + 4, 6 * U * B.D.s), 90, animate); crumb(); if (!pinned) panel(null); hashSet(); }
function crumb() {
  let h = focus ? `<a data-up="all">Maarif</a><span class="sep">›</span>` : `<span class="cur">Maarif</span>`;
  if (focus) h += focus.B ? `<a data-up="d">${esc(focus.D.node.short)}</a><span class="sep">›</span><span class="cur">${esc(focus.B.node.short)}</span>` : `<span class="cur">${esc(focus.D.node.short)}</span>`;
  $('#crumb').innerHTML = h;
}

/* ---------- filters, search, dimming ---------- */
const PRESETS = { all: { t: 'Show everything', f: () => true }, ready: { t: 'Ready to teach', f: c => c.props.ready }, needs: { t: 'Needs me', f: c => c.props.q || c.props.revising }, taught: { t: 'Already taught', f: c => c.props.taught } };
const CHIPS = [['written', 'Written'], ['sabaq', 'In a sabaq'], ['refined', 'Refined'], ['taught', 'Taught'], ['running', 'Being written'], ['changed', 'Changed today'], ['q', 'Open questions'], ['mentor', 'With mentor']];
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
  const ok = cells.map(c => !on || matches(c)); hits = on ? cells.filter((c, i) => ok[i]) : [];
  for (const el of g.children) { const i = +el.dataset.i; el.classList.toggle('dim', !ok[i]); }
  ['#marks', '#paths', '#fresh'].forEach(sel => { const box = $(sel); if (box) for (const el of box.children) el.classList.toggle('dim', !ok[+el.dataset.i]); });
  n = hits.length;
  $('#count').textContent = on ? (n ? `${n} match${n === 1 ? '' : 'es'}` : 'Nothing matches') : '';
  $('#showm').hidden = !on || !n; $('#clear').hidden = !on;
  const tot = k => cells.filter(c => c.props[k]).length;
  $('#chips').innerHTML = CHIPS.map(([k, t]) => { const v = tot(k), off = !v && !chips.has(k); return `<button type="button" class="chip${chips.has(k) ? ' on' : ''}" data-chip="${k}" aria-pressed="${chips.has(k)}"${off ? ' disabled title="None right now"' : ''}>${t}<span>${v}</span></button>`; }).join('');
  $('#preset').innerHTML = Object.entries(PRESETS).map(([k, v]) => { const c = k === 'all' ? '' : `<span>${cells.filter(v.f).length}</span>`; return `<button type="button" class="seg-b${k === preset ? ' on' : ''}" data-preset="${k}" aria-pressed="${k === preset}">${v.t}${c}</button>`; }).join('');
  svg.classList.toggle('filtering', on); pinPaint();
}
let hits = [];
function showMatches() { if (!hits.length) return; const xs = hits.map(c => c.top[0]), ys = hits.map(c => c.top[1]); const x0 = Math.min(...xs) - 20, y0 = Math.min(...ys) - 30;
  focus = null; crumb(); fitBox({ x: x0, y: y0, w: Math.max(...xs) - x0 + 20, h: Math.max(...ys) - y0 + 40 }, 80, true); }
function stepMatch(d) { const list = filtering() ? hits : []; if (!list.length) return; const i = pinned ? list.indexOf(pinned) : -1, n = list[(i + d + list.length) % list.length]; select(n, true); }
function searchList() {
  const out = $('#results'), q = norm(query.trim());
  if (!q) { out.hidden = true; searchList.hits = []; return; }
  const hits = [];
  districts.forEach(D => { if (norm(D.node.code + ' ' + D.node.short + ' ' + (D.node.ur || '')).includes(q)) hits.push({ t: D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short + ' course', k: 'District', go: () => flyTo(D) }); });
  blocks.forEach(B => { if (B.node !== B.D.node && norm(B.node.code + ' ' + (B.node.ur || '')).includes(q)) hits.push({ t: B.node.code, s: B.node.ur, k: 'Bab', go: () => flyToBlock(B) }); });
  cells.forEach(c => { if (norm(c.node.code + ' ' + (c.node.ur || '')).includes(q)) hits.push({ t: c.node.code, s: c.node.ur, k: c.node.kind, col: c.isL ? (c.node.taught ? PAL.L[0] : PAL.Lp[0]) : SOLID[c.lvl], go: () => select(c, true) }); });
  searchList.hits = hits.slice(0, 8); searchList.at = 0;
  out.innerHTML = searchList.hits.length ? searchList.hits.map((h, i) => `<button type="button" data-hit="${i}" class="${i ? '' : 'at'}">${h.col ? `<i class="sw" style="background:${h.col}"></i>` : ''}<b>${esc(h.t)}</b><span class="k">${esc(h.k)}</span>${h.s ? `<span class="u" dir="${/[\u0600-\u06ff]/.test(h.s) ? 'rtl' : 'ltr'}">${esc(h.s)}</span>` : ''}</button>`).join('') + (hits.length > 8 ? `<div class="more">${hits.length - 8} more: keep typing</div>` : '') : '<div class="more">Nothing found</div>';
  out.hidden = false;
}

/* ---------- selection, chain, panel ---------- */
let byKey = new Map(), byNode = new Map(), byCode = new Map();
function index() { byKey = new Map(); byNode = new Map(); byCode = new Map(); cells.forEach(c => { byNode.set(c.node, c); byCode.set(c.node.code, c); if (c.node.key) byKey.set(c.node.key, c); }); }
function chainOf(c) {
  const n = c.node; if (n.kind === 'Fasl') return (n.kids || []).map(s => byNode.get(s)).filter(Boolean);
  if (n.kind === 'Sabaq') return [...(n.fkeys || []).map(k => byKey.get(k)), n.Lnode && byNode.get(n.Lnode)].filter(Boolean);
  if (c.isL) return [byNode.get(n.sab)].filter(Boolean); return [];
}
function beams() {
  const g = $('#beams'); if (!g) return; if (!pinned) { g.innerHTML = ''; return; }
  const c = pinned, to = chainOf(c);
  let h = `<circle cx="${c.top[0]}" cy="${c.top[1]}" r="4" fill="none" stroke="${PAL.ring}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  for (const t of to) { const [x1, y1] = c.top, [x2, y2] = t.top, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.3 - 18;
    h += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="${PAL.beam}" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".9"/><circle cx="${x2}" cy="${y2}" r="3" fill="${PAL.beam}"/>`; }
  g.innerHTML = h;
}
function pinPaint() {
  const g = $('#towers'); if (!g) return;
  const keep = pinned ? new Set([pinned, ...chainOf(pinned)].map(c => c.i)) : null;
  for (const el of g.children) { el.classList.toggle('faded', !!keep && !keep.has(+el.dataset.i)); el.classList.toggle('sel', !!pinned && +el.dataset.i === pinned.i); }
  beams();
}
function select(c, fly) { pinned = c; if (fly) flyToBlock(c.B); pinPaint(); panel(c); hashSet(); }
function unpin() { if (!pinned) return; pinned = null; pinPaint(); panel(null); hashSet(); }
const FORMS = FORMS_L;
function groupRows(levels, lay) {
  const n = levels.length || 1, cnt = k => levels.filter(l => l >= k).length;
  return `<div class="rows">${lay.slice(1).map((t, i) => { const v = cnt(i + 1); return `<div><span><i style="background:${SOLID[i + 1]}"></i>${t}</span><b>${v} <small>${Math.round(v / n * 100)}%</small></b></div><div class="mini"><span style="width:${(v / n * 100).toFixed(1)}%;background:${SOLID[i + 1]}"></span></div>`; }).join('')}</div>`;
}
function miniBar(levels) { const n = levels.length || 1; let h = ''; for (let k = 4; k >= 1; k--) { const own = (levels.filter(l => l >= k).length - (k < 4 ? levels.filter(l => l >= k + 1).length : 0)) / n * 100; if (own > 0) h += `<span style="width:${own.toFixed(1)}%;background:${SOLID[k]}"></span>`; } return `<span class="pb">${h}</span>`; }
function floorsOf(c) { if (c.isL) return `<i class="fl" style="background:${c.node.taught ? PAL.L[0] : PAL.Lp[0]};outline:1px solid ${PAL.L[0]}"></i>`; const lv = c.node.kind === 'Sabaq' ? Math.min(2, stageOf(c.node.has)) : c.lvl; let h = ''; for (let k = 1; k <= 4; k++) h += `<i class="fl" style="background:${k <= lv ? SOLID[k] : PAL.track}"></i>`; return h; }
function cellRow(c) { const n = c.node;
  return `<button type="button" class="prow cr${pinned === c ? ' on' : ''}" data-cell="${c.i}"><span class="pn">${esc(n.short)}</span><span class="fls">${floorsOf(c)}</span><span class="pu" dir="rtl" lang="ur">${esc(n.ur || '')}</span><span class="pt">${n.Lnode ? `<em class="lb${n.Lnode.taught ? ' t' : ''}">${esc(n.Lnode.short)}</em>` : ''}${c.props.q ? `<em class="qb">${n.q || (n.sab && n.sab.q) || ''}</em>` : ''}${c.props.running ? '<em class="rb">writing</em>' : ''}${c.fresh ? '<i class="dot"></i>' : ''}</span></button>`; }
function panel(c) {
  const el = $('#side');
  if (!c) {
    const node = focus ? (focus.B ? focus.B.node : focus.D.node) : null;
    if (!node) {
      const row = D => { const lv = D.node.levels, c1 = lv.filter(l => l >= 1).length, c4 = lv.filter(l => l >= 4).length;
        return `<button type="button" class="prow" data-fly="${districts.indexOf(D)}"><span class="pn">${esc(D.node.kind === 'Atlas' ? D.node.short + ' atlas' : D.node.short)}${D.fresh.length ? '<i class="dot" title="Changed in the last 24 hours"></i>' : ''}</span>${miniBar(lv)}<span class="pc">${lv.length ? `${c1} of ${lv.length} written${c4 ? `, ${c4} taught` : ''}` : 'nothing listed yet'}</span></button>`; };
      const cs = districts.filter(D => D.node.kind !== 'Atlas'), as = districts.filter(D => D.node.kind === 'Atlas');
      el.innerHTML = `<span class="kind">Maarif</span><h2>Your courses</h2><div class="plist">${cs.map(row).join('')}</div><h3 class="sub">Atlases, the source books</h3><div class="plist">${as.map(row).join('')}</div><p class="keys">Click a row or a sign to fly in · / to search · pinch or scroll to zoom</p>`; return; }
    const D = focus.D, B = focus.B;
    let rows = '';
    if (B) rows = `<div class="plist">${B.cells.map(c => cellRow(c)).join('')}</div>`;
    else if (D.blocks.length > 1 || D.blocks[0].node !== D.node) rows = `<div class="plist">${D.blocks.map((b, i) => { const lv = b.node.levels || [], c1 = lv.filter(l => l >= 1).length, c4 = lv.filter(l => l >= 4).length;
      return `<button type="button" class="prow" data-flyb="${blocks.indexOf(b)}"><span class="pn">${esc(b.node.short)}${b.node.plan && b.node.plan !== 'settled' ? ` <small>${esc(b.node.plan)}</small>` : ''}</span>${miniBar(lv)}<span class="pc">${lv.length ? `${c1} of ${lv.length}${c4 ? `, ${c4} taught` : ''}` : 'none yet'}</span>${b.node.ur ? `<span class="pu" dir="rtl" lang="ur">${esc(b.node.ur)}</span>` : ''}</button>`; }).join('')}</div>`;
    else rows = `<div class="plist">${D.blocks[0].cells.map(c => cellRow(c)).join('')}</div>`;
    const fr = !B && D.fresh.length ? `<div class="card"><h3>Changed in the last 24 hours</h3>${D.fresh.slice(0, 5).map(ch => `<div class="chg"><b>${esc(rel(ch.when))}</b> <span class="${ch.saved ? 'ok' : 'warn'}">${ch.saved ? 'saved on main' : 'on branch ' + esc(ch.ref) + ', not saved'}</span><div class="muted">${esc(ch.last.length > 110 ? ch.last.slice(0, 108) + '…' : ch.last)}</div></div>`).join('')}</div>` : '';
    el.innerHTML = `<span class="kind">${esc(node.kind)}</span><h2>${esc(node.code)}</h2>${node.ur ? `<div class="ur" lang="ur" dir="rtl">${esc(node.ur)}</div>` : ''}${node.en ? `<p>${esc(node.en)}</p>` : ''}${node.note ? `<p class="muted">${esc(node.note)}</p>` : ''}${node.levels.length ? groupRows(node.levels, node.lay || ATLAS_LAY) : ''}${fr}${rows}
      <div class="links">${node.wm ? `<a class="btn" href="${esc(node.wm)}" target="wm">Open in Work Map</a>` : ''}${node.rm ? `<a class="btn" href="${esc(node.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>`;
    return;
  }
  if (c.isL) return panelL(c);
  const n = c.node, steps = c.course ? STEP_C : STEP_A;
  let h = `<span class="kind">${esc(n.kind)}${c.course ? '' : ' · atlas'}</span><h2>${esc(n.code)}</h2>${n.ur ? `<div class="ur" lang="ur" dir="rtl">${esc(n.ur)}</div>` : ''}`;
  const link = (t, code) => code && byCode.has(code) ? `<a data-goto="${esc(code)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`;
  let chain = [];
  if (n.kind === 'Fasl') { const ss = n.kids || []; chain = [`<b>${esc(n.short)}</b>`, ss.length ? ss.map(s => link(s.code, s.code)).join('<br>') : '<span class="none">no sabaq yet</span>', ss.filter(s => s.L).map(s => `<span>${esc(s.L)}</span>`).join('<br>') || '<span class="none">none</span>']; }
  else if (n.kind === 'Sabaq') { const fs = chainOf(c).filter(x => !x.isL); chain = [fs.length ? fs.map(f => link(f.node.code, f.node.code)).join('<br>') : '<span class="none">none listed</span>', `<b>${esc(n.short)}</b>`, n.L ? `<span>${esc(n.L)}</span>` : '<span class="none">not yet</span>']; }
  if (chain.length) h += `<div class="chain"><span class="ck">Atlas Fasl</span><span class="ck">Hub sabaq</span><span class="ck">Class lesson</span>${chain.map(x => `<span class="cv">${x}</span>`).join('')}</div>`;
  if (n.kind === 'Sabaq') { const st = Math.min(2, stageOf(n.has)); h += `<div class="ladder">${['Listed in the hub', 'Teacher Copy written', 'Refined'].map((t, i) => `<div class="${i <= st ? 'on' : ''}"><i style="background:${i <= st ? SOLID[i] : PAL.track}"></i>${t}</div>`).join('')}<div class="${n.Lnode ? 'on' : ''}"><i style="background:${n.Lnode ? (n.Lnode.taught ? PAL.L[0] : PAL.Lp[0]) : PAL.track}"></i>${n.Lnode ? `Became class lesson ${esc(n.Lnode.short)} (${n.Lnode.taught ? 'taught' : 'planned'})` : 'Not a class lesson yet'}</div></div>`; }
  else h += `<div class="ladder">${steps.map((t, i) => `<div class="${i <= c.lvl ? 'on' : ''}"><i style="background:${i <= c.lvl ? SOLID[i] : PAL.track}"></i>${t}</div>`).join('')}</div>`;
  if (n.has) { const has = new Set(n.has); h += `<div class="card"><h3>Forms</h3><div class="forms">${FORMS.map(([k, t]) => { const on = (Array.isArray(k) ? k : [k]).some(x => has.has(x)); return `<span class="form${on ? ' on' : ''}">${on ? '✓ ' : ''}${t}</span>`; }).join('')}</div>${n.rm ? `<a class="small" href="${esc(n.rm)}?t=files" target="rm">Open the files in Reading Mode</a>` : ''}</div>`; }
  if (n.q || n.notes) h += `<div class="card"><h3>Waiting on you</h3>${n.q ? `<div class="r"><span>Open questions</span><b class="red">${n.q}</b></div>` : ''}${n.notes ? `<div class="r"><span>Editor notes</span><b>${n.notes}</b></div>` : ''}${n.q && n.rm ? `<a class="small" href="${esc(n.rm)}?t=questions" target="rm">Answer them in Reading Mode</a>` : ''}</div>`;
  if (n.mentor) h += `<div class="card"><h3>Mentor</h3><div class="r"><span>${esc(n.mentor.status)}${n.mentor.round ? ', round ' + n.mentor.round : ''}</span><b>${esc((n.mentor.updated || '').slice(0, 10))}</b></div>${n.mentor.note ? `<p class="muted">${esc(n.mentor.note)}</p>` : ''}</div>`;
  if (n.note) h += `<p class="muted">${esc(n.note)}</p>`;
  h += `<div class="links">${n.wm ? `<a class="btn" href="${esc(n.wm)}" target="wm">Open in Work Map</a>` : ''}${n.rm ? `<a class="btn" href="${esc(n.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>`;
  h += actions(c);
  h += `<p class="keys">← → next in this Bab · [ ] along the chain · N next match · Esc to let go</p>`;
  el.innerHTML = h;
}

function nextQ(c) { const list = c.D.blocks.flatMap(b => b.cells).filter(x => x.props.q && !x.isL), i = list.indexOf(c); return list.length ? list[(i + 1) % list.length] : null; }
function actions(c) { const q = nextQ(c), fr = c.fresh;
  return `${fr ? `<div class="card fresh"><h3>Changed ${esc(rel(fr.when))}</h3><span class="${fr.saved ? 'ok' : 'warn'}">${fr.saved ? 'Saved on main' : 'On branch ' + esc(fr.ref) + ', not saved yet'}</span><div class="muted">${esc(fr.last.length > 120 ? fr.last.slice(0, 118) + '…' : fr.last)}</div></div>` : ''}
  <div class="acts"><button type="button" class="btn sm" data-act="code">Copy code</button><button type="button" class="btn sm" data-act="link">Copy link</button>${q && q !== c ? `<button type="button" class="btn sm" data-act="nextq">Next open question: ${esc(q.node.short)}</button>` : ''}</div>`; }
function panelL(c) {
  const n = c.node, s = n.sab || {}, fs = chainOf(byNode.get(s) || c).filter(x => !x.isL), forms = new Set(formsOf(n).map(x => x[1]));
  const link = (t, code) => byCode.has(code) ? `<a data-goto="${esc(code)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`;
  let h = `<span class="kind">Class lesson</span><h2>${esc(n.code)}</h2>${n.ur ? `<div class="ur" lang="ur" dir="rtl">${esc(n.ur)}</div>` : ''}`;
  h += `<div class="chain"><span class="ck">Atlas Fasl</span><span class="ck">Hub sabaq</span><span class="ck">Class lesson</span><span class="cv">${fs.length ? fs.map(f => link(f.node.code, f.node.code)).join('<br>') : '<span class="none">none listed</span>'}</span><span class="cv">${link(s.short || '', s.code || '')}</span><span class="cv"><b>${esc(n.short)}</b></span></div>`;
  h += `<div class="card"><h3>${n.taught ? 'Taught in class' : 'Planned, not taught yet'}</h3><span class="muted">The building grows one slab for each form made.</span><div class="forms">${FORMS_L.map(([, t]) => `<span class="form${forms.has(t) ? ' on' : ''}">${forms.has(t) ? '✓ ' : ''}${t}</span>`).join('')}</div>${n.rm ? `<a class="small" href="${esc(n.rm)}?t=files" target="rm">Open the files in Reading Mode</a>` : ''}</div>`;
  if (s.q) h += `<div class="card"><h3>Waiting on you</h3><div class="r"><span>Open questions on ${esc(s.short)}</span><b class="red">${s.q}</b></div></div>`;
  h += `<div class="links">${n.wm ? `<a class="btn" href="${esc(n.wm)}" target="wm">Open in Work Map</a>` : ''}${n.rm ? `<a class="btn" href="${esc(n.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>${actions(c)}<p class="keys">← → next in this Bab · [ ] along the chain · Esc to let go</p>`;
  $('#side').innerHTML = h;
}
/* the ground's own axes, so Bab numbers lie flat on their plates and read left to right whichever way the city is turned */
function groundMatrix() {
  const o = P(...turn(0, 0), 0), ex = P(...turn(1, 0), 0), ey = P(...turn(0, 1), 0);
  const ax = [ex[0] - o[0], ex[1] - o[1]], ay = [ey[0] - o[0], ey[1] - o[1]];
  const cand = [ax, ay, [-ax[0], -ax[1]], [-ay[0], -ay[1]]];
  const a = cand.reduce((m, v) => v[0] > m[0] ? v : m);
  const other = Math.abs(a[0] * ax[1] - a[1] * ax[0]) < 1e-6 ? ay : ax;
  let d = other; if (a[0] * d[1] - a[1] * d[0] < 0) d = [-d[0], -d[1]];
  return [a[0], a[1], d[0], d[1]];
}
let byNodeTmp = new Map();

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(c, x, y) {
  if (!c) { tip.hidden = true; return; }
  const n = c.node, f = (n.has || c.isL) ? formsOf(n).map(z => z[1]) : [];
  tip.innerHTML = `<div class="th"><b>${esc(n.code)}</b><span>${esc(stepOf(c))}</span></div>${n.ur ? `<div class="tu" dir="rtl" lang="ur">${esc(n.ur)}</div>` : ''}${f.length ? `<div class="tf">${f.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}${c.props.q ? `<div class="tq">${n.q || (n.sab && n.sab.q)} open questions</div>` : ''}${c.fresh ? `<div class="tn">Changed ${esc(rel(c.fresh.when))}</div>` : ''}`;
  tip.hidden = false; const r = svg.parentNode.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(x + 16, r.width - w - 8) + 'px'; tip.style.top = Math.min(y + 16, r.height - h - 8) + 'px'; }
function hover(c) { const el = c ? svg.querySelector(`#towers .c[data-i="${c.i}"]`) : null; if (el === hovEl) return; if (hovEl) hovEl.classList.remove('hov'); hovEl = el; if (el) el.classList.add('hov'); }

/* ---------- mini-map ---------- */
let mm = null;
function minimap() {
  const cv = $('#mini'), ctx = cv.getContext('2d'), Wc = cv.width, Hc = cv.height, k = Math.min(Wc / box.w, Hc / box.h) * 0.92;
  mm = { k, ox: (Wc - box.w * k) / 2 - box.x * k, oy: (Hc - box.h * k) / 2 - box.y * k };
  ctx.clearRect(0, 0, Wc, Hc);
  districts.forEach(D => { const c = [[D.x, D.y], [D.x + D.w, D.y], [D.x + D.w, D.y + D.h], [D.x, D.y + D.h]].map(([a, b]) => turn(a, b)).map(([a, b]) => P(a, b, 0));
    ctx.beginPath(); c.forEach(([x, y], i) => { const X = mm.ox + x * mm.k, Y = mm.oy + y * mm.k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    const lv = D.node.levels, f = lv.length ? lv.filter(l => l >= 2).length / lv.length : 0;
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(','); ctx.fillStyle = D.node.kind === 'Atlas' ? `rgba(${rgb(SOLID[1])},${(0.25 + f * 0.75).toFixed(2)})` : `rgba(${rgb(SOLID[3])},${(0.3 + f * 0.6).toFixed(2)})`; ctx.fill(); });
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
  const h = q.toString(), key = (focus ? focus.D.id : '') + '|' + (focus && focus.B ? focus.B.node.short : ''), url = h ? '#' + h : location.pathname + location.search;
  if (booted && key !== lastKey) history.pushState(null, '', url); else history.replaceState(null, '', url); lastKey = key;
}
addEventListener('popstate', () => {
  const q = new URLSearchParams(location.hash.slice(1)), D = districts.find(d => d.id === q.get('d')), B = D && D.blocks.find(b => b.node.short === q.get('b')), p = byCode.get(q.get('p') || '');
  lastKey = (D ? D.id : '') + '|' + (B ? B.node.short : ''); pinned = null; pinPaint();
  if (B) flyToBlock(B); else if (D) flyTo(D); else fitAll(true); if (p) select(p, false);
});
function hashRead() {
  const q = new URLSearchParams(location.hash.slice(1));
  rot = (+q.get('r') || 0) % 4; (q.get('f') || '').split(',').filter(k => CHIPS.some(c => c[0] === k)).forEach(k => chips.add(k)); if (PRESETS[q.get('v')]) preset = q.get('v');
  return q;
}

/* ---------- pointer and keys ---------- */
let drag = null, lastClick = 0;
const cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const t = el && el.closest && el.closest('#towers .c'); return t ? cells[+t.dataset.i] : null; };
/* gestures: one pointer drags (mouse, pen, one finger). Two or three fingers on a touch screen move the map
   by their centre and zoom by their spread (pinch). On a trackpad: two-finger swipe moves, pinch zooms;
   a mouse wheel zooms. Safari's own pinch events are handled too. */
const touches = new Map(); let multi = null;
const spread = () => { const ps = [...touches.values()], cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
  return { cx, cy, d: ps.reduce((a, p) => a + Math.hypot(p.x - cx, p.y - cy), 0) / ps.length }; };
function zoomAround(mx, my, k) { k = Math.max(0.15, Math.min(16, k)); cam.x = mx - (mx - cam.x) * (k / cam.k); cam.y = my - (my - cam.y) * (k / cam.k); cam.k = k; }
svg.addEventListener('pointerdown', e => {
  if (e.button) return; e.preventDefault();
  if (e.pointerType === 'touch') { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    if (touches.size >= 2) { const r = svg.getBoundingClientRect(), g = spread(); multi = { cx: g.cx - r.left, cy: g.cy - r.top, d: g.d, k: cam.k, camx: cam.x, camy: cam.y }; drag = null; tip.hidden = true; return; } }
  drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, id: e.pointerId }; });
svg.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (multi && touches.size >= 2) { const r = svg.getBoundingClientRect(), g = spread(), mx = g.cx - r.left, my = g.cy - r.top;
    cam.x = multi.camx + mx - multi.cx; cam.y = multi.camy + my - multi.cy; cam.k = multi.k;   // move with the fingers' centre
    if (multi.d > 8) zoomAround(mx, my, multi.k * g.d / multi.d);                              // and zoom by their spread
    apply(); svg.classList.add('grabbing'); return; }
  if (drag && (e.buttons & 1) && (drag.moved || Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4)) { if (!drag.moved) try { svg.setPointerCapture(drag.id); } catch (x) {} drag.moved = true; cam.x = drag.cx + e.clientX - drag.x; cam.y = drag.cy + e.clientY - drag.y; apply(); svg.classList.add('grabbing'); tip.hidden = true; return; }
  if (e.pointerType === 'mouse') { const r = svg.parentNode.getBoundingClientRect(), c = cellAt(e); hover(c); showTip(c, e.clientX - r.left, e.clientY - r.top); }
});
const endTouch = e => { if (!touches.delete(e.pointerId)) return false;
  if (multi) { if (touches.size >= 2) { const r = svg.getBoundingClientRect(), g = spread(); multi = { cx: g.cx - r.left, cy: g.cy - r.top, d: g.d, k: cam.k, camx: cam.x, camy: cam.y }; }
    else if (!touches.size) { multi = null; svg.classList.remove('grabbing'); hashSet(); }
    return true; }   // a lifted finger never counts as a click while a gesture is on
  return false; };
svg.addEventListener('pointercancel', e => { endTouch(e); drag = null; svg.classList.remove('grabbing'); });
svg.addEventListener('pointerleave', () => { tip.hidden = true; hover(null); });
svg.addEventListener('pointerup', e => {
  if (endTouch(e) || multi) { drag = null; return; }
  svg.classList.remove('grabbing'); const d = drag; drag = null; if (d && d.moved) return;
  const now = Date.now(), dbl = now - lastClick < 320; lastClick = now;
  const c = cellAt(e), el = document.elementFromPoint(e.clientX, e.clientY), sg = el && el.closest && el.closest('[data-d]');
  if (c) { if (dbl) flyToBlock(c.B); else if (pinned === c) unpin(); else select(c, false); return; }
  if (sg && sg.closest('.sign')) { flyTo(districts[+sg.dataset.d]); return; }
  if (pinned) { unpin(); return; }
  if (sg) { const b = sg.dataset.b; if (b != null) { if (!focus || focus.B !== blocks[+b]) flyToBlock(blocks[+b]); } else if (!focus || focus.D !== districts[+sg.dataset.d]) flyTo(districts[+sg.dataset.d]); return; }
});
let wheelEnd;
svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1, dx = e.deltaX * unit, dy = e.deltaY * unit;
  const mouseWheel = e.deltaMode !== 0 || (!e.deltaX && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
  if (e.ctrlKey) zoomAround(mx, my, cam.k * Math.exp(-dy * 0.01));          // trackpad pinch (and ctrl + wheel)
  else if (mouseWheel && !e.shiftKey) zoomAround(mx, my, cam.k * Math.exp(-dy * 0.0015));
  else { cam.x -= e.shiftKey && !dx ? dy : dx; cam.y -= e.shiftKey && !dx ? 0 : dy; }   // two-finger swipe moves the map
  apply(); tip.hidden = true; clearTimeout(wheelEnd); wheelEnd = setTimeout(hashSet, 300); }, { passive: false });
let gest = null;   // Safari on a Mac sends pinch as gesture events
svg.addEventListener('gesturestart', e => { e.preventDefault(); gest = { k: cam.k }; });
svg.addEventListener('gesturechange', e => { e.preventDefault(); if (!gest) return; const r = svg.getBoundingClientRect(); zoomAround(e.clientX - r.left, e.clientY - r.top, gest.k * e.scale); apply(); });
svg.addEventListener('gestureend', e => { e.preventDefault(); gest = null; hashSet(); });
const copy = (t, b) => { const done = () => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1200); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => prompt('Copy this:', t)); else prompt('Copy this:', t); };
$('#side').addEventListener('click', e => {
  const a = e.target.closest('[data-goto]'); if (a) { const c = byCode.get(a.dataset.goto); if (c) select(c, true); return; }
  const r = e.target.closest('[data-cell],[data-fly],[data-flyb],[data-act]'); if (!r) return;
  if (r.dataset.cell) { const c = cells[+r.dataset.cell]; if (c) select(c, false); }
  else if (r.dataset.fly) flyTo(districts[+r.dataset.fly]);
  else if (r.dataset.flyb) flyToBlock(blocks[+r.dataset.flyb]);
  else if (r.dataset.act === 'code' && pinned) copy(pinned.node.code, r);
  else if (r.dataset.act === 'link') copy(location.href, r);
  else if (r.dataset.act === 'nextq' && pinned) { const q = nextQ(pinned); if (q) select(q, true); }
});
$('#side').addEventListener('mouseover', e => { const r = e.target.closest('[data-cell]'); hover(r ? cells[+r.dataset.cell] : null); });
$('#side').addEventListener('mouseleave', () => hover(null));
$('#showm').addEventListener('click', showMatches);
$('#crumb').addEventListener('click', e => { const a = e.target.closest('[data-up]'); if (!a) return; unpin(); if (a.dataset.up === 'd' && focus) flyTo(focus.D); else fitAll(true); });
$('#chips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (!b) return; const k = b.dataset.chip; if (chips.has(k)) chips.delete(k); else chips.add(k); paintFilter(); hashSet(); });
$('#preset').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (!b) return; preset = b.dataset.preset; paintFilter(); hashSet(); });
$('#clear').addEventListener('click', () => { chips.clear(); preset = 'all'; query = ''; qi.value = ''; searchList(); paintFilter(); hashSet(); });
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
  if (e.key === 'n') stepMatch(1); if (e.key === 'N') stepMatch(-1);
  if (e.key === 'q' || e.key === 'Q') turnBy(3); if (e.key === 'e' || e.key === 'E') turnBy(1);
  if (e.key === 'f' || e.key === 'F') { unpin(); fitAll(true); }
  if (e.key === '+' || e.key === '=') zoomBy(1.4); if (e.key === '-') zoomBy(1 / 1.4);
  if (e.key === '?') $('#helpbox').hidden = !$('#helpbox').hidden;
});
addEventListener('resize', () => { if (focus && focus.B) flyToBlock(focus.B, false); else if (focus) flyTo(focus.D, false); else fitAll(false); });
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); unpin(); fitAll(true); });

const REPO_D = { 'maarif-zm': ['zm'], 'maarif-tauheed': ['th'], 'makarim-ul-akhlaq': ['ma', 'akhlaq'], 'maarif-mahdaviyat': ['mahdaviyat'], 'maarif-muqdma': ['mrf'], 'maarif-tazzakur': ['taz'] };
const CODE_D = { ZM: 'zm', TH: 'th', MA: 'ma', MRF: 'mrf', MS: 'taz' };
function freshen(w) {
  const t = x => Date.parse(String(x).replace(' UTC', '').replace(' ', 'T') + 'Z'), made = t(w.made);
  const all = (w.changes || []).filter(ch => !/^retired\//.test(ch.ref));
  const mainAt = {}; all.forEach(ch => { if (ch.ref === 'main') mainAt[ch.repo] = Math.max(mainAt[ch.repo] || 0, t(ch.when)); });
  const recent = all.filter(ch => made - t(ch.when) <= 24 * 3600e3).map(ch => Object.assign({}, ch, { saved: ch.ref === 'main' || (mainAt[ch.repo] || 0) >= t(ch.when) }));
  recent.sort((a, b) => t(b.when) - t(a.when));
  const seen = new Set();
  for (const ch of recent) {
    const msg = ch.last || '', ds = new Set(REPO_D[ch.repo] || []);
    for (const m of msg.matchAll(/\b(ZM|TH|MA|MRF|MS)\b/g)) ds.add(CODE_D[m[1]]);
    for (const id of ds) { const D = districts.find(d => d.id === id); if (!D) continue; const sig = id + ch.repo + ch.last; if (!seen.has(sig)) { seen.add(sig); D.fresh.push(ch); }
      const first = D.blocks.flatMap(b => b.cells)[0]; if (!first) continue; const pre = first.node.code.replace(/ B\d+.*$/, '');
      for (const m of msg.matchAll(/\b(?:(ZM|TH|MA|MRF)[ -])?B0?(\d+)[ -]?([SLF])0?(\d+)(?:\s*(?:to|-|–)\s*[SLF]?0?(\d+))?/g)) {
        if (m[1] && CODE_D[m[1]] !== id) continue;
        for (let k = +m[4]; k <= +(m[5] || m[4]) && k < +m[4] + 30; k++) { const c = byCode.get(`${pre} B${m[2]} ${m[3]}${k}`); if (c && !c.fresh) c.fresh = ch; } }
      for (const m of msg.matchAll(/\bU(\d+)\.(\d+)/g)) { const c = byCode.get(`${pre} B${m[1]} F${m[2]}`); if (c && !c.fresh) c.fresh = ch; }
    }
  }
  cells.forEach(c => { c.props.changed = !!c.fresh; });
}

window.OBS.start((m, w) => {
  M = m; W0 = w; const q = hashRead();
  layout(); index(); freshen(w); draw();
  const D = districts.find(d => d.id === q.get('d')), B = D && D.blocks.find(b => b.node.short === q.get('b')), p = byCode.get(q.get('p') || '');
  if (B) flyToBlock(B, false); else if (D) flyTo(D, false); else fitAll(false);
  if (p) select(p, false); else panel(null);
  booted = true;
});
})();
