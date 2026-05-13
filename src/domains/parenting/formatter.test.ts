import { describe, it, expect } from 'vitest';
import { PlanFormatter } from './formatter.js';
import type { SourceLink } from './formatter.js';

describe('PlanFormatter', () => {
  const sourceMap = new Map<string, SourceLink>([
    ['Email 1', { title: 'Email 1', url: 'https://mail.google.com/1', type: 'gmail' }],
    ['Family Chat', { title: 'Chat: Family Chat', url: 'beeper://chat/1', type: 'whatsapp' }]
  ]);

  describe('getCitations', () => {
    it('should return empty string for no sources', () => {
      expect(PlanFormatter.getCitations(undefined, sourceMap)).toBe('');
      expect(PlanFormatter.getCitations([], sourceMap)).toBe('');
    });

    it('should format citations with links', () => {
      const sources = ['Email 1'];
      const citation = PlanFormatter.getCitations(sources, sourceMap);
      expect(citation).toBe(' [[src](https://mail.google.com/1)]');
    });

    it('should handle legacy messaging prefix cleanup', () => {
      const sources = ['WhatsApp Chat History (Family Chat)'];
      const citation = PlanFormatter.getCitations(sources, sourceMap);
      expect(citation).toBe(' [[src](beeper://chat/1)]');
    });

    it('should fallback to plain text if source not in map', () => {
      const sources = ['Unknown Source'];
      const citation = PlanFormatter.getCitations(sources, sourceMap);
      expect(citation).toBe(' [Unknown Source]');
    });
  });

  describe('formatMarkdown', () => {
    it('should format a complete plan', () => {
      const plan = {
        homeworkSupport: [{ child: 'Alice', subject: 'Math', description: 'Algebra', dueDate: 'Friday', sources: ['Email 1'] }],
        purchasesNeeded: [],
        upcomingActivities: [],
        announcements: []
      };

      const markdown = PlanFormatter.formatMarkdown(plan, sourceMap);
      expect(markdown).toContain('# WEEKLY PARENTING PLAN');
      expect(markdown).toContain('Alice');
      expect(markdown).toContain('Math');
      expect(markdown).toContain('[[src](https://mail.google.com/1)]');
      expect(markdown).toContain('## 🛒 PURCHASES NEEDED\nNone found.');
    });
  });
});
