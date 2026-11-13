/* Reading Mode. Reads reading/ from the private repo hub-data with the viewer's own GitHub key (the same key the
   Work Map uses; both sites share this origin; it covers hub-data and hub-notes, never the hub). Marks and notes are
   written to notes.json in hub-notes, so later Claude sessions can read them. Address: #zm/1/9 (hub sabaq), #zm/1/L02 (class lesson), #zm/papers/3, #mahdaviyat/15/U15.11
   (atlas Fasl lesson), #mahdaviyat/15/atlas, #notes. ?t= picks a tab, ?b= a block. */
(function () {
'use strict';
const OWNER = 'alimuqaddasm', DATA = 'hub-data', NOTES = 'hub-notes', KEY = 'workmap.key', WM = 'https://alimuqaddasm.github.io/workmap/';
const API = repo => `https://api.github.com/repos/${OWNER}/${repo}/contents/`;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UD = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const LS = { get(k, d) { try { const v = localStorage.getItem('rm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rm.' + k, JSON.stringify(v)); } catch (e) {} } };
const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const setKey = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };
const SCREENS = ['connect', 'fail', 'app', 'loading'];
const screen = id => SCREENS.forEach(x => { $('#' + x).hidden = x !== id; });
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500); }
const SCH = { MM: ['Mirza Mahdi Isfahani', 'میرزا مہدی اصفہانی'], AH: ['Shaykh Mahmud Halabi', 'شیخ محمود حلبی'], JS: ['Ayatollah Jafar Seyyedan', 'آیت اللہ سید جعفر سیدان'], EZ: ['Hasan Eftekharzadeh', 'سید حسن افتخارزادہ'] };
const SCH_SHORT = { MM: 'MM · Mirza Mahdi', AH: 'AH · Halabi', JS: 'JS · Seyyedan', EZ: 'EZ · Eftekharzadeh' };
const ICON = {
  book: '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 7 C10 5.5 7 5.5 5 6.5 V19 C7 18 10 18 13 19.5 C16 18 19 18 21 19 V6.5 C19 5.5 16 5.5 13 7 Z M13 7 V19.5" fill="none" stroke="#9fe0d4" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M7 1 L3 5 L7 9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  arr: '<svg class="arr" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5 H14 M10 1 L14 5 L10 9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  wm: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 11 L6 6 L9 9 L14 3" fill="none" stroke="#0b7a70" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.5 6.5 0 0 0 20 14.5 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 L9 12 L15 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 L15 12 L9 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 V15 M7 10 L12 15 L17 10 M5 20 H19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5 L10 6 L3 10.5 Z" fill="currentColor"/></svg>'
};

