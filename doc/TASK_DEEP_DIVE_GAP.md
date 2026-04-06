# Task/Issue System: Paperclip vs CCO Deep-Dive Gap Analysis

> **Date**: 2026-04-07
> **Purpose**: Paperclip Issue 시스템과 CCO Task 시스템의 기능 차이를 면밀하게 분석하고 리팩토링 계획을 수립한다.

---

## 1. 스키마 비교

### 1.1 Core Task/Issue Table

| Column | Paperclip (issues) | CCO (tasks) | Gap |
|--------|-------------------|-------------|-----|
| `id` | UUID | text (nanoid) | OK (형식만 다름) |
| `companyId` / `teamId` | UUID, FK→companies | text, FK→teams | OK (이름만 다름) |
| `projectId` | UUID, FK→projects | text, optional | OK |
| `projectWorkspaceId` | UUID | **MISSING** | GAP |
| `goalId` | UUID, FK→goals | **MISSING** | GAP |
| `parentId` | UUID, self-ref | text, self-ref | OK |
| `title` | text, required | text, required | OK |
| `description` | text, optional | text, optional | OK |
| `status` | text, default "backlog" | text, default "todo" | **DIFF** (기본값 다름) |
| `priority` | text, default "medium" | text, default "medium" | OK |
| `assigneeAgentId` | UUID, optional | text, optional | OK |
| `assigneeUserId` | text, optional | **MISSING** | GAP |
| `checkoutRunId` | UUID | text | OK |
| `executionRunId` | UUID | **MISSING** | GAP |
| `executionAgentNameKey` | text | **MISSING** | GAP |
| `executionLockedAt` | timestamp | integer | OK (형식만 다름) |
| `createdByAgentId` | UUID | **MISSING** | GAP |
| `createdByUserId` | text | **MISSING** | GAP |
| `issueNumber` / `taskNumber` | int (per-company) | int (per-team) | OK |
| `identifier` | text, unique | text, unique | OK |
| `originKind` | "manual" \| "routine_execution" | text, default "manual" | OK |
| `originId` | text | **MISSING** | GAP |
| `originRunId` | text | **MISSING** | GAP |
| `requestDepth` | int, default 0 | **MISSING** | GAP |
| `billingCode` | text | **MISSING** | GAP |
| `assigneeAdapterOverrides` | JSONB | **MISSING** | GAP |
| `executionWorkspaceId` | UUID | **MISSING** | GAP |
| `executionWorkspacePreference` | enum (6 values) | **MISSING** | GAP |
| `executionWorkspaceSettings` | JSONB | **MISSING** | GAP |
| `startedAt` | timestamp | integer | OK |
| `completedAt` | timestamp | integer | OK |
| `cancelledAt` | timestamp | **MISSING** | GAP |
| `hiddenAt` | timestamp | **MISSING** | GAP |

### 1.2 관련 테이블 비교

| Table | Paperclip | CCO | Gap |
|-------|-----------|-----|-----|
| Comments | `issue_comments` (authorUserId, createdByRunId) | `task_comments` (basic) | **PARTIAL** — 유저/런 추적 없음 |
| Attachments | `issue_attachments` (파일 첨부) | **MISSING** | GAP |
| Documents | `issue_documents` (key-based, 리비전 추적) | `documents` (version-based) | **PARTIAL** — key 시스템 없음 |
| Labels | `issue_labels` (M:N 라벨) | **MISSING** | GAP |
| Approvals Link | `issue_approvals` (이슈↔승인 연결) | **MISSING** | GAP |
| Read State | `issue_read_states` (읽음 추적) | **MISSING** | GAP |
| Inbox Archive | `issue_inbox_archives` (보관함) | **MISSING** | GAP |
| Work Products | `issue_work_products` (산출물 추적) | **MISSING** | GAP |
| Task Sessions | `agent_task_sessions` (세션 추적) | **MISSING** | GAP |
| Feedback Votes | `feedback_votes` (1인 1투표) | `feedback` (다중 투표 가능) | **DIFF** — 유니크 제약 없음 |

