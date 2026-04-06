# Work Products 구현 계획

> **Date**: 2026-04-07
> **기반**: Paperclip `issue_work_products` 시스템 분석
> **목적**: 에이전트가 생성한 산출물(PR, 커밋, 브랜치, 배포 등)을 추적하는 시스템 구현

---

## 1. 개념

Work Product는 에이전트가 Task 실행 중 만들어낸 **결과물**을 추적하는 시스템이다.

```
Task (작업 지시)
  └── Run (에이전트 실행)
       └── Work Products (산출물)
            ├── Pull Request (GitHub PR #123)
            ├── Branch (feature/auth-system)
            ├── Commit (a1b2c3d)
            └── Artifact (test-report.html)
```

**핵심 원칙:**
- CCO는 **관제탑** — 산출물을 기록하고 추적한다
- 에이전트가 **실제 git 작업** — 커밋, 푸시, PR 생성을 수행한다
- 에이전트가 실행 후 **Work Products API를 호출**하여 결과를 등록한다
- Work Product는 **리뷰 워크플로우**를 가진다 (none → needs_review → approved → merged)

---

## 2. 데이터 모델

### 2.1 `work_products` 테이블

```sql
CREATE TABLE work_products (
  id            TEXT PRIMARY KEY,
  team_id       TEXT NOT NULL REFERENCES teams(id),
  task_id       TEXT NOT NULL REFERENCES tasks(id),
  run_id        TEXT REFERENCES runs(id),         -- 어떤 실행에서 생성됐는지
  workspace_id  TEXT,                              -- 실행 워크스페이스 (선택)

  -- 산출물 정보
  type          TEXT NOT NULL,                     -- pull_request, commit, branch, artifact, document, preview_url
  provider      TEXT NOT NULL,                     -- github, gitlab, local, custom
  external_id   TEXT,                              -- 프로바이더 ID (PR #123, commit hash 등)
  title         TEXT NOT NULL,                     -- 표시 이름
  url           TEXT,                              -- 직접 접근 링크

  -- 상태
  status        TEXT NOT NULL DEFAULT 'active',    -- active, draft, ready_for_review, merged, closed, failed, archived
  review_state  TEXT NOT NULL DEFAULT 'none',      -- none, needs_review, approved, changes_requested
  is_primary    INTEGER NOT NULL DEFAULT 0,        -- 대표 산출물 여부 (타입당 1개)
  health_status TEXT NOT NULL DEFAULT 'unknown',   -- unknown, healthy, unhealthy

  -- 추가 정보
  summary       TEXT,                              -- 설명/요약
  metadata      TEXT,                              -- JSON 확장 필드

  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX wp_task_idx ON work_products(team_id, task_id, type);
CREATE INDEX wp_provider_idx ON work_products(team_id, provider, external_id);
```

### 2.2 타입 정의

```typescript
// Work Product Types
type WorkProductType =
  | 'pull_request'    // GitHub/GitLab PR
  | 'commit'          // Git commit
  | 'branch'          // Git branch
  | 'artifact'        // 빌드 결과물, 리포트
  | 'document'        // 문서
  | 'preview_url';    // 배포 프리뷰

// Providers
type WorkProductProvider =
  | 'github'          // GitHub
  | 'gitlab'          // GitLab
  | 'local'           // 로컬 git
  | 'custom';         // 커스텀

// Status
type WorkProductStatus =
  | 'active'          // 활성
  | 'draft'           // 초안
  | 'ready_for_review' // 리뷰 대기
  | 'merged'          // 머지됨
  | 'closed'          // 닫힘
  | 'failed'          // 실패
  | 'archived';       // 보관

// Review State
type WorkProductReviewState =
  | 'none'            // 리뷰 불필요
  | 'needs_review'    // 리뷰 대기
  | 'approved'        // 승인됨
  | 'changes_requested'; // 수정 요청
```

---

## 3. API 설계

### 3.1 엔드포인트

```
# Task의 산출물 관리
GET    /api/teams/:teamId/tasks/:taskId/work-products         → 목록
POST   /api/teams/:teamId/tasks/:taskId/work-products         → 생성
GET    /api/teams/:teamId/work-products/:id                   → 상세
PATCH  /api/teams/:teamId/work-products/:id                   → 수정
DELETE /api/teams/:teamId/work-products/:id                   → 삭제
```

### 3.2 생성 요청 (POST)

```json
{
  "type": "pull_request",
  "provider": "github",
  "externalId": "123",
  "title": "feat: add authentication system",
  "url": "https://github.com/org/repo/pull/123",
  "status": "ready_for_review",
  "reviewState": "needs_review",
  "isPrimary": true,
  "summary": "JWT 기반 인증 시스템 구현",
  "runId": "run_abc123",
  "metadata": {
    "additions": 450,
    "deletions": 23,
    "changedFiles": 12,
    "baseBranch": "main",
    "headBranch": "feature/auth"
  }
}
```

