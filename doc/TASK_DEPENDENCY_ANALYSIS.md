# Task 리팩토링 의존성 분석

> **Date**: 2026-04-07
> **목적**: Task 시스템 리팩토링 시 함께 수정해야 하는 다른 기능들을 파악

---

## 1. 의존성 맵

```
                          ┌─────────────┐
                          │   tasks     │
                          │  (core)     │
                          └──────┬──────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
    │ Checkout  │         │ Scheduler │         │ Execution │
    │ Service   │         │ Service   │         │ Service   │
    └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
          │                      │                      │
          │                ┌─────▼─────┐                │
          │                │ Routines  │                │
          │                │ (trigger) │                │
          │                └───────────┘                │
          │                                             │
    ┌─────▼───────────────────────────────────────▼─────┐
    │                    Runs                           │
    │            (taskId FK 보유)                        │
    └──────────────────────┬────────────────────────────┘
                           │
                     ┌─────▼─────┐
                     │ Cost      │
                     │ Events    │
                     │(taskId FK)│
                     └───────────┘

    ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
    │ Comments  │  │ Documents │  │ Feedback  │  │ Labels    │
    │(taskId FK)│  │(taskId FK)│  │(targetId) │  │(NEW: M:N) │
    └───────────┘  └───────────┘  └───────────┘  └───────────┘

    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │ Dashboard │  │ Export/   │  │ Teams     │
    │(task 집계)│  │ Import   │  │(cascade)  │
    └───────────┘  └───────────┘  └───────────┘
```

---

## 2. 영향 받는 기능 상세 분석

### 2.1 🔴 반드시 함께 수정 (Breaking Change)

#### Scheduler Service
**파일**: `server/src/services/scheduler.ts`
**의존**: checkout.pickNextTask(), checkout.checkout(), checkout.release(), tasksService.create()
**영향**:
- `status: 'todo'` 하드코딩 (line 142) → 기본값 `backlog` 변경 시 루틴 생성 task 상태 수정 필요
- `checkout.release(teamId, task.id, 'todo')` (line 75) → release 시그니처 변경되면 수정
- `checkout.release(teamId, task.id, 'done')` (line 77) → 동일
- `checkoutService` 타입 정의 (line 12-16) → release에 actorAgentId/actorRunId 추가되면 타입 변경
- **결론: Step 2(상태), Step 3(checkout) 수정 시 반드시 동시 수정**

#### Checkout Service
**파일**: `server/src/services/checkout.ts`
**의존**: tasks 테이블 직접 접근
**영향**:
- `task.status !== 'todo' && task.status !== 'backlog'` (line 29) → expectedStatuses로 교체
- pickNextTask에서 `eq(tasks.status, 'todo')` (line 77) → backlog 변경 시 조건 수정 필요
- **결론: 리팩토링 핵심 대상 (Step 3에서 전면 수정)**

#### Routines Service
**파일**: `server/src/services/routines.ts`
**의존**: tasksService.create()
**영향**:
- `trigger()` 메서드에서 `tasksService.create()` 호출 (line 69)
- `status: 'todo'` 하드코딩 → 기본값 변경 시 수정 필요
- **결론: Step 2에서 기본값 변경 시 수정 (`'todo'` → `'backlog'` 또는 유지 판단)**

#### Dashboard Service
**파일**: `server/src/services/dashboard.ts`
**의존**: tasks 상태별 집계
**영향**:
- `taskStatusMap`에 현재 6개 상태 매핑 (line 53-60)
- `blocked` 상태 추가 시 매핑 추가 필요
- `taskCounts` 객체에 `blocked` 필드 추가
- **결론: Step 2에서 blocked 추가 시 반드시 수정**

#### Export-Import Service
**파일**: `server/src/services/export-import.ts`
**의존**: tasks 테이블 직접 읽기/쓰기
**영향**:
- `exportTeam()`에서 task 컬럼 직렬화 (line 101-108) → 새 컬럼 추가 시 export에 포함
- `importTeam()`에서 task 삽입 (line 175-186) → 새 컬럼 import 지원
- `TeamExport.tasks` 타입 정의 (line 30-37) → 새 필드 추가
- **결론: Step 1(스키마) 수정 시 함께 수정**

