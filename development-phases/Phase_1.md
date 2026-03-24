# paikos

## Phase 1 — LLM Chat Application

_Production-Ready Engineering Specification_

**Version** 1.0.0 | **Status** Phase 1 — Active Build | **Author** Vishal

---

## What This Document Covers

- Complete API specification for all Phase 1 endpoints
- Database schema for PostgreSQL (authenticated) and IndexedDB (guest)
- Session and token quota architecture
- Authentication flow with JWT + refresh tokens
- Streaming chat via Server-Sent Events (SSE)
- Frontend data layer and state management
- Error handling standards and HTTP response codes
- Deployment, environment variables, and production checklist

---

# 1. Architecture Overview

Phase 1 is a production-ready LLM chat application with streaming responses, session management, token tracking, a tiered free-tier quota system, and dual-storage (browser for guests, PostgreSQL for authenticated users). Voice, graph visualization, and memory are Phase 2+.

## 1.1 System Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                        │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────┐   │
│  │  Chat UI  │───▶│ Zustand Store│───▶│   Quota Manager    │   │
│  └──────────┘    └──────────────┘    └────────────────────┘   │
│         │                │                     │               │
│         │                ▼                     ▼               │
│         │       ┌──────────────┐    ┌────────────────────┐   │
│         │       │  IndexedDB   │    │  localStorage      │   │
│         │       │ (guest chats)│    │(session counters)  │   │
│         │       └──────────────┘    └────────────────────┘   │
└─────────┼───────────────────────────────────────────────────────┘
          │ SSE / REST (HTTPS)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (Hono.js)                        │
│                                                                 │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
│  │ Auth Router│  │ Chat Router  │  │  Sessions Router      │  │
│  └────────────┘  └─────────────┘  └───────────────────────┘  │
│          │               │                    │                │
│          ▼               ▼                    ▼                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │               Service Layer                               │ │
│  │  AuthService  |  ChatService  |  QuotaService             │ │
│  └──────────────────────────────────────────────────────────┘ │
│          │               │                    │                │
│          ▼               ▼                    ▼                │
│  ┌──────────────┐ ┌─────────────┐  ┌─────────────────────┐  │
│  │ Drizzle ORM  │ │  Anthropic  │  │  Redis (BullMQ)     │  │
│  │  PostgreSQL  │ │  Claude API │  │  Rate Limiting       │  │
│  └──────────────┘ └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Technology Stack

| Layer               | Technology                                    | Reason                                                       |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| **Monorepo**        | **Turborepo**                                 | **Task orchestration, remote caching, parallel builds**      |
| **Package Manager** | **pnpm**                                      | **Fast installs, strict hoisting, native workspace support** |
| Framework           | Next.js 15 (App Router)                       | File-based routing, RSC, built-in edge                       |
| API Server          | Hono.js on Bun                                | TypeScript-first, edge-compatible, fast                      |
| ORM                 | Drizzle ORM                                   | Type-safe SQL, zero-runtime overhead                         |
| Database            | PostgreSQL 16 + pgvector                      | ACID, relational, future vector support                      |
| Auth                | Auth.js v5 (NextAuth)                         | JWTs, OAuth, session abstraction                             |
| Cache / Rate-limit  | Redis (Upstash or self-hosted)                | Atomic counters, ephemeral quotas                            |
| LLM                 | Anthropic Claude 3.5 Sonnet                   | Streaming, function-calling ready                            |
| AI SDK              | Vercel AI SDK                                 | useChat hook, SSE streaming                                  |
| Guest Storage       | IndexedDB (Dexie.js)                          | Structured offline browser storage                           |
| State Mgmt          | Zustand                                       | Lightweight, no boilerplate                                  |
| Styling             | Tailwind CSS + shadcn/ui                      | Utility-first, accessible components                         |
| Validation          | Zod                                           | Runtime schema + TypeScript inference                        |
| Testing             | Vitest + Playwright                           | Unit + E2E                                                   |
| Deploy              | Vercel (apps/web) + Railway/Fly.io (apps/api) | Zero-config CI/CD, per-app deploy                            |

---

# 2. Session & Quota Model

The quota system is the most important business logic in Phase 1. It must be correct, consistent, and hard to game.

## 2.1 Definitions

| Term                | Definition                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Session             | A single conversation thread. One session = one chat topic. A user opens a new session to start a new conversation. |
| Daily Session Quota | Number of sessions a user can START per UTC day. Separate from message count within a session.                      |
| Token Budget        | Total input + output tokens consumed across all messages in a session. Tracked for billing/abuse.                   |
| Guest               | Unauthenticated browser. Identified by a device fingerprint stored in localStorage.                                 |
| Authenticated User  | User with a verified account. Identified by their user_id JWT claim.                                                |

## 2.2 Quota Tiers

| Tier             | Sessions / Day  | Token Limit / Session | Message History          | Storage    |
| ---------------- | --------------- | --------------------- | ------------------------ | ---------- |
| Guest            | 3               | 8,000 tokens          | Browser only (IndexedDB) | IndexedDB  |
| Free (Logged In) | 5 (3 + 2 bonus) | 16,000 tokens         | Cloud (PostgreSQL)       | PostgreSQL |
| Pro (future)     | Unlimited       | 100,000 tokens        | Cloud (PostgreSQL)       | PostgreSQL |

> 🔑 **Key Rule**
> A "session" is created when the user sends their FIRST message in a new chat. Not when they open the app. This prevents quota exhaustion from abandoned tabs.

