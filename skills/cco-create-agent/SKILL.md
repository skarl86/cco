# CCO Agent Creation Skill

Guide for creating and configuring new agents in CCO.

## Agent Roles
- **architect** — System design and architecture decisions
- **developer** — Code implementation and feature development
- **reviewer** — Code review and quality assurance
- **tester** — Test creation and execution
- **general** — Multi-purpose agent

## Configuration
Agents require:
- Name: Human-readable identifier
- Role: One of the roles above
- Adapter Type: The AI model adapter (claude_code, gemini_local, codex_local, opencode_local)
- Budget: Monthly spending limit in cents

## Best Practices
- Assign specific roles for focused work
- Set reasonable budget limits
- Configure appropriate permissions
- Use the reports_to field for org hierarchy
