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
*   **Contextual Prompting**: Injects Drive context and WhatsApp logs directly into the synthesis prompt. 
*   **Citations**: Generates per-item citations mapping back to Gmail message IDs and Beeper chat IDs.
*   **PlanFormatter**: Formats the AI-generated JSON into a cited, child-specific Markdown parenting plan.

## 🔄 Workflow
1.  **Authorize:** Unified Google OAuth handshake.
2.  **Context**: Fetch "AI Context" from the designated Drive folder.
3.  **Fetch School Data**: Search Gmail for school-related messages.
4.  **Fetch Messaging Data**: Retrieve recent WhatsApp co-parenting logs via Beeper.
5.  **Resolve & Scrape**: Extract text from newsletters and SendGrid links.
6.  **Process**: Synthesize with Gemini 2.5 using unified context (Gmail, Sway, WhatsApp, Drive).
7.  **Output**: Generate a cited, child-specific parenting plan in Markdown format via `PlanFormatter`.

## 🛠️ Development Notes
*   **ES Modules:** The project uses `"type": "module"` in `package.json`.
*   **Imports:** Always use `.js` extensions in imports (e.g., `import { Service } from './service.js'`) as required by Node.js ESM.
*   **Testing:** Uses **Vitest** for unit testing. Run tests with `npm test`.
*   **Secrets:** Credentials (`credentials.json`, `token.json`) and `.env` are git-ignored. Template provided in `.env.template`.
