// ── State ──────────────────────────────────────────────────────────────────
let masterKey = null;
let vault     = null;
let filtered  = [];

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { salt } = await chrome.storage.local.get(['salt']);

  if (!salt) {
    showView('setup');
    bind();
    return;
  }

  // ── Session resume (browser still open, no need to re-enter password) ──
  try {
    const { sessionKey, sessionVault } = await chrome.storage.session.get(['sessionKey', 'sessionVault']);
    if (sessionKey && sessionVault) {
      masterKey = await importKey(sessionKey);
      vault     = JSON.parse(sessionVault);
      bind();
      showView('vault');
      await checkPendingSave(); // offer to save credentials captured by content script
      renderVault();
      return;
    }
  } catch(_) {
    await chrome.storage.session.remove(['sessionKey', 'sessionVault']);
  }

  showView('login');
  bind();
  setTimeout(() => document.getElementById('master-password').focus(), 80);
});

// ── View ───────────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + (type === 'error' ? 'e' : 'ok');
}

function clearMsg(id) {
  const el = document.getElementById(id);
  el.className   = 'msg';
  el.textContent = '';
}

// ── Bind events ────────────────────────────────────────────────────────────
function bind() {
  document.getElementById('unlock-btn').onclick = handleUnlock;
  document.getElementById('master-password').onkeydown = e => { if (e.key === 'Enter') handleUnlock(); };

  document.getElementById('setup-btn').onclick = handleSetup;
  document.getElementById('setup-confirm').onkeydown = e => { if (e.key === 'Enter') handleSetup(); };

  document.getElementById('lock-btn').onclick = handleLock;
  document.getElementById('toggle-add-btn').onclick = () => toggleAddForm();
  document.getElementById('cancel-btn').onclick     = () => toggleAddForm(false);
  document.getElementById('save-btn').onclick        = handleSave;
  document.getElementById('gen-btn').onclick         = handleGenPass;

  document.getElementById('search-input').oninput = e => {
    filtered = vault.credentials.filter(c =>
      c.site.toLowerCase().includes(e.target.value.toLowerCase()) ||
      c.username.toLowerCase().includes(e.target.value.toLowerCase())
    );
    renderList(filtered);
  };

  document.getElementById('add-pass').oninput = e => updateStrength(e.target.value);
}

// ── Session helpers ─────────────────────────────────────────────────────────
async function saveSession() {
  const key = await exportKey(masterKey);
  await chrome.storage.session.set({ sessionKey: key, sessionVault: JSON.stringify(vault) });
}

async function clearSession() {
  await chrome.storage.session.remove(['sessionKey', 'sessionVault', 'pendingSave']);
}

// ── Setup ──────────────────────────────────────────────────────────────────
async function handleSetup() {
  const pass    = document.getElementById('setup-pass').value;
  const confirm = document.getElementById('setup-confirm').value;

  if (!pass || pass.length < 8) { showMsg('setup-msg', 'Password must be at least 8 characters.', 'error'); return; }
  if (pass !== confirm)          { showMsg('setup-msg', 'Passwords do not match.', 'error'); return; }

  const btn = document.getElementById('setup-btn');
  btn.textContent = 'Creating…';
  clearMsg('setup-msg');

  try {
    const salt  = crypto.getRandomValues(new Uint8Array(16));
    masterKey   = await deriveKey(pass, salt);
    vault       = { credentials: [] };

    const encrypted = await encryptData(masterKey, vault);
    const saltB64   = btoa(String.fromCharCode(...salt));

    await chrome.storage.local.set({ salt: saltB64, encryptedVault: encrypted });
    await saveSession();
    await syncToServer(encrypted);

    showView('vault');
    renderVault();
  } catch(err) {
    showMsg('setup-msg', 'Error: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Create Vault';
  }
}

// ── Unlock ─────────────────────────────────────────────────────────────────
async function handleUnlock() {
  const pass = document.getElementById('master-password').value;
  if (!pass) return;

  const btn = document.getElementById('unlock-btn');
  btn.textContent = 'Unlocking…';
  clearMsg('login-msg');

  try {
    const { salt, encryptedVault } = await chrome.storage.local.get(['salt', 'encryptedVault']);
    const saltBytes = new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)));

    masterKey = await deriveKey(pass, saltBytes);

    if (encryptedVault) {
      vault = await decryptData(masterKey, encryptedVault);
    } else {
      await loadFromServer();
    }

    document.getElementById('master-password').value = '';
    await saveSession();          // ← persist session so popup won't ask again
    showView('vault');
    await checkPendingSave();     // offer to save any captured credential
    renderVault();
  } catch(err) {
    masterKey = null;
    showMsg('login-msg', 'Wrong password.', 'error');
  } finally {
    btn.textContent = 'Unlock Vault';
  }
}

