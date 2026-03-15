# Gemini Project Context: Parenting Automation

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

### 3. Gmail & Scraping (`src/services/gmail.service.ts`, `src/services/sway.service.ts`)
*   **Gmail:** Queries for school communications and newsletter links (including Smore and Sway).
*   **Link Resolution**: Automatically resolves SendGrid tracking links to find the canonical newsletter URL.
*   **Playwright:** Renders JavaScript-heavy Sways and Smores to extract full text content.

### 4. AI Synthesis (`src/services/ai.service.ts`)
*   **Model:** `gemini-2.5-flash`.
*   **Contextual Prompting**: Injects the Drive context directly into the synthesis prompt, ensuring that Graham's band news, Nora's theater updates, and Ansel's elementary news are correctly assigned and prioritized.

## 🔄 Workflow
1.  **Authorize:** Unified Google OAuth handshake.
2.  **Context**: Fetch "AI Context" from the designated Drive folder.
3.  **Fetch**: Search Gmail for school-related messages.
4.  **Resolve & Scrape**: Extract text from newsletters and SendGrid links.
5.  **Process**: Synthesize with Gemini 2.5 using both email content and Drive-based personal context.
6.  **Output**: Display a structured, child-specific parenting plan.

## 🛠️ Development Notes
*   **ES Modules:** The project uses `"type": "module"` in `package.json`.
*   **Imports:** Always use `.js` extensions in imports (e.g., `import { Service } from './service.js'`) as required by Node.js ESM.
*   **Secrets:** Credentials (`credentials.json`, `token.json`) and `.env` are git-ignored. Template provided in `.env.template`.
