# CCO vs Paperclip: Gap Analysis Matrix

> **Date**: 2026-04-06
> **Companion doc**: [PAPERCLIP_FEATURE_SPEC.md](./PAPERCLIP_FEATURE_SPEC.md)

---

## Gap Summary

| Priority | Category | Gaps | Effort |
|----------|----------|------|--------|
| P0 (Critical) | Core Infrastructure | 8 | XL |
| P1 (High) | Feature Parity | 12 | L |
| P2 (Medium) | Enhanced UX | 10 | L |
| P3 (Low) | Advanced Features | 8 | M |

---

## P0: Critical Infrastructure Gaps

These must be resolved first — they are architectural foundations that other features depend on.

### GAP-001: Database Migration System
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Drizzle-kit with 48+ numbered migrations, auto-apply/prompt modes, repair |
| **CCO** | No migration system; schema changes require DB recreation |
| **Impact** | Cannot safely evolve schema; data loss on updates |
| **Effort** | M (2-3 days) |
| **Action** | Integrate drizzle-kit, generate initial migration from current schema, add migration commands |

### GAP-002: Configuration System
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Config file (JSON) + env vars + interactive wizard + multi-section configure |
| **CCO** | 6 env vars only |
| **Impact** | Cannot support deployment modes, storage backends, or advanced features |
| **Effort** | L (3-5 days) |
| **Action** | Create config schema, loader with priority chain, config file read/write, `cco configure` command |

### GAP-003: Proper Error Handling Middleware
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Centralized error handler, typed HTTP errors (400-422), Zod validation middleware, log redaction |
| **CCO** | Basic try/catch in routes |
| **Impact** | Inconsistent error responses, no validation middleware, potential data leaks |
| **Effort** | S (1-2 days) |
| **Action** | Create error classes, validation middleware, centralized error handler |

### GAP-004: WebSocket Real-time Events
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Per-company WebSocket with 10+ event types, pub/sub, auth, reconnection |
| **CCO** | Polling only (React Query) |
| **Impact** | UI cannot show live agent execution, status changes are delayed |
| **Effort** | L (3-5 days) |
| **Action** | Add ws package, create live-events endpoint, publish events from services, integrate in UI |

### GAP-005: Request Logging (Pino)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Pino HTTP logger with redaction |
| **CCO** | No request logging |
| **Impact** | Cannot debug issues, no observability |
| **Effort** | S (1 day) |
| **Action** | Add pino + pino-http, configure redaction patterns |

### GAP-006: Activity Log API Exposure
| Aspect | Detail |
|--------|--------|
| **Paperclip** | GET endpoints for company + global activity, exposed in UI dashboard |
| **CCO** | Service exists but no route or UI integration |
| **Impact** | Audit trail exists but is invisible |
| **Effort** | S (1 day) |
| **Action** | Add activity routes, integrate into UI |

### GAP-007: Company/Team Deletion
| Aspect | Detail |
|--------|--------|
| **Paperclip** | DELETE company endpoint with cascade |
| **CCO** | No delete endpoint for teams |
| **Impact** | Cannot clean up test data |
| **Effort** | S (0.5 day) |
| **Action** | Add DELETE route with cascade logic |

### GAP-008: Cron Parser for Routines
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Full 5-field cron parser, validation, next-tick calculation |
| **CCO** | Cron stored as string but never evaluated |
| **Impact** | Routines cannot auto-trigger on schedule |
| **Effort** | M (2 days) |
| **Action** | Implement cron parser or use croner library, add tick evaluation to scheduler |

---

## P1: High Priority Feature Gaps

Core features needed for production-quality orchestration.

### GAP-101: Agent Instructions & Permissions
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Dedicated tables + CRUD endpoints for instructions and permissions |
| **CCO** | Stored as JSON in agent config (no separate management) |
| **Effort** | M (2 days) |

### GAP-102: Agent API Keys
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Per-agent SHA256 hashed keys, CRUD, last_used_at tracking |
| **CCO** | Single global API key via env var |
| **Effort** | M (2-3 days) |

### GAP-103: Goals System
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Hierarchical goals linked to projects/issues, tree view |
| **CCO** | Not implemented |
| **Effort** | M (2-3 days) |

### GAP-104: Routine Triggers
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Separate trigger entities (cron/event), run history, public triggers |
| **CCO** | Inline cron field, manual trigger only |
| **Effort** | M (2-3 days) |

### GAP-105: Dashboard API & Data
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Dashboard service with aggregated metrics, sidebar badges |
| **CCO** | UI calculates from individual queries |
| **Effort** | S (1-2 days) |

### GAP-106: Cost Tracking API
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Cost tracking endpoint, monthly spend, timeline views |
| **CCO** | Cost events stored but no API or visualization |
| **Effort** | M (2 days) |

### GAP-107: Issue Documents & Revisions
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Document revision tracking with restore capability |
| **CCO** | Not implemented |
| **Effort** | M (2-3 days) |

### GAP-108: Feedback System
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Voting (thumbs up/down), feedback traces, export |
| **CCO** | Not implemented |
| **Effort** | L (3-4 days) |

### GAP-109: CLI Client Commands
| Aspect | Detail |
|--------|--------|
| **Paperclip** | 30+ CLI commands (company, issue, agent, approval, activity, etc.) |
| **CCO** | 3 commands (doctor, start, status) |
| **Effort** | XL (5-7 days) |

