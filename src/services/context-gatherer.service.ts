// Not an external-API service — assembles context from multiple sources for AI synthesis
import type { GmailService, GmailMessage } from './gmail.service.js';
import type { DriveService } from './drive.service.js';
import type { BeeperService, BeeperMessage } from './beeper.service.js';
import type { SwayService } from './sway.service.js';
import type { SourceLink } from '../domains/parenting/formatter.js';

const SCHOOL_NOISE_FILTER = '-subject:"Assignment Graded" -subject:"Grade Changed" -subject:"Submission Posted"';

export interface GatherOptions {
  query: string;
  days: number;
  skipEmails: boolean;
  chatNames: string[];
}

export interface GatheredContext {
  emails: GmailMessage[];
  beeperMessages: BeeperMessage[];
  driveContext: string;
  rawText: string;
  sourceMap: Map<string, SourceLink>;
}

export class ContextGatherer {
  constructor(private services: {
    gmail: GmailService;
    drive: DriveService;
    beeper: BeeperService;
    sway: SwayService;
  }) {}

  async gather(opts: GatherOptions): Promise<GatheredContext> {
    const sourceMap = new Map<string, SourceLink>();
    let rawText = '';

    console.log('--- Step 2: Fetching AI Context from Drive ---');
    const driveContext = await this.services.drive.getAIContextFolderContent('AI Context');

    const emails: GmailMessage[] = [];
    if (!opts.skipEmails) {
      const query = `${opts.query} ${SCHOOL_NOISE_FILTER}`;
      console.log(`--- Step 3: Fetching emails (query: "${query}") ---`);
      const fetched = await this.services.gmail.fetchMessages(query, opts.days);
      console.log(`Found ${fetched.length} emails.`);

      for (const email of fetched) {
        console.log(`\nProcessing Email: ${email.subject}`);
        emails.push(email);
        rawText += `Subject: ${email.subject}\nFrom: ${email.sender}\nBody: ${email.body}\n`;

        sourceMap.set(email.subject, {
          title: email.subject,
          url: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
          type: 'gmail',
        });

        for (const link of email.swayLinks) {
          console.log(`Scraping Sway: ${link}`);
          const swayContent = await this.services.sway.scrapeSway(link);
          rawText += `\n[Sway Content from ${link}]:\n${swayContent}\n`;
          sourceMap.set(link, { title: `Sway: ${email.subject}`, url: link, type: 'sway' });
        }
      }
    } else {
      console.log('--- Step 3: Skipping emails as requested ---');
    }

    const beeperMessages: BeeperMessage[] = [];
    if (opts.chatNames.length > 0) {
      console.log(`\n--- Step 4: Fetching messaging history for: ${opts.chatNames.join(', ')} ---`);
      const chatIDs = await this.services.beeper.findChatIDs(opts.chatNames);
      if (chatIDs.length > 0) {
        const msgs = await this.services.beeper.getRecentMessages(chatIDs, opts.days);
        beeperMessages.push(...msgs);
        rawText += this.services.beeper.formatMessagesForAI(msgs);
        console.log(`Fetched ${msgs.length} messages from Beeper.`);

        const foundChatNames = new Set(msgs.map(m => m.chatName));
        foundChatNames.forEach(name => {
          const chatID = msgs.find(m => m.chatName === name)?.chatID;
          sourceMap.set(name, {
            title: `Chat: ${name}`,
            url: chatID ? `beeper://chat/${chatID}` : undefined,
            type: 'whatsapp',
          });
        });
      } else {
        console.warn('No matching chats found in Beeper.');
      }
    }

    return { emails, beeperMessages, driveContext, rawText, sourceMap };
  }
}
