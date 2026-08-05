# 🏗️ Architecture — Zero-Knowledge Cloud Storage with Semantic Search

This document explains the system architecture, trust model, data flow, and design decisions.

---

## 1. Trust Model

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUSTED ZONE (Client Browser)                                  │
│  ✅ Password        ✅ Encryption Keys     ✅ Plaintext Files    │
│  ✅ Extracted Text  ✅ Query Plaintext     ✅ Decryption         │
└───────────────────────────┬─────────────────────────────────────┘
                            │  TLS (HTTPS)
                            │  ↓ Encrypted files + embedding vectors only
┌───────────────────────────▼─────────────────────────────────────┐
│  UNTRUSTED ZONE (Server)                                        │
│  ✅ Argon2 hash of authKey   ✅ Encrypted file blobs            │
│  ✅ Embedding vectors        ✅ Encrypted filenames/metadata     │
│  ✅ JWT tokens               ✅ User email (identifier)          │
│  ❌ No password  ❌ No encKey  ❌ No plaintext  ❌ No raw query  │
└─────────────────────────────────────────────────────────────────┘
```

**Principle:** The server is treated as a potentially compromised storage provider. Even with full database access, an attacker cannot decrypt files or reconstruct document content.

---

## 2. Cryptographic Design

### 2.1 Key Derivation Chain

```
User Password
     │
     ▼
PBKDF2-SHA256(password, userSalt, iterations=600_000, dkLen=32)
     │
     ▼
masterKey  (256-bit, never transmitted, never persisted)
     │
     ├──HKDF-SHA256(masterKey, info="zk-auth-v1")──▶ authKey  (256-bit)
     │                                                    │
     │                                          sent to server for login
     │                                          server stores Argon2id(authKey)
     │
     └──HKDF-SHA256(masterKey, info="zk-enc-v1")──▶  encKey  (256-bit)
                                                       │
                                            used for AES-256-GCM encryption
                                            NEVER leaves the client
```

**Why key separation?** If the auth key is ever compromised (e.g., server breach), the encryption key remains secure because it is derived via a different HKDF info label. An attacker cannot derive `encKey` from `authKey` without the original password.

### 2.2 File Encryption (AES-256-GCM)

Each file is encrypted with a **random 96-bit IV** per encryption operation:

```
plaintextFile ──▶ AES-256-GCM(encKey, iv=random12bytes, aad=fileId)
                      │
                      ▼
              ciphertext + authTag
```

- **IV**: Random per file (96-bit, NIST-recommended for GCM).
- **AAD (Additional Authenticated Data)**: The file ID binds ciphertext to its metadata, preventing substitution attacks.
- **Auth Tag**: GCM provides authenticated encryption — tampering is detected on decryption.

### 2.3 Metadata Encryption

Filenames, content types, and file sizes are encrypted alongside the file blob. The server stores only:
- `encrypted_name` (AES-256-GCM ciphertext of the original filename)
- `iv` (initialization vector)
---

## 3. Semantic Search Architecture

### 3.1 Embedding Generation (Client-Side)

```
File (PDF/DOCX/TXT)
     │
     ▼
Text Extraction (pdfjs-dist / mammoth / FileReader)
     │
     ▼
Plain Text (truncated to model max length)
     │
     ▼
Transformers.js — all-MiniLM-L6-v2 (ONNX, quantized, ~23 MB)
     │
     ▼