### GAP-110: CLI Onboarding Wizard
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Interactive setup with @clack/prompts, quickstart/advanced modes |
| **CCO** | None |
| **Effort** | M (2-3 days) |

### GAP-111: Orphan Run Reaping
| Aspect | Detail |
|--------|--------|
| **Paperclip** | `reapOrphanedRuns()` cleans stale state, `resumeQueuedRuns()` restarts queued |
| **CCO** | Runs can get stuck in running state |
| **Effort** | S (1 day) |

### GAP-112: Adapter Registry API
| Aspect | Detail |
|--------|--------|
| **Paperclip** | List, test, validate, capabilities endpoints |
| **CCO** | Registry exists internally but not exposed |
| **Effort** | S (1 day) |

---

## P2: Medium Priority Feature Gaps

Enhanced UX and operational capabilities.

### GAP-201: UI Agent Detail Page
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Full agent detail with config, instructions, runs, status |
| **CCO** | Grid view only, no detail page |
| **Effort** | L (3-4 days) |

### GAP-202: UI Run Transcript Viewer
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Rich transcript view with event streaming, color coding |
| **CCO** | Basic run detail panel with raw output |
| **Effort** | M (2-3 days) |

### GAP-203: UI Issue Detail Page
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Full page with comments, timeline, documents |
| **CCO** | Modal overlay only |
| **Effort** | M (2-3 days) |

### GAP-204: UI Routines Page
| Aspect | Detail |
|--------|--------|
| **Paperclip** | List, detail with run history, variable editor, schedule builder |
| **CCO** | Not in UI |
| **Effort** | L (3-4 days) |

### GAP-205: UI Approvals Page
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Pending/all queue, approval detail with payload viewer |
| **CCO** | Not in UI |
| **Effort** | M (2-3 days) |

### GAP-206: Dark Mode
| Aspect | Detail |
|--------|--------|
| **Paperclip** | OkLCH color system, light/dark toggle, localStorage persistence |
| **CCO** | Light mode only |
| **Effort** | M (2 days) |

### GAP-207: Command Palette (Cmd+K)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Global search, navigation, actions |
| **CCO** | Not implemented |
| **Effort** | M (2 days) |

### GAP-208: Toast Notifications
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Toast queue, dedup, auto-dismiss, action buttons, smart suppression |
| **CCO** | No notification system |
| **Effort** | M (2 days) |

### GAP-209: Properties Panel
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Tabbed detail sidebar for contextual info |
| **CCO** | Not implemented |
| **Effort** | M (2 days) |

### GAP-210: Breadcrumbs & Improved Navigation
| Aspect | Detail |
|--------|--------|
| **Paperclip** | BreadcrumbBar, CompanyRail, MobileBottomNav |
| **CCO** | Basic sidebar only |
| **Effort** | S (1-2 days) |

---

## P3: Advanced Feature Gaps (Lower Priority)

These can be deferred until core features are solid.

### GAP-301: Plugin System
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Full SDK, lifecycle, worker management, job queue, event bus, sandbox |
| **CCO** | Not implemented |
| **Effort** | XXL (10+ days) |

### GAP-302: Storage Providers (Local + S3)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Asset upload/download, local disk + S3 backends |
| **CCO** | Not implemented |
| **Effort** | L (3-5 days) |

### GAP-303: Secrets Management
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Encrypted storage, versioning, master key, strict mode |
| **CCO** | Not implemented |
| **Effort** | L (3-4 days) |

### GAP-304: Multi-User Auth (BetterAuth)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | OAuth, JWT sessions, roles, company memberships |
| **CCO** | Optional single API key |
| **Effort** | XL (5-7 days) |

### GAP-305: Company Export/Import
| Aspect | Detail |
|--------|--------|
| **Paperclip** | ZIP-based portability with collision modes |
| **CCO** | Not implemented |
| **Effort** | L (3-5 days) |

### GAP-306: Execution Workspaces
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Runtime environments with lifecycle management |
| **CCO** | Not implemented |
| **Effort** | L (3-5 days) |

### GAP-307: Additional Adapters (6 missing)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | codex, cursor, gemini, openclaw-gateway, opencode, pi |
| **CCO** | claude-code only |
| **Effort** | XL (1-2 days per adapter) |

### GAP-308: Evaluation Framework (Promptfoo)
| Aspect | Detail |
|--------|--------|
| **Paperclip** | Promptfoo evals for heartbeat, approvals, boundaries |
| **CCO** | Not implemented |
| **Effort** | M (2-3 days) |

---

## Implementation Effort Legend

| Size | Duration | Description |
|------|----------|-------------|
| S | 0.5-1 day | Small, isolated change |
| M | 2-3 days | Medium, touches multiple files |
| L | 3-5 days | Large, new subsystem |
| XL | 5-7 days | Extra large, cross-cutting |
| XXL | 10+ days | Major system, new architecture |

---

## Statistics

| Priority | Total Gaps | Effort Sum |
|----------|-----------|------------|
| P0 | 8 | ~15 days |
| P1 | 12 | ~30 days |
| P2 | 10 | ~25 days |
| P3 | 8 | ~50 days |
| **Total** | **38** | **~120 days** |

---

*End of Gap Analysis*
