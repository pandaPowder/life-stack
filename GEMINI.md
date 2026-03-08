# Gemini Project Context: Parenting Automation

This project is a TypeScript/Node.js automation tool designed to help manage school-related communications and planning.

## 🎯 Objective
Automatically ingest school emails, scrape text from linked Microsoft Sway newsletters, and use Gemini to generate a structured weekly parenting plan (homework, purchases, activities).

## 🏗️ Architecture & Decisions

### 1. Gmail Ingestion (`src/services/gmail.service.ts`)
*   **Tool:** `googleapis` + `@google-cloud/local-auth`.
*   **Rationale:** Standard OAuth2 flow for secure, programmatic access to the user's inbox.
*   **Strategy:** Queries for "sway" or specific school senders within the last 7 days.

### 2. Sway Scraping (`src/services/sway.service.ts`)
*   **Tool:** `Playwright` (Chromium).
*   **Rationale:** Microsoft Sways are Client-Side Rendered (CSR) applications. Simple HTML parsing (like Cheerio) fails to capture content. Playwright renders the JavaScript and extracts the full text.
*   **Wait Strategy:** Uses `networkidle` and waits for specific theme-font selectors to ensure the "infinite scroll" or dynamic content has loaded.

### 3. AI Synthesis (`src/services/ai.service.ts`)
*   **Model:** `gemini-2.0-flash`.
*   **Rationale:** Fast, high-context window, and supports structured JSON output natively (`responseMimeType: 'application/json'`).
*   **Schema:** Defined in `src/types/index.ts` to ensure consistent parenting plans.

## 🔄 Workflow
1.  **Authorize:** Gmail OAuth handshake (uses `token.json` if present).
2.  **Fetch:** Search Gmail for relevant school emails.
3.  **Scrape:** If Sway links are found, launch Playwright to extract content.
4.  **Process:** Send consolidated text to Gemini with a specialized parenting prompt.
5.  **Output:** Display a structured plan in the CLI.

## 🛠️ Development Notes
*   **ES Modules:** The project uses `"type": "module"` in `package.json`.
*   **Imports:** Always use `.js` extensions in imports (e.g., `import { Service } from './service.js'`) as required by Node.js ESM.
*   **Secrets:** Credentials (`credentials.json`, `token.json`) and `.env` are git-ignored. Template provided in `.env.template`.
