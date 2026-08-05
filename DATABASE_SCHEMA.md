# 🗄️ Database Schema — Zero-Knowledge Cloud Storage

Database: **PostgreSQL 16** with **pgvector** extension.

---

## Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for semantic search
```

---

## ER Diagram

```
┌──────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│     users        │       │       files          │       │     embeddings      │
├──────────────────┤       ├──────────────────────┤       ├─────────────────────┤
│ id (PK, uuid)    │──┐   │ id (PK, uuid)        │──┐   │ id (PK, uuid)       │
│ email (unique)   │  │   │ user_id (FK, uuid)   │  │   │ file_id (FK, uuid)  │
│ auth_key_hash    │  └──▶│ encrypted_name (text) │  └──▶│ user_id (FK, uuid)  │
│ auth_salt        │      │ name_iv (text)       │      │ vector (vector(384))│
│ enc_salt         │      │ file_iv (text)       │      │ model (text)        │
│ created_at       │      │ storage_path (text)  │      │ created_at          │
│ updated_at       │      │ size (bigint)        │      └─────────────────────┘
│ storage_used     │      │ original_size (bigint)│
└──────────────────┘      │ mime_encrypted (text)│       ┌─────────────────────┐
                          │ mime_iv (text)       │       │  search_history     │
                          │ created_at           │       ├─────────────────────┤
                          │ updated_at           │       │ id (PK, uuid)       │
                          └──────────────────────┘       │ user_id (FK, uuid)  │
                                                         │ encrypted_query     │
                                                         │ query_iv            │
                                                         │ result_count (int)  │
                                                         │ searched_at         │
                                                         └─────────────────────┘
```

---

## Table Definitions

### `users`

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    auth_key_hash TEXT NOT NULL,              -- Argon2id hash of derived authKey
    auth_salt     TEXT NOT NULL,              -- hex, 128-bit salt for auth key
    enc_salt      TEXT NOT NULL,              -- hex, 128-bit salt for enc key
    storage_used  BIGINT NOT NULL DEFAULT 0,  -- total bytes stored (encrypted)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### `files`

```sql
CREATE TABLE files (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_name TEXT NOT NULL,             -- AES-256-GCM ciphertext (base64)
    name_iv        TEXT NOT NULL,             -- IV for filename (base64)
    file_iv        TEXT NOT NULL,             -- IV for file content (base64)
### `embeddings`

```sql
CREATE TABLE embeddings (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vector     vector(384) NOT NULL,          -- 384-dim sentence-transformer embedding
    model      VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbor search (cosine similarity)
CREATE INDEX idx_embeddings_vector ON embeddings
    USING hnsw (vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_user_id ON embeddings(user_id);
CREATE UNIQUE INDEX idx_embeddings_file_id ON embeddings(file_id);
```

### `search_history`

```sql
CREATE TABLE search_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_query TEXT NOT NULL,            -- AES-256-GCM ciphertext of query (base64)
    query_iv        TEXT NOT NULL,            -- IV for query encryption (base64)
    result_count    INTEGER NOT NULL DEFAULT 0,
    searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON search_history(user_id, searched_at DESC);
```

### `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,                -- SHA-256 hash of refresh token
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

## Vector Search Query

The core semantic search query uses pgvector's cosine distance operator `<=>`:

```sql
SELECT
    e.file_id,
    f.encrypted_name,
    f.name_iv,
    f.size,
    1 - (e.vector <=> $1::vector) AS score
FROM embeddings e
JOIN files f ON f.id = e.file_id
WHERE e.user_id = $2
  AND 1 - (e.vector <=> $1::vector) >= $3   -- threshold filter
ORDER BY e.vector <=> $1::vector             -- ascending distance = descending similarity
LIMIT $4;                                     -- topK
```

**Parameters:**
- `$1`: query embedding vector (384-dim)
- `$2`: user ID (ensures users only search their own files)
- `$3`: similarity threshold (e.g., 0.3)
- `$4`: top K results

---

## Storage Accounting Trigger

A trigger keeps `users.storage_used` in sync with actual file sizes:

```sql
CREATE OR REPLACE FUNCTION update_storage_used()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE users SET storage_used = storage_used + NEW.size
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE users SET storage_used = storage_used - OLD.size
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_storage_used_insert
    AFTER INSERT ON files
    FOR EACH ROW EXECUTE FUNCTION update_storage_used();

CREATE TRIGGER trg_storage_used_delete
    AFTER DELETE ON files
    FOR EACH ROW EXECUTE FUNCTION update_storage_used();
```

    storage_path   TEXT NOT NULL,             -- path/blob key in storage backend
    size           BIGINT NOT NULL,           -- encrypted file size in bytes
    original_size  BIGINT NOT NULL,           -- plaintext file size (for display)
    mime_encrypted TEXT,                      -- encrypted MIME type (base64)
    mime_iv        TEXT,                      -- IV for MIME type (base64)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(user_id, created_at DESC);
```
