/*
 * Pastepad application.
 * The interface is built here at runtime; index.html only provides #app.
 *
 * SETUP: run this once in Supabase → SQL Editor
 *
 * create table pastes (
 *   id uuid primary key default gen_random_uuid(),
 *   title text not null default 'Untitled',
 *   content text not null default '',
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 *
 * alter table pastes enable row level security;
 * create policy "open access" on pastes for all using (true) with check (true);
 */

// CONFIG: paste your values from Supabase → Project Settings → API
const SUPABASE_URL = 'https://rinbpazntachmfqmwedo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbmJwYXpudGFjaG1mcW13ZWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjUzMDcsImV4cCI6MjEwMTg0MTMwN30.uD-XwXoUbhKs9sjm0u5qxiv5i4A53tL_eDOgeXpsAT0';

const $ = id => document.getElementById(id);

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(script);
  });
}

function renderApp() {
  const root = $('app');
  root.innerHTML = `
    <header>
      <input id="title" placeholder="Title (describe this paste)" aria-label="Title" maxlength="200">
      <button id="new" type="button">New</button>
      <button id="copy" type="button">Copy</button>
      <select id="export" aria-label="Export as">
        <option value="">Export…</option>
        <option>txt</option><option>js</option><option>mjs</option><option>html</option><option>css</option>
        <option>json</option><option>md</option><option>pdf</option><option>doc</option>
      </select>
      <button id="hist" type="button">History</button>
    </header>
    <main>
      <textarea id="editor" placeholder="Paste or type here…" spellcheck="false" autofocus></textarea>
      <aside id="side"><h2>History</h2><div id="msg"></div><ul id="list"></ul></aside>
    </main>
    <footer><span id="status">Ready</span><span id="count">0 chars</span></footer>
  `;
}

async function startApp() {
  renderApp();

  // Load the external libraries used by the original single-file version.
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  } catch (error) {
    const status = $('status');
    if (status) status.textContent = 'Library load failed: ' + error.message;
    return;
  }

  const configured = !SUPABASE_URL.includes('YOUR-PROJECT');
  const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  let currentId = null, timer = null, saving = false, dirty = false;

  const setStatus = s => $('status').textContent = s;
  const fmt = iso => new Date(iso).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const titleOf = () => $('title').value.trim() || 'Untitled';

  function updateCount(){ $('count').textContent = $('editor').value.length.toLocaleString() + ' chars'; }

  function queueSave(){
    dirty = true; updateCount();
    setStatus('Unsaved changes…');
    clearTimeout(timer);
    timer = setTimeout(save, 1000);
  }

  async function save(){
    if (!db) { setStatus('Add your Supabase URL and key to save'); return; }
    if (saving) { timer = setTimeout(save, 500); return; }
    const content = $('editor').value, title = titleOf();
    if (!currentId && !content.trim() && !$('title').value.trim()) { dirty = false; setStatus('Ready'); return; }
    saving = true; dirty = false; setStatus('Saving…');
    try {
      if (currentId) {
        const { error } = await db.from('pastes').update({ title, content, updated_at: new Date().toISOString() }).eq('id', currentId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from('pastes').insert({ title, content }).select('id').single();
        if (error) throw error;
        currentId = data.id;
      }
      setStatus('Saved ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
      loadHistory();
    } catch (e) {
      dirty = true; setStatus('Save failed: ' + (e.message || e));
    } finally { saving = false; }
  }

  async function loadHistory(){
    const list = $('list'), msg = $('msg');
    if (!db) { msg.textContent = 'Not connected. Set SUPABASE_URL and SUPABASE_ANON_KEY at the top of js/app.js.'; return; }
    const { data, error } = await db.from('pastes').select('id,title,updated_at').order('updated_at', { ascending: false }).limit(200);
    if (error) { msg.textContent = 'Could not load history: ' + error.message; return; }
    msg.textContent = data.length ? '' : 'Nothing saved yet. Paste some text and it saves automatically.';
    list.innerHTML = data.map(p => `
      <li data-id="${p.id}" tabindex="0" class="${p.id === currentId ? 'active' : ''}">
        <div class="info"><div class="t">${esc(p.title)}</div><div class="d">${fmt(p.updated_at)}</div></div>
        <button class="x" data-del="${p.id}" aria-label="Delete ${esc(p.title)}">✕</button>
      </li>`).join('');
  }

  async function openPaste(id){
    if (dirty) { clearTimeout(timer); await save(); }
    const { data, error } = await db.from('pastes').select('*').eq('id', id).single();
    if (error) { setStatus('Could not open: ' + error.message); return; }
    currentId = data.id;
    $('title').value = data.title === 'Untitled' ? '' : data.title;
    $('editor').value = data.content;
    updateCount(); setStatus('Opened'); loadHistory();
    if (innerWidth <= 700) $('side').classList.remove('open');
  }

  async function newPaste(){
    if (dirty) { clearTimeout(timer); await save(); }
    currentId = null; $('title').value = ''; $('editor').value = '';
    updateCount(); setStatus('Ready'); loadHistory(); $('editor').focus();
  }

  async function delPaste(id){
    if (!confirm('Delete this paste permanently?')) return;
    const { error } = await db.from('pastes').delete().eq('id', id);
    if (error) { setStatus('Delete failed: ' + error.message); return; }
    if (id === currentId) { currentId = null; $('title').value = ''; $('editor').value = ''; updateCount(); }
    setStatus('Deleted'); loadHistory();
  }

  // Export
  const MIME = { txt:'text/plain', js:'text/javascript', mjs:'text/javascript', html:'text/html', css:'text/css', json:'application/json', md:'text/markdown' };

  function download(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportAs(ext){
    const text = $('editor').value;
    const base = titleOf().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
    if (ext === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 48, w = pdf.internal.pageSize.getWidth() - margin * 2, h = pdf.internal.pageSize.getHeight() - margin;
      pdf.setFont('courier', 'normal'); pdf.setFontSize(10);
      let y = margin;
      for (const line of pdf.splitTextToSize(text.replace(/\t/g, '  '), w)) {
        if (y > h) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y); y += 13;
      }
      pdf.save(base + '.pdf');
    } else if (ext === 'doc') {
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(base)}</title></head><body><pre style="font-family:Consolas,monospace;font-size:10pt;white-space:pre-wrap">${esc(text)}</pre></body></html>`;
      download(new Blob([String.fromCharCode(0xFEFF), html], { type: 'application/msword' }), base + '.doc');
    } else {
      download(new Blob([text], { type: (MIME[ext] || 'text/plain') + ';charset=utf-8' }), base + '.' + ext);
    }
    setStatus('Exported .' + ext);
  }

  // Events
  $('editor').addEventListener('input', queueSave);
  $('title').addEventListener('input', queueSave);
  $('editor').addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });
  $('new').onclick = newPaste;
  $('hist').onclick = () => { $('side').classList.toggle('open'); if ($('side').classList.contains('open')) loadHistory(); };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText($('editor').value); setStatus('Copied'); }
    catch { $('editor').select(); document.execCommand('copy'); setStatus('Copied'); }
  };
  $('export').onchange = e => { if (e.target.value) exportAs(e.target.value); e.target.value = ''; };
  $('list').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); delPaste(del.dataset.del); return; }
    const li = e.target.closest('li'); if (li) openPaste(li.dataset.id);
  });
  $('list').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('li')) openPaste(e.target.dataset.id);
  });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  if (!configured) setStatus('Add your Supabase URL and key to save');
  if (innerWidth > 700) $('side').classList.add('open');
  loadHistory(); updateCount();
}

startApp();
