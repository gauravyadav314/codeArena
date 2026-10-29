# CodeArena Improvement & Quality Checklist

## Current Status Overview
- **Completed**: Phase 1 Security Audit, Phase 2 Data Model (PostgreSQL & Dual-mode SQLite), Phase 3 Backend Architecture (Zod, JWT Auth, BullMQ, ELO Engine, Sockets), Phase 4 Frontend Modernization (React Router, TanStack Query, Monaco Editor, Anti-Cheat).
- **Blocked**: None. Local sandbox socket restrictions are bypassed or mitigated via mocked agents.
- **Next**: Complete Phase 5 DevOps, Security Hardening, Multi-stage Dockerization, CI Pipeline, and OpenAPI 3.0 specs.

---

## Prioritized Checklist

### Critical / High Severity
- [ ] **SEC-01 (Critical)**: Sandbox execution guard & AST prototype isolation in `judge.service.ts` to prevent Node `vm` context escape.
- [ ] **TEST-01 (High)**: Unify Vitest test suite and in-process request agent for reliable route integration testing.
- [ ] **DOC-01 (High)**: Remove absolute local machine path (`/Users/gauravyadav/Desktop/p`) from `README.md` and add comprehensive API/architecture docs.
- [ ] **OPS-01 (High)**: Production multi-stage `backend/Dockerfile` with non-root user and security flags.
- [ ] **OPS-02 (High)**: Production multi-stage `frontend/Dockerfile` with Nginx SPA routing.
- [ ] **OPS-03 (High)**: Dedicated sandboxed `judge/Dockerfile` runner for multi-language execution.
- [ ] **OPS-04 (High)**: Full `docker-compose.yml` for PostgreSQL, Redis, Backend, Frontend, and Judge.
- [ ] **DOC-02 (Medium)**: Complete OpenAPI 3.0.3 specification (`backend/docs/openapi.yaml`) documenting all endpoints.
- [ ] **ENV-01 (Medium)**: Root and service-level `.env.example` configurations.
- [ ] **CI-01 (Medium)**: Multi-stage GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- [ ] **E2E-01 (Medium)**: Playwright 1v1 arena duel end-to-end test specification.
- [ ] **LINT-01 (Medium)**: Monorepo ESLint & Prettier configuration files.
