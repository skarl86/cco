# CCO Refactoring Implementation Roadmap

> **Date**: 2026-04-06
> **Companion docs**:
> - [PAPERCLIP_FEATURE_SPEC.md](./PAPERCLIP_FEATURE_SPEC.md) — Full feature specification
> - [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) — Prioritized gap matrix

---

## Phased Plan Overview

```
Phase 0: Foundation (Infrastructure)          ~2 weeks
Phase 1: Core Feature Parity (Server)         ~2 weeks
Phase 2: CLI Expansion                        ~1.5 weeks
Phase 3: UI Overhaul                          ~2.5 weeks
Phase 4: Advanced Features                    ~3 weeks
Phase 5: Polish & Production Readiness        ~1 week
                                              ─────────
Total estimated:                              ~12 weeks
```

---

## Phase 0: Foundation (Infrastructure)

> **Goal**: Fix architectural foundations so subsequent features can be built correctly.
> **Duration**: ~2 weeks
> **Dependencies**: None (start here)

### Sprint 0.1: Error Handling & Logging (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 0.1.1 | GAP-003 | Create `errors.ts` with typed HTTP errors (badRequest, unauthorized, forbidden, notFound, conflict, unprocessable) |
| 0.1.2 | GAP-003 | Create Zod validation middleware (`validate.ts`) |
| 0.1.3 | GAP-003 | Create centralized error handler middleware |
| 0.1.4 | GAP-005 | Add pino + pino-http for structured request logging |
| 0.1.5 | GAP-005 | Add log redaction for sensitive fields (API keys, tokens) |
| 0.1.6 | — | Refactor all existing routes to use new error/validation patterns |

**Deliverable**: All routes return consistent error responses with proper HTTP status codes. Request logging is active.

### Sprint 0.2: Database Migrations & Config (4 days)

| Task | GAP | Description |
|------|-----|-------------|
| 0.2.1 | GAP-001 | Integrate drizzle-kit into `@cco/db` |
| 0.2.2 | GAP-001 | Generate initial migration from current schema |
| 0.2.3 | GAP-001 | Add `cco db:migrate` and `cco db:generate` commands |
| 0.2.4 | GAP-002 | Create config schema (Zod) matching Paperclip structure |
| 0.2.5 | GAP-002 | Create config loader (env → .env → config.json → defaults) |
| 0.2.6 | GAP-002 | Create config file read/write utilities |
| 0.2.7 | GAP-002 | Add `cco configure` command with section selection |

**Deliverable**: Schema changes go through migration files. Configuration is layered and persistent.

### Sprint 0.3: Real-time & Scheduling (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 0.3.1 | GAP-004 | Add `ws` package, create WebSocket server on Express |
| 0.3.2 | GAP-004 | Create live-events endpoint (`/api/teams/:id/events/ws`) |
| 0.3.3 | GAP-004 | Create pub/sub: `publishLiveEvent()`, `subscribeTeamEvents()` |
| 0.3.4 | GAP-004 | Publish events from existing services (agent status, task changes, runs) |
| 0.3.5 | GAP-008 | Implement cron parser (or integrate `croner` library) |
| 0.3.6 | GAP-008 | Add cron evaluation to heartbeat scheduler (`tickScheduledTriggers`) |
| 0.3.7 | GAP-111 | Add `reapOrphanedRuns()` to scheduler |
| 0.3.8 | GAP-111 | Add `resumeQueuedRuns()` to scheduler |

**Deliverable**: WebSocket events flow to connected clients. Routines auto-trigger on cron schedule. Stale runs are cleaned up.

---

## Phase 1: Core Feature Parity (Server)

> **Goal**: Implement missing server features needed for production orchestration.
> **Duration**: ~2 weeks
> **Dependencies**: Phase 0

