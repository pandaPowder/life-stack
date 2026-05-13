import { describe, it, expect } from 'vitest';
import { PlanSlicer } from './slicer.js';

const CHILDREN = ['Alex', 'Sam', 'Jordan'];

const FIXTURE = `# WEEKLY PARENTING PLAN
*Generated on 5/12/2026*

## 📚 HOMEWORK SUPPORT
- [Alex] **Math**: Algebra worksheet (Due: Tomorrow) [[src](https://mail.google.com/1)]
- [Sam] **Reading**: Chapter 4 (Due: Friday) [[src](https://mail.google.com/2)]
- [Jordan] **Science**: Volcano project (Due: Monday) [[src](https://mail.google.com/3)]

## 🛒 PURCHASES NEEDED
- [HIGH] **Poster board**: For Jordan's science project [[src](https://mail.google.com/3)]

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
      const alexMd = PlanSlicer.sliceByChild(plan, 'Alex', CHILDREN);
      expect(alexMd).toContain('Algebra');
      expect(alexMd).not.toContain('Chapter 4'); // Sam's
      expect(alexMd).not.toContain('Volcano');   // Jordan's
    });

    it('includes shared sections (purchases, activities, announcements)', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const samMd = PlanSlicer.sliceByChild(plan, 'Sam', CHILDREN);
      expect(samMd).toContain('Poster board');    // purchases
      expect(samMd).toContain('Spring Concert');  // activities
      expect(samMd).toContain('photo retake');    // announcements
    });

    it('produces an empty homework section for a child with no items', () => {
      const md = `# PLAN\n\n## 📚 HOMEWORK SUPPORT\n- [Alex] **Math**: Stuff (Due: Friday)\n`;
      const plan = PlanSlicer.parse(md);
      const samMd = PlanSlicer.sliceByChild(plan, 'Sam', CHILDREN);
      expect(samMd).not.toContain('HOMEWORK'); // section omitted when empty
    });

    it('preserves citations in per-child output', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const jordanMd = PlanSlicer.sliceByChild(plan, 'Jordan', CHILDREN);
      expect(jordanMd).toContain('[[src](https://mail.google.com/3)]');
    });

    it('excludes the SOURCES section', () => {
      const plan = PlanSlicer.parse(FIXTURE);
      const alexMd = PlanSlicer.sliceByChild(plan, 'Alex', CHILDREN);
      expect(alexMd).not.toContain('## 🔍 SOURCES');
    });

    it('matches full names like [Alex Smith] to the Alex slice', () => {
      const md = `# PLAN\n\n## 📚 HOMEWORK SUPPORT\n- [Alex Smith] **Math**: Stuff (Due: Friday)\n- [Sam Smith] **Reading**: Things (Due: Monday)\n`;
      const plan = PlanSlicer.parse(md);
      const alexMd = PlanSlicer.sliceByChild(plan, 'Alex', CHILDREN);
      expect(alexMd).toContain('Stuff');
      expect(alexMd).not.toContain('Things');
      const samMd = PlanSlicer.sliceByChild(plan, 'Sam', CHILDREN);
      expect(samMd).toContain('Things');
      expect(samMd).not.toContain('Stuff');
    });

    it('does not include other children\'s homework in Jordan\'s slice when none exists for them', () => {
      const md = `# PLAN\n\n## 📚 HOMEWORK SUPPORT\n- [Alex Smith] **Math**: Stuff (Due: Friday)\n`;
      const plan = PlanSlicer.parse(md);
      const jordanMd = PlanSlicer.sliceByChild(plan, 'Jordan', CHILDREN);
      expect(jordanMd).not.toContain('HOMEWORK');
      expect(jordanMd).not.toContain('Stuff');
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
      const alexPos = today.indexOf('Algebra'); // Due: Tomorrow
      const samPos = today.indexOf('Chapter 4'); // Due: Friday
      expect(alexPos).toBeLessThan(samPos);
    });

    it('returns a fallback message when plan is empty', () => {
      const plan = PlanSlicer.parse('# PLAN\n');
      const today = PlanSlicer.pickTopItems(plan, 5);
      expect(today).toContain('No items found');
    });
  });
});