// ── Lock ───────────────────────────────────────────────────────────────────
async function handleLock() {
  await clearSession();
  masterKey = null;
  vault     = null;
  clearMsg('login-msg');
  document.getElementById('master-password').value = '';
  showView('login');
  setTimeout(() => document.getElementById('master-password').focus(), 80);
}

// ── Pending save (from content script capture) ─────────────────────────────
async function checkPendingSave() {
  const { pendingSave } = await chrome.storage.session.get(['pendingSave']);
  if (!pendingSave) return;

  const { site, username, password } = pendingSave;

  // Check if it already exists
  const existingIndex = vault.credentials.findIndex(c => c.site === site && c.username === username);
  
  if (existingIndex !== -1) {
    const existing = vault.credentials[existingIndex];
    if (existing.password === password) {
      // Exactly the same, ignore
      await chrome.storage.session.remove(['pendingSave']);
      return;
    }
    // Same site/user but DIFFERENT password -> Offer Update
    showSaveBanner(site, username, password, true, existingIndex);
  } else {
    // New credential -> Offer Save
    showSaveBanner(site, username, password, false);
  }
}

function showSaveBanner(site, username, password, isUpdate = false, index = -1) {
  // Remove existing banner first
  document.getElementById('save-banner')?.remove();

  const banner = document.createElement('div');
  banner.id    = 'save-banner';
  banner.style.cssText = [
    'background:rgba(88,166,255,.12);border:1px solid rgba(88,166,255,.35)',
    'border-radius:10px;padding:12px 14px;margin-bottom:14px',
    'font-size:13px;display:flex;flex-direction:column;gap:10px'
  ].join(';');

  const title = isUpdate ? '🔄 Update password?' : '💾 Save to CRYPTA?';
  const btnText = isUpdate ? 'Update' : 'Save';

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;font-weight:600;color:#58a6ff">
      ${title}
    </div>
    <div style="color:#8b949e;font-size:12px">
      <strong style="color:#e6edf3">${escHtml(site)}</strong> · ${escHtml(username)}
    </div>
    <div style="display:flex;gap:8px">
      <button id="sb-yes" class="btn btn-p btn-sm" style="flex:1">${btnText}</button>
      <button id="sb-no"  class="btn btn-s btn-sm" style="flex:1">Ignore</button>
    </div>
  `;

  // Insert above credential list
  const section = document.querySelector('#view-vault .sec');
  section.before(banner);

  document.getElementById('sb-yes').onclick = async () => {
    if (isUpdate && index !== -1) {
      vault.credentials[index].password = password;
      vault.credentials[index].updatedAt = new Date().toISOString();
    } else {
      const cred = { id: genId(), site, username, password, createdAt: new Date().toISOString() };
      vault.credentials.unshift(cred);
    }
    
    await persistVault();
    await chrome.storage.session.remove(['pendingSave']);
    banner.remove();
    renderVault();
    setSyncStatus('ok');
  };

  document.getElementById('sb-no').onclick = async () => {
    await chrome.storage.session.remove(['pendingSave']);
    banner.remove();
  };
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderVault() {
  filtered = [...vault.credentials];
  document.getElementById('search-input').value = '';
  renderList(filtered);
}

function renderList(list) {
  const container = document.getElementById('cred-list');
  document.getElementById('cred-count').textContent = `(${vault.credentials.length})`;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty">No credentials found.<br>Add one above ☝️</div>';
    return;
  }

  container.innerHTML = list.map(c => `
    <div class="card" id="card-${c.id}">
      <div class="card-site">🌐 ${escHtml(c.site)}</div>
      <div class="card-user">${escHtml(c.username)}</div>
      <div class="card-acts" data-id="${c.id}" data-user="${escAttr(c.username)}">
        <button class="btn btn-s btn-sm btn-copy-user">Copy User</button>
        <button class="btn btn-s btn-sm btn-copy-pass">Copy Pass</button>
        <button class="btn btn-s btn-sm btn-fill">🪄 Fill</button>
        <button class="btn btn-d btn-sm btn-del">Delete</button>
      </div>
    </div>
  `).join('');
}

// ── Event Delegation for Credential List ───────────────────────────────────
document.getElementById('cred-list').addEventListener('click', async e => {
  const acts = e.target.closest('.card-acts');
  if (!acts) return;
  
  const id = acts.dataset.id;
  const user = acts.dataset.user;
  
  if (e.target.classList.contains('btn-copy-user')) {
    copyText(user, e.target);
  } else if (e.target.classList.contains('btn-copy-pass')) {
    copyPass(id, e.target);
  } else if (e.target.classList.contains('btn-fill')) {
    autofill(id);
  } else if (e.target.classList.contains('btn-del')) {
    deleteCred(id);
  }
});

// ── Add Form ───────────────────────────────────────────────────────────────
function toggleAddForm(open) {
  const form   = document.getElementById('add-form');
  const isOpen = typeof open === 'boolean' ? open : !form.classList.contains('open');
  form.classList.toggle('open', isOpen);
  document.getElementById('toggle-add-btn').textContent = isOpen ? '✕ Cancel' : '＋ Add Credential';

  if (isOpen) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.url) {
        try { document.getElementById('add-site').value = new URL(tabs[0].url).hostname; } catch(_) {}
      }
    });
  } else {
    clearAddForm();
  }
}

function clearAddForm() {
  ['add-site','add-user','add-pass'].forEach(id => { document.getElementById(id).value = ''; });
  clearMsg('add-msg');
  document.getElementById('str-bar').className = 'str';
}

async function handleSave() {
  const site = document.getElementById('add-site').value.trim();
  const user = document.getElementById('add-user').value.trim();
  const pass = document.getElementById('add-pass').value;

  if (!site || !user || !pass) { showMsg('add-msg', 'All fields are required.', 'error'); return; }

  vault.credentials.unshift({ id: genId(), site, username: user, password: pass, createdAt: new Date().toISOString() });
  await persistVault();
  toggleAddForm(false);
  renderVault();
}

// ── Delete ─────────────────────────────────────────────────────────────────
async function deleteCred(id) {
  if (!confirm('Delete this credential?')) return;
  vault.credentials = vault.credentials.filter(c => c.id !== id);
  await persistVault();
  renderVault();
}

// ── Copy ───────────────────────────────────────────────────────────────────
async function copyPass(id, btn) {
  const cred = vault.credentials.find(c => c.id === id);
  if (!cred) return;
  copyText(cred.password, btn);
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}

// ── Auto-fill ──────────────────────────────────────────────────────────────
async function autofill(id) {
  const cred = vault.credentials.find(c => c.id === id);
  if (!cred) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (username, password) => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const pwdEl = document.querySelector('input[type="password"]');
      if (!pwdEl) { alert('CRYPTA: No password field found.'); return; }

      const form    = pwdEl.closest('form') || document.body;
      const userEl  = form.querySelector(
        'input[type="email"],input[type="text"],input[name*="user" i],input[name*="email" i],input[name*="login" i],[autocomplete*="username" i]'
      );
      if (userEl) setVal(userEl, username);
      setVal(pwdEl, password);
    },
    args: [cred.username, cred.password]
  });

  window.close();
}

// ── Password Generator ─────────────────────────────────────────────────────
function handleGenPass() {
  const pass = generatePassword(20);
  const el   = document.getElementById('add-pass');
  el.type    = 'text';
  el.value   = pass;
  updateStrength(pass);
  setTimeout(() => { el.type = 'password'; }, 2500);
}

function updateStrength(pass) {
  const bar = document.getElementById('str-bar');
  if (!pass) { bar.className = 'str'; return; }
  let score = 0;
  if (pass.length >= 8)  score++;
  if (pass.length >= 14) score++;
  if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;
  bar.className = 'str ' + (score <= 1 ? 'w' : score <= 2 ? 'm' : 's');
}

// ── Persist & Sync ─────────────────────────────────────────────────────────
async function persistVault() {
  const encrypted = await encryptData(masterKey, vault);
  await chrome.storage.local.set({ encryptedVault: encrypted });
  await chrome.storage.session.set({ sessionVault: JSON.stringify(vault) }); // keep session fresh
  await syncToServer(encrypted);
}

async function syncToServer(encryptedVault) {
  setSyncStatus('syncing');
  try {
    let { device_id } = await chrome.storage.local.get(['device_id']);
    if (!device_id) {
      device_id = crypto.randomUUID();
      await chrome.storage.local.set({ device_id });
    }
    const resp = await fetch('http://localhost:3000/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ device_id, content: JSON.stringify(encryptedVault) })
    });
    setSyncStatus(resp.ok ? 'ok' : 'err');
  } catch(_) {
    setSyncStatus('err');
  }
}

async function loadFromServer() {
  try {
    const { device_id } = await chrome.storage.local.get(['device_id']);
    if (!device_id) return;
    const resp = await fetch(`http://localhost:3000/vault/${device_id}`);
    if (!resp.ok) return;
    const data    = await resp.json();
    const encObj  = JSON.parse(data.content);
    vault         = await decryptData(masterKey, encObj);
    await chrome.storage.local.set({ encryptedVault: encObj });
  } catch(_) {
    vault = { credentials: [] };
  }
}

function setSyncStatus(state) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-lbl');
  dot.className  = 'dot' + (state === 'err' ? ' err' : state === 'syncing' ? ' sync' : '');
  lbl.textContent = state === 'ok' ? 'Synced' : state === 'syncing' ? 'Syncing…' : 'Offline';
}

// ── Utils ──────────────────────────────────────────────────────────────────
function genId()      { return crypto.randomUUID(); }
function escHtml(s)   { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s)   { return s.replace(/'/g, "\\'"); }
