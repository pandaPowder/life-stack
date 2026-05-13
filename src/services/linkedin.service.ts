import { chromium } from 'playwright';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

const PROFILE_DIR = path.join(os.homedir(), '.life-automation', 'linkedin-profile');

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, () => { rl.close(); resolve(); }));
}

export class LinkedInService {
  async fetchProfile(url: string): Promise<string> {
    console.log('[LinkedIn] Launching browser...');
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      args: ['--no-first-run', '--no-default-browser-check'],
    });

    const page = context.pages()[0] ?? await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Always pause — LinkedIn's authwall often overlays the profile URL without redirecting,
    // so URL checks alone aren't reliable. Let the user confirm the page is ready.
    await waitForEnter(
      '\n[LinkedIn] Browser is open. Log in if prompted, then press Enter once the profile is fully visible...',
    );

    // If we ended up on a login/checkpoint page, reload the target URL
    const blockedUrls = ['/login', '/authwall', '/checkpoint'];
    if (blockedUrls.some(p => page.url().includes(p))) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForEnter('[LinkedIn] Navigate back to the profile if needed, then press Enter...');
    }

    // Wait for main content
    await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);

    const text = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.innerText : document.body.innerText;
    });

    await context.close();
    console.log('[LinkedIn] Profile fetched successfully.');
    return text;
  }
}
