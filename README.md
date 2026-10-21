# CodeArena ⚔️

A real-time competitive programming platform and 1v1 battle arena. CodeArena combines aggregate competitive ratings (LeetCode, Codeforces, CodeChef), instant head-to-head live duel matchmaking, sandboxed code execution, and interactive telemetrics.

---

## 📁 Repository Structure

```text
/Users/gauravyadav/Desktop/p
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # PostgreSQL / SQLite datasource & generator definition
│   │   └── seed.ts              # Database seeder with sample problems, users, and matches
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts           # Centralized environment variable validation
│   │   ├── middlewares/
│   │   │   ├── errorHandler.ts  # Standardized error response middleware
│   │   │   └── notFoundHandler.ts # 404 handler for unmatched routes
│   │   ├── routes/
│   │   │   ├── health.routes.ts # /api/health endpoint
│   │   │   ├── match.routes.ts  # /api/matches duel matchmaking & submission runner
│   │   │   ├── problem.routes.ts # /api/problems problem catalog & test cases
│   │   │   ├── user.routes.ts   # /api/users ratings, profiles & leaderboard
│   │   │   └── index.ts         # Central API router
│   │   ├── services/
│   │   │   ├── prisma.ts        # Prisma Client singleton
│   │   │   └── codeRunner.ts    # Sandboxed VM JavaScript/TypeScript evaluation engine
│   │   ├── app.ts               # Express application configuration
│   │   └── server.ts            # Server entrypoint with graceful shutdown
│   ├── .env.example             # Documented environment variables
│   ├── .env                     # Local environment file
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI modules (ArenaBattle, Problems, Leaderboard, Profile, Telemetry, Navbar)
│   │   ├── services/
│   │   │   └── api.ts           # Frontend API client for backend routes
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces for matches, problems, users
│   │   ├── App.tsx              # CodeArena initial portal & live health probe
│   │   ├── App.css              # Component styling
│   │   ├── index.css            # Dark/Light mode design system & typography tokens
│   │   └── main.tsx             # React entrypoint
│   ├── .env.example             # Frontend environment variables (VITE_API_BASE_URL)
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore                   # Monorepo-level gitignore
└── README.md                    # Project overview and getting started guide
```

---

## ⚡ Tech Stack

| Domain | Technology |
|---|---|
| **Backend Framework** | Node.js + Express with TypeScript |
| **Database ORM** | Prisma ORM (PostgreSQL ready, SQLite zero-config local) |
| **Code Evaluation** | Node.js Sandboxed VM with custom assertions & test runner |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling** | Vanilla CSS Design System with dark/light mode and smooth micro-animations |
| **Networking** | REST API with CORS credentials support |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client and run seed
npx prisma db push
npx prisma db seed

# Run in development mode (starts on port 5001)
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start Vite development server (starts on port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
PORT=5001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Local SQLite (zero-config):
DATABASE_URL="file:./dev.db"

# Or PostgreSQL (production):
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codearena?schema=public
```

### Frontend (`frontend/.env`)
```ini
VITE_API_BASE_URL=http://localhost:5001
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health probe, uptime, and environment |
| `GET` | `/api/problems` | List problems with filters (`difficulty`, `category`, `search`) |
| `GET` | `/api/problems/:id` | Fetch problem description, starter code, and test cases |
| `GET` | `/api/users` | Retrieve leaderboard and ranked competitors |
| `GET` | `/api/users/:username`| Fetch individual user profile and rating history |
| `POST` | `/api/matches` | Create a new 1v1 match lobby |
| `POST` | `/api/matches/:code/join` | Join an existing duel by match code |
| `POST` | `/api/matches/:code/submit` | Submit code for sandboxed execution against test cases |

---

## 🛡️ Key Features

- **1v1 Arena Battles**: Live match lobby, timed duel timer, code editor with syntax styles, and instant feedback.
- **Sandboxed Test Runner**: Evaluates submissions against test cases safely with timeout handling.
- **Competitive Rating Engine**: Elo-based rating updates, winning streaks, and tier badges.
- **Dynamic Diagnostics**: Live health probe and latency counter communicating with the backend.
