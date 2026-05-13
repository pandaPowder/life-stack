import dotenv from 'dotenv';
dotenv.config({ override: true });
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TodoistService } from '../services/todoist.service.js';
import { formatTasks } from '../domains/tasks/formatter.js';

const OUTPUT_FILE = path.join(process.cwd(), 'data', 'tasks', 'today.md');

export async function run(): Promise<void> {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token) {
    console.warn('[sync-tasks] TODOIST_API_TOKEN not set — skipping.');
    return;
  }

  const service = new TodoistService(token);
  const tasks = await service.getTasks();
  console.log(`[sync-tasks] Fetched ${tasks.length} task(s).`);

  const md = formatTasks(tasks);

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, md, 'utf8');
  console.log(`[sync-tasks] Wrote ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
