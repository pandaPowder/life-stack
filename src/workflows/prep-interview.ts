import dotenv from 'dotenv';
dotenv.config({ override: true });
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AIService } from '../services/ai.service.js';
import { LinkedInService } from '../services/linkedin.service.js';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { extractDocxText } from '../utils/docx.js';

export interface PrepInterviewOpts {
  linkedinUrl?: string;
  linkedinContext?: string;
  mutualConnections?: string[];
  resume?: string;
  jobDescription?: string;
}

export async function prepInterview(
  interviewer: string,
  company: string,
  opts: PrepInterviewOpts = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set.');
  const ai = new AIService(apiKey);
  return ai.prepInterview(interviewer, company, opts);
}

function parseArgs(args: string[]) {
  const opts: PrepInterviewOpts = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--linkedin' && args[i + 1]) {
      opts.linkedinUrl = args[++i];
    } else if (args[i] === '--context' && args[i + 1]) {
      opts.linkedinContext = args[++i];
    } else if (args[i] === '--connections' && args[i + 1]) {
      opts.mutualConnections = args[++i].split(',').map(s => s.trim());
    } else if (args[i] === '--resume' && args[i + 1]) {
      opts.resume = args[++i]; // treated as a file path; read below
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, opts };
}

async function fetchJobDescriptionFromGmail(company: string): Promise<string | undefined> {
  try {
    const auth = new AuthService();
    await auth.authorize();
    const gmail = new GmailService(auth.auth);
    const emails = await gmail.fetchJobEmails(company);
    if (emails.length === 0) return undefined;

    // Concatenate emails for Gemini to extract the JD from
    return emails
      .map(e => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date.toISOString().split('T')[0]}\n\n${e.body.slice(0, 3000)}`)
      .join('\n\n---\n\n');
  } catch (err) {
    console.warn(`[Gmail] Could not fetch job emails: ${(err as Error).message}`);
    return undefined;
  }
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));

  if (positional.length < 2) {
    console.error(
      'Usage: npm run prep-interview -- "<Interviewer>" "<Company>" [--linkedin <url>] [--connections "Name1,Name2"] [--resume <path>]',
    );
    process.exit(1);
  }

  const [interviewer, company] = positional;
  console.log(`\nResearching ${interviewer} @ ${company}...\n`);

  // Resolve resume: explicit flag, then default location
  const defaultResume = path.join(process.cwd(), 'inputs', 'career', 'resume.docx');
  const resumePath = opts.resume ?? (await fs.access(defaultResume).then(() => defaultResume).catch(() => null));

  if (resumePath) {
    try {
      opts.resume = resumePath.endsWith('.docx')
        ? await extractDocxText(resumePath)
        : await fs.readFile(resumePath, 'utf8');
      console.log(`[Resume] Loaded from ${resumePath}`);
    } catch (err) {
      console.warn(`[Resume] Could not read file: ${(err as Error).message}`);
      opts.resume = undefined;
    }
  } else {
    console.log('[Resume] No resume found — run with --resume <path> or place file at inputs/career/resume.docx');
  }

  // Fetch job description from Gmail
  console.log('[Gmail] Searching for job-related emails...');
  opts.jobDescription = await fetchJobDescriptionFromGmail(company);
  if (opts.jobDescription) {
    console.log('[Gmail] Job emails found — will extract JD for context.');
  } else {
    console.log('[Gmail] No job emails found — proceeding without JD.');
  }

  // Fetch LinkedIn profile
  if (opts.linkedinUrl && !opts.linkedinContext) {
    try {
      const li = new LinkedInService();
      opts.linkedinContext = await li.fetchProfile(opts.linkedinUrl);
    } catch (err) {
      console.warn(`[LinkedIn] Could not fetch profile: ${(err as Error).message}`);
      console.warn('[LinkedIn] Falling back to search-based research.');
    }
  }

  // Auto-extract mutual connections from scraped LinkedIn text if not already set
  if (opts.linkedinContext && !opts.mutualConnections?.length) {
    const match = opts.linkedinContext.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)\s+and\s+(?:\d+\s+other\s+)?mutual connection/);
    if (match) {
      opts.mutualConnections = match[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
      console.log(`[LinkedIn] Mutual connections found: ${opts.mutualConnections.join(', ')}`);
    }
  }

  const briefing = await prepInterview(interviewer, company, opts);

  const dateStr = new Date().toISOString().split('T')[0];
  const slug = company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const outDir = path.join(process.cwd(), 'data', 'interviews');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${dateStr}-${slug}.md`);
  await fs.writeFile(outFile, briefing, 'utf8');

  console.log(briefing);
  console.log(`\n---\nSaved to: ${outFile}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(err => {
  console.error(err);
  process.exit(1);
});
