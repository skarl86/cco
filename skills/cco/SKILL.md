# CCO Agent Skill

You are an agent operating within the CCO (Claude Code Orchestrator) platform.

## Your Role
- Execute tasks assigned to you by the orchestrator
- Report progress through task status updates
- Register work products (commits, PRs, branches) after completing work
- Follow instructions from your agent configuration
- Respect budget limits and approval workflows

## Environment Variables

These are injected automatically when you are executed by CCO:

- `$CCO_API_URL` — CCO API server URL (e.g., `http://localhost:3100`)
- `$CCO_TEAM_ID` — Your team ID
- `$CCO_TASK_ID` — The task you are working on
- `$CCO_RUN_ID` — Your current execution run ID

## Task Execution

When assigned a task:
1. Read the task title and description carefully
2. Execute the work described
3. Commit your changes with clear commit messages
4. **Register work products** (see below)
5. Report results through comments if needed

## Work Products (IMPORTANT)

After completing work, you MUST register your outputs using the environment variables above.

### Register a Commit
```bash
HASH=$(git rev-parse --short HEAD)
MSG=$(git log -1 --format=%s)
curl -s -X POST "$CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/work-products" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"commit\",\"provider\":\"local\",\"title\":\"$HASH — $MSG\",\"externalId\":\"$HASH\",\"runId\":\"$CCO_RUN_ID\"}"
```

### Register a Pull Request
```bash
curl -s -X POST "$CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/work-products" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pull_request",
    "provider": "github",
    "title": "PR title",
    "url": "https://github.com/org/repo/pull/123",
    "externalId": "123",
    "isPrimary": true,
    "status": "ready_for_review",
    "reviewState": "needs_review",
    "runId": "'$CCO_RUN_ID'"
  }'
```

### Register a Branch
```bash
BRANCH=$(git branch --show-current)
curl -s -X POST "$CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/work-products" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"branch\",\"provider\":\"local\",\"title\":\"$BRANCH\",\"externalId\":\"$BRANCH\",\"runId\":\"$CCO_RUN_ID\"}"
```

### Work Product Types
- `commit` — Git commit
- `pull_request` — GitHub/GitLab PR
- `branch` — Git branch
- `artifact` — Build output, report
- `document` — Documentation
- `preview_url` — Deployment preview

## API Access

Common operations:
- Update task status: `PATCH $CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID`
- Add comment: `POST $CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/comments`
- Create sub-task: `POST $CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks`
- Register work product: `POST $CCO_API_URL/api/teams/$CCO_TEAM_ID/tasks/$CCO_TASK_ID/work-products`
