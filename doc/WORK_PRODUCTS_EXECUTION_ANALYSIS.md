# Work Products 실행 흐름 분석

> **Date**: 2026-04-07
> **목적**: Paperclip의 에이전트 실행→Work Product 생성 메커니즘을 분석하고, CCO에 올바르게 적용하기 위한 계획

---

## 1. Paperclip의 메커니즘 (정답)

### Paperclip이 에이전트에게 Work Products API를 호출하게 만드는 방법

**핵심: 스킬 인젝션 시스템**

```
1. 에이전트 실행 시작
2. 서버가 임시 디렉토리 생성: /tmp/xxx/.claude/skills/
3. skills/ 디렉토리를 심볼릭 링크로 연결
4. Claude CLI에 --add-dir /tmp/xxx/ 옵션으로 전달
5. Claude Code가 skills/를 자동 발견하고 SKILL.md를 로드
6. 에이전트가 SKILL.md의 지시에 따라 Work Products API 호출
```

**Paperclip이 Claude CLI에 전달하는 것:**
```bash
claude --print - --output-format stream-json --verbose \
  --model sonnet \
  --max-turns 50 \
  --append-system-prompt-file /path/to/agent-instructions.md \  # 에이전트 고유 지시
  --add-dir /tmp/skills-dir/ \                                   # 스킬 파일 (자동 발견)
  [prompt via stdin]
```

**환경 변수로 API 접근 정보 전달:**
```
PAPERCLIP_API_URL=http://localhost:3100
PAPERCLIP_API_KEY=<short-lived-jwt>
PAPERCLIP_TASK_ID=<issue-id>
PAPERCLIP_RUN_ID=<run-id>
PAPERCLIP_AGENT_ID=<agent-id>
PAPERCLIP_COMPANY_ID=<company-id>
```

**에이전트가 SKILL.md를 읽고 실행 후 자발적으로 API 호출:**
```bash
curl -X POST $PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID/work-products \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"pull_request","provider":"github",...}'
```

### Paperclip이 자동 감지하지 않는 것
- Git 커밋 자동 스캔: **하지 않음**
- PR 자동 감지: **하지 않음**
- 서버 측 후처리: **하지 않음**
- 100% 에이전트가 API를 호출해야 함

---

## 2. CCO의 현재 문제점

### 문제 1: 스킬 인젝션이 없음
CCO는 Claude CLI에 `--add-dir`을 전달하지 않음. 에이전트가 `skills/cco/SKILL.md`를 읽을 방법이 없음.

**현재 CCO의 실행 흐름:**
```
claude --print - --output-format stream-json --verbose \
  --allowedTools "Bash(command:*) Write Edit Read Glob Grep" \
  [prompt via stdin]
```
→ 스킬 디렉토리 없음, 환경변수 없음

### 문제 2: 환경변수로 API 정보를 전달하지 않음
에이전트가 CCO API URL, 인증 키, task ID, run ID를 모름. API를 호출하려 해도 정보가 없음.

### 문제 3: 프롬프트에 API 호출 지시를 넣어도 무시됨
프롬프트는 사용자 메시지로 전달되므로 시스템 프롬프트보다 우선순위가 낮음. 에이전트가 주 작업 완료 후 부차적 지시(API 호출)를 건너뛸 수 있음.

### 문제 4: 자동 감지(git log)도 부정확
`git log --since=5min`은:
- 에이전트가 아닌 다른 프로세스의 커밋도 감지
- 타이밍에 따라 누락 가능
- 에이전트가 다른 브랜치에서 작업했으면 감지 불가

---

## 3. 올바른 해결 방법

### 방법 A: Paperclip 방식 (스킬 인젝션) — 추천

**수정 대상:** `packages/adapters/claude-code/src/execute.ts`

1. **임시 스킬 디렉토리 생성**: 실행 전에 skills/ 심볼릭 링크가 포함된 tmpdir 생성
2. **`--add-dir` 옵션 추가**: Claude CLI가 스킬을 자동 발견
3. **환경변수 주입**: `CCO_API_URL`, `CCO_TASK_ID`, `CCO_RUN_ID`, `CCO_TEAM_ID`
4. **스킬 파일이 API 호출 방법을 안내**: 에이전트가 자발적으로 호출

### 방법 B: Git diff 기반 자동 감지 (보완)

**수정 대상:** `server/src/services/scheduler.ts`

실행 전 git HEAD를 기록하고, 실행 후 새 커밋을 비교:
```
1. 실행 전: beforeHead = git rev-parse HEAD
2. 에이전트 실행
3. 실행 후: afterHead = git rev-parse HEAD
4. 새 커밋 = git log beforeHead..afterHead --oneline
5. 각 커밋을 work product로 등록
```

### 추천: A + B 조합
- 스킬 인젝션(A)으로 에이전트가 PR 등 고급 work product를 등록
- Git diff 감지(B)로 커밋을 자동 보완

---

## 4. 구현 계획

### Step 1: 어댑터에 스킬 인젝션 추가

**파일:** `packages/adapters/claude-code/src/execute.ts`

