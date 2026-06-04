import { webkit } from 'playwright';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

const PROFILE_DIR = path.join(os.homedir(), '.life-automation', 'linkedin-webkit-profile');

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, () => { rl.close(); resolve(); }));
}

export class LinkedInService {
  async fetchProfile(url: string): Promise<string> {
    console.log('[LinkedIn] Launching browser...');
    const context = await webkit.launchPersistentContext(PROFILE_DIR, {
      headless: false,
    });

    const page = context.pages()[0] ?? await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Only prompt if LinkedIn redirected to an auth/login/checkpoint page.
    // If the session cookie is still valid the profile loads directly — no interaction needed.
    const blockedUrls = ['/login', '/authwall', '/checkpoint', '/signup'];
    if (blockedUrls.some(p => page.url().includes(p))) {
      await waitForEnter(
        '\n[LinkedIn] Login required. Log in, navigate to the profile, then press Enter once the profile is fully visible...',
      );
      // After login, navigate to the original URL if we're still not there
      if (blockedUrls.some(p => page.url().includes(p))) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForEnter('[LinkedIn] Navigate to the profile if needed, then press Enter...');
      }
    } else {
      // Already on the profile — give it a moment to finish rendering
      await page.waitForTimeout(2000);
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
