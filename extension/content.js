// content.js — RustVault: auto-fill, auto-save, registration password generator

// ── Visual marker on password fields ──────────────────────────────────────
function markFields() {
  document.querySelectorAll('input[type="password"]:not([data-rv])').forEach(f => {
    f.dataset.rv   = 'true';
    f.style.boxShadow = 'inset 0 0 0 2px rgba(88,166,255,.5)';
    f.title        = 'RustVault active';
  });
}
markFields();
new MutationObserver(markFields).observe(document.body, { childList: true, subtree: true });

// ── Detect page type and act ───────────────────────────────────────────────
function init() {
  const pwdFields = document.querySelectorAll('input[type="password"]');
  if (pwdFields.length === 0) return;

  if (pwdFields.length >= 2) {
    // Registration form: 2+ password fields (password + confirm)
    offerPasswordGeneration(pwdFields);
  } else {
    // Login form: 1 password field
    offerAutoFill(pwdFields[0]);
  }
}

// Wait for DOM to settle
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 600);
}

// ── Auto-fill on login pages ───────────────────────────────────────────────
function offerAutoFill(pwdField) {
  chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS', site: window.location.hostname }, res => {
    if (chrome.runtime.lastError || !res?.credentials?.length) return;
    showFillBanner(res.credentials, pwdField);
  });
}

function showFillBanner(credentials, pwdField) {
  if (document.getElementById('rv-fill-banner')) return;

  injectStyles();

  const banner  = document.createElement('div');
  banner.id     = 'rv-fill-banner';
  banner.className = 'rv-banner';

  // Build options if multiple credentials match
  const options = credentials.map((c, i) =>
    `<option value="${i}">${escHtml(c.username)}</option>`
  ).join('');

  banner.innerHTML = `
    <span style="font-size:20px;color:#a80000;text-shadow:0 0 10px rgba(168,0,0,.5)">⏣</span>
    <span style="flex:1;font-size:12px;color:#d1d1d1;letter-spacing:1px;text-transform:uppercase">
      <strong style="font-family:'Cinzel',serif;font-size:14px;color:#fff;letter-spacing:2px">RustVault</strong><br>FILL AS:
      ${credentials.length > 1
        ? `<select id="rv-user-sel" class="rv-select">${options}</select>`
        : `<strong style="color:#a80000">${escHtml(credentials[0].username)}</strong>`
      }
    </span>
    <button id="rv-fill-yes" class="rv-btn rv-btn-p">INVOKE</button>
    <button id="rv-fill-no"  class="rv-btn rv-btn-s">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('rv-fill-yes').onclick = () => {
    const idx  = document.getElementById('rv-user-sel')?.value ?? 0;
    const cred = credentials[parseInt(idx, 10)];
    fillCredential(cred.username, cred.password, pwdField);
    banner.remove();
  };
  document.getElementById('rv-fill-no').onclick = () => banner.remove();

  // Auto-dismiss after 8 seconds
  setTimeout(() => banner.remove(), 8000);
}

function fillCredential(username, password, pwdField) {
  const setVal = (el, val) => {
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, val);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  };

  const form   = pwdField.closest('form') || document.body;
  const userEl = form.querySelector(
    'input[type="email"],input[type="text"],input[name*="user" i],input[name*="email" i],input[name*="login" i],[autocomplete*="username" i]'
  );
  if (userEl) setVal(userEl, username);
  setVal(pwdField, password);
}

// ── Password generator on registration forms ───────────────────────────────
function offerPasswordGeneration(pwdFields) {
  if (document.getElementById('rv-gen-banner')) return;

  injectStyles();

  const banner  = document.createElement('div');
  banner.id     = 'rv-gen-banner';
  banner.className = 'rv-banner';
  banner.innerHTML = `
    <span style="font-size:20px;color:#a80000;text-shadow:0 0 10px rgba(168,0,0,.5)">◬</span>
    <span style="flex:1;font-size:12px;color:#d1d1d1;letter-spacing:1px;text-transform:uppercase">
      <strong style="font-family:'Cinzel',serif;font-size:14px;color:#fff;letter-spacing:2px">RustVault</strong><br>FORGE A NEW CIPHER?
    </span>
    <button id="rv-gen-yes" class="rv-btn rv-btn-p">FORGE</button>
    <button id="rv-gen-no"  class="rv-btn rv-btn-s">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('rv-gen-yes').onclick = () => {
    const chars    = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_';
    const randArr  = crypto.getRandomValues(new Uint8Array(20));
    const password = Array.from(randArr).map(b => chars[b % chars.length]).join('');

    const setVal = (el, val) => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, val);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    pwdFields.forEach(f => setVal(f, password));

    // Try to grab the username from the page
    const form   = pwdFields[0].closest('form') || document.body;
    const userEl = form.querySelector('input[type="email"],input[type="text"],input[name*="user" i],input[name*="email" i]');
    const username = userEl ? userEl.value : '';

    // Send to background so popup can offer to save
    chrome.runtime.sendMessage({
      action: 'OFFER_SAVE',
      site:   window.location.hostname,
      username,
      password
    });

    // Show the generated password briefly
    showGeneratedPass(password, banner);
  };

  document.getElementById('rv-gen-no').onclick = () => banner.remove();
}

