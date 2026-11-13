/* Maarif Observatory: shared parts of every view. Reads workmap.json from the private repo hub-data with the browser's
   key (the same key as the Work Map and Reading Mode; this origin is shared) and turns it into one tree: Maarif, atlases,
   Babs, Fasls; courses, Babs, sabaq; each item knows how far it went on a five-step ladder (0 listed to 4 taught) and the
   chain across (a Fasl knows its sabaq, a sabaq its Fasls and class lesson). */
(function () {
'use strict';
const OWNER = 'alimuqaddasm', KEY = 'workmap.key';
const API = `https://api.github.com/repos/${OWNER}/hub-data/contents/`, API_NOTES = `https://api.github.com/repos/${OWNER}/hub-notes/contents/`;
const RM = 'https://alimuqaddasm.github.io/reading-mode/', WM = 'https://alimuqaddasm.github.io/workmap/';
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const setKey = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the five layers, outer to inner */
/* colour palettes. Every colour the City paints comes from here, by the job it does:
   stage = the work ladder (not started, then three steps of one hue light to dark, then gold for taught: the one accent),
   ground = streets and plots (neutral, never a data colour), L = class lesson buildings, path = sabaq to lesson,
   q = open questions, mentor = mentor flags (status colours, always with a label in the panel) */
const PALETTES = {
  /* Dawn (owner's choice, 2026-11-13): from Fajr to sunrise. The more light, the further the work went:
     pre-dawn lavender (written), rose (in a sabaq), orange (refined, deck), full-sun gold (taught). */
  dawn: { name: 'Dawn', stage: ['#dcdbe6', '#a9a3d6', '#e48f9b', '#f0813a', '#f2be1d'], bg: '#f6f6f9',
    distA: '#ebebf2', distC: '#f1ecef', distLine: '#d9d8e3', blkA: '#e2e2ec', blkC: '#ebe3e8', blkE: '#f1f1f5', blkP: '#f7f7fa', dashP: '#aaa6c6', road: '#e3e2ea',
    gnumA: '#9a97b8', gnumC: '#b8909c', L: ['#f2be1d', '#f7d25a'], Lp: ['#ecebf2', '#f8f8fb'], path: '#e6a812', pathP: '#c3c0d6', q: '#c2255c', flatA: '#d9d8e4', flatC: '#e3d9df', beam: '#2a2550',
    ink: '#3f3d56', ink2: '#6b6885', lroof: '#7a5600', accent: '#3d3590', accentWash: '#ecebf7', signA: '#4b4590', signC: '#a14a5e', track: '#e6e5ee', dashP2: '#c3c0d6', mentor: { 'with mentor': '#3a2f8f', revising: '#9c36b5', final: '#2e7d32' } },
};
const PAL_BASE = { bg: '#fbfaf6', ink: '#4f5753', ink2: '#6b736f', halo: '#fffdf8', post: '#b9c4bf', lroof: '#7a4f00', ring: '#1d211f', dark: false, accent: '#0b5f57', accentWash: '#e4f2ef', signA: '#2a5bb8', signC: '#0b7a70', track: '#e7e5dc', dashP2: '#bdb7a6' };
const PAL = Object.assign({}, PAL_BASE, PALETTES[new URLSearchParams(location.search).get('pal')] || PALETTES.dawn);
const SOLID = PAL.stage;
const COL = SOLID.map(c => [c, c]);
const ATLAS_LAY = ['In the atlas plan', 'Fasl lesson written', 'Used in a hub sabaq', 'Sabaq refined, deck made', 'Taught in class'];
const COURSE_LAY = ['Listed in the hub', 'Teacher Copy written', 'Refined and proofed', 'Class-ready, deck made', 'Taught in class'];

/* ---------- data ---------- */
async function raw(path, base) {
  const r = await fetch((base || API) + path, { headers: { Authorization: 'Bearer ' + getKey(), Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-cache' });
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
      const kids = b.hub.map(H => ({ kind: 'Sabaq', cid: c.id, bab: b.n, n: H.h, has: H.has || [], code: `${c.code} B${b.n} S${H.h}`, short: 'S' + H.h, ur: H.ur, size: 1, lay: COURSE_LAY, unit: 'Fasls and class lesson',
        levels: [H.L && H.Ls === 'taught' ? 4 : stageOf(H.has)], L: H.L ? `L${H.L} ${H.Ls}` : '', fasls: H.fasls || [], fkeys: (H.fasls || []).map(u => c.atlas + ':' + u.replace(/^U/, '').split('-')[0]),
        Lnode: H.L ? { kind: 'Class lesson', n: H.L, taught: H.Ls === 'taught', has: H.has || [], code: `${c.code} B${b.n} L${H.L}`, short: 'L' + H.L, ur: H.ur, size: 1, lay: COURSE_LAY, levels: [H.Ls === 'taught' ? 4 : stageOf(H.has)], note: H.Ls === 'taught' ? 'Taught in class' : 'Planned, not taught yet', wm: `${WM}#course?c=${c.id}&b=${b.n}&s=${c.id}-${b.n}-${H.h}`, rm: `${RM}#${c.id}/${b.n}/${H.h}` } : null,
        wm: `${WM}#course?c=${c.id}&b=${b.n}&s=${c.id}-${b.n}-${H.h}`, rm: `${RM}#${c.id}/${b.n}/${H.h}` }));
      const PLAN = { settled: 'Bab settled', provisional: 'Bab provisional: its Fasls may still move', placeholder: 'Placeholder: the old atlas Bab, not reworked yet' };
      const an = c.atlas ? c.atlas[0].toUpperCase() + c.atlas.slice(1) : '';
      const from = !b.from_note ? `Built on ${an} atlas B${b.from}` : /unchanged/.test(b.from_note) ? `The ${an} atlas B${b.from} as it stands` : `Drawn mostly from ${an} atlas B${b.from}, part of the regrouping of ${b.from_note.replace(/^old /, 'atlas ').replace(/\s*\(.*\)$/, '')}`;
      return { kind: 'Bab', code: `${c.code} B${b.n}`, short: 'B' + b.n, ur: b.ur || '', en: b.en || '', plan: b.plan || '', size: Math.max(1, kids.length), levels: kids.map(k => k.levels[0]), empty: !kids.length, lay: COURSE_LAY, kids,
        wm: `${WM}#course?c=${c.id}&b=${b.n}`, rm: `${RM}#${c.id}`, unit: 'sabaq',
        note: [b.plan ? PLAN[b.plan] || b.plan : '', b.fasls_n ? `${b.fasls_n} Fasls` : '', kids.length ? from : b.plan ? `No lessons yet. ${from}` : `Hub: ${b.hub_state}`].filter(Boolean).join(' · ') };
    });
    return { kind: 'Course', id: c.id, code: c.code, short: c.code, ur: c.ur, size: 1, levels: babs.flatMap(b => b.levels), lay: COURSE_LAY, kids: babs, wm: `${WM}#course?c=${c.id}`, rm: `${RM}#${c.id}`, unit: 'sabaq', atlas: c.atlas };
  });
  if (w.muqaddima) { const m = w.muqaddima; const kids = m.lessons.map(l => ({ kind: 'Lesson', cid: 'mrf', has: l.has || [], code: l.code, short: l.code.replace('MRF-', ''), ur: l.ur, size: 1, lay: COURSE_LAY, levels: [stageOf(l.has)], wm: `${WM}#course?c=mrf`, rm: `${RM}#mrf/1/${l.code}` }));
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
    sb.kids = sb.fkeys.map(k => fIdx[k]).filter(Boolean).map(leaf); if (sb.Lnode) { sb.Lnode.sab = sb; sb.kids.push(sb.Lnode); } })));
  atlases.forEach(a => { a.drops = courses.filter(c => c.atlas && a.code.toLowerCase().startsWith(c.atlas)); a.kids.forEach(b => {
    b.kids.forEach(f => { f.kids = byF[f.key] || []; });
    b.drops = [...new Set(b.kids.flatMap(f => byF[f.key] || []))]; b.dropsHead = 'Sabaq built from this Bab'; }); });
  const all = atlases.flatMap(a => a.levels);
  return { kind: 'Maarif', code: 'All of Maarif', short: 'Maarif', ur: 'معارف', size: all.length, levels: all, lay: ATLAS_LAY, kids: atlases, courses, drops: courses, unit: 'atlases', wm: WM, rm: RM };
}

