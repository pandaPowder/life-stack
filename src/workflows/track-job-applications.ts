import 'dotenv/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { AIService } from '../services/ai.service.js';
import { formatApplications, formatThisWeek } from '../domains/career/formatter.js';

const DATA_DIR = 'data/career';
const GMAIL_QUERY = [
  'subject:opportunity',
  'subject:interview',
  'subject:offer',
  'subject:"job opportunity"',
  'subject:"open role"',
  'subject:"your application"',
  'subject:recruiting',
  'subject:availability',
  'subject:schedule',
  'subject:"your profile"',
  'subject:"quick call"',
  'subject:"quick chat"',
  'from:linkedin.com',
  'from:greenhouse.io',
  'from:lever.co',
  'from:ashbyhq.com',
  'from:workday.com',
  'from:smartrecruiters.com',
].join(' OR ');

function parseDaysArg(defaultDays = 30): number {
  const idx = process.argv.indexOf('--days');
  if (idx !== -1 && process.argv[idx + 1]) {
    const parsed = parseInt(process.argv[idx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return defaultDays;
}

async function run() {
  console.log('--- Career Tracking Workflow ---');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
  }

  const lookbackDays = parseDaysArg();

  const auth = new AuthService();
  const ai = new AIService(apiKey);

  console.log('1. Authorizing...');
  await auth.authorize();

  const gmail = new GmailService(auth.auth);

  console.log(`2. Searching for job-related emails (last ${lookbackDays} days)...`);
  const emails = await gmail.fetchRecentSchoolEmails(GMAIL_QUERY, lookbackDays);
  console.log(`   Found ${emails.length} potential career-related emails.`);

  if (emails.length === 0) {
    console.log('   No emails found — writing empty career files.');
    await writeOutputs([]);
    return;
  }

  console.log('3. Parsing applications with AI...');
  const applications = await ai.parseJobApplications(emails);

  console.log('4. Writing career files...');
  await writeOutputs(applications);

  console.log('\nActive applications:');
  applications
    .filter(a => !['rejected', 'withdrawn'].includes(a.status))
    .forEach(a => console.log(`  - ${a.company} — ${a.role} (${a.status})`));
}

async function writeOutputs(applications: Awaited<ReturnType<AIService['parseJobApplications']>>) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const now = new Date();
  await fs.writeFile(
    path.join(DATA_DIR, 'applications.md'),
    formatApplications(applications, now),
    'utf8',
  );
  console.log(`  wrote ${DATA_DIR}/applications.md`);

  await fs.writeFile(
    path.join(DATA_DIR, 'this-week.md'),
    formatThisWeek(applications, now),
    'utf8',
  );
  console.log(`  wrote ${DATA_DIR}/this-week.md`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
