# Agent system (design – Phase 5)

Status: **not implemented yet.** Phase 1 provides the foundations the agents will use: audit log, autonomy levels, workspace-scoped memory, task/memory services with actor attribution.

## Principles

- Agents are **configurations**, not microservices: `{ name, purpose, system prompt, tools[], memory scope, max autonomy level }`.
- One **Executive Agent** receives complex requests, plans, delegates to specialists and assembles the result.
- Specialists are created only when a real workload needs them (no agents "for appearance").
- Agents never claim an action succeeded unless the tool returned success; every tool result is logged.

## Execution model

```
 owner request ─► Executive Agent (Claude, tool-calling loop)
                    ├─ tool: delegate(agent, task) ─► specialist loop with its own tool subset
                    ├─ tool: memory.search / memory.propose
                    ├─ tool: tasks.create / tasks.update
                    └─ tool: research.search (Phase 3), files.read, builder.* (Phase 6)
 every tool call ─► permission gate (agent max level, action risk, workspace scope)
                    ├─ allowed  → execute → audit(succeeded|failed)
                    └─ needs approval → audit(pending_approval) → approval card in UI → execute or reject
```

Jobs run in a worker process with a job table (`agent_runs`, `agent_steps`) so long tasks survive page reloads and are visible on every device (SSE updates).

## Initial roster (activated in this order)

1. Executive Agent – orchestration
2. Productivity Agent – plans, priorities, procrastination analysis
3. Business Agent (scoped per venture: NGCX, VenturesX)
4. Research Agent – web research with sources and dates
5. Finance Agent – personal finance analysis (read-only on finance data)
6. Software Development + QA Agents – Phase 6 builder
7. Content, University, Fitness, Integration, Security agents – when their modules exist

## Permission matrix (default)

| Action class | Max level without approval |
|---|---|
| read memories/tasks in own scope | L1 |
| propose memory, draft text/plan/report | L2 |
| create/update tasks, store approved memories | L3 (approval) → L4 only if the owner pre-authorises |
| send email, publish, purchase, financial transaction, share data, delete, change permissions | always explicit approval |