> ⚠️ **Guest Quota Enforcement**
> Guest quota is tracked in two places: (1) Redis — for server-side enforcement, keyed by device fingerprint. (2) localStorage — for immediate client-side feedback without a round-trip. Redis is authoritative. If they conflict, Redis wins.

## 2.3 Quota Flow Diagram

```text
User sends first message in new chat
              │
              ▼
     ┌─────────────────┐
     │ Is user logged  │
     │      in?        │
     └─────────────────┘
        │           │
       YES          NO
        │           │
        ▼           ▼
  Check user_id  Check device_fingerprint
  quota in Redis  quota in Redis
        │           │
   ┌────┴────┐  ┌───┴────┐
   │ < 5/day?│  │ < 3/day│
   └────┬────┘  └───┬────┘
      YES│         YES│
         │            │
  Increment counter  Increment counter
  Create session in  Store session in
  PostgreSQL         IndexedDB
         │            │
         └─────┬──────┘
               │
         Stream response
               │
        Track token usage
```

---

# 3. Database Schema

## 3.1 PostgreSQL Schema (Authenticated Users)

```sql
-- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  password_hash TEXT,                -- null if OAuth-only user
  provider      TEXT NOT NULL DEFAULT 'email',  -- email | google | github
  plan          TEXT NOT NULL DEFAULT 'free',   -- free | pro
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sessions (chat threads)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'New Chat',
  model         TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  token_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- messages
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  role          TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content       TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  model         TEXT,
  finish_reason TEXT,   -- stop | max_tokens | error
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session_id ON messages(session_id, created_at ASC);

-- daily_usage (quota tracking)
CREATE TABLE daily_usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  sessions_started INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

-- refresh_tokens
CREATE TABLE refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT UNIQUE NOT NULL,   -- SHA-256 of raw token
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

## 3.2 IndexedDB Schema (Guest Users — Browser)

Implemented with Dexie.js. This mirrors the PostgreSQL schema closely so a "merge on login" feature can be added in Phase 2 without schema changes.

```typescript
// src/lib/db/guest-db.ts
import Dexie, { Table } from "dexie"

export interface GuestSession {
  id: string // nanoid()
  title: string
  model: string
  tokenCount: number
  isArchived: boolean
  createdAt: number // Unix ms
  updatedAt: number
}

export interface GuestMessage {
  id: string
  sessionId: string
  role: "user" | "assistant"
  content: string
  inputTokens: number
  outputTokens: number
  createdAt: number
}

export interface GuestDailyUsage {
  date: string // YYYY-MM-DD
  sessionsStarted: number
  totalTokens: number
}

export class GuestDatabase extends Dexie {
  sessions!: Table<GuestSession>
  messages!: Table<GuestMessage>
  dailyUsage!: Table<GuestDailyUsage>

  constructor() {
    super("paikos__guest")
    this.version(1).stores({
      sessions: "id, createdAt, isArchived",
      messages: "id, sessionId, createdAt",
      dailyUsage: "date",
    })
  }
}

