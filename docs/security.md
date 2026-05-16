# Security and Cryptography Implementation

## Zero-Knowledge Architecture
The security of CRYPTA relies on the principle that the server never receives the master password or any unencrypted credential.

## 1. Key Derivation (PBKDF2)
When the user enters their Master Password:
- We use the **Web Crypto API** `PBKDF2` algorithm.
- **Salt:** A unique salt generated per user (stored in the extension's local storage).
- **Iterations:** 100,000.
- **Hash:** SHA-256.
- **Output:** A 256-bit symmetric key for AES-GCM.

## 2. Vault Encryption (AES-GCM)
The entire vault (list of credentials) is stored as a JSON object.
- **Algorithm:** AES-GCM (Advanced Encryption Standard with Galois/Counter Mode).
- **Key Length:** 256 bits.
- **IV (Initialization Vector):** A fresh 12-byte random IV is generated for every encryption operation.
- **Integrity:** AES-GCM provides built-in authentication (MAC), ensuring that the vault hasn't been tampered with.

## 3. Data Synchronization
- The encrypted blob + the IV are Base64 encoded.
- This bundle is sent to the Rust backend via a POST request to `/sync`.
- The backend stores this bundle in a SQLite database.

## 4. Local Storage
- The derived encryption key is kept only in memory while the extension is "unlocked".
- When the extension is "locked" or the browser is closed, the key is wiped.
- The user must re-enter the Master Password to re-derive the key.
