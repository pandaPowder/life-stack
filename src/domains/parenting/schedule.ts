import type { ChildSchedule, SchedulesConfig } from '../../config/schedules.js';

const DAYS: Array<'A' | 'B'> = ['A', 'B'];

function formatChildSchedule(child: ChildSchedule): string {
  const dayLines = DAYS.map(day => {
    const classes = child.classes
      .filter(c => c.day === day)
      .sort((a, b) => a.period - b.period)
      .map(c => `${c.subject} (${c.teacher})`)
      .join(', ');
    return `  ${day}-Day: ${classes || 'none listed'}`;
  });

  return `- ${child.name} (${child.school}, grade ${child.grade}):\n${dayLines.join('\n')}`;
}

/**
 * Renders the structured schedules config as an authoritative, deterministic
 * text block for the AI prompt — used to correctly attribute a course/teacher
 * mentioned in an email to the right child, even if other context (e.g. the
 * Drive "AI Context" docs) is stale.
 *
 * Returns '' when no children are configured, so this is a clean no-op for
 * anyone who hasn't filled in schedules.config.json.
 */
export function formatScheduleContext(config: SchedulesConfig): string {
  if (!config.children || config.children.length === 0) return '';

  const sections = config.children.map(formatChildSchedule).join('\n\n');
  return `AUTHORITATIVE CURRENT CLASS SCHEDULES — use this, not older notes, to determine which child a class/course/teacher belongs to:\n${sections}`;
}
