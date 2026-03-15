import { google, gmail_v1 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';

export class GmailService {
  private SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
  private TOKEN_PATH = path.join(process.cwd(), 'token.json');
  private CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
  private gmail: gmail_v1.Gmail | null = null;

  private async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(this.TOKEN_PATH, 'utf-8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  private async saveCredentials(client: any) {
    const content = await fs.readFile(this.CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(this.TOKEN_PATH, payload);
  }

  async authorize() {
    let client: any = await this.loadSavedCredentialsIfExist();
    
    const tryProfile = async (authClient: any) => {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return profile.data.emailAddress;
    };

    if (client) {
      try {
        const email = await tryProfile(client);
        this.gmail = google.gmail({ version: 'v1', auth: client });
        console.log(`\n[AUTH SUCCESS] Authenticated as: ${email}`);
        return;
      } catch (err) {
        console.log('Saved token is invalid or expired. Re-authenticating...');
        try { await fs.unlink(this.TOKEN_PATH); } catch {}
      }
    }

    client = await authenticate({
      scopes: this.SCOPES,
      keyfilePath: this.CREDENTIALS_PATH,
    });

    if (client && client.credentials) {
      await this.saveCredentials(client);
    }

    this.gmail = google.gmail({ version: 'v1', auth: client });
    const email = await tryProfile(client);
    console.log(`\n[AUTH SUCCESS] Authenticated as: ${email}`);
  }

  async fetchRecentSchoolEmails(query: string = 'sway') {
    if (!this.gmail) throw new Error('Gmail not authorized');

    // Look back 14 days
    const fourteenDaysAgo = Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000);
    const q = `${query} -subject:"Assignment Graded" -subject:"Grade Changed" -subject:"Submission Posted" after:${fourteenDaysAgo}`;
    
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

      const body = this.getEmailBody(msg.data);
      const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
      const date = new Date(parseInt(msg.data.internalDate!));

      const rawLinks = this.extractSwayLinks(body);
      const swayLinks = await Promise.all(rawLinks.map(link => {
        if (link.includes('sendgrid.net')) {
          return resolveLink(link);
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

  private getEmailBody(message: gmail_v1.Schema$Message): string {
    const getPartContent = (part: any): string => {
      let content = '';
      if (part.parts) {
        for (const subPart of part.parts) {
          content += getPartContent(subPart);
        }
      }
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body && part.body.data) {
          const raw = Buffer.from(part.body.data, 'base64').toString();
          // If HTML, strip tags for LLM; if plain, use as is
          content += (part.mimeType === 'text/html') ? raw.replace(/<[^>]*>?/gm, ' ') : raw;
        }
      }
      return content;
    };

    return getPartContent(message.payload || {});
  }

  private extractSwayLinks(text: string): string[] {
    const swayRegex = /https:\/\/(sway\.cloud\.microsoft|sway\.office\.com|app\.smore\.com|u\d+\.ct\.sendgrid\.net)\/[a-zA-Z0-9/\-_]+/g;
    const matches = text.match(swayRegex);
    if (!matches) return [];
    return [...new Set(matches.map(url => url.replace(/\/embed$/, '')))];
  }
}
