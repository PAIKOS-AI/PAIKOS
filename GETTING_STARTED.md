# Getting Started with PAIKOS

This is a Phase 1 production-ready LLM chat application built with Next.js, Hono, and PostgreSQL.

---

## 📋 Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **PostgreSQL 14+** (for production; SQLite works for local dev)

---

## 🚀 5-Minute Setup

### 1. Clone & Install

```bash
git clone https://github.com/PAIKOS-AI/PAIKOS.git
cd PAIKOS
pnpm install
```

### 2. Configure Environment

```bash
# Copy templates (create your own .env files)
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Edit files with your values
nano apps/web/.env
nano apps/api/.env
```

### 3. Setup Database

```bash
cd apps/api
pnpm db:push           # Create schema
pnpm db:seed           # Optional: seed test data
cd ../..
```

### 4. Start Development

```bash
pnpm dev
```

**Open browser to:**

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **API Docs:** http://localhost:3001/docs (if Swagger enabled)

---

## 📚 Key Documentation

Read these in order:

1. **[README.md](./README.md)** — Project overview
2. **[ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md)** — Development standards
3. **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute
4. **[SECURITY.md](./SECURITY.md)** — Security practices
5. **[Phase 1 Spec](./development-phases/Phase_1.md)** — Complete API spec

---

## 🛠️ Common Tasks

### Start Development

```bash
pnpm dev                 # All services
cd apps/web && pnpm dev   # Frontend only
cd apps/api && pnpm dev   # API only
```

### Code Quality

```bash
pnpm lint              # Check for issues
pnpm lint:fix          # Fix automatically
pnpm format            # Format code
pnpm test              # Run tests
pnpm test:e2e          # End-to-end tests
```

### Database

```bash
cd apps/api
pnpm db:push           # Create/update schema
pnpm db:studio         # Open Drizzle Studio (visual editor)
pnpm db:seed           # Seed test data
```

---

## 🔄 Git Workflow

### Creating a Feature

```bash
# 1. Update dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/description

# 3. Make changes & commit
git commit -m "feat(scope): description"

# 4. Push and create PR
git push origin feature/description
```

### Commit Message Format

```
feat(api): add message streaming
fix(web): resolve button overflow
docs: update setup instructions
```

See [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md#commit-conventions) for details.

---

## 🐛 Troubleshooting

### pnpm install fails

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database connection error

```bash
# Check environment variables in apps/api/.env
# Make sure PostgreSQL is running
# Test connection: psql $DATABASE_URL
```

### Build fails

```bash
pnpm clean              # Remove build artifacts
pnpm build              # Try again
```

### Git hooks block commit

```bash
# Fix issues that git hooks detected
pnpm lint:fix
pnpm format
pnpm test

# Then commit again
```

---

## 📖 Project Structure

```
paikos/
├── apps/
│   ├── web/           # Next.js frontend (port 3000)
│   └── api/           # Hono API (port 3001)
├── packages/
│   ├── db/            # Database schema
│   └── shared-types/  # Shared TypeScript types
├── ENGINEERING_GUIDELINES.md
├── CONTRIBUTING.md
├── README.md
└── development-phases/
    └── Phase_1.md     # Complete specification
```

---

## 🤝 Making Your First Contribution

1. **Pick a task**
   - Browse [Issues](https://github.com/PAIKOS-AI/PAIKOS/issues)
   - Look for `good-first-issue` label

2. **Read guidelines**
   - [CONTRIBUTING.md](./CONTRIBUTING.md)
   - [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md)

3. **Make a branch**

   ```bash
   git checkout -b feature/your-feature
   ```

4. **Make changes & test**

   ```bash
   pnpm lint:fix
   pnpm format
   pnpm test
   ```

5. **Commit & push**

   ```bash
   git commit -m "feat(scope): description"
   git push origin feature/your-feature
   ```

6. **Create PR on GitHub**

---

## 📞 Need Help?

- **Setup issues** → Check README.md or CONTRIBUTING.md
- **Code questions** → See ENGINEERING_GUIDELINES.md
- **Security** → See SECURITY.md
- **API docs** → See [Phase 1 Spec](./development-phases/Phase_1.md)
- **Open an issue** → https://github.com/PAIKOS-AI/PAIKOS/issues

---

**You're all set! Start with `pnpm dev` and happy coding! 🚀**
