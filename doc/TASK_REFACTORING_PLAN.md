# CCO Task System Refactoring Plan

> **Date**: 2026-04-07
> **기반 문서**: [TASK_DEEP_DIVE_GAP.md](./TASK_DEEP_DIVE_GAP.md)
> **원칙**: TDD (RED → GREEN → REFACTOR), 단계별 커밋, E2E 검증

---

## 전체 구조

```
Step 1: 스키마 확장 + 마이그레이션                    [커밋 1]
Step 2: 상태 머신 강화 (blocked + 기본값 변경)         [커밋 2]
Step 3: Checkout 프로토콜 강화                        [커밋 3]
Step 4: 검색 & 고급 필터                             [커밋 4]
Step 5: Labels 시스템                                [커밋 5]
Step 6: Heartbeat Context + Assignment Wakeup        [커밋 6]
Step 7: Comment Interrupt/Reopen + 페이지네이션       [커밋 7]
Step 8: UI 업그레이드                                [커밋 8]
Step 9: CLI 강화                                     [커밋 9]
Step 10: E2E 통합 테스트                              [커밋 10]
```

---

## Step 1: 스키마 확장 + 마이그레이션

### 목표
tasks 테이블에 Paperclip과 패리티를 위한 컬럼 추가. 관련 테이블 생성.

### 변경 사항

**tasks 테이블 컬럼 추가:**
```
goalId             TEXT (FK→goals)
assigneeUserId     TEXT
createdByAgentId   TEXT
createdByUserId    TEXT
originId           TEXT
originRunId        TEXT
requestDepth       INTEGER DEFAULT 0
billingCode        TEXT
cancelledAt        INTEGER
hiddenAt           INTEGER
```

**새 테이블: `labels`**
```sql
CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX labels_team_name_uq ON labels(team_id, name);
```

**새 테이블: `task_labels`**
```sql
CREATE TABLE task_labels (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  label_id TEXT NOT NULL REFERENCES labels(id),
  PRIMARY KEY (task_id, label_id)
);
```

**인덱스 추가:**
```sql
CREATE INDEX tasks_parent_idx ON tasks(team_id, parent_id);
CREATE INDEX tasks_project_idx ON tasks(team_id, project_id);
CREATE INDEX tasks_origin_idx ON tasks(team_id, origin_kind, origin_id);
```

**feedback 테이블 유니크 제약:**
```sql
CREATE UNIQUE INDEX feedback_unique_vote ON feedback(team_id, target_type, target_id, actor_type, actor_id);
```

### TDD

**RED — 테스트 먼저 작성:**
```typescript
// tasks.test.ts 추가
it('creates task with goalId', () => { ... });
it('creates task with requestDepth and billingCode', () => { ... });
it('creates task with createdByAgentId', () => { ... });
it('sets cancelledAt when status changes to cancelled', () => { ... });
it('sets hiddenAt field', () => { ... });
```

**GREEN — 스키마 + 마이그레이션 생성:**
1. `packages/db/src/schema/tasks.ts` — 컬럼 추가
2. `packages/db/src/schema/labels.ts` — 새 테이블
3. `packages/db/src/schema/task-labels.ts` — 조인 테이블
4. `packages/db/src/schema/index.ts` — export 추가
5. `pnpm --filter @cco/db db:generate` — 마이그레이션 생성
6. `packages/shared/src/validators.ts` — CreateTaskSchema 확장

**검증:**
```bash
pnpm test -- --run   # 모든 테스트 통과
pnpm --filter @cco/server typecheck
```

**커밋:**
```
feat: extend task schema with Paperclip parity columns (Step 1)
```

---

## Step 2: 상태 머신 강화

### 목표
`blocked` 상태 추가, 기본 상태를 `backlog`로 변경, 전환 규칙 업데이트.

### 변경 사항

