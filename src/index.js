import 'dotenv/config';
import { program } from 'commander';
import { GmailService } from './services/gmail.service.js';
import { SwayService } from './services/sway.service.js';
import { AIService } from './services/ai.service.js';
async function main() {
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
    const gmail = new GmailService();
    const sway = new SwayService();
    const ai = new AIService(apiKey);
    try {
        console.log('--- Step 1: Authorizing Gmail ---');
        await gmail.authorize();
        console.log(`--- Step 2: Fetching emails (query: "${options.query}") ---`);
        const emails = await gmail.fetchRecentSchoolEmails(options.query);
        console.log(`Found ${emails.length} emails.`);
        let consolidatedText = '';
        for (const email of emails) {
            console.log(`\nProcessing Email: ${email.subject}`);
            consolidatedText += `Subject: ${email.subject}\nFrom: ${email.sender}\nBody: ${email.body}\n`;
            if (email.swayLinks.length > 0) {
                for (const link of email.swayLinks) {
                    console.log(`Scraping Sway: ${link}`);
                    const swayContent = await sway.scrapeSway(link);
                    consolidatedText += `\n[Sway Content from ${link}]:\n${swayContent}\n`;
                }
            }
        }
        if (!consolidatedText) {
            console.log('No emails or content found to summarize.');
            return;
        }
        console.log('\n--- Step 3: Generating Parenting Plan ---');
        const plan = await ai.generateParentingPlan(consolidatedText);
        console.log('\n==========================================');
        console.log('       WEEKLY PARENTING PLAN');
        console.log('==========================================');
        console.log('\n📚 HOMEWORK SUPPORT:');
        plan.homeworkSupport.forEach(t => console.log(`- [${t.child}] ${t.subject}: ${t.description} (Due: ${t.dueDate || 'N/A'})`));
        console.log('\n🛒 PURCHASES NEEDED:');
        plan.purchasesNeeded.forEach(p => console.log(`- [${p.priority.toUpperCase()}] ${p.item}: ${p.reason}`));
        console.log('\n🗓️ UPCOMING ACTIVITIES:');
        plan.upcomingActivities.forEach(a => console.log(`- ${a.title} (${a.date}) @ ${a.location || 'School'}`));
        console.log('\n📢 ANNOUNCEMENTS:');
        plan.announcements.forEach(ann => console.log(`- ${ann}`));
    }
    catch (error) {
        console.error('An error occurred during execution:', error);
    }
}
main();
//# sourceMappingURL=index.js.map