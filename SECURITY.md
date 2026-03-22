# Security

## Reporting Vulnerabilities

**Do NOT open public issues for security vulnerabilities.**

Email security concerns to: **security@paikos.app**

Include:

- Description of vulnerability
- Steps to reproduce
- Potential impact
- Your contact info

We'll respond within 48 hours.

---

## Security Practices Phase 1

### Environment Variables

- ❌ Never commit `.env` files
- ✅ Use `.env.example` templates with dummy values
- ✅ Store secrets in environment variables
- ✅ Rotate credentials regularly

### Authentication

- ✅ JWT tokens (15 min expiry for access)
- ✅ Refresh tokens in HttpOnly cookies
- ✅ Password hashing (bcrypt)
- ✅ Device fingerprint for guest quotas

### API Security

- ✅ Input validation (Zod)
- ✅ Rate limiting (quota enforcement)
- ✅ CORS configured
- ✅ No sensitive data in logs
- ✅ HTTPS only in production

### Database

- ✅ Parameterized queries (Drizzle ORM)
- ✅ SQL injection prevention
- ✅ Password hashing
- ✅ Token hashing

### Dependencies

```bash
# Check for vulnerabilities
pnpm audit
pip audit
```

---

## Best Practices

### Code Review

- All PRs reviewed before merge
- Focus on security issues
- Check for hardcoded secrets

### Token Handling

- Access tokens in memory, never localStorage
- Refresh tokens in HttpOnly cookies
- Never log tokens

### Error Messages

- Don't expose internal details
- Don't reveal if email exists (auth bypass)
- Log full errors server-side

### Quota System

- Enforce on server side
- Client-side for UX only
- Redis is authoritative for guests
- PostgreSQL for authenticated users

---

## Questions?

Email: **security@paikos.app**

See [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md) for development security standards.
