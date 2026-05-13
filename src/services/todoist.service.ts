import { TodoistApi } from '@doist/todoist-api-typescript';
import type { TodoistTask } from '../domains/tasks/types.js';

function toTodoistTask(t: Awaited<ReturnType<TodoistApi['getTasksByFilter']>>['results'][number]): TodoistTask {
  return {
    id: t.id,
    content: t.content,
    priority: t.priority as TodoistTask['priority'],
    ...(t.due ? { due: { date: t.due.date, string: t.due.string } } : {}),
    url: `https://todoist.com/app/task/${t.id}`,
  };
}

export class TodoistService {
  private api: TodoistApi;

  constructor(token: string) {
    this.api = new TodoistApi(token);
  }

  async getTasks(filter = 'today | overdue'): Promise<TodoistTask[]> {
    const res = await this.api.getTasksByFilter({ query: filter });
    return res.results.map(toTodoistTask);
  }

  async createTask(content: string, dueString?: string): Promise<void> {
    await this.api.addTask({ content, ...(dueString ? { dueLang: 'en', dueString } : {}) });
  }
}
