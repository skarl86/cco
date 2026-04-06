# CCO — Claude Code Orchestrator

AI 에이전트 팀 오케스트레이션 플랫폼. 여러 Claude Code 에이전트를 팀으로 구성하고, 작업을 할당하고, 비용과 실행을 중앙에서 관리합니다.

## 프로젝트 개요

CCO는 다음 기능을 제공하는 REST API 서버입니다:

- **팀 관리** — 에이전트 팀을 생성하고 관리
- **에이전트 관리** — Claude Code 에이전트를 등록하고 역할(orchestrator/worker)을 부여
- **작업(Task) 관리** — 작업 생성, 할당, 상태 추적 (todo → in_progress → done)
- **실행(Run) 추적** — 에이전트 실행 로그, 종료 코드, stdout/stderr 기록
- **예산 정책** — 팀/에이전트/프로젝트 단위 월별 비용 한도 및 경고 임계값
- **루틴(Routine)** — cron 표현식 기반 정기 작업 스케줄링
- **승인(Approval)** — 민감한 작업에 대한 사람 승인 워크플로우
- **활동 로그** — 모든 엔티티 변경에 대한 감사 로그

### 패키지 구조 (pnpm monorepo)

```
cco/
├── server/                        # Express API 서버 (포트 3100)
├── packages/
│   ├── shared/                    # 공유 타입 및 validators (Zod)
│   ├── db/                        # Drizzle ORM + better-sqlite3 스키마
│   ├── adapter-utils/             # 어댑터 공통 유틸리티
│   └── adapters/
│       └── claude-code/           # Claude Code CLI 어댑터
```

## 요구 사항

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Claude Code CLI (`claude`) — claude-code 어댑터 사용 시 필요

## 설치 방법

```bash
# 저장소 클론
git clone <repo-url>
cd cco

# 의존성 설치
pnpm install

# 빌드
pnpm build
```

## 사용법

### 개발 서버 실행

```bash
pnpm dev
```

서버가 `http://localhost:3100` 에서 실행됩니다.

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CCO_HOME` | `~/.cco` | CCO 홈 디렉토리 |
| `CCO_DB_PATH` | `~/.cco/cco.db` | SQLite DB 파일 경로 |
| `CCO_PORT` | `3100` | 서버 포트 |
| `CCO_API_KEY` | (없음) | API 인증 키 (미설정 시 비인증 모드) |
| `CCO_SCHEDULER_INTERVAL_MS` | `60000` | 루틴 스케줄러 주기 (ms) |

```bash
# 예시
CCO_API_KEY=my-secret-key CCO_PORT=3200 pnpm dev
```

### API 엔드포인트

모든 요청에 `CCO_API_KEY` 설정 시 `Authorization: Bearer <key>` 헤더가 필요합니다.

#### 팀

```
GET    /teams              # 팀 목록
POST   /teams              # 팀 생성
GET    /teams/:id          # 팀 조회
PATCH  /teams/:id          # 팀 수정
```

#### 에이전트

```
GET    /teams/:teamId/agents       # 에이전트 목록
POST   /teams/:teamId/agents       # 에이전트 등록
GET    /teams/:teamId/agents/:id   # 에이전트 조회
PATCH  /teams/:teamId/agents/:id   # 에이전트 수정
```

#### 작업(Task)

```
GET    /teams/:teamId/tasks        # 작업 목록
POST   /teams/:teamId/tasks        # 작업 생성
GET    /teams/:teamId/tasks/:id    # 작업 조회
PATCH  /teams/:teamId/tasks/:id    # 작업 수정
```

#### 실행(Run)

```
GET    /teams/:teamId/runs         # 실행 목록
GET    /teams/:teamId/runs/:id     # 실행 조회
```

#### 루틴(Routine)

```
GET    /teams/:teamId/routines     # 루틴 목록
POST   /teams/:teamId/routines     # 루틴 생성
PATCH  /teams/:teamId/routines/:id # 루틴 수정
```

### 테스트

```bash
# 전체 테스트 실행
pnpm test

# 감시 모드
pnpm test:watch

# 커버리지 리포트
pnpm test:coverage
```

### 타입 체크

```bash
pnpm typecheck
```

## 기술 스택

- **런타임**: Node.js (ESM)
- **프레임워크**: Express 5
- **데이터베이스**: SQLite (better-sqlite3) + Drizzle ORM
- **검증**: Zod v4
- **로깅**: pino / pino-http
- **테스트**: Vitest + Playwright (E2E)
- **언어**: TypeScript
