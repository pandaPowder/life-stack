# Active Plan: Career Tracker QA + Todoist Integration

**Status:** task 1 done, task 2 next
**Last updated:** 2026-05-13

## Background

The retrieval layer is live and `npm run morning` is producing useful,
cited answers. Two gaps surfaced immediately on first real use:

1. **Career tracker misses direct recruiter outreach.** WGU's Michael
   Maxfield emailed about a TPM role — subject "Western Governors
   University - Call Availability", from `michael.maxfield@wgu.edu`.
   The Gmail query relied on known ATS domains (`greenhouse.io`,
   `lever.co`, etc.) and a narrow set of subject keywords. Neither
   matched WGU. Dallas has already replied and shared his cell; this is
   an active pipeline entry that the tracker didn't know about.

2. **No Todoist integration.** Dallas tracks all action items in
   Todoist. The morning briefing currently has no visibility into what's
   already captured there, so it may surface things that are already
   tasks, or miss items that are overdue. Connecting Todoist makes the
   briefing aware of the full picture.

## Guiding principle

Same as last plan: additive, never destructive. Existing workflows keep
running unchanged. New capabilities layer on top.

## Tasks (do in order, ship after each)

### ✅ 1. Fix career tracker Gmail query

Broadened the subject clause in `GMAIL_QUERY` in
`src/workflows/track-job-applications.ts`:

- `subject:availability` — catches "Call Availability", etc.
- `subject:schedule` — catches "Schedule a call / interview"
- `subject:"your profile"` — LinkedIn InMail forwards
- `subject:"quick call"` / `subject:"quick chat"` — recruiter cold outreach

Also parameterized the lookback window: `fetchRecentSchoolEmails` now
accepts `lookbackDays` (default 45, preserving parenting-plan behavior).
Career workflow defaults to 30 days and accepts a `--days` flag.

**Verified:** `npm run track-jobs` shows WGU — Technical Program Manager
with status "interviewing". 53/53 tests pass.

**Loose end (non-blocking):** Gmail API caps results at 100 messages per
call. With the broadened query, the 30-day window regularly hits this
limit. If active applications start getting dropped, add pagination to
`fetchRecentSchoolEmails` — separate task, not urgent now.

### 2. Add Todoist integration

Todoist has a REST API (`https://api.todoist.com/rest/v2/`). Auth is a
bearer token stored in `.env` as `TODOIST_API_TOKEN`.

**New service:** `src/services/todoist.service.ts`
- `getTasks(filter?: string): Promise<TodoistTask[]>` — fetches tasks
  matching a filter (default: `today | overdue`)
- `createTask(content: string, dueString?: string): Promise<void>` —
  creates a task (used later, not in first cut)

**New type:** `src/domains/tasks/types.ts`
- `TodoistTask` — `{ id, content, due?, priority, url }`

**New output:** `data/tasks/today.md`
- Written by a new `src/workflows/sync-tasks.ts` workflow
- Format: grouped by priority, each item links to the task in Todoist
  (`https://todoist.com/app/task/{id}`)
- Included automatically in `buildContext` (add to the candidates list
  in `src/workflows/ask.ts`)

**Wire into morning:** `morning.ts` runs `sync-tasks` after
`derive-slices`, before the two AI questions. This gives the AI full
task context so it can say "this is already in your Todoist — here's
the link" rather than re-surfacing captured items.

**Test:** Vitest smoke test for `TodoistService` with a mocked `fetch`,
and a formatter test for the markdown output.

**Verification:** Run `npm run morning` and confirm task context appears
in the briefing and the career answer references WGU.

## Explicitly out of scope

- Writing tasks back to Todoist from the morning briefing (useful later,
  not now — get the read path right first)
- Scheduling `morning.ts` as a cron job (can do after a week of manual
  use to confirm the output is reliable)
- Paginating the Gmail results cap (non-blocking loose end above)
- Modifying `generate-parenting-plan.ts` or `PlanFormatter`

## Definition of done

- `npm run morning` pulls in Todoist tasks and the career answer is
  aware of what's already captured
- All existing tests still pass
- No new workflow breaks the existing parenting-plan pipeline