### Sprint 1.1: Agent Enhancements (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 1.1.1 | GAP-101 | Create `agentInstructions` table + migration |
| 1.1.2 | GAP-101 | Create `agentPermissions` table + migration |
| 1.1.3 | GAP-101 | Add instructions CRUD endpoints (GET/PATCH on `/agents/:id/instructions`) |
| 1.1.4 | GAP-101 | Add permissions CRUD endpoints (GET/PATCH on `/agents/:id/permissions`) |
| 1.1.5 | GAP-102 | Create `agentApiKeys` table (SHA256 hashed) + migration |
| 1.1.6 | GAP-102 | Add API key CRUD endpoints (POST/DELETE on `/agents/:id/keys`) |
| 1.1.7 | GAP-102 | Update auth middleware to validate agent API keys |
| 1.1.8 | — | Add agent approval workflow (pending → approved) |

**Deliverable**: Agents have separate instruction/permission management and per-agent API keys.

### Sprint 1.2: Goals, Routines, Activity (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 1.2.1 | GAP-103 | Create `goals` table + migration |
| 1.2.2 | GAP-103 | Create goal service (CRUD, hierarchy) |
| 1.2.3 | GAP-103 | Add goal routes (GET/POST on `/projects/:id/goals`, GET/PATCH on `/goals/:id`) |
| 1.2.4 | GAP-104 | Create `routineTriggers` and `routineRuns` tables + migrations |
| 1.2.5 | GAP-104 | Add trigger CRUD endpoints |
| 1.2.6 | GAP-104 | Add run history endpoint (GET `/routines/:id/runs`) |
| 1.2.7 | GAP-006 | Add activity routes (GET `/teams/:id/activity`) |
| 1.2.8 | GAP-007 | Add team DELETE endpoint with cascade |

**Deliverable**: Goals hierarchy works. Routines have proper triggers and history. Activity log is accessible via API.

### Sprint 1.3: Dashboard, Costs, Adapters API (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 1.3.1 | GAP-105 | Create dashboard service with aggregated metrics |
| 1.3.2 | GAP-105 | Add dashboard endpoint (GET `/teams/:id/dashboard`) |
| 1.3.3 | GAP-105 | Add sidebar badges endpoint (GET `/sidebar-badges`) |
| 1.3.4 | GAP-106 | Add cost tracking endpoint (GET `/costs`) |
| 1.3.5 | GAP-106 | Add monthly spend endpoint (GET `/monthly-spend`) |
| 1.3.6 | GAP-112 | Add adapter list endpoint (GET `/adapters`) |
| 1.3.7 | GAP-112 | Add adapter test endpoint (POST `/adapters/:type/test`) |
| 1.3.8 | GAP-112 | Add adapter capabilities endpoint |

**Deliverable**: Dashboard data API, cost reporting, adapter management exposed.

### Sprint 1.4: Issues Enhancement & Feedback (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 1.4.1 | GAP-107 | Create `documents` table (revision tracking) + migration |
| 1.4.2 | GAP-107 | Add document service (create revision, list, restore) |
| 1.4.3 | GAP-107 | Add document endpoints on issues |
| 1.4.4 | GAP-108 | Create `feedback` table + migration |
| 1.4.5 | GAP-108 | Create feedback service (vote, list, export) |
| 1.4.6 | GAP-108 | Add feedback endpoints (GET/POST on `/issues/:id/feedback`) |
| 1.4.7 | — | Add issue search/filter improvements (full-text match) |

**Deliverable**: Issues support document revisions and feedback voting.

---

## Phase 2: CLI Expansion

> **Goal**: Build out CLI to match Paperclip's command coverage.
> **Duration**: ~1.5 weeks
> **Dependencies**: Phase 1 (API endpoints must exist)

### Sprint 2.1: CLI Infrastructure (2 days)

| Task | GAP | Description |
|------|-----|-------------|
| 2.1.1 | GAP-110 | Add @clack/prompts dependency |
| 2.1.2 | GAP-110 | Create `cco onboard` command (interactive setup wizard) |
| 2.1.3 | — | Create HTTP client class with retry + auth recovery |
| 2.1.4 | — | Create context profile system (read/write JSON profiles) |
| 2.1.5 | — | Add `--json` output mode to all commands |
| 2.1.6 | — | Create shared output formatting (tables, colors, spinners) |