export const guestDb = new GuestDatabase()
```

---

# 4. Authentication Architecture

JWT-based auth with short-lived access tokens (15 min) and long-lived refresh tokens (30 days). Refresh tokens are stored in HttpOnly cookies. Access tokens are stored in memory (Zustand), never in localStorage.

## 4.1 Token Strategy

| Token              | Storage          | TTL        | Purpose                       |
| ------------------ | ---------------- | ---------- | ----------------------------- |
| Access JWT         | Memory (Zustand) | 15 minutes | Authorize API requests        |
| Refresh Token      | HttpOnly Cookie  | 30 days    | Silently refresh access token |
| Device Fingerprint | localStorage     | Permanent  | Guest quota enforcement       |

## 4.2 JWT Payload

```typescript
interface JWTPayload {
  sub: string // user_id (UUID)
  email: string
  plan: "free" | "pro"
  iat: number // issued at
  exp: number // expiry
}
```

## 4.3 Device Fingerprint (Guest)

```typescript
// src/lib/guest-identity.ts
export function getDeviceFingerprint(): string {
  const KEY = "paikos_device_id"
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
```

---

# 5. API Specification

All endpoints live under the base path `/api/v1`. The API server is Hono.js running on Bun. All request and response bodies are `application/json` unless specified (SSE endpoints return `text/event-stream`).

## 5.0 Global Standards

| Convention   | Value                                               |
| ------------ | --------------------------------------------------- |
| Base URL     | `https://api.paikos.app/api/v1`                     |
| Auth Header  | `Authorization: Bearer <access_token>`              |
| Content-Type | `application/json`                                  |
| Date Format  | ISO 8601 — `2024-12-01T10:30:00Z`                   |
| ID Format    | UUID v4                                             |
| Error Shape  | `{ error: string, code: string, details?: object }` |
| Pagination   | cursor-based: `{ data, nextCursor, hasMore }`       |

## 5.1 Standard Error Response

```typescript
interface ErrorResponse {
  error: string;        // Human-readable message
  code: string;         // Machine-readable error code
  details?: unknown;    // Zod errors, validation info, etc.
  requestId: string;    // For support/debugging
}

// Example:
{
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND",
  "requestId": "req_01hx..."
}
```

## 5.2 HTTP Status Code Reference

| Code                        | Meaning                         | When Used                              |
| --------------------------- | ------------------------------- | -------------------------------------- |
| `200 OK`                    | Success                         | GET, PATCH, DELETE that returns data   |
| `201 Created`               | Resource created                | POST that creates a new resource       |
| `204 No Content`            | Success, no body                | DELETE with no return data             |
| `400 Bad Request`           | Invalid input                   | Zod validation failure, malformed JSON |
| `401 Unauthorized`          | Not authenticated               | Missing/invalid/expired access token   |
| `403 Forbidden`             | Authenticated but no permission | Accessing another user's session       |
| `404 Not Found`             | Resource does not exist         | Session ID, message ID not found       |
| `409 Conflict`              | State conflict                  | Email already registered               |
| `422 Unprocessable`         | Semantic validation error       | Token limit exceeded mid-stream        |
| `429 Too Many Requests`     | Rate limit / quota exceeded     | Daily session quota hit                |
| `500 Internal Server Error` | Unexpected server error         | Uncaught exception                     |
| `503 Service Unavailable`   | Upstream down                   | Claude API unavailable                 |

---

## 5.3 Auth Endpoints

### `POST /auth/register` — Register a new user with email + password

#### Request Body

```json
{
  "email": "vishal@example.com",
  "password": "SecurePass123!",
  "name": "Vishal"
}
```

#### Responses

| Code              | Body                                                      | When                           |
| ----------------- | --------------------------------------------------------- | ------------------------------ |
| `201 Created`     | `{ user: UserDTO, accessToken: string }`                  | Account created successfully   |
| `400 Bad Request` | `{ error, code: "VALIDATION_ERROR", details: ZodErrors }` | Invalid email or weak password |
| `409 Conflict`    | `{ error, code: "EMAIL_TAKEN" }`                          | Email already registered       |

#### Response Body (201)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "vishal@example.com",
    "name": "Vishal",
    "plan": "free",
    "createdAt": "2024-12-01T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
// Refresh token is set as HttpOnly cookie: paikos_refresh
```

---

### `POST /auth/login` — Authenticate with email + password

#### Request Body

```json
{
  "email": "vishal@example.com",
  "password": "SecurePass123!"
}
```

#### Responses

| Code               | Body                                     | When                    |
| ------------------ | ---------------------------------------- | ----------------------- |
| `200 OK`           | `{ user: UserDTO, accessToken: string }` | Login successful        |
| `400 Bad Request`  | `{ error, code: "VALIDATION_ERROR" }`    | Missing fields          |
| `401 Unauthorized` | `{ error, code: "INVALID_CREDENTIALS" }` | Wrong email or password |

---

### `POST /auth/refresh` — Exchange refresh token for new access token

No request body needed. Reads the `paikos_refresh` HttpOnly cookie automatically.

#### Responses

| Code               | Body                                       | When                                |
| ------------------ | ------------------------------------------ | ----------------------------------- |
| `200 OK`           | `{ accessToken: string }`                  | New access token issued             |
| `401 Unauthorized` | `{ error, code: "REFRESH_TOKEN_INVALID" }` | Cookie missing, expired, or revoked |

---

### `POST /auth/logout` — Revoke refresh token and clear cookie

#### Headers

```
Authorization: Bearer <access_token>    // optional but recommended
```

#### Responses

| Code             | Body      | When                                       |
| ---------------- | --------- | ------------------------------------------ |
| `204 No Content` | _(empty)_ | Logged out. Cookie cleared. Token revoked. |

---

### `GET /auth/me` — Get current authenticated user

#### Headers

```
Authorization: Bearer <access_token>    // required
```

#### Responses

| Code               | Body                               | When                 |
| ------------------ | ---------------------------------- | -------------------- |
| `200 OK`           | `{ user: UserDTO }`                | Token valid          |
| `401 Unauthorized` | `{ error, code: "TOKEN_EXPIRED" }` | Access token expired |

#### UserDTO

```typescript
interface UserDTO {
  id: string
  email: string
  name: string | null
  plan: "free" | "pro"
  createdAt: string
}
```

---

## 5.4 Quota Endpoints

### `GET /quota` — Get current quota status

#### Headers (authenticated)

```
Authorization: Bearer <access_token>
```

#### Headers (guest)

```
X-Device-ID: <device_fingerprint>    // required for guests
```

#### Responses

| Code              | Body                                   | When                                     |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| `200 OK`          | `QuotaDTO`                             | Always returns status                    |
| `400 Bad Request` | `{ error, code: "MISSING_DEVICE_ID" }` | Guest request without X-Device-ID header |

#### QuotaDTO

```typescript
interface QuotaDTO {
  tier: "guest" | "free" | "pro";
  sessionsUsedToday: number;
  sessionLimitPerDay: number;
  sessionsRemaining: number;
  resetAt: string;    // UTC midnight ISO 8601
  tokensUsedToday: number;
}

// Example response:
{
  "tier": "free",
  "sessionsUsedToday": 2,
  "sessionLimitPerDay": 5,
  "sessionsRemaining": 3,
  "resetAt": "2024-12-02T00:00:00Z",
  "tokensUsedToday": 14200
}
```

---

## 5.5 Session Endpoints

> 📌 **Sessions = Chat Threads**
> A session represents one conversation. Creating a session is gated by the daily quota. Guests can have up to 3 sessions per day; authenticated free users up to 5.

### `POST /sessions` — Create a new chat session (triggers quota check)

**Auth:** Optional. If no `Authorization` header, `X-Device-ID` is required. This is the **ONLY** endpoint that increments the daily session counter.

#### Request Body

```json
{
  "title": "Understanding React hooks",
  "model": "claude-3-5-sonnet-20241022"
}
```

#### Responses

| Code                    | Body                                   | When                               |
| ----------------------- | -------------------------------------- | ---------------------------------- |
| `201 Created`           | `SessionDTO`                           | Session created, quota incremented |
| `400 Bad Request`       | `{ error, code: "VALIDATION_ERROR" }`  | Invalid model or title too long    |
| `400 Bad Request`       | `{ error, code: "MISSING_DEVICE_ID" }` | Guest without device ID header     |
| `401 Unauthorized`      | `{ error, code: "TOKEN_EXPIRED" }`     | Expired access token               |
| `429 Too Many Requests` | `QuotaExhaustedError`                  | Daily session limit reached        |

#### QuotaExhaustedError (429 body)

```json
{
  "error": "Daily session limit reached",
  "code": "QUOTA_EXHAUSTED",
  "details": {
    "tier": "guest",
    "limitPerDay": 3,
    "resetAt": "2024-12-02T00:00:00Z",
    "upgradeUrl": "/login"
  },
  "requestId": "req_01hx..."
}
```

#### SessionDTO

```typescript
interface SessionDTO {
  id: string
  title: string
  model: string
  tokenCount: number
  isArchived: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}
```

---

### `GET /sessions` — List all sessions for the authenticated user

**Auth Required:** Yes

#### Query Params

| Param      | Type    | Default | Description                    |
| ---------- | ------- | ------- | ------------------------------ |
| `limit`    | integer | 20      | Max 50                         |
| `cursor`   | string  | null    | Pagination cursor (session ID) |
| `archived` | boolean | false   | Include archived sessions      |
| `search`   | string  | null    | Full-text search on title      |

#### Response (200)

```json
{
  "data": "SessionDTO[]",
  "nextCursor": "550e8400... | null",
  "hasMore": true
}
```

---

### `GET /sessions/:sessionId` — Get a single session with its messages

**Auth:** Required for cloud sessions. Guests use IndexedDB directly — this endpoint is not called for guest sessions.

#### Responses

| Code               | Body                                       | When                              |
| ------------------ | ------------------------------------------ | --------------------------------- |
| `200 OK`           | `SessionDTO & { messages: MessageDTO[] }`  | Found and authorized              |
| `401 Unauthorized` | `{ error, code: "TOKEN_EXPIRED" }`         | Not authenticated                 |
| `403 Forbidden`    | `{ error, code: "SESSION_ACCESS_DENIED" }` | Session belongs to different user |
| `404 Not Found`    | `{ error, code: "SESSION_NOT_FOUND" }`     | Session does not exist            |

---

### `PATCH /sessions/:sessionId` — Update session title or archived status

**Auth Required:** Yes

#### Request Body

```json
{
  "title": "Updated title",
  "isArchived": true
}
```

#### Responses

| Code              | Body                                       | When                   |
| ----------------- | ------------------------------------------ | ---------------------- |
| `200 OK`          | `SessionDTO`                               | Updated                |
| `400 Bad Request` | `{ error, code: "VALIDATION_ERROR" }`      | Invalid body           |
| `403 Forbidden`   | `{ error, code: "SESSION_ACCESS_DENIED" }` | Not your session       |
| `404 Not Found`   | `{ error, code: "SESSION_NOT_FOUND" }`     | Session does not exist |

---

### `DELETE /sessions/:sessionId` — Delete a session and all its messages

**Auth Required:** Yes

#### Responses

| Code             | Body                                       | When                   |
| ---------------- | ------------------------------------------ | ---------------------- |
| `204 No Content` | _(empty)_                                  | Deleted                |
| `403 Forbidden`  | `{ error, code: "SESSION_ACCESS_DENIED" }` | Not your session       |
| `404 Not Found`  | `{ error, code: "SESSION_NOT_FOUND" }`     | Session does not exist |

---

## 5.6 Chat Endpoint (SSE Streaming)

> 📡 **Protocol: Server-Sent Events (SSE)**
> The chat endpoint uses SSE, not WebSockets. SSE is one-directional (server → client), simpler to implement, works over HTTP/1.1, and is natively supported by the Vercel AI SDK `useChat` hook. WebSockets are not needed for Phase 1.

### `POST /sessions/:sessionId/messages` — Send a message and stream the AI response

**Auth:** Optional. Guests must include `X-Device-ID`.

#### Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>   // authenticated users
X-Device-ID: <device_fingerprint>      // guest users
Accept: text/event-stream              // tells server to stream
```

#### Request Body

```json
{
  "content": "Explain useEffect in React",
  "model": "claude-3-5-sonnet-20241022"
}
```

#### Response Stream (200 `text/event-stream`)

```
data: {"type":"message_start","message":{"id":"msg_01abc...","model":"claude-3-5-sonnet-20241022"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"useEffect"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" is a React hook"}}

data: {"type":"message_delta","delta":{"stop_reason":"end_turn","usage":{"input_tokens":45,"output_tokens":312}}}

data: {"type":"message_stop"}

// On error mid-stream:
data: {"type":"error","error":{"code":"TOKEN_LIMIT_EXCEEDED","message":"Session token limit reached"}}
```

#### How to consume in Next.js (Vercel AI SDK)

```typescript
// app/(chat)/page.tsx
import { useChat } from "ai/react"

const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
  useChat({
    api: `/api/v1/sessions/${sessionId}/messages`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Device-ID": getDeviceFingerprint(),
    },
    onFinish(message) {
      // update token count in local state
    },
    onError(error) {
      if (error.message.includes("QUOTA_EXHAUSTED")) {
        showUpgradeModal()
      }
    },
  })
```

#### Non-Streaming Error Responses

| Code                      | Body                                       | When                             |
| ------------------------- | ------------------------------------------ | -------------------------------- |
| `400 Bad Request`         | `{ error, code: "VALIDATION_ERROR" }`      | Empty content, missing body      |
| `401 Unauthorized`        | `{ error, code: "TOKEN_EXPIRED" }`         | Expired access token             |
| `403 Forbidden`           | `{ error, code: "SESSION_ACCESS_DENIED" }` | Not your session                 |
| `404 Not Found`           | `{ error, code: "SESSION_NOT_FOUND" }`     | Session does not exist           |
| `422 Unprocessable`       | `{ error, code: "TOKEN_LIMIT_EXCEEDED" }`  | Session over token budget        |
| `429 Too Many Requests`   | `QuotaExhaustedError`                      | Message rate limit (60/min/user) |
| `503 Service Unavailable` | `{ error, code: "LLM_UNAVAILABLE" }`       | Claude API down or overloaded    |

#### Backend Implementation Sketch

```typescript
// api/routes/messages.ts  (Hono)
app.post("/sessions/:sessionId/messages", async (c) => {
  const { sessionId } = c.req.param()
  const identity = await resolveIdentity(c)
  const session = await sessionService.getAndAuthorize(sessionId, identity)

  if (session.tokenCount >= TOKEN_LIMIT[identity.tier]) {
    return c.json(
      { error: "Token limit exceeded", code: "TOKEN_LIMIT_EXCEEDED" },
      422
    )
  }

  const { content } = await c.req.json()
  const history = await messageService.getHistory(sessionId)

  await messageService.create({ sessionId, role: "user", content })

  const claudeStream = anthropic.messages.stream({
    model: session.model,
    max_tokens: 4096,
    messages: [...history, { role: "user", content }],
  })

  c.header("Content-Type", "text/event-stream")
  c.header("Cache-Control", "no-cache")
  c.header("Connection", "keep-alive")

  return stream(c, async (sseStream) => {
    let fullText = ""
    for await (const event of claudeStream) {
      if (event.type === "content_block_delta") {
        fullText += event.delta.text
        await sseStream.writeSSE({ data: JSON.stringify(event) })
      }
      if (event.type === "message_stop") {
        const usage = claudeStream.finalUsage()
        await messageService.create({
          sessionId,
          role: "assistant",
          content: fullText,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
        })
        await sessionService.updateTokenCount(
          sessionId,
          usage.input_tokens + usage.output_tokens
        )
        await sseStream.writeSSE({ data: JSON.stringify(event) })
      }
    }
  })
})
```

---

## 5.7 Message Endpoints

### `GET /sessions/:sessionId/messages` — List messages in a session

**Auth Required:** Yes

#### Query Params

| Param       | Type    | Default | Description                                   |
| ----------- | ------- | ------- | --------------------------------------------- |
| `limit`     | integer | 50      | Max 100 per page                              |
| `cursor`    | string  | null    | Cursor pagination (message ID)                |
| `direction` | string  | `asc`   | `asc` (oldest first) or `desc` (newest first) |

#### Response (200)

```json
{
  "data": [
    {
      "id": "msg_01abc...",
      "sessionId": "550e8400...",
      "role": "user",
      "content": "Explain useEffect in React",
      "inputTokens": 45,
      "outputTokens": 0,
      "model": null,
      "finishReason": null,
      "createdAt": "2024-12-01T10:30:00Z"
    },
    {
      "id": "msg_02def...",
      "role": "assistant",
      "content": "useEffect is a React hook that...",
      "inputTokens": 45,
      "outputTokens": 312,
      "model": "claude-3-5-sonnet-20241022",
      "finishReason": "stop",
      "createdAt": "2024-12-01T10:30:03Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

### `DELETE /sessions/:sessionId/messages/:messageId` — Delete a single message

**Auth Required:** Yes

#### Responses

| Code             | Body                                   | When                   |
| ---------------- | -------------------------------------- | ---------------------- |
| `204 No Content` | _(empty)_                              | Deleted                |
| `403 Forbidden`  | `{ error, code: "ACCESS_DENIED" }`     | Not your message       |
| `404 Not Found`  | `{ error, code: "MESSAGE_NOT_FOUND" }` | Message does not exist |

---

## 5.8 Health & Metadata Endpoints

### `GET /health` — API health check — no auth required

#### Response (200)

```json
{
  "status": "ok",
  "timestamp": "2024-12-01T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "redis": "ok",
    "llm": "ok"
  }
}
```

If any service returns `"error"`, the HTTP status code becomes `503`.

---

### `GET /models` — List available LLM models — no auth required

#### Response (200)

```json
{
  "models": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "name": "Claude 3.5 Sonnet",
      "contextWindow": 200000,
      "maxOutputTokens": 8192,
      "tier": "free"
    }
  ]
}
```

---

# 6. Guest → Authenticated Flow

When a guest user logs in or registers after using the app, we should offer to migrate their local sessions to the cloud. This is the "merge on login" flow.

## 6.1 Migration Endpoint

### `POST /sessions/migrate` — Migrate guest IndexedDB sessions to the authenticated account

**Auth Required:** Yes (call immediately after login)

#### Request Body

```typescript
interface MigrateRequest {
  sessions: {
    id: string
    title: string
    model: string
    createdAt: number
    messages: {
      role: "user" | "assistant"
      content: string
      createdAt: number
    }[]
  }[]
}
```

#### Responses

| Code                | Body                                              | When                             |
| ------------------- | ------------------------------------------------- | -------------------------------- |
| `200 OK`            | `{ migratedCount: number, sessionIds: string[] }` | Migration successful             |
| `400 Bad Request`   | `{ error, code: "VALIDATION_ERROR" }`             | Malformed payload                |
| `422 Unprocessable` | `{ error, code: "MIGRATION_TOO_LARGE" }`          | More than 50 sessions in payload |

---

# 7. Monorepo Structure (Turborepo)

## 7.1 Workspace Layout

The repo is split into **apps** (deployable) and **packages** (shared, internal). The key win: `packages/db` owns all Drizzle schema and migrations — both `apps/api` and any future worker app import from it directly as a typed package, no schema drift possible.

```
paikos-/                        // repo root
├── turbo.json                       // task pipeline config
├── package.json                     // root: scripts + devDependencies
├── pnpm-workspace.yaml              // declares apps/* and packages/*
│
├── apps/
│   ├── web/                         // Next.js 15 — deployed to Vercel
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── .env.local               // web-only vars (NEXT_PUBLIC_*)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx
│   │       │   │   └── register/page.tsx
│   │       │   ├── (chat)/
│   │       │   │   ├── layout.tsx           // Sidebar + quota banner
│   │       │   │   ├── page.tsx             // New chat landing
│   │       │   │   └── [sessionId]/page.tsx // Active chat view
│   │       │   ├── api/
│   │       │   │   └── auth/[...nextauth]/route.ts
│   │       │   ├── layout.tsx
│   │       │   └── globals.css
│   │       ├── components/
│   │       │   ├── chat/
│   │       │   │   ├── ChatWindow.tsx       // useChat hook lives here
│   │       │   │   ├── MessageList.tsx
│   │       │   │   ├── MessageBubble.tsx
│   │       │   │   ├── InputBar.tsx
│   │       │   │   └── StreamingIndicator.tsx
│   │       │   ├── sidebar/
│   │       │   │   ├── Sidebar.tsx
│   │       │   │   ├── SessionItem.tsx
│   │       │   │   └── QuotaBanner.tsx
│   │       │   └── modals/
│   │       │       ├── UpgradeModal.tsx     // Shown on quota exhaustion
│   │       │       └── LoginPrompt.tsx
│   │       ├── lib/
│   │       │   ├── api/
│   │       │   │   ├── client.ts            // Axios wrapper + interceptors
│   │       │   │   ├── auth.ts
│   │       │   │   ├── sessions.ts
│   │       │   │   └── quota.ts
│   │       │   ├── db/
│   │       │   │   └── guest-db.ts          // Dexie IndexedDB (guest only)
│   │       │   ├── stores/
│   │       │   │   ├── auth.store.ts        // Zustand: user, accessToken
│   │       │   │   ├── sessions.store.ts
│   │       │   │   └── quota.store.ts
│   │       │   └── guest-identity.ts
│   │       └── hooks/
│   │           ├── useQuota.ts
│   │           ├── useSessionList.ts
│   │           └── useChatStream.ts
│   │
│   └── api/                         // Hono.js on Bun — deployed to Railway/Fly.io
│       ├── package.json
│       ├── .env                     // API-only secrets (never committed)
│       └── src/
│           ├── index.ts             // Hono app entry + middleware setup
│           ├── routes/
│           │   ├── auth.ts          // /auth/*
│           │   ├── sessions.ts      // /sessions/*
│           │   ├── messages.ts      // /sessions/:id/messages
│           │   ├── quota.ts         // /quota
│           │   └── health.ts        // /health, /models
│           ├── services/
│           │   ├── auth.service.ts
│           │   ├── session.service.ts
│           │   ├── message.service.ts
│           │   └── quota.service.ts
│           ├── middleware/
│           │   ├── auth.middleware.ts      // JWT verify + identity resolve
│           │   └── ratelimit.middleware.ts // Redis sliding/fixed window
│           └── lib/
│               └── errors.ts              // AppError class + Errors map
│
└── packages/
    ├── db/                          // Drizzle schema + migrations (SHARED)
    │   ├── package.json             // name: "@paikos/db"
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── schema/
    │       │   ├── users.ts
    │       │   ├── sessions.ts
    │       │   ├── messages.ts
    │       │   ├── daily-usage.ts
    │       │   └── refresh-tokens.ts
    │       ├── client.ts            // exports drizzle(pool)
    │       └── index.ts
    │
    ├── types/                       // Shared TypeScript types & DTOs (SHARED)
    │   ├── package.json             // name: "@paikos/types"
    │   └── src/
    │       ├── api.ts               // Request/Response shapes, error codes
    │       ├── auth.ts              // UserDTO, JWTPayload, QuotaDTO
    │       ├── sessions.ts          // SessionDTO, MessageDTO
    │       └── index.ts
    │
    └── config/                      // Shared tooling configs (SHARED)
        ├── package.json             // name: "@paikos/config"
        ├── eslint/
        │   └── index.js             // shared ESLint config
        ├── typescript/
        │   ├── base.json            // base tsconfig
        │   ├── nextjs.json          // extends base, Next.js preset
        │   └── node.json            // extends base, Node/Bun preset
        └── tailwind/
            └── index.ts             // shared Tailwind preset
