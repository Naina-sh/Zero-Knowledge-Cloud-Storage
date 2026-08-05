# 📡 API Documentation — Zero-Knowledge Cloud Storage

Base URL: `http://localhost:4000/api`

All requests/responses use JSON unless noted (file upload is `multipart/form-data`).
Authentication uses `Authorization: Bearer <accessToken>` header. Refresh token is sent automatically via HTTP-only cookie.

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Files](#2-files)
3. [Embeddings](#3-embeddings)
4. [Search](#4-search)
5. [Users](#5-users)
6. [Error Format](#6-error-format)

---

## 1. Authentication

### POST `/auth/register`
Register a new user. All crypto is performed client-side; the server receives only the derived `authKey`.

**Request Body:**
```json
{
  "email": "user@example.com",
  "authKey": "hex-string-256-bit-auth-key",
  "authSalt": "hex-string-128-bit-salt",
  "encSalt": "hex-string-128-bit-salt"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "accessToken": "jwt-string"
  }
}
```
> Refresh token set as `zk_refresh` HTTP-only cookie.

---

### GET `/auth/salt?email=<email>`
Retrieve salts for key derivation. Used before login to reconstruct keys client-side.

**Response `200`:**
```json
{
  "success": true,
  "data": { "authSalt": "hex", "encSalt": "hex" }
}
```
**Response `404`:** User not found.

---

### POST `/auth/login`
Authenticate with the derived authKey.

**Request Body:**
```json
{
  "email": "user@example.com",
  "authKey": "hex-string-256-bit-auth-key"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "accessToken": "jwt-string"
  }
}
```

---

### POST `/auth/refresh`
Refresh the access token. The refresh token is read from the `zk_refresh` cookie automatically.

**Response `200`:**
---

## 2. Files

All file endpoints require `Authorization: Bearer <token>`.

### POST `/files/upload`
Upload an encrypted file with its embedding. **Multipart form-data.**

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | binary | AES-256-GCM encrypted file blob |
| `encryptedName` | string | AES-256-GCM encrypted original filename (base64) |
| `nameIv` | string | IV used for filename encryption (base64) |
| `fileIv` | string | IV used for file encryption (base64) |
| `embedding` | string | JSON array of 384 floats (the embedding vector) |
| `originalSize` | number | Size of original plaintext file in bytes |
| `mimeType` | string | Encrypted MIME type (base64) |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "encryptedName": "...",
    "size": 1024576,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### GET `/files`
List all files for the authenticated user.

**Query Params:** `?page=1&limit=20&sort=createdAt&order=desc`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "encryptedName": "base64-ciphertext",
        "nameIv": "base64-iv",
        "size": 1024576,
        "originalSize": 900000,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
  }
}
```

---

### GET `/files/:id/download`
Download the encrypted file blob. The client decrypts locally.

**Response `200`:** Binary stream (encrypted file blob) with headers:
```
Content-Type: application/octet-stream
X-File-Iv: base64-iv
X-Encrypted-Name: base64-ciphertext
X-Name-Iv: base64-iv
```

---

### GET `/files/:id`
Get metadata for a single file.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encryptedName": "base64",
    "nameIv": "base64",
    "size": 1024576,
    "originalSize": 900000,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### PATCH `/files/:id/rename`
Rename a file (client encrypts the new name first).

**Request Body:**
```json
{
  "encryptedName": "base64-new-ciphertext",
  "nameIv": "base64-new-iv"
}
```

**Response `200`:** Updated file metadata.

---

## 4. Search

### POST `/search`
Perform semantic vector similarity search. The client sends the **embedding vector** of the query (never the plaintext query).

**Request Body:**
```json
{
  "queryEmbedding": [0.0123, -0.0456, ...],  // 384 floats (client-generated)
  "topK": 10,
  "threshold": 0.5
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "fileId": "uuid",
        "score": 0.87,
        "encryptedName": "base64",
        "nameIv": "base64",
        "size": 1024576
      }
    ]
  }
}
```

> Scores are cosine similarity (0–1, higher = more similar). Results below `threshold` are filtered out.

---

### GET `/search/history`
Retrieve the user's search history (stored as encrypted queries).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "encryptedQuery": "base64",
        "queryIv": "base64",
        "resultCount": 5,
        "searchedAt": "..."
      }
    ]
  }
}
```

---

### DELETE `/search/history`
Clear all search history.

**Response `200`:**
```json
{ "success": true, "message": "Search history cleared" }
```

---

## 5. Users

### GET `/users/me`
Get the authenticated user's profile.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "...",
    "storageUsed": 52428800
  }
}
```

---

### GET `/users/me/analytics`
Get storage analytics for the dashboard.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 45,
    "totalSize": 52428800,
    "storageByType": { "pdf": 20, "docx": 15, "txt": 10 },
    "uploadsOverTime": [
      { "date": "2026-01-01", "count": 5, "size": 1024000 }
    ]
  }
}
```

---

### DELETE `/users/me`
Delete the user account and all associated data (files, embeddings, history).

**Request Body:**
```json
{ "authKey": "hex-string-for-confirmation" }
```

**Response `200`:**
```json
{ "success": true, "message": "Account deleted successfully" }
```

---

## 6. Error Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email is required",
    "details": [{ "field": "email", "message": "email is required" }]
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Access denied to resource |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email exists) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Health Check
### GET `/health`
```json
{ "status": "ok", "timestamp": "2026-01-01T00:00:00.000Z", "uptime": 3600 }
```

---

### DELETE `/files/:id`
Delete a file and its embedding permanently.

**Response `200`:**
```json
{ "success": true, "message": "File deleted successfully" }
```

---

## 3. Embeddings

### POST `/embeddings`
Store an embedding for a file (used internally during upload, but exposed for re-indexing).

**Request Body:**
```json
{
  "fileId": "uuid",
  "embedding": [0.0123, -0.0456, ...],  // 384 floats
  "model": "all-MiniLM-L6-v2"
}
```

**Response `201`:**
```json
{ "success": true, "data": { "embeddingId": "uuid", "fileId": "uuid" } }
```

---

### DELETE `/embeddings/:fileId`
Delete the embedding associated with a file.

**Response `200`:**
```json
{ "success": true, "message": "Embedding deleted" }
```

```json
{
  "success": true,
  "data": { "accessToken": "new-jwt-string" }
}
```

---

### POST `/auth/logout`
Invalidate the refresh token and clear the cookie.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```