#### Teams Service (Cascade Delete)
**파일**: `server/src/services/teams.ts`
**의존**: tasks 및 관련 테이블 삭제
**영향**:
- `remove()`에서 cascade 순서 (line 3-18)
- labels, task_labels 테이블 추가 시 삭제 순서에 추가 필요
- **결론: Step 5(labels) 추가 시 cascade에 `task_labels`, `labels` 삭제 추가**

### 2.2 🟡 수정 권장 (기능 향상)

#### Execution Service
**파일**: `server/src/services/execution.ts`
**의존**: `opts.taskId` 전달만 (간접 의존)
**영향**:
- taskId를 runs에 저장 (line 70, 97) → 현재 인터페이스 유지 가능
- 새 컬럼(goalId 등)은 execution에서 참조하지 않음
- **결론: 직접 수정 불필요. 단, heartbeat context API가 execution에 컨텍스트를 제공하면 더 좋음**

#### StatusBadge (UI)
**파일**: `ui/src/components/ui/StatusBadge.tsx`
**의존**: 상태 문자열로 스타일 매핑
**영향**:
- `blocked` 상태 스타일 추가 필요
- **결론: Step 2에서 반드시 수정 (이미 StatusBadge에 추가 패턴 확립)**

#### Tasks Kanban (UI)
**파일**: `ui/src/pages/Tasks.tsx`
**의존**: `COLUMNS` 배열에 상태 하드코딩
**영향**:
- `const COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'done']` → `blocked` 추가
- **결론: Step 2에서 반드시 수정**

#### TaskDetail (UI)
**파일**: `ui/src/pages/TaskDetail.tsx`
**의존**: `TRANSITIONS` 맵에 상태 전환 하드코딩
**영향**:
- `blocked` 전환 버튼 추가
- **결론: Step 2에서 반드시 수정**

#### Feedback Service
**파일**: `server/src/services/feedback.ts`
**의존**: `targetType='task'` 문자열 매칭
**영향**:
- 유니크 제약 추가 시 `create()` 로직 변경 (upsert 패턴)
- **결론: Step 1에서 유니크 제약 시 수정 필요**

### 2.3 🟢 수정 불필요 (독립적)

| 기능 | 이유 |
|------|------|
| **Agents Service** | tasks와 직접 의존 없음. agent.status는 별도 관리 |
| **Agent Keys Service** | 완전 독립 |
| **Agent Instructions** | 완전 독립 |
| **Goals Service** | 현재 tasks→goals FK 없음. Step 1에서 추가하지만 goals 서비스 수정 불필요 |
| **Approvals Service** | tasks와 직접 연결 없음 (향후 issue-approval link 추가 시 별도) |
| **Costs Service** | costEvents.taskId FK만 보유, 쿼리 변경 없음 |
| **Projects Service** | tasks.projectId FK만 보유, projects 서비스 변경 없음 |
| **Storage/Secrets** | 완전 독립 |
| **Adapters** | 완전 독립 |
| **WebSocket/Realtime** | 이벤트 발행만, 구조 변경 불필요 |
| **CLI Commands** | API 호출만, 서버 변경에 자동 대응 (Step 9에서 별도 강화) |

---

## 3. 리팩토링 계획 수정 사항

### Step 1 (스키마) 추가 작업:
- [ ] `export-import.ts`: TeamExport 타입에 새 컬럼 반영
- [ ] `teams.ts`: cascade delete에 `task_labels`, `labels` 예약 (Step 5에서 실제 추가)
- [ ] `feedback.ts`: 유니크 제약 추가 시 create() → upsert 패턴

### Step 2 (상태 머신) 추가 작업:
- [ ] `scheduler.ts`: routine trigger 시 task 생성 상태 결정 (backlog vs todo)
- [ ] `dashboard.ts`: taskCounts에 `blocked` 추가, taskStatusMap 업데이트
- [ ] `StatusBadge.tsx`: `blocked` 스타일 추가
- [ ] `Tasks.tsx`: COLUMNS에 `blocked` 추가
- [ ] `TaskDetail.tsx`: TRANSITIONS에 `blocked` 추가
- [ ] `checkout.ts`: pickNextTask에서 조건 확인 (`todo` or `backlog`?)

