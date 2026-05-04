import type { gmail_v1 } from 'googleapis';

export class EmailParser {
  /**
   * Recursively traverses Gmail message parts to reconstruct the full email body.
   * Strips HTML tags to leave clean text for LLM processing.
   */
  static getEmailBody(message: gmail_v1.Schema$Message): string {
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
          content += (part.mimeType === 'text/html') 
            ? raw.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ') 
            : raw;
        }
      }
      return content;
    };

    return getPartContent(message.payload || {}).trim();
  }

  /**
   * Searches for Microsoft Sway and Smore newsletter URLs within a block of text.
   * Includes support for SendGrid tracking links.
   */
  static extractNewsletterLinks(text: string): string[] {
    const newsletterRegex = /https:\/\/(sway\.cloud\.microsoft|sway\.office\.com|app\.smore\.com|u\d+\.ct\.sendgrid\.net)\/[a-zA-Z0-9/\-._?=&%]+/g;
    const matches = text.match(newsletterRegex);
    if (!matches) return [];
    
    // De-duplicate and clean links
    return [...new Set(matches.map(url => url.replace(/\/embed$/, '')))];
  }
}
