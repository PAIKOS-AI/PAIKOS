# PAIKOS — LLM Chat Application

## Phase 1: Engineering Guidelines

> A production-ready chat interface powered by Claude, with streaming responses, session management, and tiered quotas.

---

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Branching Strategy](#branching-strategy)
3. [Commit Conventions](#commit-conventions)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Project Structure](#project-structure)

---

## Development Workflow

### Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# 3. Setup database
cd apps/api
pnpm db:push  # Create PostgreSQL schema

# 4. Start dev servers
pnpm dev
```

### Daily Workflow

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/description

# Make changes and test
pnpm lint
pnpm test
pnpm format

# Commit with conventional message
git commit -m "feat(api): add quota tracking"

# Push and open PR to dev
git push origin feature/description
```

---

## Branching Strategy

```
main (production)
  ↑
  └── PR from dev (after QA)

dev (integration)
  ↑
  ├── feature/auth
  ├── feature/quota
  ├── feature/streaming
  ├── bugfix/session-error
  └── ...
```

### Branch Naming

- `feature/<scope>/<description>` — New features
- `bugfix/<scope>/<description>` — Bug fixes
- `hotfix/<critical-issue>` — Critical production fixes
- `docs/<topic>` — Documentation updates

**Scopes:** `api`, `web`, `db`, `auth`, `chat`

### Rules

- Always create branches from `dev` (except hotfixes from `main`)
- PR to `dev` for review, never push directly
- Delete branch after merge
- Rebase regularly to stay updated: `git rebase origin/dev`

---

## Commit Conventions

### Format

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Code formatting
- `refactor` — Code restructuring
- `perf` — Performance improvement
- `test` — Tests
- `chore` — Build/dependencies

### Examples

```
feat(api): implement session quota enforcement
fix(web): resolve streaming overflow on mobile
docs(readme): update setup instructions
refactor(db): simplify message indexing
```

### Rules

- Use lowercase
- Imperative mood ("add" not "added")
- No period at end
- Subject max 50 characters
- Reference issues: `Closes #123`

---

## Code Standards

### TypeScript (Web & API)

- ✅ Enable strict mode (`"strict": true`)
- ✅ No `any` types without justification
- ✅ Export typed DTOs for API responses
- ✅ Use `const` assertions for literal types
- ✅ Add JSDoc for public functions

**Example:**

```typescript
/**
 * Create a new chat session
 * @param userId - The user's UUID
 * @throws Error if user quota exceeded
 */
export async function createSession(userId: string): Promise<Session> {
  // implementation
}
```

### Python (API when used)

- ✅ Follow PEP 8
- ✅ Add type hints
- ✅ Max line length: 88 (Black)

### HTML/CSS (Next.js)

- ✅ Use Tailwind utility classes
- ✅ Use shadcn/ui components
- ✅ No inline styles
- ✅ Responsive design (mobile first)

### File Organization

```
apps/web/src/
├── app/                    # Next.js app routes
├── components/             # React components
│   ├── chat/
│   ├── auth/
│   └── common/
├── lib/
│   ├── api-client.ts       # API requests
│   ├── auth.ts             # Auth logic
│   ├── quota.ts            # Quota checking
│   └── db/                 # IndexedDB functions
└── hooks/                  # Custom React hooks

apps/api/src/
├── routes/                 # Hono route handlers
├── services/               # Business logic
├── db/                     # Database queries (Drizzle)
├── middleware/             # Auth, logging, etc.
└── types/                  # Shared types
```

---

## Testing

### Unit Tests (Vitest)

```bash
pnpm test                # Run all tests
pnpm test --watch       # Watch mode
pnpm test --coverage    # With coverage
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e           # Run E2E tests
pnpm test:e2e --ui      # UI mode
```

### Test Requirements

- **Critical paths** — Quota enforcement, auth, payment
- **API routes** — All endpoints must have tests
- **State management** — Store logic tests
- **Utils** — Helper function tests

### Test Structure

```typescript
describe("createSession", () => {
  it("should create session if quota available", async () => {
    // Arrange
    const userId = "test-user"

    // Act
    const session = await createSession(userId)

    // Assert
    expect(session).toBeDefined()
    expect(session.userId).toBe(userId)
  })

  it("should reject if quota exceeded", async () => {
    // Arrange
    const userId = "quota-exceeded"

    // Act & Assert
    await expect(createSession(userId)).rejects.toThrow("QUOTA_EXCEEDED")
  })
})
```

---

## Code Quality

### Linting

```bash
pnpm lint           # Check for issues
pnpm lint:fix       # Fix automatically
```

### Formatting

```bash
pnpm format         # Format code (Prettier)
pnpm format:check   # Check if formatted
```

### Pre-commit Hooks (Husky)

✅ Automatically runs before commit:

- ESLint check
- Prettier format
- Commit message validation

To skip (not recommended):

```bash
git commit --no-verify
```

---

## Project Structure

### Core Folders

```
apps/
├── web/                # Next.js frontend (Next.js 15, App Router)
│   ├── src/app/       # Routes
│   ├── src/components/ # UI components (shadcn/ui)
│   └── src/lib/       # Utilities (API client, state, DB)
│
└── api/               # Hono.js backend (on Bun runtime)
    ├── src/routes/    # API endpoints
    ├── src/services/  # Business logic
    ├── src/db/        # Drizzle schema & queries
    └── src/middleware/# Auth, logging

packages/
├── db/                # Shared database schema
└── shared-types/      # TypeScript interfaces (API DTOs)
```

### Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Zustand, Tailwind
- **API:** Hono.js on Bun, Drizzle ORM, Zod validation
- **Database:** PostgreSQL (authenticated), IndexedDB (guests)
- **Auth:** Auth.js v5 (JWT + refresh tokens)
- **LLM:** Anthropic Claude 3.5 Sonnet
- **Streaming:** Vercel AI SDK + SSE
- **Dev:** Turborepo, pnpm, Vitest, Playwright

---

## Phase 1 Scope

### Included ✅

- Email & OAuth authentication (Google, GitHub)
- Guest mode with device fingerprint
- Session management (start, list, archive)
- Real-time streaming chat with Claude
- Token quota system (3/day guests, 5/day free users)
- Message history (PostgreSQL for auth, IndexedDB for guests)
- Responsive mobile UI
- Error handling & validation

### Not Included (Phase 2+)

- Voice input/output
- Graph visualization
- Memory/long-term context
- Pro plan payment
- Admin dashboard

---

## Common Commands

```bash
# Development
pnpm dev                 # Start all dev servers
pnpm build               # Build for production
pnpm format              # Auto-format code
pnpm lint:fix            # Fix lint issues

# Database
pnpm db:push             # Create schema in PostgreSQL
pnpm db:studio           # Open Drizzle Studio
pnpm db:reset            # Reset DB (development only)

# Testing
pnpm test                # Run unit tests
pnpm test:e2e            # Run E2E tests
pnpm test:coverage       # Coverage report

# Specific workspace
cd apps/web && pnpm dev  # Frontend only
cd apps/api && pnpm dev  # API only
```

---

## Environment Variables

### apps/web/.env

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ANTHROPIC_KEY=your-key          # Optional: client-side rate limiting
```

### apps/api/.env

```
DATABASE_URL=postgresql://user:pass@localhost:5432/paikos
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-random-secret
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3001
```

---

## Git Workflow Checklist

- [ ] Pull latest from dev
- [ ] Create feature branch
- [ ] Make changes
- [ ] Run `pnpm lint:fix && pnpm format && pnpm test`
- [ ] Commit with conventional message
- [ ] Push branch
- [ ] Create PR on GitHub
- [ ] Wait for review & approval
- [ ] Merge to dev
- [ ] Delete branch
- [ ] Celebrate! 🎉

---

## Questions?

- **Setup issues** → See README.md
- **How to contribute** → See CONTRIBUTING.md
- **Code style questions** → Check examples above
- **Security concerns** → See SECURITY.md

---

**Last Updated:** March 2026 | **Phase:** 1 (Active Build)