### 1.3 인덱스 비교

| Index | Paperclip | CCO |
|-------|-----------|-----|
| (companyId, status) | ✅ | ✅ (teamId, status) |
| (companyId, assigneeAgentId, status) | ✅ | ✅ |
| (companyId, assigneeUserId, status) | ✅ | **MISSING** |
| (companyId, parentId) | ✅ | **MISSING** |
| (companyId, projectId) | ✅ | **MISSING** |
| (companyId, originKind, originId) | ✅ | **MISSING** |
| identifier (UNIQUE) | ✅ | ✅ |
| open routine execution (UNIQUE filtered) | ✅ | **MISSING** |

---

## 2. 상태 머신 비교

### Paperclip Status
```
backlog → todo → in_progress → in_review → blocked → done
                                                   → cancelled
```
- **7개 상태**: backlog, todo, in_progress, in_review, **blocked**, done, cancelled
- `blocked` 상태 존재

### CCO Status
```
backlog → todo → in_progress → in_review → done
                                         → cancelled
```
- **6개 상태**: backlog, todo, in_progress, in_review, done, cancelled
- `blocked` 상태 **없음**

### Transition 규칙 비교

| From | Paperclip Allowed | CCO Allowed | Gap |
|------|-------------------|-------------|-----|
| backlog | todo, cancelled | todo, cancelled | OK |
| todo | in_progress, backlog, cancelled | in_progress, backlog, cancelled | OK |
| in_progress | in_review, done, blocked, cancelled | in_review, done, cancelled | **blocked 없음** |
| in_review | done, in_progress, cancelled | done, in_progress, cancelled | OK |
| blocked | in_progress, cancelled | **N/A** | **전체 없음** |
| done | (none) | (none) | OK |
| cancelled | backlog | backlog | OK |

### 기본 상태
- Paperclip: `"backlog"` (신규 이슈는 백로그에서 시작)
- CCO: `"todo"` (신규 작업은 바로 할 일 상태)

---

## 3. Checkout/Release 프로토콜 비교

### Paperclip Checkout (고급)

```typescript
checkout(id, agentId, expectedStatuses[], checkoutRunId)
```

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| expectedStatuses 배열 | ✅ (호출자가 허용 상태 지정) | ❌ (todo/backlog 하드코딩) |
| Stale run 감지 | ✅ (이전 런이 종료됐으면 자동 대체) | ❌ |
| Stale run 자동 인수 | ✅ (adoptedFromRunId 반환) | ❌ |
| executionRunId 별도 추적 | ✅ | ❌ |
| User checkout (사람이 체크아웃) | ✅ (checkoutRunId=null 허용) | ❌ |
| 충돌 에러 메시지 세분화 | ✅ (7가지 시나리오) | ❌ (단순 success/error) |

### Paperclip Release (고급)

```typescript
release(id, actorAgentId?, actorRunId?)
```

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| 권한 검증 | ✅ (할당된 에이전트만 릴리스 가능) | ❌ (누구나 릴리스) |
| Run 소유권 검증 | ✅ (actorRunId로 검증) | ❌ |
| actorAgentId 검증 | ✅ | ❌ |

### Paperclip assertCheckoutOwner

```typescript
assertCheckoutOwner(id, actorAgentId, actorRunId)
```
- 에이전트가 체크아웃 오너인지 확인
- Stale 런 자동 인수 지원
- CCO에 **완전히 없음**

---

## 4. 검색/필터링 비교

### Paperclip Search

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| Title 시작 매치 | ✅ (priority 0) | ❌ |
| Title 포함 매치 | ✅ (priority 1) | ❌ |
| Identifier 매치 | ✅ (priority 2-3) | ❌ |
| Description 검색 | ✅ (priority 4) | ❌ |
| Comment 본문 검색 | ✅ (priority 5) | ❌ |
| 우선순위 기반 정렬 | ✅ | ❌ |
| 대소문자 무시 | ✅ | ❌ |

### Paperclip Filters