Embedding Vector (384-dim float32)
```

The model runs **entirely in the browser** via WebAssembly (with optional WebGPU acceleration). The server never sees the extracted text — only the resulting 384-dimensional embedding vector.

### 3.2 Vector Storage & Search (Server-Side)

Embeddings are stored in PostgreSQL using the **pgvector** extension:

```sql
-- Embedding column type: vector(384)
-- Index: HNSW (Hierarchical Navigable Small World) for fast ANN search
CREATE INDEX ON embeddings USING hnsw (vector vector_cosine_ops);
```

**Search flow:**
1. Client converts search query → embedding (same model, same client).
2. Client sends embedding vector to `/api/search`.
3. Server runs: `SELECT file_id, 1 - (vector <=> $1) AS score FROM embeddings ORDER BY vector <=> $1 LIMIT k`.
4. Server returns matching file IDs + similarity scores.
5. Client downloads + decrypts matching files.

### 3.3 Why Embeddings Are Safe to Store on the Server

Embeddings are dense 384-dimensional vectors. While theoretical inversion attacks exist, they require:
- Knowledge of the exact model weights (publicly available).
- Significant computational resources.
- The attack produces approximate, not exact, text reconstruction.

For most threat models, storing embeddings is acceptable. For higher security needs, the system is designed to allow future integration of **encrypted vector search** (e.g., homomorphic encryption or trusted execution environments) without changing the API contract.

---

## 4. Backend Module Architecture

```
                    ┌─────────────┐
                    │   app.ts    │  Express app (CORS, Helmet, routes, error handler)
                    └──────┬──────┘
                           │
        ┌──────────┬───────┼──────────┬──────────┐
---

## 5. Frontend Architecture

```
┌──────────────────────────────────────────────────────┐
│                    React SPA (Vite)                   │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Routes  │  │  Pages   │  │    Components        │ │
│  │(Router) │─▶│ (Views)  │─▶│ (Layout/UI/Feature)  │ │
│  └─────────┘  └────┬─────┘  └──────────────────────┘ │
│                      │                                │
│                      ▼                                │
│              ┌──────────────┐    ┌─────────────────┐  │
│              │  Hooks       │───▶│   Stores        │  │
│              │  (useAuth…)  │    │  (Zustand)      │  │
│              └──────┬───────┘    └─────────────────┘  │
│                     │                                 │
│                     ▼                                 │
│  ┌──────────────────────────────────────────────────┐│
│  │              Service Layer (Client)              ││
│  │  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ││
│  │  │  API   │ │ Crypto  │ │Embedding │ │Extract │ ││
│  │  │Service │ │Service  │ │ Service  │ │Service │ ││
│  │  └────────┘ └─────────┘ └──────────┘ └────────┘ ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| `key.service.ts` | PBKDF2 key derivation, HKDF separation, salt management |
| `crypto.service.ts` | AES-256-GCM encrypt/decrypt for files & metadata |
| `extraction.service.ts` | PDF (pdfjs), DOCX (mammoth), TXT text extraction |
| `embedding.service.ts` | Transformers.js model loading & embedding generation |
| `file.service.ts` | Orchestrates upload/download: extract → embed → encrypt → upload |
| `api.service.ts` | Axios HTTP client with JWT interceptor & refresh logic |

---

## 6. Authentication Flow

### Registration
```
Client                              Server
  │  1. Generate authSalt, encSalt (random 128-bit)        │
  │  2. masterKey = PBKDF2(pw, encSalt, 600k)              │
  │  3. authKey = HKDF(masterKey, "auth")                  │
  │  4. POST /auth/register {email, authKey, salts}  ──▶   │
  │                                                   5. Argon2id(authKey) → hash
  │                                                   6. Store user + salts
  │  ◀── 7. { accessToken, refreshToken (HTTP-only) } ──  │
```

### Login
```
Client                              Server
  │  1. GET /auth/salt?email=...  ──────────────────▶     │
  │  ◀── 2. { authSalt, encSalt } ───────────────────     │
  │  3. masterKey = PBKDF2(pw, encSalt, 600k)              │
  │  4. authKey = HKDF(masterKey, "auth")                  │
  │  5. POST /auth/login {email, authKey}  ──────────▶     │
  │                                                   6. Verify Argon2id(hash, authKey)
  │  ◀── 7. { accessToken, refreshToken } ──────────      │
  │  8. encKey = HKDF(masterKey, "enc") [in memory]        │