**validators.ts:**
```typescript
// TaskStatusSchema: 'blocked' 추가
export const TaskStatusSchema = z.enum([
  'backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'
]);
```

**tasks service VALID_TRANSITIONS:**
```typescript
const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  backlog: ['todo', 'cancelled'],
  todo: ['in_progress', 'backlog', 'cancelled'],
  in_progress: ['in_review', 'done', 'blocked', 'cancelled'],
  in_review: ['done', 'in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: [],
  cancelled: ['backlog'],
};
```

**기본 상태 변경:**
- `CreateTaskSchema`: `status` default를 `'backlog'`로
- `tasks service create()`: default를 `'backlog'`로
- 스키마 DDL: `status` default를 `'backlog'`로

**cancelledAt 자동 설정:**
- `update()`: `cancelled` 전환 시 `cancelledAt = now`

### TDD

**RED:**
```typescript
it('allows transition from in_progress to blocked', () => { ... });
it('allows transition from blocked to in_progress', () => { ... });
it('rejects transition from blocked to todo', () => { ... });
it('creates task with default status backlog', () => { ... });
it('sets cancelledAt when transitioning to cancelled', () => { ... });
```

**GREEN — 코드 수정:**
1. `packages/shared/src/validators.ts` — blocked 추가, 기본값 변경
2. `server/src/services/tasks.ts` — 전환 규칙, cancelledAt 로직
3. `ui/src/pages/Tasks.tsx` — kanban에 blocked 칼럼 추가
4. `ui/src/pages/TaskDetail.tsx` — blocked 전환 버튼

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: add blocked status and change default to backlog (Step 2)
```

---

## Step 3: Checkout 프로토콜 강화

### 목표
Paperclip 수준의 robust checkout/release 구현.

### 변경 사항

**checkout() 강화:**
```typescript
checkout(
  teamId: string,
  taskId: string,
  agentId: string,
  runId: string,
  expectedStatuses?: string[]  // 새 파라미터
): CheckoutResult
```
- `expectedStatuses` 배열로 허용 상태 지정 (기본: ['todo', 'backlog'])
- Stale run 감지: 기존 checkoutRunId가 있으면 해당 런 상태 확인 → 종료된 런이면 자동 인수
- 충돌 에러 메시지 세분화

**release() 강화:**
```typescript
release(
  teamId: string,
  taskId: string,
  newStatus?: string,
  actorAgentId?: string,  // 새 파라미터
  actorRunId?: string     // 새 파라미터
): void
```
- 권한 검증: `actorAgentId`가 현재 `assigneeAgentId`와 일치하는지
- `actorRunId`가 현재 `checkoutRunId`와 일치하는지

**identifier 기반 조회:**
```typescript
getById(teamId: string, idOrIdentifier: string)
// id가 'task_' prefix면 ID 조회, 아니면 identifier 조회
```

### TDD

**RED:**
```typescript
// checkout.test.ts 추가
it('accepts expectedStatuses array', () => { ... });
it('detects stale checkout run and adopts', () => { ... });
it('rejects checkout when status not in expectedStatuses', () => { ... });
it('returns specific error for already-checked-out task', () => { ... });

// release 권한
it('release fails when actorAgentId does not match assignee', () => { ... });
it('release succeeds when actorAgentId matches', () => { ... });

// identifier lookup
it('getById resolves by identifier', () => { ... });
it('getById resolves by id', () => { ... });
```

**GREEN — 코드 수정:**
1. `server/src/services/checkout.ts` — expectedStatuses, stale detection, actor validation
2. `server/src/services/tasks.ts` — getById identifier lookup
3. `server/src/routes/tasks.ts` — identifier 파라미터 지원

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: strengthen checkout protocol with stale detection and permissions (Step 3)
```

---

## Step 4: 검색 & 고급 필터

### 목표
멀티필드 텍스트 검색과 다중 상태 필터 구현.

### 변경 사항