/* ---------- GitHub ---------- */
const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
async function gh(path, opts, raw, repo) {
  let r;
  const headers = { Authorization: 'Bearer ' + getKey(), Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  try { r = await fetch(API(repo || NOTES) + path, Object.assign({ headers, cache: 'no-cache' }, opts || {})); }
  catch (e) { const er = new Error('GitHub could not be reached. Check your connection.'); er.status = 0; throw er; }
  if (!r.ok) { const e = new Error(r.status === 401 ? 'GitHub refused the key. It may have expired or been revoked.' : r.status === 404 ? `Not found, or this key cannot open it: ${path}` : `GitHub answered ${r.status}.`); e.status = r.status; throw e; }
  return raw ? r.text() : r.json();
}
const cache = {};
async function data(rel) { return cache[rel] || (cache[rel] = JSON.parse(await gh('reading/' + rel, null, true, DATA))); }

/* ---------- state ---------- */
const S = { audio: {}, index: null, notes: { notes: {}, marks: {} }, notesSha: null, cur: null, key: '', curBlock: null, wmBase: WM };
const pref = { fs: LS.get('fs', 21), show: LS.get('show', { note: true, q: true, tc: true, omit: true }), focus: null };
function setFs(v) { pref.fs = Math.min(28, Math.max(15, v)); document.documentElement.style.setProperty('--fs', pref.fs + 'px'); LS.set('fs', pref.fs); }
setFs(pref.fs);
const theme = LS.get('theme', ''); if (theme) document.documentElement.dataset.theme = theme;

async function load() {
  screen('loading');
  try {
    const fonts = document.fonts ? Promise.race([Promise.all(['21px Gulzar', '700 21px "Noto Nastaliq Urdu"', '21px Amiri', '21px Vazirmatn', '14px Geist', '600 14px Geist'].map(f => document.fonts.load(f, 'ابپ Aa1'))).catch(() => {}), new Promise(r => setTimeout(r, 3000))]) : null;
    const [idx, aud, j] = await Promise.all([data('index.json'), Promise.all([gh('audio/index.json', null, true, DATA).then(JSON.parse).catch(() => ({})), data('audio/index.json').catch(() => ({}))]).then(([a, b]) => Object.assign({}, a, b)), gh('notes.json').catch(e => { if (e.status !== 404) throw e; return null; }), fonts]);
    S.index = idx; S.audio = aud || {};
    if (j) { S.notes = JSON.parse(b64dec(j.content)); S.notesSha = j.sha; } else { S.notes = { notes: {}, marks: {} }; S.notesSha = null; }
    S.notes.notes = S.notes.notes || {}; S.notes.marks = S.notes.marks || {};
    route();
  } catch (e) {
    if (e.status === 401 || e.status === 404) { setKey(''); connect(e.status === 404 ? 'This key cannot open hub-data and hub-notes. Make a key for those two repos (steps above) and paste it here.' : e.message); return; }
    $('#failmsg').textContent = e.message || String(e); screen('fail');
  }
}
function connect(msg) { screen('connect'); $('#keyerr').hidden = !msg; $('#keyerr').textContent = msg || ''; }
$('#keyform').addEventListener('submit', e => { e.preventDefault(); const v = $('#key').value.trim(); if (!v) { connect('Paste a key first.'); return; } setKey(v); $('#key').value = ''; load(); });
$('#retry').addEventListener('click', load);
$('#rekey').addEventListener('click', () => { setKey(''); connect(); });

/* ---------- saving notes and marks to the hub ---------- */
let saveT = 0, saving = false, dirty = false; const GONE = new Set();
function setSave(t) { const el = $('#save'); if (el) el.textContent = t; }
function queueSave() { dirty = true; setSave('Saving'); clearTimeout(saveT); saveT = setTimeout(flush, 1200); }
async function flush() {
  if (saving || !dirty || !getKey()) return; saving = true; dirty = false; let failed = false;
  const body = sha => JSON.stringify({ message: 'Reading Mode: notes and marks', content: b64enc(JSON.stringify(S.notes, null, 1) + '\n'), sha: sha || undefined, branch: 'main' });
  const put = sha => gh('notes.json', { method: 'PUT', headers: { Authorization: 'Bearer ' + getKey(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body(sha) });
  try {
    let r;
    try { r = await put(S.notesSha); }
    catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      const j = await gh('notes.json'); const theirs = JSON.parse(b64dec(j.content));
      for (const k of ['notes', 'marks']) for (const [id, v] of Object.entries(theirs[k] || {})) { if (GONE.has(id)) continue; const mine = S.notes[k][id]; if (!mine || (v.updated || '') > (mine.updated || '')) S.notes[k][id] = v; }
      annotateAll();
      r = await put(j.sha);
    }
    S.notesSha = r.content.sha; setSave('Saved');
  } catch (e) {
    dirty = true; failed = true; setSave(e.status === 403 || e.status === 404 ? 'Not saved: the key can read but not write' : 'Not saved, will retry');
    if (e.status !== 403) setTimeout(flush, 15000);
  } finally { saving = false; if (dirty && !failed) queueSave(); }
}
addEventListener('beforeunload', e => { if (dirty || saving) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- routing ---------- */
function parse() {
  const [p, q] = decodeURIComponent(location.hash.slice(1)).split('?');
  return { seg: (p || '').split('/').filter(Boolean), q: new URLSearchParams(q || '') };
}
const hash = (seg, q) => '#' + seg.join('/') + (q && Object.keys(q).length ? '?' + new URLSearchParams(q) : '');
function go(seg, q) { const h = hash(seg, q); if (location.hash === h) route(); else location.hash = h; }
addEventListener('hashchange', route);
let routeGen = 0;
function sameLesson(key, q) {
  if (!S.cur || S.cur.key !== key || !$('.desk') || q.get('ans') || (q.get('t') || 'tc') !== S.cur.tab0) return false;
  const b = q.get('b'), t = b && document.getElementById('r-' + b); S.cur.block = b;
  if (t) { t.scrollIntoView({ block: 'start' }); focusRow(t); } else scrollTo(0, 0);
  return true;
}
async function route() {
  if (!S.index) return;
  const g = ++routeGen, live = () => g === routeGen;
  let seg = [], q = new URLSearchParams();
  try { ({ seg, q } = parse()); } catch (e) { location.hash = ''; return; }
  closeDrawer(); $$('.over').forEach(o => o.parentNode.removeChild(o)); $('#selbar').hidden = true; selCtx = null;
  const view = $('#view'); screen('app');
  try {
    const course = S.index.courses.find(c => c.id === seg[0]), atlas = S.index.atlases.find(a => a.id === seg[0]);
    if (!seg.length) return library();
    if (seg[0] === 'notes') return await myNotes(live);
    if (course && !seg[1]) return courseView(course);
    if (course && seg[1] === 'papers') return await paperView(course, +seg[2], live);
    if (course && seg[2]) {
      const slug = /^\d+$/.test(seg[2]) ? 'S' + String(seg[2]).padStart(2, '0') : seg[2];
      if (sameLesson(`${course.id}/B${seg[1]}/${slug}`, q)) return;
      view.innerHTML = '<div class="loading">Loading</div>';
      const d = await data(`${course.id}/B${seg[1]}/${slug}.json`); if (!live()) return;
      return lessonView({ d, key: `${course.id}/B${seg[1]}/${slug}`, course, bab: +seg[1], tab: q.get('t') || 'tc', block: q.get('b'), ans: q.get('ans') });
    }
    if (atlas && !seg[1]) return atlasView(atlas, null);
    if (atlas && seg[1] === 'other') { const d = await data(`${atlas.id}/other.json`); if (!live()) return; return textView(d, [atlas.ur, 'Introduction and appendices'], [atlas.id]); }
    if (atlas && !seg[2]) return atlasView(atlas, +seg[1]);
    if (atlas && seg[2] === 'atlas') { const d = await data(`${atlas.id}/B${seg[1]}/atlas.json`); if (!live()) return; return textView(d, [atlas.ur, `B${seg[1]}`, 'Atlas text'], [atlas.id, seg[1]]); }
    if (atlas) {
      if (sameLesson(`${atlas.id}/B${seg[1]}/${seg[2]}`, q)) return;
      view.innerHTML = '<div class="loading">Loading</div>';
      const d = await data(`${atlas.id}/B${seg[1]}/${seg[2]}.json`); if (!live()) return;
      return lessonView({ d, key: `${atlas.id}/B${seg[1]}/${seg[2]}`, atlas, bab: +seg[1], tab: q.get('t') || 'tc', block: q.get('b') });
    }
    library();
  } catch (e) {
    if (!live()) return;
    if (e.status === 401) { setKey(''); connect(e.message); return; }
    view.innerHTML = `<div class="page"><div class="panel"><h3>This could not be opened</h3><p class="ui" style="direction:ltr;text-align:right">${esc(e.message)}</p><a class="btn" href="#">Back to the library</a></div></div>`;
    topBar({ crumbs: [] });
  }
}

/* ---------- top bar ---------- */
function topBar(o) {
  if (typeof AU !== 'undefined' && AU.key && o.lessonKey !== AU.key) closePlayer();
  const crumbs = (o.crumbs || []).map((c, i, a) => (i ? ICON.chev : '') + (i === a.length - 1 ? `<span class="cur${c.ui ? ' c ui' : ''}">${esc(c.t)}</span>` : `<a href="${c.h}"${c.ui ? ' class="c ui"' : ''}>${esc(c.t)}</a>`)).join('');
  const wm = o.wm || WM;
  let h = `<div class="top1"><button type="button" class="btn tocbtn" id="bToc">${ICON.menu}Contents</button>
    <a class="brand" href="#"><span class="mk">${ICON.book}</span>Reading Mode</a>${o.path || `<nav class="crumb" aria-label="Where you are">${crumbs}</nav>`}<span class="tools"><span class="save" id="save"></span>
    <a class="btn" href="${esc(wm)}" target="wm" title="Open this place in the Work Map">${ICON.wm}Work Map</a>
    <button type="button" class="btn icon" id="bTheme" aria-label="Dark or light">${ICON.moon}</button>
    <button type="button" class="btn" id="bForget" title="Remove your key from this browser">Forget key</button></span></div>`;
  if (o.second) h += `<div class="top2">${o.second}</div>`;
  $('#top').innerHTML = h;
  $('#bForget').onclick = () => { if (dirty || saving) { toast('Wait a moment: your last note is still saving.'); return; } closePlayer(); closeDrawer(); setKey(''); S.index = null; S.cur = null; S.notes = { notes: {}, marks: {} }; $('#view').innerHTML = ''; connect('Your key was removed from this browser.'); };
  $('#bTheme').onclick = () => { const r = document.documentElement; const dark = r.dataset.theme === 'dark' || (!r.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); r.dataset.theme = dark ? 'light' : 'dark'; LS.set('theme', r.dataset.theme); };
  const tb = $('#bToc'); if (o.rail) tb.onclick = openDrawer; else tb.hidden = true;
}
function openDrawer() {
  closeDrawer();
  const r = $('.desk>.rail'); if (!r) return;
  const d = document.createElement('div'); d.className = 'drawer'; d.id = 'drawer';
  d.innerHTML = `<div class="scrim"></div><div class="dp" role="dialog" aria-label="Contents"><button type="button" class="btn dclose" data-dclose>Close</button><nav class="rail">${r.innerHTML}</nav></div>`;
  document.body.append(d); d.querySelector('.scrim').onclick = closeDrawer; d.querySelector('[data-dclose]').onclick = closeDrawer; d.querySelector('[data-dclose]').focus();
  d.addEventListener('click', e => { if (e.target.closest('a')) closeDrawer(); });
}
function closeDrawer() { const d = $('#drawer'); if (d) d.remove(); }

/* ---------- library ---------- */
const ALL_COURSES = [['zm', 'ذکرِ منعم', 'ZM'], ['th', 'معارفِ توحید', 'TH'], ['ma', 'مکارم الاخلاق', 'MA'], ['mrf', 'معارف: مقدماتی گفتگو', 'MRF'], ['taz', 'تذکر', 'MS']];
const ALL_ATLASES = [['mahdaviyat', 'مہدویت'], ['tauheed', 'توحید'], ['akhlaq', 'اخلاق'], ['adl', 'عدل'], ['maad', 'معاد'], ['nubuwat', 'نبوت'], ['imamat', 'امامت']];
function library() {
  topBar({ crumbs: [] });
  const last = LS.get('last', null);
  const cnt = (c, f) => c.babs.reduce((n, b) => n + b.sabaq.reduce((m, s) => m + s[f], 0), 0);
  let h = `<div class="page"><section class="hero"><div style="display:flex;flex-direction:column;justify-content:center;gap:10px">
    <h1>ہر سبق، ہر نوٹ، ایک جگہ</h1>
    <p>چار علما کے اطلس، ان سے بنے ہب کے اسباق، کلاس کے دروس اور ہینڈ آؤٹ؛ ساتھ ہر مرتب کا نوٹ، ہر نشان اور ہر کھلا سوال، جیسا فائل میں ہے ویسا۔</p>
    <div class="who">${Object.entries(SCH).map(([k, v]) => `<span style="--c:var(--${k});--w:var(--${k}-w)"><i class="dot"></i>${v[1]}</span>`).join('')}</div></div>`;
  h += last ? `<a class="cont" href="${esc(last.h)}"><span class="k">Continue reading · ${esc(last.code)}</span><span class="t">${esc(last.title)}</span>
      <span class="pills">${last.notes ? `<span>${last.notes} editor notes</span>` : ''}${last.q ? `<span class="q">${last.q} open questions</span>` : ''}${last.tc ? `<span>${last.tc} teacher-only parts</span>` : ''}</span></a>`
    : `<div class="cont empty"><span class="k">Start reading</span><span class="t">ذکرِ منعم، باب ۱</span><a class="btn" href="#zm/1/1" style="align-self:flex-start">Open ZM B1 S1</a></div>`;
  h += `</section><section style="display:flex;flex-direction:column;gap:16px"><div class="shead"><h2>Courses</h2><span>Hub sabaq, class lessons, handouts, decks, papers</span></div><div class="grid">`;
  for (const [id, ur, code] of ALL_COURSES) {
    const c = S.index.courses.find(x => x.id === id);
    if (c) h += `<a class="card" href="#${id}"><span style="display:flex;justify-content:space-between;align-items:center"><span class="t">${ur}</span><span class="code">${code}</span></span>
      <span class="m"><span>${c.babs.map(b => 'B' + b.n).join(', ')}</span><span>${c.babs.reduce((n, b) => n + b.sabaq.length, 0)} sabaq</span><span>${c.babs.reduce((n, b) => n + b.lessons.length, 0)} class lesson texts</span><span>${cnt(c, 'notes')} editor notes</span><span>${cnt(c, 'q')} open questions</span></span></a>`;
    else h += `<div class="card off"><span style="display:flex;justify-content:space-between;align-items:center"><span class="t">${ur}</span><span class="code">${code}</span></span><span class="m"><span>Not in Reading Mode yet</span></span></div>`;
  }
  h += `</div></section><section style="display:flex;flex-direction:column;gap:16px"><div class="shead"><h2>Atlases</h2><span>Each Fasl as an atlas lesson, colour-coded by scholar, with the original Persian beside it</span></div><div class="grid">`;
  for (const [id, ur] of ALL_ATLASES) {
    const a = S.index.atlases.find(x => x.id === id);
    if (a) { const built = a.babs.reduce((n, b) => n + b.fasls.filter(f => f.parts.length).length, 0), all = a.babs.reduce((n, b) => n + b.fasls.length, 0);
      h += `<a class="card" href="#${id}"><span class="t">${ur}</span><span class="m"><span>${a.babs.map(b => 'B' + b.n).join(', ')}</span><span>${a.babs.length} Babs, every Nukta</span><span>${built ? built + ' of ' + all + ' Fasls built as lessons' : 'no Fasl lessons yet'}</span></span><span class="bar"><span style="width:${100 * built / all}%;background:var(--atlas)"></span></span></a>`; }
    else h += `<div class="card off"><span class="t">${ur}</span><span class="m"><span>Being built on a branch; it appears here once it reaches main</span></span></div>`;
  }
  h += `</div></section><section class="grid">`;
  h += `<div class="panel"><h3>Waiting on you</h3>${S.index.courses.flatMap(c => c.babs.map(b => ({ c, b, q: b.sabaq.reduce((n, s) => n + s.q, 0) }))).filter(x => x.q).map(x => `<a class="rowlink" href="#notes?v=q&c=${x.c.id}"><span>${x.c.code} B${x.b.n}: open questions</span><b>${x.q}</b></a>`).join('') || '<p class="ui muted">Nothing open.</p>'}</div>`;
  const mine = Object.keys(S.notes.notes).length, mk = Object.values(S.notes.marks).filter(m => m.verdict || m.key || m.bridge || m.move != null).length;
  h += `<div class="panel"><h3>My notes</h3><p class="ui" style="direction:ltr;text-align:right;margin:0;font-size:14px;color:var(--soft)">Your marks and notes are saved in the private repo hub-notes (notes.json), so the next Claude session can read them.</p>
    <a class="rowlink" href="#notes"><span>${mine} notes, ${mk} marked blocks</span><b style="color:var(--accent)">Open</b></a></div></section>
    <p class="ui muted" style="direction:ltr;text-align:right;font-size:12px">Built from the repos ${esc(S.index.made)}. Pilot: ZM B1 and Mahdaviyat B15.</p></div>`;
  $('#view').innerHTML = h;
}

/* ---------- course and atlas pages ---------- */
function courseView(c) {
  topBar({ crumbs: [{ t: c.ur }], wm: `${WM}#course?c=${c.id}` });
  const at = c.atlas && S.index.atlases.find(a => a.id === c.atlas);
  let h = `<div class="page"><header style="display:flex;flex-direction:column;gap:4px"><h1 style="margin:0;font-family:var(--ur-h);font-size:40px;line-height:2.1">${c.ur}</h1>
    <p class="ui" style="margin:0;direction:ltr;text-align:right;color:var(--soft)">${c.code}${at ? `, built from the <a href="#${at.id}">${at.name} atlas</a>` : ''} · <a href="https://github.com/alimuqaddasm/${c.repo}">${c.repo}</a></p></header>`;
  const flat = c.id === 'mrf';
  for (const b of c.babs) {
    h += `<section style="display:flex;flex-direction:column;gap:12px"><div class="shead"><h2>${flat ? 'Lessons' : `B${b.n} hub sabaq`}</h2><span>${b.sabaq.length} ${flat ? 'lessons' : 'sabaq'} · editor notes, open questions and teacher-only parts counted for each</span></div><div class="list">`;
    let sec = null;
    for (const s of b.sabaq) {
      if (flat && s.section && s.section !== sec) { sec = s.section; h += `<div class="li off" style="min-height:40px;background:var(--paper-2)"><span></span><span class="t" style="font-size:15px;font-weight:700;color:var(--soft)">${esc(sec)}</span><span></span></div>`; }
      h += `<a class="li" href="#${c.id}/${b.n}/${s.slug}"><span class="n">${esc(s.label)}</span><span class="t">${esc(s.title)}</span><span class="meta">${s.L ? `<span class="pill ${s.Ls === 'planned' ? 'lp' : 'l'}">L${s.L} ${s.Ls === 'planned' ? 'planned' : 'taught'}</span>` : ''}${s.notes ? `<span class="pill note">${s.notes} notes</span>` : ''}${s.q ? `<span class="pill q">${s.q} questions</span>` : ''}${s.tc ? `<span class="pill tc">${s.tc} teacher only</span>` : ''}${s.text ? '<span class="pill off">plain text</span>' : ''}</span></a>`;
    }
    h += `</div>`;
    if (b.lessons && b.lessons.length) {
      h += `<div class="shead" style="margin-top:14px"><h2>B${b.n} class lesson texts</h2><span>Written from a hub sabaq for one class; every version kept</span></div><div class="list">`;
      for (const l of b.lessons) h += `<a class="li" href="#${c.id}/${b.n}/${l.slug}"><span class="n" style="color:var(--gold-ink)">L${l.L}</span><span class="t">${esc(l.title)}</span><span class="meta"><span class="pill off">${esc(l.variant || 'main text')}</span><span class="pill off">${esc(l.where.split('/')[0])}</span></span></a>`;
      h += `</div>`;
    }
    h += `</section>`;
  }
  if (!c.babs.length) h += `<p class="ui muted" style="direction:ltr;text-align:right">This course keeps its sessions as papers; they are listed below.</p>`;
  // papers grouped by folder
  const groups = {};
  c.papers.forEach(p => { const d = p.path.includes('/') ? p.path.split('/').slice(0, -1).join('/') : '(top folder)'; (groups[d] = groups[d] || []).push(p); });
  const q = new URLSearchParams(location.hash.split('?')[1] || ''); const filt = (q.get('pf') || '').toLowerCase();
  h += `<section style="display:flex;flex-direction:column;gap:12px"><div class="shead"><h2>Papers</h2><span>${c.papers.length} files: plans, diagnosis, feedback, rulings, change logs, open questions, tafseer, notes</span></div>
    <label class="ui" style="direction:ltr;display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="muted" style="font-size:13px">Filter</span><input id="pf" type="search" value="${esc(filt)}" placeholder="folder or file name" style="font-size:14px;border:1px solid var(--rule);border-radius:9px;padding:0 10px;min-height:36px;background:var(--paper);min-width:240px"></label>`;
  for (const [d, ps] of Object.entries(groups).sort()) {
    const shown = ps.filter(p => !filt || p.path.toLowerCase().includes(filt));
    if (!shown.length) continue;
    h += `<details class="list pgrp"${Object.keys(groups).length <= 6 || filt ? ' open' : ''}><summary class="ui" style="cursor:pointer;direction:ltr;text-align:right;padding:12px 22px;font-size:14px;font-weight:650">${esc(d)} <span class="muted" style="font-weight:500">· ${shown.length}</span></summary>`;
    for (const p of shown) h += `<a class="li" href="#${c.id}/papers/${p.i}"><span class="n">${p.i + 1}</span><span class="t">${p.title && /[؀-ۿ]/.test(p.title) ? esc(p.title) + '<br>' : ''}<span class="ui" style="direction:ltr;display:block;text-align:right;font-size:13px;color:var(--soft)">${esc(p.path.split('/').pop())}${p.title && !/[؀-ۿ]/.test(p.title) && p.title !== p.path ? ' · ' + esc(p.title) : ''}</span></span><span></span></a>`;
    h += `</details>`;
  }
  $('#view').innerHTML = h + `</section></div>`;
  const pf = $('#pf'); if (pf) pf.addEventListener('change', () => go([c.id], pf.value ? { pf: pf.value } : {}));
}
function atlasView(a, bn) {
  const b = a.babs.find(x => x.n === bn);
  topBar({ crumbs: b ? [{ t: a.ur, h: '#' + a.id }, { t: 'B' + bn, ui: 1 }] : [{ t: a.ur }], wm: `${WM}#atlas?a=${a.id}${bn ? '&b=' + bn : ''}` });
  const cs = S.index.courses.filter(c => c.atlas === a.id);
  let h = `<div class="page"><header style="display:flex;flex-direction:column;gap:4px"><h1 style="margin:0;font-family:var(--ur-h);font-size:40px;line-height:2.1">${b ? `${a.ur}، باب ${UD(b.n)}` : a.ur}</h1>
    ${b ? `<p style="margin:0;font-size:20px;line-height:2;color:var(--soft)">${esc(b.ur || '')}</p>` : ''}
    <p class="ui" style="margin:0;direction:ltr;text-align:right;color:var(--soft)">${a.name} atlas${cs.length ? ' · used by ' + cs.map(c => `<a href="#${c.id}">${c.code}</a>`).join(', ') : ' · no course built from it yet'}</p></header>`;
  if (!b) {
    h += `<div class="grid">` + a.babs.map(x => { const built = x.fasls.filter(f => f.parts.length).length;
      const used = [...new Set(x.fasls.flatMap(f => (f.used || []).map(u => u.code.split(' S')[0].split(' L')[0])))];
      return `<a class="card" href="#${a.id}/${x.n}"><span class="m" style="justify-content:space-between"><span>B${x.n}</span><span>${x.fasls.length} Fasls${built ? ` · ${built} built as lessons` : ''}</span></span><span class="t" style="font-size:20px">${esc(x.ur || '')}</span>
        ${built ? `<span class="bar"><span style="width:${100 * built / Math.max(1, x.fasls.length)}%;background:var(--atlas)"></span></span>` : ''}${used.length ? `<span class="m">${used.map(u => `<span class="pill s">${esc(u)}</span>`).join('')}</span>` : ''}</a>`; }).join('') + `</div>`;
    if (a.other) h += `<a class="btn" href="#${a.id}/other" style="align-self:flex-end">Introduction, registers and appendices of the atlas</a>`;
  } else {
    const built = b.fasls.filter(f => f.parts.length).length;
    h += `<section style="display:flex;flex-direction:column;gap:12px"><div class="shead"><h2>Fasls</h2><span>${built} of ${b.fasls.length} built as atlas lessons · <a href="#${a.id}/${b.n}/atlas">the atlas text of this Bab, every Nukta</a></span></div><div class="list">`;
    for (const f of b.fasls) {
      const used = (f.used || []).map(u => `<a class="pill s" href="#${u.course}/${u.bab}/${u.slug}">${esc(u.code)}</a>`).join('');
      if (!f.parts.length) { h += `<div class="li off"><span class="n">F${f.id.split('.')[1]}</span><span class="t">${esc(f.ur)}</span><span class="meta"><span class="pill off">not built yet</span>${used}</span></div>`; continue; }
      f.parts.forEach((p, i) => { h += `<div class="li" data-href="#${a.id}/${b.n}/${p.id}" role="link" tabindex="0"><span class="n" style="color:var(--atlas)">F${f.id.split('.')[1]}${f.parts.length > 1 ? '.' + (i + 1) : ''}</span><span class="t">${esc(p.title || f.ur)}</span><span class="meta"><span class="pill f">${esc(p.label)}</span>${i === 0 ? used : ''}</span></div>`; });
    }
    h += `</div></section>`;
    const prev = a.babs.find(x => x.n === b.n - 1), next = a.babs.find(x => x.n === b.n + 1);
    h += `<nav style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${prev ? `<a class="card" href="#${a.id}/${prev.n}" style="padding:10px 16px"><span class="ui muted" style="font-size:12px;direction:ltr;text-align:right">Previous · B${prev.n}</span><span style="font-size:17px;line-height:2">${esc(prev.ur || '')}</span></a>` : '<span></span>'}${next ? `<a class="card" href="#${a.id}/${next.n}" style="padding:10px 16px;text-align:left"><span class="ui muted" style="font-size:12px;direction:ltr;text-align:left">Next · B${next.n}</span><span style="font-size:17px;line-height:2">${esc(next.ur || '')}</span></a>` : ''}</nav>`;
  }
  $('#view').innerHTML = h + '</div>';
}

/* ---------- plain documents (papers, atlas text) ---------- */
function md(t) {
  const lines = String(t || '').replace(/\r/g, '').split('\n'); let out = '', list = null, para = [], pre = null;
  const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const dir = s => /[؀-ۿ]/.test(s.slice(0, 40).replace(/[A-Za-z0-9 .,:;()\-\[\]#*`|/]/g, '')) ? 'rtl' : 'ltr';
  const flushP = () => { if (para.length) { const s = para.join(' '); out += `<p dir="${dir(s)}">${inl(s)}</p>`; para = []; } };
  const flushL = () => { if (list) { out += `<ul>${list.map(s => `<li dir="${dir(s)}">${inl(s)}</li>`).join('')}</ul>`; list = null; } };
  for (const l of lines) {
    if (pre !== null) { if (/^```/.test(l)) { out += `<pre>${esc(pre.join('\n'))}</pre>`; pre = null; } else pre.push(l); continue; }
    if (/^```/.test(l)) { flushP(); flushL(); pre = []; continue; }
    if (/^\|/.test(l)) { flushP(); flushL(); out += `<pre>${esc(l)}</pre>`; continue; }
    const m = l.match(/^(#{1,4}) (.*)$/);
    if (m) { flushP(); flushL(); out += `<h${m[1].length} dir="${dir(m[2])}">${inl(m[2])}</h${m[1].length}>`; continue; }
    const li = l.match(/^\s*(?:[-*]|\d+[.)]) (.*)$/);
    if (li) { flushP(); (list = list || []).push(li[1]); continue; }
    if (!l.trim()) { flushP(); flushL(); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL(); if (pre) out += `<pre>${esc(pre.join('\n'))}</pre>`;
  return out.replace(/<\/pre><pre>/g, '\n');
}
async function paperView(c, i, live) {
  const d = await data(`${c.id}/papers/${String(i).padStart(3, '0')}.json`); if (live && !live()) return;
  textView(d, [c.ur, 'Papers', d.path.split('/').pop()], [c.id]);
}
function textView(d, crumbs, back) {
  topBar({ crumbs: crumbs.map((t, i) => ({ t, h: i === 0 ? '#' + back[0] : back[1] ? `#${back[0]}/${back[1]}` : '#' + back[0], ui: i > 0 })) });
  $('#view').innerHTML = `<div class="page" style="max-width:980px"><div class="sheet"><div class="lhead"><span class="k">${esc(d.repo)} · ${esc(d.path || '')}</span>
    <a class="btn" href="${esc(d.url)}" style="align-self:flex-end">${ICON.dl}Open on GitHub</a></div><div class="doc"><div class="md">${md(d.text)}</div></div></div></div>`;
}

/* ---------- a lesson ---------- */
const PAL = s => (s && s.length === 1 && SCH[s[0]]) ? `var(--${s[0]}-t)` : (s && s.length > 1 ? 'var(--several)' : '');
function sents(arr, bid) {
  return (arr || []).map((s, i) => { const sch = s.sch || [];
    return `<span class="s${s.c ? ' comp' : ''}" data-sch="${sch.join(' ')}" data-s="${bid}.${i}" data-r="${esc(s.refs)}" style="${s.c ? '' : `--t:${PAL(sch)}`}">${s.h}</span>`; }).join(' ');
}
function speaker(sch) {
  if (!sch || !sch.length) return '';
  return sch.map(c => `<span class="spk" style="--c:var(--${c})"><i class="dot"></i>${SCH[c] ? SCH[c][1] : c}</span>`).join(' ');
}
const isFa = a => /[پچژگ]/.test((a || []).join(' ')) && !/[ًٌٍَُِّْ]{3}/.test((a || []).join(' '));
function blockHTML(b, prev) {
  const chg = (b.sch || []).join() !== ((prev && prev.sch) || []).join();
  const ho = b.ho ? '<span class="ho">Handout only</span>' : '';
  switch (b.t) {
    case 'h2': return `<h2>${b.h}</h2>`;
    case 'h3': return `<h3>${b.h}</h3>${(b.kinds && b.kinds.length) || b.lines ? `<div class="kinds">${(b.kinds || []).map(k => `<span>${esc(k)}</span>`).join('')}${b.lines ? `<code>${esc(b.lines)}</code>` : ''}</div>` : ''}`;
    case 'intro': return `<div class="intro"><span class="lbl">Written for the lesson from its own material</span>${sents(b.s, b.id)}</div>`;
    case 'para': return `${b.side ? `<span class="lbl">${esc(b.side)}</span>` : ''}${chg ? speaker(b.sch) : ''}<p>${ho}${b.s.every(x => x.c) && !b.tc && S.cur.d.kind === 'sabaq' ? '' : ''}${sents(b.s, b.id)}</p>`;
    case 'list': return `<ul class="ul">${(b.s || []).map((s, i) => `<li>${sents([s], b.id + '-' + i)}</li>`).join('')}</ul>`;
    case 'tr': return `<div class="blk-tr">${sents(b.s, b.id)}</div>`;
    case 'ayah': return `${b.side ? `<span class="lbl">${esc(b.side)}</span>` : ''}<div class="blk-ar"><span class="s" data-s="${b.id}.0" data-r="${esc(b.refs)}" style="--t:var(--accent)">${(b.ar || []).map(a => '﴿' + a + '﴾').join(' ')}</span></div>${b.ref ? `<div class="blk-ref">${esc(b.ref)}</div>` : ''}`;
    case 'hadith': case 'quote': {
      let h = (b.side ? `<span class="lbl">${esc(b.side)}</span>` : '') + (chg ? speaker(b.sch) : '');
      h += `<div class="blk-ar${b.t === 'quote' ? ' quote' : ''}${isFa(b.ar) ? ' fa' : ''}"><span class="s" data-s="${b.id}.0" data-r="${esc(b.refs)}" style="--t:inherit">${(b.ar || []).join('<br>')}</span></div>`;
      if (b.ref) h += `<div class="blk-ref">(${esc(b.ref)})</div>`;
      if (b.unverified) h += `<div class="unver">The text of this ${b.t === 'quote' ? 'quotation' : 'narration'} was not found word for word.</div>`;
      if (b.said && b.said.length) h += `<details class="fold"><summary>As said in the recording</summary><div class="body">${b.said.join('<br>')}</div></details>`;
      if (b.matn && b.matn.length) h += `<details class="fold"><summary>The full text of the narration</summary><div class="body">${b.matn.join('<br>')}</div></details>`;
      return h;
    }
    case 'omitted': return `<details class="omitted"${pref.show.omit ? ' open' : ''}><summary><b>Left out of the lesson</b><span>${b.reason}</span></summary>${(b.lines || []).map((l, i) => `<p><span class="s" data-s="${b.id}.${i}" data-r="${esc(b.refs)}">${l}</span></p>`).join('')}</details>`;
    case 'khulasa': return `<div class="khulasa"><h2>خلاصہ</h2><span class="lbl">Written for the lesson from its own material</span><ol>${(b.items || []).map((it, i) => `<li>${sents(it.s, b.id + '-' + i)}</li>`).join('')}</ol></div>`;
    case 'ikh': return '<div class="ikh">Where the scholars differ</div>';
    case 'ikh-end': return '<div class="ikh" style="border-top-style:dotted;font-weight:500">End of the difference</div>';
  }
  return `<p>${esc(JSON.stringify(b))}</p>`;
}
const SIDE_T = ['tnote', 'q'];
const markable = b => !['h2', 'ikh', 'ikh-end', 'tnote', 'q'].includes(b.t);
const isContent = b => !['h2', 'h3', 'ikh', 'ikh-end', 'tnote', 'q'].includes(b.t);
function noteCard(b, i, n) {
  const long = b.h.length > 380;
  return `<div class="mcard note${long ? ' clip' : ''}" data-tn="${b.id}"><span class="mh"><span><i class="sq" style="background:var(--note)"></i> Editor note</span><span>${i} of ${n}</span></span><p>${b.h}</p>${long ? '<button type="button" class="more" data-act="more">Show all</button>' : ''}</div>`;
}
function qCard(b) {
  return `<div class="mcard q" id="q-${esc(b.qid)}"><span class="mh"><span>Open question</span><span>${esc(b.qid)}</span></span>
    <p class="en"><b>${esc(b.title)}</b>${esc(b.context)}</p>${b.question ? `<p class="en"><b>Question</b>${esc(b.question)}</p>` : ''}
    ${b.now ? `<span class="lab">Now: ${esc(b.now)}</span>` : ''}
    ${b.text ? `<details><summary class="lab" style="cursor:pointer">Source text${b.text_source ? ' · ' + esc(b.text_source) : ''}</summary><p class="fa" lang="fa">${esc(b.text)}</p></details>` : ''}
    ${b.ruling ? `<div class="ruling"><span class="lab">Ruling</span><p class="en">${esc(b.ruling)}${b.rnote ? ' ' + esc(b.rnote) : ''}</p></div>` : ''}
    <button type="button" class="btn" data-act="answer" data-q="${esc(b.qid)}" style="align-self:flex-start">Answer</button></div>`;
}
function lessonView(L) {
  L.tab0 = L.tab0 || L.tab; const d = L.d; if (!L.keep && (!S.cur || S.cur.key !== L.key)) { S.curBlock = null; curSec = -1; } S.cur = L;
  const isS = d.kind === 'sabaq', isC = d.kind === 'class', isF = d.kind === 'fasl';
  const items = d.items || [];
  const nq = items.filter(i => i.t === 'q').length, nn = items.filter(i => i.t === 'tnote').length, ntc = items.filter(i => i.tc && !SIDE_T.includes(i.t)).length;
  const heads = items.filter(i => i.t === 'h2' || (i.t === 'h3' && !isS));
  const tabs = [['tc', isF ? 'Atlas lesson' : 'Teacher Copy'], ['handout', 'Handout view']];
  if (nq) tabs.push(['questions', 'Open questions', nq]);
  if (isS && (d.changes || []).length) tabs.push(['changes', 'Changes', d.changes.reduce((n, g) => n + (g.items || []).length, 0)]);
  tabs.push(['files', 'Decks and files', (d.files || []).length]);
  if (!tabs.some(t => t[0] === L.tab)) L.tab = 'tc';
  if (!items.length) L.tab = L.tab === 'tc' ? 'text' : L.tab;
  const seg = parse().seg;
  const tabH = tabs.map(([k, t, n]) => `<a href="${hash(seg, k === 'tc' ? {} : { t: k })}"${L.tab === k ? ' aria-current="page"' : ''}>${t}${n ? `<span class="n${k === 'questions' ? ' q' : ''}">${n}</span>` : ''}</a>`).join('');
  const schf = Object.keys(SCH).filter(k => items.some(i => (i.sch || []).includes(k))).map(k => `<button type="button" data-sch="${k}" aria-pressed="${pref.focus === k}" style="--c:var(--${k})"><i class="dot"></i>${SCH_SHORT[k]}</button>`).join('');
  const tg = (k, t, c) => `<button type="button" class="btn" data-show="${k}" aria-pressed="${!!pref.show[k]}"><i class="sq" style="background:${c}"></i>${t}</button>`;
  const disp = `<details class="dd disp"><summary class="btn">Display<span class="car" aria-hidden="true">▾</span></summary><div class="menu wide" role="group" aria-label="Display">
      ${nn || nq || ntc || items.some(i => i.t === 'omitted') ? `<span class="mh">Show in the lesson</span><div class="mrow">${nn ? tg('note', 'Editor notes', 'var(--note)') : ''}${nq ? tg('q', 'Open questions', 'var(--q)') : ''}${ntc ? tg('tc', 'Teacher only', 'var(--tc-line)') : ''}${items.some(i => i.t === 'omitted') ? tg('omit', 'Left-out material', 'var(--faint)') : ''}</div>` : ''}
      ${schf ? `<span class="mh">Light up one scholar</span><div class="schf mrow" role="group" aria-label="Show one scholar">${schf}</div>` : ''}
      <span class="mh">Text size</span><div class="mrow"><button type="button" class="btn icon" id="bSm" aria-label="Smaller text">A−</button><button type="button" class="btn icon" id="bLg" aria-label="Larger text">A+</button></div></div></details>`;
  const second = `${yNav(L)}${zNav(L, tabs, seg)}<span class="gap"></span>${disp}`;
  // chain and crumbs
  let chain = '', crumbs, wm;
  if (isS) {
    const at = S.index.atlases.find(a => a.id === L.course.atlas);
    const fas = [...new Set((d.sources || []).filter(s => /^U\d+\.\d+(-\d+)?$/.test(s)).map(s => s.split('-')[0]))];
    const byBab = {}; fas.forEach(u => { const [b, f] = u.slice(1).split('.'); (byBab[b] = byBab[b] || []).push('F' + f); });
    const ents = Object.entries(byBab).sort((x, y) => y[1].length - x[1].length); const more = ents.slice(1).reduce((n, e) => n + e[1].length, 0);
    chain = `<span class="chain">${ents.slice(0, 1).map(([b, fs]) => { const ab = at && at.babs.find(x => x.n === +b); const f0 = ab && ab.fasls.find(x => x.id === `U${b}.${fs[0].slice(1)}`);
        return f0 && f0.parts.length ? `<a class="chip f" href="#${at.id}/${b}/${f0.parts[0].id}">${at.name} B${b} ${fs.join(', ')}</a>` : `<span class="chip f">${(at ? at.name : 'Atlas')} B${b} ${fs.join(', ')}</span>`; }).join(' ')}${more ? `<span class="chip f" title="${esc(ents.slice(1).map(e => 'B' + e[0] + ' ' + e[1].join(', ')).join('; '))}">+${more} more</span>` : ''}
      ${ICON.arr}<span class="chip s">${esc(d.code)}</span>${d.L ? ICON.arr + (lesLink(L, d.L) ? `<a class="chip ${d.Ls === 'planned' ? 'lp' : 'l'}" href="${lesLink(L, d.L)}">L${d.L} ${d.Ls === 'planned' ? 'planned' : 'taught'}</a>` : `<span class="chip ${d.Ls === 'planned' ? 'lp' : 'l'}">L${d.L} ${d.Ls === 'planned' ? 'planned' : 'taught'}</span>`) : ''}</span>`;
    crumbs = L.course.id === 'mrf' ? [{ t: L.course.ur, h: '#' + L.course.id }, { t: d.slug || d.code, ui: 1 }] : [{ t: L.course.ur, h: '#' + L.course.id }, { t: 'B' + L.bab, h: '#' + L.course.id, ui: 1 }, { t: (d.slug || 'S' + d.n).replace(/^S0/, 'S'), ui: 1 }];
    wm = `${WM}#course?c=${L.course.id}&b=${L.bab}&s=${L.course.id}-${L.bab}-${d.n}`;
  } else if (isC) {
    chain = `<span class="chain"><span class="chip l">${esc(d.code)}</span>${d.variant ? `<span class="chip lp">${esc(d.variant)}</span>` : ''}</span>`;
    crumbs = [{ t: L.course.ur, h: '#' + L.course.id }, { t: 'B' + L.bab, h: '#' + L.course.id, ui: 1 }, { t: 'L' + d.L + (d.variant ? ', ' + d.variant : ''), ui: 1 }];
    wm = `${WM}#course?c=${L.course.id}&b=${L.bab}`;
  } else {
    const used = (d.used || []).map(u => `<a class="chip s" href="#${u.course}/${u.bab}/${u.n}">${u.code}</a>`).join('');
    chain = `<span class="chain"><span class="chip f">${esc(L.atlas.name)} B${L.bab} F${d.fasl_id.split('.')[1]} · ${esc(d.label)}</span>${used ? '<span class="muted">used by</span>' + used : ''}</span>`;
    crumbs = [{ t: L.atlas.ur, h: '#' + L.atlas.id }, { t: 'B' + L.bab, h: `#${L.atlas.id}/${L.bab}`, ui: 1 }, { t: d.label || d.fasl_id, ui: 0 }];
    wm = `${WM}#atlas?a=${L.atlas.id}&b=${L.bab}`;
  }
  topBar({ crumbs, path: xPath(L), second, rail: 1, wm, lessonKey: L.key });
  // rail
  const secs = []; let cur = null;
  items.forEach(it => { if (it.t === 'h2' || (it.t === 'h3' && !isS)) { cur = { it, sch: new Set() }; secs.push(cur); } else if (cur && it.sch) it.sch.forEach(x => cur.sch.add(x)); });
  let n2 = 0;
  const rail = `<span class="rh">${esc(d.code || d.label || '')} · ${secs.length} sections</span>` + secs.map(s => { const num = s.it.t === 'h2' && /^[۰-۹]+۔/.test(s.it.h) ? '' : '';
      return `<a href="${hash(seg, { b: s.it.id })}" data-b="${s.it.id}" class="${s.it.t}"><span class="rn">${num}</span><span style="flex:1">${s.it.h.replace(/<[^>]+>/g, '')}</span><span class="dots">${[...s.sch].map(c => `<i style="background:var(--${c})"></i>`).join('')}</span></a>`; }).join('')
    + lessonsRail(L) + `<div class="sum">${nn ? `<button type="button" data-list="note"><span>Editor notes</span><b style="color:var(--note)">${nn}</b></button>` : ''}${nq ? `<button type="button" data-list="q"><span>Open questions</span><b style="color:var(--q)">${nq}</b></button>` : ''}${ntc ? `<button type="button" data-list="tc"><span>Teacher-only parts</span><b style="color:var(--tc)">${ntc}</b></button>` : ''}<button type="button" data-list="mine"><span>My notes here</span><b style="color:var(--accent)">${Object.values(S.notes.notes).filter(x => x.lesson === L.key).length}</b></button></div>`;
  // head
  const tot = {}; items.forEach(it => (it.s || []).forEach(s => { const k = s.c ? '+' : (s.sch || []).length === 1 ? s.sch[0] : (s.sch || []).length ? '*' : '+'; tot[k] = (tot[k] || 0) + (s.h || '').length; }));
  const all = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  const share = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span style="width:${100 * v / all}%;background:${SCH[k] ? `var(--${k})` : k === '*' ? 'var(--several)' : 'var(--rule)'}" title="${SCH[k] ? SCH[k][0] : k === '*' ? 'several scholars' : 'written for the lesson'}"></span>`).join('');
  const kicker = isS ? `${d.code} · ${L.tab === 'handout' ? 'Handout view' : 'Teacher Copy'}` : isC ? (d.same_as ? `${d.code} · taught from ${d.same_as} as written, so this is the sabaq's own text` : `${d.code} · class lesson text${d.variant ? ', ' + d.variant : ''}`) : `${L.atlas.name} atlas lesson, step M1 · ${d.label || ''}`;
  let h = `<div class="desk"><nav class="rail" aria-label="Sections">${rail}</nav><main class="read"><article class="sheet">
    <header class="lhead"><span class="k">${esc(kicker)}</span><h1>${d.title || ''}</h1>${share ? `<span class="share" role="img" aria-label="Who speaks how much">${share}</span>` : ''}
    ${d.ref ? `<span class="ref">${esc(d.ref)}</span>` : ''}${(d.sources || []).length ? `<span class="src">sources ${esc(d.sources.join(' '))}</span>` : ''}
    ${d.md ? `<span class="src"><a href="${esc(d.md)}">the lesson file on GitHub</a></span>` : ''}</header>`;
  if (L.tab === 'files') h += filesHTML(d);
  else if (L.tab === 'changes') h += changesHTML(d);
  else if (L.tab === 'questions') h += `<div class="files">${items.filter(i => i.t === 'q').map(qCard).join('')}</div>`;
  else if (!items.length) h += `<div class="doc"><div class="banner">This version could not be laid out block by block, so it is shown as written.</div><div class="md">${md(d.text)}</div></div>`;
  else if (L.tab === 'handout' && d.kind === 'sabaq') {
    // owner's ruling 2026-11-13 (every course): the Handout view stays empty until the Teacher Copy comments are applied and the Handout is written
    // (course/B0n/MA-B0n-Sn.handout.md, block ids h1, h2 ...); a lesson whose Handout is the fenced layer of its own text keeps showing it
    const hi = d.handout ? d.handout.items : (items.some(i => i.tc && !SIDE_T.includes(i.t)) ? items : []);
    h += hi.length ? rowsHTML(hi, 'handout') : `<div class="doc"><div class="banner">No Handout yet. The Handout is written after the owner's comments on the Teacher Copy are applied, and then shows here.</div></div>`;
  }
  else h += rowsHTML(items, L.tab);
  const nx = neighbours(L);
  h += `<nav style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:26px 44px 0">${nx.prev ? `<a class="card" href="${nx.prev.h}" style="padding:10px 16px"><span class="ui muted" style="font-size:12px;direction:ltr;text-align:right">Previous · ${esc(nx.prev.code)}</span><span style="font-size:17px;line-height:2">${esc(nx.prev.t)}</span></a>` : '<span></span>'}
    ${nx.next ? `<a class="card" href="${nx.next.h}" style="padding:10px 16px;text-align:left"><span class="ui muted" style="font-size:12px;direction:ltr;text-align:left">Next · ${esc(nx.next.code)}</span><span style="font-size:17px;line-height:2">${esc(nx.next.t)}</span></a>` : ''}</nav>`;
  h += `</article></main></div><div class="dock"><div class="dock-in"><button type="button" id="dPrev" aria-label="Previous section">${ICON.prev}</button><span class="now" id="now"></span><button type="button" id="dNext" aria-label="Next section">${ICON.next}</button>
    ${S.audio[L.key] ? `<button type="button" class="listen" id="bListen" title="Play the audio of this lesson">${ICON.play}Listen</button>` : '<button type="button" class="listen" disabled title="No audio has been made for this lesson yet">' + ICON.play + 'Listen</button>'}</div></div>`;
  $('#view').innerHTML = h;
  // wire
  $('#bSm').onclick = () => setFs(pref.fs - 1); $('#bLg').onclick = () => setFs(pref.fs + 1);
  const rer = sel => { // keep the paragraph at the top of the screen where it was
    const lim = ($('#top').getBoundingClientRect().bottom || 0) + 8; let anc = null, off = 0;
    for (const r of $$('.row[data-b]')) { const t = r.getBoundingClientRect(); if (t.bottom > lim) { anc = r.dataset.b; off = t.top; break; } }
    const dOpen = !!($('.disp') && $('.disp').open); L.block = null; L.keep = true; lessonView(L); L.keep = false; if (dOpen && $('.disp')) $('.disp').open = true;
    const el = anc && document.getElementById('r-' + anc);
    if (el) { const fix = () => scrollBy(0, el.getBoundingClientRect().top - off); fix(); requestAnimationFrame(fix); }
    const b = $(sel); if (b) b.focus({ preventScroll: true }); };
  const keepPlace = f => { // hold the paragraph at the top of the screen still while the layout changes
    const lim = ($('#top').getBoundingClientRect().bottom || 0) + 8; let el = null, off = 0;
    for (const r of $$('.row[data-b]')) { const t = r.getBoundingClientRect(); if (t.bottom > lim) { el = r; off = t.top; break; } }
    f(); if (el) scrollBy(0, el.getBoundingClientRect().top - off); };
  const applyShow = () => { const dk = $('.desk'); if (!dk) return;
    dk.classList.toggle('hide-note', !pref.show.note); dk.classList.toggle('hide-q', !pref.show.q);
    $$('details.omitted', dk).forEach(x => { x.open = !!pref.show.omit; });
    if (pref.focus) dk.dataset.focus = pref.focus; else delete dk.dataset.focus;
    $$('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(!!pref.show[b.dataset.show])));
    $$('[data-sch]').forEach(b => b.setAttribute('aria-pressed', String(pref.focus === b.dataset.sch))); };
  $$('[data-show]').forEach(b => b.onclick = () => { const k = b.dataset.show; pref.show[k] = !pref.show[k]; LS.set('show', pref.show); if (k === 'tc') rer(`[data-show="tc"]`); else keepPlace(applyShow); });
  $$('[data-sch]').forEach(b => b.onclick = () => { pref.focus = pref.focus === b.dataset.sch ? null : b.dataset.sch; keepPlace(applyShow); });
  applyShow();
  annotateAll();
  if (isS || isC || isF) LS.set('last', { h: location.hash || hash(seg), code: d.code || d.label, title: (d.title || '').replace(/<[^>]+>/g, ''), notes: nn, q: nq, tc: ntc });
  observe(); warmRows();
  if (AU.key === L.key) { const bl = $('#bListen'); if (bl) bl.setAttribute('aria-pressed', 'true'); if (AU.lastB) sayBlock(AU.lastB, true); }
  const t = L.block && document.getElementById('r-' + L.block);
  if (t) { t.scrollIntoView({ block: 'start' }); focusRow(t); } else if (!L.keep) window.scrollTo(0, 0);
  if (L.ans && t) { const ans = L.ans; L.ans = null; history.replaceState(null, '', hash(seg, { b: L.block })); newNote(L.block, { quote: '', start: null, end: null, refs: '' }, ['answer:' + ans], true); }
}
const ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 0 }), 60));
function warmRows() {
  const rows = $$('.row .txt'), g = routeGen; let i = 0;
  const step = dl => { if (g !== routeGen) return; do { if (i >= rows.length) return; rows[i++].getBoundingClientRect(); } while (dl.timeRemaining() > 12); ric(step); };
  ric(step);
}
/* ---------- getting around: previous and next lesson, this Bab's lessons, connected material ---------- */
const shortCode = c => String(c || '').split(' ').slice(-1)[0];
function stepHTML(nx) {
  if (!nx.prev && !nx.next) return '';
  const b = (x, cls, ic, key) => x ? `<a class="sb ${cls}" href="${x.h}" title="${esc(x.code)} · ${esc(String(x.t || '').replace(/<[^>]+>/g, ''))} (${key})">${cls === 'p' ? ic : ''}<span>${esc(x.s || shortCode(x.code))}</span>${cls === 'n' ? ic : ''}</a>` : `<span class="sb off ${cls}" aria-hidden="true"></span>`;
  return `<nav class="step" aria-label="Previous and next lesson">${b(nx.prev, 'p', ICON.prev, 'Shift and right arrow')}${b(nx.next, 'n', ICON.next, 'Shift and left arrow')}</nav>`;
}
function lessonsRail(L) {
  const d = L.d, open = LS.get('railLessons', true); let items = '', head = '';
  if (L.course) {
    const b = L.course.babs.find(x => x.n === L.bab); if (!b) return '';
    const cur = parse().seg[2];
    head = L.course.id === 'mrf' ? `${b.sabaq.length} lessons` : `B${b.n} · ${b.sabaq.length} sabaq`;
    items = b.sabaq.map(x => { const on = d.kind === 'sabaq' && (x.slug === d.slug || x.n === d.n);
      return `<a class="lsn${on ? ' on' : ''}" href="#${L.course.id}/${b.n}/${x.slug}"${on ? ' aria-current="page"' : ''}><b>${esc(x.label)}</b><span class="lt">${esc(x.title)}</span>${x.L ? `<i class="${x.Ls === 'planned' ? 'lp' : 'l'}">L${x.L}</i>` : ''}</a>`; }).join('');
    if (b.lessons && b.lessons.length) items += `<span class="lsh">Class lesson texts</span>` + b.lessons.map(l => { const on = d.kind === 'class' && l.slug === cur;
      return `<a class="lsn${on ? ' on' : ''}" href="#${L.course.id}/${b.n}/${l.slug}"${on ? ' aria-current="page"' : ''}><b>L${l.L}</b><span class="lt">${esc(l.title)}</span>${l.variant ? `<i class="v">${esc(l.variant)}</i>` : ''}</a>`; }).join('');
  } else {
    const b = L.atlas.babs.find(x => x.n === L.bab); if (!b) return '';
    const parts = b.fasls.flatMap(f => f.parts.map((pt, i) => ({ f, pt, i })));
    head = `B${b.n} · ${parts.length} atlas lessons`;
    items = parts.map(({ f, pt, i }) => { const on = pt.id === parse().seg[2];
      return `<a class="lsn${on ? ' on' : ''}" href="#${L.atlas.id}/${b.n}/${pt.id}"${on ? ' aria-current="page"' : ''}><b>F${f.id.split('.')[1]}${f.parts.length > 1 ? '.' + (i + 1) : ''}</b><span class="lt">${esc(pt.title || f.ur)}</span></a>`; }).join('');
  }
  return `<details class="rl"${open ? ' open' : ''}><summary>${esc(head)}</summary>${items}</details>`;
}
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('.rail details.rl')) LS.set('railLessons', e.target.open); }, true);
function connHTML(L, wm) {
  const d = L.d, rows = [], chip = (h, t, cls, title) => h ? `<a class="chip ${cls}" href="${h}"${title ? ` title="${esc(title)}"` : ''}>${esc(t)}</a>` : `<span class="chip ${cls} off"${title ? ` title="${esc(title)}"` : ''}>${esc(t)}</span>`;
  const row = (k, v) => { if (v) rows.push(`<span class="ck">${k}</span><span class="cv">${v}</span>`); };
  if (d.kind === 'sabaq') {
    const at = S.index.atlases.find(a => a.id === L.course.atlas);
    const fas = [...new Set((d.sources || []).filter(x => /^U\d+\.\d+(-\d+)?$/.test(x)).map(x => x.split('-')[0]))];
    row('Built from', fas.map(u => { const [b, f] = u.slice(1).split('.'); const ab = at && at.babs.find(x => x.n === +b); const fl = ab && ab.fasls.find(x => x.id === u);
      return chip(fl && fl.parts.length ? `#${at.id}/${b}/${fl.parts[0].id}` : '', `${at ? at.name + ' ' : ''}B${b} F${f}`, 'f', fl ? fl.ur + (fl.parts.length ? '' : ' (not built as an atlas lesson yet)') : ''); }).join(''));
    if (d.L) row('Taught as', chip(lesLink(L, d.L), `L${d.L} ${d.Ls === 'planned' ? 'planned' : 'taught'}`, d.Ls === 'planned' ? 'lp' : 'l', lesLink(L, d.L) ? 'Read the class lesson text' : 'No class lesson text yet'));
  } else if (d.kind === 'class') {
    const b = L.course.babs.find(x => x.n === L.bab); const src = b && b.sabaq.find(x => x.L === d.L);
    row('Written from', src ? chip(`#${L.course.id}/${L.bab}/${src.slug}`, `${L.course.code} B${L.bab} ${src.label}`, 's', src.title) : '');
    const vs = b ? b.lessons.filter(l => l.L === d.L && l.slug !== parse().seg[2]) : [];
    row('Other versions', vs.map(l => chip(`#${L.course.id}/${L.bab}/${l.slug}`, l.variant || l.where.split('/')[0], 'lp', l.where)).join(''));
  } else if (d.kind === 'fasl') {
    row('Used by', (d.used || []).map(u => chip(`#${u.course}/${u.bab}/${u.n}`, u.code, 's')).join(''));
    const b = L.atlas.babs.find(x => x.n === L.bab); const f = b && b.fasls.find(x => x.id === d.fasl_id);
    if (f && f.parts.length > 1) row('Parts', f.parts.map((pt, i) => chip(pt.id === parse().seg[2] ? '' : `#${L.atlas.id}/${L.bab}/${pt.id}`, `${i + 1}. ${pt.label}`, 'f', pt.title)).join(''));
    row('Atlas', chip(`#${L.atlas.id}/${L.bab}/atlas`, `B${L.bab} atlas text, every Nukta`, 'f') + chip(`#${L.atlas.id}/${L.bab}`, `All Fasls of B${L.bab}`, 'f'));
  }
  row('Work Map', `<a class="chip w" href="${esc(wm)}" target="wm">Open here in the Work Map</a>`);
  return rows.length ? `<nav class="conn" aria-label="Connected material">${rows.join('')}</nav>` : '';
}
/* ---------- three ways to move ----------
   X: the material chain, atlas, Fasl, sabaq, class lesson (top row)
   Y: the number along the Bab, S1 to S21, L1 to L5, F1 to F41 (second row, and Shift with an arrow key)
   Z: the forms of the same lesson, Teacher Copy, Handout, Master Copy and other versions (second row)
   Moving on one axis keeps your place on the other two. */
const VARIANT = l => l.variant || (/-a$/.test(l.slug) ? 'Audio text' : 'Main text');
function pickVariant(ls, want) { return ls.find(l => VARIANT(l) === want) || ls.find(l => !l.variant && !/-a$/.test(l.slug)) || ls.find(l => /teacher copy/i.test(l.variant || '')) || ls[0]; }
function yItems(L) {   // the number axis runs across every Bab, so Next on the last sabaq of B1 goes to B2 S1
  const d = L.d, cur = parse().seg[2], flat = L.course && L.course.id === 'mrf';
  const tagB = (bn, t) => (bn === L.bab || flat ? '' : `B${bn} `) + t;
  if (d.kind === 'sabaq') {
    const items = L.course.babs.flatMap(b => b.sabaq.map(x => ({ bab: b.n, h: `#${L.course.id}/${b.n}/${x.slug}`, s: tagB(b.n, x.label), code: `${L.course.code} ${flat ? '' : 'B' + b.n + ' '}${x.label}`, t: x.title, tag: x.L ? `L${x.L}` : '', tagc: x.Ls === 'planned' ? 'lp' : 'l' })));
    const b = L.course.babs.find(x => x.n === L.bab), k = b.sabaq.findIndex(x => x.slug === d.slug || (!d.slug && x.n === d.n));
    return { items, i: items.findIndex(x => x.bab === L.bab && x.h === `#${L.course.id}/${L.bab}/${b.sabaq[k] && b.sabaq[k].slug}`) }; }
  if (d.kind === 'class') {
    const mine = (L.course.babs.find(x => x.n === L.bab) || { lessons: [] }).lessons.find(l => l.slug === cur); const want = mine ? VARIANT(mine) : 'Main text';
    const items = L.course.babs.flatMap(b => [...new Set(b.lessons.map(l => l.L))].sort((m, n) => m - n).map(n => {
      const l = pickVariant(b.lessons.filter(x => x.L === n), want); const src = b.sabaq.find(x => x.L === n);
      return { bab: b.n, L: n, h: `#${L.course.id}/${b.n}/${l.slug}`, s: tagB(b.n, `L${n}`), code: `${L.course.code} B${b.n} L${n} (${VARIANT(l)})`, t: l.title, tag: src ? src.label : '', tagc: 's' }; }));
    return { items, i: items.findIndex(x => x.bab === L.bab && x.L === d.L) }; }
  const items = L.atlas.babs.flatMap(b => b.fasls.flatMap(f => f.parts.map((pt, k) => ({ bab: b.n, id: pt.id, h: `#${L.atlas.id}/${b.n}/${pt.id}`, s: tagB(b.n, `F${f.id.split('.')[1]}${f.parts.length > 1 ? '.' + (k + 1) : ''}`), code: `${L.atlas.name} B${b.n} ${pt.label}`, t: pt.title || f.ur, tag: pt.label, tagc: 'f' }))));
  return { items, i: items.findIndex(x => x.bab === L.bab && x.id === cur) };
}
const clean = t => String(t || '').replace(/<[^>]+>/g, '');
function ddHTML(label, opts, cls, cur, title) {
  if (!opts.length) return `<span class="st ${cls} none"${title ? ` title="${esc(title)}"` : ''}>${label}</span>`;
  if (opts.length === 1 && !cur) return `<a class="st ${cls}" href="${opts[0].h}" title="${esc(clean(opts[0].sub || opts[0].t))}">${label}</a>`;
  return `<details class="dd"><summary class="st ${cls}${cur ? ' cur' : ''}"${cur ? ' aria-current="page"' : ''}>${label}${opts.length > 1 ? '<span class="car" aria-hidden="true">▾</span>' : ''}</summary><div class="menu">${opts.map(o => `<a href="${o.h}"${o.on ? ' aria-current="page"' : ''}><b>${esc(o.t)}</b>${o.sub ? `<span>${esc(clean(o.sub))}</span>` : ''}</a>`).join('')}</div></details>`;
}
function xPath(L) {
  const d = L.d, sep = `<span class="xs" aria-hidden="true">${ICON.chev}</span>`, cap = (k, v) => `<i>${k}</i>${esc(v)}`;
  let course = L.course, at = L.course ? S.index.atlases.find(a => a.id === L.course.atlas) : L.atlas, sabs = [], srcs = [];
  const sabOf = (cid, bn, pred) => { const c = S.index.courses.find(x => x.id === cid); const b = c && c.babs.find(x => x.n === bn); const x = b && b.sabaq.find(pred); return x && { c, b, x }; };
  if (d.kind === 'sabaq') { const o = sabOf(course.id, L.bab, x => x.slug === d.slug || x.n === d.n); if (o) sabs = [o]; srcs = d.sources || []; }
  else if (d.kind === 'class') { const o = sabOf(course.id, L.bab, x => x.L === d.L); if (o) { sabs = [o]; srcs = o.x.sources || []; } }
  else { sabs = (d.used || []).map(u => sabOf(u.course, +u.bab, x => String(x.n) === String(u.n) || x.slug === u.slug)).filter(Boolean); course = sabs[0] && sabs[0].c; }
  // atlas and Fasl
  const fas = d.kind === 'fasl' ? [d.fasl_id] : [...new Set(srcs.filter(x => /^U\d+\.\d+(-\d+)?$/.test(x)).map(x => x.split('-')[0]))];
  const fl = fas.map(u => { const [bn, f] = u.slice(1).split('.'); const ab = at && at.babs.find(x => x.n === +bn); return { u, bn: +bn, f, fasl: ab && ab.fasls.find(x => x.id === u) }; });
  const babs = [...new Set(fl.map(x => x.bn))]; const mainB = d.kind === 'fasl' ? L.bab : (fl[0] ? fl[0].bn : null);
  let out = '';
  if (at) out += ddHTML(cap('Atlas', `${at.name}${mainB ? ' B' + mainB : ''}`), (babs.length ? babs : mainB ? [mainB] : []).flatMap(bn => [
    { h: `#${at.id}/${bn}`, t: `${at.name} B${bn}: every Fasl`, sub: (at.babs.find(x => x.n === bn) || {}).ur || '' },
    { h: `#${at.id}/${bn}/atlas`, t: `${at.name} B${bn}: the atlas text`, sub: 'every Nukta of the Bab' }]).concat(babs.length ? [] : [{ h: `#${at.id}`, t: `${at.name}: every Bab` }]), 'a', false) + sep;
  if (d.kind === 'fasl') out += ddHTML(cap('Fasl', `F${d.fasl_id.split('.')[1]} · ${d.label || ''}`), [], 'f cur', true).replace('none', '') + sep;
  else if (at) out += ddHTML(cap('Fasl', fl.length ? `F${fl[0].f}${fl.length > 1 ? ' +' + (fl.length - 1) : ''}` : 'none listed'),
    fl.map(x => ({ h: x.fasl && x.fasl.parts.length ? `#${at.id}/${x.bn}/${x.fasl.parts[0].id}` : `#${at.id}/${x.bn}`, t: `B${x.bn} F${x.f}${x.fasl && x.fasl.parts.length ? '' : ' (not built yet)'}`, sub: x.fasl ? x.fasl.ur : '' })), 'f', false) + sep;
  // sabaq
  if (d.kind === 'sabaq') out += `<span class="st s cur" aria-current="page">${cap(course.id === 'mrf' ? 'Lesson' : 'Sabaq', d.code)}</span>`;
  else out += ddHTML(cap('Sabaq', sabs.length === 1 ? `${sabs[0].c.code} B${sabs[0].b.n} ${sabs[0].x.label}` : sabs.length ? `${sabs.length} sabaq` : 'none yet'),
    sabs.map(o => ({ h: `#${o.c.id}/${o.b.n}/${o.x.slug}`, t: `${o.c.code} B${o.b.n} ${o.x.label}`, sub: o.x.title })), 's', false);
  // class lesson
  if (course && course.id !== 'mrf') {
    out += sep;
    if (d.kind === 'class') out += `<span class="st l cur" aria-current="page">${cap('Class lesson', 'L' + d.L)}</span>`;
    else { const ls = sabs.flatMap(o => o.x.L ? o.b.lessons.filter(l => l.L === o.x.L).map(l => ({ o, l })) : []);
      const planned = sabs.find(o => o.x.L);
      const want = LS.get('zform', 'Teacher Copy');
      const best = [...new Set(ls.map(z => z.o.x.L))].map(n => { const g = ls.filter(z => z.o.x.L === n); const l = pickVariant(g.map(z => z.l), want); return g.find(z => z.l === l); });
      out += ddHTML(cap('Class lesson', best.length === 1 ? `L${best[0].l.L}` : best.length ? `${best.length} lessons` : planned ? `L${planned.x.L} · no text yet` : 'not planned'),
        best.map(z => ({ h: `#${z.o.c.id}/${z.o.b.n}/${z.l.slug}`, t: `L${z.l.L} · ${VARIANT(z.l)}`, sub: z.l.title })), 'l', false, planned ? `L${planned.x.L} ${planned.x.Ls || ''}: its class lesson text is not in Reading Mode yet` : 'No class lesson is planned from this yet'); }
  }
  return `<nav class="xpath" aria-label="Material chain: atlas, Fasl, sabaq, class lesson">${out}</nav>`;
}
function yNav(L) {
  const y = yItems(L), p = y.items[y.i - 1], n = y.items[y.i + 1], me = y.items[y.i];
  if (!me) return '';
  const arrow = (x, cls, ic, word, key) => x ? `<a class="${cls}" href="${x.h}" title="${word}: ${esc(x.code)} · ${esc(clean(x.t))} (${key})">${cls === 'yp' ? ic + `<span>${esc(x.s)}</span>` : `<span>${esc(x.s)}</span>` + ic}</a>` : `<span class="${cls} off" aria-hidden="true">${ic}</span>`;
  const many = new Set(y.items.map(x => x.bab)).size > 1; let lastB = null;
  const menu = y.items.map((x, k) => (many && x.bab !== lastB ? `<span class="mbab"${(lastB = x.bab) === me.bab ? ' data-here' : ''}>Bab ${x.bab}</span>` : '') + `<a href="${x.h}"${k === y.i ? ' aria-current="page"' : ''}><b>${esc(x.s.replace(/^B\d+ /, ''))}</b><span>${esc(clean(x.t))}</span>${x.tag ? `<i class="${x.tagc}">${esc(x.tag)}</i>` : ''}</a>`).join('');
  const inBab = y.items.filter(x => x.bab === me.bab).length, pos = y.items.filter((x, k) => x.bab === me.bab && k <= y.i).length, num = +((me.s.match(/(\d+)\D*$/) || [])[1]);
  const ofTxt = (num === pos ? `of ${inBab}` : `${pos} of ${inBab}`) + (many ? ' · B' + me.bab : '');
  return `<nav class="ynav" aria-label="Lesson number">${arrow(p, 'yp', ICON.prev, 'Previous', 'Shift and right arrow')}<details class="dd ydd"><summary class="ycur">${esc(me.s)}<span class="of">${ofTxt}</span><span class="car" aria-hidden="true">▾</span></summary><div class="menu list">${menu}</div></details>${arrow(n, 'yn', ICON.next, 'Next', 'Shift and left arrow')}</nav>`;
}
function zNav(L, tabs, seg) {
  const d = L.d, t = (k, label, n) => `<a href="${hash(seg, k === 'tc' ? {} : { t: k })}"${L.tab === k ? ' aria-current="page"' : ''}>${label}${n ? `<span class="n${k === 'questions' ? ' q' : ''}">${n}</span>` : ''}</a>`;
  let forms = '';
  if (d.kind === 'class') {
    const b = L.course.babs.find(x => x.n === L.bab); const cur = seg[2];
    const vs = b ? b.lessons.filter(l => l.L === d.L) : [];
    forms = vs.map(l => `<a href="#${L.course.id}/${L.bab}/${l.slug}" data-zform="${esc(VARIANT(l))}"${l.slug === cur && L.tab !== 'handout' ? ' aria-current="page"' : ''}>${esc(VARIANT(l))}</a>`).join('');
    if (!vs.some(l => /handout/i.test(l.variant || ''))) forms += t('handout', 'Handout view');
  } else forms = t('tc', d.kind === 'fasl' ? 'Atlas lesson' : 'Teacher Copy') + t('handout', 'Handout view');
  const more = tabs.filter(([k]) => !['tc', 'handout'].includes(k)).map(([k, label, n]) => t(k, label, n)).join('');
  return `<nav class="tabs zforms" aria-label="Form of this lesson">${forms}</nav>${more ? `<nav class="tabs more" aria-label="About this lesson">${more}</nav>` : ''}`;
}
document.addEventListener('click', e => {
  const zf = e.target.closest('[data-zform]'); if (zf) LS.set('zform', zf.dataset.zform);
  if (!document.contains(e.target)) return; // the click redrew the page (Teacher only): leave the menu as it is
  $$('details.dd[open]').forEach(dd => { if (!dd.contains(e.target) || e.target.closest('.menu a')) dd.open = false; });
});
addEventListener('keydown', e => { if (e.key === 'Escape') $$('details.dd[open]').forEach(dd => { dd.open = false; }); });
document.addEventListener('toggle', e => { const dd = e.target; if (dd.matches && dd.matches('details.ydd') && dd.open) { const m = $('.menu', dd), a = $('a[aria-current]', dd) || $('[data-here]', dd); if (m && a) m.scrollTop = a.offsetTop - m.clientHeight / 3; } }, true);
function lesLink(L, n) {
  const b = L.course.babs.find(x => x.n === L.bab); const ls = b ? b.lessons.filter(l => l.L === n) : [];
  const l = ls.find(x => !x.variant && !/-a$/.test(x.slug)) || ls[0];
  return l ? `#${L.course.id}/${L.bab}/${l.slug}` : '';
}
function neighbours(L) { const y = yItems(L); return { prev: y.items[y.i - 1], next: y.items[y.i + 1] }; }
function rowsHTML(items, tab) {
  const hide = it => (tab === 'handout' && (it.tc || SIDE_T.includes(it.t) || it.t === 'omitted')) || (tab !== 'handout' && it.tc && !pref.show.tc && !SIDE_T.includes(it.t));
  const nTot = items.filter(i => i.t === 'tnote').length; let nI = 0;
  const rows = [];
  let prevC = null;
  for (const it of items) {
    if (it.t === 'tnote') nI++;
    if (hide(it)) continue;
    if (SIDE_T.includes(it.t)) {
      const card = it.t === 'tnote' ? noteCard(it, nI, nTot) : qCard(it);
      if (rows.length) rows[rows.length - 1].side.push(card); else rows.push({ it: { t: 'h2', id: 'b0', h: '' }, side: [card], seam: '' });
      continue;
    }
    let seam = '';
    if (isContent(it) && prevC) {
      const a = (prevC.sch || []).join(), c = (it.sch || []).join();
      const lbl = a !== c && c ? `${(prevC.sch || []).join(', ') || 'lesson'} → ${(it.sch || []).join(', ')}` : '';
      seam = `<div class="seam" data-b="${it.id}"><div class="sl">${lbl ? `<span>${esc(lbl)}</span>` : ''}<button type="button" class="bb" data-act="bridge">Needs a bridge?</button></div><div class="sp"></div></div>`;
    }
    rows.push({ it, side: [], seam, prev: prevC });
    if (isContent(it)) prevC = it;
    if (it.t === 'h2') prevC = null;
  }
  let h = '';
  rows.forEach((r, i) => {
    const tc = r.it.tc && tab !== 'handout';
    const ptc = i > 0 && rows[i - 1].it.tc && tab !== 'handout', ntc = rows[i + 1] && rows[i + 1].it.tc && tab !== 'handout';
    const cls = ['row', 't-' + r.it.t, tc ? 'tc' : '', tc && !ptc ? 'first' : '', tc && !ntc ? 'last' : ''].filter(Boolean).join(' ');
    h += (tc && ptc ? '' : r.seam) + `<section class="${cls}" id="r-${r.it.id}" data-b="${r.it.id}"><div class="txt">${tc && !ptc ? `<div class="tclbl"><span>Teacher only, not in the Handout</span><span>${esc((r.it.refs || '').split(' ')[0] || '')}</span></div>` : ''}${r.it.h === '' && r.it.id === 'b0' ? '' : blockHTML(r.it, r.prev)}</div>
      <div class="side">${markable(r.it) && r.it.id !== 'b0' ? marksHTML(r.it) : ''}${r.side.join('')}<div class="nl"></div></div></section>`;
  });
  return h;
}
function filesHTML(d) {
  const groups = {}; (d.files || []).forEach(f => (groups[f.kind] = groups[f.kind] || []).push(f));
  const order = ['Teacher Copy', 'Handout', 'Master Copy', 'Main deck', 'Extra deck', 'QA deck', 'Deck preview', 'Tafseer', 'Flowchart', 'Audio reader', 'Comparison', 'Text', 'File'];
  const ks = Object.keys(groups).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return `<div class="files">${ks.length ? ks.map(k => `<div style="display:flex;flex-direction:column;gap:6px"><h3>${esc(k)}</h3>${groups[k].map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${ICON.dl}<span>${esc(f.name)}</span><small>${esc(f.path.split('/').slice(0, -1).join('/'))}</small></a>`).join('')}</div>`).join('')
    : '<p class="ui muted" style="direction:ltr;text-align:right">No files found for this lesson.</p>'}<p class="ui muted" style="direction:ltr;text-align:right;font-size:12px">Files open on GitHub, where you are signed in; decks and Word files download from there.</p></div>`;
}
function changesHTML(d) {
  return `<div class="chg">${(d.changes || []).map(g => `<div class="grp"><a href="${esc(g.url)}">${esc(g.name)}</a> · ${(g.items || []).length} changes</div>${(g.items || []).map(c => `<div class="c">${c.find ? `<span class="f">${esc(c.find)}</span>` : ''}${c.note ? `<span class="why">${esc(c.note)}</span>` : ''}${!c.find && !c.note ? `<span class="why">${esc(JSON.stringify(c))}</span>` : ''}</div>`).join('')}`).join('')}</div>`;
}

/* ---------- marks and my notes ---------- */
const TAGS = { keep: 'Keep', drop: 'Drop', maybe: 'Maybe', bridge: 'Needs a bridge', move: 'Move', key: 'Key' };
const mkey = bid => S.cur.key + '|' + bid;
function marksHTML(b) {
  const m = S.notes.marks[mkey(b.id)] || {};
  const p = (k, v) => (v === true ? !!m[k] : m[k] === v) ? 'true' : 'false';
  const hasSrc = /P\d+:\d/.test(JSON.stringify(b)) && ((S.cur.d.src && Object.keys(S.cur.d.src).length) || S.cur.d.srcf);
  return `<div class="marks${m.verdict || m.key || m.move != null ? ' set' : ''}">
    <button type="button" class="mk keep" data-act="v" data-v="keep" aria-pressed="${p('verdict', 'keep')}">Keep</button><button type="button" class="mk drop" data-act="v" data-v="drop" aria-pressed="${p('verdict', 'drop')}">Drop</button>
    <button type="button" class="mk maybe" data-act="v" data-v="maybe" aria-pressed="${p('verdict', 'maybe')}">Maybe</button><button type="button" class="mk key" data-act="key" aria-pressed="${p('key', true)}">Key</button>
    <button type="button" class="mk move" data-act="move" aria-pressed="${m.move != null}">Move</button><button type="button" class="mk" data-act="note">Note</button>
    ${hasSrc ? '<button type="button" class="mk src" data-act="src" aria-pressed="false">Source</button>' : ''}</div>
    ${m.move != null ? `<div class="mv">To: <input value="${esc(m.move)}" data-act="movein" placeholder="ZM B1 S12" aria-label="Move to"></div>` : ''}`;
}
function setMark(bid, f, cur) {
  cur = cur || S.cur; const id = cur.key + '|' + bid, old = S.notes.marks[id] || {}; const m = f(Object.assign({}, old));
  const live = m.verdict || m.key || m.bridge || m.move != null;
  if (live) S.notes.marks[id] = Object.assign(m, { lesson: cur.key, code: cur.d.code || cur.d.label, block: bid, updated: new Date().toISOString() });
  else { delete S.notes.marks[id]; GONE.add(id); }
  queueSave(); if (cur === S.cur) annotateAll(bid);
}
function unwrap(el) { $$('mark', el).forEach(m => m.replaceWith(...m.childNodes)); el.normalize(); }
function textNodes(el) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const a = []; while (w.nextNode()) a.push(w.currentNode); return a; }
function wrapRange(el, start, end, nid) {
  let pos = 0;
  for (const t of textNodes(el)) {
    const len = t.nodeValue.length, a = Math.max(start, pos), z = Math.min(end, pos + len);
    if (a < z) { const r = document.createRange(); r.setStart(t, a - pos); r.setEnd(t, z - pos); const mk = document.createElement('mark'); mk.dataset.n = nid; r.surroundContents(mk); return wrapRange(el, z, end, nid); }
    pos += len;
  }
}
function annotateAll(only) {
  if (!S.cur) return;
  const one = only && document.getElementById('r-' + only);
  (one ? [one] : $$('.row[data-b]')).forEach(row => {
    const bid = row.dataset.b, txt = $('.txt', row), nl = $('.nl', row);
    unwrap(txt);
    const mine = Object.entries(S.notes.notes).filter(([, n]) => n.lesson === S.cur.key && n.block === bid);
    for (const [id, n] of mine) { if (!n.quote) continue; const full = txt.textContent; let s = n.start, e = n.end; if (full.slice(s, e) !== n.quote) { s = full.indexOf(n.quote); e = s + n.quote.length; } if (s >= 0) wrapRange(txt, s, e, id); }
    const m = S.notes.marks[mkey(bid)] || {};
    row.classList.toggle('drop', m.verdict === 'drop'); row.classList.toggle('keep', m.verdict === 'keep');
    const mk = $('.marks', row);
    const b = (S.cur.d.items || []).concat((S.cur.d.handout || {}).items || []).find(x => x.id === bid);
    if (mk && b && !(document.activeElement && row.contains(document.activeElement) && document.activeElement.matches('input'))) { const tmp = document.createElement('div'); tmp.innerHTML = marksHTML(b); $$('.mv', row).forEach(x => x.parentNode.removeChild(x)); mk.replaceWith(...tmp.childNodes); }
    if (nl) renderMine(nl, mine);
    const seam = $(`.seam[data-b="${bid}"]`);
    if (seam) { seam.classList.toggle('on', !!m.bridge); const bb = $('.bb', seam); if (bb) bb.textContent = m.bridge ? 'A bridge is needed here' : 'Needs a bridge?'; }
  });
}
function renderMine(nl, mine) {
  const have = new Set(mine.map(([id]) => id));
  $$('.mcard.mine', nl).forEach(c => { if (!have.has(c.dataset.n)) c.remove(); });
  for (const [id, n] of mine) {
    let c = $(`.mcard.mine[data-n="${id}"]`, nl);
    if (!c) { c = document.createElement('div'); c.className = 'mcard mine'; c.dataset.n = id;
      c.innerHTML = `<span class="mh"><span>My note</span><button type="button" class="fold" data-act="fold"></button><span>${esc((n.created || '').slice(0, 10))}</span></span><span class="fs" data-act="fold"></span>${n.quote ? `<q data-act="jump">${esc(n.quote)}</q>` : ''}<textarea data-act="text" rows="2" placeholder="Write here" aria-label="Note"></textarea><div class="tags"></div>`;
      nl.append(c); }
    const ta = $('textarea', c); if (document.activeElement !== ta) { ta.value = n.text || ''; grow(ta); }
    c.classList.toggle('folded', !!n.folded); $('.fold', c).textContent = n.folded ? 'Open' : 'Fold'; $('.fs', c).textContent = n.folded ? ((n.text || n.quote || '').replace(/\s+/g, ' ').slice(0, 70) + ((n.text || n.quote || '').length > 70 ? '…' : '')) : '';
    $('.tags', c).innerHTML = Object.entries(TAGS).map(([t, l]) => `<button type="button" class="tag" data-act="tag" data-t="${t}" aria-pressed="${(n.tags || []).includes(t)}">${l}</button>`).join('') + '<button type="button" class="tag del" data-act="del">' + (ARMED[id] > Date.now() ? 'Sure? Press again' : 'Delete') + '</button>';
  }
}
function newNote(bid, c, tags, focus) {
  const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), now = new Date().toISOString();
  S.notes.notes[id] = { lesson: S.cur.key, code: S.cur.d.code || S.cur.d.label, block: bid, quote: c ? c.quote : '', start: c ? c.start : null, end: c ? c.end : null, refs: c ? c.refs : '', text: '', tags, created: now, updated: now };
  queueSave(); annotateAll(bid);
  if (focus) requestAnimationFrame(() => { const ta = $(`.mcard.mine[data-n="${id}"] textarea`); if (ta) ta.focus(); });
}

/* ---------- Persian source panel ---------- */
const REFRE = /((?:[\w.\-]+\/)?P\d+):(\d+)-(\d+)/g;
function parseRefs(r) { const o = []; let m; REFRE.lastIndex = 0; while ((m = REFRE.exec(r || ''))) o.push({ p: m[1], a: +m[2], b: +m[3] }); return o; }
function srcPassage(p, set, full) {
  const P = (S.cur.d.src || {})[p];
  if (!P) return `<div class="ps"><div class="ph"><code>${esc(p)}</code> not in this lesson's sources</div></div>`;
  const ns = Object.keys(P.s).map(Number).sort((a, b) => a - b), lo = Math.min(...set), hi = Math.max(...set);
  const shown = full ? ns : ns.filter(n => n >= lo - 1 && n <= hi + 1);
  return `<div class="ps" data-p="${esc(p)}"><div class="ph"><b style="color:var(--${P.sch})">${esc(SCH[P.sch] ? SCH[P.sch][1] : P.sch)}</b><code>${esc(P.code)} · ${esc(p)}${P.nukta ? ' · nukta ' + esc(P.nukta) : ''}</code><span class="ui" style="font-size:12px">${P.role === 'primary' ? 'Primary passage' : 'Supporting passage'}</span>
    <button type="button" class="full" data-act="full" data-p="${esc(p)}" data-set="${[...set].join(',')}" data-full="${full ? 1 : 0}">${full ? 'Only the lines used' : 'Whole passage'}</button></div>
    <div class="fa" lang="fa">${shown.map(n => `<p class="${set.has(n) ? 'ref' : ''}" data-pn="${esc(p)}:${n}"><span class="n">${n}</span><span>${esc(P.s[n])}</span></p>`).join('')}</div></div>`;
}
async function toggleSrc(row, refs) {
  const old = $('.srcbox', row); if (old && !refs) { old.remove(); return false; } if (old) old.remove();
  const cur = S.cur;
  if (!cur.d.src && cur.d.srcf) { // the Persian passages live in a sibling file, loaded on the first Source press
    row.insertAdjacentHTML('beforeend', '<div class="srcbox"><p class="ui muted" style="direction:ltr;text-align:right">Loading the Persian sources</p></div>');
    try { cur.d.src = await data(cur.key + '.src.json'); } catch (e) { const b = $('.srcbox', row); if (b) b.innerHTML = `<p class="ui muted" style="direction:ltr;text-align:right">The sources could not be loaded: ${esc(e.message)}</p>`; return true; }
    const w = $('.srcbox', row); if (w) w.remove();
    if (S.cur !== cur || !document.contains(row)) return false;
  }
  const want = new Map();
  (refs != null ? parseRefs(refs) : $$('.s', row).flatMap(s => parseRefs(s.dataset.r))).forEach(({ p, a, b }) => { const s = want.get(p) || new Set(); for (let i = a; i <= b; i++) s.add(i); want.set(p, s); });
  const box = document.createElement('div'); box.className = 'srcbox';
  box.innerHTML = [...want.entries()].map(([p, s]) => srcPassage(p, s, false)).join('') || '<p class="ui muted" style="direction:ltr;text-align:right">No source lines for this block.</p>';
  row.append(box); return true;
}

/* ---------- selection bar ---------- */
let selCtx = null, selT = 0;
const rowOf = n => { const el = n && (n.nodeType === 1 ? n : n.parentElement); return el && el.closest('.row[data-b]'); };
function readSel() {
  const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0), row = rowOf(r.startContainer); if (!row || rowOf(r.endContainer) !== row) return null;
  const txt = $('.txt', row); if (!txt.contains(r.startContainer) || !txt.contains(r.endContainer)) return null;
  const quote = r.toString(); if (!quote.trim()) return null;
  const pre = document.createRange(); pre.setStart(txt, 0); pre.setEnd(r.startContainer, r.startOffset);
  const start = pre.toString().length; const hit = $$('.s', txt).filter(s => r.intersectsNode(s));
  return { row, bid: row.dataset.b, quote, start, end: start + quote.length, refs: [...new Set(hit.flatMap(s => (s.dataset.r || '').split(' ').filter(Boolean)))].join(' ') };
}
document.addEventListener('selectionchange', () => { clearTimeout(selT); selT = setTimeout(() => {
  if (!S.cur || !$('.desk')) { $('#selbar').hidden = true; return; }
  selCtx = readSel(); const bar = $('#selbar');
  if (!selCtx) { bar.hidden = true; return; }
  bar.innerHTML = '<button type="button" class="pri" data-sa="note">Write a note</button>' + Object.entries({ keep: 'Keep', drop: 'Drop', maybe: 'Maybe', bridge: 'Needs a bridge', move: 'Move to another sabaq', key: 'Key' }).map(([k, l]) => `<button type="button" data-sa="${k}">${l}</button>`).join('') + (selCtx.refs ? '<button type="button" data-sa="src">Source</button>' : '');
  bar.hidden = false;
}, 180); });
$('#selbar').addEventListener('mousedown', e => e.preventDefault());
$('#selbar').addEventListener('click', e => {
  const a = e.target.closest('[data-sa]'); if (!a || !selCtx) return; const c = selCtx;
  if (!document.contains(c.row)) { $('#selbar').hidden = true; return; }
  if (a.dataset.sa === 'src') toggleSrc(c.row, c.refs); else newNote(c.bid, c, a.dataset.sa === 'note' ? [] : [a.dataset.sa], a.dataset.sa === 'note');
  getSelection().removeAllRanges(); $('#selbar').hidden = true;
});

/* ---------- clicks, typing ---------- */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]'); const row = e.target.closest('.row[data-b]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'more') { act.closest('.mcard').classList.remove('clip'); act.remove(); return; }
    if (a === 'answer') { const r = act.closest('.row[data-b]'); if (!r) { const it = (S.cur.d.items || []), qi = it.findIndex(x => x.qid === act.dataset.q); let b = 'b0'; for (let k = qi; k >= 0; k--) if (!SIDE_T.includes(it[k].t)) { b = it[k].id; break; } go(parse().seg, { b, ans: act.dataset.q }); return; } newNote(r ? r.dataset.b : 'b0', { quote: '', start: null, end: null, refs: '' }, ['answer:' + act.dataset.q], true); return; }
    if (a === 'bridge') { setMark(act.closest('.seam').dataset.b, m => Object.assign(m, { bridge: !m.bridge })); return; }
    if (a === 'full') { const ps = act.closest('.ps'); const set = new Set(act.dataset.set.split(',').map(Number)); ps.outerHTML = srcPassage(act.dataset.p, set, act.dataset.full !== '1'); return; }
    if (!row) return;
    const bid = row.dataset.b;
    if (a === 'v') return setMark(bid, m => Object.assign(m, { verdict: m.verdict === act.dataset.v ? null : act.dataset.v }));
    if (a === 'key') return setMark(bid, m => Object.assign(m, { key: !m.key }));
    if (a === 'move') return setMark(bid, m => Object.assign(m, { move: m.move != null ? null : '' }));
    if (a === 'note') return newNote(bid, null, [], true);
    if (a === 'src') { toggleSrc(row).then(on => { if (document.contains(act)) act.setAttribute('aria-pressed', on ? 'true' : 'false'); }); return; }
    const card = act.closest('.mcard.mine'); if (!card) return; const id = card.dataset.n, n = S.notes.notes[id]; if (!n) return;
    if (a === 'tag') { const t = act.dataset.t, tags = new Set(n.tags || []); tags.has(t) ? tags.delete(t) : tags.add(t); n.tags = [...tags]; n.updated = new Date().toISOString(); queueSave(); annotateAll(n.block); return; }
    if (a === 'fold') { n.folded = !n.folded; n.updated = new Date().toISOString(); queueSave(); annotateAll(n.block); return; }
    if (a === 'del') { if (ARMED[id] > Date.now()) { delete S.notes.notes[id]; delete ARMED[id]; GONE.add(id); queueSave(); annotateAll(n.block); } else { ARMED[id] = Date.now() + 3000; act.textContent = 'Sure? Press again'; setTimeout(() => { delete ARMED[id]; const c = $(`.mcard.mine[data-n="${id}"] .del`); if (c) c.textContent = 'Delete'; }, 3000); } return; }
    if (a === 'jump') { litNote(id); return; }
  }
  const lr = e.target.closest('.li[data-href]'); if (lr && !e.target.closest('a')) { location.hash = lr.dataset.href; return; }
  const mk = e.target.closest('mark[data-n]'); if (mk) { litNote(mk.dataset.n); return; }
  const s = e.target.closest('.s');
  if (s && getSelection().isCollapsed) {
    $$('.s.focus').forEach(x => x.classList.remove('focus')); s.classList.add('focus');
    const box = row && $('.srcbox', row);
    if (box) { $$('.fa p.lit', box).forEach(p => p.classList.remove('lit')); parseRefs(s.dataset.r).forEach(({ p, a, b }) => { for (let i = a; i <= b; i++) { const el = box.querySelector(`[data-pn="${CSS.escape(p + ':' + i)}"]`); if (el) el.classList.add('lit'); } }); }
  }
  if (row) focusRow(row);
});
document.addEventListener('mouseover', e => {
  const p = e.target.closest('.srcbox .fa p[data-pn]'); if (!p) return;
  const row = p.closest('.row'); $$('.s.lit', row).forEach(s => s.classList.remove('lit'));
  const i = p.dataset.pn.lastIndexOf(':'), pid = p.dataset.pn.slice(0, i), k = +p.dataset.pn.slice(i + 1);
  $$('.s', row).forEach(s => { if (parseRefs(s.dataset.r).some(r => r.p === pid && k >= r.a && k <= r.b)) s.classList.add('lit'); });
});
function litNote(id) { $$('mark.on,.mcard.mine.on').forEach(x => x.classList.remove('on')); $$(`mark[data-n="${id}"]`).forEach(x => x.classList.add('on')); const c = $(`.mcard.mine[data-n="${id}"]`); if (c) c.classList.add('on'); }
const typeT = {}, ARMED = {};
const grow = ta => { if (CSS.supports && CSS.supports('field-sizing', 'content')) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, innerHeight * 0.6) + 'px'; };
document.addEventListener('keydown', e => { const l = e.target.closest && e.target.closest('.li[data-href]'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = l.dataset.href; } });
document.addEventListener('click', e => { const b = e.target.closest('.rail [data-list]'); if (b && S.cur) { closeDrawer(); listPanel(b.dataset.list); } });
document.addEventListener('input', e => {
  const ta = e.target.closest('textarea[data-act=text]');
  if (ta) { grow(ta); const id = ta.closest('.mcard').dataset.n; clearTimeout(typeT[id]); const n = S.notes.notes[id]; if (n && n.text !== ta.value) { n.text = ta.value; n.updated = new Date().toISOString(); typeT[id] = setTimeout(queueSave, 400); } return; }
  const mv = e.target.closest('input[data-act=movein]');
  if (mv) { const bid = mv.closest('.row').dataset.b, cur = S.cur, k = 'mv' + cur.key + bid; clearTimeout(typeT[k]); typeT[k] = setTimeout(() => setMark(bid, m => Object.assign(m, { move: mv.value.trim() }), cur), 700); }
});

