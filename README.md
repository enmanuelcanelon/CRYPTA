# ⏣ CRYPTA: The Monolith

> *"Data is not merely information. It is power, identity, and vulnerability. Control your data, or someone else will."*

**CRYPTA** is not a product. It is a declaration of **Absolute Data Sovereignty**. 

While the world surrenders its most critical secrets to corporate monoliths, cloud subscriptions, and venture-capital-backed SaaS platforms, CRYPTA takes a different path. It is a self-hosted, ultra-lightweight, Zero-Knowledge password manager built for hackers, privacy absolutists, and those who treat their digital footprint as a sacred secret.

---

## 👁️ Why CRYPTA? (The Differentiator)

There are thousands of password managers out there. Bitwarden, 1Password, LastPass. Why build another?

Because **trusting a corporation is a single point of failure.** Even if they use strong cryptography, you are subject to their infrastructure, their terms of service, and their telemetry. 

CRYPTA offers something they cannot: **Total Isolation.**

1. **Anti-Corporate by Design:** No telemetry, no analytics, no recurring fees, no cloud lock-in. You own the code. You own the server.
2. **Micro-Footprint Architecture:** Unlike Bitwarden (which requires heavy containers) or even Vaultwarden, CRYPTA is written in pure Rust. The entire backend consumes **less than 15MB of RAM**. You can host it on a 10-year-old Raspberry Pi or the cheapest free-tier VPS in the world without it breaking a sweat.
3. **Cyber-Gothic Aesthetic:** A meticulously crafted, distraction-free extension interface that feels like accessing a digital occult vault. No friendly mascots. Just pure, unadulterated security.
4. **Air-Gapped Potential:** Run it locally on your machine. You don't even need the internet to use it.

---

## 🛡️ Cryptography: Military-Grade Zero-Knowledge

We do not invent cryptography; we implement the exact same standards used by banks and intelligence agencies. 

CRYPTA employs a strict **Zero-Knowledge Architecture**. The server is completely blind. It acts purely as a dumb storage unit for an impenetrable block of encrypted data.

* **The Key Derivation (PBKDF2):** Your Master Cipher is salted and run through **100,000 iterations of PBKDF2 (SHA-256)** right inside your browser. This makes brute-forcing your Master Cipher mathematically unfeasible, even for nation-state supercomputers.
* **The Encryption (AES-256-GCM):** Before any data leaves your browser, your entire vault (sites, usernames, passwords) is packed into a single JSON object and encrypted using the **Web Crypto API (AES-256-GCM)**. 
* **The Result:** Even if a hacker compromises your Linux server and steals your SQLite database, all they will get is random noise. They cannot see your passwords. They cannot even see *how many* passwords you have.

---

## 🏗️ Architecture

The system is split into two components:

1. **The Extension (Brave / Chrome):** 
   Built in Manifest V3. Handles all cryptographic operations locally, intercepts logins to auto-save credentials, injects auto-fill UI dynamically, and generates 20-character secure passwords.
2. **The Backend (Rust 🦀):** 
   A lightning-fast `axum` server using `sqlx` and `SQLite`. It exposes exactly two endpoints: one to sync (UPSERT) your encrypted blob, and one to fetch it.

---

## 🚀 Deployment (The Monolith Rises)

CRYPTA is designed to be trivial to host. It is fully Dockerized.

### Option 1: Docker (Recommended for VPS)
Host it on Oracle Cloud (Always Free Tier) or a $4 DigitalOcean droplet.

```bash
cd backend
docker build -t crypta .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name the_monolith crypta
```

### Option 2: Bare Metal (Local/Raspberry Pi)
```bash
cd backend
cargo build --release
./target/release/backend
```

### Installing the Extension
1. Open `brave://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder.
4. Forge your Master Cipher.

---

## 🔮 Roadmap (The Next Rituals)
- [x] **Phase 1 & 2:** Cryptography & UI Architecture
- [x] **Phase 3:** Auto-fill and DOM Interception
- [ ] **Phase 4:** PWA (Progressive Web App) Mobile Companion
- [ ] **Phase 5:** Fingerprint/Biometrics WebAuthn Integration

> *Trust no one. Encrypt everything.* ⏣
