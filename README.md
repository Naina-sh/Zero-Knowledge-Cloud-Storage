# 🔐 Zero-Knowledge Cloud Storage with Semantic Search

A production-ready, zero-knowledge cloud storage system where users can securely upload, search, and retrieve files **without trusting the server**. All files are encrypted on the client side, encryption keys are derived locally from the user's password, and the server never sees plaintext files, passwords, keys, or search queries.

Semantic search is powered by **sentence-transformer embeddings generated entirely in the browser**, with vector similarity search performed on the server using **pgvector**.

---

## ✨ Features

### Security (Zero-Knowledge Architecture)
- 🔒 Client-side **AES-256-GCM** encryption
- 🔑 Keys derived locally from password via **PBKDF2** (600,000 iterations)
- 🧂 Per-user random salts; key separation (auth key ≠ encryption key)
- 🚫 Server never receives: plaintext files, passwords, encryption keys, decrypted content, or plaintext search queries
- 📛 Filenames and metadata are encrypted — true zero-knowledge
- 🛡️ JWT authentication with access + refresh token rotation
- ⚙️ Helmet, CORS, rate limiting, input validation (Zod)

### AI / Semantic Search
### Backend
- 🧩 Clean modular architecture (auth, files, embeddings, search, storage, users)
- 📝 Structured logging (Winston)
- 🛠️ Centralized error handling
- ✅ Request validation (Zod schemas)

---

## 📁 Project Structure

```
Himanshu_project/
├── README.md
├── ARCHITECTURE.md
├── API_DOCUMENTATION.md
├── DEPLOYMENT.md
├── DATABASE_SCHEMA.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/                        # Node.js + Express + TypeScript API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   └── src/
│       ├── index.ts                # Server entry point
│       ├── app.ts                  # Express app configuration
│       ├── config/                 # Configuration management
│       ├── database/               # DB connection & migrations
│       ├── modules/                # Feature modules (clean architecture)
│       │   ├── auth/               # Authentication (JWT, register, login)
│       │   ├── files/              # Encrypted file management
│       │   ├── embeddings/         # Embedding storage
│       │   ├── search/             # pgvector similarity search
│       │   ├── users/              # User profile & analytics
│       │   └── storage/            # Storage abstraction (local/S3)
│       ├── middleware/             # Express middleware
│       ├── utils/                  # Logger, errors, JWT utilities
│       └── types/                  # TypeScript types
└── frontend/                       # React + TypeScript + Vite SPA
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── Dockerfile
    └── src/
        ├── services/               # Client-side crypto, embeddings, extraction
        ├── store/                  # Zustand state management
        ├── components/             # Layout, UI, files, search components
        ├── pages/                  # Landing, Auth, Dashboard, Upload, Search...
        └── routes/                 # React Router configuration
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- Docker & Docker Compose

### Docker (Recommended)

```bash
---

## 🔐 How Zero-Knowledge Works

```
┌────────────────────────── CLIENT (Browser) ──────────────────────────┐
│  Password ──PBKDF2(600k)──▶ masterKey                                 │
│                                 │                                     │
│                    ┌────────────┴────────────┐                        │
│                    ▼                          ▼                        │
│               authKey                    encKey                       │
│            (sent to server)          (NEVER leaves client)            │
│                    │                          │                        │
│              Login/JWT            AES-256-GCM Encrypt                  │
│                                    Files + Filenames + Text → Embed    │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  (only encrypted files + embedding vectors)
                          ▼
┌────────────────────────── SERVER (Untrusted) ─────────────────────────┐
│   ┌──────────┐   ┌─────────────┐   ┌──────────────────────┐           │
│   │  Auth    │   │ File Store  │   │  pgvector (vectors)  │           │
│   │ (Argon2  │   │ (encrypted  │   │  (embeddings only)   │           │
│   │  hash)   │   │  blobs)     │   │                      │           │
│   └──────────┘   └─────────────┘   └──────────────────────┘           │
│   ❌ No plaintext  ❌ No keys  ❌ No passwords  ❌ No raw queries      │
└───────────────────────────────────────────────────────────────────────┘
```

### Key Separation
| Key | Derived From | Purpose | Sent to Server? |
|-----|-------------|---------|-----------------|
| `masterKey` | PBKDF2(password, salt, 600k) | Root derivation | ❌ Never |
| `authKey` | HKDF(masterKey, "auth") | Authentication | ✅ (as Argon2 hash) |
| `encKey` | HKDF(masterKey, "enc") | File encryption | ❌ Never |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow, security model |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete REST API reference |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database schema & pgvector setup |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |

---

## 🛡️ Security Notes

- Reference implementation — conduct a formal security audit before production use.
- The embedding model is downloaded on first use (~23 MB quantized).
- TLS/HTTPS is **mandatory** in production to protect the authKey in transit.
- Refresh tokens are stored in HTTP-only secure cookies.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

git clone <repo-url> Himanshu_project
cd Himanshu_project
cp .env.example .env
docker-compose up --build

# Frontend:  http://localhost:5173
# Backend:   http://localhost:4000
```

### Local Development

```bash
docker-compose up -d postgres

# Backend
cd backend && cp .env.example .env && npm install
npm run db:migrate && npm run dev

# Frontend (new terminal)
cd frontend && cp .env.example .env && npm install && npm run dev
```

- 🧠 Sentence-transformer embeddings (`all-MiniLM-L6-v2`) generated **in the browser** via Transformers.js
- 🔍 Semantic vector similarity search using **pgvector**
- 📄 Document text extraction (PDF, DOCX, TXT) — all client-side
- 🎯 Search queries embedded locally; server only sees the query vector

### Frontend
- 🎨 Modern UI inspired by Google Drive & Notion
- 📱 Responsive layout with dark mode
- 🖱️ Drag-and-drop file uploads
- 📈 Storage analytics dashboard
- 🔔 Toast notifications & progress bars
- 🎬 Smooth animations (Framer Motion)
