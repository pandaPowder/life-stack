# Claude Code Project Context: Life Automation

This is a personal life-automation repo. The retrieval/conversation layer
is live — `npm run morning` produces a daily briefing from real data. Current
focus is scheduling, task write-back, and reliability. See `GEMINI.md` for the
original architecture notes (they remain authoritative for how the existing
pipeline is wired together).

## How to work in this repo

**Read these first, in order:**
1. `GEMINI.md` — architecture of the existing parenting-plan pipeline.
2. `package.json` and `src/workflows/` to see what's actually wired up.

**For personalized advice, also read `.agents/`:**

- `.agents/life-context.md` — owner's foundational context (working
  style, priorities, communication preferences). Read this before giving
  advice that depends on who the owner is, what they're optimizing for, or
  how they want to be talked to.
- `.agents/people/[name].md` — per-person profiles (kids, etc.). Read the
  relevant one when a specific person comes up by name.
- `.agents/career-context.md` — job-search state. Read when the topic is
  applications, interviews, or skill gaps.

These files are the shared memory layer (modeled on `em-context` from
manager.dev's manager-skills). The auto-update rules are inside
`.agents/life-context.md` itself. The quality gate for any addition is
"will this still be useful and fair three months from now?" — if no,
don't write it.

**Compatibility symlinks:** `.agents/em-context.md` is a symlink to
`life-context.md`, and `.agents/reports/` is a symlink to `people/`.
These exist so any installed skill expecting the manager.dev convention
(e.g., `manager-dot-dev/manager-skills/skills/managing-up`) finds the owner's
context without further setup. Keep both forms working when adding new
files.

The `.agents/` directory is git-ignored on purpose.

**Respect the existing pipeline.** `generate-parenting-plan.ts` works and runs
weekly. Do not refactor it as part of unrelated work. If a change in the new
retrieval layer requires touching it, call that out explicitly and propose the
smallest possible diff.

**ESM gotcha.** `"type": "module"` in `package.json`. Every local import must
end in `.js` (even though source files are `.ts`). Forgetting this is the most
common way new code breaks.

**Tests.** Vitest. New code should have at least a smoke test that runs under
`npm test`. The parser/formatter modules in `domains/parenting/` are good
patterns to copy.

**Secrets.** `credentials.json`, `token.json`, `.env`, and `.gemini/` are
git-ignored. Generated outputs (`weekly-parenting-plan.md`) are also
git-ignored — do not commit them. The new retrieval-layer outputs should
follow the same convention.

## Working style

- **Prefer outcomes over effort.** When a task can be split into "make the
  pipeline produce a smaller, more queryable output" vs. "add a clever
  abstraction," pick the first. Visible movement matters more than elegance.
- **One next thing at a time.** Surface the single next action, finish it,
  then pick the next. Avoid emitting long multi-step roadmaps mid-task.
- **Cite sources in generated content.** The existing parenting plan cites
  back to Gmail message IDs and Beeper chat IDs. New retrieval features should
  preserve this: never produce a recommendation without showing where it came
  from.

## What's already here

- **`generate-parenting-plan.ts`** — Gmail + Sway/Smore + Beeper + Drive
  context → `gemini-2.5-flash` → cited markdown plan. Runs weekly.
- **`track-job-applications.ts`** — Gmail search → AI parsing → cited
  `data/career/this-week.md` and `data/career/applications.md`.
- **`derive-slices.ts`** — splits the weekly plan into per-kid and career
  slices under `data/`.
- **`sync-tasks.ts`** — fetches today/overdue Todoist tasks via
  `@doist/todoist-api-typescript` → `data/tasks/today.md`.
- **`morning.ts`** — orchestrates derive-slices + sync-tasks, then asks two
  AI questions (kids priority, career priority) with full task context.
- **`ask.ts`** — ad-hoc Q&A against the same context (`npm run ask -- "..."`).
- **`prep-interview.ts`** — per-interviewer briefing with LinkedIn scraping
  and Google Search grounding.
- **Stack:** TypeScript, Node ESM, Playwright, `googleapis`,
  `@beeper/desktop-api`, `@google/generative-ai`,
  `@doist/todoist-api-typescript`, Vitest, Zod.

## Models and providers

The existing pipeline uses `gemini-2.5-flash` via `@google/generative-ai`.
Claude Code will, by default, do its own reasoning in conversation with you;
the production pipeline keeps using Gemini unless we explicitly decide to
migrate. Don't silently swap providers.
