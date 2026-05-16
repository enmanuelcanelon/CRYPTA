# ⏣ CRYPTA - The Monolith: TODO & Backlog

This document tracks the missing features, known issues, and future rituals needed to complete the architecture of CRYPTA.

## 🔴 High Priority (Immediate Next Steps)
- [ ] **Cross-Device Sync Testing:** Test the extension on a secondary machine to ensure the UPSERT logic resolves conflicts correctly when multiple devices sync to the same backend.
- [ ] **HTTPS / TLS on Backend:** Currently, the backend runs on HTTP (localhost:3000). To deploy to a VPS safely, the Rust backend needs to be placed behind a reverse proxy (like Nginx, Traefik, or Caddy) to handle HTTPS certificates.
- [ ] **Edit Credential:** Currently we can delete and create. Add an "Edit" button to modify existing records without deleting them first.

## 🟡 Medium Priority (Enhancements)
- [ ] **Lock Timeout:** Add an auto-lock feature in `background.js` to automatically clear the session memory after X minutes of inactivity for maximum security.
- [ ] **Password History:** Keep a history of the last 3 passwords used for a specific domain to prevent losing access if a password change fails.
- [ ] **Export/Import Vault:** Allow users to export their decrypted vault as a standard CSV or JSON file (compatible with Bitwarden/1Password format) in case they want to migrate.

## 🟢 Low Priority (Long-term Vision)
- [ ] **Mobile Interface (PWA):** Build a standalone Web Interface hosted by the Rust backend that allows decrypting the vault on mobile browsers (Safari/Chrome Mobile).
- [ ] **Hardware Security:** Phase 5 of the original plan. Integrate WebAuthn (YubiKey / Fingerprint) to unlock the Master Cipher instead of typing it.
- [ ] **Dark Mode / Light Mode Toggle:** Currently hardcoded to the Monolith Cyber-Gothic theme. Add an option for a minimal light theme (though it breaks the cult aesthetic).

---
*Keep this list updated as features are implemented.*
