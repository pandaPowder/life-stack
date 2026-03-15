# Parenting Automation Tool

This tool helps automate the extraction of actionable parenting information from school emails and Microsoft Sway newsletters.

## 🚀 Getting Started

### 1. Prerequisite: Google Cloud Setup
To access your Gmail, you need to create a project in the [Google Cloud Console](https://console.cloud.google.com/):
1.  **Create a New Project.**
2.  **Enable the Gmail API.**
3.  **Configure the OAuth Consent Screen:**
    *   Set user type to "External".
    *   Add your email as a "Test User".
4.  **Create Credentials:**
    *   Click "Create Credentials" -> "OAuth client ID".
    *   Select "Desktop app".
    *   Download the JSON file and rename it to `credentials.json` in this project root.

### 2. Prerequisite: Google Gemini API Key
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Generate a new API Key.
3.  Create a `.env` file in this directory and add: `GEMINI_API_KEY=your_key_here`.

### 3. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 4. Run the Tool
```bash
npm start
```
*The first time you run this, it will open a browser window to authorize Gmail access. It will save a `token.json` for future use.*

## 🛠️ Customization
You can change the Gmail search query using the `-q` flag:
```bash
npm start -- -q "from:teacher@school.edu"
```

### 🧠 Personalized Context
This tool integrates with your Google Drive. To provide personalized context for each child:
1.  Create a folder in Google Drive named **"AI Context"**.
2.  Add Google Docs describing your children (e.g., "About Graham", "Ansel's Interests").
3.  The AI will automatically pull this text and use it to better assign homework tasks, prioritize extracurricular activities (like Band or Theater), and filter out irrelevant school noise.

## 🏗️ Tech Stack
*   **TypeScript/Node.js**
*   **Playwright:** For scraping Microsoft Sway (JavaScript-heavy).
*   **Google Gemini (gemini-2.5-flash):** For stable, high-performance summarization and JSON extraction in 2026.
*   **Google APIs:** For Gmail access.
