import dotenv from 'dotenv';
dotenv.config({ override: true });
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AIService } from '../services/ai.service.js';

const DATA_DIR = 'data';
const PLAN_FILE = 'weekly-parenting-plan.md';

// Exported for testing
export async function buildContext(dataDir: string, planFile: string): Promise<string> {
  const candidates = [
    path.join(dataDir, 'today.md'),
    path.join(dataDir, 'tasks', 'today.md'),
    path.join(dataDir, 'kids', 'graham', 'this-week.md'),
    path.join(dataDir, 'kids', 'nora', 'this-week.md'),
    path.join(dataDir, 'kids', 'ansel', 'this-week.md'),
    path.join(dataDir, 'career', 'this-week.md'),
  ];

  const sections: string[] = [];
  for (const file of candidates) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const label = path.relative(dataDir, file);
      sections.push(`### ${label}\n${content}`);
    } catch {
      // file doesn't exist — skip silently
    }
  }

  if (sections.length > 0) return sections.join('\n\n---\n\n');

  // Fallback: use the full weekly plan if data/ hasn't been generated yet
  try {
    return await fs.readFile(planFile, 'utf8');
  } catch {
    return '';
  }
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    console.error('Usage: npm run ask -- "<your question>"');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set.');
    process.exit(1);
  }

  const context = await buildContext(
    path.join(process.cwd(), DATA_DIR),
    path.join(process.cwd(), PLAN_FILE),
  );

  if (!context) {
    console.error('No context found. Run "npm start" and "npm run derive-slices" first.');
    process.exit(1);
  }

  const ai = new AIService(apiKey);
  const answer = await ai.ask(question, context);
  console.log(answer);
}

// Only run when executed directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
