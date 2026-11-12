/* Comments for the Bab 1 planning menu. Select text (or use a section's button) to comment; tags Keep, Drop, Maybe,
   Question. Saved to plan-b1-notes.json in the private repo hub-notes with the same GitHub key as Reading Mode (one key
   per browser on this site); without a key, kept in this browser only until one is connected. */
(function () {
'use strict';
const ME = document.currentScript, CFG = (ME && ME.dataset) || {};
const OWNER = 'alimuqaddasm', REPO = 'hub-notes', FILE = CFG.file || 'plan-b1-notes.json', KEY = 'workmap.key', LOCAL = CFG.local || 'rmplan.comments', LABEL = CFG.label || 'Bab 1 planning menu';
const TAGS = { keep: 'Keep', drop: 'Drop', maybe: 'Maybe', q: 'Question' };
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const setKey = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };
const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const sheet = $('.sheet');
let C = {}, sha = null, remote = false, dirty = false, saving = false, saveT = 0;
const GONE = new Set();

/* blocks: every paragraph, list item, table cell and heading of the menu, numbered in reading order */
const blocks = $$('p, li, th, td, h1, h2, h3', sheet).filter(b => !b.closest('.cbox') && !b.querySelector('p, li'));
blocks.forEach((b, i) => { b.dataset.b = i; });
const sectionOf = b => { let id = ''; for (const h of $$('h1[id], h2[id], h3[id]', sheet)) { if (h.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) break; id = h.id; } return id; };
const secTitle = id => { const h = id && document.getElementById(id); return h ? h.textContent.trim() : 'Top of the menu'; };

/* ---------- storage ---------- */
function setSave(t) { $('#cSave').textContent = t; }
function localLoad() { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}'); } catch (e) { return {}; } }
function localSave() { try { localStorage.setItem(LOCAL, JSON.stringify(C)); } catch (e) {} }
async function gh(opts) {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`, Object.assign({ cache: 'no-cache', headers: { Authorization: 'Bearer ' + getKey(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' } }, opts || {}));
  if (!r.ok) { const e = new Error('GitHub answered ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
async function load() {
  C = localLoad();
  if (!getKey()) { remote = false; banner(true); render(); setSave('This browser only'); return; }
  try {
    let j = null; try { j = await gh(); } catch (e) { if (e.status !== 404) throw e; }
    const theirs = j ? JSON.parse(b64dec(j.content)).comments || {} : {}; sha = j ? j.sha : null;
    const mine = C; C = theirs;
    for (const [id, v] of Object.entries(mine)) if (!C[id] || (v.updated || '') > (C[id].updated || '')) { C[id] = v; dirty = true; }
    remote = true; banner(false); render(); setSave('Saved to your hub');
    if (dirty) queue(); else { try { localStorage.removeItem(LOCAL); } catch (e) {} }
  } catch (e) {
    remote = false; render(); banner(true, e.status === 401 || e.status === 404 ? 'The key could not open hub-notes. Paste a key with access to hub-notes.' : 'GitHub could not be reached; comments are kept in this browser for now.');
    setSave('This browser only');
  }
}
function queue() { dirty = true; localSave(); if (!remote) { setSave('This browser only'); return; } setSave('Saving'); clearTimeout(saveT); saveT = setTimeout(flush, 1000); }
async function flush() {
  if (saving || !dirty || !remote) return; saving = true; dirty = false;
  const body = s => JSON.stringify({ message: 'Comments: ' + LABEL, content: b64enc(JSON.stringify({ page: location.pathname, label: LABEL, comments: C }, null, 1) + '\n'), sha: s || undefined, branch: 'main' });
  try {
    let r;
    try { r = await gh({ method: 'PUT', body: body(sha) }); }
    catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      const j = await gh(); const theirs = JSON.parse(b64dec(j.content)).comments || {};
      for (const [id, v] of Object.entries(theirs)) { if (GONE.has(id)) continue; if (!C[id] || (v.updated || '') > (C[id].updated || '')) C[id] = v; }
      render(); r = await gh({ method: 'PUT', body: body(j.sha) });
    }
    sha = r.content.sha; setSave('Saved to your hub'); try { localStorage.removeItem(LOCAL); } catch (e) {}
  } catch (e) { dirty = true; setSave(e.status === 403 ? 'Not saved: the key can read but not write' : 'Not saved, will retry'); if (e.status !== 403) setTimeout(flush, 15000); }
  finally { saving = false; if (dirty) { clearTimeout(saveT); saveT = setTimeout(flush, 1500); } }
}
addEventListener('beforeunload', e => { if (dirty || saving) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- key banner ---------- */
function banner(show, msg) {
  let b = $('#cBanner');
  if (!show) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('div'); b.id = 'cBanner'; b.className = 'cbanner';
    b.innerHTML = `<p><b>Comments are kept in this browser only.</b> To save them to your private hub (where Claude can read them), connect the same GitHub key you use for Reading Mode. If Reading Mode already works in this browser, just reload this page.</p>
      <p class="err" id="cErr" hidden></p><form id="cKeyForm"><label for="cKey">GitHub key</label><input id="cKey" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_"><button class="btn" type="submit">Connect</button></form>`;
    sheet.prepend(b);
    $('#cKeyForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#cKey').value.trim(); if (!v) return; setKey(v); $('#cKey').value = ''; load(); });
  }
  const er = $('#cErr'); er.hidden = !msg; er.textContent = msg || '';
}