| Filter | Paperclip | CCO |
|--------|-----------|-----|
| status (CSV 다중) | ✅ | ✅ (단일만) |
| assigneeAgentId | ✅ | ✅ |
| participantAgentId | ✅ | ❌ |
| assigneeUserId | ✅ | ❌ |
| touchedByUserId | ✅ | ❌ |
| unreadForUserId | ✅ | ❌ |
| inboxArchivedByUserId | ✅ | ❌ |
| projectId | ✅ | ❌ |
| executionWorkspaceId | ✅ | ❌ |
| parentId | ✅ | ❌ |
| labelId | ✅ | ❌ |
| originKind | ✅ | ❌ |
| q (텍스트 검색) | ✅ | ❌ |

---

## 5. 고급 기능 비교

### 5.1 Goal Fallback Chain
- Paperclip: `goalId` → project의 goal → company의 default goal (3단계 폴백)
- CCO: **없음** (goalId 컬럼조차 없음)

### 5.2 Workspace Inheritance
- Paperclip: 6가지 워크스페이스 전략 (inherit, shared, isolated, operator_branch, reuse, agent_default)
- CCO: **없음**

### 5.3 Labels
- Paperclip: M:N 라벨 시스템 (생성, 삭제, 동기화, 필터링)
- CCO: **없음**

### 5.4 Read State / Inbox
- Paperclip: 읽음/안읽음 추적, 보관함, 참여자 활동 추적
- CCO: **없음**

### 5.5 Work Products
- Paperclip: 이슈에 연결된 산출물 (PR, 브랜치, URL 등) 추적
- CCO: **없음**

### 5.6 Task Sessions
- Paperclip: 에이전트별 작업 세션 추적 (어댑터 세션 지속)
- CCO: **없음** (실행 시 마다 새 세션)

### 5.7 Attachments
- Paperclip: 이슈/코멘트에 파일 첨부 (50MB 제한)
- CCO: **없음**

### 5.8 Identifier Lookup
- Paperclip: UUID 또는 identifier(예: "PAP-39")로 조회 가능
- CCO: ID로만 조회 (identifier로 직접 조회 불가)

### 5.9 Issue Approvals Link
- Paperclip: 이슈↔승인 M:N 연결, 배치 링크
- CCO: **없음**

### 5.10 Heartbeat Context
- Paperclip: `/issues/{id}/heartbeat-context` — 에이전트 실행에 필요한 모든 컨텍스트 반환
- CCO: **없음** (스케줄러가 직접 프롬프트 구성)

### 5.11 Comment Interrupt/Reopen
- Paperclip: 코멘트 추가 시 `reopen` (완료된 이슈 재개), `interrupt` (실행 중인 런 중단) 지원
- CCO: **없음**

### 5.12 Wakeup on Assignment
- Paperclip: 이슈 할당 시 에이전트 자동 깨움 (heartbeat wakeup)
- CCO: **없음** (스케줄러 주기에 의존)

---

## 6. CLI 비교

| Command | Paperclip | CCO |
|---------|-----------|-----|
| `issue list` (필터) | status, assignee, project, match | status만 |
| `issue get` (ID or identifier) | ✅ 둘 다 | ID만 |
| `issue create` (전체 옵션) | title, desc, status, priority, assignee, project, goal, parent, request-depth, billing-code | title, desc, priority, assignee, project |
| `issue update` (전체 옵션) | + comment, hidden-at | + status, title, assignee |
| `issue checkout` | ✅ (agent-id, expected-statuses) | **없음** |
| `issue release` | ✅ | **없음** |
| `issue comment` | ✅ (body, reopen, interrupt) | ✅ (body만) |
| `issue feedback` | ✅ (투표, 내보내기) | **없음** |

---

## 7. UI 비교

### 이슈 목록 페이지

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| 검색 | ✅ (텍스트 검색) | ❌ |
| 필터 | ✅ (다중 필터) | ❌ (칸반 칼럼만) |
| 라벨 표시 | ✅ | ❌ |
| 활성 런 표시 | ✅ | ❌ |
| 읽음/안읽음 | ✅ | ❌ |

