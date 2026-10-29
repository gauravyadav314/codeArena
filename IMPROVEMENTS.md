# CodeArena Improvement & Quality Checklist

## Current Status Overview
- **Completed**: 10 high-priority production & DevOps fixes (SEC-01, TEST-01, DOC-01, OPS-01, OPS-02, OPS-03, OPS-04, DOC-02, ENV-01, CI-01).
- **Blocked**: None.
- **Next**: E2E-01 (Playwright 1v1 arena duel test) and LINT-01 (Monorepo ESLint & Prettier configuration).

---

## Prioritized Checklist

### Critical / High Severity
- [x] **SEC-01 (Critical)**: Sandbox execution guard & AST prototype isolation in `judge.service.ts` to prevent Node `vm` context escape.
- [x] **TEST-01 (High)**: Unify Vitest test suite and in-process request agent for reliable route integration testing.
- [x] **DOC-01 (High)**: Remove absolute local machine path (`/Users/gauravyadav/Desktop/p`) from `README.md` and add comprehensive API/architecture docs.
- [x] **OPS-01 (High)**: Production multi-stage `backend/Dockerfile` with non-root user and security flags.
- [x] **OPS-02 (High)**: Production multi-stage `frontend/Dockerfile` with Nginx SPA routing.
- [x] **OPS-03 (High)**: Dedicated sandboxed `judge/Dockerfile` runner for multi-language execution.
- [x] **OPS-04 (High)**: Full `docker-compose.yml` for PostgreSQL, Redis, Backend, Frontend, and Judge.
- [x] **DOC-02 (Medium)**: Complete OpenAPI 3.0.3 specification (`backend/docs/openapi.yaml`) documenting all endpoints.
- [x] **ENV-01 (Medium)**: Root and service-level `.env.example` configurations.
- [x] **CI-01 (Medium)**: Multi-stage GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- [ ] **E2E-01 (Medium)**: Playwright 1v1 arena duel end-to-end test specification.
- [ ] **LINT-01 (Medium)**: Monorepo ESLint & Prettier configuration files.