```

## 7.2 Turborepo Config (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

## 7.3 pnpm Workspace Config (`pnpm-workspace.yaml`)

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## 7.4 Root `package.json` Scripts

```json
{
  "name": "paikos-",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate --filter=@paikos/db",
    "db:migrate": "turbo run db:migrate --filter=@paikos/db",
    "db:studio": "pnpm --filter @paikos/db studio"
  },
  "devDependencies": {
    "turbo": "latest",
    "@paikos/config": "workspace:*"
  }
}
```

## 7.5 How Internal Packages Are Imported

```typescript
// In apps/api/src/routes/sessions.ts
import { db } from "@paikos/db"
import { sessions, messages } from "@paikos/db/schema"
import type { SessionDTO, CreateSessionRequest } from "@paikos/types"

// In apps/web/src/lib/api/sessions.ts
import type { SessionDTO, QuotaDTO } from "@paikos/types"
```

## 7.6 Auth Store (Zustand) — `apps/web`

```typescript
// apps/web/src/lib/stores/auth.store.ts
import { create } from "zustand"
import type { UserDTO } from "@paikos/types"

interface AuthState {
  user: UserDTO | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  setUser: (user: UserDTO, token: string) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async (email, password) => {
    /* ... */
  },
  logout: async () => {
    /* ... */
  },
  refreshToken: async () => {
    /* ... */
  },
  setUser: (user, token) => set({ user, accessToken: token, isLoading: false }),
}))
```

## 7.7 Silent Token Refresh (Axios Interceptor) — `apps/web`

```typescript
// apps/web/src/lib/api/client.ts
import axios from "axios"
import { useAuthStore } from "../stores/auth.store"

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  withCredentials: true, // sends HttpOnly cookie automatically
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