**검색 (q 파라미터):**
```typescript
list(teamId, filters?: {
  status?: string;           // CSV 다중: "todo,in_progress"
  assigneeAgentId?: string;
  projectId?: string;
  parentId?: string;
  originKind?: string;
  q?: string;               // 텍스트 검색
})
```

**검색 알고리즘:**
1. Title LIKE '%q%'
2. Identifier LIKE '%q%'
3. Description LIKE '%q%'
4. 대소문자 무시 (SQLite LIKE는 ASCII 기본 무시)

**다중 상태 필터:**
- `?status=todo,in_progress` → SQL `IN ('todo', 'in_progress')`

### TDD

**RED:**
```typescript
it('filters by multiple statuses (CSV)', () => { ... });
it('searches by title', () => { ... });
it('searches by identifier', () => { ... });
it('searches by description', () => { ... });
it('search is case-insensitive', () => { ... });
it('filters by projectId', () => { ... });
it('filters by parentId', () => { ... });
it('filters by originKind', () => { ... });
it('combines search with filters', () => { ... });
```

**GREEN:**
1. `server/src/services/tasks.ts` — list() 확장
2. `server/src/routes/tasks.ts` — query params 추가
3. `packages/shared/src/validators.ts` — 필터 스키마 (선택)

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: add multi-field search and advanced filters for tasks (Step 4)
```

---

## Step 5: Labels 시스템

### 목표
M:N 라벨 시스템 구현 (CRUD + 태스크 동기화 + 필터).

### 변경 사항

**새 서비스: `server/src/services/labels.ts`**
```typescript
list(teamId): Label[]
create(teamId, { name, color }): Label
delete(labelId): void
syncTaskLabels(teamId, taskId, labelIds: string[]): void
getTaskLabels(teamId, taskId): Label[]
```

**새 라우트:**
```
GET    /api/teams/:teamId/labels
POST   /api/teams/:teamId/labels
DELETE /api/teams/:teamId/labels/:labelId
GET    /api/teams/:teamId/tasks/:taskId/labels
PUT    /api/teams/:teamId/tasks/:taskId/labels   (body: { labelIds: string[] })
```

**tasks list 필터 추가:**
- `?labelId=xxx` → JOIN task_labels

### TDD

**RED:**
```typescript
// labels.test.ts
it('creates a label', () => { ... });
it('lists labels for team', () => { ... });
it('deletes label', () => { ... });
it('syncs task labels (add + remove)', () => { ... });
it('gets labels for task', () => { ... });
it('rejects duplicate label name per team', () => { ... });

// routes/labels.test.ts
it('POST /labels creates label', () => { ... });
it('GET /labels lists labels', () => { ... });
it('PUT /tasks/:id/labels syncs', () => { ... });

// tasks list filter
it('filters tasks by labelId', () => { ... });
```

**GREEN:**
1. Labels 서비스 + 라우트
2. tasks list에 labelId 필터 추가
3. app.ts에 라우트 등록

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: add labels system with M:N task association and filtering (Step 5)
```

---

## Step 6: Heartbeat Context + Assignment Wakeup

### 목표
에이전트 실행에 필요한 컨텍스트 API, 할당 변경 시 자동 깨움.

### 변경 사항

**Heartbeat Context API:**
```
GET /api/teams/:teamId/tasks/:taskId/heartbeat-context
```
Response:
```json
{
  "data": {
    "task": { ... },
    "goal": { ... },
    "project": { ... },
    "ancestors": [...],
    "recentComments": [...]
  }
}
```

**Assignment Wakeup:**
`tasks.update()` 에서 `assigneeAgentId`가 변경되면:
1. 새 에이전트가 idle 상태인지 확인
2. idle이면 자동으로 task를 체크아웃하고 실행 시작
3. `emitEvent('task.assigned', ...)` 발행

### TDD

