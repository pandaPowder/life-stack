# Active Plan: Add a Retrieval / Daily-Driver Layer

**Status:** ready to start
**Last updated:** 2026-05-12

## Background

The repo today is a **generator**: `generate-parenting-plan.ts` runs once
a week and emits one large markdown file (`weekly-parenting-plan.md`)
full of homework items, activities, and to-dos with citations back to
Gmail and Beeper. That works for capture, but it produces the wrong
shape for daily decision-making — a flat 100-item list is the worst
possible interface for an ADHD brain trying to figure out the *one* most
important thing to do today.

The missing piece is a **retrieval/conversation layer** on top of the
markdown the pipeline already produces. The frame is from manager.dev's
"The engineering management memory crisis" (2026-05-12) and James
Stanier's "My CTO daily driver":

> Brain = RAM (great for processing, runs out under load).
> Notes = HDD (storage, but slow to use).
> LLM over a structured markdown repo = SSD + smart filesystem.
> **You can't outsource the thinking. You can outsource the storage and retrieval.**

The point of the new layer is *not* to make decisions for Dallas. It's
to surface the right one or two questions to think about each morning.

## Goal

Each morning, in ~30 seconds, get an answer to:

1. What is the single most important thing for me to do for the **kids**
   today (and why, with a citation)?
2. What is the single most important thing for me to do for the **job
   search** today (and why, with a citation)?

That's it. Anything more elaborate is scope creep at this stage.

## Guiding principle: additive, never destructive

The existing parenting-plan pipeline works. It runs weekly. It produces
`weekly-parenting-plan.md` and that file has been keeping things from
falling through cracks. **Do not modify `generate-parenting-plan.ts` or
`PlanFormatter` as part of this plan.** Every new capability is
additive: new workflows, new scripts, new output files. If anything in
the new layer breaks, the existing pipeline keeps running unchanged and
nothing is lost.

## The one next step

Add a postprocess that derives per-child and daily slices from
`weekly-parenting-plan.md`, leaving the original untouched.

**Concrete tasks (do in order, ship after each one):**

1. **Add a slicing postprocess.**
   The existing pipeline keeps generating `weekly-parenting-plan.md` at
   the repo root. This task adds a new workflow that reads that file and
   produces a derived view tree:

   ```
   data/
     this-week.md            # all-up view — copy of weekly-parenting-plan.md
     today.md                # ≤5 items, regenerated each morning
     kids/
       graham/this-week.md
       nora/this-week.md
       ansel/this-week.md
     career/
       this-week.md
       applications.md       # job tracker output (later)
   ```

   - New file: `src/workflows/derive-slices.ts`. Reads
     `weekly-parenting-plan.md`, parses by per-child sections (and
     career/other sections), writes to `data/`. Idempotent — safe to run
     repeatedly.
   - Keep `weekly-parenting-plan.md` as the source of truth. The
     `data/` tree is derived; if it gets stale or wrong, delete `data/`
     and re-run.
   - Preserve all citations (Gmail message IDs, Beeper chat IDs) when
     splitting.
   - If Ansel has no items (Canyon Creek Elementary may not be reaching
     the searched Gmail account — see loose end), his file is created
     empty with a note rather than skipped.
   - Add `data/` to `.gitignore` (already done in this session — verify).
   - One Vitest smoke test: feed a fixture markdown in, assert the
     expected per-child files come out with citations preserved.

   **Verification before considering this task done:** run the existing
   `npm start` (parenting plan generator) and confirm
   `weekly-parenting-plan.md` is byte-identical to last week's output
   (modulo new content). The new workflow must not affect the original
   in any way.

2. **Add `src/workflows/ask.ts`.**
   - CLI entry: `npm run ask -- "what's my top thing for the kids today?"`
   - Reads `data/today.md`, `data/kids/**/this-week.md`,
     `data/career/this-week.md`, **and `weekly-parenting-plan.md` as a
     fallback** (so it works even if `derive-slices` hasn't run).
   - Sends the question + context to `gemini-2.5-flash` (same model as
     the generator — don't introduce a new provider yet).
   - Returns an answer with citations.
   - Write one Vitest smoke test that mocks the model and asserts the
     prompt was assembled correctly.

3. **Wire up `track-job-applications.ts`** (currently a scaffold).
   - Use `AIService` (extend it) to extract structured `JobApplication`
     objects from recruiter emails using the Zod schema in
     `domains/career/types.ts`.
   - Write output to `data/career/applications.md`.
   - This is the natural Node.js portfolio exercise — real OAuth, real
     API, real schema validation, real tests.

4. **Add a daily driver script.**
   - `npm run morning` → runs `derive-slices`, then runs `ask` twice
     with the two questions above, prints both answers to the terminal.
   - That becomes the morning habit. Run it before doing anything else.

## Explicitly out of scope right now

- Modifying `generate-parenting-plan.ts` or `PlanFormatter`.
- Deleting or renaming `weekly-parenting-plan.md`. It stays.
- Installing Cabinet. (Too immature, wrong shape for personal use.)
- Migrating to Tolaria. (Maybe useful later as a GUI viewer over
  `data/`; it's just markdown, so the migration is free when you want
  it.)
- Building a web UI.
- Replacing Gemini with Claude in the production pipeline.
- Reorganizing `domains/` or `services/`.
- Reading 40 management books.

## Loose ends that block nothing right now

- **Canyon Creek Elementary** (Ansel's school) may not be emailing the
  Gmail account the pipeline searches. If `data/kids/ansel/this-week.md`
  is consistently empty, address by adding a sync source for him —
  separate task, not part of this plan.
- **Source-of-truth question** for kids context (Drive `AI Context` vs.
  `.agents/people/`). Decide after 2 weeks of using `npm run morning` —
  not now.

## Definition of done for this plan

When the four tasks above are shipped and `npm run morning` produces a
useful, cited two-line answer each morning, this plan is complete. At
that point, open a fresh `PLAN.md` and decide the next thing.

The existing weekly pipeline must still produce
`weekly-parenting-plan.md` exactly as before. If it doesn't, this plan
is **not** done — back out the change.
