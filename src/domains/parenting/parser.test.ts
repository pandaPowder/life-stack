import { describe, it, expect } from 'vitest';
import { EmailParser } from './parser.js';

describe('EmailParser', () => {
  describe('extractNewsletterLinks', () => {
    it('should extract Sway links', () => {
      const text = 'Check out our newsletter here: https://sway.office.com/v1234567890abc - and another one: https://sway.cloud.microsoft/xyz';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toContain('https://sway.office.com/v1234567890abc');
      expect(links).toContain('https://sway.cloud.microsoft/xyz');
    });

    it('should extract Smore links', () => {
      const text = 'Smore link: https://app.smore.com/n/abcd-1234';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toContain('https://app.smore.com/n/abcd-1234');
    });

    it('should extract SendGrid links', () => {
      const text = 'SendGrid: https://u12345.ct.sendgrid.net/ls/click?upn=abc';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toContain('https://u12345.ct.sendgrid.net/ls/click?upn=abc');
    });

    it('should remove /embed suffix from Sway links', () => {
      const text = 'https://sway.office.com/v123/embed';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toContain('https://sway.office.com/v123');
    });

    it('should de-duplicate links', () => {
      const text = 'https://sway.office.com/v123 and again https://sway.office.com/v123';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toHaveLength(1);
    });

    it('should return empty array if no links found', () => {
      const text = 'No links here';
      const links = EmailParser.extractNewsletterLinks(text);
      expect(links).toEqual([]);
    });
  });

  describe('getEmailBody', () => {
    it('should extract text from plain text parts', () => {
      const message = {
        payload: {
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Hello World').toString('base64')
          }
        }
      };
      const body = EmailParser.getEmailBody(message as any);
      expect(body).toBe('Hello World');
    });

    it('should strip HTML tags from HTML parts', () => {
      const message = {
        payload: {
          mimeType: 'text/html',
          body: {
            data: Buffer.from('<div>Hello <b>World</b></div>').toString('base64')
          }
        }
      };
      const body = EmailParser.getEmailBody(message as any);
      expect(body.trim()).toBe('Hello World');
    });

    it('should handle multipart messages', () => {
      const message = {
        payload: {
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('Part 1').toString('base64') }
            },
            {
              parts: [
                {
                  mimeType: 'text/html',
                  body: { data: Buffer.from('<span>Part 2</span>').toString('base64') }
                }
              ]
            }
          ]
        }
      };
      const body = EmailParser.getEmailBody(message as any);
      expect(body).toContain('Part 1');
      expect(body).toContain('Part 2');
    });
  });
});