**RED:**
```typescript
// heartbeat context
it('GET /tasks/:id/heartbeat-context returns full context', () => { ... });
it('heartbeat-context includes goal when goalId set', () => { ... });
it('heartbeat-context includes recent comments', () => { ... });

// wakeup
it('emits task.assigned event on assignee change', () => { ... });
```

**GREEN:**
1. `server/src/routes/tasks.ts` — heartbeat-context 엔드포인트
2. `server/src/services/tasks.ts` — update()에 wakeup 로직

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: add heartbeat context API and assignment wakeup (Step 6)
```

---

## Step 7: Comment Interrupt/Reopen + 페이지네이션

### 목표
코멘트로 완료된 태스크 재개, 실행 중인 런 중단. 커서 기반 페이지네이션.

### 변경 사항

**Comment addComment 확장:**
```typescript
create(data: {
  teamId, taskId, body, authorType?, authorAgentId?,
  reopen?: boolean,    // done → todo 전환
  interrupt?: boolean  // 현재 런 중단
}): TaskComment
```

**reopen 로직:**
- 태스크 상태가 `done`이고 `reopen=true`면 → `todo`로 전환
- `completedAt` 클리어

**interrupt 로직:**
- 태스크에 활성 `checkoutRunId`가 있고 `interrupt=true`면
- 해당 런을 `cancelled`로 업데이트
- 체크아웃 릴리스

**Comment 페이지네이션:**
```
GET /api/teams/:teamId/tasks/:taskId/comments
  ?limit=50
  ?afterId=<commentId>
  ?order=asc|desc