apiClient.interceptors.response.use(null, async (error) => {
  const original = error.config
  if (error.response?.status === 401 && !original._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return apiClient(original)
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      await useAuthStore.getState().refreshToken()
      const newToken = useAuthStore.getState().accessToken
      failedQueue.forEach((p) => p.resolve(newToken))
      failedQueue = []
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch (e) {
      failedQueue.forEach((p) => p.reject(e))
      failedQueue = []
      useAuthStore.getState().logout()
      throw e
    } finally {
      isRefreshing = false
    }
  }
  throw error
})
```

---

# 8. Rate Limiting Strategy

## 8.1 Limits

| Rule                  | Limit                   | Key                             | Implementation                 |
| --------------------- | ----------------------- | ------------------------------- | ------------------------------ |
| Session creation      | 3/day guest, 5/day free | `device_id` or `user_id` + date | Redis INCR + EXPIREAT midnight |
| Message send          | 60/min per identity     | `user_id` or `device_id`        | Redis sliding window           |
| Auth (login/register) | 10/min per IP           | `ip_address`                    | Redis fixed window             |
| Token refresh         | 5/min per IP            | `ip_address`                    | Redis fixed window             |
| Health check          | 120/min per IP          | `ip_address`                    | Redis fixed window             |

## 8.2 Redis Key Conventions

```
quota:guest:{deviceId}:{YYYY-MM-DD}    → integer, EXPIREAT midnight UTC
quota:user:{userId}:{YYYY-MM-DD}       → integer, EXPIREAT midnight UTC
ratelimit:msg:{identity}               → sorted set of timestamps
ratelimit:login:{ip}:{minute}          → integer
```

## 8.3 429 Response Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1733050260   // Unix timestamp when limit resets
Retry-After: 45                 // Seconds to wait
```