### 이슈 상세 페이지

| Feature | Paperclip | CCO |
|---------|-----------|-----|
| 코멘트 스레드 | ✅ (페이지네이션, 커서) | ✅ (전체 로드) |
| 문서 관리 | ✅ (키 기반, 리비전) | ❌ (별도 페이지) |
| 산출물 (Work Products) | ✅ | ❌ |
| 승인 연결 | ✅ | ❌ |
| 피드백 투표 | ✅ | ❌ |
| 실시간 실행 위젯 | ✅ | ❌ |
| 첨부파일 | ✅ | ❌ |
| Keyboard shortcuts | ✅ | ❌ |
| Properties sidebar | ✅ (탭 형태) | ✅ (간단한 사이드바) |

---

## 8. Gap 요약 (우선순위별)

### P0: 핵심 기능 부재 (필수)

| # | Gap | 설명 | 난이도 |
|---|-----|------|--------|
| T-001 | `blocked` 상태 추가 | 6개→7개 상태, 전환 규칙 업데이트 | S |
| T-002 | 기본 상태 `backlog`로 변경 | Paperclip과 일치 | S |
| T-003 | `cancelledAt`, `hiddenAt` 컬럼 | 취소/숨김 타임스탬프 | S |
| T-004 | Identifier 기반 조회 | `getById`에서 UUID or identifier 지원 | S |
| T-005 | Checkout `expectedStatuses` | 호출자가 허용 상태 배열 지정 | M |
| T-006 | Checkout stale run 감지/인수 | 죽은 런 자동 교체 | M |
| T-007 | Release 권한 검증 | 할당된 에이전트만 릴리스 | S |
| T-008 | 텍스트 검색 (제목, 설명, 코멘트) | 우선순위 기반 멀티필드 검색 | L |
| T-009 | 다중 상태 필터 (CSV) | `?status=todo,in_progress` | S |

### P1: 중요 기능 (높은 가치)

| # | Gap | 설명 | 난이도 |
|---|-----|------|--------|
| T-010 | `goalId` 컬럼 + Goal fallback | 3단계 골 폴백 체인 | M |
| T-011 | Labels 시스템 | M:N 라벨, CRUD, 동기화, 필터 | L |
| T-012 | 이슈 Heartbeat Context API | `/tasks/:id/heartbeat-context` | M |
| T-013 | Assignment wakeup | 할당 시 에이전트 자동 깨움 | M |
| T-014 | Comment interrupt/reopen | 코멘트로 이슈 재개/런 중단 | M |
| T-015 | `createdByAgentId`, `createdByUserId` | 생성자 추적 | S |
| T-016 | `originId`, `originRunId` | 출처 상세 추적 | S |
| T-017 | Attachments (파일 첨부) | 이슈/코멘트에 파일 첨부 | L |
| T-018 | Comment 페이지네이션 | 커서 기반 페이징 (최대 500) | M |

### P2: 향상 기능 (가치 있는 개선)

| # | Gap | 설명 | 난이도 |
|---|-----|------|--------|
| T-019 | Read State (읽음/안읽음) | 유저별 읽음 추적 | L |
| T-020 | Inbox Archive | 보관함 기능 | M |
| T-021 | Work Products | 산출물 추적 (PR, 브랜치 등) | L |
| T-022 | Task Sessions | 에이전트별 세션 지속 | L |
| T-023 | `requestDepth`, `billingCode` | 중첩 깊이, 비용 코드 | S |
| T-024 | `assigneeUserId` | 사람 할당 지원 | S |
| T-025 | Issue-Approval 연결 | M:N 이슈↔승인 링크 | M |
| T-026 | Workspace 통합 | executionWorkspaceId, preference, settings | L |
| T-027 | 고급 필터 (project, parent, label, origin) | 추가 필터 파라미터 | M |
| T-028 | Feedback 유니크 제약 | 1인 1투표 (upsert) | S |
| T-029 | Document key 시스템 | 버전 대신 key("plan", "spec") 기반 문서 | M |

