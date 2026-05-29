import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OFWService } from './ofw.service.js';

// Fixture matches the real pdftotext -layout format exactly:
// top-level message at ~6-space indent, quoted thread at ~17-space indent.
const SAMPLE_TEXT = `Message Report
Generated: 05/18/2026 4:30 PM by Dallas Despain

Message 1 of 3


      Sent:            03/28/2026 11:09 AM
      From:            Jenny Lund
      To:              Dallas Despain (First Viewed: 03/28/2026 11:16 AM)
      Subject:         Re: Shared expenses

      Sounds good! I will work on that this weekend.


                 Sent:         03/27/2026 7:30 PM
                 From:         Dallas Despain
                 To:           Jenny Lund (First Viewed: 03/28/2026 11:08 AM)
                 Subject:      Shared expenses

                 Can we reconcile this weekend?


                         | Message Report                                                               Page 1 of 3
Message 2 of 3


      Sent:            03/28/2026 11:21 AM
      From:            Jenny Lund
      To:              Dallas Despain (First Viewed: 03/28/2026 11:21 AM)
      Subject:         Calendar setup

      I tried to get the calendar set up with our regular schedule.
      We will need to add in holidays.


                         | Message Report                                                               Page 2 of 3
Message 3 of 3


      Sent:            04/15/2026 2:30 PM
      From:            Dallas Despain
      To:              Jenny Lund (First Viewed: 04/15/2026 3:00 PM)
      Subject:         Graham soccer

      Can you send the practice schedule?


                         | Message Report                                                               Page 3 of 3
`;

vi.mock('../config/user.js', () => ({
  userConfig: {
    userName: 'Dallas Despain',
    partnerName: 'Jenny Lund',
    children: ['Ansel', 'Graham', 'Nora'],
    networkContext: '',
    communicationStyle: '',
  },
}));

describe('OFWService', () => {
  let service: OFWService;

  beforeEach(() => {
    service = new OFWService();
  });

  describe('parseText', () => {
    it('parses all top-level messages', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages).toHaveLength(3);
    });

    it('parses sent date correctly', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      // sorted chronologically; first is 03/28/2026 11:09 AM
      expect(messages[0].sent).toEqual(new Date(2026, 2, 28, 11, 9));
    });

    it('parses from and to fields', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].from).toBe('Jenny Lund');
      expect(messages[0].to).toBe('Dallas Despain');
    });

    it('strips (First Viewed: ...) from To field', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].to).not.toContain('First Viewed');
    });

    it('parses subject', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].subject).toBe('Re: Shared expenses');
    });

    it('parses body', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].body).toBe('Sounds good! I will work on that this weekend.');
    });

    it('does not include quoted thread content in body', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].body).not.toContain('Can we reconcile');
    });

    it('handles multi-line body', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      // message 2 (index 1 after sort) has two body lines
      const cal = messages.find(m => m.subject === 'Calendar setup')!;
      expect(cal.body).toContain('calendar set up');
      expect(cal.body).toContain('add in holidays');
    });

    it('marks own messages as isFromMe', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const mine = messages.find(m => m.subject === 'Graham soccer')!;
      expect(mine.isFromMe).toBe(true);
    });

    it('marks co-parent messages as not isFromMe', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      expect(messages[0].isFromMe).toBe(false);
    });

    it('returns messages sorted chronologically', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].sent.getTime()).toBeGreaterThanOrEqual(messages[i - 1].sent.getTime());
      }
    });
  });

  describe('filterByDays', () => {
    it('excludes messages older than the cutoff', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      // All fixture messages are from March/April 2026; filtering to last 1 day returns 0
      const recent = service.filterByDays(messages, 1);
      expect(recent).toHaveLength(0);
    });

    it('includes all messages when days is large', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const all = service.filterByDays(messages, 9999);
      expect(all).toHaveLength(messages.length);
    });
  });

  describe('formatMessagesForAI', () => {
    it('returns empty string for empty input', () => {
      expect(service.formatMessagesForAI([])).toBe('');
    });

    it('includes OFW header and footer markers', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const output = service.formatMessagesForAI(messages);
      expect(output).toContain('--- OFW Co-Parenting Messages ---');
      expect(output).toContain('--- End of OFW Messages ---');
    });

    it('labels own messages with ME prefix', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const output = service.formatMessagesForAI(messages);
      expect(output).toContain('ME (Dallas Despain)');
    });

    it('labels co-parent messages by name', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const output = service.formatMessagesForAI(messages);
      expect(output).toContain('Jenny Lund');
    });

    it('includes subject and body content', () => {
      const messages = service.parseText(SAMPLE_TEXT);
      const output = service.formatMessagesForAI(messages);
      expect(output).toContain('Re: Shared expenses');
      expect(output).toContain('Sounds good!');
    });
  });
});
