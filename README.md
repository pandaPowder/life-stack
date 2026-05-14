# Life Automation

A personal automation toolkit that ingests school communications, messaging
history, job-search emails, and Todoist tasks — then uses Gemini to produce
daily cited briefings. The whole thing runs from the terminal in under 30
seconds.

## Two ways to use it

**CLI mode** — run commands directly and read the output yourself. `npm run morning`
prints your top priorities for the day with citations back to the source emails
and messages. Everything else in the table below follows the same pattern:
a command, a cited markdown output, done.

**Agent mode** — open this repo in Claude Code (or any AI agent that reads
`CLAUDE.md`). The agent reads your personal context files at session start,
so it already knows your kids, your job-search state, and your working style
before you say a word. You can ask follow-up questions about your briefing,
tell it something new ("Graham just started competitive soccer"), and it will
propose updating the relevant context file, commit it, and push to your private
context repo. `npm run ask` is the bridge: the same cited context the pipeline
uses, queryable in natural language.

The two modes compose — run `npm run morning` to get the daily briefing, then
open an agent session to act on it.

## What it does

| Command | What it produces |
|---|---|
| `npm start` | Weekly parenting plan — cites Gmail message IDs and Beeper chat IDs |
| `npm run morning` | Daily briefing: top kids priority + top career priority, with citations |
| `npm run ask -- "..."` | Ad-hoc Q&A against your current context |
| `npm run derive-slices` | Splits the weekly plan into per-child and career slices under `data/` |
| `npm run sync-tasks` | Pulls today's Todoist tasks into `data/tasks/today.md` |
| `npm run track-jobs` | Parses recruiter emails into a structured job tracker |
| `npm run prep-interview` | Per-interviewer briefing with LinkedIn + Google Search grounding |

## Sample output

```
$ npm run morning

🌅 MORNING BRIEFING — Wednesday, May 13, 2026

──────────────────────────────────────────────────
  Refreshing slices…
──────────────────────────────────────────────────
Deriving slices from data/parenting/weekly-plan.md…
Done.

──────────────────────────────────────────────────
  Syncing tasks…
──────────────────────────────────────────────────
[sync-tasks] Fetched 15 task(s).

──────────────────────────────────────────────────
  KIDS — top priority today
──────────────────────────────────────────────────

Confirm your daughter has completed the audition form for High School
Musical Theatre — her vocal audition is at 2 PM today. [[src](beeper://chat/abc123)]
This recommendation is not in Todoist.

──────────────────────────────────────────────────
  CAREER — top priority today
──────────────────────────────────────────────────

Attend your interview at Acme Corp today — it's scheduled for this
afternoon and is your most time-sensitive opportunity this week.
[[src](https://mail.google.com/mail/u/0/#inbox/abc456)]
This is not explicitly in your Todoist.

──────────────────────────────────────────────────
```

## Stack

- **TypeScript / Node ESM**
- **Google Gemini (`gemini-2.5-flash`)** — summarization, extraction, Q&A
- **Google APIs (Gmail, Drive, Docs)** — email and living context ingestion
- **Playwright** — renders JavaScript-heavy Sway/Smore newsletters
- **Todoist API (`@doist/todoist-api-typescript`)** — task sync
- **Beeper Desktop API** — family messaging history (spouse, co-parent, or family groups)
- **Vitest** — unit tests with fixture-based smoke tests
- **Zod** — schema validation for AI-extracted structured data

## Getting started

### 1. Google Cloud setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Gmail API** and **Drive API**.
3. Configure the OAuth Consent Screen (External, add your email as a test user).
4. Create an OAuth client ID (Desktop app), download the JSON, rename it `credentials.json` in the project root.

### 2. Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/) and generate a key.
2. Create `.env` and add: `GEMINI_API_KEY=your_key_here`

### 3. Todoist API token (optional, for task sync)

Add to `.env`: `TODOIST_API_TOKEN=your_token_here`

### 4. Install

```bash
npm install
npx playwright install chromium
```

### 5. Personalize

```bash
cp user.config.example.json user.config.json
```

Fill in your name, partner/co-parent's name, children's names, and communication
style preferences. This file is gitignored.

### 6. Personal context repo (optional, for agent mode)

Create a private git repo and clone it to `.context/` in this directory:

```bash
gh repo create your-username/life-context --private
git clone git@github.com:your-username/life-context.git .context
```

Then add markdown files for your context:

```
.context/
  life-context.md       # your working style, priorities, communication preferences
  career-context.md     # current job-search state
  people/
    [name].md           # one file per person (kids, partner, etc.)
```

This directory is gitignored from the public repo. When you open this project
in Claude Code, the agent reads these files at session start and uses them to
personalize every answer. When you share new durable information during a
session, the agent will propose updating the relevant file and push the change
to your private repo.

### 7. Run

```bash
npm run morning   # daily briefing
npm start         # full weekly parenting plan (first run opens a browser for Google auth)
npm test          # unit tests
```

## Architecture

See [GEMINI.md](GEMINI.md) for a detailed breakdown of each service, the
ingestion pipeline, and how citations are generated.

## Secrets and generated output

`credentials.json`, `token.json`, `.env`, `user.config.json`, `.context/`, and
everything under `data/` are gitignored. Never commit them.
