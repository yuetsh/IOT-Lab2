# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start both frontend and backend concurrently (from root)
bun run dev

# Start individually
cd backend && bun run dev   # http://localhost:3000 (hot reload)
cd frontend && bun run dev  # http://localhost:5173

# Build frontend
cd frontend && bun run build

# Install dependencies
bun install  # from root installs all workspaces
```

No tests — do not add a testing framework.

## Architecture

Bun workspace monorepo with two packages: `backend/` and `frontend/`.

**Backend** (`backend/src/index.ts`): Elysia server on port 3000. All routes are defined via Elysia's chained `.get()` / `.post()` / `.delete()` methods with built-in validation via `t` from `elysia`.

**Database** (`backend/src/db.ts`): Single `bun:sqlite` Database instance exported as `db`. Schema is initialized on startup with `db.query(...).run()`. The SQLite file `data.sqlite` is created at `backend/data.sqlite` (relative to where the process runs). Import `db` in route files to query.

**Frontend** (`frontend/src/`): Vite + React. All `/api/*` requests are proxied to `http://localhost:3000` via `vite.config.ts` — no CORS issues in dev. Call backend APIs with plain `fetch('/api/...')`.

## Key Conventions

- Backend uses `bun --hot` for hot reload in dev; no nodemon/tsx needed.
- Use `db.query('...').run()` for write queries, `db.query('...').all()` for selects — avoid `db.exec()` (deprecated overload).
- Elysia body validation: use `t.Object({ field: t.String() })` in the route options, not manual validation.
