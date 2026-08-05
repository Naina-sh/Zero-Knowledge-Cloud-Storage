# 🚀 Deployment Guide — Zero-Knowledge Cloud Storage

---

## 1. Docker Deployment (Production)

### Prerequisites
- Docker 24+
- Docker Compose 2.20+
- A domain name with DNS pointing to your server
- SSL/TLS certificate (Let's Encrypt recommended)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url> Himanshu_project
cd Himanshu_project

# 2. Create production environment file
cp .env.example .env
# Edit .env with STRONG secrets:
#   POSTGRES_PASSWORD=<generate-strong-password>
#   JWT_SECRET=<generate-64-char-secret>
#   JWT_REFRESH_SECRET=<generate-64-char-secret>

# 3. Build and start all services
docker-compose up -d --build

# 4. Run database migrations (auto-run on first start via init script)
#    The migrations in backend/src/database/migrations are mounted
#    into the postgres container's docker-entrypoint-initdb.d

# 5. Verify health
curl http://localhost:4000/api/health
curl http://localhost:80
```

### Environment Variables (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | DB username | `zk_user` |
| `POSTGRES_PASSWORD` | DB password (strong!) | `$(openssl rand -base64 32)` |
---

## 2. Reverse Proxy with Nginx + SSL

For production, place Nginx in front to handle TLS termination:

```nginx
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # Frontend (static)
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # File upload size limit (encrypted files)
        client_max_body_size 100M;
    }
}

server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Obtain SSL certificate with Let's Encrypt

```bash
certbot certonly --nginx -d app.yourdomain.com
```

---

## 3. S3 Storage Backend (Optional)

To use AWS S3 instead of local filesystem, set:

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-encrypted-files-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

The `StorageService` automatically switches to S3 mode. All files are already
encrypted client-side, so S3 server-side encryption is an additional defense layer.

---

## 4. Scaling Considerations

### Vertical
- Increase PostgreSQL `shared_buffers`, `work_mem`, `maintenance_work_mem`.
- For pgvector HNSW: tune `ef_search` at query time for speed/recall tradeoff.

### Horizontal
- **Backend**: Stateless (JWT) — scale behind a load balancer. Use sticky sessions NOT required.
- **Database**: Use PgBouncer for connection pooling. Read replicas for analytics queries.
- **Storage**: S3 scales infinitely. For local storage, use a shared NFS volume or migrate to S3.
- **Vector search**: For >10M vectors, consider migrating to Qdrant or Milvus. The `SearchService` interface abstracts this.

### Performance Tuning (pgvector)

```sql
-- Tune HNSW search parameters at query time
SET hnsw.ef_search = 100;  -- higher = better recall, slower
```

---

## 5. Security Hardening Checklist

- [x] All file encryption is client-side (AES-256-GCM)
- [x] Keys derived with PBKDF2 (600k iterations) + HKDF separation
- [x] Server stores only Argon2id hash of authKey (never the password)
- [x] Filenames and metadata encrypted
- [x] JWT with short-lived access tokens + rotated refresh tokens
- [x] Helmet security headers enabled
- [x] Rate limiting on auth endpoints
- [x] CORS restricted to known origins
- [x] Input validation on all endpoints (Zod)
- [ ] **Enable HTTPS/TLS** (mandatory — protects authKey in transit)
- [ ] **Set strong JWT secrets** (64+ hex characters)
- [ ] **Set strong DB password**
- [ ] **Enable S3 server-side encryption** (if using S3)
- [ ] **Configure firewall** (only expose ports 80/443)
- [ ] **Regular security audits** and dependency updates
- [ ] **Backup PostgreSQL** with automated pg_dump schedules

---

## 6. Monitoring & Logging

The backend uses Winston for structured logging:

```bash
# View backend logs
docker-compose logs -f backend

# View PostgreSQL logs
docker-compose logs -f postgres
```

Log levels: `error`, `warn`, `info`, `http`, `debug`. In production, set `LOG_LEVEL=info`.

For production monitoring, integrate with:
- **PM2** or **Docker health checks** for process monitoring
- **Prometheus + Grafana** for metrics
- **Sentry** for error tracking

---

## 7. Backup Strategy

```bash
# Daily PostgreSQL backup
pg_dump -U zk_user -h localhost zk_storage | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260101.sql.gz | psql -U zk_user -h localhost zk_storage
```

> Note: Backups contain encrypted files and embeddings — they are safe even if compromised, as long as JWT secrets are stored separately.

| `POSTGRES_DB` | Database name | `zk_storage` |
| `JWT_SECRET` | Access token signing secret | `$(openssl rand -hex 64)` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | `$(openssl rand -hex 64)` |
| `CORS_ORIGIN` | Allowed frontend origins | `https://app.yourdomain.com` |
| `STORAGE_DRIVER` | `local` or `s3` | `local` |
| `STORAGE_PATH` | File storage directory | `/app/uploads` |
