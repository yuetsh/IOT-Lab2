# Mermaid Node Device Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the device desk from free-position stickers to selected Mermaid node device slots.

**Architecture:** Keep Mermaid rendering intact and layer interaction on top of the rendered SVG. Persist placements by Mermaid node id and label while preserving old coordinate columns for compatibility.

**Tech Stack:** React, Mermaid, @dnd-kit/core, Elysia, Bun SQLite, Bun test.

---

### Task 1: Placement Model Tests

**Files:**
- Modify: `frontend/src/pages/journalState.ts`
- Modify: `frontend/tests/journalState.test.ts`
- Modify: `backend/src/routes/stickers.test.ts`

- [ ] Add tests for normalizing Mermaid node ids and replacing a single node-slot placement.
- [ ] Add backend route coverage for saving and reading `node_id` and `node_label`.

### Task 2: Backend Persistence

**Files:**
- Modify: `backend/src/db.ts`
- Modify: `backend/src/routes/journal.ts`
- Modify: `backend/src/routes/admin.ts`

- [ ] Add `node_id` and `node_label` columns to `journal_placements`.
- [ ] Accept node placements in `PUT /api/groups/:id/journal`.
- [ ] Return only node-based placements from the journal endpoint.

### Task 3: Frontend Interaction

**Files:**
- Modify: `frontend/src/components/MermaidRenderer.tsx`
- Modify: `frontend/src/pages/GroupWorkspace.tsx`
- Modify: `frontend/src/pages/JournalTab.tsx`
- Modify: `frontend/src/pages/journalState.ts`

- [ ] Expose rendered Mermaid SVG to the device desk.
- [ ] Extract clickable Mermaid nodes and selected-node highlighting.
- [ ] Replace canvas drop handling with a right-side selected-node slot.
- [ ] Save placements as `node_id`, `node_label`, and `sticker_id`.

### Task 4: Verification

**Files:**
- No source edits expected.

- [ ] Run `bun test backend/src/*.test.ts frontend/tests/*.test.ts`.
- [ ] Run `cd frontend && bun run build`.
