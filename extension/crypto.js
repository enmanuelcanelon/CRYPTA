/**
 * Web Crypto API — Zero-Knowledge AES-256-GCM + PBKDF2
 * Key is marked extractable so it can be stored in chrome.storage.session
 * for automatic re-login until the browser is closed.
 */

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    true,               // extractable → we can export for session storage
    ['encrypt', 'decrypt']
  );
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKey(b64) {
  const raw = new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function encryptData(key, data) {
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return {
    iv:   btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

async function decryptData(key, encObj) {
  const iv   = new Uint8Array(atob(encObj.iv).split('').map(c => c.charCodeAt(0)));
  const data = new Uint8Array(atob(encObj.data).split('').map(c => c.charCodeAt(0)));
  const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(dec));
}

function generatePassword(length = 20) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  const arr   = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}
