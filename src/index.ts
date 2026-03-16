import 'dotenv/config';
import { program } from 'commander';
import { AuthService } from './services/auth.service.js';
import { GmailService } from './services/gmail.service.js';
import { DriveService } from './services/drive.service.js';
import { SwayService } from './services/sway.service.js';
import { AIService } from './services/ai.service.js';
import { McpService } from './services/mcp.service.js';

async function run() {
  program
    .option('-q, --query <string>', 'Gmail search query', 'sway')
    .option('-k, --key <string>', 'Google Gemini API Key')
    .parse(process.argv);

  const options = program.opts();
  const apiKey = options.key || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Please provide a Gemini API Key via -k or GEMINI_API_KEY environment variable.');
    process.exit(1);
  }

  const auth = new AuthService();
  const sway = new SwayService();
  const ai = new AIService(apiKey);
  const mcp = new McpService(process.env.BEEPER_ACCESS_TOKEN);

  try {
    console.log('--- Step 1: Authorizing with Google ---');
    await auth.authorize();

    const gmail = new GmailService(auth.auth);
    const drive = new DriveService(auth.auth);

    console.log('--- Step 2: Fetching AI Context from Drive ---');
    const context = await drive.getAIContextFolderContent('AI Context');

    console.log(`--- Step 3: Fetching emails (query: "${options.query}") ---`);
    const emails = await gmail.fetchRecentSchoolEmails(options.query);
    console.log(`Found ${emails.length} emails.`);

    let consolidatedSchoolText = '';

    for (const email of emails) {
      console.log(`\nProcessing Email: ${email.subject}`);
      consolidatedSchoolText += `Subject: ${email.subject}\nFrom: ${email.sender}\nBody: ${email.body}\n`;

      if (email.swayLinks.length > 0) {
        for (const link of email.swayLinks) {
          console.log(`Scraping Sway: ${link}`);
          const swayContent = await sway.scrapeSway(link);
          consolidatedSchoolText += `\n[Sway Content from ${link}]:\n${swayContent}\n`;
        }
      }
    }

    if (!consolidatedSchoolText) {
      console.log('No school emails found to summarize.');
    }

    // Connect to Beeper MCP
    console.log('\n--- Step 4: Initializing Beeper MCP ---');
    await mcp.connect();

    console.log('\n--- Step 5: Generating Parenting Plan with Agentic Context ---');
    const plan = await ai.generateParentingPlan(consolidatedSchoolText, context, mcp);

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
    plan.announcements.forEach(ann => console.log(`- ${ann}`));

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
