import dotenv from 'dotenv';
dotenv.config({ override: true });
import * as path from 'path';
import { AIService } from '../services/ai.service.js';
import { run as deriveSlices } from './derive-slices.js';
import { run as syncTasks } from './sync-tasks.js';
import { buildContext } from './ask.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const PLAN_FILE = path.join(process.cwd(), 'data/parenting/weekly-plan.md');

const KIDS_QUESTION =
  'What is the single most important thing for me to do for the kids today, and why?';
const CAREER_QUESTION =
  'What is the single most important thing for me to do for the job search today, and why?';

function header(label: string) {
  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  console.log(`  ${label}`);
  console.log(line);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set.');
    process.exit(1);
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  console.log(`\n🌅 MORNING BRIEFING — ${today}`);

  // Step 1: refresh the data/ slices from this week's plan
  header('Refreshing slices…');
  await deriveSlices();

  // Step 2: pull today's Todoist tasks
  header('Syncing tasks…');
  await syncTasks();

  // Step 3: load context once, share across both questions
  const context = await buildContext(DATA_DIR, PLAN_FILE);
  const ai = new AIService(apiKey);

  // Step 4: kids
  header('KIDS — top priority today');
  const kidsAnswer = await ai.ask(KIDS_QUESTION, context);
  console.log('\n' + kidsAnswer);

  // Step 5: career
  header('CAREER — top priority today');
  const careerAnswer = await ai.ask(CAREER_QUESTION, context);
  console.log('\n' + careerAnswer);

  console.log('\n' + '─'.repeat(50) + '\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
