import { google, gmail_v1 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
export class GmailService {
    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
    TOKEN_PATH = path.join(process.cwd(), 'token.json');
    CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
    gmail = null;
    async loadSavedCredentialsIfExist() {
        try {
            const content = await fs.readFile(this.TOKEN_PATH, 'utf-8');
            const credentials = JSON.parse(content);
            return google.auth.fromJSON(credentials);
        }
        catch (err) {
            return null;
        }
    }
    async saveCredentials(client) {
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
        let client = await this.loadSavedCredentialsIfExist();
        if (client) {
            this.gmail = google.gmail({ version: 'v1', auth: client });
            return;
        }
        client = await authenticate({
            scopes: this.SCOPES,
            keyfilePath: this.CREDENTIALS_PATH,
        });
        if (client && client.credentials) {
            await this.saveCredentials(client);
        }
        this.gmail = google.gmail({ version: 'v1', auth: client });
    }
    async fetchRecentSchoolEmails(query = 'sway') {
        if (!this.gmail)
            throw new Error('Gmail not authorized');
        const res = await this.gmail.users.messages.list({
            userId: 'me',
            q: `${query} after:${Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)}`,
        });
        const messages = res.data.messages || [];
        const emails = [];
        for (const message of messages) {
            const msg = await this.gmail.users.messages.get({
                userId: 'me',
                id: message.id,
            });
            const body = this.getEmailBody(msg.data);
            const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
            const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
            const date = new Date(parseInt(msg.data.internalDate));
            const swayLinks = this.extractSwayLinks(body);
            emails.push({
                id: message.id,
                sender: from,
                subject,
                body,
                date,
                swayLinks,
            });
        }
        return emails;
    }
    getEmailBody(message) {
        let body = '';
        const parts = message.payload?.parts || [message.payload];
        for (const part of parts) {
            if (part?.mimeType === 'text/plain' && part.body?.data) {
                body += Buffer.from(part.body.data, 'base64').toString();
            }
            else if (part?.mimeType === 'text/html' && part.body?.data) {
                // We'll use text/plain for LLM simplicity, but could parse HTML too
                body += Buffer.from(part.body.data, 'base64').toString();
            }
        }
        return body;
    }
    extractSwayLinks(text) {
        const swayRegex = /https:\/\/sway\.cloud\.microsoft\/[a-zA-Z0-9]+/g;
        const matches = text.match(swayRegex);
        return matches ? [...new Set(matches)] : [];
    }
}
//# sourceMappingURL=gmail.service.js.map