### Sprint 2.2: Entity Management Commands (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 2.2.1 | GAP-109 | `cco company list/get/delete` |
| 2.2.2 | GAP-109 | `cco agent list/get/local-cli` |
| 2.2.3 | GAP-109 | `cco issue list/get/create/update/comment/checkout/release` |
| 2.2.4 | GAP-109 | `cco approval list/get/create/approve/reject/comment` |
| 2.2.5 | GAP-109 | `cco activity list` |
| 2.2.6 | GAP-109 | `cco dashboard get` |
| 2.2.7 | GAP-109 | `cco context show/list/use/set` |

### Sprint 2.3: Auth & Heartbeat Commands (2 days)

| Task | GAP | Description |
|------|-----|-------------|
| 2.3.1 | — | `cco auth login/logout/whoami` (if authenticated mode exists) |
| 2.3.2 | — | `cco heartbeat run --agent-id <id>` with live streaming |
| 2.3.3 | — | `cco routines disable-all` |
| 2.3.4 | — | `cco db:backup` with retention |
| 2.3.5 | — | Enhanced `cco doctor` with 9 diagnostic checks + auto-repair |

---

## Phase 3: UI Overhaul

> **Goal**: Transform the basic 5-page UI into a full-featured dashboard.
> **Duration**: ~2.5 weeks
> **Dependencies**: Phase 0 (WebSocket), Phase 1 (API endpoints)

### Sprint 3.1: UI Infrastructure (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 3.1.1 | GAP-206 | Implement OkLCH color system with CSS custom properties |
| 3.1.2 | GAP-206 | Add ThemeProvider (light/dark toggle, localStorage persistence) |
| 3.1.3 | GAP-208 | Add ToastProvider (queue, dedup, auto-dismiss) |
| 3.1.4 | — | Add shadcn/ui base components (dialog, popover, select, tabs, tooltip) |
| 3.1.5 | — | Create BreadcrumbProvider + BreadcrumbBar |
| 3.1.6 | — | Create SidebarProvider (open/close, mobile detection) |
| 3.1.7 | — | Add CompanyRail (team selector sidebar) |
| 3.1.8 | GAP-210 | Add MobileBottomNav |

### Sprint 3.2: Real-time & State Management (2 days)

| Task | GAP | Description |
|------|-----|-------------|
| 3.2.1 | — | Create LiveUpdatesProvider (WebSocket client) |
| 3.2.2 | — | Implement auto-reconnect with exponential backoff |
| 3.2.3 | — | Wire WebSocket events to React Query cache invalidation |
| 3.2.4 | — | Implement smart toast suppression |
| 3.2.5 | — | Create DialogProvider (newIssue, newProject, newGoal, newAgent) |
| 3.2.6 | — | Create query key hierarchy in `queryKeys.ts` |

### Sprint 3.3: Core Pages (4 days)

| Task | GAP | Description |
|------|-----|-------------|
| 3.3.1 | — | Redesign Dashboard (activity feed, metrics, cost summary) |
| 3.3.2 | GAP-201 | Create Agent detail page (config, instructions, runs, status) |
| 3.3.3 | GAP-202 | Create Run transcript viewer (event streaming, color coding) |
| 3.3.4 | GAP-203 | Create Issue detail page (comments, timeline, documents) |
| 3.3.5 | — | Create Projects page (list + detail with issues, workspaces, budget) |
| 3.3.6 | GAP-204 | Create Routines page (list + detail with run history, schedule builder) |
| 3.3.7 | GAP-205 | Create Approvals page (pending/all queue, payload viewer) |

### Sprint 3.4: Secondary Pages & Components (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 3.4.1 | — | Create Activity page (filterable log) |
| 3.4.2 | — | Create Goals page (tree view + detail) |
| 3.4.3 | — | Create Costs page (tracking, timeline, provider breakdown) |
| 3.4.4 | — | Create Settings page (team settings, instance settings) |
| 3.4.5 | GAP-207 | Create CommandPalette (Cmd+K global search) |
| 3.4.6 | GAP-209 | Create PropertiesPanel (tabbed detail sidebar) |
| 3.4.7 | — | Add inline entity selectors (agent, project pickers) |

---

## Phase 4: Advanced Features

