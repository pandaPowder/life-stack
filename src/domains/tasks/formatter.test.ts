import { describe, it, expect } from 'vitest';
import { formatTasks } from './formatter.js';
import type { TodoistTask } from './types.js';

const FIXED_DATE = new Date('2026-05-13T12:00:00.000Z');

const TASKS: TodoistTask[] = [
  {
    id: '1',
    content: 'Follow up with WGU recruiter',
    priority: 4,
    due: { date: '2026-05-13', string: 'today' },
    url: 'https://todoist.com/app/task/1',
  },
  {
    id: '2',
    content: 'Review child school schedule',
    priority: 2,
    due: { date: '2026-05-12', string: 'yesterday' },
    url: 'https://todoist.com/app/task/2',
  },
  {
    id: '3',
    content: 'Send resume to Acme',
    priority: 3,
    url: 'https://todoist.com/app/task/3',
  },
];

describe('formatTasks', () => {
  it('renders a header with the date', () => {
    const md = formatTasks(TASKS, FIXED_DATE);
    expect(md).toContain('Tasks — Today & Overdue');
    expect(md).toContain('Wednesday');
  });

  it('renders priority sections in descending order', () => {
    const md = formatTasks(TASKS, FIXED_DATE);
    const urgentPos = md.indexOf('## Urgent');
    const highPos = md.indexOf('## High');
    const medPos = md.indexOf('## Medium');
    expect(urgentPos).toBeLessThan(highPos);
    expect(highPos).toBeLessThan(medPos);
  });

  it('links each task to its Todoist URL', () => {
    const md = formatTasks(TASKS, FIXED_DATE);
    expect(md).toContain('[Follow up with WGU recruiter](https://todoist.com/app/task/1)');
  });

  it('includes due string when present', () => {
    const md = formatTasks(TASKS, FIXED_DATE);
    expect(md).toContain('_(due today)_');
  });

  it('omits due string when absent', () => {
    const md = formatTasks(TASKS, FIXED_DATE);
    // task 3 has no due date — should not have "_(due"
    const task3Line = md.split('\n').find((l) => l.includes('Send resume'));
    expect(task3Line).not.toContain('_(due');
  });

  it('handles empty task list gracefully', () => {
    const md = formatTasks([], FIXED_DATE);
    expect(md).toContain('No tasks due today or overdue');
  });

  it('renders Normal priority (1) tasks under a Normal heading', () => {
    const lowPri: TodoistTask[] = [
      { id: '99', content: 'Low priority thing', priority: 1, url: 'https://todoist.com/app/task/99' },
    ];
    const md = formatTasks(lowPri, FIXED_DATE);
    expect(md).toContain('## Normal');
    expect(md).toContain('Low priority thing');
  });

  it('groups multiple same-priority tasks under one heading', () => {
    const tasks: TodoistTask[] = [
      { id: '1', content: 'First high', priority: 3, url: 'https://todoist.com/app/task/1' },
      { id: '2', content: 'Second high', priority: 3, url: 'https://todoist.com/app/task/2' },
    ];
    const md = formatTasks(tasks, FIXED_DATE);
    const headingCount = (md.match(/^## High$/gm) ?? []).length;
    expect(headingCount).toBe(1);
    expect(md).toContain('First high');
    expect(md).toContain('Second high');
  });
});