### P3: UI/UX 개선

| # | Gap | 설명 | 난이도 |
|---|-----|------|--------|
| T-030 | 이슈 목록 검색 UI | 검색바 + 필터 UI | M |
| T-031 | 이슈 상세 문서 섹션 | 인라인 문서 관리 | M |
| T-032 | 이슈 상세 실시간 실행 위젯 | 활성 런 표시 | M |
| T-033 | 이슈 상세 피드백 투표 UI | 👍👎 인라인 투표 | S |
| T-034 | 키보드 단축키 | 이슈 조작 단축키 | M |
| T-035 | CLI checkout/release 커맨드 | `cco task checkout`, `cco task release` | M |

---

## 9. 리팩토링 계획

### Phase A: 스키마 & 핵심 로직 (1주)

**Sprint A.1: 스키마 마이그레이션** (2일)
- T-001: `blocked` 상태 추가 (validators + 전환 규칙)
- T-002: 기본 상태 `backlog`로 변경
- T-003: `cancelledAt`, `hiddenAt` 컬럼 추가
- T-010: `goalId` 컬럼 추가
- T-015: `createdByAgentId`, `createdByUserId` 컬럼 추가
- T-016: `originId`, `originRunId` 컬럼 추가
- T-023: `requestDepth`, `billingCode` 컬럼 추가
- T-024: `assigneeUserId` 컬럼 추가
- T-028: Feedback 유니크 제약 추가
- 새 마이그레이션 생성 및 적용

**Sprint A.2: Checkout 프로토콜 강화** (2일)
- T-005: `expectedStatuses` 배열 파라미터
- T-006: Stale run 감지 및 자동 인수 (assertCheckoutOwner)
- T-007: Release 권한 검증 (actorAgentId, actorRunId)
- T-004: `getById`에서 identifier 기반 조회 지원
- T-009: 다중 상태 필터 (CSV split)
- T-012: Heartbeat Context API 엔드포인트

**Sprint A.3: 검색 & Goal Fallback** (1일)
- T-008: 멀티필드 텍스트 검색 (title, description, comments)
- T-010: Goal fallback chain (direct → project → default)

### Phase B: Labels & Attachments (3일)

**Sprint B.1: Labels 시스템** (1.5일)
- T-011: `task_labels`, `labels` 테이블 생성
- Labels CRUD 서비스 + 라우트
- Task에 label 동기화 (syncTaskLabels)
- 필터에 labelId 추가

**Sprint B.2: Attachments** (1.5일)
- T-017: `task_attachments` 테이블 생성
- 파일 업로드/다운로드 엔드포인트 (기존 storage 활용)
- 코멘트에 첨부파일 연결

### Phase C: Wakeup & Interrupt (2일)

- T-013: Assignment wakeup — 할당 변경 시 에이전트 자동 깨움
- T-014: Comment interrupt/reopen — 코멘트에 `reopen`, `interrupt` 플래그
- T-012: Heartbeat context API 완성

### Phase D: UI 업그레이드 (2일)

- T-030: 이슈 목록 검색 + 필터 UI
- T-031: 이슈 상세 문서 섹션
- T-032: 활성 런 실시간 위젯
- T-033: 피드백 투표 UI
- T-035: CLI checkout/release 커맨드

---

## 10. 예상 결과

| Metric | Before | After |
|--------|:------:|:-----:|
| Task 스키마 컬럼 | 18 | **28** |
| Task 상태 | 6 | **7** (blocked 추가) |
| Checkout 기능 | Basic | **Advanced** (stale detection, permissions) |
| 검색 | 없음 | **멀티필드 우선순위 검색** |
| 필터 | 2개 | **10+** |
| 관련 테이블 | 3 | **5+** (labels, attachments 추가) |
| Paperclip task 기능 패리티 | ~40% | **~75%** |

나머지 25% (Read State, Inbox, Work Products, Task Sessions, Workspace 통합)는 P2로 분류하고 추후 별도 Phase에서 구현한다.

---

*End of Deep-Dive Gap Analysis*