### 3.3 응답 형식

```json
{
  "data": {
    "id": "wp_abc123",
    "teamId": "team_xxx",
    "taskId": "task_xxx",
    "runId": "run_xxx",
    "type": "pull_request",
    "provider": "github",
    "externalId": "123",
    "title": "feat: add authentication system",
    "url": "https://github.com/org/repo/pull/123",
    "status": "ready_for_review",
    "reviewState": "needs_review",
    "isPrimary": true,
    "healthStatus": "unknown",
    "summary": "JWT 기반 인증 시스템 구현",
    "metadata": { ... },
    "createdAt": 1775495748401,
    "updatedAt": 1775495748401
  }
}
```

---

## 4. 주요 비즈니스 로직

### 4.1 Primary Product 규칙
- 타입별(pull_request, commit 등) **하나의 Task에 하나만** Primary
- `isPrimary=true`로 생성/수정 시 같은 (taskId, type)의 다른 것들은 자동 `isPrimary=false`
- 목록 조회 시 Primary가 먼저 표시

### 4.2 리뷰 워크플로우
```
none → needs_review → approved
                    → changes_requested → needs_review (재요청)
```
- 에이전트가 PR 생성 시 `reviewState: 'needs_review'` 설정
- 사람이 UI/CLI로 승인 또는 수정 요청
- Approval 시스템과 독립적 (Work Product 자체의 리뷰 상태)

### 4.3 Activity 로깅
- 생성/수정/삭제 시 activity_log에 기록
- `action`: `work_product.created`, `work_product.updated`, `work_product.deleted`

### 4.4 실시간 이벤트
- 생성/수정 시 WebSocket 이벤트 발행
- `type`: `work_product.created`, `work_product.updated`

---

## 5. 에이전트 통합

### 5.1 에이전트 실행 흐름

```
1. 스케줄러/사용자가 에이전트 실행 시작
2. 에이전트가 코드 작성 + git commit + push + PR 생성
3. 에이전트가 Work Products API 호출로 결과 등록
4. 에이전트가 Task 상태를 done으로 변경
```

### 5.2 Heartbeat Context에 Work Products 포함

기존 `GET /tasks/:id/heartbeat-context` 응답에 work products 추가:

```json
{
  "data": {
    "task": { ... },
    "recentComments": [ ... ],
    "workProducts": [ ... ]    // ← 추가
  }
}
```

에이전트가 이전 실행에서 만든 산출물을 확인하고 이어서 작업 가능.

### 5.3 Skills 문서에 가이드 추가

`skills/cco/SKILL.md`에 Work Products 사용법 추가:
```markdown
## 산출물 등록
작업 완료 후 생성한 PR, 커밋 등을 등록하세요:

POST /api/teams/{teamId}/tasks/{taskId}/work-products
{
  "type": "pull_request",
  "provider": "github",
  "title": "PR 제목",
  "url": "PR URL",
  "status": "ready_for_review"
}
```

---

## 6. UI 설계

### 6.1 Task Detail 페이지에 Work Products 섹션 추가

```
┌──────────────────────────────────────────┐
│ Task: 인증 시스템 구현                      │
│ Status: done  Priority: high              │
├──────────────────────────────────────────┤
│ Work Products                             │
│ ┌─ ★ PR #123 — feat: add auth system ─┐ │
│ │ github · ready_for_review · healthy  │ │
│ │ https://github.com/.../pull/123      │ │
│ └──────────────────────────────────────┘ │
│ ┌─ branch: feature/auth ──────────────┐ │
│ │ local · active                       │ │
│ └──────────────────────────────────────┘ │
│ ┌─ commit: a1b2c3d ───────────────────┐ │
│ │ local · active                       │ │
│ └──────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│ Comments                                  │
│ ...                                       │
└──────────────────────────────────────────┘
```

### 6.2 Work Product 카드 컴포넌트

- 타입별 아이콘 (GitPullRequest, GitBranch, GitCommit, FileOutput, FileText, Globe)
- Primary 표시 (★ 마크)
- Status + Review State 배지
- URL 링크 (외부 열기)
- Review 버튼 (Approve / Request Changes)

### 6.3 Dashboard에 Work Products 요약

- 전체 산출물 수
- Pending review 수 (review_state = 'needs_review')

---

## 7. CLI 커맨드

