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
    <header class="app-header">
      <a class="brand" href="#" aria-label="Pastepad home">Paste<span>pad</span></a>
      <div class="header-actions">
        <input id="title" placeholder="Untitled paste" aria-label="Paste title" maxlength="200">
        <button id="new" type="button">New</button>
        <button id="copy" type="button">Copy</button>
        <select id="export" aria-label="Export as">
          <option value="">Export…</option>
          <option>txt</option><option>js</option><option>mjs</option><option>html</option><option>css</option>
          <option>json</option><option>md</option><option>pdf</option><option>doc</option>
        </select>
      </div>
      <nav class="primary-nav" aria-label="Main navigation">
        <button id="nav-editor" class="nav-button active" type="button">Editor</button>
        <button id="nav-history" class="nav-button" type="button" aria-expanded="false">History</button>
        <button id="nav-tools" class="nav-button" type="button">Tools</button>
      </nav>
    </header>
    <main id="main-view" class="view-editor">
      <section id="editor-pane" class="editor-pane">
        <div class="pane-label"><span>EDITOR</span><span class="hint">Your paste is saved automatically</span></div>
        <textarea id="editor" placeholder="Paste or type here…" spellcheck="false" autofocus></textarea>
      </section>
      <section id="tools-pane" class="tools-pane" hidden>
        <div class="tools-intro"><p class="eyebrow">WORKSPACE UTILITIES</p><h1>Tools</h1><p>Generate secure random strings or calculate a quick result.</p></div>
        <div class="tool-grid">
          <article class="tool-card generator-card">
            <div class="tool-heading"><div class="tool-icon">✳</div><div><h2>Random generator</h2><p>Create passwords, API tokens and random strings.</p></div></div>
            <label class="field-label" for="generator-preset">Preset</label>
            <select id="generator-preset" class="full-control"><option value="password">Strong password</option><option value="api">API key (hex)</option><option value="custom">Custom random string</option></select>
            <label class="field-label" for="generator-length">Length <output id="length-value">24</output></label>
            <input id="generator-length" class="range-control" type="range" min="8" max="128" value="24">
            <div class="check-grid">
              <label><input id="use-upper" type="checkbox" checked> Uppercase</label>
              <label><input id="use-lower" type="checkbox" checked> Lowercase</label>
              <label><input id="use-digits" type="checkbox" checked> Numbers</label>
              <label><input id="use-symbols" type="checkbox" checked> Symbols</label>
            </div>
            <div class="result-wrap"><input id="generator-result" type="text" readonly placeholder="Your generated value appears here"><button id="copy-generated" type="button" class="icon-button" aria-label="Copy generated value">Copy</button></div>
            <button id="generate" class="primary-button" type="button">Generate securely ↗</button>
            <p class="tool-note">Generated in your browser using the Web Crypto API. Nothing is sent to the server.</p>
          </article>
          <article class="tool-card calculator-card">
            <div class="tool-heading"><div class="tool-icon">＋</div><div><h2>Calculator</h2><p>Quick arithmetic with keyboard support.</p></div></div>
            <input id="calc-display" class="calc-display" type="text" inputmode="decimal" placeholder="0" aria-label="Calculator display">
            <div class="calc-keys">
              <button data-calc="clear" class="key-muted" type="button">AC</button><button data-calc="back" class="key-muted" type="button">⌫</button><button data-calc="(" type="button">(</button><button data-calc=")" type="button">)</button>
              <button data-calc="7" type="button">7</button><button data-calc="8" type="button">8</button><button data-calc="9" type="button">9</button><button data-calc="/" class="key-operator" type="button">÷</button>
              <button data-calc="4" type="button">4</button><button data-calc="5" type="button">5</button><button data-calc="6" type="button">6</button><button data-calc="*" class="key-operator" type="button">×</button>
              <button data-calc="1" type="button">1</button><button data-calc="2" type="button">2</button><button data-calc="3" type="button">3</button><button data-calc="-" class="key-operator" type="button">−</button>
              <button data-calc="0" type="button">0</button><button data-calc="." type="button">.</button><button data-calc="=" class="key-equals" type="button">=</button><button data-calc="+" class="key-operator" type="button">+</button>
            </div>
          </article>
        </div>
      </section>
      <aside id="side" class="history-drawer" aria-label="Paste history" aria-hidden="true">
        <div class="history-head"><div><p class="eyebrow">YOUR LIBRARY</p><h2>History</h2></div><button id="close-history" class="close-button" type="button" aria-label="Close history">✕</button></div>
        <div id="msg" class="history-message"></div><ul id="list"></ul>
      </aside>
      <button id="drawer-backdrop" class="drawer-backdrop" type="button" aria-label="Close history"></button>
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


  function switchView(view) {
    const tools = view === 'tools';
    $('editor-pane').hidden = tools;
    $('tools-pane').hidden = !tools;
    $('main-view').classList.toggle('view-tools', tools);
    $('main-view').classList.toggle('view-editor', !tools);
    $('nav-editor').classList.toggle('active', view === 'editor');
    $('nav-tools').classList.toggle('active', tools);
    if (view !== 'history') closeHistory();
    if (!tools && view === 'editor') $('editor').focus();
  }

  function openHistory() {
    $('side').classList.add('open');
    $('side').setAttribute('aria-hidden', 'false');
    $('drawer-backdrop').classList.add('visible');
    $('nav-history').classList.add('active');
    $('nav-history').setAttribute('aria-expanded', 'true');
    loadHistory();
  }
  function closeHistory() {
    $('side').classList.remove('open');
    $('side').setAttribute('aria-hidden', 'true');
    $('drawer-backdrop').classList.remove('visible');
    $('nav-history').classList.remove('active');
    $('nav-history').setAttribute('aria-expanded', 'false');
  }

  function secureRandomIndex(max) {
    const range = 0x100000000, limit = range - (range % max);
    const value = new Uint32Array(1);
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
  }
  function generateRandom() {
    const preset = $('generator-preset').value;
    const length = Number($('generator-length').value);
    let alphabet = '';
    if (preset === 'api') alphabet = '0123456789abcdef';
    else {
      if ($('use-upper').checked) alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if ($('use-lower').checked) alphabet += 'abcdefghijklmnopqrstuvwxyz';
      if ($('use-digits').checked) alphabet += '0123456789';
      if ($('use-symbols').checked) alphabet += '!@#$%^&*()-_=+[]{}:,.?';
    }
    if (!alphabet) { setStatus('Select at least one character set'); return; }
    let result = '';
    for (let i = 0; i < length; i++) result += alphabet[secureRandomIndex(alphabet.length)];
    $('generator-result').value = result;
    setStatus('Secure random value generated');
  }

  function evaluateExpression(source) {
    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g) || [];
    if (tokens.join('') !== source.replace(/\s+/g, '')) throw new Error('Invalid expression');
    let i = 0;
    function primary() {
      const t = tokens[i++];
      if (t === '+') return primary();
      if (t === '-') return -primary();
      if (t === '(') { const v = expression(); if (tokens[i++] !== ')') throw new Error('Missing )'); return v; }
      const n = Number(t);
      if (!t || !Number.isFinite(n)) throw new Error('Invalid number');
      return n;
    }
    function term() {
      let v = primary();
      while (tokens[i] === '*' || tokens[i] === '/') {
        const op = tokens[i++], rhs = primary();
        if (op === '/' && rhs === 0) throw new Error('Cannot divide by zero');
        v = op === '*' ? v * rhs : v / rhs;
      }
      return v;
    }
    function expression() {
      let v = term();
      while (tokens[i] === '+' || tokens[i] === '-') {
        const op = tokens[i++], rhs = term();
        v = op === '+' ? v + rhs : v - rhs;
      }
      return v;
    }
    if (!tokens.length) throw new Error('Enter a calculation');
    const result = expression();
    if (i !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation');
    return Number(result.toPrecision(12)).toString();
  }
  function calculate() {
    const display = $('calc-display');
    try { display.value = evaluateExpression(display.value); }
    catch (e) { setStatus(e.message); }
  }

  // Events
  $('editor').addEventListener('input', queueSave);
  $('title').addEventListener('input', queueSave);
  $('editor').addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });
  $('new').onclick = newPaste;
  $('nav-editor').onclick = () => switchView('editor');
  $('nav-tools').onclick = () => switchView('tools');
  $('nav-history').onclick = () => { if ($('side').classList.contains('open')) closeHistory(); else openHistory(); };
  $('close-history').onclick = closeHistory;
  $('drawer-backdrop').onclick = closeHistory;
  $('generate').onclick = generateRandom;
  $('generator-length').addEventListener('input', e => $('length-value').textContent = e.target.value);
  $('generator-preset').addEventListener('change', e => {
    const api = e.target.value === 'api';
    ['use-upper','use-lower','use-digits','use-symbols'].forEach(id => $(id).disabled = api);
    if (api) $('generator-length').value = 64;
    else if ($('generator-length').value === '64') $('generator-length').value = 24;
    $('length-value').textContent = $('generator-length').value;
  });
  $('copy-generated').onclick = async () => {
    const value = $('generator-result').value;
    if (!value) { setStatus('Generate a value first'); return; }
    try { await navigator.clipboard.writeText(value); setStatus('Generated value copied'); }
    catch { $('generator-result').select(); document.execCommand('copy'); setStatus('Generated value copied'); }
  };
  $('calc-display').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
  document.querySelector('.calc-keys').addEventListener('click', e => {
    const key = e.target.closest('[data-calc]')?.dataset.calc;
    if (!key) return;
    const display = $('calc-display');
    if (key === 'clear') display.value = '';
    else if (key === 'back') display.value = display.value.slice(0, -1);
    else if (key === '=') calculate();
    else display.value += key;
    display.focus();
  });

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
  closeHistory();
  loadHistory(); updateCount();
}

startApp();