/* ---------- position, dock, panels, keys ---------- */
function focusRow(row) { $$('.row.cur').forEach(r => r.classList.remove('cur')); row.classList.add('cur'); S.curBlock = row.dataset.b; }
let io = null, curSec = -1;
/* ---------- audio: one <audio> element for the whole page, so two can never play at once ----------
   Every open or close raises AU.gen; a download that finishes after the owner moved on sees a stale gen and is dropped.
   The last lesson's audio stays in memory, so reopening it is instant, and the position of each lesson is remembered. */
const AU = { el: null, gen: 0, key: null, map: null, url: null, urlKey: null, cachedMap: null, ctl: null, lastB: null, savedAt: 0, follow: LS.get('follow', true), pos: LS.get('apos', {}) };
const fmtT = t => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function audioEl() {
  if (AU.el) return AU.el;
  const a = AU.el = new Audio(); a.preload = 'auto';
  const $p = id => document.getElementById(id);
  a.addEventListener('loadedmetadata', () => { const s = $p('aSeek'); if (s) s.max = a.duration || (AU.map && AU.map.dur) || 1; });
  a.addEventListener('play', () => { const b = $p('aPlay'); if (b) { b.textContent = 'Pause'; b.setAttribute('aria-label', 'Pause'); } if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing'; });
  a.addEventListener('pause', () => { const b = $p('aPlay'); if (b) { b.textContent = 'Play'; b.setAttribute('aria-label', 'Play'); } if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused'; savePos(); });
  a.addEventListener('ended', () => { if (AU.key) { delete AU.pos[AU.key]; LS.set('apos', AU.pos); } });
  a.addEventListener('timeupdate', () => {
    if (!AU.map || !AU.key) return;
    const t = a.currentTime, s = $p('aSeek'), tm = $p('aTime');
    if (s && document.activeElement !== s) s.value = t;
    if (tm) tm.textContent = `${fmtT(t)} / ${fmtT(a.duration || AU.map.dur)}`;
    if (Math.abs(t - AU.savedAt) > 10) savePos();
    sayBlock(segAt(t));
  });
  if (navigator.mediaSession) {
    const ms = navigator.mediaSession, h = (k, f) => { try { ms.setActionHandler(k, f); } catch (e) {} };
    h('play', () => { if (AU.map) a.play().catch(() => {}); }); h('pause', () => a.pause());
    h('seekbackward', () => { a.currentTime = Math.max(0, a.currentTime - 15); }); h('seekforward', () => { a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 15); });
  }
  return a;
}
function savePos() { if (!AU.key || !AU.el || !AU.map || AU.el.ended) return; AU.savedAt = AU.el.currentTime; AU.pos[AU.key] = Math.floor(AU.el.currentTime); LS.set('apos', AU.pos); }
function segAt(t) { // segments are in time order: binary search for the last one that started
  const sg = AU.map.seg; let lo = 0, hi = sg.length - 1, f = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (sg[m][0] <= t) { f = sg[m]; lo = m + 1; } else hi = m - 1; }
  return f && t < f[1] + 0.6 ? f[2] : null;
}
function sayBlock(b, force) {
  if (!b || (b === AU.lastB && !force)) return;
  AU.lastB = b; $$('.row.say').forEach(r => r.classList.toggle('say', false));
  const row = document.getElementById('r-' + b);
  if (row) { row.classList.add('say'); if (AU.follow && !force && AU.el && !AU.el.paused) row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
}
async function ghBlob(path, signal) {
  const r = await fetch(API(DATA) + path, { signal, headers: { Authorization: 'Bearer ' + getKey(), Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!r.ok) { const e = new Error(`GitHub answered ${r.status}`); e.status = r.status; throw e; }
  return r.blob();
}
function playerHTML(code) {
  const rate = +LS.get('rate', 1);
  return `<div class="player ui" id="player" role="region" aria-label="Audio player">
    <button type="button" class="pp" id="aPlay" aria-label="Play" disabled>Play</button><button type="button" id="aBack" title="Back 15 seconds" disabled>−15s</button><button type="button" id="aFwd" title="Forward 15 seconds" disabled>+15s</button>
    <button type="button" id="aHere" title="Play from the block you last clicked" disabled>From here</button>
    <input type="range" id="aSeek" min="0" max="1" step="0.1" value="0" aria-label="Position" disabled><span class="tm" id="aTime">${esc(code || '')}</span>
    <select id="aRate" aria-label="Speed">${[0.75, 1, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}"${r === rate ? ' selected' : ''}>${r}×</option>`).join('')}</select>
    <button type="button" id="aFollow" aria-pressed="${AU.follow}" title="Scroll with the reading">Follow</button>
    <button type="button" id="aClose" aria-label="Close the player">Close</button><span class="msg" id="aMsg" role="status"></span></div>`;
}
function closePlayer() {
  AU.gen++; if (AU.ctl) { AU.ctl.abort(); AU.ctl = null; }
  if (AU.el) { savePos(); AU.el.pause(); }
  AU.key = AU.map = AU.lastB = null;
  const p = $('#player'); if (p) p.parentNode.removeChild(p);
  $$('.row.say').forEach(r => r.classList.toggle('say', false)); document.body.classList.toggle('has-player', false);
  const bl = $('#bListen'); if (bl) bl.setAttribute('aria-pressed', 'false');
}
async function openPlayer() {
  const key = S.cur && S.cur.key, mp = key && S.audio[key]; if (!mp) return;
  const a = audioEl();
  if (AU.key === key && $('#player')) { if (AU.map) { if (a.paused) a.play().catch(() => {}); else a.pause(); } return; } // same lesson: Listen toggles; a press while loading does nothing
  closePlayer();
  const gen = ++AU.gen; AU.key = key;
  document.body.insertAdjacentHTML('beforeend', playerHTML(S.cur.d.code)); document.body.classList.add('has-player');
  const bl = $('#bListen'); if (bl) bl.setAttribute('aria-pressed', 'true');
  const msg = $('#aMsg');
  wirePlayer(a);
  try {
    let map;
    if (AU.urlKey === key && AU.url) map = AU.cachedMap;
    else {
      msg.textContent = 'Loading the audio';
      const ctl = AU.ctl = new AbortController();
      map = JSON.parse(await gh(mp, { signal: ctl.signal }, true, DATA));
      if (gen !== AU.gen) return;
      const blob = await ghBlob(map.src, ctl.signal);
      if (gen !== AU.gen) return;
      AU.ctl = null;
      a.removeAttribute('src');
      if (AU.url) URL.revokeObjectURL(AU.url);
      AU.url = URL.createObjectURL(blob); AU.urlKey = key; AU.cachedMap = map;
    }
    if (a.src !== AU.url) a.src = AU.url;
    AU.map = map; msg.textContent = map.stale ? 'This audio was read from an older version of the lesson, so the lit paragraph may be off.' : '';
    a.playbackRate = +LS.get('rate', 1);
    $$('#player button, #player input').forEach(x => { x.disabled = false; });
    const sk = $('#aSeek'); if (sk) sk.max = a.duration || map.dur || 1;
    const at = AU.pos[key] || 0;
    if (at > 5 && !map.stale) { a.currentTime = Math.max(0, at - 3); msg.textContent = `Carrying on from ${fmtT(at - 3)}, where you stopped.`; setTimeout(() => { if (gen === AU.gen && /^Carrying/.test(msg.textContent)) msg.textContent = ''; }, 4000); }
    else a.currentTime = 0;
    if (navigator.mediaSession && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: (S.cur.d.title || '').replace(/<[^>]+>/g, ''), artist: S.cur.d.code || '', album: 'Reading Mode' });
    await a.play().catch(() => { if (gen === AU.gen) msg.textContent = 'Press Play to start.'; });
  } catch (e) {
    if (gen !== AU.gen || e.name === 'AbortError') return;
    msg.textContent = 'The audio could not be loaded: ' + e.message + '. Press Listen to try again.';
    AU.key = null; AU.ctl = null;
  }
}
function wirePlayer(a) {
  $('#aPlay').onclick = () => { if (a.paused) a.play().catch(() => {}); else a.pause(); };
  $('#aBack').onclick = () => { a.currentTime = Math.max(0, a.currentTime - 15); };
  $('#aFwd').onclick = () => { a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 15); };
  $('#aRate').onchange = e => { a.playbackRate = +e.target.value; LS.set('rate', +e.target.value); };
  $('#aSeek').oninput = e => { a.currentTime = +e.target.value; };
  $('#aFollow').onclick = e => { AU.follow = !AU.follow; LS.set('follow', AU.follow); e.currentTarget.setAttribute('aria-pressed', AU.follow); };
  $('#aHere').onclick = () => {
    if (!AU.map) return;
    const ids = (S.cur.d.items || []).map(i => i.id); const from = Math.max(0, ids.indexOf(S.curBlock));
    const sg = AU.map.seg.find(x => x[2] && ids.indexOf(x[2]) >= from);
    if (sg) { a.currentTime = sg[0]; a.play().catch(() => {}); }
  };
  $('#aClose').onclick = closePlayer;
}
document.addEventListener('click', e => { if (e.target.closest('#bListen')) openPlayer(); });
addEventListener('pagehide', savePos);

function observe() {
  if (io) io.disconnect();
  let hs = $$('.row.t-h2').filter(r => $('.txt', r).textContent.trim()); if (hs.length < 2) hs = $$('.row.t-h2, .row.t-h3').filter(r => $('.txt', r).textContent.trim());
  const links = $$('.desk>.rail a[data-b]');
  const show = i => { curSec = i; const r = hs[i]; if (!r) return; links.forEach(l => l.classList.toggle('on', l.dataset.b === r.dataset.b));
    const now = $('#now'); if (now) now.innerHTML = `<span class="ui ltr">Section ${i + 1} of ${hs.length}</span><span class="t">${esc($('.txt', r).textContent.trim())}</span>`; };
  let raf = 0, lastI = -2;
  const spy = () => { raf = 0; if (!hs.length || !hs[0].isConnected) return; const tb = $('#top'), lim = (tb && getComputedStyle(tb).position !== 'static' ? tb.getBoundingClientRect().bottom : 0) + 140; let i = -1; for (let k = 0; k < hs.length; k++) { if (hs[k].getBoundingClientRect().top <= lim) i = k; else break; } if (i !== lastI) { lastI = i; if (i >= 0) show(i); else { curSec = -1; links.forEach(l => l.classList.remove('on')); const nw = $('#now'); if (nw) nw.innerHTML = `<span class="ui ltr">${hs.length} sections</span>`; } } };
  if (observe.off) observe.off();
  const onS = () => { if (!raf) raf = requestAnimationFrame(spy); }; addEventListener('scroll', onS, { passive: true }); observe.off = () => removeEventListener('scroll', onS);
  const now = $('#now'); if (now) now.innerHTML = hs.length ? `<span class="ui ltr">${hs.length} sections</span>` : '';
  const dp = $('#dPrev'), dn = $('#dNext'); if (dp) dp.disabled = !hs.length; if (dn) dn.disabled = !hs.length;
  requestAnimationFrame(spy);
  const step = d => { const i = Math.max(0, Math.min(hs.length - 1, curSec + d)); if (hs[i]) { hs[i].scrollIntoView({ block: 'start' }); lastI = i; show(i); } };
  const p = $('#dPrev'), n = $('#dNext'); if (p) p.onclick = () => step(-1); if (n) n.onclick = () => step(1);
  observe.step = step;
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') { const o = $$('.over'); if ($('#drawer') || o.length) { closeDrawer(); o.forEach(x => x.parentNode.removeChild(x)); return; } }
  if (e.key === ' ' && AU.map && AU.key && !e.target.closest('input,textarea,select,button,[contenteditable]')) { e.preventDefault(); if (AU.el.paused) AU.el.play().catch(() => {}); else AU.el.pause(); return; }
  if (e.target.closest('input,textarea,select,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || !S.cur || !$('.desk')) return;
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const a = $(e.key === 'ArrowLeft' ? '.ynav .yn[href]' : '.ynav .yp[href]'); if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); } return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); observe.step && observe.step(1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); observe.step && observe.step(-1); }
  if (e.key === 't' || e.key === 'T') openDrawer();
});
function listPanel(kind) {
  const items = S.cur.d.items || [];
  let rows = [];
  const near = it => { const i = items.indexOf(it); for (let k = i; k >= 0; k--) if (!SIDE_T.includes(items[k].t)) return items[k].id; return it.id; };
  if (kind === 'note') rows = items.filter(i => i.t === 'tnote').map((it, k) => ({ b: near(it), h: `<span class="ui muted" style="font-size:12px;direction:ltr;text-align:right">Editor note ${k + 1}</span><span style="font-size:15.5px;line-height:2.1">${it.h}</span>` }));
  if (kind === 'q') rows = items.filter(i => i.t === 'q').map(it => ({ b: near(it), h: `<span class="ui" style="font-size:13px;direction:ltr;text-align:left"><b>${esc(it.qid)}</b> ${esc(it.title)}</span>` }));
  if (kind === 'tc') rows = items.filter(i => i.tc && !SIDE_T.includes(i.t)).map(it => ({ b: it.id, h: `<span style="font-size:15.5px;line-height:2.1">${(it.s || []).map(s => s.h).join(' ').slice(0, 300) || (it.ar || []).join(' ') || it.h || ''}</span>` }));
  if (kind === 'mine') rows = Object.entries(S.notes.notes).filter(([, n]) => n.lesson === S.cur.key).map(([, n]) => ({ b: n.block, h: `${n.quote ? `<q style="font-size:14.5px;color:var(--faint)">${esc(n.quote)}</q>` : ''}<span style="unicode-bidi:plaintext">${esc(n.text || '(empty note)')}</span>` }));
  const title = { note: 'Editor notes', q: 'Open questions', tc: 'Teacher-only parts', mine: 'My notes here' }[kind];
  const o = document.createElement('div'); o.className = 'over';
  o.innerHTML = `<div class="pn" role="dialog" aria-label="${title}"><div style="display:flex;justify-content:space-between;align-items:center;direction:ltr"><h2>${title} · ${rows.length}</h2><button type="button" class="btn" data-close>Close</button></div>${rows.map(r => `<a class="it" href="${hash(parse().seg, Object.assign({}, S.cur.tab !== 'tc' ? { t: S.cur.tab } : {}, { b: r.b }))}">${r.h}</a>`).join('') || '<p class="ui muted">None.</p>'}</div>`;
  document.body.append(o);
  o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-close]') || e.target.closest('a')) o.remove(); });
}

/* ---------- my notes, across everything ---------- */
async function myNotes(live) {
  topBar({ crumbs: [{ t: 'My notes', ui: 1 }] });
  const q = parse().q;
  if (q.get('v') === 'q') {
    const c = S.index.courses.find(x => x.id === q.get('c')) || S.index.courses[0];
    let h = `<div class="page" style="max-width:1000px"><div class="shead"><h2>${c.code}: every open question</h2><span>Grouped by sabaq; open one to read it in place</span></div>`;
    const list = c.babs.flatMap(b => b.sabaq.filter(x => x.q).map(s => ({ b, s })));
    $('#view').innerHTML = '<div class="loading">Loading every open question</div>';
    const ds = await Promise.all(list.map(({ b, s }) => data(`${c.id}/B${b.n}/S${String(s.n).padStart(2, '0')}.json`))); if (live && !live()) return;
    for (const [k, { b, s }] of list.entries()) {
      const d = ds[k];
      h += `<div class="panel"><h3><a href="#${c.id}/${b.n}/${s.n}?t=questions">${c.code} B${b.n} S${s.n}</a> · ${s.q}</h3>${d.items.filter(i => i.t === 'q').map(i => `<a class="rowlink" href="#${c.id}/${b.n}/${s.n}?t=questions"><span>${esc(i.qid)} · ${esc(i.title)}</span></a>`).join('')}</div>`;
    }
    $('#view').innerHTML = h + '</div>'; return;
  }
  const ns = Object.entries(S.notes.notes).sort((a, b) => (b[1].updated || '').localeCompare(a[1].updated || ''));
  const ms = Object.entries(S.notes.marks).filter(([, m]) => m.verdict || m.key || m.bridge || m.move != null);
  const link = x => { const [a, b, c] = x.lesson.split('/'); const n = /^S\d+$/.test(c) ? +c.slice(1) : c; return `#${a}/${b.slice(1)}/${n}?b=${x.block}`; };
  $('#view').innerHTML = `<div class="page" style="max-width:1000px"><div class="shead"><h2>My notes</h2><span>${ns.length} notes, ${ms.length} marked blocks · saved in hub-notes (notes.json)</span></div>
    <div class="list">${ns.map(([, n]) => `<a class="li" href="${link(n)}"><span class="n">${esc(n.code || '')}</span><span class="t">${n.quote ? `<q style="color:var(--faint);font-size:15px">${esc(n.quote)}</q><br>` : ''}<span dir="auto" style="display:block;text-align:start">${esc(n.text || '(empty note)')}</span></span><span class="meta">${(n.tags || []).map(t => `<span class="pill off">${esc(TAGS[t] || (/^answer:/.test(t) ? 'Answer to ' + t.slice(7) : t))}</span>`).join('')}</span></a>`).join('') || '<p class="ui muted" style="padding:16px 22px">No notes yet. Select text in any lesson to write one.</p>'}</div>
    <div class="shead"><h2>Marked blocks</h2><span>Keep, Drop, Maybe, Key, Move, Needs a bridge</span></div>
    <div class="list">${ms.map(([, m]) => `<a class="li" href="${link(m)}"><span class="n">${esc(m.code || '')}</span><span class="t ui" style="font-size:13px;direction:ltr;text-align:right">${esc(m.block)}${m.move ? ' → ' + esc(m.move) : ''}</span><span class="meta">${[m.verdict, m.key && 'key', m.bridge && 'bridge', m.move != null && 'move'].filter(Boolean).map(t => `<span class="pill off">${esc(TAGS[t] || t)}</span>`).join('')}</span></a>`).join('') || '<p class="ui muted" style="padding:16px 22px">Nothing marked yet.</p>'}</div></div>`;
}

try { window.name = 'rm'; } catch (e) {} // the Work Map opens lessons in this same tab
if (getKey()) load(); else connect();
})();
