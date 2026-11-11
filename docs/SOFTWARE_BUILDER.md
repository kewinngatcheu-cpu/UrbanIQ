# App & Software Studio (design – Phase 6)

Status: **not implemented.** This document defines how JARVIS will turn "Build me an app/website/game" into working software without endangering the host system.

## Pipeline

1. **Intake** – Product Architect agent clarifies users, core jobs, must-haves; asks only essential questions.
2. **Spec** – structured PRD (`spec.json` + `SPEC.md`), acceptance criteria.
3. **Design** – UX/UI agent: flows + component list; style tokens (default: NGCX design system).
4. **Stack choice** – rule-based by project type: Next.js/React (web apps, dashboards), static Astro/HTML (sites), Phaser (2D games), Three.js (3D prototypes), Godot (only if export tooling is available in the sandbox).
5. **Scaffold & implement** – Frontend/Backend/Database agents write code in milestones.
6. **Build & test loop** – install deps, build, run tests, Playwright smoke + screenshot; QA agent reads failures and iterates (bounded attempts).
7. **Security review** – dependency audit, secret scan, basic SAST.
8. **Preview** – sandbox exposes a temporary preview URL; screenshots stored with the project.
9. **Docs** – README with run/deploy instructions.
10. **Deployment** – prepared, executed **only after explicit approval**.

A project is reported "complete" only when step 6 passed in the sandbox.

## Isolation

- One sandbox per project (container with gVisor or a managed sandbox service); no access to JARVIS DB, secrets or host files.
- Limits: CPU, memory, disk quota, wall-clock per command; egress allowlist (package registries only).
- Workspace persisted as a git repository per project (`workspaces/<project>`), optional push to a GitHub repo the owner selected.

## Data model (planned)

`projects` (name, type, workspace_id, status, repo, preview_url), `project_runs` (step, command, exit code, logs), `project_artifacts` (spec, screenshots, docs).
