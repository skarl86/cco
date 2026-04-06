# Paperclip Feature Specification for CCO Refactoring

> **Purpose**: This document is a comprehensive feature specification derived from deep analysis of the Paperclip project (paperclip-ref). It serves as the authoritative reference for refactoring CCO to achieve feature parity with Paperclip, adapted for Claude Code.
>
> **Date**: 2026-04-06
> **Source**: paperclip-ref @ /Users/namgee/private-workspace/paperclip-ref

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model & Database](#2-data-model--database)
3. [Server: Configuration System](#3-server-configuration-system)
4. [Server: Authentication & Authorization](#4-server-authentication--authorization)
5. [Server: API Endpoints (Complete Catalog)](#5-server-api-endpoints-complete-catalog)
6. [Server: Middleware Pipeline](#6-server-middleware-pipeline)
7. [Server: Core Services](#7-server-core-services)
8. [Server: Plugin System](#8-server-plugin-system)
9. [Server: Adapter System](#9-server-adapter-system)
10. [Server: Real-time (WebSocket)](#10-server-real-time-websocket)
11. [Server: Background Jobs & Scheduling](#11-server-background-jobs--scheduling)
12. [Server: Storage & Secrets](#12-server-storage--secrets)
13. [Server: Startup & Lifecycle](#13-server-startup--lifecycle)
14. [CLI: Commands (Complete Catalog)](#14-cli-commands-complete-catalog)
15. [CLI: Configuration & Diagnostics](#15-cli-configuration--diagnostics)
16. [CLI: Authentication Flow](#16-cli-authentication-flow)
17. [CLI: Heartbeat Execution](#17-cli-heartbeat-execution)
18. [CLI: Plugin Management](#18-cli-plugin-management)
19. [CLI: Company Export/Import](#19-cli-company-exportimport)
20. [UI: Pages & Routes (Complete Catalog)](#20-ui-pages--routes-complete-catalog)
21. [UI: Component Architecture](#21-ui-component-architecture)
22. [UI: State Management](#22-ui-state-management)
23. [UI: Real-time Updates](#23-ui-real-time-updates)
24. [UI: Theme & Styling System](#24-ui-theme--styling-system)
25. [UI: Form Handling & Editors](#25-ui-form-handling--editors)
26. [Shared Packages](#26-shared-packages)
27. [Skills & Agent Configuration](#27-skills--agent-configuration)
28. [Testing & Evaluation](#28-testing--evaluation)
29. [Deployment & Docker](#29-deployment--docker)
30. [Telemetry & Observability](#30-telemetry--observability)

---

## 1. Architecture Overview

### Paperclip Architecture

```
paperclip/
├── packages/
│   ├── db/                    # Drizzle ORM + PostgreSQL (48+ migrations)
│   ├── shared/                # Types, validators, constants, API contracts
│   ├── adapter-utils/         # Adapter plugin interface
│   └── adapters/              # 7 built-in adapters
│       ├── claude-local/
│       ├── codex-local/
│       ├── cursor-local/
│       ├── gemini-local/
│       ├── openclaw-gateway/
│       ├── opencode-local/
│       └── pi-local/
├── server/                    # Express REST API + orchestration
│   ├── src/routes/            # 20+ route modules
│   ├── src/services/          # 30+ service modules
│   ├── src/middleware/         # Auth, validation, error handling
│   ├── src/realtime/          # WebSocket live events
│   ├── src/storage/           # Storage providers (local, S3)
│   └── src/onboarding-assets/ # Default templates
├── cli/                       # Commander.js CLI
│   ├── src/commands/          # 15+ command modules
│   ├── src/commands/client/   # 10+ client commands
│   ├── src/checks/            # 9 diagnostic checks
│   ├── src/adapters/          # CLI adapter formatters
│   └── src/prompts/           # 6 interactive prompt modules
├── ui/                        # React + Vite SPA
│   ├── src/pages/             # 47+ pages
│   ├── src/components/        # 100+ components
│   ├── src/api/               # 23 API client modules
│   ├── src/context/           # 11 React contexts
│   └── src/hooks/             # 8+ custom hooks
├── skills/                    # Public skills (4)
├── .agents/skills/            # Internal agent skills (6)
├── plugins/                   # Plugin SDK + examples
├── evals/                     # Promptfoo evaluation framework
├── docker/                    # 5 Docker configurations
├── docs/                      # Mintlify documentation site
└── doc/                       # Strategic + operational docs (50+ plans)
```

### CCO Current Architecture

```
cco/
├── packages/
│   ├── db/                    # Drizzle ORM + SQLite (11 tables, no migrations)
│   ├── shared/                # Types, validators, ID generator
│   ├── adapter-utils/         # Adapter plugin interface
│   └── adapters/
│       └── claude-code/       # 1 adapter only
├── server/                    # Express REST API
│   ├── src/routes/            # 8 route modules
│   ├── src/services/          # 14 service modules
│   └── src/middleware/        # Auth only
├── cli/                       # 3 commands (doctor, start, status)
├── ui/                        # React + Vite SPA
│   ├── src/pages/             # 5 pages
│   └── src/components/        # ~10 components
├── skills/                    # Empty
└── tests/                     # 27 test files
```

### Key Architectural Differences

| Aspect | Paperclip | CCO |
|--------|-----------|-----|
| Database | PostgreSQL (embedded or external) | SQLite |
| Migrations | Drizzle-kit (48+ migrations) | No migration system |
| Adapters | 7 built-in | 1 (claude-code) |
| Routes | 20+ modules | 8 modules |
| Services | 30+ modules | 14 modules |
| UI Pages | 47+ pages | 5 pages |
| CLI Commands | 30+ commands | 3 commands |
| Real-time | WebSocket | Polling only |
| Plugins | Full plugin SDK | None |
| Auth | BetterAuth + JWT + API keys | Optional bearer token |
| Storage | Local disk + S3 | None |
| Secrets | Encrypted local + external | None |

---

## 2. Data Model & Database

### Paperclip Entity Model

```
Company (top-level tenant)
├── Goals (mission + strategic hierarchy)
├── Agents (org chart with reports_to tree)
│   ├── Instructions (system prompts)
│   ├── Permissions (capability sets)
│   ├── API Keys (hashed, per-agent)
│   └── Budget + Spend tracking
├── Projects (work areas)
│   └── Execution Workspaces (runtime environments)
├── Issues/Tasks (work items)
│   ├── Comments (threaded discussion)
│   ├── Documents (revision-tracked content)
│   └── Feedback (voting + traces)
├── Routines (scheduled task definitions)
│   ├── Triggers (cron/event-based)
│   └── Runs (execution history)
├── Approvals (governance gates)
│   └── Items (individual approval items)
├── Secrets (encrypted key-value store)
│   └── Versions (secret history)
├── Assets (file attachments)
├── Plugins (installed extensions)
│   ├── Configs
│   ├── Logs
│   ├── Jobs (background queue)
│   ├── State (runtime)
│   └── Webhook Deliveries
├── Skills (company-level skill files)
└── Activity Log (immutable audit trail)
```

### Complete Table Inventory (Paperclip)

#### User & Identity
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `authUsers` | User accounts with email verification | **MISSING** |
| `companyMemberships` | User→Company relationships with roles | **MISSING** |
| `instanceUserRoles` | Instance admin roles | **MISSING** |
| `agentApiKeys` | SHA256 hashed API keys per agent | **MISSING** |

#### Organizations
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `companies` | Multi-tenant company/workspace entities | `teams` (partial) |
| `companyMemberships` | Membership with roles (owner/admin/member) | **MISSING** |

#### Agents
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `agents` | Agent definitions, adapter config, status | `agents` (partial) |
| `agentApiKeys` | Per-agent authentication keys | **MISSING** |
| `agentInstructions` | System prompt management | **MISSING** (stored as JSON in agent config) |
| `agentPermissions` | Capability permission sets | **MISSING** (stored as JSON in agent) |

#### Projects & Issues
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `projects` | Project containers | `projects` (partial) |
| `issues` | Work items with rich state machine | `tasks` (partial) |
| `issueComments` | Threaded discussion | `task_comments` (basic) |
| `documents` | Issue document revision tracking | **MISSING** |

#### Routines & Scheduling
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `routines` | Scheduled task definitions with variables | `routines` (basic) |
| `routineTriggers` | Cron/event-based triggers | **MISSING** |
| `routineRuns` | Execution history | **MISSING** |

#### Approvals & Governance
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `approvals` | Approval requests | `approvals` (basic) |
| `approvalItems` | Individual items needing approval | **MISSING** |

#### Storage & Files
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `assets` | Uploaded file attachments | **MISSING** |
| `storageRefs` | Storage metadata | **MISSING** |

#### Secrets
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `secrets` | Encrypted secret storage | **MISSING** |
| `secretVersions` | Secret version history | **MISSING** |

#### Plugins
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `plugins` | Installed plugin registry | **MISSING** |
| `pluginConfigs` | Plugin configuration | **MISSING** |
| `pluginLogs` | Plugin execution logs | **MISSING** |
| `pluginWebhookDeliveries` | Webhook tracking | **MISSING** |
| `pluginJobs` | Background job queue | **MISSING** |
| `pluginState` | Plugin runtime state | **MISSING** |

#### Runtime & Execution
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `executionWorkspaces` | Runtime environments | **MISSING** |
| `workspaceRuns` | Execution runs | `runs` (partial) |
| `workspaceOperations` | Operation tracking | **MISSING** |
| `workspaceOperationLogs` | Operation logs | **MISSING** |

#### Audit & Monitoring
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `activityLog` | Immutable audit trail | `activity_log` (basic) |
| `heartbeats` | Runtime heartbeat tracking | **MISSING** |

#### Financial
| Table | Purpose | CCO Equivalent |
|-------|---------|----------------|
| `costEvents` (implied) | Cost tracking per run | `cost_events` (basic) |
| `budgetPolicies` (implied) | Budget rules | `budget_policies` (basic) |

### Database Infrastructure

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| Database engine | PostgreSQL (embedded or external) | SQLite |
| ORM | Drizzle | Drizzle |
| Migrations | drizzle-kit with 48+ numbered migrations | No migration system |
| Backup | Automated interval-based backup with retention | None |
| Migration auto-apply | Configurable (auto/prompt/never) | N/A |
| Migration repair | Repair broken migration history | N/A |
| Seed data | `pnpm seed` command | None |
| Connection pooling | PostgreSQL native | N/A (SQLite) |

---

## 3. Server: Configuration System

### Configuration Loading Priority (Paperclip)

```
1. Environment variables (highest)
2. .env file in working directory
3. ~/.paperclip/env (home directory)
4. paperclip.config.json (file-based config)
5. Defaults (lowest)
```

### Complete Configuration Options

#### Server
| Variable | Default | Purpose |
|----------|---------|---------|
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | `local_trusted` or `authenticated` |
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `private` | `private` or `public` |
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `3100` | Server port |
| `PAPERCLIP_ALLOWED_HOSTNAMES` | — | Comma-separated allowed hosts |
| `SERVE_UI` | `true` | Serve static UI |
| `PAPERCLIP_UI_DEV_MIDDLEWARE` | — | Use Vite dev middleware |
| `PAPERCLIP_OPEN_ON_LISTEN` | — | Auto-open browser |

#### Database
| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | External PostgreSQL connection |
| `PAPERCLIP_DATABASE_MODE` | `embedded-postgres` | `embedded-postgres` or `postgres` |
| `PAPERCLIP_EMBEDDED_POSTGRES_DATA_DIR` | — | Embedded PG data directory |
| `PAPERCLIP_EMBEDDED_POSTGRES_PORT` | `54329` | Embedded PG port |
| `PAPERCLIP_DB_BACKUP_ENABLED` | `true` | Enable automated backups |
| `PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES` | `60` | Backup interval |
| `PAPERCLIP_DB_BACKUP_RETENTION_DAYS` | `30` | Backup retention |
| `PAPERCLIP_DB_BACKUP_DIR` | — | Backup directory |
| `PAPERCLIP_MIGRATION_AUTO_APPLY` | — | Auto-apply DB migrations |
| `PAPERCLIP_MIGRATION_PROMPT` | — | `never` or prompt |

#### Authentication
| Variable | Default | Purpose |
|----------|---------|---------|
| `PAPERCLIP_AUTH_BASE_URL_MODE` | `auto` | `auto` or `explicit` |
| `PAPERCLIP_AUTH_PUBLIC_BASE_URL` | — | Public URL for auth redirects |
| `BETTER_AUTH_SECRET` | — | JWT signing secret |
| `PAPERCLIP_AUTH_DISABLE_SIGN_UP` | — | Disable registration |
| `BETTER_AUTH_TRUSTED_ORIGINS` | — | CORS origins |

#### Storage
| Variable | Default | Purpose |
|----------|---------|---------|
| `PAPERCLIP_STORAGE_PROVIDER` | `local_disk` | `local_disk` or `s3` |
| `PAPERCLIP_STORAGE_LOCAL_DIR` | — | Local storage path |
| `PAPERCLIP_STORAGE_S3_BUCKET` | — | S3 bucket |
| `PAPERCLIP_STORAGE_S3_REGION` | — | AWS region |
| `PAPERCLIP_STORAGE_S3_ENDPOINT` | — | Custom S3 endpoint |
| `PAPERCLIP_STORAGE_S3_PREFIX` | — | Key prefix |
| `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | — | Path-style URLs |

#### Secrets
| Variable | Default | Purpose |
|----------|---------|---------|
| `PAPERCLIP_SECRETS_PROVIDER` | `local_encrypted` | Secret backend |
| `PAPERCLIP_SECRETS_STRICT_MODE` | — | Enforce validation |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | — | Encryption key file |

#### Heartbeat & Scheduling
| Variable | Default | Purpose |
|----------|---------|---------|
| `HEARTBEAT_SCHEDULER_ENABLED` | `true` | Enable scheduler |
| `HEARTBEAT_SCHEDULER_INTERVAL_MS` | `30000` | Tick interval |

#### Features
| Variable | Default | Purpose |
|----------|---------|---------|
| `PAPERCLIP_ENABLE_COMPANY_DELETION` | local_trusted only | Allow company deletion |
| `TELEMETRY_ENABLED` | `true` | Anonymous telemetry |

### Config File Structure

```json
{
  "$meta": { "version": "...", "updatedAt": "...", "source": "..." },
  "database": {
    "mode": "embedded-postgres|postgres",
    "connectionString": "...",
    "embeddedPostgresDataDir": "...",
    "embeddedPostgresPort": 54329,
    "backup": {
      "enabled": true,
      "intervalMinutes": 60,
      "retentionDays": 30,
      "dir": "..."
    }
  },
  "logging": { "mode": "...", "logDir": "..." },
  "server": {
    "deploymentMode": "local_trusted|authenticated",
    "exposure": "private|public",
    "host": "127.0.0.1",
    "port": 3100,
    "allowedHostnames": [],
    "serveUi": true
  },
  "auth": {
    "baseUrlMode": "auto|explicit",
    "disableSignUp": false,
    "publicBaseUrl": "..."
  },
  "llm": { "provider": "...", "apiKey": "..." },
  "storage": {
    "provider": "local_disk|s3",
    "localDisk": { "baseDir": "..." },
    "s3": { "bucket": "...", "region": "...", "endpoint": "...", "prefix": "...", "forcePathStyle": false }
  },
  "secrets": {
    "provider": "local_encrypted",
    "strictMode": false,
    "localEncrypted": { "keyFilePath": "..." }
  },
  "telemetry": { "enabled": true }
}
```

### CCO Gap

CCO has only 6 environment variables (`CCO_HOME`, `CCO_DB_PATH`, `CCO_PORT`, `CCO_API_KEY`, `CCO_SCHEDULER_INTERVAL_MS`, `CCO_API_URL`). No config file system, no interactive configuration, no deployment modes.

---

## 4. Server: Authentication & Authorization

### Authentication Mechanisms (Paperclip)

#### 1. Local Trusted Mode (`local_trusted`)
- No real authentication required
- Fixed principal: `local-board` user with instance_admin role
- Auto-created on startup
- Company memberships auto-granted
- Suitable for single-user local development

#### 2. Authenticated Mode (`authenticated`)
- BetterAuth integration for OAuth/social login
- JWT session tokens stored in database
- Session cookie management
- Email + password sign-up/sign-in

#### 3. Agent Authentication
- **JWT tokens**: Claims include `sub`, `company_id`, `run_id`
- **API keys**: SHA256 hashed, stored with company + agent association
- Key validation with `last_used_at` tracking
- Multiple keys per agent supported

#### 4. Board API Keys
- User authentication via API key tokens
- SHA256 hash verification
- Company/role access resolution

### Actor Model

```typescript
type Actor =
  | { type: 'board'; userId: string; companyIds: string[]; isInstanceAdmin: boolean }
  | { type: 'agent'; agentId: string; companyId: string; runId?: string }
  | { type: 'none' }
```

### Actor Resolution Sources (Priority Order)
1. `local_implicit` — In local_trusted mode, auto-assigns local-board user
2. `session` — BetterAuth session cookie
3. `board_key` — Board API key in Authorization header
4. `agent_jwt` — Agent JWT in Authorization header
5. `agent_key` — Agent API key in Authorization header

### Authorization Patterns
- **Company-scoped**: `actor.companyIds.includes(resourceCompanyId)`
- **Instance admin**: `actor.isInstanceAdmin`
- **Agent self**: `actor.companyId === resource.companyId` (for agent actors)
- **Middleware guards**: `requireBoard()`, company path guards

### CCO Gap

CCO has only optional bearer token auth with timing-safe comparison. No user accounts, no roles, no company-scoped access, no agent JWT, no multiple API keys.

---

## 5. Server: API Endpoints (Complete Catalog)

### Health & Status
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Server health with deployment info |

### Authentication
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/auth/get-session` | Get current session |
| `POST` | `/api/auth/*` | BetterAuth endpoints (sign up/in/out) |

### Companies (CCO: "Teams")
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies` | List companies | `GET /api/teams` |
| `POST` | `/api/companies` | Create company | `POST /api/teams` |
| `GET` | `/api/companies/:id` | Get company | `GET /api/teams/:id` |
| `PATCH` | `/api/companies/:id` | Update company | `PATCH /api/teams/:id` |
| `DELETE` | `/api/companies/:id` | Delete company | **MISSING** |
| `GET` | `/api/companies/:id/members` | List members | **MISSING** |
| `POST` | `/api/companies/:id/members` | Add member | **MISSING** |
| `DELETE` | `/api/companies/:id/members/:userId` | Remove member | **MISSING** |
| `POST` | `/api/companies/:id/export` | Export company | **MISSING** |
| `POST` | `/api/companies/:id/import` | Import company | **MISSING** |
| `GET/PATCH` | `/api/companies/:id/branding` | Company branding | **MISSING** |

### Agents
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/agents` | List agents | `GET /api/teams/:id/agents` |
| `POST` | `/api/companies/:id/agents` | Create agent | `POST /api/teams/:id/agents` |
| `GET` | `/api/agents/:id` | Get agent | `GET /api/teams/:id/agents/:id` |
| `PATCH` | `/api/agents/:id` | Update agent | `PATCH /api/teams/:id/agents/:id` |
| `DELETE` | `/api/agents/:id` | Delete agent | `DELETE /api/teams/:id/agents/:id` |
| `POST` | `/api/agents/:id/approve` | Approve pending agent | **MISSING** |
| `GET` | `/api/agents/:id/instructions` | Get instructions | **MISSING** |
| `PATCH` | `/api/agents/:id/instructions` | Update instructions | **MISSING** |
| `GET` | `/api/agents/:id/permissions` | Get permissions | **MISSING** |
| `PATCH` | `/api/agents/:id/permissions` | Update permissions | **MISSING** |
| `POST` | `/api/agents/:id/keys` | Create API key | **MISSING** |
| `DELETE` | `/api/agents/:id/keys/:keyId` | Revoke API key | **MISSING** |

### Skills
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/skills` | List company skills | **MISSING** |
| `POST` | `/api/companies/:id/skills` | Add skill | **MISSING** |
| `DELETE` | `/api/companies/:id/skills/:skillId` | Remove skill | **MISSING** |

### Projects
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/projects` | List projects | `GET /api/teams/:id/projects` |
| `POST` | `/api/companies/:id/projects` | Create project | `POST /api/teams/:id/projects` |
| `GET` | `/api/projects/:id` | Get project | `GET /api/teams/:id/projects/:id` |
| `PATCH` | `/api/projects/:id` | Update project | `PATCH /api/teams/:id/projects/:id` |
| `DELETE` | `/api/projects/:id` | Delete project | **MISSING** |

### Issues (CCO: "Tasks")
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/projects/:id/issues` | List issues | `GET /api/teams/:id/tasks` |
| `POST` | `/api/projects/:id/issues` | Create issue | `POST /api/teams/:id/tasks` |
| `GET` | `/api/issues/:id` | Get issue | `GET /api/teams/:id/tasks/:id` |
| `PATCH` | `/api/issues/:id` | Update issue | `PATCH /api/teams/:id/tasks/:id` |
| `POST` | `/api/issues/:id/comment` | Add comment | `POST /api/teams/:id/tasks/:id/comments` |
| `POST` | `/api/issues/:id/approve` | Approve changes | **MISSING** |
| `GET` | `/api/issues/:id/feedback` | Get feedback | **MISSING** |
| `POST` | `/api/issues/:id/feedback` | Add feedback | **MISSING** |
| — | Goal context routes | Goal linkage | **MISSING** |
| — | Telemetry routes | Issue telemetry | **MISSING** |
| — | Document restoration | Restore revisions | **MISSING** |

### Goals
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/projects/:id/goals` | List goals | **MISSING** |
| `POST` | `/api/projects/:id/goals` | Create goal | **MISSING** |
| `GET` | `/api/goals/:id` | Get goal | **MISSING** |
| `PATCH` | `/api/goals/:id` | Update goal | **MISSING** |

### Routines
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/routines` | List routines | `GET /api/teams/:id/routines` |
| `POST` | `/api/companies/:id/routines` | Create routine | `POST /api/teams/:id/routines` |
| `GET` | `/api/routines/:id` | Get routine | **MISSING** |
| `PATCH` | `/api/routines/:id` | Update routine | `PATCH /api/teams/:id/routines/:id` |
| `DELETE` | `/api/routines/:id` | Delete routine | **MISSING** |
| `GET` | `/api/routines/:id/runs` | Get run history | **MISSING** |
| `POST` | `/api/routines/:id/run` | Manual trigger | `POST /api/teams/:id/routines/:id/trigger` |
| `POST` | `/api/routines/:id/triggers` | Create trigger | **MISSING** |
| `PATCH` | `/api/routine-triggers/:id` | Update trigger | **MISSING** |
| `DELETE` | `/api/routine-triggers/:id` | Delete trigger | **MISSING** |
| `POST` | `/api/routine-triggers/public/:publicId/fire` | Public trigger | **MISSING** |

### Execution Workspaces
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/execution-workspaces` | List workspaces | **MISSING** |
| `POST` | `/api/companies/:id/execution-workspaces` | Create workspace | **MISSING** |
| `GET` | `/api/execution-workspaces/:id` | Get workspace | **MISSING** |

### Approvals
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/approvals` | List approvals | `GET /api/teams/:id/approvals` |
| `POST` | `/api/approvals/:id/approve` | Approve | `POST /api/teams/:id/approvals/:id/decide` |
| `POST` | `/api/approvals/:id/reject` | Reject | (merged into decide) |
| — | Idempotent approval endpoints | Idempotent ops | **MISSING** |

### Secrets
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/secrets` | List secrets | **MISSING** |
| `POST` | `/api/companies/:id/secrets` | Create secret | **MISSING** |
| `GET` | `/api/secrets/:id` | Get secret | **MISSING** |
| `PATCH` | `/api/secrets/:id` | Update secret | **MISSING** |
| `DELETE` | `/api/secrets/:id` | Delete secret | **MISSING** |

### Assets
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `POST` | `/api/companies/:id/assets` | Upload asset | **MISSING** |
| `GET` | `/api/companies/:id/assets/:id` | Download asset | **MISSING** |
| `DELETE` | `/api/companies/:id/assets/:id` | Delete asset | **MISSING** |

### Plugins
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/plugins` | List plugins | **MISSING** |
| `POST` | `/api/companies/:id/plugins` | Install plugin | **MISSING** |
| `DELETE` | `/api/companies/:id/plugins/:id` | Uninstall | **MISSING** |
| `PATCH` | `/api/companies/:id/plugins/:id` | Configure | **MISSING** |
| `POST` | `/api/companies/:id/plugins/:id/upgrade` | Upgrade | **MISSING** |
| `POST` | `/api/companies/:id/plugins/:id/health` | Health check | **MISSING** |
| `GET` | `/api/companies/:id/plugins/:id/logs` | Get logs | **MISSING** |
| `GET` | `/api/companies/:id/plugins/:id/ui-slots` | UI contributions | **MISSING** |
| `POST` | `/api/plugins/:id/tools/:toolId` | Execute tool | **MISSING** |

### Adapters
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/adapters` | List adapters | **MISSING** |
| `GET` | `/api/adapters/:type` | Get adapter | **MISSING** |
| `POST` | `/api/adapters/:type/test` | Test environment | **MISSING** |
| `POST` | `/api/adapters/:type/validate` | Validate config | **MISSING** |
| `POST` | `/api/adapters/:type/capabilities` | Get capabilities | **MISSING** |

### LLMs
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/llms` | List available LLMs | **MISSING** |
| `POST` | `/api/llms` | Register LLM | **MISSING** |
| `PATCH` | `/api/llms/:modelId` | Update LLM config | **MISSING** |

### Activity & Dashboard
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/companies/:id/activity` | Company activity log | **MISSING** (service exists) |
| `GET` | `/api/activity` | Global activity log | **MISSING** |
| `GET` | `/api/companies/:id/dashboard` | Dashboard data | **MISSING** |
| `GET` | `/api/sidebar-badges` | Badge counts | **MISSING** |
| `GET` | `/api/instance-settings` | Instance settings | **MISSING** |
| `GET` | `/org-chart-svg` | Org chart SVG | **MISSING** |

### Costs & Finance
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/costs` | Cost tracking | **MISSING** |
| `GET` | `/api/monthly-spend` | Monthly spend | **MISSING** |

### Access Control
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `GET` | `/api/access` | Access list | **MISSING** |

### Real-time
| Method | Path | Purpose | CCO |
|--------|------|---------|-----|
| `WS` | `/api/companies/:id/events/ws` | WebSocket events | **MISSING** |

---

## 6. Server: Middleware Pipeline

### Paperclip Middleware Stack (in order)

1. **`httpLogger`** — Pino-based HTTP request/response logging
2. **`privateHostnameGuard`** — Restricts access to allowed hostnames in private mode
3. **`actorMiddleware`** — Resolves actor (board/agent/none) from JWT/API key/session/cookie
4. **`boardMutationGuard`** — Prevents mutations in read-only modes
5. **`validate`** — Zod schema validation middleware (per-route)
6. **`errorHandler`** — Centralized error handling with telemetry

### Error Classification

```typescript
badRequest(400)    // Validation errors, malformed input
unauthorized(401)  // Missing/invalid credentials
forbidden(403)     // Insufficient permissions
notFound(404)      // Resource not found
conflict(409)      // State conflict (duplicate)
unprocessable(422) // Semantic validation failed
```

### Error Response Format

```json
{
  "error": "Human-readable message",
  "details": { }  // Optional validation details
}
```

### Log Redaction
- API keys, tokens, secrets redacted from logs
- Stack traces excluded from error responses
- Telemetry client redacts sensitive data

### CCO Gap

CCO has only bearer token auth middleware. No request logging, no hostname guard, no Zod validation middleware, no proper error handler (uses basic try/catch), no log redaction.

---

## 7. Server: Core Services

### Complete Service Inventory

| Service | Purpose | CCO |
|---------|---------|-----|
| `companyService` | CRUD, membership, portability (export/import) | `teams.ts` (CRUD only) |
| `agentService` | CRUD, approval workflow, instructions, permissions | `agents.ts` (CRUD only) |
| `projectService` | Project management | `projects.ts` (basic) |
| `issueService` | Issue lifecycle, checkout, documents, feedback | `tasks.ts` (basic state machine) |
| `goalService` | Goal hierarchy and tracking | **MISSING** |
| `routineService` | Scheduled task execution with variables | `routines.ts` (basic) |
| `approvalService` | Change governance workflow | `approvals.ts` (basic) |
| `costService` | Cost tracking and reporting | **MISSING** (budget check exists) |
| `financeService` | Monthly spend aggregation | **MISSING** |
| `executionWorkspaceService` | Runtime environment management | **MISSING** |
| `assetService` | File storage/retrieval | **MISSING** |
| `secretService` | Encrypted secret management | **MISSING** |
| `activityService` | Audit logging | `activity.ts` (basic) |
| `dashboardService` | Aggregated view data | **MISSING** |
| `boardAuthService` | Board principal authentication | **MISSING** |
| `accessService` | Permission checks | **MISSING** |
| `feedbackService` | Telemetry/feedback export | **MISSING** |
| `heartbeatService` | Run lifecycle management | `scheduler.ts` (basic) |
| `workProductService` | Output management | **MISSING** |
| `storageService` | File storage backend abstraction | **MISSING** |

### Plugin System Services

| Service | Purpose | CCO |
|---------|---------|-----|
| `pluginRegistryService` | Plugin persistence | **MISSING** |
| `pluginLifecycleManager` | Install/uninstall/enable lifecycle | **MISSING** |
| `pluginWorkerManager` | Worker process management | **MISSING** |
| `pluginJobScheduler` | Background job scheduling | **MISSING** |
| `pluginJobStore` | Job persistence | **MISSING** |
| `pluginToolDispatcher` | Tool execution routing | **MISSING** |
| `pluginLoader` | Dynamic module loading | **MISSING** |
| `pluginManifestValidator` | Schema validation | **MISSING** |
| `pluginEventBus` | Inter-plugin events | **MISSING** |
| `pluginRuntimeSandbox` | Execution isolation | **MISSING** |
| `pluginSecretsHandler` | Secret injection | **MISSING** |
| `pluginDevWatcher` | Hot reload for dev | **MISSING** |

---

## 8. Server: Plugin System

### Plugin Architecture (Paperclip)

```
Plugin Lifecycle:
  Discovery → Installation → Configuration → Enable → Execute → Disable → Uninstall

Plugin Structure:
  package.json (manifest with paperclip.plugin field)
  └── src/
      ├── index.ts        (entry point: register tools, hooks, UI slots)
      ├── tools/           (MCP-style tool definitions)
      ├── hooks/           (lifecycle hooks)
      └── ui/              (optional UI contributions)
```

### Plugin Features

| Feature | Description |
|---------|-------------|
| **Installation** | From npm (`@org/package`) or local path (`./path`) |
| **Status tracking** | ready, error, disabled, installed, upgrade_pending |
| **Enable/disable** | Toggle without uninstalling |
| **Configuration** | JSON Schema-based config with UI form generation |
| **Worker processes** | Isolated worker management |
| **Background jobs** | Persistent job queue with scheduling |
| **Tool dispatch** | Route tool calls to plugin implementations |
| **Event bus** | Inter-plugin communication |
| **Runtime sandbox** | Execution isolation |
| **Secret injection** | Secure secret passing to plugins |
| **UI slots** | Plugin-contributed UI components |
| **Static files** | `/_plugins/:pluginId/ui/*` serving |
| **Health checks** | Plugin health monitoring |
| **Logging** | Per-plugin execution logs |
| **Webhook delivery** | Outbound webhook tracking |
| **Hot reload** | Dev mode watcher for plugin changes |
| **Examples** | Bundled example plugins |
| **Plugin SDK** | `@paperclipai/plugin-sdk` package |
| **Plugin creator** | `create-paperclip-plugin` scaffolding tool |

### CCO Gap

CCO has zero plugin infrastructure. This is one of the largest feature gaps.

---

## 9. Server: Adapter System

### Paperclip Adapters

| Adapter | Type | Mode | Purpose |
|---------|------|------|---------|
| `claude-local` | `claude_local` | Process | Anthropic Claude Code CLI |
| `codex-local` | `codex_local` | Process | OpenAI Codex |
| `cursor-local` | `cursor_local` | Process | Cursor IDE agent |
| `gemini-local` | `gemini_local` | Process | Google Gemini |
| `openclaw-gateway` | `openclaw_gateway` | HTTP | External OCLaw gateway |
| `opencode-local` | `opencode_local` | Process | OpenCode |
| `pi-local` | `pi_local` | Process | Pi model |

### Adapter Interface

```typescript
interface ServerAdapterModule {
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  testEnvironment(): Promise<{ available: boolean; message?: string }>;
}
```

### Adapter Features

| Feature | Description |
|---------|-------------|
| **Registry pattern** | Dynamic adapter registration |
| **Environment testing** | Validate adapter prerequisites |
| **Config validation** | Per-adapter JSON Schema config |
| **Capabilities API** | Query adapter capabilities |
| **Model detection** | Auto-detect available models |
| **Process mode** | Shell-based execution |
| **HTTP mode** | Webhook-based execution |
| **Session persistence** | Resume previous sessions |
| **Skill injection** | Runtime skill loading |
| **Token tracking** | Usage and cost reporting |
| **CLI formatters** | Per-adapter output formatting |
| **UI config forms** | JSON Schema-driven config UI |

### CCO Gap

CCO has only 1 adapter (claude-code) with a mock for testing. Missing 6 adapters, adapter registry API, environment testing API, capabilities API, model detection.

---

## 10. Server: Real-time (WebSocket)

### Paperclip WebSocket System

**Endpoint**: `WS /api/companies/:companyId/events/ws`

**Authentication**: Bearer token (query param or Authorization header)

**Features**:
- Per-company event subscription
- Keep-alive ping/pong (30s interval)
- Automatic cleanup on disconnect
- Both board and agent connections supported
- Deployment mode aware

### Live Event Types

| Event Type | Payload | Purpose |
|------------|---------|---------|
| `heartbeat.run.queued` | Run details | Agent run started |
| `heartbeat.run.status` | Status change | Run completion/failure |
| `heartbeat.run.event` | Event data | Run transcript event |
| `agent.status` | Agent state | Agent state change |
| `activity.logged` | Activity record | Any entity change |
| `activity.join.requested` | Join request | Access request |
| `company.updated` | Company data | Company changes |
| `plugin.state.changed` | Plugin state | Plugin lifecycle |
| `routine.executed` | Routine run | Routine completion |

### Event Publishing Architecture

```typescript
// In-memory pub/sub (single-process)
publishLiveEvent(companyId, event)     // Broadcast to subscribed clients
subscribeCompanyLiveEvents(companyId)  // Register listener
```

### CCO Gap

CCO has no WebSocket support. UI uses React Query polling only. No real-time event system, no live run streaming, no status propagation.

---

## 11. Server: Background Jobs & Scheduling

### Heartbeat Scheduler

| Feature | Description |
|---------|-------------|
| **Tick interval** | Configurable (default 30s) |
| `tickTimers()` | Enqueue due issue/routine runs |
| `reapOrphanedRuns()` | Clean up stale execution state |
| `resumeQueuedRuns()` | Restart persisted queued work |
| `tickScheduledTriggers()` | Evaluate cron-based routine triggers |

### Cron Parser

| Feature | Description |
|---------|-------------|
| **5-field support** | minute hour day-of-month month day-of-week |
| `validateCron(expr)` | Returns error string or null |
| `nextCronTick(parsed, after)` | Calculate next execution time |

### Plugin Job System

| Feature | Description |
|---------|-------------|
| `pluginJobStore(db)` | Persistent job queue |
| `pluginJobScheduler()` | Job execution driver |
| `pluginJobCoordinator()` | Lifecycle orchestration |

### Database Backup

| Feature | Description |
|---------|-------------|
| **Interval** | Configurable (default 60 minutes) |
| **Retention** | Configurable (default 30 days) |
| **Concurrency** | Prevents concurrent backups |
| **Async** | Non-blocking execution |

### Feedback Export

| Feature | Description |
|---------|-------------|
| **Interval** | 5 seconds |
| **Backend** | Configurable export URL + token |

### CCO Gap

CCO has a basic 60s heartbeat scheduler but no cron parser (stored as string only), no orphan reaping, no queued run resumption, no database backup, no feedback export, no plugin job system.

---

## 12. Server: Storage & Secrets

### Storage Providers

| Provider | Description |
|----------|-------------|
| `local_disk` | File system storage with configurable base directory |
| `s3` | AWS S3 (or compatible) with bucket/region/endpoint/prefix |

### Storage Operations
- Upload asset (with company scoping)
- Download asset
- Delete asset
- Storage reference tracking in database

### Secrets Management

| Feature | Description |
|---------|-------------|
| `local_encrypted` | AES-encrypted local file storage |
| Master key file | Configurable key file path |
| Strict mode | Enforce secret usage validation |
| Version history | Track secret changes over time |
| Secret references | Reference secrets by name in configs |

### CCO Gap

CCO has no storage abstraction and no secrets management. Files and secrets are not managed.

---

## 13. Server: Startup & Lifecycle

### Paperclip Startup Sequence

```
1. Configuration Loading
   ├── Load from env/file/defaults
   └── Initialize telemetry

2. Database Initialization
   ├── Create embedded PostgreSQL (or connect external)
   ├── Detect port conflicts
   ├── Apply pending migrations (auto/prompt)
   └── Repair migration history if needed

3. Authentication Setup
   ├── Local trusted: Create local-board user + admin role
   └── Authenticated: Initialize BetterAuth, derive origins

4. Port Detection
   └── Find available port if configured port busy

5. App Creation
   ├── Create Express app with middleware/routes
   ├── Initialize plugin system
   ├── Set up WebSocket live events
   └── Configure UI serving (static/Vite dev)

6. Background Services
   ├── Reconcile persisted runtime state
   ├── Start heartbeat scheduler
   ├── Start routine scheduler
   ├── Start database backup scheduler
   └── Start feedback export timer

7. Server Listen
   ├── Start HTTP server
   ├── Open browser (optional)
   └── Print startup banner

8. Graceful Shutdown
   ├── SIGINT/SIGTERM handlers
   ├── Flush telemetry
   ├── Stop embedded PostgreSQL
   └── Exit cleanly
```

### Deployment Modes

| Mode | Auth | Users | Company Deletion | Use Case |
|------|------|-------|------------------|----------|
| `local_trusted` | None | Single | Allowed | Development |
| `authenticated` | BetterAuth | Multiple | Configurable | Production |

### Exposure Modes

| Mode | Access | Requirements |
|------|--------|-------------|
| `private` | Allowed hostnames only | None |
| `public` | Open to any host | Authenticated mode + explicit auth URL |

### UI Modes

| Mode | Description |
|------|-------------|
| `static` | Pre-built UI (production) |
| `vite-dev` | Hot-reload dev UI with Vite middleware |
| `none` | API-only (no UI) |

### CCO Gap

CCO has basic startup (load env, register adapter, listen) with signal handlers. No embedded database management, no migration handling, no deployment modes, no graceful shutdown with drains, no browser auto-open, no startup banner.

---

## 14. CLI: Commands (Complete Catalog)

### Root-Level Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `onboard` | Interactive first-run setup wizard | **MISSING** |
| `doctor` | Diagnostic checks with auto-repair | `doctor` (basic: Node, Claude, pnpm) |
| `configure` | Update configuration sections | **MISSING** |
| `env` | Print deployment environment variables | **MISSING** |
| `db:backup` | One-off database backup | **MISSING** |
| `allowed-hostname` | Add allowed hostname | **MISSING** |
| `run` | Bootstrap & run server (onboard → doctor → start) | `start` (basic) |

### Context Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `context show` | Display current CLI context | **MISSING** |
| `context list` | List all profiles | **MISSING** |
| `context use` | Set active profile | **MISSING** |
| `context set` | Configure profile | **MISSING** |

### Company Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `company list` | List companies | **MISSING** |
| `company get` | Get company | **MISSING** |
| `company export` | Export company to ZIP | **MISSING** |
| `company import` | Import company from ZIP/URL | **MISSING** |
| `company delete` | Delete company | **MISSING** |
| `company feedback:list` | List feedback traces | **MISSING** |
| `company feedback:export` | Export feedback archive | **MISSING** |

### Issue Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `issue list` | List issues with filters | **MISSING** |
| `issue get` | Get issue | **MISSING** |
| `issue create` | Create issue | **MISSING** |
| `issue update` | Update issue | **MISSING** |
| `issue comment` | Add comment | **MISSING** |
| `issue checkout` | Checkout for agent | **MISSING** |
| `issue release` | Release from agent | **MISSING** |
| `issue feedback:list` | List issue feedback | **MISSING** |
| `issue feedback:export` | Export issue feedback | **MISSING** |

### Agent Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `agent list` | List agents | **MISSING** |
| `agent get` | Get agent | **MISSING** |
| `agent local-cli` | Create API key + install skills | **MISSING** |

### Approval Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `approval list` | List approvals | **MISSING** |
| `approval get` | Get approval | **MISSING** |
| `approval create` | Create approval | **MISSING** |
| `approval approve` | Approve | **MISSING** |
| `approval reject` | Reject | **MISSING** |
| `approval request-revision` | Request revision | **MISSING** |
| `approval resubmit` | Resubmit | **MISSING** |
| `approval comment` | Add comment | **MISSING** |

### Other Commands

| Command | Purpose | CCO |
|---------|---------|-----|
| `activity list` | Activity log | **MISSING** |
| `dashboard get` | Dashboard summary | **MISSING** |
| `plugin list/install/uninstall/enable/disable/inspect/examples` | Plugin management | **MISSING** |
| `feedback report/export` | Feedback management | **MISSING** |
| `auth bootstrap-ceo` | Generate admin invite | **MISSING** |
| `auth login/logout/whoami` | Board authentication | **MISSING** |
| `routines disable-all` | Pause all routines | **MISSING** |
| `worktree` | Git worktree management | **MISSING** |
| `heartbeat run` | Execute agent heartbeat | **MISSING** |

### CLI Infrastructure

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| Framework | Commander.js | Commander.js |
| Interactive prompts | @clack/prompts (6 modules) | None |
| Output formatting | Tables, colors, spinners | Basic console.log |
| JSON output mode | `--json` on all commands | None |
| HTTP client | Custom with auto-retry + auth recovery | Basic fetch |
| Context profiles | Multi-profile management | None |
| Telemetry | Event tracking | None |

---

## 15. CLI: Configuration & Diagnostics

### Diagnostic Checks (Paperclip `doctor`)

| Check | Purpose | CCO |
|-------|---------|-----|
| Config validity | Config file format | **MISSING** |
| Database connectivity | PostgreSQL connection | **MISSING** |
| LLM API availability | Provider API key validation | **MISSING** |
| Storage provider | Local disk/S3 accessibility | **MISSING** |
| Secrets provider | Encryption key setup | **MISSING** |
| Port availability | Server port free | **MISSING** |
| Log directory | Directory permissions | **MISSING** |
| JWT secret | Agent JWT secret present | **MISSING** |
| Deployment auth | Mode vs auth consistency | **MISSING** |

Each check returns `{ name, status, message, canRepair, repair(), repairHint }`.

### Onboarding Wizard

```
1. Detect existing config → preserve or start fresh
2. Setup mode (quickstart/advanced)
3. Step-by-step: Database → LLM → Logging → Server → Storage → Secrets
4. API key validation with live feedback
5. Database connection test
6. Summary before save
7. Optional immediate startup
8. Bootstrap CEO invite (if applicable)
```

### CCO Gap

CCO `doctor` only checks Node.js version, Claude CLI presence, and pnpm. No config validation, no repair capability, no onboarding wizard, no interactive configuration.

---

## 16. CLI: Authentication Flow

### Board User Auth (Paperclip)

```
1. User runs `paperclipai auth login`
2. CLI requests approval URL from server
3. User opens URL in browser, approves access
4. Browser redirects with token
5. Token stored in ~/.paperclip/auth/{apiBase}.json
6. Subsequent calls use stored token
7. Auto-refresh on 401
```

### Agent Auth

```
1. `paperclipai agent local-cli <agentId>` creates API key
2. Key returned (one-time display)
3. Token used as PAPERCLIP_API_KEY or --api-key
```

### Bootstrap CEO Invite

```
1. `paperclipai auth bootstrap-ceo`
2. Generates time-limited invite token (72h default)
3. URL: {baseUrl}/invite/{token}
4. Auto-revokes previous unused invites
```

### CCO Gap

CCO has no CLI authentication flow. Only environment variable `CCO_API_KEY` is supported.

---

## 17. CLI: Heartbeat Execution

### Heartbeat Run (Paperclip)

```
paperclipai heartbeat run --agent-id <id> [options]

Options:
  --context, --profile, --api-base, --api-key
  --source, --trigger, --timeout-ms
  --json, --debug
```

**Features**:
- Real-time event streaming with color-coded output
  - stdout = green
  - stderr = red
  - system = yellow
- Event sequence tracking (resumable polling at 200ms)
- Log fetching with offset/limit for efficient tail
- Per-adapter output formatting (HTTP adapter, process adapter)
- Error display with troubleshooting hints

### CCO Gap

CCO has no CLI heartbeat execution. Runs are only triggered via API or scheduler.

---

## 18. CLI: Plugin Management

### Plugin Commands (Paperclip)

```bash
paperclipai plugin list [--status <status>] [--json]
paperclipai plugin install <package|path> [-l --local] [--version] [--json]
paperclipai plugin uninstall <key> [--force] [--json]
paperclipai plugin enable <key> [--json]
paperclipai plugin disable <key> [--json]
paperclipai plugin inspect <key> [--json]
paperclipai plugin examples [--json]
```

**Features**:
- Install from npm or local path
- Auto-detect local paths (starts with `.`, `/`, `~`)
- Status tracking (ready/error/disabled/installed/upgrade_pending)
- Bundled example plugins

### CCO Gap

Zero plugin CLI commands. No plugin system at all.

---

## 19. CLI: Company Export/Import

### Export (Paperclip)

```bash
paperclipai company export -C <companyId> \
  --out ./export.zip \
  --include skills,projects,issues \
  --expand-referenced-skills \
  [--json]
```

**ZIP Structure**:
```
export.zip
├── company.json          # Company metadata
├── agents/               # Agent definitions
├── skills/               # Skill files
├── projects/             # Project data
├── issues/               # Issue data
└── feedback/             # Feedback traces
```

### Import (Paperclip)

```bash
paperclipai company import -C <companyId> \
  --from-url https://example.com/company.zip \
  --collision-mode rename|skip|replace \
  [--json]
```

**Collision modes**: rename (add suffix), skip (keep existing), replace (overwrite)

### CCO Gap

No export/import capability. Companies (teams) cannot be portably transferred.

---

## 20. UI: Pages & Routes (Complete Catalog)

### Authentication & Onboarding

| Route | Purpose | CCO |
|-------|---------|-----|
| `/auth` | Email sign-in/sign-up | **MISSING** |
| `/board-claim/:token` | Board claim via invite | **MISSING** |
| `/cli-auth/:id` | CLI auth callback | **MISSING** |
| `/invite/:token` | User invite landing | **MISSING** |
| `/onboarding` | Interactive wizard (4 steps) | **MISSING** |

### Dashboard

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/dashboard` | Activity overview, metrics, costs | `/` (basic cards only) |

### Agents

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/agents/all\|active\|paused\|error` | Agent list with status filters | `/agents` (single list) |
| `/:prefix/agents/new` | Agent creation wizard | (inline form only) |
| `/:prefix/agents/:id` | Agent detail, config, runs | **MISSING** |
| `/:prefix/agents/:id/runs/:runId` | Run transcript and logs | **MISSING** |

### Issues

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/issues` | Global issue list with search | `/tasks` (kanban only) |
| `/:prefix/issues/:id` | Issue detail, comments, timeline | (modal only) |

### Projects

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/projects` | Project list | **MISSING** |
| `/:prefix/projects/:id` | Project overview, issues, budget | **MISSING** |
| `/:prefix/projects/:id/workspaces/:id` | Workspace detail | **MISSING** |

### Goals

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/goals` | Goal tree view | **MISSING** |
| `/:prefix/goals/:id` | Goal detail, hierarchy | **MISSING** |

### Routines

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/routines` | Routine list | **MISSING** |
| `/:prefix/routines/:id` | Detail, run history, variables | **MISSING** |

### Approvals

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/approvals/pending\|all` | Approval queue | **MISSING** |
| `/:prefix/approvals/:id` | Approval detail with payload | **MISSING** |

### Activity & Inbox

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/activity` | Activity log | **MISSING** |
| `/:prefix/inbox/mine\|recent\|unread\|all` | Mail-client inbox | **MISSING** |

### Financial & Settings

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/costs` | Cost tracking, timelines | **MISSING** |
| `/:prefix/org` | Organizational chart | **MISSING** |
| `/:prefix/company/settings` | Company settings | `/settings` (basic) |
| `/:prefix/company/export` | Export UI | **MISSING** |
| `/:prefix/company/import` | Import UI | **MISSING** |
| `/:prefix/company/skills` | Skills management | **MISSING** |

### Instance Settings

| Route | Purpose | CCO |
|-------|---------|-----|
| `/instance/settings/general` | Global settings | **MISSING** |
| `/instance/settings/heartbeats` | Scheduler monitoring | **MISSING** |
| `/instance/settings/experimental` | Feature flags | **MISSING** |
| `/instance/settings/adapters` | Adapter manager | **MISSING** |
| `/instance/settings/plugins` | Plugin manager | **MISSING** |
| `/instance/settings/plugins/:id` | Plugin config | **MISSING** |

### Special Pages

| Route | Purpose | CCO |
|-------|---------|-----|
| `/:prefix/design-guide` | Component showcase | **MISSING** |
| `/my-issues` | User-specific issues | **MISSING** |

---

## 21. UI: Component Architecture

### Layout Structure (Paperclip)

```
App (Router)
├── CloudAccessGate (Auth Check)
├── Layout
│   ├── CompanyRail (Company selector sidebar)
│   ├── Sidebar (Navigation with sections)
│   │   ├── SidebarProjects
│   │   ├── SidebarAgents
│   │   └── SidebarSection (collapsible)
│   ├── BreadcrumbBar
│   ├── Main Content (Outlet)
│   └── PropertiesPanel (Detail sidebar)
├── CommandPalette (Cmd+K global search)
├── Dialog Layer
│   ├── NewIssueDialog
│   ├── NewProjectDialog
│   ├── NewGoalDialog
│   └── NewAgentDialog
└── MobileBottomNav
```

### Key Component Categories

| Category | Components | CCO |
|----------|-----------|-----|
| **Forms & Editors** | JsonSchemaForm, MarkdownEditor (MDXEditor), InlineEditor (Lexical), ScheduleEditor, RoutineVariablesEditor | **MISSING** |
| **Lists & Tables** | IssuesList (virtualized), ActivityCharts, EntityRow, PackageFileTree | Basic tables |
| **Dialogs** | NewIssue/Project/Goal/Agent dialogs, ImageGallery, PathInstructions | **MISSING** |
| **Data Display** | PropertiesPanel, ApprovalPayload, MetricCard, QuotaBar, StatusBadge | StatusBadge only |
| **Navigation** | Sidebar, InstanceSidebar, CompanyRail, BreadcrumbBar, CommandPalette, MobileBottomNav | Shell sidebar only |
| **Input Fields** | InlineEntitySelector, AgentIconPicker, ReportsToPicker, FilterBar | Basic inputs |

### CCO Gap

CCO has ~10 components. Paperclip has 100+. Missing: command palette, properties panel, markdown editor, JSON schema forms, org chart visualization, run transcript viewer, kanban with virtualization, breadcrumbs, mobile navigation.

---

## 22. UI: State Management

### React Context Providers (Paperclip)

| Context | Purpose | CCO |
|---------|---------|-----|
| `CompanyProvider` | Company list, selection, localStorage persistence | **MISSING** (team from URL) |
| `LiveUpdatesProvider` | WebSocket events, toast notifications, reconnection | **MISSING** |
| `ThemeProvider` | Light/dark toggle, localStorage, OkLCH colors | **MISSING** |
| `DialogProvider` | Modal state (newIssue, newProject, newGoal, newAgent) | **MISSING** |
| `ToastProvider` | Toast queue, dedup, auto-dismiss, action buttons | **MISSING** |
| `BreadcrumbProvider` | Page navigation breadcrumbs | **MISSING** |
| `SidebarProvider` | Open/close + mobile detection | **MISSING** |
| `PanelProvider` | Properties panel visibility | **MISSING** |
| `EditorAutocompleteProvider` | Slash commands for markdown editor | **MISSING** |
| `GeneralSettingsProvider` | Feature flags from instance settings | **MISSING** |

### React Query Configuration (Paperclip)

| Feature | Description | CCO |
|---------|-------------|-----|
| staleTime | 30 seconds | Default (0) |
| Query key hierarchy | `queryKeys.ts` with 50+ patterns | Inline keys |
| Optimistic updates | For mutations | None |
| Cache invalidation | On mutations + WebSocket events | On mutations only |
| Retry | 3 attempts with exponential backoff | Default |

---

## 23. UI: Real-time Updates

### WebSocket Integration (Paperclip)

```
LiveUpdatesProvider
├── Auto-connect when company selected + authenticated
├── Auto-reconnect (exponential backoff, 15s max, 4x delay)
├── Connection cleanup on route/company change
├── Message handler dispatch by event.type
├── Cache invalidation for affected queries
└── Toast notification generation
```

### Smart Toast Suppression

| Rule | Description |
|------|-------------|
| Activity suppression | Skip toast if issue currently visible |
| Run status suppression | Skip if assignee agent visible |
| Agent status suppression | Skip if agent detail page open |
| Foreground detection | `document.visibilityState === "visible"` |
| Cooldown gating | Max 3 toasts per category per 10s |
| Reconnect suppression | Full suppress for 2s after reconnect |

### CCO Gap

No WebSocket, no real-time updates, no toast notifications, no smart suppression.

---

## 24. UI: Theme & Styling System

### Color System (Paperclip)

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.488 0.243 264.376)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | — |
| + 20 more tokens | — | — |

### Features

| Feature | Description | CCO |
|---------|-------------|-----|
| OkLCH color system | Perceptually uniform | **MISSING** |
| Dark mode | `.dark` class toggle | **MISSING** |
| Tailwind integration | @tailwindcss/vite + typography | Basic Tailwind |
| shadcn/ui components | 15+ base components | **MISSING** |
| Animations | Slide-up, scale, blur, highlight | **MISSING** |
| prefers-reduced-motion | Respected | **MISSING** |
| Theme persistence | localStorage | **MISSING** |
| MDXEditor theme | CSS variables | **MISSING** |
| CodeMirror theme | Catppuccin dark | **MISSING** |
| Min touch target | 44px | **MISSING** |

---

## 25. UI: Form Handling & Editors

### JsonSchemaForm (Paperclip)

| Feature | Description |
|---------|-------------|
| Input JSON Schema | Describes form structure |
| Field types | string, number, integer, boolean, enum, secret-ref, array, object |
| Validation | required, minLength/maxLength, min/max, pattern |
| Secret fields | Password input with show/hide |
| Array handling | Add/remove with min/max constraints |
| Object nesting | Collapsible nested objects |
| Textarea detection | Auto-switch at >200 chars |
| ReDoS protection | Pattern regex validation |

### MarkdownEditor (MDXEditor)

| Feature | Description |
|---------|-------------|
| Toolbar | Headings, bold, italic, lists, tables, quotes |
| Code blocks | Language selector |
| Links | URL validation (XSS prevention) |
| Images | Upload with drag-drop + paste |
| @mentions | Autocomplete (agents, projects) |
| /commands | Slash-based skill references |
| Submit shortcut | Ctrl/Cmd+Enter |
| Mention chips | Colors/icons decoration |
| Paste normalization | Clean markdown on paste |

### CCO Gap

No JSON Schema forms, no markdown editor, no mention autocomplete, no slash commands, no image upload.

---

## 26. Shared Packages

### @paperclipai/db

| Feature | Description | CCO |
|---------|-------------|-----|
| Engine | PostgreSQL | SQLite |
| Schema tables | 30+ | 11 |
| Migrations | 48+ numbered files | None |
| Backup utility | `runDatabaseBackup()` | None |
| Seed command | `pnpm seed` | None |
| Schema exports | Multiple entry points | Single export |

### @paperclipai/shared

| Feature | Description | CCO |
|---------|-------------|-----|
| Adapter types | 7 types validated | 1 type |
| Config schema | Full Zod schema | None |
| API paths | Constants for all routes | None |
| Telemetry | Anonymous telemetry utilities | None |
| Routine variables | Variable interpolation | None |
| Workspace guards | Boundary validation | None |
| Types | Comprehensive domain types | Basic types |
| Validators | Request/response Zod validators | Basic validators |

### @paperclipai/adapter-utils

| Feature | Description | CCO |
|---------|-------------|-----|
| Interface | Execute + testEnvironment | Same |
| Utilities | Shared adapter helpers | Template only |

### Adapter Packages

| Package | CCO |
|---------|-----|
| `claude-local` | `claude-code` (exists) |
| `codex-local` | **MISSING** |
| `cursor-local` | **MISSING** |
| `gemini-local` | **MISSING** |
| `openclaw-gateway` | **MISSING** |
| `opencode-local` | **MISSING** |
| `pi-local` | **MISSING** |

### Plugin Packages

| Package | CCO |
|---------|-----|
| Plugin SDK | **MISSING** |
| Plugin examples | **MISSING** |
| Plugin creator | **MISSING** |

---

## 27. Skills & Agent Configuration

### Public Skills (Paperclip)

| Skill | Purpose | Files |
|-------|---------|-------|
| `paperclip/SKILL.md` | Heartbeat execution for agents | routines.md, company-skills.md, api-reference.md |
| `paperclip-create-agent/SKILL.md` | Agent creation patterns | api-reference.md |
| `paperclip-create-plugin/SKILL.md` | Plugin development guide | — |
| `para-memory-files/SKILL.md` | Memory file utilities | schemas.md |

### Internal Agent Skills

| Skill | Purpose |
|-------|---------|
| `company-creator` | Create agent company templates |
| `create-agent-adapter` | Build custom adapters |
| `doc-maintenance` | Maintain documentation |
| `pr-report` | Generate PR summaries |
| `release` | Release automation |
| `release-changelog` | Generate release notes |

### Claude Code Skills

| Skill | Purpose |
|-------|---------|
| `design-guide` | UI design system reference |
| `company-creator` | Linked from .agents/skills |
| `paperclip` | Linked from skills/paperclip |

### Onboarding Assets

| Asset | Purpose |
|-------|---------|
| `AGENTS.md` | Default agent instructions |
| `SOUL.md` | Company soul/mission |
| `HEARTBEAT.md` | Heartbeat behavior guide |
| Role templates | CEO, engineer, marketer, etc. |

### CCO Gap

CCO `skills/` directory is empty. No public skills, no internal skills, no onboarding assets, no role templates.

---

## 28. Testing & Evaluation

### Paperclip Testing

| Category | Framework | Count |
|----------|-----------|-------|
| Unit tests | Vitest | 20+ files |
| E2E tests | Playwright | `tests/e2e/` |
| Release smoke | Playwright | `tests/release-smoke/` |
| Evaluations | Promptfoo | `evals/` |

### Evaluation System (Paperclip)

```
Phase 0: Narrow behavior evals (heartbeat, approvals, company boundaries)
Phase 1-4: TypeScript harness, scoring, production cases (planned)

Run: pnpm evals:smoke
```

### CCO Testing

| Category | Framework | Count |
|----------|-----------|-------|
| Unit tests | Vitest | 24 files |
| E2E tests | Playwright | 3 files |
| Evaluations | None | 0 |

### CCO Gap

CCO has decent test coverage but no evaluation framework, no release smoke tests, no promptfoo integration.

---

## 29. Deployment & Docker

### Paperclip Docker Configurations

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (deps → build → production) |
| `docker-compose.yml` | Full stack (Postgres + Paperclip) |
| `docker-compose.quickstart.yml` | Simplified quickstart |
| `docker-compose.untrusted-review.yml` | Isolated PR review |
| `Dockerfile.onboard-smoke` | Onboarding smoke test |

### Docker Features

| Feature | Description | CCO |
|---------|-------------|-----|
| Multi-stage build | deps → build → production | Single stage |
| Host UID/GID mapping | Container security | **MISSING** |
| Git/gh CLI | In container | **MISSING** |
| Multiple providers | Claude, Codex, Gemini, etc. | Claude only |
| Compose variants | 3 compose files | None |
| Smoke testing | Onboarding smoke Dockerfile | None |

### CCO Gap

CCO has a basic Dockerfile but no docker-compose, no multi-stage build, no UID mapping.

---

## 30. Telemetry & Observability

### Paperclip Telemetry

| Feature | Description | CCO |
|---------|-------------|-----|
| Anonymous telemetry | Opt-out via config | **MISSING** |
| Install tracking | Start/complete events | **MISSING** |
| Company import tracking | Import events | **MISSING** |
| Error telemetry | Error tracking in middleware | **MISSING** |
| Feedback export | Periodic flush to backend | **MISSING** |
| Pino logging | Structured HTTP request logging | **MISSING** |
| Log redaction | Sensitive data removal | **MISSING** |

### Activity Logging

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| Immutable audit trail | Yes | Yes (basic) |
| Actor tracking | user/agent/system with IDs | user/agent/system |
| Entity type tracking | All entity types | All types |
| API exposure | GET endpoints | No endpoint (service exists) |
| Dashboard integration | Activity feed in UI | Not in UI |

---

## Appendix A: Quick Reference — Feature Gap Count

| Module | Paperclip Features | CCO Implemented | Gap |
|--------|-------------------|-----------------|-----|
| API Endpoints | ~80 | ~20 | ~60 |
| Database Tables | ~30 | 11 | ~19 |
| CLI Commands | ~35 | 3 | ~32 |
| UI Pages | ~47 | 5 | ~42 |
| UI Components | ~100 | ~10 | ~90 |
| Services | ~30 | 14 | ~16 |
| Adapters | 7 | 1 | 6 |
| Skills | 10 | 0 | 10 |
| React Contexts | 11 | 0 | 11 |
| Middleware | 6 | 1 | 5 |
| Docker configs | 5 | 1 | 4 |
| Test categories | 4 | 2 | 2 |

**Overall implementation level: ~20-25% of Paperclip features**

---

## Appendix B: Naming Mapping (Paperclip → CCO)

| Paperclip | CCO | Notes |
|-----------|-----|-------|
| Company | Team | Same concept, different name |
| Issue | Task | Same concept, different name |
| Board | (none) | User/admin concept |
| Heartbeat | Scheduler | Similar but less capable |
| Adapter | Adapter | Same concept |
| Execution Workspace | (none) | Not implemented |
| Routine | Routine | Same concept |
| Plugin | (none) | Not implemented |
| Skill | (none) | Not implemented |
| Goal | (none) | Not implemented |
| Secret | (none) | Not implemented |
| Asset | (none) | Not implemented |

---

*End of Feature Specification*
