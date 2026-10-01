import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ScheduledClass {
  /** A-Day or B-Day (alternating-day secondary schedule) */
  day: 'A' | 'B';
  /** Class period number */
  period: number;
  /** Course/subject name, as it appears on the school's schedule */
  subject: string;
  /** Teacher's name */
  teacher: string;
}

export interface ChildSchedule {
  /** Child's first name — should match an entry in user.config.json's `children` array */
  name: string;
  school: string;
  grade: string;
  classes: ScheduledClass[];
}

export interface SchedulesConfig {
  children: ChildSchedule[];
}

const CONFIG_PATH = join(process.cwd(), 'schedules.config.json');

function loadConfig(): SchedulesConfig {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as SchedulesConfig;
  }
  return { children: [] };
}

export const schedulesConfig: SchedulesConfig = loadConfig();
