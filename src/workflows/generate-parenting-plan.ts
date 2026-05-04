import 'dotenv/config';
import { program } from 'commander';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { DriveService } from '../services/drive.service.js';
import { SwayService } from '../services/sway.service.js';
import { AIService } from '../services/ai.service.js';
import { BeeperService } from '../services/beeper.service.js';
import { PlanFormatter } from '../domains/parenting/formatter.js';
import type { SourceLink } from '../domains/parenting/formatter.js';
import * as fs from 'fs/promises';

async function run() {
  program
    .option('-q, --query <string>', 'Gmail search query', 'sway')
    .option('-k, --key <string>', 'Google Gemini API Key')
    .option('-d, --days <number>', 'Number of days for WhatsApp history', '7')
    .option('--skip-emails', 'Skip fetching emails and only use WhatsApp/Drive context')
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
  const beeper = new BeeperService(process.env.BEEPER_ACCESS_TOKEN);
  const sourceMap = new Map<string, SourceLink>();

  try {
    console.log('--- Step 1: Authorizing with Google ---');
    await auth.authorize();

    const gmail = new GmailService(auth.auth);
    const drive = new DriveService(auth.auth);

    console.log('--- Step 2: Fetching AI Context from Drive ---');
    const context = await drive.getAIContextFolderContent('AI Context');

    let consolidatedText = '';

    if (!options.skipEmails) {
      console.log(`--- Step 3: Fetching emails (query: "${options.query}") ---`);
      const emails = await gmail.fetchRecentSchoolEmails(options.query);
      console.log(`Found ${emails.length} emails.`);

      for (const email of emails) {
        console.log(`\nProcessing Email: ${email.subject}`);
        consolidatedText += `Subject: ${email.subject}\nFrom: ${email.sender}\nBody: ${email.body}\n`;
        
        sourceMap.set(email.subject, {
          title: email.subject,
          url: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
          type: 'gmail'
        });

        if (email.swayLinks.length > 0) {
          for (const link of email.swayLinks) {
            console.log(`Scraping Sway: ${link}`);
            const swayContent = await sway.scrapeSway(link);
            consolidatedText += `\n[Sway Content from ${link}]:\n${swayContent}\n`;
            // We'll map the sway link itself too if it appears as a source
            sourceMap.set(link, { title: `Sway: ${email.subject}`, url: link, type: 'sway' });
          }
        }
      }
    } else {
      console.log('--- Step 3: Skipping emails as requested ---');
    }

    // Step 4: WhatsApp context via Beeper REST API
    const chatNamesStr = process.env.BEEPER_CHAT_NAMES || '';
    if (chatNamesStr) {
      const chatNames = chatNamesStr.split(',').map(n => n.trim());
      console.log(`\n--- Step 4: Fetching WhatsApp history for: ${chatNames.join(', ')} ---`);
      
      const chatIDs = await beeper.findChatIDs(chatNames);
      if (chatIDs.length > 0) {
        const messages = await beeper.getRecentMessages(chatIDs, parseInt(options.days));
        const beeperContext = beeper.formatMessagesForAI(messages);
        consolidatedText += beeperContext;
        console.log(`Fetched ${messages.length} messages from WhatsApp.`);
        
        // Add unique chat names to source map
        const foundChatNames = new Set(messages.map(m => m.chatName));
        foundChatNames.forEach(name => {
          const chatID = messages.find(m => m.chatName === name)?.chatID;
          sourceMap.set(name, { 
            title: `WhatsApp: ${name}`, 
            url: chatID ? `beeper://chat/${chatID}` : undefined,
            type: 'whatsapp' 
          });
        });
      } else {
        console.warn('No matching WhatsApp chats found in Beeper.');
      }
    }

    if (!consolidatedText) {
      console.log('No emails or content found to summarize.');
      return;
    }

    console.log('\n--- Step 5: Generating Parenting Plan with Unified Context ---');
    const plan = await ai.generateParentingPlan(consolidatedText, context);

    const markdown = PlanFormatter.formatMarkdown(plan, sourceMap);
    await PlanFormatter.writeToFile('weekly-parenting-plan.md', markdown);
    console.log('\n[SUCCESS] Plan written to weekly-parenting-plan.md');

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
