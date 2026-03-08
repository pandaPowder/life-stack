import { chromium } from 'playwright';

export class SwayService {
  /**
   * Scrapes text content from a Microsoft Sway URL.
   */
  async scrapeSway(url: string): Promise<string> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      
      // Wait for network to be idle since Sway is JS-heavy
      await page.goto(url, { waitUntil: 'networkidle' });

      // Sways can take a bit to render. We might need specific wait
      // Wait for any element that looks like content
      await page.waitForSelector('.sway-theme-font-main', { timeout: 10000 }).catch(() => null);

      // Extract all text content. We can refine this if it's too noisy.
      const content = await page.evaluate(() => {
        // Remove scripts, styles, etc.
        const elementsToRemove = document.querySelectorAll('script, style, nav, footer');
        elementsToRemove.forEach(el => el.remove());
        
        return document.body.innerText;
      });

      return content.trim();
    } catch (error) {
      console.error(`Failed to scrape Sway at ${url}:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