```typescript
// 실행 전: 임시 스킬 디렉토리 생성
import { mkdtempSync, symlinkSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function setupSkillsDir(skillsSourceDir: string): string {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'cco-skills-'));
  const claudeSkillsDir = path.join(tmpDir, '.claude', 'skills');
  mkdirSync(claudeSkillsDir, { recursive: true });
  
  // skills/cco/ → tmpDir/.claude/skills/cco/
  symlinkSync(
    path.join(skillsSourceDir, 'cco'),
    path.join(claudeSkillsDir, 'cco'),
  );
  
  return tmpDir;
}
```

**buildClaudeArgs 수정:**
```typescript
// 기존
args.push('--allowedTools', tools.join(' '));

// 추가
if (opts.skillsDir) {
  args.push('--add-dir', opts.skillsDir);
}
```

### Step 2: 환경변수 주입

**파일:** `server/src/services/execution.ts`

실행 컨텍스트에 환경변수 추가:
```typescript
const ctx: AdapterExecutionContext = {
  // ... 기존
  env: {
    CCO_API_URL: `http://localhost:${config.server?.port ?? 3100}`,
    CCO_TEAM_ID: opts.teamId,
    CCO_TASK_ID: opts.taskId ?? '',
    CCO_RUN_ID: runId,
  },
};
```

**어댑터에서 환경변수 적용:**
```typescript
const proc = spawn(rawCommand, args, {
  cwd,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ...safeEnv, ...ctx.env },  // env 추가
});
```

### Step 3: 스킬 파일 업데이트

**파일:** `skills/cco/SKILL.md`

환경변수 사용 방법 안내:
```markdown
## Work Products 등록

작업 완료 후 산출물을 등록하세요. 환경변수로 API 정보가 제공됩니다:

- `$CCO_API_URL` — API 서버 주소
- `$CCO_TEAM_ID` — 팀 ID
- `$CCO_TASK_ID` — 현재 작업 ID
- `$CCO_RUN_ID` — 현재 실행 ID

### 커밋 등록
```bash
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --format=%s)
curl -s -X POST "$CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/work-products" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"commit\",\"provider\":\"local\",\"title\":\"$COMMIT_HASH — $COMMIT_MSG\",\"externalId\":\"$COMMIT_HASH\",\"runId\":\"$CCO_RUN_ID\"}"
```
```

### Step 4: Git diff 기반 자동 감지 (보완)

**파일:** `server/src/services/scheduler.ts`

```typescript
// 실행 전
const beforeHead = getGitHead(cwd);

// 에이전트 실행...
const result = await executionService.startRun({ ... });

// 실행 후: beforeHead와 현재 HEAD 비교
if (result.status !== 'failed') {
  autoDetectCommits(database, teamId, task.id, result.runId, beforeHead);
}
```

```typescript
function getGitHead(cwd: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, timeout: 3000 })
      .toString().trim();
  } catch {
    return null;
  }
}

function autoDetectCommits(db, teamId, taskId, runId, beforeHead) {
  if (!beforeHead) return;
  try {
    const log = execFileSync('git', ['log', `${beforeHead}..HEAD`, '--format=%h|%s'], {
      cwd: process.cwd(), timeout: 5000,
    }).toString().trim();
    
    // 각 새 커밋을 work product로 등록 (중복 방지)
    for (const line of log.split('\n').filter(Boolean)) {
      const [hash, ...msg] = line.split('|');
      // ... insert into work_products
    }
  } catch { /* skip */ }
}
```

### Step 5: AdapterExecutionContext 인터페이스 확장

**파일:** `packages/adapter-utils/src/types.ts`

```typescript
export interface AdapterExecutionContext {
  // ... 기존
  readonly env?: Record<string, string>;    // 추가: 환경변수
  readonly skillsDir?: string;              // 추가: 스킬 디렉토리 경로
}
```

### Step 6: 테스트

- 유닛: 스킬 디렉토리 생성/정리 테스트
- 유닛: 환경변수 주입 확인
- 유닛: Git diff 감지 정확성
- 통합: 에이전트 실행 후 work products 자동 생성 확인

---

## 5. 수정 파일 목록

| # | 파일 | 변경 |
|---|------|------|
| 1 | `packages/adapter-utils/src/types.ts` | env, skillsDir 필드 추가 |
| 2 | `packages/adapters/claude-code/src/execute.ts` | --add-dir, env 주입, 스킬 디렉토리 설정 |
| 3 | `server/src/services/execution.ts` | env/skillsDir를 컨텍스트에 추가 |
| 4 | `server/src/services/scheduler.ts` | git HEAD 비교 기반 자동 감지 |
| 5 | `skills/cco/SKILL.md` | 환경변수 기반 API 호출 가이드 |
| 6 | `server/src/config.ts` | 스킬 디렉토리 경로 설정 |

---

## 6. 의존성 영향

| 기능 | 영향 |
|------|------|
| AdapterExecutionContext | env/skillsDir 필드 추가 (하위 호환) |
| Claude Code 어댑터 | --add-dir, 환경변수 전달 |
| Gemini/Codex/OpenCode 어댑터 | env만 전달 (skillsDir는 Claude 전용) |
| Execution Service | 컨텍스트 빌드 시 env/skillsDir 포함 |
| Scheduler | git HEAD 비교 + auto-detect |
| 기타 | 변경 없음 |

---

*End of Analysis*
