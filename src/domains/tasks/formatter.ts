import type { TodoistTask } from './types.js';

const PRIORITY_LABEL: Record<TodoistTask['priority'], string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Normal',
};

export function formatTasks(tasks: TodoistTask[], now = new Date()): string {
  if (tasks.length === 0) {
    return `# Tasks — Today & Overdue\n\n_No tasks due today or overdue._\n`;
  }

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const byPriority = new Map<TodoistTask['priority'], TodoistTask[]>();
  for (const task of tasks) {
    const p = task.priority;
    if (!byPriority.has(p)) byPriority.set(p, []);
    byPriority.get(p)!.push(task);
  }

  const sections: string[] = [`# Tasks — Today & Overdue (${dateStr})\n`];

  // Render highest priority first (4 → 1)
  for (const priority of [4, 3, 2, 1] as TodoistTask['priority'][]) {
    const group = byPriority.get(priority);
    if (!group) continue;

    sections.push(`## ${PRIORITY_LABEL[priority]}`);
    for (const task of group) {
      const due = task.due ? ` _(due ${task.due.string})_` : '';
      sections.push(`- [${task.content}](${task.url})${due}`);
    }
  }

  return sections.join('\n') + '\n';
}