function showGeneratedPass(password, banner) {
  banner.innerHTML = `
    <span style="font-size:20px;color:#4a5c4a;text-shadow:0 0 10px rgba(74,92,74,.5)">⌖</span>
    <span style="flex:1;font-size:12px;color:#a80000;font-family:'JetBrains Mono',monospace;word-break:break-all">${escHtml(password)}</span>
    <span style="font-size:10px;color:#707070;text-transform:uppercase">INSCRIBED TO THE MONOLITH</span>
    <button id="rv-gen-close" class="rv-btn rv-btn-s">✕</button>
  `;
  document.getElementById('rv-gen-close').onclick = () => banner.remove();
  setTimeout(() => banner?.remove(), 10000);
}

// ── Auto-save on login form submission (React/SPA fallback) ────────────────
function captureAndSend(formOrContainer) {
  if (!formOrContainer) return;
  const pwdEl  = formOrContainer.querySelector('input[type="password"]');
  const userEl = formOrContainer.querySelector('input[type="email"],input[type="text"],input[name*="user" i],input[name*="email" i],input[name*="login" i]');
  
  if (!pwdEl?.value || !userEl?.value) return;

  // Only auto-capture single password forms (login, not registration)
  const allPwd = formOrContainer.querySelectorAll('input[type="password"]');
  if (allPwd.length > 1) return;

  chrome.runtime.sendMessage({
    action:   'OFFER_SAVE',
    site:     window.location.hostname,
    username: userEl.value,
    password: pwdEl.value
  });
}

// 1. Native form submit
document.addEventListener('submit', e => {
  captureAndSend(e.target);
}, true);

// 2. Click on submit/login buttons (for React/Vue apps)
document.addEventListener('click', e => {
  const target = e.target.closest('button, input[type="submit"], input[type="button"], a');
  if (!target) return;
  
  const text = (target.textContent || target.value || '').toLowerCase();
  const isSubmit = target.type === 'submit' || text.includes('log in') || text.includes('login') || text.includes('sign in') || text.includes('continue');
  
  if (isSubmit) {
    const form = target.closest('form') || document.body;
    captureAndSend(form);
  }
}, true);

// 3. Enter key in a password field
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const pwdEl = e.target.closest('input[type="password"]');
    if (pwdEl) {
      const form = pwdEl.closest('form') || document.body;
      captureAndSend(form);
    }
  }
}, true);

// ── Inject shared styles ───────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('rv-styles')) return;
  const s   = document.createElement('style');
  s.id      = 'rv-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap');
    @keyframes rv-slide { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
    .rv-banner {
      position: fixed; top: 16px; right: 16px; z-index: 2147483647;
      background: #030303; border: 1px solid #2a0000; border-radius: 0;
      padding: 14px 18px; display: flex; align-items: center; gap: 14px;
      box-shadow: 0 0 20px rgba(168,0,0,.4), inset 0 0 10px rgba(0,0,0,1); max-width: 420px;
      animation: rv-slide .25s ease; font-family: 'JetBrains Mono', monospace;
      color: #d1d1d1;
    }
    .rv-btn {
      padding: 8px 16px; border: 1px solid #2a0000; border-radius: 0; font-size: 11px;
      font-weight: 700; cursor: pointer; white-space: nowrap; font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase; letter-spacing: 1px; transition: all .3s;
    }
    .rv-btn-p { background: #0a0a0a; color: #a80000; border-color: #a80000; }
    .rv-btn-p:hover { background: #a80000; color: #000; box-shadow: 0 0 15px rgba(168,0,0,0.5); }
    .rv-btn-s { background: #030303; color: #707070; }
    .rv-btn-s:hover { border-color: #555; color: #fff; }
    .rv-select {
      background: #0a0a0a; border: 1px solid #2a0000; border-radius: 0;
      color: #d1d1d1; padding: 4px 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
      outline: none;
    }
    .rv-select:focus { border-color: #a80000; }
  `;
  document.head.appendChild(s);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
