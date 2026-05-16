# API Documentation

The backend provides a REST API to synchronize the encrypted vault.

## Base URL
`http://localhost:3000` (Default during development)

## Endpoints

### 1. Health Check
Checks if the server is running.
- **URL:** `/health`
- **Method:** `GET`
- **Response:** `200 OK`
- **Body:** `OK`

### 2. Sync Vault
Uploads or updates the encrypted vault for a specific device.
- **URL:** `/sync`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "device_id": "string",
    "content": "string (Base64 encrypted blob)"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "Vault synced successfully"
  }
  ```

### 3. Get Vault
Retrieves the encrypted vault for a specific device.
- **URL:** `/vault/:device_id`
- **Method:** `GET`
- **Response:** `200 OK`
  ```json
  {
    "device_id": "string",
    "content": "string (Base64 encrypted blob)"
  }
  ```
- **Error:** `500 Internal Server Error` (if vault not found or DB error)

## Data Security
- All content in the `content` field **MUST** be encrypted by the client using AES-GCM.
- The server does not validate or decrypt the `content` field.