> **Goal**: Add advanced capabilities that differentiate the platform.
> **Duration**: ~3 weeks
> **Dependencies**: Phases 0-3

### Sprint 4.1: Storage & Secrets (5 days)

| Task | GAP | Description |
|------|-----|-------------|
| 4.1.1 | GAP-302 | Create storage provider abstraction (local_disk backend) |
| 4.1.2 | GAP-302 | Create `assets` table + migration |
| 4.1.3 | GAP-302 | Add asset upload/download/delete endpoints |
| 4.1.4 | GAP-303 | Create secrets provider (local_encrypted) |
| 4.1.5 | GAP-303 | Create `secrets` + `secretVersions` tables + migrations |
| 4.1.6 | GAP-303 | Add secrets CRUD endpoints |
| 4.1.7 | GAP-303 | Create master key file management |

### Sprint 4.2: Additional Adapters (5 days)

| Task | GAP | Description |
|------|-----|-------------|
| 4.2.1 | GAP-307 | Create `@cco/adapter-gemini` (Gemini CLI adapter) |
| 4.2.2 | GAP-307 | Create `@cco/adapter-codex` (Codex adapter) |
| 4.2.3 | GAP-307 | Create `@cco/adapter-cursor` (Cursor agent adapter) |
| 4.2.4 | GAP-307 | Create `@cco/adapter-opencode` (OpenCode adapter) |
| 4.2.5 | — | Add adapter selection UI in agent creation form |
| 4.2.6 | — | Add adapter config JSON Schema forms in UI |

### Sprint 4.3: Skills & Onboarding Assets (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 4.3.1 | — | Create `skills/cco/SKILL.md` (heartbeat execution skill) |
| 4.3.2 | — | Create `skills/cco-create-agent/SKILL.md` (agent creation skill) |
| 4.3.3 | — | Create company-level skills management (table + CRUD) |
| 4.3.4 | — | Create onboarding assets (default AGENTS.md, SOUL.md, HEARTBEAT.md) |
| 4.3.5 | — | Add role templates (architect, developer, reviewer, tester) |
| 4.3.6 | — | Add skills management UI page |

### Sprint 4.4: Export/Import & Docker (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 4.4.1 | GAP-305 | Implement company export (ZIP with metadata, agents, skills, projects, issues) |
| 4.4.2 | GAP-305 | Implement company import (from ZIP/URL, collision modes) |
| 4.4.3 | GAP-305 | Add CLI export/import commands |
| 4.4.4 | — | Create docker-compose.yml (full stack) |
| 4.4.5 | — | Create docker-compose.quickstart.yml |
| 4.4.6 | — | Update Dockerfile to multi-stage build |

---

## Phase 5: Polish & Production Readiness

> **Goal**: Testing, documentation, and production hardening.
> **Duration**: ~1 week
> **Dependencies**: Phases 0-4

### Sprint 5.1: Testing & Evaluation (3 days)

| Task | GAP | Description |
|------|-----|-------------|
| 5.1.1 | GAP-308 | Set up promptfoo evaluation framework |
| 5.1.2 | GAP-308 | Create Phase 0 evals (heartbeat, approvals, boundaries) |
| 5.1.3 | — | Add E2E tests for new pages (agent detail, issue detail, routines) |
| 5.1.4 | — | Add release smoke tests |
| 5.1.5 | — | Verify test coverage >= 80% |

### Sprint 5.2: Documentation & Telemetry (2 days)

| Task | Description |
|------|-------------|
| 5.2.1 | Create API documentation (OpenAPI/Swagger or markdown) |
| 5.2.2 | Create DEVELOPING.md with setup, modes, architecture |
| 5.2.3 | Create DEPLOYMENT.md with Docker, config, modes |
| 5.2.4 | Add anonymous telemetry (opt-out, install tracking) |
| 5.2.5 | Add database backup scheduler |
| 5.2.6 | Add graceful shutdown with connection draining |

---

## Sprint Dependency Graph

