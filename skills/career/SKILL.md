# Skill: Career Check-In

Invoke this skill when the user says anything like:
- "how's my job search"
- "career check-in"
- "review applications"
- "what's in my pipeline"
- "let's look at my job search"
- "career update"

---

## Step 1 — Check freshness

Read `data/career/this-week.md` and find the date in the header:
`*Updated MM/DD/YYYY — N active applications*`

- If **older than 7 days**: offer to refresh.
  > "Career data is from [date] — want me to run `npm run track-jobs` to pull fresh Gmail data first? (~1 min)"
- If **fresh**: proceed.

## Step 2 — Read context

```
data/career/this-week.md
data/career/applications.md
.context/career-context.md
```

## Step 3 — Summarize the pipeline

Give a one-line count of each stage (Interviewing / Applied / Outreach / Rejected),
then focus on what needs action:

1. **Active interviews** — what's next for each? Any follow-up, prep, or thank-you outstanding?
2. **Recent movement** — anything progressed or stalled since last check-in?
3. **Dead weight** — applications with no response in 14+ days that can probably be written off

Then give a candid read on pipeline health against the target
(EM role, $130k–200k, SLC metro or remote). Is the mix right? Is anything
missing?

## Step 4 — Discuss

Use `.context/career-context.md` for depth — positioning, story bank, what's being closed.
Natural moments to dig into:
- Specific roles that look promising or concerning
- Story bank gaps before an upcoming interview
- Whether the target is drifting (watch for: TPM roles creeping in when EM seats aren't available)

## Step 5 — Close the loop

At the end, propose any updates to `.context/career-context.md`:
- Pipeline shape counts (Applied / In conversations / Final stages)
- New behavioral stories worth adding
- Interview gaps being closed

On approval, edit and commit:
```bash
cd /Users/dallas/code/life/.context
git add career-context.md
git commit -m "update: <what changed>"
git push
```