/* ---------- side panel and legend ---------- */
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
function legendHTML(lay) { return `<b>${lay === ATLAS_LAY ? 'How far each Fasl went' : 'How far each lesson went'}</b>` + lay.map((t, i) => `<span><i style="background:${i ? `radial-gradient(circle at 40% 35%,${COL[i][0]},${COL[i][1]})` : COL[0][1]}"></i>${t}</span>`).join(''); }

/* open questions (from Reading Mode's index) and mentor status (from hub-notes marks.json) on each sabaq */
function annotate(M, ri, marks) {
  const q = {};
  if (ri) for (const c of ri.courses) for (const b of c.babs) for (const s of b.sabaq) q[`${c.id}/${b.n}/${s.n}`] = { q: s.q || 0, notes: s.notes || 0 };
  for (const c of M.courses) for (const b of c.kids || []) for (const s of b.kids || []) {
    if (s.kind !== 'Sabaq') continue;
    const x = q[`${s.cid}/${s.bab}/${s.n}`]; if (x) { s.q = x.q; s.notes = x.notes; }
    const m = ((marks || {})[s.cid] || {})[`B${s.bab} S${s.n}`]; if (m) s.mentor = m;
  }
}

/* ---------- start: key, then data, then the view ---------- */
const screen = id => ['connect', 'app', 'loading'].forEach(x => { $('#' + x).hidden = x !== id; });
function start(ready) {
  async function load() {
    screen('loading');
    try {
      const [w, ri, marks] = await Promise.all([raw('workmap.json'), raw('reading/index.json').catch(() => null), raw('marks.json', API_NOTES).catch(() => ({}))]);
      const M = model(w); annotate(M, ri, marks || {});
      $('#made').textContent = 'Updated ' + String(w.made || '').replace(/^\d{4}-/, '').replace(' UTC', '');
      screen('app'); ready(M, w);
    } catch (e) {
      if (e.status === 401 || e.status === 404) setKey('');
      screen('connect'); $('#keyerr').hidden = false; $('#keyerr').textContent = e.message || String(e);
    }
  }
  $('#keyform').addEventListener('submit', e => { e.preventDefault(); const v = $('#key').value.trim(); if (!v) return; setKey(v); $('#key').value = ''; load(); });
  if (getKey()) load(); else screen('connect');
}
window.OBS = { RM, WM, $, esc, reduced, COL, SOLID, PAL, ATLAS_LAY, COURSE_LAY, fracs, counts, stageOf, model, bar, side, legendHTML, dropSVG, start };
})();