---

# 9. Environment Variables

In a Turborepo workspace, each app manages its own `.env` file. There is no root-level `.env` shared across apps — each workspace is self-contained. The `packages/db` package reads `DATABASE_URL` at runtime from whichever app imports it; the calling app is responsible for providing it.

> ⚠️ **Never commit `.env` files.** Add `**/.env`, `**/.env.local` to the root `.gitignore`.

## 9.1 API Server — `apps/api/.env`

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/paikos_"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="minimum-32-char-random-secret-here"
JWT_ACCESS_TTL="900"         # 15 minutes in seconds
JWT_REFRESH_TTL="2592000"    # 30 days in seconds

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# App
PORT="3001"
NODE_ENV="production"
ALLOWED_ORIGINS="https://paikos.app,https://www.paikos.app"

# Quota
GUEST_SESSION_LIMIT_PER_DAY="3"
FREE_SESSION_LIMIT_PER_DAY="5"
GUEST_TOKEN_LIMIT_PER_SESSION="8000"
FREE_TOKEN_LIMIT_PER_SESSION="16000"
```

## 9.2 Frontend — `apps/web/.env.local`

```bash
NEXT_PUBLIC_API_URL="https://api.paikos.app"

# Auth.js
NEXTAUTH_URL="https://paikos.app"
NEXTAUTH_SECRET="another-32-char-secret"

