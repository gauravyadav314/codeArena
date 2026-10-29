# Auto Improvements Changelog

All notable automated fixes and architectural hardening steps are recorded here.

## [Batch 1] - 2026-10-29 - auto/improve-and-debug
- `03387a3` **SEC-01**: Implement sandbox escape guard, forbidden AST tokens inspection, and prototype trapping in `judge.service.ts`.
- `3288a37` **TEST-01**: Migrate test runner to unified Vitest suite; add 9 end-to-end route integration tests covering health, auth, problems, and matches.
- `bf448d5` **DOC-01**: Strip local machine absolute paths (`/Users/gauravyadav/Desktop/p`) from `README.md`; document complete API, WebSockets, and Docker workflows.
- `b8bda35` **OPS-01**: Multi-stage production `backend/Dockerfile` with non-root Alpine execution and healthcheck probe.
- `18e80fb` **OPS-02**: Multi-stage production `frontend/Dockerfile` with Nginx Alpine, gzip compression, and SPA HTML fallback.
- `30c8be7` **OPS-03**: Create isolated sandboxed `judge/Dockerfile` runner with unprivileged user for multi-language execution.
- `7e5d443` **OPS-04**: Production-grade `docker-compose.yml` linking PostgreSQL 16, Redis 7, Judge, Backend, and Frontend.
- `dce73a7` **DOC-02**: Author comprehensive OpenAPI 3.0.3 specification in `backend/docs/openapi.yaml`.
- `64ac2dd` **ENV-01**: Create unified root `.env.example` documenting global stack environment variables.
- `d105090` **CI-01**: Upgrade GitHub Actions workflow with Redis service container and Docker build verification.
