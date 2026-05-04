import * as fs from 'fs/promises';

export interface SourceLink {
  title: string;
  url?: string | undefined;
  type: 'gmail' | 'whatsapp' | 'sway';
}

export class PlanFormatter {
  /**
   * Generates a cited string for an item based on the source mapping.
   */
  static getCitations(sources: string[] | undefined, sourceMap: Map<string, SourceLink>): string {
    if (!sources || sources.length === 0) return '';
    const links = sources.map(s => {
      // Try exact match, then try removing "WhatsApp Chat History" prefix if AI added it
      const cleanSource = s.replace(/^WhatsApp Chat History \((.*)\)$/, '$1').trim();
      const link = sourceMap.get(s) || sourceMap.get(cleanSource);
      
      if (link && link.url) {
        return `[[src](${link.url})]`;
      }
      return `[${s}]`;
    });
    return ` ${links.join(' ')}`;
  }

  /**
   * Formats the parenting plan into a structured Markdown document with citations.
   */
  static formatMarkdown(plan: any, sourceMap: Map<string, SourceLink>): string {
    const getCitations = (sources?: string[]) => this.getCitations(sources, sourceMap);

    let output = `
# WEEKLY PARENTING PLAN
*Generated on ${new Date().toLocaleDateString()}*

## 📚 HOMEWORK SUPPORT
${plan.homeworkSupport.length === 0 ? 'None found.' : plan.homeworkSupport.map((t: any) => `- [${t.child}] **${t.subject}**: ${t.description} (Due: ${t.dueDate || 'N/A'})${getCitations(t.sources)}`).join('\n')}

## 🛒 PURCHASES NEEDED
${plan.purchasesNeeded.length === 0 ? 'None found.' : plan.purchasesNeeded.map((p: any) => `- [${p.priority.toUpperCase()}] **${p.item}**: ${p.reason}${getCitations(p.sources)}`).join('\n')}

## 🗓️ UPCOMING ACTIVITIES
${plan.upcomingActivities.length === 0 ? 'None found.' : plan.upcomingActivities.map((a: any) => `- **${a.title}** (${a.date}) @ ${a.location || 'School'}${a.requirements?.length ? `\\n  *Requirements: ${a.requirements.join(', ')}*` : ''}${getCitations(a.sources)}`).join('\n')}

## 📢 ANNOUNCEMENTS
${plan.announcements.length === 0 ? 'None found.' : plan.announcements.map((ann: any) => `- ${ann.text}${getCitations(ann.sources)}`).join('\n')}

---
## 🔍 SOURCES
${Array.from(sourceMap.values()).map(s => `- [${s.type.toUpperCase()}] ${s.url ? `[${s.title}](${s.url})` : s.title}`).join('\n')}
`;
    return output.trim();
  }

  /**
   * Writes the formatted plan to a file.
   */
  static async writeToFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content);
  }
}
