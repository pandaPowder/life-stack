import dotenv from 'dotenv';
dotenv.config({ override: true });
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AIService } from '../services/ai.service.js';
import { buildContext } from '../utils/context.js';

const DATA_DIR = 'data';
const PLAN_FILE = 'data/parenting/weekly-plan.md';


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