```

### Token Rotation
- **Access token**: 15-minute expiry, sent in `Authorization: Bearer`.
- **Refresh token**: 7-day expiry, HTTP-only secure cookie. Rotated on each use.
- On access token expiry, the API interceptor silently refreshes using the cookie.

---

## 7. File Upload Flow (End-to-End)

```
1. User selects file (drag-and-drop or picker)
2. Client reads file as ArrayBuffer
3. Client extracts text (PDF/DOCX/TXT) → plainText
4. Client generates embedding: Transformers.js(plainText) → vector[384]
5. Client encrypts file: AES-256-GCM(encKey, iv, fileBuffer) → ciphertext
6. Client encrypts filename: AES-256-GCM(encKey, iv, fileName) → encName
7. Client POSTs multipart: { ciphertext, encName, iv, embedding, size }
8. Server stores ciphertext to storage, embedding to pgvector, metadata to DB
9. Client receives fileId
```

## 8. Search Flow (End-to-End)

```
1. User types semantic query (e.g., "quarterly revenue report")
2. Client generates embedding: Transformers.js(query) → queryVector[384]
3. Client POSTs { queryVector, topK } to /api/search
4. Server: pgvector cosine similarity search → [{ fileId, score }]
5. Client fetches encrypted files for each result
6. Client decrypts filename + file content locally
7. Client displays decrypted file preview
```

---

## 9. Technology Choices Rationale

| Choice | Why |
|--------|-----|
| Web Crypto API | Native browser crypto — no external libs, FIPS-validated, constant-time |
| PBKDF2 (not Argon2) in browser | Web Crypto supports PBKDF2 natively; Argon2 requires WASM. 600k iterations provide strong resistance. |
| Argon2id on server | Best-in-class for authKey hashing (memory-hard, side-channel resistant) |
| Transformers.js | Only practical way to run sentence-transformers client-side (ONNX + WASM) |
| pgvector | Vector search integrated into PostgreSQL — no separate DB to manage |
| Zustand | Lightweight, no boilerplate, perfect for this app's state needs |
| Express | Minimal, mature, huge ecosystem, easy to modularize |

---

## 10. Scalability Considerations

- **Storage**: The `StorageService` abstracts local FS vs S3. Swap the driver via env var.
- **Database**: pgvector with HNSW index scales to millions of vectors. For >10M, consider dedicated vector DB (Qdrant/Milvus) behind the same `SearchService` interface.
- **Horizontal scaling**: Backend is stateless (JWT, no server-side sessions). Scale behind a load balancer.
- **CDN**: Frontend is static — serve via CDN. The embedding model can be pre-cached.

        ▼          ▼       ▼          ▼          ▼
   ┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌────────┐
   │  Auth  │ │Files │ │Embedding│ │Search│ │ Users  │
   │ Module │ │Module│ │ Module  │ │Module│ │ Module │
   └───┬────┘ └──┬───┘ └───┬────┘ └──┬───┘ └───┬────┘
       │         │         │          │         │
       ▼         ▼         ▼          ▼         ▼
   ┌─────────────────────────────────────────────────┐
   │              Storage Service                    │  Abstraction (Local FS / S3)
   └─────────────────────┬───────────────────────────┘
                         │
   ┌─────────────────────▼───────────────────────────┐
   │           PostgreSQL + pgvector                  │
   └─────────────────────────────────────────────────┘
```

Each module follows the **controller → service → repository** pattern:
- **Routes**: Define HTTP endpoints + validation middleware.
- **Controller**: Parses request, calls service, formats response.
- **Service**: Business logic (no HTTP awareness).
- **Database**: Direct pg queries via a shared connection pool.

- `file_size` (of the ciphertext — needed for storage accounting)

### 2.4 Salts

- `auth_salt` and `enc_salt`: Random 128-bit values generated at registration, stored on the server per user. Salts are not secret — their purpose is to prevent rainbow table attacks and ensure unique keys per user.