# OAuth (optional for Phase 1)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## 9.3 Turborepo Remote Cache (CI only) — root `.env`

```bash
# Only needed in CI (GitHub Actions / Vercel Build). Not for local dev.
TURBO_TOKEN="your-vercel-remote-cache-token"
TURBO_TEAM="your-vercel-team-slug"
```

Used in CI like: `turbo run build --team=$TURBO_TEAM --token=$TURBO_TOKEN`

---

# 10. Engineering Standards

## 10.1 Error Handling Pattern

```typescript
// api/lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message)
  }
}

export const Errors = {
  VALIDATION: (details: unknown) =>
    new AppError("VALIDATION_ERROR", "Invalid request data", 400, details),
  UNAUTHORIZED: () =>
    new AppError("UNAUTHORIZED", "Authentication required", 401),
  FORBIDDEN: () => new AppError("SESSION_ACCESS_DENIED", "Access denied", 403),
  NOT_FOUND: (resource: string) =>
    new AppError(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} not found`,
      404
    ),
  QUOTA_EXHAUSTED: (details: object) =>
    new AppError(
      "QUOTA_EXHAUSTED",
      "Daily session limit reached",
      429,
      details
    ),
  LLM_ERROR: () =>
    new AppError("LLM_UNAVAILABLE", "AI service unavailable", 503),
}