```

### TDD

**RED:**
```typescript
it('reopen flag transitions done task back to todo', () => { ... });
it('reopen clears completedAt', () => { ... });
it('reopen ignored when task not done', () => { ... });
it('interrupt cancels active run', () => { ... });
it('interrupt releases checkout', () => { ... });
it('comment pagination with limit', () => { ... });
it('comment pagination with afterId cursor', () => { ... });
it('comment ordering asc/desc', () => { ... });
```

**GREEN:**
1. `server/src/services/comments.ts` — reopen/interrupt 로직
2. `server/src/routes/comments.ts` — 페이지네이션 파라미터

**검증:**
```bash
pnpm test -- --run
```

**커밋:**
```
feat: add comment interrupt/reopen and cursor pagination (Step 7)
```

---

## Step 8: UI 업그레이드

### 목표
Tasks 페이지에 검색/필터, TaskDetail에 문서/피드백/라벨 통합.

### 변경 사항

**Tasks.tsx 강화:**
- 검색바 (q 파라미터)
- 다중 상태 필터 체크박스
- blocked 칸반 칼럼
- 라벨 표시 (색상 도트)

**TaskDetail.tsx 강화:**
- 라벨 편집 (선택/해제)
- 문서 섹션 (인라인 리비전 뷰어)
- 피드백 투표 (👍👎 버튼 + 카운트)
- 활성 런 표시 (checkoutRunId가 있으면)
- Goal 링크 (goalId가 있으면)

**queries.ts 추가:**
```typescript
useLabels(teamId)
useTaskLabels(teamId, taskId)
useSyncTaskLabels(teamId, taskId)
useTaskHeartbeatContext(teamId, taskId)
```

### TDD
UI 테스트는 E2E (Step 10)에서 커버.

**검증:**
```bash
npx tsc --noEmit --project ui/tsconfig.json  # 타입 체크
```

**커밋:**
```
feat: upgrade Tasks UI with search, filters, labels, and feedback (Step 8)
```

---

## Step 9: CLI 강화

### 목표
Task CLI 커맨드에 checkout/release, 고급 옵션 추가.

### 변경 사항

**새 커맨드:**
```bash
cco task checkout <taskId> --team <teamId> --agent <agentId> [--expected-statuses todo,backlog]
cco task release <taskId> --team <teamId> [--status done|todo]
```

**기존 커맨드 강화:**
```bash
cco task list --team <teamId> --status todo,in_progress --project <id> --q "검색어"
cco task create --team <teamId> --title "..." --goal <goalId> --billing-code "PROJ-001"
cco task comment <taskId> --team <teamId> --body "..." --reopen --interrupt
```

### TDD
CLI 테스트는 기능적으로 API 호출만 하므로 별도 유닛 테스트 불필요 (E2E에서 커버).

**검증:**
```bash
pnpm --filter cco-cli typecheck
```

**커밋:**
```
feat: add task checkout/release CLI and enhanced options (Step 9)
```

---

## Step 10: E2E 통합 테스트

### 목표
전체 Task 워크플로우를 E2E로 검증.

### 테스트 시나리오

**E2E 1: 전체 Task 라이프사이클**
```typescript
test('task lifecycle: backlog → todo → in_progress → done', async () => {
  // 1. 팀 생성
  // 2. 에이전트 생성
  // 3. Task 생성 (status: backlog)
  // 4. Task 업데이트 → todo
  // 5. Task checkout (agent)
  // 6. Task release (status: done)
  // 7. 상태 확인
});
```

**E2E 2: 검색 & 필터**
```typescript
test('search tasks by title and filter by status', async () => {
  // 1. 여러 태스크 생성
  // 2. 다중 상태 필터 검증
  // 3. 텍스트 검색 검증
});
```

**E2E 3: Labels 워크플로우**
```typescript
test('label CRUD and task association', async () => {
  // 1. 라벨 생성
  // 2. 태스크에 라벨 연결
  // 3. 라벨로 필터
  // 4. 라벨 제거
});
```

**E2E 4: Comment Interrupt/Reopen**
```typescript
test('comment reopen transitions done task to todo', async () => {
  // 1. Task 생성 → done
  // 2. Comment with reopen=true
  // 3. 상태가 todo로 변경 확인
});
```

**E2E 5: Checkout Stale Run Detection**
```typescript
test('stale checkout run is automatically adopted', async () => {
  // 1. Task checkout with run A
  // 2. Run A를 failed로 마킹
  // 3. Task checkout with run B → 성공 (stale 감지)
});
```

**검증:**
```bash
pnpm test -- --run        # 유닛 + 통합
pnpm test:e2e             # E2E (Playwright)
```

**커밋:**
```
test: add E2E tests for task lifecycle, search, labels, and checkout (Step 10)
```

---

## 커밋 요약

| Step | 커밋 메시지 | Gap 해결 |
|------|-----------|---------|
| 1 | `feat: extend task schema with Paperclip parity columns` | T-003,010,015,016,023,024,028 |
| 2 | `feat: add blocked status and change default to backlog` | T-001,002 |
| 3 | `feat: strengthen checkout protocol with stale detection` | T-004,005,006,007,009 |
| 4 | `feat: add multi-field search and advanced filters` | T-008,027 |
| 5 | `feat: add labels system with M:N task association` | T-011 |
| 6 | `feat: add heartbeat context API and assignment wakeup` | T-012,013 |
| 7 | `feat: add comment interrupt/reopen and pagination` | T-014,018 |
| 8 | `feat: upgrade Tasks UI with search, filters, labels` | T-030,031,033 |
| 9 | `feat: add task checkout/release CLI` | T-035 |
| 10 | `test: add E2E tests for task system` | 전체 검증 |

### 예상 결과

| Metric | Before | After |
|--------|:------:|:-----:|
| Task 스키마 컬럼 | 18 | **28** |
| Task 상태 | 6 | **7** |
| Checkout 기능 수준 | Basic | **Advanced** |
| 필터 수 | 2 | **8+** |
| 검색 | 없음 | **멀티필드** |
| 관련 테이블 | 3 | **5** |
| Task 기능 패리티 | ~40% | **~75%** |
| 테스트 | ~292 | **~330+** |

---

*End of Refactoring Plan*