/* ---------- drawing comments ---------- */
function unwrap(el) { $$('mark.cm', el).forEach(m => m.replaceWith(...m.childNodes)); el.normalize(); }
function textNodes(el) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.cbox') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); const a = []; while (w.nextNode()) a.push(w.currentNode); return a; }
function wrapRange(el, start, end, id) {
  let pos = 0;
  for (const t of textNodes(el)) {
    const len = t.nodeValue.length, a = Math.max(start, pos), z = Math.min(end, pos + len);
    if (a < z) { const r = document.createRange(); r.setStart(t, a - pos); r.setEnd(t, z - pos); const m = document.createElement('mark'); m.className = 'cm'; m.dataset.c = id; r.surroundContents(m); return wrapRange(el, z, end, id); }
    pos += len;
  }
}
function anchorOf(c) { return blocks[c.block] || (c.section && document.getElementById(c.section)) || null; }
function slotAfter(el) {   // comments go after the paragraph, item, table or heading they belong to
  const host = el.closest('.tw') || el.closest('li') || el;
  let s = host.nextElementSibling;
  if (!s || !s.classList.contains('cslot')) { s = document.createElement('div'); s.className = 'cslot'; host.after(s); }
  return s;
}
function render() {
  $$('.cslot').forEach(s => s.remove()); blocks.forEach(unwrap);
  const list = Object.entries(C).sort((a, b) => (a[1].block - b[1].block) || ((a[1].start || 0) - (b[1].start || 0)));
  for (const [id, c] of list) {
    const el = anchorOf(c); if (!el) continue;
    if (c.quote) { const full = el.textContent; let s = c.start, e = c.end; if (full.slice(s, e) !== c.quote) { s = full.indexOf(c.quote); e = s + c.quote.length; } if (s >= 0) wrapRange(el, s, e, id); }
    const box = document.createElement('div'); box.className = 'cbox'; box.dataset.c = id;
    box.innerHTML = `${c.quote ? `<q>${esc(c.quote.slice(0, 300))}</q>` : `<span class="csec">On the section: ${esc(secTitle(c.section))}</span>`}
      <textarea rows="2" placeholder="Write your comment" aria-label="Comment"></textarea>
      <div class="cf">${Object.entries(TAGS).map(([k, v]) => `<button type="button" class="tg${(c.tags || []).includes(k) ? ' on' : ''}" data-t="${k}">${v}</button>`).join('')}<button type="button" class="del">Delete</button></div>`;
    $('textarea', box).value = c.text || '';
    slotAfter(el).append(box);
  }
  count();
}
function count() { const n = Object.keys(C).length; $('#bC').textContent = n ? `Comments (${n})` : 'Comments'; }
const nid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function add(c, focus) {
  const id = nid(), now = new Date().toISOString();
  C[id] = Object.assign({ text: '', tags: [], created: now, updated: now }, c);
  render(); queue();
  if (focus) requestAnimationFrame(() => { const t = $(`.cbox[data-c="${id}"] textarea`); if (t) { t.focus(); t.closest('.cbox').scrollIntoView({ block: 'nearest' }); } });
}

