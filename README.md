# Life Automation

A personal automation toolkit that ingests school communications, messaging
history, job-search emails, and Todoist tasks — then uses Gemini to produce
daily cited briefings. The whole thing runs from the terminal in under 30
seconds.

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

### 4. Personalize

```bash
cp user.config.example.json user.config.json
```

Fill in your name, partner/co-parent's name, children's names, and communication style preferences. This file is gitignored.

### 5. Install

```bash
npm install
npx playwright install chromium
```

### 6. Run

```bash
npm run morning   # daily briefing
npm start         # full weekly parenting plan (first run opens a browser for Google auth)
npm test          # unit tests
```

## Architecture

See [GEMINI.md](GEMINI.md) for a detailed breakdown of each service, the
ingestion pipeline, and how citations are generated.

## Secrets and generated output

`credentials.json`, `token.json`, `.env`, `user.config.json`, and everything
under `data/` are gitignored. Never commit them.
