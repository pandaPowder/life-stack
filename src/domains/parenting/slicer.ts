export interface ParsedSection {
  heading: string;
  emoji: string;
  items: string[];
}

export interface ParsedPlan {
  header: string;
  sections: ParsedSection[];
}

import { userConfig } from '../../config/user.js';

function extractEmoji(heading: string): string {
  return heading.match(/\p{Emoji}/u)?.[0] ?? '';
}

// Matches items tagged with a specific child's first name, e.g. [Alex] or [Alex Smith]
function childTagPattern(child: string) {
  return new RegExp(`^- \\[${child}([ \\]]|$)`, 'i');
}

// Matches any item tagged with one of the known children's first names
function anyChildPattern(children: string[]) {
  return new RegExp(`^- \\[(${children.join('|')})([ \\]]|$)`, 'i');
}

// Urgency score for a due-date string (lower = more urgent)
function dueDateScore(dueDate: string): number {
  const lower = dueDate.toLowerCase();
  if (lower.includes('today')) return 0;
  if (lower.includes('tomorrow')) return 1;
  if (/mon|tue|wed|thu|fri|sat|sun/.test(lower)) return 2;
  if (lower === 'n/a') return 99;
  return 3;
}

export class PlanSlicer {
  static parse(markdown: string): ParsedPlan {
    const lines = markdown.split('\n');
    const sections: ParsedSection[] = [];
    let headerLines: string[] = [];
    let currentSection: ParsedSection | null = null;
    let pendingItem: string | null = null;
    let inHeader = true;

    const flushItem = () => {
      if (pendingItem !== null && currentSection) {
        if (pendingItem !== 'None found.') currentSection.items.push(pendingItem);
        pendingItem = null;
      }
    };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        flushItem();
        if (inHeader) inHeader = false;
        if (currentSection) sections.push(currentSection);
        currentSection = { heading: line, emoji: extractEmoji(line), items: [] };
      } else if (inHeader) {
        headerLines.push(line);
      } else if (line === '---') {
        // separator before SOURCES — flush and ignore
        flushItem();
      } else if (currentSection) {
        if (line.startsWith('- ')) {
          flushItem();
          pendingItem = line;
        } else if (pendingItem !== null && line.match(/^\s+\S/)) {
          pendingItem += '\n' + line;
        } else {
          flushItem();
        }
      }
    }
    flushItem();
    if (currentSection) sections.push(currentSection);

    return { header: headerLines.join('\n').trim(), sections };
  }

  static sliceByChild(plan: ParsedPlan, child: string, allChildren: string[] = userConfig.children): string {
    const isChildItem = childTagPattern(child);
    const childPat = anyChildPattern(allChildren);
    const lines: string[] = [
      `# ${child.toUpperCase()} — THIS WEEK`,
      `*Derived from weekly parenting plan — ${new Date().toLocaleDateString()}*`,
    ];

    for (const section of plan.sections) {
      if (section.heading.includes('SOURCES')) continue;

      // If section has any child-tagged items, include only this child's
      // (homework). Otherwise include everything (purchases, activities,
      // announcements are shared).
      const sectionHasChildTags = section.items.some(i => childPat.test(i));
      const items = sectionHasChildTags
        ? section.items.filter(i => isChildItem.test(i))
        : section.items;

      if (items.length === 0) continue;

      lines.push('', section.heading, ...items);
    }

    return lines.join('\n').trim();
  }

  static pickTopItems(plan: ParsedPlan, count: number): string {
    interface ScoredItem {
      item: string;
      sectionLabel: string;
      score: number;
    }
    const scored: ScoredItem[] = [];

    for (const section of plan.sections) {
      if (section.heading.includes('SOURCES')) continue;
      const label = section.heading.replace(/^##\s*\p{Emoji}\s*/u, '').trim();

      for (const item of section.items) {
        const dueDateMatch = item.match(/\(Due:\s*([^)]+)\)/i);
        let score: number;
        if (dueDateMatch) {
          score = dueDateScore(dueDateMatch[1]!.trim());
        } else if (section.heading.includes('ACTIVITIES')) {
          score = 4;
        } else if (section.heading.includes('PURCHASES')) {
          score = 5;
        } else {
          score = 6;
        }
        scored.push({ item, sectionLabel: label, score });
      }
    }

    scored.sort((a, b) => a.score - b.score);

    const top = scored.slice(0, count);
    if (top.length === 0) return '*No items found in weekly plan.*';

    const lines = [
      '# TODAY',
      `*Top ${top.length} items — ${new Date().toLocaleDateString()}*`,
    ];

    for (const { item, sectionLabel } of top) {
      lines.push('', `> ${sectionLabel}`, item);
    }

    return lines.join('\n').trim();
  }
}
