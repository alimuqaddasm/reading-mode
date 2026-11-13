/* Maarif Observatory: the living blob. Reads workmap.json from the private repo hub-data with the browser's key
   (the same key as the Work Map and Reading Mode; this origin is shared). One soft shape per level: Maarif (a lobe per
   atlas), an atlas (a lobe per Bab), a Bab (a lobe per Fasl); courses float beside it as drops. Nested layers show how
   far the work has gone: the outer skin is everything listed, the gold core is what was taught. */
(function () {
'use strict';
const OWNER = 'alimuqaddasm', KEY = 'workmap.key';
const API = `https://api.github.com/repos/${OWNER}/hub-data/contents/`;
const RM = 'https://alimuqaddasm.github.io/reading-mode/', WM = 'https://alimuqaddasm.github.io/workmap/';
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const setKey = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the five layers, outer to inner */
const COL = [['#eef2fa', '#c3d2ee'], ['#dbe6fb', '#5b82cc'], ['#8fe3d6', '#0b7a70'], ['#d6c6f7', '#7a5bc4'], ['#ffe9ad', '#d99a1e']];
const SOLID = ['#c3d2ee', '#2a5bb8', '#0b7a70', '#7a5bc4', '#d99a1e'];
const ATLAS_LAY = ['In the atlas plan', 'Fasl lesson written', 'Used in a hub sabaq', 'Sabaq refined, deck made', 'Taught in class'];
const COURSE_LAY = ['Listed in the hub', 'Teacher Copy written', 'Refined and proofed', 'Class-ready, deck made', 'Taught in class'];

/* ---------- data ---------- */
async function raw(path) {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + getKey(), Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-cache' });
  if (!r.ok) { const e = new Error(r.status === 401 ? 'GitHub refused the key.' : r.status === 404 ? 'This key cannot open hub-data.' : 'GitHub answered ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const stageOf = has => { const s = new Set(has || []); if (s.has('main') || s.has('extra') || s.has('qa')) return 3; if (s.has('refined') || s.has('proof')) return 2; if (s.has('tc') || s.has('text')) return 1; return 0; };
const fracs = levels => { const n = levels.length || 1; return [0, 1, 2, 3, 4].map(k => levels.filter(l => l >= k).length / n); };
const counts = levels => [0, 1, 2, 3, 4].map(k => levels.filter(l => l >= k).length);

function model(w) {
  // how far each atlas Fasl travelled: 1 written as an atlas lesson, 2 used in a sabaq, 3 that sabaq refined or decked, 4 taught
  const use = {};
  for (const c of w.courses) for (const b of c.babs) for (const H of b.hub) {
    const st = stageOf(H.has), lvl = H.L && H.Ls === 'taught' ? 4 : st >= 2 ? 3 : 2;
    for (const u of H.fasls || []) { const k = c.atlas + ':' + u.replace(/^U/, ''); const o = use[k] || (use[k] = { lvl: 0, by: [] }); o.lvl = Math.max(o.lvl, lvl); o.by.push(`${c.code} B${b.n} S${H.h}`); }
  }
  const faslNode = (a, b, f) => {
    const u = use[a.id + ':' + f.id] || { lvl: 0, by: [] };
    const written = (f.al || []).some(x => x === 'built' || x === 'written');
    const lvl = Math.max(written ? 1 : 0, u.lvl);
    return { kind: 'Fasl', key: a.id + ':' + f.id, code: `${a.name} B${b.n} F${f.id.split('.')[1]}`, short: 'F' + f.id.split('.')[1], ur: f.ur, size: 1, levels: [lvl], lay: ATLAS_LAY, by: u.by, unit: 'sabaq built from it',
      wm: `${WM}#atlas?a=${a.id}&b=${b.n}`, rm: `${RM}#${a.id}/${b.n}` };
  };
  const atlases = w.atlases.map(a => {
    const babs = a.babs.map(b => {
      const kids = b.fasls.map(f => faslNode(a, b, f));
      const levels = kids.map(k => k.levels[0]);
      return { kind: 'Bab', code: `${a.name} B${b.n}`, short: 'B' + b.n, ur: b.ur, size: Math.max(1, kids.length), levels, empty: !kids.length, lay: ATLAS_LAY, kids,
        wm: `${WM}#atlas?a=${a.id}&b=${b.n}`, rm: `${RM}#${a.id}/${b.n}`, unit: 'Fasls' };
    });
    const levels = babs.flatMap(b => b.empty ? [] : b.levels);
    return { kind: 'Atlas', code: a.name + ' atlas', short: a.name, ur: a.ur, size: Math.max(levels.length, 40), levels, empty: !levels.length, lay: ATLAS_LAY, kids: babs,
      wm: `${WM}#atlas?a=${a.id}`, rm: `${RM}#${a.id}`, unit: 'Fasls', note: levels.length ? '' : `${a.babs.length} Babs; Fasls not listed yet` };
  });
  const order = ['mahdaviyat', 'tauheed', 'akhlaq', 'adl', 'maad', 'nubuwat', 'imamat'];
  atlases.sort((x, y) => order.indexOf(x.short.toLowerCase()) - order.indexOf(y.short.toLowerCase()));
  const courses = w.courses.map(c => {
    const babs = c.babs.map(b => {
      const kids = b.hub.map(H => ({ kind: 'Sabaq', code: `${c.code} B${b.n} S${H.h}`, short: 'S' + H.h, ur: H.ur, size: 1, lay: COURSE_LAY, unit: 'Fasls and class lesson',
        levels: [H.L && H.Ls === 'taught' ? 4 : stageOf(H.has)], L: H.L ? `L${H.L} ${H.Ls}` : '', fasls: H.fasls || [], fkeys: (H.fasls || []).map(u => c.atlas + ':' + u.replace(/^U/, '').split('-')[0]),
        Lnode: H.L ? { kind: 'Class lesson', code: `${c.code} B${b.n} L${H.L}`, short: 'L' + H.L, ur: H.ur, size: 1, lay: COURSE_LAY, levels: [H.Ls === 'taught' ? 4 : stageOf(H.has)], note: H.Ls === 'taught' ? 'Taught in class' : 'Planned, not taught yet', wm: `${WM}#course?c=${c.id}&b=${b.n}&s=${c.id}-${b.n}-${H.h}`, rm: `${RM}#${c.id}/${b.n}/${H.h}` } : null,
        wm: `${WM}#course?c=${c.id}&b=${b.n}&s=${c.id}-${b.n}-${H.h}`, rm: `${RM}#${c.id}/${b.n}/${H.h}` }));
      return { kind: 'Bab', code: `${c.code} B${b.n}`, short: 'B' + b.n, ur: '', size: Math.max(1, kids.length), levels: kids.map(k => k.levels[0]), empty: !kids.length, lay: COURSE_LAY, kids,
        wm: `${WM}#course?c=${c.id}&b=${b.n}`, rm: `${RM}#${c.id}`, unit: 'sabaq', note: kids.length ? `Built on ${c.atlas} B${b.from}` : `Hub: ${b.hub_state}` };
    });
    return { kind: 'Course', code: c.code, short: c.code, ur: c.ur, size: 1, levels: babs.flatMap(b => b.levels), lay: COURSE_LAY, kids: babs, wm: `${WM}#course?c=${c.id}`, rm: `${RM}#${c.id}`, unit: 'sabaq', atlas: c.atlas };
  });
  if (w.muqaddima) { const m = w.muqaddima; const kids = m.lessons.map(l => ({ kind: 'Lesson', code: l.code, short: l.code.replace('MRF-', ''), ur: l.ur, size: 1, lay: COURSE_LAY, levels: [stageOf(l.has)], wm: `${WM}#course?c=mrf`, rm: `${RM}#mrf/1/${l.code}` }));
    courses.push({ kind: 'Course', code: m.code, short: m.code, ur: m.ur, size: 1, levels: kids.map(k => k.levels[0]), lay: COURSE_LAY, kids, wm: `${WM}#course?c=mrf`, rm: `${RM}#mrf`, unit: 'lessons', note: 'Its own source book, no atlas' }); }
  if (w.tazzakur) { const z = w.tazzakur; const lv = s => /taught|held|given/i.test(s.state || '') ? 4 : /deck/i.test(s.state || '') ? 3 : /proof|refin/i.test(s.state || '') ? 2 : 1;
    const kids = z.sessions.map(s => ({ kind: 'Session', code: s.code, short: s.code.replace('MS-', ''), ur: s.ur, size: 1, lay: COURSE_LAY, levels: [lv(s)], note: `${s.date} · ${s.kind} · ${s.state}`, wm: `${WM}#course?c=taz`, rm: RM + '#taz' }));
    courses.push({ kind: 'Course', code: z.code, short: z.code, ur: z.ur, size: 1, levels: kids.map(k => k.levels[0]), lay: COURSE_LAY, kids, wm: `${WM}#course?c=taz`, rm: `${RM}#taz`, unit: 'sessions' }); }
  // the chain across: a Fasl opens the sabaq built from it, a sabaq opens its Fasls and class lesson, a Bab shows its sabaq as drops
  const leaf = n => Object.assign({}, n, { kids: undefined, drops: undefined });
  const fIdx = {}, byF = {};
  atlases.forEach(a => a.kids.forEach(b => b.kids.forEach(f => { fIdx[f.key] = f; })));
  courses.forEach(c => (c.kids || []).forEach(b => (b.kids || []).forEach(sb => { (sb.fkeys || []).forEach(k => (byF[k] = byF[k] || []).push(sb)); })));
  courses.forEach(c => (c.kids || []).forEach(b => (b.kids || []).forEach(sb => { if (!sb.fkeys) return;
    sb.kids = sb.fkeys.map(k => fIdx[k]).filter(Boolean).map(leaf); if (sb.Lnode) sb.kids.push(sb.Lnode); })));
  atlases.forEach(a => { a.drops = courses.filter(c => c.atlas && a.code.toLowerCase().startsWith(c.atlas)); a.kids.forEach(b => {
    b.kids.forEach(f => { f.kids = byF[f.key] || []; });
    b.drops = [...new Set(b.kids.flatMap(f => byF[f.key] || []))]; b.dropsHead = 'Sabaq built from this Bab'; }); });
  const all = atlases.flatMap(a => a.levels);
  return { kind: 'Maarif', code: 'All of Maarif', short: 'Maarif', ur: 'معارف', size: all.length, levels: all, lay: ATLAS_LAY, kids: atlases, courses, drops: courses, unit: 'atlases', wm: WM, rm: RM };
}

/* ---------- the shape ---------- */
const svg = $('#svg');
let W = 800, H = 600, CX = 400, CY = 300, S = 260;
function measure() { const r = svg.getBoundingClientRect(); W = r.width; H = r.height; CX = W / 2; CY = H * 0.47; S = Math.min(W, H * 1.05) * 0.5; }
let view = null, path = [], hover = -1, born = 0, phase = 0, raf = 0;
const lobes = () => view.kids.map((k, i, a) => ({ k, a: -Math.PI / 2 + i / a.length * Math.PI * 2 }));
function geometry() {
  const L = lobes(), n = L.length || 1, maxS = Math.max(...view.kids.map(k => k.size), 1);
  const sig = Math.min(0.62, (Math.PI * 2 / n) * (n > 14 ? 0.6 : 0.42));
  const base = S * (n > 14 ? 0.3 : 0.24), bmax = S * (n > 14 ? 0.42 : 0.5);
  return { L, sig, base, F: fracs(view.kids.flatMap(k => k.empty ? [] : k.levels)), bump: k => k.empty ? bmax * 0.1 : bmax * (0.22 + 0.78 * Math.sqrt(k.size / maxS)) };
}
function radius(G, t, layer, grow) {
  // each coloured layer starts from a small core sized by the whole view's share, then reaches into the lobes that hold it;
  // shares are square-rooted so a little progress is still visible
  let r = layer === 0 ? G.base : G.base * (0.18 + 0.62 * Math.sqrt(G.F[layer])) * (1 - layer * 0.08);
  for (const { k, a } of G.L) {
    const d = Math.atan2(Math.sin(t - a), Math.cos(t - a));
    const f = layer === 0 ? 1 : Math.sqrt(fracs(k.levels)[layer]);
    r += G.bump(k) * f * grow * Math.exp(-(d * d) / (2 * G.sig * G.sig));
  }
  return r + (reduced ? 0 : Math.sin(t * 5 + phase + layer) * 3 + Math.sin(t * 9 - phase * 1.3) * 1.6);
}
function pathD(G, layer, grow) {
  const N = 220, pts = [];
  for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2 - Math.PI / 2; const r = radius(G, t, layer, grow); pts.push([CX + Math.cos(t) * r, CY + Math.sin(t) * r * 0.86]); }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) { const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; }
  return d + 'Z';
}
function build() {
  svg.innerHTML = `<defs>${COL.map((c, i) => `<radialGradient id="g${i}" cx="46%" cy="38%" r="70%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>`).join('')}
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter><clipPath id="skin"><path id="clipd"/></clipPath></defs>
    <ellipse id="shadow" fill="#000" opacity=".07" filter="url(#blur)"/>
    ${COL.map((c, i) => `<path id="L${i}" fill="url(#g${i})" ${i === 0 ? 'stroke="#a9bde3" stroke-width="1.4"' : ''} opacity="${i === 0 ? .9 : .95}"/>`).join('')}
    <path id="wedge" fill="#fff" opacity="0" clip-path="url(#skin)"/>
    <ellipse id="shine" fill="#fff" opacity=".2"/>
    <g id="labels"></g>`;
}
function frame(ts) {
  if (!view) return;
  phase = reduced ? 0 : ts / 1600;
  const grow = Math.min(1, (ts - born) / 700); const e = 1 - Math.pow(1 - grow, 3);
  const G = geometry();
  for (let i = 0; i < 5; i++) { const el = document.getElementById('L' + i); if (el) el.setAttribute('d', pathD(G, i, e)); }
  const skin = document.getElementById('L0').getAttribute('d'); document.getElementById('clipd').setAttribute('d', skin);
  const sh = document.getElementById('shadow'); sh.setAttribute('cx', CX); sh.setAttribute('cy', CY + S * 0.86 + 10); sh.setAttribute('rx', S * 0.9); sh.setAttribute('ry', 18);
  const sn = document.getElementById('shine'); sn.setAttribute('cx', CX - S * 0.18); sn.setAttribute('cy', CY - S * 0.28); sn.setAttribute('rx', S * 0.3); sn.setAttribute('ry', S * 0.13);
  const wd = document.getElementById('wedge');
  if (hover >= 0 && G.L[hover]) { const a = G.L[hover].a, half = Math.PI / (G.L.length || 1), R2 = S * 3;
    wd.setAttribute('d', `M${CX},${CY} L${CX + Math.cos(a - half) * R2},${CY + Math.sin(a - half) * R2} L${CX + Math.cos(a + half) * R2},${CY + Math.sin(a + half) * R2}Z`); wd.setAttribute('opacity', '.28'); }
  else wd.setAttribute('opacity', '0');
  placeLabels(G, e);
  raf = reduced && grow >= 1 ? 0 : requestAnimationFrame(frame);
}
function placeLabels(G, e) {
  const g = document.getElementById('labels'); const many = G.L.length > 16;
  if (g.childElementCount !== G.L.length) {
    g.innerHTML = G.L.map(({ k }, i) => `<g class="lab" data-i="${i}"><text class="t1" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-size="${many ? 11.5 : 13.5}" font-weight="700" fill="${k.empty ? '#9aa39f' : '#2a5bb8'}" stroke="#fffdf8" stroke-width="4" paint-order="stroke">${esc(many ? k.short : (k.kind === 'Atlas' ? k.short : k.short))}</text>${many ? '' : `<text class="t2" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-size="11" fill="#6b736f" stroke="#fffdf8" stroke-width="3" paint-order="stroke">${esc(k.empty ? (k.kind === 'Atlas' ? (k.note || 'nothing listed yet') : 'not drafted yet') : pct(k) + ' reached ' + (k.lay === ATLAS_LAY ? 'a sabaq' : 'class-ready'))}</text>`}</g>`).join('');
  }
  G.L.forEach(({ k, a }, i) => {
    const r = radius(G, a, 0, e) + (many ? 16 : 26); const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.86;
    const el = g.children[i]; el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    el.setAttribute('opacity', hover >= 0 && hover !== i ? .45 : 1);
    const t2 = el.querySelector('.t2'); if (t2) t2.setAttribute('y', 15);
  });
}
const pct = k => { const f = fracs(k.levels); return Math.round((k.lay === ATLAS_LAY ? f[2] : f[3]) * 100) + '%'; };
function start() { cancelAnimationFrame(raf); born = performance.now(); raf = requestAnimationFrame(frame); }

/* ---------- side panel, legend, drops, path ---------- */
function bar(k) { const c = counts(k.levels), n = k.levels.length || 1; let h = ''; for (let i = 4; i >= 1; i--) { const own = (c[i] - (c[i + 1] || 0)) / n * 100; if (own > 0) h += `<span style="width:${own}%;background:${SOLID[i]}"></span>`; } return `<div class="bar" role="img" aria-label="Progress">${h}</div>`; }
function side(k) {
  const c = counts(k.levels), n = k.levels.length;
  let h = `<span class="kind">${esc(k.kind)}</span><h2>${esc(k.code)}</h2>${k.ur ? `<div class="ur" lang="ur">${esc(k.ur)}</div>` : ''}`;
  if (k.note) h += `<p class="muted">${esc(k.note)}</p>`;
  if (n) { h += bar(k) + `<div class="rows">${k.lay.map((t, i) => `<div><span><i style="background:${SOLID[i]}"></i>${t}</span><b>${n === 1 ? (c[i] ? 'yes' : 'not yet') : c[i] + ' of ' + n}</b></div>`).join('')}</div>`; }
  if (k.by && k.by.length) h += `<div class="card"><h3>Used by</h3>${[...new Set(k.by)].map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  if (k.L) h += `<div class="card"><h3>Class lesson</h3><span>${esc(k.L)}</span></div>`;
  if (k.fasls && k.fasls.length) h += `<div class="card"><h3>Built from</h3><span>${k.fasls.map(esc).join(', ')}</span></div>`;
  if (k.kind === 'Sabaq' && k.kids && k.kids.length) { const nf = k.kids.filter(x => x.kind === 'Fasl').length; h += `<p class="muted">Click to go inside: ${nf} atlas Fasl${nf === 1 ? '' : 's'}${k.Lnode ? ' and its class lesson' : ''}.</p>`; }
  else if (k.kids && k.kids.length) h += `<p class="muted">Click to go inside: ${k.kids.length} ${k.kind === 'Atlas' || (k.kind === 'Course' && k.unit === 'sabaq') ? 'Babs' : k.kind === 'Maarif' ? 'atlases' : esc(k.unit || 'parts')}.</p>`;
  else if (k.kind === 'Fasl') h += `<p class="muted">No hub sabaq is built from this Fasl yet.</p>`;
  h += `<div class="links">${k.wm ? `<a class="btn" href="${esc(k.wm)}" target="wm">Open in Work Map</a>` : ''}${k.rm ? `<a class="btn" href="${esc(k.rm)}" target="rm">Read in Reading Mode</a>` : ''}</div>`;
  $('#side').innerHTML = h;
}
function legend() { const lay = (view.kids[0] || view).lay; $('#legend').innerHTML = `<b>${lay === ATLAS_LAY ? 'How far each Fasl went' : 'How far each lesson went'}</b>` + lay.map((t, i) => `<span><i style="background:${i ? `radial-gradient(circle at 40% 35%,${COL[i][0]},${COL[i][1]})` : COL[0][1]}"></i>${t}</span>`).join(''); }
function dropSVG(k) {
  const f = fracs(k.levels); let s = `<svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">`;
  for (let i = 0; i < 5; i++) { const r = i === 0 ? 24 : 4 + 20 * f[i]; if (r > 1.5) s += `<circle cx="27" cy="27" r="${r.toFixed(1)}" fill="${i ? `url(#d${i})` : COL[0][0]}" stroke="${i ? 'none' : '#a9bde3'}"/>`; }
  return s.replace('<svg', '<svg') + `<defs>${COL.map((c, i) => `<radialGradient id="d${i}" cx="45%" cy="38%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>`).join('')}</defs></svg>`;
}
let M = null, curDrops = [];
function drops() {
  const el = $('#drops'); const list = curDrops = view.drops || [];
  el.innerHTML = list.length ? `<span class="dropshead">${esc(view.dropsHead || 'Courses')}</span>` + list.slice(0, 14).map((c, i) => `<button type="button" class="drop" data-c="${i}" title="${esc(c.code)}">${dropSVG(c)}<span>${esc(c.kind === 'Sabaq' ? c.code.replace(/^(\w+) /, '$1 ') : c.short)}</span><small>${c.kind === 'Sabaq' ? esc(c.L || ['listed', 'Teacher Copy', 'refined', 'class-ready', 'taught'][c.levels[0]]) : c.levels.length + ' ' + esc(c.unit)}</small></button>`).join('') + (list.length > 14 ? `<small class="muted">and ${list.length - 14} more</small>` : '') : '';
}
function crumb() {
  const trail = [M, ...path]; $('#crumb').innerHTML = trail.map((k, i) => i === trail.length - 1 ? `<span class="cur">${esc(k.short)}</span>` : `<a data-up="${i}">${esc(k.short)}</a><span class="sep">›</span>`).join('');
}
function show(node, trail) {
  view = node; path = trail; hover = -1;
  build(); legend(); drops(); crumb(); side(node); measure(); start();
  svg.setAttribute('aria-label', `${node.code}: ${node.kids.length} parts`);
}
function go(k) { if (!k.kids || !k.kids.length) return; show(k, [...path, k]); }
function up(i) { const trail = path.slice(0, i); show(trail.length ? trail[trail.length - 1] : M, trail); }

/* ---------- pointer ---------- */
function hit(ev) {
  const r = svg.getBoundingClientRect(), x = ev.clientX - r.left - CX, y = (ev.clientY - r.top - CY) / 0.86;
  const t = Math.atan2(y, x), d = Math.hypot(x, y), G = geometry();
  if (d > radius(G, t, 0, 1) + 30) return -1;
  let best = -1, bd = 9; G.L.forEach(({ a }, i) => { const dd = Math.abs(Math.atan2(Math.sin(t - a), Math.cos(t - a))); if (dd < bd) { bd = dd; best = i; } });
  return best;
}
svg.addEventListener('pointermove', ev => { const i = hit(ev); if (i !== hover) { hover = i; side(i >= 0 ? view.kids[i] : view); svg.classList.toggle('can', i >= 0 && !!(view.kids[i].kids || []).length); if (!raf) raf = requestAnimationFrame(frame); } });
svg.addEventListener('pointerleave', () => { hover = -1; side(view); if (!raf) raf = requestAnimationFrame(frame); });
svg.addEventListener('click', ev => { const i = hit(ev); if (i >= 0) { const k = view.kids[i]; if (k.kids && k.kids.length) go(k); else side(k); } });
$('#crumb').addEventListener('click', e => { const a = e.target.closest('[data-up]'); if (a) up(+a.dataset.up); });
$('#drops').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { const c = curDrops[+b.dataset.c]; if (c.kids && c.kids.length) show(c, [...path, c]); else side(c); } });
$('#drops').addEventListener('mouseover', e => { const b = e.target.closest('[data-c]'); if (b) side(curDrops[+b.dataset.c]); });
$('#drops').addEventListener('mouseleave', () => side(view));
addEventListener('keydown', e => { if (e.key === 'Escape' && path.length) up(path.length - 1); });
addEventListener('resize', () => { measure(); if (!raf) raf = requestAnimationFrame(frame); });
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); if (M) show(M, []); });

/* ---------- start ---------- */
const screen = id => ['connect', 'app', 'loading'].forEach(x => { $('#' + x).hidden = x !== id; });
async function load() {
  screen('loading');
  try {
    const w = await raw('workmap.json'); M = model(w);
    $('#made').textContent = 'Updated ' + String(w.made || '').replace(/^\d{4}-/, '').replace(' UTC', '');
    screen('app'); show(M, []);
  } catch (e) {
    if (e.status === 401 || e.status === 404) { setKey(''); screen('connect'); $('#keyerr').hidden = false; $('#keyerr').textContent = e.message; return; }
    screen('connect'); $('#keyerr').hidden = false; $('#keyerr').textContent = e.message || String(e);
  }
}
$('#keyform').addEventListener('submit', e => { e.preventDefault(); const v = $('#key').value.trim(); if (!v) return; setKey(v); $('#key').value = ''; load(); });
if (getKey()) load(); else screen('connect');
})();
