import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { OFWService, type OFWMessage } from '../services/ofw.service.js';

type ExportedMessage = {
  sent: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  isFromMe: boolean;
};

type ExportPayload = {
  generatedAt: string;
  windowDays: number;
  messageCount: number;
  messages: ExportedMessage[];
};

function ensurePositiveInt(value: string, label: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, got: ${value}`);
  }
  return parsed;
}

function toPayload(messages: OFWMessage[], days: number): ExportPayload {
  const normalizedMessages = messages.map(m => ({
    sent: m.sent.toISOString(),
    from: m.from,
    to: m.to,
    subject: m.subject,
    body: m.body,
    isFromMe: m.isFromMe,
  }));

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    messageCount: normalizedMessages.length,
    messages: normalizedMessages,
  };
}

function formatMarkdown(payload: ExportPayload): string {
  const lines: string[] = [];
  lines.push('# OFW Recent Messages');
  lines.push('');
  lines.push(`Generated at (UTC): ${payload.generatedAt}`);
  lines.push(`Window days: ${payload.windowDays}`);
  lines.push(`Message count: ${payload.messageCount}`);
  lines.push('');
  lines.push('## Messages');
  lines.push('');

  if (payload.messages.length === 0) {
    lines.push('_No OFW messages found in the requested window._');
    lines.push('');
    return lines.join('\n');
  }

  payload.messages.forEach((message, index) => {
    const title = message.subject && message.subject.trim() ? message.subject.trim() : '(no subject)';
    lines.push(`### ${index + 1}. ${title}`);
    lines.push(`- Sent: ${message.sent}`);
    lines.push(`- From: ${message.from}`);
    lines.push(`- To: ${message.to}`);
    lines.push(`- Direction: ${message.isFromMe ? 'from me' : 'to me'}`);
    lines.push('');
    lines.push('Body:');
    lines.push('');
    if (message.body && message.body.trim()) {
      lines.push(message.body.trim());
    } else {
      lines.push('_No body text._');
    }
    lines.push('');
  });

  return lines.join('\n');
}

async function writeFileWithParents(targetPath: string, content: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf8');
}

export async function run() {
  const program = new Command();
  program
    .option('-d, --days <number>', 'How many recent days of OFW messages to include', '7')
    .option('--ofw-pdf <path>', 'Parse a manually-downloaded OFW PDF instead of launching browser automation')
    .option('-o, --out <path>', 'Markdown output file', 'data/ofw/ofw-recent.md')
    .option('--json-out <path>', 'JSON output file', 'data/ofw/ofw-recent.json')
    .parse(process.argv);

  const options = program.opts();
  const days = ensurePositiveInt(options.days, '--days');
  const outPath = path.resolve(process.cwd(), options.out);
  const jsonOutPath = path.resolve(process.cwd(), options.jsonOut);
  const ofwPdf = options.ofwPdf as string | undefined;

  const ofw = new OFWService();
  const allMessages = ofwPdf
    ? ofw.parseFromPdf(path.resolve(process.cwd(), ofwPdf))
    : await ofw.downloadRecentMessages(days);
  const recentMessages = ofw.filterByDays(allMessages, days);

  const payload = toPayload(recentMessages, days);
  const markdown = formatMarkdown(payload);

  await writeFileWithParents(outPath, markdown);
  await writeFileWithParents(jsonOutPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`[export-ofw] Wrote ${payload.messageCount} message(s) to ${outPath}`);
  console.log(`[export-ofw] Wrote JSON payload to ${jsonOutPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[export-ofw] Failed: ${message}`);
    process.exit(1);
  });
}