// Global error handler middleware (Hono)
app.onError((err, c) => {
  const requestId = c.get("requestId")
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, code: err.code, details: err.details, requestId },
      err.statusCode
    )
  }
  logger.error({ err, requestId }, "Unhandled error")
  return c.json(
    { error: "Internal server error", code: "INTERNAL_ERROR", requestId },
    500
  )
})
```

## 10.2 Request Validation (Zod)

```typescript
import { z } from "zod"

export const CreateSessionSchema = z.object({
  title: z.string().max(200).optional().default("New Chat"),
  model: z
    .enum(["claude-3-5-sonnet-20241022"])
    .optional()
    .default("claude-3-5-sonnet-20241022"),
})

export const SendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(8000),
  model: z.enum(["claude-3-5-sonnet-20241022"]).optional(),
})

// In route handler:
const parsed = SendMessageSchema.safeParse(await c.req.json())
if (!parsed.success) throw Errors.VALIDATION(parsed.error.flatten())
```

## 10.3 Logging Standard

```typescript
app.use(async (c, next) => {
  const requestId = `req_${nanoid(12)}`
  c.set("requestId", requestId)
  c.header("X-Request-ID", requestId)
  const start = Date.now()
  await next()
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  })
})
```

## 10.4 CORS Configuration

```typescript
app.use(
  "/*",
  cors({
    origin: process.env.ALLOWED_ORIGINS!.split(","),
    allowHeaders: ["Content-Type", "Authorization", "X-Device-ID"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // required for HttpOnly cookies
    maxAge: 86400,
  })
)
```

---

# 11. Production Checklist

## 11.1 Security

- [ ] `JWT_SECRET` is at least 256 bits, generated with `crypto.randomBytes(32)`
- [ ] Refresh tokens stored as SHA-256 hashes in DB, never plaintext
- [ ] All API routes behind HTTPS only (HSTS header set)
- [ ] Rate limiting on all public endpoints (especially auth)
- [ ] SQL injection impossible — Drizzle ORM uses parameterized queries only
- [ ] CORS allow-list is explicit, never wildcard (`*`)
- [ ] `HttpOnly`, `Secure`, `SameSite=Strict` on refresh token cookie
- [ ] Input sanitized and max lengths enforced at Zod layer before DB write
- [ ] No sensitive data (tokens, passwords) in server logs

## 11.2 Performance

- [ ] PostgreSQL indexes on `sessions(user_id)`, `messages(session_id, created_at)`
- [ ] Redis used for all quota counters — never hit the DB for quota checks
- [ ] SSE connection headers set correctly (no buffering via Nginx)
- [ ] Nginx/CDN buffer disabled for SSE routes: `proxy_buffering off`
- [ ] Message history truncated to last N tokens before sending to Claude
- [ ] Drizzle query selects only needed columns — no `SELECT *`
- [ ] Turborepo remote caching enabled in CI (`TURBO_TOKEN` + `TURBO_TEAM` set) — cuts build times by 60–80% on unchanged packages

## 11.3 Observability

- [ ] Structured JSON logging (pino) with `requestId` on every log line
- [ ] Health endpoint at `/api/v1/health` checked by uptime monitor every 60s
- [ ] Token usage tracked per message — enables cost dashboards later
- [ ] Error rate alerts on 5xx responses exceeding 1% in 5-minute window
- [ ] Langfuse (self-hosted) for LLM observability — tracks prompts, completions, latency
- [ ] Vercel deploy filter set to `apps/web` only — prevent unnecessary rebuilds when only API changes
- [ ] Railway/Fly.io watch path set to `apps/api/**` and `packages/**` — API only redeploys when its code or shared packages change

---

# 12. Phase Roadmap

| Phase                 | Scope                                                                                   | Status     |
| --------------------- | --------------------------------------------------------------------------------------- | ---------- |
| Phase 1 — Chat Core   | SSE streaming chat, auth, session management, quota system, dual storage                | ✅ Current |
| Phase 2 — Memory      | Episodic memory with Redis (short-term) + pgvector (episodes) + Neo4j (knowledge graph) | 🔜 Next    |
| Phase 3 — MCP Sources | Ingest PDFs, URLs, Notion pages via MCP servers into the knowledge graph                | 📋 Planned |
| Phase 4 — Voice       | Real-time voice I/O: Groq Whisper STT, Kokoro-js TTS, sub-300ms latency pipeline        | 📋 Planned |
| Phase 5 — D3 Graph UI | Interactive knowledge graph visualization, node exploration, research timeline          | 📋 Planned |

---

_paikos — Phase 1 Engineering Spec v1.0.0 | Built by Vishal_
