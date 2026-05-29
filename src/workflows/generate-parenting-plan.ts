import dotenv from 'dotenv';
dotenv.config({ override: true });
import { program } from 'commander';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { DriveService } from '../services/drive.service.js';
import { SwayService } from '../services/sway.service.js';
import { AIService } from '../services/ai.service.js';
import { BeeperService } from '../services/beeper.service.js';
import { ContextGatherer } from '../services/context-gatherer.service.js';
import { PlanFormatter } from '../domains/parenting/formatter.js';

async function setupServices() {
  const auth = new AuthService();
  const sway = new SwayService();
  const beeper = new BeeperService(process.env.BEEPER_ACCESS_TOKEN);
  console.log('--- Step 1: Authorizing with Google ---');
  await auth.authorize();
  return {
    gmail: new GmailService(auth.auth),
    drive: new DriveService(auth.auth),
    beeper,
    sway,
  };
}

async function run() {
  program
    .option('-q, --query <string>', 'Gmail search query', process.env.PARENTING_PLAN_GMAIL_QUERY || 'label:kids OR sway OR "canyon creek" OR centerpoint')
    .option('-k, --key <string>', 'Google Gemini API Key')
    .option('-d, --days <number>', 'Number of days for messaging history', '7')
    .option('--skip-emails', 'Skip fetching emails and only use messaging/Drive context')
    .parse(process.argv);

  const options = program.opts();
  const apiKey = options.key || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Please provide a Gemini API Key via -k or GEMINI_API_KEY environment variable.');
    process.exit(1);
  }

  const ai = new AIService(apiKey);

  try {
    const services = await setupServices();
    const gatherer = new ContextGatherer(services);
    const ctx = await gatherer.gather({
      query: options.query,
      days: parseInt(options.days),
      skipEmails: options.skipEmails,
      chatNames: (process.env.BEEPER_CHAT_NAMES || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    });

    if (!ctx.rawText) {
      console.log('No emails or content found to summarize.');
      return;
    }

    console.log('\n--- Step 5: Generating Parenting Plan with Unified Context ---');
    const plan = await ai.generateParentingPlan(ctx.rawText, ctx.driveContext);

    const markdown = PlanFormatter.formatMarkdown(plan, ctx.sourceMap);
    await PlanFormatter.writeToFile('data/parenting/weekly-plan.md', markdown);
    console.log('\n[SUCCESS] Plan written to data/parenting/weekly-plan.md');

    console.log('\n==========================================');
    console.log('       WEEKLY PARENTING PLAN');
    console.log('==========================================');

    console.log('\n📚 HOMEWORK SUPPORT:');
    if (plan.homeworkSupport.length === 0) console.log('None found.');
    plan.homeworkSupport.forEach(t => console.log(`- [${t.child}] ${t.subject}: ${t.description} (Due: ${t.dueDate || 'N/A'})`));

    console.log('\n🛒 PURCHASES NEEDED:');
    if (plan.purchasesNeeded.length === 0) console.log('None found.');
    plan.purchasesNeeded.forEach(p => console.log(`- [${p.priority.toUpperCase()}] ${p.item}: ${p.reason}`));

    console.log('\n🗓️ UPCOMING ACTIVITIES:');
    if (plan.upcomingActivities.length === 0) console.log('None found.');
    plan.upcomingActivities.forEach(a => console.log(`- ${a.title} (${a.date}) @ ${a.location || 'School'}`));

    console.log('\n📢 ANNOUNCEMENTS:');
    if (plan.announcements.length === 0) console.log('None found.');
    plan.announcements.forEach(ann => console.log(`- ${ann.text}`));

  } catch (error: any) {
    console.error('\n!!! CRITICAL ERROR !!!');
    if (error.response && error.response.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.stack) {
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

run();
