import { describe, it, expect } from 'vitest';
import { PlanSlicer } from './slicer.js';

const FIXTURE = `# WEEKLY PARENTING PLAN
*Generated on 5/12/2026*

## 📚 HOMEWORK SUPPORT
- [Graham] **Math**: Algebra worksheet (Due: Tomorrow) [[src](https://mail.google.com/1)]
- [Nora] **Reading**: Chapter 4 (Due: Friday) [[src](https://mail.google.com/2)]
- [Ansel] **Science**: Volcano project (Due: Monday) [[src](https://mail.google.com/3)]

## 🛒 PURCHASES NEEDED
- [HIGH] **Poster board**: For Ansel's science project [[src](https://mail.google.com/3)]

## 🗓️ UPCOMING ACTIVITIES
- **Spring Concert** (Thursday) @ Jefferson Middle School
  *Requirements: Dress code — black pants, white shirt* [[src](https://mail.google.com/4)]

## 📢 ANNOUNCEMENTS
- School photo retake day is Friday. [[src](https://mail.google.com/2)]

---
## 🔍 SOURCES
- [GMAIL] [Email 1](https://mail.google.com/1)
- [GMAIL] [Email 2](https://mail.google.com/2)`;

describe('PlanSlicer', () => {
  describe('parse', () => {
    it('parses sections and items', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      expect(plan.sections.length).toBe(5); // homework, purchases, activities, announcements, sources
      const homework = plan.sections.find(s => s.heading.includes('HOMEWORK'));
      expect(homework?.items).toHaveLength(3);
    });

    it('excludes "None found." items', () => {
      const md = `# PLAN\n\n## 📚 HOMEWORK SUPPORT\nNone found.\n`;
      const plan = PlanSlicer.parse(md);
      expect(plan.sections[0].items).toHaveLength(0);
    });

    it('preserves citations in items', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const homework = plan.sections.find(s => s.heading.includes('HOMEWORK'))!;
      expect(homework.items[0]).toContain('[[src](https://mail.google.com/1)]');
    });

    it('joins multi-line activity items', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const activities = plan.sections.find(s => s.heading.includes('ACTIVITIES'))!;
      expect(activities.items[0]).toContain('Requirements');
    });
  });

  describe('sliceByChild', () => {
    it('includes only that child\'s homework items', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const grahamMd = PlanSlicer.sliceByChild(plan, 'Graham');
      expect(grahamMd).toContain('Algebra');
      expect(grahamMd).not.toContain('Chapter 4'); // Nora's
      expect(grahamMd).not.toContain('Volcano');   // Ansel's
    });

    it('includes shared sections (purchases, activities, announcements)', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const noraMd = PlanSlicer.sliceByChild(plan, 'Nora');
      expect(noraMd).toContain('Poster board');    // purchases
      expect(noraMd).toContain('Spring Concert');  // activities
      expect(noraMd).toContain('photo retake');    // announcements
    });

    it('produces an empty homework section for a child with no items', () => {
      const md = `# PLAN\n\n## 📚 HOMEWORK SUPPORT\n- [Graham] **Math**: Stuff (Due: Friday)\n`;
      const plan = PlanSlicer.parse(md);
      const noraMd = PlanSlicer.sliceByChild(plan, 'Nora');
      expect(noraMd).not.toContain('HOMEWORK'); // section omitted when empty
    });

    it('preserves citations in per-child output', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const anselMd = PlanSlicer.sliceByChild(plan, 'Ansel');
      expect(anselMd).toContain('[[src](https://mail.google.com/3)]');
    });

    it('excludes the SOURCES section', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const grahamMd = PlanSlicer.sliceByChild(plan, 'Graham');
      expect(grahamMd).not.toContain('## 🔍 SOURCES');
    });
  });

  describe('pickTopItems', () => {
    it('returns at most the requested count', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const today = PlanSlicer.pickTopItems(plan, 3);
      // Count occurrences of "> " lines (section labels) as a proxy for item count
      const itemCount = (today.match(/^> /gm) ?? []).length;
      expect(itemCount).toBeLessThanOrEqual(3);
    });

    it('prioritises items with "Tomorrow" due dates before "Friday"', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const today = PlanSlicer.pickTopItems(plan, 5);
      const grahamPos = today.indexOf('Algebra'); // Due: Tomorrow
      const noraPos = today.indexOf('Chapter 4'); // Due: Friday
      expect(grahamPos).toBeLessThan(noraPos);
    });

    it('returns a fallback message when plan is empty', () => {
      const plan = PlanSlicer.parse('# PLAN\n');
      const today = PlanSlicer.pickTopItems(plan, 5);
      expect(today).toContain('No items found');
    });
  });
});
