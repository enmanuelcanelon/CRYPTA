# Project Architecture

## Overview
This is a self-hosted, Zero-Knowledge password manager. It consists of a Rust backend and a browser extension.

## Components

### 1. Backend (`/backend`)
- **Language:** Rust
- **Framework:** Axum
- **Database:** SQLite (managed via SQLx)
- **Role:** Stores and synchronizes encrypted "Vault" blobs. It has NO knowledge of the actual passwords.

### 2. Browser Extension (`/extension`) - *Pending*
- **Role:** Handles all encryption, decryption, and auto-filling.
- **Security:** Master password never leaves the extension.

## Security Model (Zero-Knowledge)
1. **Master Password:** Used to derive an encryption key locally in the extension using PBKDF2/Argon2.
2. **Vault Encryption:** Data is encrypted using AES-GCM before being sent to the server.
3. **Server Role:** The server only sees encrypted blobs and metadata (e.g., last sync time).

## Directory Structure
- `/backend`: Rust source code.
- `/extension`: Browser extension source code.
- `/docs`: Detailed documentation in English.
