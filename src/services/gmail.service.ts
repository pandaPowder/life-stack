import { google, gmail_v1 } from 'googleapis';
import { EmailParser } from '../domains/parenting/parser.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { extractDocxText } from '../utils/docx.js';

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(auth: any) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  private async fetchAttachmentAsDocxText(messageId: string, attachmentId: string): Promise<string> {
    const att = await this.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    const data = (att.data.data as string).replace(/-/g, '+').replace(/_/g, '/');
    const buf = Buffer.from(data, 'base64');
    return extractDocxText(buf);
  }

  async fetchJobEmails(company: string): Promise<{ subject: string; from: string; body: string; date: Date }[]> {
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    const q = `("${company}") after:${ninetyDaysAgo}`;

    const res = await this.gmail.users.messages.list({ userId: 'me', q, maxResults: 20 });
    const messages = res.data.messages || [];
    console.log(`[Gmail] Found ${messages.length} emails matching "${company}".`);

    const emails = [];
    for (const message of messages) {
      const msg = await this.gmail.users.messages.get({ userId: 'me', id: message.id! });
      const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
      const date = new Date(parseInt(msg.data.internalDate!));
      let body = EmailParser.getEmailBody(msg.data);

      // Prefer docx attachment text over email body when a JD attachment is present
      const parts = msg.data.payload?.parts ?? [];
      for (const part of parts) {
        if (part.filename?.endsWith('.docx') && part.body?.attachmentId) {
          try {
            const docxText = await this.fetchAttachmentAsDocxText(message.id!, part.body.attachmentId);
            if (docxText) body = `[Attachment: ${part.filename}]\n${docxText}`;
          } catch {
            // fall back to email body
          }
        }
      }

      emails.push({ subject, from, body, date });
    }
    return emails;
  }

  async fetchRecentSchoolEmails(query: string = 'sway', lookbackDays: number = 45) {
    if (!this.gmail) throw new Error('Gmail not authorized');

    const cutoff = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);
    const q = `${query} -subject:"Assignment Graded" -subject:"Grade Changed" -subject:"Submission Posted" after:${cutoff}`;
    
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
