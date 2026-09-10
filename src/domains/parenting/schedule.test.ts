import { describe, it, expect } from 'vitest';
import { formatScheduleContext } from './schedule.js';
import type { SchedulesConfig } from '../../config/schedules.js';

describe('formatScheduleContext', () => {
  it('returns an empty string when there are no children configured', () => {
    expect(formatScheduleContext({ children: [] })).toBe('');
  });

  it('formats a single child with classes on both days', () => {
    const config: SchedulesConfig = {
      children: [
        {
          name: 'Nora',
          school: 'Farmington Jr High',
          grade: '9',
          classes: [
            { day: 'B', period: 5, subject: 'AP Environmental Science', teacher: 'Horton' },
            { day: 'A', period: 2, subject: 'Honors DLI Spanish 5 AP', teacher: 'Cifuentes' },
            { day: 'A', period: 1, subject: 'Choir 3 Concert', teacher: 'Charlton' },
          ],
        },
      ],
    };

    const result = formatScheduleContext(config);

    expect(result).toContain('AUTHORITATIVE CURRENT CLASS SCHEDULES');
    expect(result).toContain('Nora (Farmington Jr High, grade 9)');
    // Classes should be ordered by period within each day.
    expect(result).toContain('A-Day: Choir 3 Concert (Charlton), Honors DLI Spanish 5 AP (Cifuentes)');
    expect(result).toContain('B-Day: AP Environmental Science (Horton)');
  });

  it('labels a day with no classes as "none listed"', () => {
    const config: SchedulesConfig = {
      children: [
        {
          name: 'Ansel',
          school: 'Canyon Creek Elementary',
          grade: '5',
          classes: [{ day: 'A', period: 1, subject: 'Dli Spanish Grade 5', teacher: 'Soriano Bautista' }],
        },
      ],
    };

    const result = formatScheduleContext(config);

    expect(result).toContain('A-Day: Dli Spanish Grade 5 (Soriano Bautista)');
    expect(result).toContain('B-Day: none listed');
  });

  it('formats multiple children as separate sections', () => {
    const config: SchedulesConfig = {
      children: [
        { name: 'Graham', school: 'Farmington High School', grade: '10', classes: [] },
        { name: 'Nora', school: 'Farmington Jr High', grade: '9', classes: [] },
      ],
    };

    const result = formatScheduleContext(config);

    expect(result).toContain('Graham (Farmington High School, grade 10)');
    expect(result).toContain('Nora (Farmington Jr High, grade 9)');
  });
});