```
Phase 0 (Foundation)
  ├── 0.1 Error/Logging ─────────────┐
  ├── 0.2 DB Migrations/Config ──────┤
  └── 0.3 WebSocket/Scheduling ──────┤
                                     │
Phase 1 (Server Features)            │
  ├── 1.1 Agent Enhancements ◄───────┤
  ├── 1.2 Goals/Routines/Activity ◄──┤
  ├── 1.3 Dashboard/Costs/Adapters ◄─┤
  └── 1.4 Issues/Feedback ◄─────────┤
                                     │
Phase 2 (CLI) ◄─────────────────────┤
  ├── 2.1 CLI Infrastructure         │
  ├── 2.2 Entity Commands            │
  └── 2.3 Auth & Heartbeat           │
                                     │
Phase 3 (UI) ◄──────────────────────┤
  ├── 3.1 UI Infrastructure          │
  ├── 3.2 Real-time & State          │
  ├── 3.3 Core Pages                 │
  └── 3.4 Secondary Pages            │
                                     │
Phase 4 (Advanced) ◄────────────────┘
  ├── 4.1 Storage & Secrets
  ├── 4.2 Additional Adapters
  ├── 4.3 Skills & Onboarding
  └── 4.4 Export/Import & Docker

Phase 5 (Polish)
  ├── 5.1 Testing & Evaluation
  └── 5.2 Docs & Telemetry
```

---

## Multi-Agent Execution Strategy

For maximum parallelism during implementation, work can be distributed across agents:

### Parallelizable by Phase

| Phase | Parallel Tracks | Agent Assignment |
|-------|----------------|------------------|
| Phase 0 | Sprint 0.1 (middleware) ∥ Sprint 0.2 (DB/config) | 2 agents |
| Phase 1 | Sprint 1.1 (agents) ∥ Sprint 1.2 (goals/routines) ∥ Sprint 1.3 (dashboard) | 3 agents |
| Phase 2 | Sprint 2.2 (entity cmds) ∥ Sprint 2.3 (auth/heartbeat) | 2 agents |
| Phase 3 | Sprint 3.3 (core pages) ∥ Sprint 3.4 (secondary pages) | 2 agents |
| Phase 4 | Sprint 4.1 (storage) ∥ Sprint 4.2 (adapters) ∥ Sprint 4.3 (skills) | 3 agents |

### Recommended Team Composition

| Agent Role | Responsibility |
|------------|---------------|
| **Architect** | Phase 0 infrastructure, database schema, config system |
| **Backend Developer** | Server routes, services, middleware |
| **CLI Developer** | CLI commands, prompts, formatters |
| **Frontend Developer** | UI pages, components, contexts |
| **DevOps** | Docker, deployment, testing |
| **Reviewer** | Code review after each sprint |

---

## Success Criteria

### Phase 0 Complete When:
- [ ] All error responses follow `{ error, details? }` format
- [ ] Pino logging active with redaction
- [ ] `cco db:migrate` works
- [ ] `cco configure` works
- [ ] WebSocket events flow in real-time
- [ ] Cron routines auto-trigger
- [ ] Orphaned runs are cleaned up

### Phase 1 Complete When:
- [ ] All 60+ missing API endpoints implemented
- [ ] Goals, triggers, documents, feedback tables exist
- [ ] Dashboard returns aggregated data
- [ ] Cost tracking visible via API

### Phase 2 Complete When:
- [ ] 30+ CLI commands working
- [ ] `cco onboard` walks through setup
- [ ] `cco heartbeat run` streams live output
- [ ] All commands support `--json` output

### Phase 3 Complete When:
- [ ] 40+ UI pages rendered
- [ ] Dark mode toggle works
- [ ] WebSocket updates reflect in real-time
- [ ] Command palette navigates to any entity
- [ ] Mobile responsive layout

### Phase 4 Complete When:
- [ ] Assets can be uploaded/downloaded
- [ ] Secrets stored encrypted
- [ ] 3+ adapters beyond claude-code
- [ ] Company export/import works end-to-end
- [ ] Docker compose up starts full stack

### Phase 5 Complete When:
- [ ] Test coverage >= 80%
- [ ] Promptfoo evals pass
- [ ] API documentation complete
- [ ] Graceful shutdown works correctly

---

*End of Implementation Roadmap*