/* ---------- selecting text ---------- */
const bar = document.createElement('div'); bar.className = 'cbar'; bar.hidden = true;
bar.innerHTML = `<button type="button" class="pri" data-a="note">Comment</button>${Object.entries(TAGS).map(([k, v]) => `<button type="button" data-a="${k}">${v}</button>`).join('')}`;
document.body.append(bar);
let sel = null;
function readSel() {
  const s = getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null;
  const r = s.getRangeAt(0); const el = (n => (n.nodeType === 1 ? n : n.parentElement))(r.startContainer).closest('[data-b]');
  const el2 = (n => (n.nodeType === 1 ? n : n.parentElement))(r.endContainer).closest('[data-b]');
  if (!el || el !== el2 || el.closest('.cbox')) return null;
  const quote = r.toString(); if (!quote.trim()) return null;
  const pre = document.createRange(); pre.setStart(el, 0); pre.setEnd(r.startContainer, r.startOffset);
  const start = pre.toString().length;
  return { el, rect: r.getBoundingClientRect(), c: { block: +el.dataset.b, section: sectionOf(el), quote, start, end: start + quote.length } };
}
let selT = 0;
document.addEventListener('selectionchange', () => { clearTimeout(selT); selT = setTimeout(() => {
  sel = readSel(); if (!sel) { bar.hidden = true; return; }
  bar.hidden = false;
  const top = Math.max(70, sel.rect.top - bar.offsetHeight - 8), left = Math.min(innerWidth - bar.offsetWidth - 12, Math.max(12, sel.rect.left));
  bar.style.top = top + 'px'; bar.style.left = left + 'px';
}, 160); });
bar.addEventListener('mousedown', e => e.preventDefault());
bar.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a || !sel) return; add(Object.assign({}, sel.c, { tags: a.dataset.a === 'note' ? [] : [a.dataset.a] }), a.dataset.a === 'note'); getSelection().removeAllRanges(); bar.hidden = true; });

/* ---------- section buttons ---------- */
$$(CFG.heads || 'h2[id], h3[id]', sheet).forEach(h => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'secbtn'; b.textContent = 'Comment on this section'; b.dataset.s = h.id;
  h.after(b);
});
sheet.addEventListener('click', e => {
  const sb = e.target.closest('.secbtn'); if (sb) { const h = document.getElementById(sb.dataset.s); add({ block: +h.dataset.b, section: sb.dataset.s, quote: '', start: null, end: null }, true); return; }
  const box = e.target.closest('.cbox'); if (!box) { const m = e.target.closest('mark.cm'); if (m) { const b = $(`.cbox[data-c="${m.dataset.c}"]`); if (b) { b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1500); b.scrollIntoView({ block: 'nearest' }); } } return; }
  const id = box.dataset.c, c = C[id]; if (!c) return;
  const tg = e.target.closest('.tg');
  if (tg) { const t = new Set(c.tags || []); t.has(tg.dataset.t) ? t.delete(tg.dataset.t) : t.add(tg.dataset.t); c.tags = [...t]; c.updated = new Date().toISOString(); tg.classList.toggle('on'); queue(); return; }
  const del = e.target.closest('.del');
  if (del) { if (del.dataset.sure) { delete C[id]; GONE.add(id); render(); queue(); } else { del.dataset.sure = '1'; del.textContent = 'Sure? Press again'; setTimeout(() => { delete del.dataset.sure; del.textContent = 'Delete'; }, 3000); } }
});
const typeT = {};
sheet.addEventListener('input', e => { const t = e.target.closest('.cbox textarea'); if (!t) return; const id = t.closest('.cbox').dataset.c; clearTimeout(typeT[id]); typeT[id] = setTimeout(() => { if (C[id] && C[id].text !== t.value) { C[id].text = t.value; C[id].updated = new Date().toISOString(); queue(); } }, 600); });
sheet.addEventListener('focusout', e => { const t = e.target.closest && e.target.closest('.cbox textarea'); if (!t) return; const id = t.closest('.cbox').dataset.c; clearTimeout(typeT[id]); if (C[id] && C[id].text !== t.value) { C[id].text = t.value; C[id].updated = new Date().toISOString(); queue(); } });

