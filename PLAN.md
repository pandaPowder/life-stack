# Active Plan: Scheduling + Task Write-Back

**Status:** ready to start
**Last updated:** 2026-05-13

## What's done

The retrieval layer is fully live:

- `npm run morning` runs `derive-slices` → `sync-tasks` → two AI questions (kids + career)
- Career tracker catches direct recruiter outreach (not just ATS domains)
- Todoist tasks are fetched via the official SDK and injected into AI context
- AI prompt is task-aware: calls out what's already captured vs. what needs to be added
- 63 tests passing

## Guiding principle

Same as always: additive, never destructive. Existing workflows keep running unchanged.

## Tasks (do in order, ship after each)

### 1. Schedule `morning` and `track-jobs` as cron jobs

Both workflows are stable enough to run unattended. The right cadence:

- **`morning`**: daily at 7:00 AM — the whole point is to have it waiting when Dallas wakes up
- **`track-jobs`**: every weekday at 6:50 AM — runs before `morning` so career context is fresh

**Implementation:** use the existing `mcp__scheduled-tasks` infrastructure that's already in this repo's
Claude Code setup, or write a launchd plist (macOS). Prefer launchd so it survives Claude Code not being
open; fall back to a cron entry if launchd is too brittle.

Output should land in a log file (`logs/morning.log`, `logs/track-jobs.log`) so failures are visible
without needing to watch a terminal.

**Verification:** let it run once unattended, confirm log exists and output is correct.

### 2. Task write-back from morning briefing

`createTask()` is already implemented in `TodoistService` but nothing calls it yet.

The morning briefing currently says "this isn't in Todoist — it should be added." The next step is to
actually add it, either:

- **Option A (interactive):** after the two AI answers, print any suggested tasks and prompt
  `Add to Todoist? [y/N]` for each. Simple, explicit, no surprises.
- **Option B (automatic):** if the AI identifies a clear next action not already in Todoist, create it
  silently and print a confirmation line.

Prefer Option A first — get a feel for what the AI actually suggests before automating it.

**New flow in `morning.ts`:**
1. Parse the career and kids answers for suggested actions (simple heuristic: lines starting with
   "You should" / "Consider" / "Follow up" — or ask the AI to return structured action items)
2. For each: check if a similar task already exists in the fetched task list (fuzzy string match on content)
3. If not found, prompt and optionally create

**Verification:** run `npm run morning`, confirm at least one suggested task gets offered, accept it,
verify it appears in Todoist.

### 3. Paginate Gmail results in career tracker

The Gmail API caps at 100 messages per call. With the broadened query the 30-day window regularly
hits this limit; active applications could be silently dropped.

`fetchRecentSchoolEmails` in `gmail.service.ts` needs a pagination loop using `nextPageToken`.
Cap total results at 500 to avoid runaway API usage.

**Verification:** run `npm run track-jobs --days 60` and confirm total fetched exceeds 100 if the
inbox has that many matching emails.

## Explicitly out of scope

- Modifying `generate-parenting-plan.ts` or `PlanFormatter`
- Multi-question morning sessions (current two-question format is working well)
- Todoist project/label filtering (the `today | overdue` filter is the right scope for now)

## Definition of done (full plan)

- `morning` runs at 7 AM without any terminal open
- Tasks suggested by the AI briefing can be added to Todoist in one keypress
- Career tracker never silently drops emails due to the 100-result cap
