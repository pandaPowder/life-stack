# Skill: Morning Briefing

Invoke this skill when the user says anything like:
- "good morning"
- "what's my day look like"
- "morning briefing"
- "what do I have today"
- "what's on my plate"

---

## Step 1 — Check freshness

Read `data/tasks/today.md` and find the date in the header line:
`# Tasks — Today & Overdue (Weekday, Month DD, YYYY)`

- If **not today's date**: offer to refresh before continuing.
  > "Tasks are from [date] — want me to run `npm run morning` to pull fresh data first? (~30 sec)"
  > `npm run morning` refreshes Todoist tasks, per-kid slices, and prints Gemini summaries to stdout.
- If **today**: proceed.

Also note if `data/this-week.md` is older than 7 days — mention it but don't block on it.

## Step 2 — Read context

```
data/tasks/today.md
data/kids/graham/this-week.md
data/kids/nora/this-week.md
data/kids/ansel/this-week.md
data/career/this-week.md
```

## Step 3 — Synthesize

Lead with **top 3 priorities for today** across all domains — be specific, not generic.
Rank by: time-sensitive > overdue > high-leverage.

Then surface:
- **Kids:** anything requiring action today (transport, school comms, deadlines)
- **Career:** any active interview or application that needs a move today
- **Overdue tasks:** flag anything overdue >3 days — name it, don't bury it

Keep it tight. This is a briefing, not a recap. One sentence per item unless context is needed.

## Step 4 — Discuss

Work through whatever the user wants to dig into. Cross-reference
`.context/people/` for kid items and `.context/career-context.md` for career items
when the conversation needs depth.

## Step 5 — Close the loop

At the end, flag any overdue tasks that look like they should be deleted, delegated,
or rescheduled — Todoist accumulates stale items fast. Propose specific actions.