/* ---------- all comments panel ---------- */
const panel = document.createElement('div'); panel.className = 'cover'; panel.hidden = true; document.body.append(panel);
function md() {
  let out = '# Comments on the ' + LABEL + '\n', last = null;
  for (const c of Object.values(C).sort((a, b) => a.block - b.block)) {
    const s = secTitle(c.section); if (s !== last) { out += `\n## ${s}\n`; last = s; }
    const t = (c.tags || []).map(x => TAGS[x]).join(', ');
    out += `- ${t ? '[' + t + '] ' : ''}${c.quote ? '«' + c.quote.replace(/\s+/g, ' ') + '» ' : '(whole section) '}\n`;
    if (c.text) out += '  ' + c.text.replace(/\n/g, '\n  ') + '\n';
  }
  return out.trim() + '\n';
}
function openPanel() {
  const list = Object.entries(C).sort((a, b) => a[1].block - b[1].block);
  let h = `<div class="cpanel" role="dialog" aria-label="All comments"><div class="ch"><b>All comments (${list.length})</b><span class="sp"></span><button class="btn" type="button" data-x="copy">Copy all</button><button class="btn" type="button" data-x="close">Close</button></div>`;
  if (!list.length) h += '<p class="muted">No comments yet. Select any text in the menu and press «Comment», or use «Comment on this section» under a heading.</p>';
  let last = null;
  for (const [id, c] of list) {
    const s = secTitle(c.section); if (s !== last) { h += `<h4>${esc(s)}</h4>`; last = s; }
    h += `<button type="button" class="ci" data-go="${id}"><span class="tgs">${(c.tags || []).map(x => `<span>${TAGS[x]}</span>`).join('')}</span>${c.quote ? `<q>${esc(c.quote.slice(0, 160))}</q>` : '<span class="muted">Whole section</span>'}${c.text ? `<span class="tx">${esc(c.text)}</span>` : ''}</button>`;
  }
  panel.innerHTML = h + '</div>'; panel.hidden = false;
}
$('#bC').addEventListener('click', openPanel);
panel.addEventListener('click', async e => {
  if (e.target === panel || e.target.closest('[data-x="close"]')) { panel.hidden = true; return; }
  const cp = e.target.closest('[data-x="copy"]');
  if (cp) { const t = md(); try { await navigator.clipboard.writeText(t); cp.textContent = 'Copied'; } catch (er) { const ta = document.createElement('textarea'); ta.className = 'cdump'; ta.value = t; panel.firstChild.append(ta); ta.select(); cp.textContent = 'Select and copy below'; } return; }
  const go = e.target.closest('[data-go]');
  if (go) { panel.hidden = true; const b = $(`.cbox[data-c="${go.dataset.go}"]`); if (b) { b.scrollIntoView({ block: 'center' }); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1500); } }
});
addEventListener('keydown', e => { if (e.key === 'Escape') { panel.hidden = true; bar.hidden = true; } });

load();
})();
