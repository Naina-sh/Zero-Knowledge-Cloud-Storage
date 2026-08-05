-- ============================================================
-- Zero-Knowledge Cloud Storage — Database Initialization
-- This file runs automatically on first container start
-- (mounted into docker-entrypoint-initdb.d)
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    auth_key_hash TEXT NOT NULL,
    auth_salt     TEXT NOT NULL,
    enc_salt      TEXT NOT NULL,
    storage_used  BIGINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- files — encrypted file metadata (content stored in storage backend)
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_name TEXT NOT NULL,
    name_iv        TEXT NOT NULL,
    file_iv        TEXT NOT NULL,
    storage_path   TEXT NOT NULL,
    size           BIGINT NOT NULL,
    original_size  BIGINT NOT NULL,
    mime_encrypted TEXT,
    mime_iv        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(user_id, created_at DESC);

-- ============================================================
-- embeddings — semantic vectors for similarity search (pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS embeddings (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vector     vector(384) NOT NULL,
    model      VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings
    USING hnsw (vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_file_id ON embeddings(file_id);

-- ============================================================
-- search_history — encrypted search queries (zero-knowledge)
-- ============================================================
CREATE TABLE IF NOT EXISTS search_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_query TEXT NOT NULL,
    query_iv        TEXT NOT NULL,
    result_count    INTEGER NOT NULL DEFAULT 0,
    searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at DESC);

-- ============================================================
-- refresh_tokens — JWT refresh token tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================
-- Storage accounting trigger — keeps users.storage_used in sync
-- ============================================================
CREATE OR REPLACE FUNCTION update_storage_used()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE users SET storage_used = storage_used + NEW.size
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE users SET storage_used = GREATEST(storage_used - OLD.size, 0)
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_used_insert ON files;
CREATE TRIGGER trg_storage_used_insert
    AFTER INSERT ON files
    FOR EACH ROW EXECUTE FUNCTION update_storage_used();

DROP TRIGGER IF EXISTS trg_storage_used_delete ON files;
CREATE TRIGGER trg_storage_used_delete
    AFTER DELETE ON files
    FOR EACH ROW EXECUTE FUNCTION update_storage_used();
