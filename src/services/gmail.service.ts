import { google, gmail_v1 } from 'googleapis';
import { EmailParser } from '../domains/parenting/parser.js';

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(auth: any) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async fetchRecentSchoolEmails(query: string = 'sway') {
    if (!this.gmail) throw new Error('Gmail not authorized');

    // Look back 45 days to capture monthly newsletters
    const fortyFiveDaysAgo = Math.floor((Date.now() - 45 * 24 * 60 * 60 * 1000) / 1000);
    const q = `${query} -subject:"Assignment Graded" -subject:"Grade Changed" -subject:"Submission Posted" after:${fortyFiveDaysAgo}`;
    
    const res = await this.gmail.users.messages.list({
      userId: "me",
      q,
    });

    const messages = res.data.messages || [];
    console.log(`\n[FETCH] Gmail found ${messages.length} message IDs for query "${q}".`);
    const emails = [];

    const resolveLink = async (url: string): Promise<string> => {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        return response.url;
      } catch (e) {
        return url;
      }
    };

    for (const message of messages) {
      const msg = await this.gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      });

      const body = EmailParser.getEmailBody(msg.data);
      const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
      const date = new Date(parseInt(msg.data.internalDate!));

      const rawLinks = EmailParser.extractNewsletterLinks(body);
      const swayLinks = await Promise.all(rawLinks.map(link => {
        if (link.includes('sendgrid.net')) {
          return resolveLink(link);
        }
        if (link.includes('cloud.microsoft/s/')) {
          // Canonicalize Microsoft Sway links for Playwright
          return link.replace('/embed', '');
        }
        return Promise.resolve(link);
      }));

      emails.push({
        id: message.id!,
        sender: from,
        subject,
        body,
        date,
        swayLinks,
      });
    }

    return emails;
  }
}
