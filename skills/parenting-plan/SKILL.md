# Skill: Parenting Plan Review

Invoke this skill when the user says anything like:
- "let's review the parenting plan"
- "let's look at this week for the kids"
- "what's going on with the kids"
- "parenting plan"

---

## Step 1 — Check freshness

Read `data/this-week.md` and find the generation date (first line: `*Generated on MM/DD/YYYY*`).

- If **older than 7 days**: say so and offer to regenerate before reviewing.
  > "The plan is from [date] — want me to regenerate before we review?"
  > Regeneration: `npm run start` (Gmail + Beeper + Playwright + Gemini, ~2–3 min)
  > Then: `npm run derive-slices` to refresh per-kid slices.
- If **fresh**: proceed.

## Step 2 — Read context

Load these files before saying anything:

```
data/this-week.md
data/kids/graham/this-week.md
data/kids/nora/this-week.md
data/kids/ansel/this-week.md
.context/people/graham.md
.context/people/nora.md
.context/people/ansel.md
```

## Step 3 — Orient and summarize

Lead with **what needs action today or this week**, per kid. Interpret the plan against each kid's profile — don't just recite it. Structure:

1. **Urgent / time-sensitive** — anything due within 3 days
2. **This week's logistics** — activities, appointments, transport needed
3. **Open loops** — pending decisions, unresolved items

Flag anything that looks like a pattern or surprise relative to what's in `.context/people/`.

## Step 4 — Discuss

Work through whatever the user wants to dig into. Use the per-kid context to give informed takes (not generic advice).

## Step 5 — Close the loop (context updates)

Before ending the session, scan for anything durable:
- New extracurricular commitment or change
- School transition or schedule update
- A standing agreement that emerged
- A preference or pattern confirmed across multiple weeks

Propose specific edits to `.context/people/{name}.md`. Quality gate: **"will this still be useful and fair three months from now?"** If not, skip it.

On approval, edit the file and commit:

```bash
cd /Users/dallas/code/life/.context
git add people/
git commit -m "update: <what changed>"
git push
```