### Step 3 (Checkout) 추가 작업:
- [ ] `scheduler.ts`: SchedulerDeps 타입의 checkoutService 시그니처 업데이트
- [ ] `scheduler.ts`: release() 호출에 actorAgentId/actorRunId 전달
- [ ] `app.ts`: createCheckoutService 호출 변경 확인

### Step 5 (Labels) 추가 작업:
- [ ] `teams.ts`: cascade delete에 `task_labels`, `labels` 추가
- [ ] `export-import.ts`: labels export/import 지원 (선택)

---

## 4. 수정 파일 총 목록 (Step별)

### Step 1: 스키마 확장
```
packages/db/src/schema/tasks.ts          ← 컬럼 추가
packages/db/src/schema/labels.ts         ← 새 파일
packages/db/src/schema/task-labels.ts    ← 새 파일
packages/db/src/schema/index.ts          ← export 추가
packages/shared/src/validators.ts        ← CreateTaskSchema 확장
server/src/services/tasks.ts             ← create() 새 컬럼 처리
server/src/services/export-import.ts     ← TeamExport 타입 + 직렬화
server/src/services/feedback.ts          ← upsert 패턴 (유니크 제약)
server/src/services/tasks.test.ts        ← 새 테스트
```

### Step 2: 상태 머신
```
packages/shared/src/validators.ts        ← blocked 추가
server/src/services/tasks.ts             ← VALID_TRANSITIONS, 기본값, cancelledAt
server/src/services/scheduler.ts         ← routine task 상태, pickNextTask 조건
server/src/services/checkout.ts          ← pickNextTask 조건
server/src/services/dashboard.ts         ← blocked 집계
ui/src/components/ui/StatusBadge.tsx      ← blocked 스타일
ui/src/pages/Tasks.tsx                   ← COLUMNS에 blocked
ui/src/pages/TaskDetail.tsx              ← TRANSITIONS에 blocked
server/src/services/tasks.test.ts        ← 새 테스트
```

### Step 3: Checkout 강화
```
server/src/services/checkout.ts          ← 전면 수정
server/src/services/tasks.ts             ← getById identifier
server/src/services/scheduler.ts         ← checkoutService 타입 + 호출
server/src/routes/tasks.ts               ← identifier 지원
server/src/services/checkout.test.ts     ← 새 테스트
```

### Step 4: 검색 & 필터
```
server/src/services/tasks.ts             ← list() 확장
server/src/routes/tasks.ts               ← query params
server/src/services/tasks.test.ts        ← 새 테스트
```

### Step 5: Labels
```
packages/db/src/schema/labels.ts         ← (Step 1에서 생성)
packages/db/src/schema/task-labels.ts    ← (Step 1에서 생성)
server/src/services/labels.ts            ← 새 파일
server/src/routes/labels.ts              ← 새 파일
server/src/services/tasks.ts             ← labelId 필터
server/src/services/teams.ts             ← cascade delete 추가
server/src/app.ts                        ← 라우트 등록
server/src/services/labels.test.ts       ← 새 테스트
server/src/routes/labels.test.ts         ← 새 테스트
```

---

## 5. 결론

**Task 리팩토링은 단독으로 진행할 수 없습니다.** 다음 기능들이 반드시 함께 수정되어야 합니다:

| 기능 | 영향 Step | 수정 범위 |
|------|----------|----------|
| **Scheduler** | Step 2, 3 | 상태 하드코딩, checkout 시그니처, release 호출 |
| **Checkout** | Step 2, 3 | 핵심 리팩토링 대상 |
| **Dashboard** | Step 2 | blocked 상태 집계 추가 |
| **Export-Import** | Step 1 | 새 컬럼 직렬화/역직렬화 |
| **Teams (cascade)** | Step 5 | labels/task_labels 삭제 추가 |
| **Routines** | Step 2 | task 생성 시 기본 상태 |
| **Feedback** | Step 1 | 유니크 제약 → upsert |
| **StatusBadge (UI)** | Step 2 | blocked 스타일 |
| **Tasks.tsx (UI)** | Step 2 | blocked 칸반 칼럼 |
| **TaskDetail.tsx (UI)** | Step 2 | blocked 전환 버튼 |

**수정 불필요 (독립적):**
Agents, Agent Keys, Agent Instructions, Goals Service, Approvals, Costs, Projects, Storage, Secrets, Adapters, WebSocket

---

*End of Dependency Analysis*
