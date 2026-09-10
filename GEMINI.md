# Gemini Project Context: Life Automation

This project is a TypeScript/Node.js automation tool designed to help manage school-related communications and planning.

## 🎯 Objective
Automatically ingest school emails, scrape text from linked Microsoft Sway newsletters, and use Gemini to generate a structured weekly parenting plan (homework, purchases, activities).

## 🏗️ Architecture & Decisions

### 1. Unified Authentication (`src/services/auth.service.ts`)
*   **Tool:** `googleapis` + `@google-cloud/local-auth`.
*   **Rationale:** Centralized OAuth2 flow for Gmail, Drive, and Docs access.

### 2. Context Ingestion (`src/services/drive.service.ts`)
*   **Tool:** `google.drive` + `google.docs`.
*   **Rationale:** Fetches "Living Context" for the kids (interests, grades, schedules) from a Google Drive folder called **"AI Context"**. This allows the AI to prioritize school news accurately for each child.

### 3. Messaging, Scraping & Parsing (`src/services/`, `src/utils/parser.ts`)
*   **Gmail:** Queries for school communications and newsletter links (including Smore and Sway).
*   **Beeper:** Fetches the last 7 days of messages from specified co-parenting WhatsApp chats via the Beeper Desktop REST API. Distinguishes between user and co-parent messages for accurate task assignment.
*   **EmailParser:** Centralized utility for extracting newsletter links and cleaning HTML body content for LLM processing.
*   **Link Resolution**: Automatically resolves SendGrid tracking links to find the canonical newsletter URL.
*   **Playwright:** Renders JavaScript-heavy Sways and Smores to extract full text content.

### 4. AI Synthesis & Formatting (`src/services/ai.service.ts`, `src/utils/formatter.ts`)
*   **Model:** `gemini-2.5-flash`.
*   **Contextual Prompting**: Injects Drive context, WhatsApp logs, and the structured schedule context directly into the synthesis prompt.
*   **Citations**: Generates per-item citations mapping back to Gmail message IDs and Beeper chat IDs.
*   **PlanFormatter**: Formats the AI-generated JSON into a cited, child-specific Markdown parenting plan.

### 4a. Structured Schedules (`src/config/schedules.ts`, `src/domains/parenting/schedule.ts`)
*   **Tool:** Locally-edited `schedules.config.json` (gitignored, same pattern as `user.config.json`).
*   **Rationale:** The Drive "AI Context" docs are freeform and can silently go stale after a grade promotion (e.g. a class getting attributed to the wrong sibling). `formatScheduleContext()` renders each child's current A-Day/B-Day classes and teachers as an authoritative block that `ContextGatherer` adds to `GatheredContext.scheduleContext`, which `AIService.generateParentingPlan` places above the general Drive context and instructs the model to prefer for child↔class attribution. No auto-import from school portals — update the JSON by hand each school year.

### 5. Task Sync (`src/workflows/sync-tasks.ts`)
*   **Tool:** `@doist/todoist-api-typescript`.
*   **Rationale:** Fetches today's and overdue tasks from Todoist, writes to `data/tasks/today.md` so the morning briefing includes task context alongside school and career data.

### 6. Morning Briefing (`src/workflows/morning.ts`)
*   Orchestrates `derive-slices` + `sync-tasks`, then fires two Gemini questions (kids priority, career priority) with full context and prints cited answers.

## 🔄 Workflow
1.  **Authorize:** Unified Google OAuth handshake.
2.  **Context**: Fetch "AI Context" from the designated Drive folder.
3.  **Fetch School Data**: Search Gmail for school-related messages.
4.  **Fetch Messaging Data**: Retrieve recent WhatsApp co-parenting logs via Beeper.
5.  **Resolve & Scrape**: Extract text from newsletters and SendGrid links.
6.  **Process**: Synthesize with Gemini 2.5 using unified context (Gmail, Sway, WhatsApp, Drive).
7.  **Output**: Generate a cited, child-specific parenting plan in Markdown format via `PlanFormatter`.
8.  **Daily driver**: `npm run morning` derives slices, syncs Todoist tasks, and asks Gemini the two daily priority questions.

## 🛠️ Development Notes
*   **ES Modules:** The project uses `"type": "module"` in `package.json`.
*   **Imports:** Always use `.js` extensions in imports (e.g., `import { Service } from './service.js'`) as required by Node.js ESM.
*   **Testing:** Uses **Vitest** for unit testing. Run tests with `npm test`.
*   **Secrets:** Credentials (`credentials.json`, `token.json`) and `.env` are git-ignored. Template provided in `.env.template`.
