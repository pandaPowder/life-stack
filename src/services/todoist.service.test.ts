import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodoistService } from './todoist.service.js';

const mockGetTasksByFilter = vi.fn();
const mockAddTask = vi.fn();

vi.mock('@doist/todoist-api-typescript', () => ({
  TodoistApi: vi.fn(function (this: any) {
    this.getTasksByFilter = mockGetTasksByFilter;
    this.addTask = mockAddTask;
  }),
}));

const MOCK_API_TASKS = [
  {
    id: '1',
    content: 'Follow up with WGU recruiter',
    priority: 4,
    due: { date: '2026-05-13', string: 'today', isRecurring: false },
  },
  {
    id: '2',
    content: 'Review child school schedule',
    priority: 2,
    due: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTasksByFilter.mockResolvedValue({ results: MOCK_API_TASKS });
});

describe('TodoistService.getTasks', () => {
  it('returns mapped tasks with constructed URLs', async () => {
    const service = new TodoistService('test-token');
    const tasks = await service.getTasks();

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({
      id: '1',
      content: 'Follow up with WGU recruiter',
      priority: 4,
      due: { date: '2026-05-13', string: 'today' },
      url: 'https://todoist.com/app/task/1',
    });
  });

  it('maps null due to undefined', async () => {
    const service = new TodoistService('test-token');
    const tasks = await service.getTasks();
    expect(tasks[1]!.due).toBeUndefined();
  });

  it('uses default filter when none provided', async () => {
    const service = new TodoistService('test-token');
    await service.getTasks();
    expect(mockGetTasksByFilter).toHaveBeenCalledWith({ query: 'today | overdue' });
  });

  it('passes custom filter through', async () => {
    const service = new TodoistService('test-token');
    await service.getTasks('p1');
    expect(mockGetTasksByFilter).toHaveBeenCalledWith({ query: 'p1' });
  });
});
