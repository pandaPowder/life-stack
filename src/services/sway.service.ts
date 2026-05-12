import { chromium } from 'playwright';

export class SwayService {
  /**
   * Scrapes text content from a Microsoft Sway URL.
   */
  async scrapeSway(url: string): Promise<string> {
    // If it's a PDF or not a Sway link, skip it
    if (!url.includes('sway.cloud.microsoft') && !url.includes('sway.office.com')) {
      console.warn(`[SWAY] Skipping non-Sway URL: ${url}`);
      return '';
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      
      // Handle navigation and skip if it triggers a download (like a PDF)
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
      } catch (e: any) {
        if (e.message.includes('Download is starting')) {
          console.warn(`[SWAY] Skipping URL that triggered download: ${url}`);
          return '';
        }
        throw e;
      }

      // Sways can take a bit to render.
      await page.waitForSelector('.sway-theme-font-main', { timeout: 10000 }).catch(() => null);

      const content = await page.evaluate(() => {
        const elementsToRemove = document.querySelectorAll('script, style, nav, footer');
        elementsToRemove.forEach(el => el.remove());
        return document.body.innerText;
      });

      return content.trim();
    } catch (error) {
      console.error(`[SWAY] Failed to scrape Sway at ${url}:`, error);
      return ''; // Return empty instead of crashing the whole workflow
    } finally {
      await browser.close();
    }
  }
}
