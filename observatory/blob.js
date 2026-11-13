/* Maarif Observatory: the living blob. Reads workmap.json from the private repo hub-data with the browser's key
   (the same key as the Work Map and Reading Mode; this origin is shared). One soft shape per level: Maarif (a lobe per
   atlas), an atlas (a lobe per Bab), a Bab (a lobe per Fasl); courses float beside it as drops. Nested layers show how
   far the work has gone: the outer skin is everything listed, the gold core is what was taught. */
(function () {
'use strict';
const { $, esc, reduced, COL, ATLAS_LAY, fracs, side, legendHTML, dropSVG } = window.OBS;
function legend() { $('#legend').innerHTML = legendHTML((view.kids[0] || view).lay); }
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
  if (layer > 0 && !G.F[layer]) return 0;   // nothing in this layer here: draw nothing
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
  for (let i = 0; i < 5; i++) { const el = document.getElementById('L' + i); if (el) el.setAttribute('d', i && !G.F[i] ? '' : pathD(G, i, e)); }
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
    g.innerHTML = G.L.map(({ k }, i) => `<g class="lab" data-i="${i}"><text class="t1" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-size="${many ? 11.5 : 13.5}" font-weight="700" fill="${k.empty ? '#9aa39f' : '#2a5bb8'}" stroke="#fffdf8" stroke-width="4" paint-order="stroke">${esc(many ? k.short : (k.kind === 'Atlas' ? k.short : k.short))}</text>${many ? '' : `<text class="t2" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-size="11" fill="#6b736f" stroke="#fffdf8" stroke-width="3" paint-order="stroke">${esc(k.empty ? (k.kind === 'Atlas' ? (k.note || 'nothing listed yet') : 'not drafted yet') : k.levels.length === 1 ? k.lay[k.levels[0]].toLowerCase() : pct(k) + ' reached ' + (k.lay === ATLAS_LAY ? 'a sabaq' : 'class-ready'))}</text>`}</g>`).join('');
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

OBS.start(m => { M = m; show(M, []); });
})();