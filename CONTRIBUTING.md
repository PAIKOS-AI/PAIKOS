# Contributing to PAIKOS

Thanks for wanting to contribute! This guide will help you get started.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL (optional for local dev)

### Setup

```bash
# Clone repository
git clone https://github.com/PAIKOS-AI/PAIKOS.git
cd PAIKOS

# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Create database and start dev
cd apps/api && pnpm db:push
cd ../..
pnpm dev
```

---

## 📝 Making Changes

### Create a Branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/description
```

### Commit with Conventional Messages

```bash
feat(api): add session listing endpoint
fix(web): resolve message overflow on mobile
docs: update quota explanation
```

**Format:** `<type>(<scope>): <message>`

See [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md#commit-conventions) for details.

### Test Your Changes

```bash
pnpm lint:fix              # Fix linting
pnpm format                # Format code
pnpm test                  # Run tests
```

### Push and Create PR

```bash
git push origin feature/description
# Then open PR on GitHub
```

---

## 🎯 What to Work On

### Good First Issues

Look for `good-first-issue` label in [Issues](https://github.com/PAIKOS-AI/PAIKOS/issues).

### Ideas for Phase 1

- Email validation improvements
- Better error messages in UI
- More comprehensive tests
- Performance optimizations
- Documentation improvements

### Before Starting

- Check [existing issues](https://github.com/PAIKOS-AI/PAIKOS/issues)
- Open an issue to discuss larger changes
- Comment to claim a task

---

## 🧪 Testing

### Unit Tests

```bash
pnpm test                    # Run all
pnpm test --watch           # Watch mode
pnpm test --coverage        # With coverage
```

### E2E Tests

```bash
pnpm test:e2e                # Headless
pnpm test:e2e --ui           # Interactive
```

### What to Test

- Critical business logic (quota, auth)
- API endpoints
- State management
- Helper functions

---

## 📋 Pull Request Checklist

- [ ] Code follows [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md)
- [ ] Tests added/updated
- [ ] `pnpm lint:fix` runs clean
- [ ] `pnpm test` passes
- [ ] No console.logs left
- [ ] PR description is clear
- [ ] Related issue linked

---

## 🤔 Questions?

- **Setup issues** → Check README.md
- **Code style** → See ENGINEERING_GUIDELINES.md
- **How things work** → See [Phase 1 Spec](./development-phases/Phase_1.md)
- **Security concerns** → See SECURITY.md

---

## Code Review

### As Author

- Be responsive to feedback
- Ask clarifying questions
- Don't take criticism personally

### As Reviewer

- Be constructive and respectful
- Approve when satisfied
- Suggest improvements, don't demand

---

**Ready?** Check out [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md) and pick an issue!
