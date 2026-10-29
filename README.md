# CodeArena ⚔️

A real-time competitive programming platform and 1v1 battle arena. CodeArena combines aggregate competitive ratings (LeetCode, Codeforces, CodeChef), instant head-to-head live duel matchmaking, server-authoritative match timers, BullMQ + Redis job queues, sandboxed code execution, and Monaco IDE portal.

---

## 📁 Repository Structure

```text
codeArena/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Dual-mode SQLite/PostgreSQL schema
│   │   ├── schema.postgresql.prisma# Production PostgreSQL specification with native enums
│   │   └── seed.ts                 # Database seeder with sample problems, users, and matches
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Environment variable parsing and validation
│   │   │   ├── logger.ts           # Pino structured JSON & development pretty logger
│   │   │   └── redis.ts            # Redis client with graceful disconnected fallback
│   │   ├── errors/
│   │   │   └── AppError.ts         # Typed error hierarchy (400, 401, 403, 404, 422, 429, 500)
│   │   ├── middlewares/
│   │   │   ├── auth.ts             # JWT auth verification & ownership guards
│   │   │   ├── errorHandler.ts     # Standardized JSON error response handler
│   │   │   ├── notFoundHandler.ts  # 404 handler for unmatched routes
│   │   │   ├── rateLimit.ts        # Flexible sliding-window rate limiting middleware
│   │   │   └── validate.ts         # Composable Zod request validator
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # /api/auth register, login, refresh, logout, me
│   │   │   ├── health.routes.ts    # /api/health endpoint
│   │   │   ├── match.routes.ts     # /api/matches duel matchmaking, queue & submissions
│   │   │   ├── problem.routes.ts   # /api/problems problem catalog & test runner
│   │   │   ├── user.routes.ts      # /api/users profiles, composite sync & leaderboard
│   │   │   └── index.ts            # Central API router
│   │   ├── services/
│   │   │   ├── auth.service.ts     # Bcrypt password hashing & JWT generation
│   │   │   ├── elo.service.ts      # Transactional ELO rating calculations (provisional K)
│   │   │   ├── externalProfile.service.ts # Cached, retrying LeetCode/CF/CC sync
│   │   │   ├── judge.service.ts    # Sandboxed multi-language code evaluation engine
│   │   │   ├── judgeQueue.service.ts # BullMQ + Redis asynchronous worker queue
│   │   │   └── matchmaking.service.ts # Rating tolerance widening matchmaking queue
│   │   ├── socket/
│   │   │   └── index.ts            # Socket.IO real-time websockets & timer heartbeat
│   │   ├── validators/             # Zod schema definitions
│   │   ├── app.ts                  # Express application configuration
│   │   └── server.ts               # HTTP & WebSocket server entrypoint
│   ├── tests/                      # Vitest unit and route integration tests
│   ├── .env.example                # Documented backend environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ArenaBattleView.tsx # 1v1 Arena duel grounds & live scoreboard
│   │   │   ├── CodeEditor.tsx      # Monaco IDE code editor with syntax themes
│   │   │   ├── EmptyState.tsx      # Reusable empty state view
│   │   │   ├── ErrorBoundary.tsx   # React error boundary component
│   │   │   ├── LeaderboardView.tsx # Global ELO rankings table
│   │   │   ├── Navbar.tsx          # Responsive navigation & account selector
│   │   │   ├── NotFoundView.tsx    # 404 fallback view
│   │   │   ├── ProblemsView.tsx    # Problem studio catalog & solo practice IDE
│   │   │   ├── ProfileView.tsx     # Multi-platform stats and handle sync
│   │   │   ├── SkeletonLoader.tsx  # Accessible loading skeleton
│   │   │   ├── TelemetryView.tsx   # Health probes & system latency telemetry
│   │   │   └── Toast.tsx           # Toast notification provider
│   │   ├── hooks/
│   │   │   ├── useAntiCheat.ts     # Tab blur & paste event security monitor
│   │   │   ├── useQueries.ts       # TanStack React Query hooks
│   │   │   └── useSocket.ts        # Socket.IO client room hook
│   │   ├── services/
│   │   │   └── api.ts              # API fetch client
│   │   ├── queryClient.ts          # TanStack Query client configuration
│   │   ├── App.tsx                 # React Router root
│   │   └── main.tsx                # Client entrypoint
│   ├── .env.example                # Frontend environment variables
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml              # Local and production multi-container orchestration
└── Makefile                        # Build and developer workflow shortcuts
```

---

## ⚡ Quickstart

### Option 1: Docker Compose (Zero Setup)
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Option 2: Local Development
```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Setup database and seed problems
cd backend
npx prisma db push
npx tsx prisma/seed.ts

# 3. Run test suite (54 unit & integration tests)
npm test

# 4. Start development servers
npm run dev        # Backend on port 5001
cd ../frontend
npm run dev        # Frontend on port 5173
```

---

## 🔒 Security Architecture

1. **Pre-Execution Sandbox Guard**: Submissions are scanned for prototype traversal, constructor escaping, and forbidden host tokens (`process`, `child_process`, `fs`, `eval`, `Function`, `import`, `__proto__`).
2. **Authoritative Timers**: Match countdown timers are computed and tracked on the server (`startedAt`, `expiresAt`). Clients cannot spoof timer expiration or inject unearned draws.
3. **Anti-Leak Problem Statements**: `GET /api/problems/:slug` strips hidden test cases, returning only sample cases to the client to prevent answer harvesting.
4. **Session Security**: Dual-token JWT (15-min Access Token in memory/Bearer, 7-day Refresh Token in `httpOnly` secure cookies with database revocation tracking).
5. **Anti-Cheat Telemetry**: Tracks browser tab unfocus events (`visibilitychange`) and rapid bulk paste velocity.
