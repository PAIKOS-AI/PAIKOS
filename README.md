# PAIKOS — LLM Chat Application

> A production-ready Phase 1 implementation of an AI chat interface with Claude, streaming responses, session management, and tiered quotas.

# PAIKOS — LLM Chat Application

> A production-ready Phase 1 implementation of an AI chat interface with Claude, streaming responses, session management, and tiered quotas.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Create database
cd apps/api && pnpm db:push

# Start dev servers
pnpm dev
```

**URLs:**

- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/docs

---

## 📋 What's Included

### Phase 1 Features ✅

- Email & OAuth authentication (Google, GitHub)
- Guest mode with local storage
- Session management (create, list, archive)
- Real-time streaming chat with Claude 3.5 Sonnet
- Token quota system:
  - **Guest:** 3 sessions/day, 8K tokens per session
  - **Free:** 5 sessions/day, 16K tokens per session
- Message history (PostgreSQL for users, IndexedDB for guests)
- Mobile-responsive UI

### Not in Phase 1

- Voice (Phase 2)
- Graph visualization (Phase 2)
- Memory/context (Phase 2)
- Payment system (Phase 3)

---

## 🏗️ Architecture

```
Next.js Frontend (3000)
    ↓ SSE / REST
Hono API Server (3001)
    ↓ SQL
PostgreSQL + IndexedDB
    ↓
Anthropic Claude API
```

### Tech Stack

| Layer         | Tech                 | Reason                        |
| ------------- | -------------------- | ----------------------------- |
| Frontend      | Next.js 15, React 19 | App Router, streaming support |
| API           | Hono.js on Bun       | Lightweight, TypeScript-first |
| Database      | PostgreSQL + Drizzle | Type-safe ORM                 |
| Guest Storage | IndexedDB (Dexie.js) | Browser-side persistence      |
| State         | Zustand              | Lightweight, performant       |
| Auth          | Auth.js v5           | JWT + OAuth support           |
| LLM           | Anthropic Claude     | Best quality, streaming       |
| Streaming     | Vercel AI SDK        | useChat hook                  |
| UI            | Tailwind + shadcn/ui | Beautiful, accessible         |

---

## 📁 Project Structure

```
paikos/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── src/app/         # Routes
│   │   ├── src/components/  # React components
│   │   ├── src/lib/         # Utilities
│   │   └── .env.example
│   │
│   └── api/                  # Hono API server
│       ├── src/routes/      # API endpoints
│       ├── src/services/    # Business logic
│       ├── src/db/          # Drizzle schema
│       └── .env.example
│
├── packages/
│   ├── db/                   # Shared schema
│   └── shared-types/         # TypeScript types
│
├── ENGINEERING_GUIDELINES.md # Dev standards
├── CONTRIBUTING.md           # How to contribute
├── README.md                 # This file
└── .github/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

---

## 🔑 Key Concepts

### Sessions & Quotas

A **session** is created when a user sends their FIRST message in a new chat (not when opening the app). This prevents quota games.

```
User opens app
    ↓
User types message
    ↓
[Check daily quota]
    ↓
Create session in DB
    ↓
Stream chat response
    ↓
Track tokens consumed
```

### Authentication

- **Access Token** — 15 min expiry, memory storage
- **Refresh Token** — 30 days, HttpOnly cookie
- **Guest ID** — Device fingerprint in localStorage

### Database

- **Authenticated users** → PostgreSQL (persistent)
- **Guests** → IndexedDB (browser-local)

---

## 🛠️ Development

### Common Commands

```bash
pnpm dev              # Start all services
pnpm build            # Production build
pnpm lint             # Check code
pnpm lint:fix         # Fix issues
pnpm format           # Format code
pnpm test             # Run tests
pnpm test:e2e         # E2E tests
```

### Database

```bash
cd apps/api
pnpm db:push          # Create/update schema
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed          # Seed test data
```

### Debugging

```bash
# API server
cd apps/api && pnpm dev

# Frontend
cd apps/web && pnpm dev

# Check API responses
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/sessions
```

---

## 📚 Documentation

- **[ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md)** — Development standards, branching, commits
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** — Community guidelines
- **[SECURITY.md](./SECURITY.md)** — Security policies
- **[Phase 1 Spec](./development-phases/Phase_1.md)** — Complete API specification

---

## ✨ Before You Start

1. **Read** [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md)
2. **Setup** environment files (`.env`)
3. **Run** `pnpm install && pnpm dev`
4. **Check** http://localhost:3000 for the UI
5. **Make** a feature branch: `git checkout -b feature/description`

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- How to report bugs
- How to request features
- Pull request process
- Code review guidelines

---

## 🔐 Security

See [SECURITY.md](./SECURITY.md) for:

- Environment variable management
- Token handling
- API rate limiting
- Quota enforcement

---

## 📞 Support

- **Questions** → Open a GitHub issue
- **Bug report** → Use issue template
- **Security** → See SECURITY.md

---

**Phase:** 1 (Active Build) | **Updated:** March 2026 | **Status:** Production-Ready Template
