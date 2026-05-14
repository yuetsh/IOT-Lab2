# Repository Guidelines

## Project Structure & Module Organization

This is a Bun workspace monorepo:

- `backend/`: Elysia API server. Entry point is `backend/src/index.ts`; routes live in `backend/src/routes/`; shared database setup is in `backend/src/db.ts`; seed logic is in `backend/src/seed.ts`.
- `frontend/`: Vite + React app. Source lives in `frontend/src/`, with route pages under `frontend/src/pages/` and reusable UI in `frontend/src/components/`.
- `frontend/tests/` and `backend/src/*.test.ts`: existing Bun test files.
- `frontend/dist/`: generated frontend output; do not edit assets by hand.
- `backend/data.sqlite`: local SQLite database.

## Build, Test, and Development Commands

Run commands from the repository root unless noted:

- `bun install`: install all workspace dependencies.
- `bun run dev`: start backend and frontend concurrently.
- `bun run dev:backend`: start the Elysia API on `http://localhost:3000`.
- `bun run dev:frontend`: start Vite on `http://localhost:5173` with `/api` proxied to the backend.
- `cd frontend && bun run build`: type-check and build the frontend.
- `cd backend && bun run seed`: seed backend data.
- `bun test backend/src/*.test.ts frontend/tests/*.test.ts`: run existing Bun tests.

## Coding Style & Naming Conventions

Use TypeScript with strict settings. Match the current style: two-space indentation, single quotes, no semicolons, and React function components. Use `PascalCase` for components/pages, `camelCase` for functions and variables, and descriptive route module names such as `groups.ts`.

Backend routes should use Elysia chained handlers and `t.Object(...)` validation. Use `db.query(...).run()` for writes and `db.query(...).all()` for reads; avoid `db.exec()`.

## Testing Guidelines

The project uses Bun's built-in test runner for focused utility tests. Name tests `*.test.ts` and colocate backend tests near the code they cover; keep frontend tests in `frontend/tests/` unless a local pattern emerges. No package-level test script or coverage threshold is currently defined, and no additional testing framework should be introduced without a clear need.

## Commit & Pull Request Guidelines

This checkout has no local Git history, so there is no project-specific commit convention to infer. Use short, imperative titles such as `add journal sticker validation`. Pull requests should describe the change, list verification commands, link related issues, and include screenshots for visible frontend changes.

## Security & Configuration Tips

Keep secrets and local service keys out of source control. Store local backend configuration in `backend/.env` and avoid committing SQLite data unless intentionally sharing fixtures.

## Agent-Specific Instructions

For agent-run shell commands, follow `/home/xuyue/.codex/RTK.md`: prefix commands with `rtk`, for example `rtk bun run dev` or `rtk bun test backend/src/*.test.ts`.