```bash
# 목록 조회
cco work-product list --team <teamId> --task <taskId> [--type pull_request] [--json]

# 생성 (에이전트가 사용)
cco work-product create --team <teamId> --task <taskId> \
  --type pull_request \
  --provider github \
  --title "feat: add auth" \
  --url "https://github.com/.../pull/123" \
  --external-id 123 \
  [--primary] [--json]

# 리뷰 상태 변경
cco work-product review <id> --team <teamId> --state approved [--json]
cco work-product review <id> --team <teamId> --state changes_requested [--json]
```

---

## 8. 구현 단계

### Step 1: 스키마 + 타입 (커밋 1)

**파일:**
- `packages/db/src/schema/work-products.ts` — 테이블 정의
- `packages/db/src/schema/index.ts` — export 추가
- `packages/shared/src/validators.ts` — WorkProduct 관련 enum + create schema
- 마이그레이션 생성

**TDD:**
- Work product 생성/조회 서비스 테스트 작성 (RED)
- 스키마 생성 (GREEN)

### Step 2: 서비스 (커밋 2)

**파일:**
- `server/src/services/work-products.ts`
  - `list(teamId, taskId)` — Primary 우선, 최신순
  - `getById(teamId, id)`
  - `create(teamId, data)` — Primary 자동 교체 (같은 task+type)
  - `update(teamId, id, patch)` — Primary 자동 교체
  - `remove(teamId, id)`

**TDD:**
- list, create, primary 교체, update, remove 테스트

### Step 3: 라우트 + Heartbeat Context 연동 (커밋 3)

**파일:**
- `server/src/routes/work-products.ts` — CRUD 엔드포인트
- `server/src/services/tasks.ts` — heartbeatContext에 workProducts 포함
- `server/src/app.ts` — 라우트 등록
- Activity 로깅 + 이벤트 발행

**TDD:**
- 라우트 통합 테스트 (POST 201, GET 200, PATCH 200, DELETE 204)
- Heartbeat context에 workProducts 포함 확인

### Step 4: UI (커밋 4)

**파일:**
- `ui/src/api/queries.ts` — useWorkProducts, useCreateWorkProduct 등 hooks
- `ui/src/components/WorkProductCard.tsx` — 산출물 카드 컴포넌트
- `ui/src/pages/TaskDetail.tsx` — Work Products 섹션 추가
- `ui/src/pages/Dashboard.tsx` — 산출물 요약 (선택)

### Step 5: CLI (커밋 5)

**파일:**
- `cli/src/commands/work-product.ts` — list, create, review 커맨드
- `cli/src/index.ts` — 커맨드 등록

### Step 6: Skills 문서 + 테스트 (커밋 6)

**파일:**
- `skills/cco/SKILL.md` — Work Products 가이드 추가
- `tests/e2e/work-products.spec.ts` — E2E 테스트

---

## 9. 의존성 영향 분석

| 기존 기능 | 영향 | 수정 필요 |
|----------|------|----------|
| Tasks 서비스 | heartbeatContext에 workProducts 추가 | ✅ 경미 |
| Teams cascade | work_products 삭제 추가 | ✅ 경미 |
| Export-Import | work_products 직렬화 (선택) | 🟡 나중에 |
| Dashboard | pending review 카운트 추가 | 🟡 선택 |
| Activity | 새 action 타입 추가 | ✅ 자동 |
| Agents | 변경 없음 | ❌ |
| Runs | run_id FK만 (변경 없음) | ❌ |
| WebSocket | 새 이벤트 타입 추가 | ✅ 자동 |

---

## 10. Paperclip과의 차이점 (CCO 단순화)

| 기능 | Paperclip | CCO (계획) |
|------|-----------|-----------|
| executionWorkspaceId FK | ✅ | 🟡 workspaceId (선택) |
| runtimeServiceId FK | ✅ | ❌ (불필요) |
| companyId scope | ✅ | teamId scope (동일 개념) |
| Transaction for primary | ✅ (PostgreSQL) | ✅ (SQLite 단순화) |
| Provider enum 제한 | 느슨 (string) | 느슨 (string) |
| JSONB metadata | ✅ | TEXT JSON (SQLite) |
| UUID | ✅ | nanoid (기존 패턴) |

---

## 11. 예상 결과

| Metric | Before | After |
|--------|:------:|:-----:|
| DB 테이블 | 21 | **22** (+work_products) |
| API 엔드포인트 | ~50 | **~55** (+5 work product) |
| CLI 커맨드 | ~40 | **~43** (+3 work product) |
| UI 컴포넌트 | ~20 | **~21** (+WorkProductCard) |
| 테스트 | ~302 | **~320** (+unit +route +e2e) |
| Task 기능 패리티 | ~75% | **~85%** |

---

*End of Work Products Implementation Plan*
