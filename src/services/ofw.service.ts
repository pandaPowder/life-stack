import { execSync } from 'child_process';
import { unlink } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { webkit, type BrowserContext, type Download, type Page } from 'playwright';
import { userConfig } from '../config/user.js';

const OFW_PROFILE_DIR = path.join(os.homedir(), '.life-automation', 'ofw-webkit-profile');
const OFW_APP_URL = 'https://ofw.ourfamilywizard.com';
const OFW_LOGIN_PATHS = ['/login', '/sign-in', '/auth', '/app/login'];

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt + '\n', () => { rl.close(); resolve(); }));
}

export interface OFWMessage {
  sent: Date;
  from: string;
  to: string;
  subject: string;
  body: string;
  isFromMe: boolean;
}

export class OFWService {
  async downloadRecentMessages(days: number): Promise<OFWMessage[]> {
    console.log('[OFW] Launching browser with persistent session...');
    const context = await webkit.launchPersistentContext(OFW_PROFILE_DIR, {
      headless: false,
      acceptDownloads: true,
    });

    const page = context.pages()[0] ?? await context.newPage();

    try {
      // Navigate directly to the messages view (works whether or not already logged in)
      await page.goto(`${OFW_APP_URL}/app/messages`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[OFW] Landed on: ${page.url()}`);

      // Protected routes redirect to /app/login when the session has expired or is new
      if (OFW_LOGIN_PATHS.some(p => page.url().includes(p))) {
        await waitForEnter(
          '\n[OFW] Login required. Log in and press Enter once you\'re on the messages page...',
        );
        console.log(`[OFW] After login: ${page.url()}`);
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const download = await this.triggerDownload(context, page, startDate, endDate);

      const tmpPath = path.join(os.tmpdir(), `ofw-${Date.now()}.pdf`);
      await download.saveAs(tmpPath);
      await context.close();

      console.log('[OFW] Parsing downloaded messages...');
      const messages = this.parseFromPdf(tmpPath);
      await unlink(tmpPath).catch(() => {});
      return messages;
    } catch (e) {
      await context.close();
      throw e;
    }
  }

  private async triggerDownload(context: BrowserContext, page: Page, startDate: Date, endDate: Date): Promise<Download> {
    const fmt = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}/${dd}/${d.getFullYear()}`;
    };

    // Try automated path: find the print/download button OFW shows in the All Messages view
    const printBtn = page.locator('#downloadBtn');
    const canAutomate = await printBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (canAutomate) {
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 60000 }),
        (async () => {
          await printBtn.click();
          await page.locator('#downloadForm').waitFor({ state: 'visible', timeout: 5000 });
          
          await page.locator('#messagesSelect').click();
          await page.locator('[role="option"]').filter({ hasText: 'Within Date Range' }).click();
          
          await page.locator('input[name="from"]').fill(fmt(startDate));
          await page.locator('input[name="to"]').fill(fmt(endDate));
          
          await page.locator('#generateBtn').click();
        })(),
      ]);
      return dl;
    }

    // Fallback: guide the user to trigger the download manually
    console.warn('[OFW] Could not locate download button automatically — falling back to manual trigger.');
    const [dl] = await Promise.all([
      context.waitForEvent('download', { timeout: 120000 }),
      waitForEnter(
        `\n[OFW] Please manually trigger the message download:\n` +
        `  1. Go to Messages → All Messages\n` +
        `  2. Click the print/download button\n` +
        `  3. Choose Date Range: ${fmt(startDate)} → ${fmt(endDate)}\n` +
        `  4. Click Download (the browser will start the download)\n` +
        `Press Enter here once the download has started...`,
      ),
    ]);
    return dl;
  }

  parseFromPdf(pdfPath: string): OFWMessage[] {
    const text = execSync(`pdftotext -layout "${pdfPath}" -`).toString();
    return this.parseText(text);
  }

  parseText(rawText: string): OFWMessage[] {
    // Normalize form-feed page breaks (pdftotext uses \f between pages)
    const normalized = rawText.replace(/\f/g, '\n');
    const blocks = normalized.split(/^Message \d+ of \d+$/m);
    blocks.shift(); // drop pre-message header content

    const messages: OFWMessage[] = [];
    for (const block of blocks) {
      const msg = this.parseBlock(block);
      if (msg) messages.push(msg);
    }

    return messages.sort((a, b) => a.sent.getTime() - b.sent.getTime());
  }

  private parseBlock(block: string): OFWMessage | null {
    // Strip page footer (e.g. "| Message Report   Page 1 of 130")
    const cleaned = block.replace(/\|?\s*Message Report.*?Page \d+ of \d+/gs, '').trim();
    const lines = cleaned.split('\n');

    // pdftotext -layout indents the top-level message at ~6 spaces and
    // quoted/threaded messages at ~15+ spaces. Find where the thread starts.
    let topEndIdx = lines.length;
    for (let i = 1; i < lines.length; i++) {
      if (/^\s{10,}Sent:/.test(lines[i])) {
        topEndIdx = i;
        break;
      }
    }

    const topLines = lines.slice(0, topEndIdx);
    const topText = topLines.join('\n');

    const sentMatch = topText.match(/Sent:\s+(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/);
    if (!sentMatch) return null;

    const fromMatch = topText.match(/From:\s+([^\n]+)/);
    // To: value may be followed by "(First Viewed: ...)" — strip that
    const toMatch = topText.match(/To:\s+([^\n(]+)/);
    const subjectMatch = topText.match(/Subject:\s+([^\n]+)/);

    const sent = this.parseDateStr(sentMatch[1]);
    const from = fromMatch?.[1].trim() ?? '';
    const to = toMatch?.[1].trim() ?? '';
    const subject = subjectMatch?.[1].trim() ?? '';

    // Body is everything after the Subject: line
    const subjectLineIdx = topLines.findLastIndex(l => /^\s+Subject:/.test(l));
    const bodyLines = subjectLineIdx >= 0 ? topLines.slice(subjectLineIdx + 1) : [];
    const body = bodyLines
      .map(l => l.trim())
      .filter(l => l)
      .join('\n')
      .trim();

    return {
      sent,
      from,
      to,
      subject,
      body,
      isFromMe: from.toLowerCase().includes(userConfig.userName.toLowerCase()),
    };
  }

  private parseDateStr(dateStr: string): Date {
    const [datePart, timePart, ampm] = dateStr.trim().split(/\s+/);
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours12, minutes] = timePart.split(':').map(Number);
    const isPm = ampm === 'PM';
    const hours24 = isPm
      ? hours12 === 12 ? 12 : hours12 + 12
      : hours12 === 12 ? 0 : hours12;
    return new Date(year, month - 1, day, hours24, minutes);
  }

  filterByDays(messages: OFWMessage[], days: number): OFWMessage[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return messages.filter(m => m.sent >= cutoff);
  }

  formatMessagesForAI(messages: OFWMessage[]): string {
    if (messages.length === 0) return '';

    let output = '\n--- OFW Co-Parenting Messages ---\n';
    for (const m of messages) {
      const senderLabel = m.isFromMe ? `ME (${userConfig.userName})` : m.from;
      output += `[${m.sent.toLocaleString()}] ${senderLabel} → ${m.to} | ${m.subject}\n`;
      if (m.body) output += `${m.body}\n`;
      output += '\n';
    }
    output += '--- End of OFW Messages ---\n';
    return output;
  }
}
