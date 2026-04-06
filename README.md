# CCO — Claude Code Orchestrator

AI 에이전트 팀 오케스트레이션 플랫폼. 여러 AI 에이전트를 팀으로 구성하고, 작업을 할당하고, 비용과 실행을 중앙에서 관리합니다.

## 주요 기능

### Core
- **팀 관리** — 에이전트 팀 생성, 관리, 내보내기/가져오기
- **에이전트 관리** — 다중 어댑터 지원 (Claude, Gemini, Codex, OpenCode), 역할/권한/인스트럭션 관리, 에이전트별 API 키
- **작업(Task) 관리** — 상태 머신 (backlog→todo→in_progress→in_review→done), 문서 리비전 추적
- **실행(Run) 추적** — 실시간 WebSocket 이벤트, 로그/토큰/비용 기록
- **목표(Goals)** — 계층형 목표 시스템, 프로젝트 연결

### Orchestration
- **예산 관리** — 팀/에이전트/프로젝트 단위 월별 비용 한도, 대시보드 집계
- **루틴(Routine)** — 5-field cron 파서, 자동 트리거, 실행 이력
- **승인(Approval)** — 승인/거부 워크플로우, 페이로드 뷰어
- **스케줄러** — Heartbeat 스케줄링, 고아 런 정리, cron 트리거 평가

### Infrastructure
- **실시간 업데이트** — WebSocket pub/sub, 이벤트 기반 UI 갱신
- **피드백 시스템** — 투표 (up/down), 피드백 트레이스
- **활동 로그** — 모든 엔티티 변경 감사 기록
- **스토리지** — 로컬 디스크 파일 스토리지
- **시크릿** — AES-256-GCM 암호화 시크릿 관리
- **설정 시스템** — 계층형 설정 (환경변수 > 설정파일 > 기본값)

## 아키텍처

```
cco/
├── packages/
│   ├── db/              # Drizzle ORM + SQLite (17 테이블, 마이그레이션)
│   ├── shared/          # 타입, 검증기, 설정 스키마, ID 생성
│   ├── adapter-utils/   # 어댑터 플러그인 인터페이스
│   └── adapters/        # 4개 어댑터
│       ├── claude-code/   Claude Code CLI
│       ├── gemini/        Gemini CLI
│       ├── codex/         Codex CLI
│       └── opencode/      OpenCode CLI
├── server/              # Express REST API (20 라우트, 22 서비스, 6 미들웨어)
│   ├── src/routes/        API 엔드포인트 (~45개)
│   ├── src/services/      비즈니스 로직
│   ├── src/middleware/     에러 핸들링, 검증, 로깅, 인증
│   ├── src/realtime/      WebSocket 라이브 이벤트
│   ├── src/storage/       파일 스토리지 프로바이더
│   └── src/secrets/       암호화 시크릿 관리
├── cli/                 # Commander.js CLI (30+ 커맨드)
├── ui/                  # React + Vite SPA (13 페이지, 다크모드, 실시간)
├── skills/              # 에이전트 스킬 파일 (3개)
├── docker-compose.yml   # Docker 배포
└── tests/               # 25 테스트 파일, 165 테스트
```

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm --filter @cco/server dev

# UI 개발 서버
pnpm --filter @cco/ui dev

# 테스트 실행
pnpm test

# CLI 사용
pnpm --filter cco-cli start
```

## API 엔드포인트 (주요)

| Category | Endpoints |
|----------|-----------|
| Teams | CRUD + DELETE (cascade) |
| Agents | CRUD + instructions + permissions + API keys |
| Tasks | CRUD + status transitions + comments + documents |
| Runs | Start run + list + detail |
| Goals | CRUD + hierarchy (children) |
| Approvals | CRUD + decide (approve/reject) |
| Routines | CRUD + triggers + manual trigger + run history |
| Dashboard | Aggregated metrics + sidebar badges |
| Costs | List + monthly spend + per-agent breakdown |
| Activity | Filterable audit log |
| Feedback | Voting + summaries |
| Adapters | List + test environment |
| Assets | Upload + download + delete |
| Secrets | CRUD (values never exposed in GET) |
| Export/Import | Team data portability |
| WebSocket | `/api/teams/:teamId/events/ws` |

## CLI 커맨드

```bash
cco doctor                     # 진단 검사
cco start [-p port]            # 서버 시작
cco status                     # 서버 상태 확인
cco team list|get|delete       # 팀 관리
cco agent list|get             # 에이전트 관리
cco task list|get|create|update|comment  # 작업 관리
cco approval list|get|approve|reject     # 승인 관리
cco goal list|create           # 목표 관리
cco run exec|list              # 에이전트 실행
cco activity list              # 활동 로그
cco dashboard                  # 대시보드
cco export --team <id>         # 팀 내보내기
cco import --team <id> --from <file>  # 팀 가져오기
```

## Docker

```bash
# 빌드 & 실행
docker compose up -d

# 퀵스타트
docker compose -f docker-compose.quickstart.yml up
```

## 설정

환경 변수 또는 `~/.cco/config.json`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CCO_PORT` | 3100 | 서버 포트 |
| `CCO_API_KEY` | — | API 인증 키 |
| `CCO_DB_PATH` | ~/.cco/cco.db | DB 파일 경로 |
| `CCO_SCHEDULER_INTERVAL_MS` | 60000 | 스케줄러 간격 |
| `LOG_LEVEL` | info | 로그 레벨 |

## 기술 스택

- **Runtime**: Node.js 24+, TypeScript 6
- **Server**: Express 5, Pino logging, Zod validation
- **Database**: SQLite + Drizzle ORM (마이그레이션 지원)
- **Frontend**: React 19, Vite 8, Tailwind CSS 4, TanStack Query 5
- **CLI**: Commander.js, @clack/prompts
- **Real-time**: WebSocket (ws)
- **Security**: AES-256-GCM secrets, SHA256 API keys, timing-safe auth
