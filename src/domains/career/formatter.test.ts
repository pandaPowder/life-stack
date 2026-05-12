import { describe, it, expect } from 'vitest';
import { formatApplications, formatThisWeek } from './formatter.js';
import type { JobApplication } from './types.js';

const FIXED_DATE = new Date('2026-05-12');

const APPS: JobApplication[] = [
  {
    company: 'Acme Corp',
    role: 'Senior Engineer',
    appliedDate: '2026-05-10',
    status: 'interviewing',
    location: 'Remote',
    emailIds: ['abc123'],
  },
  {
    company: 'Beta Inc',
    role: 'Staff Engineer',
    appliedDate: '2026-05-08',
    status: 'applied',
    source: 'LinkedIn',
    emailIds: ['def456'],
  },
  {
    company: 'Gamma Co',
    role: 'Principal Engineer',
    appliedDate: '2026-05-01',
    status: 'rejected',
    emailIds: ['ghi789'],
  },
];

describe('formatApplications', () => {
  it('includes active and closed sections', () => {
    const md = formatApplications(APPS, FIXED_DATE);
    expect(md).toContain('## Active');
    expect(md).toContain('## Closed');
  });

  it('places interviewing before applied in active section', () => {
    const md = formatApplications(APPS, FIXED_DATE);
    const interviewPos = md.indexOf('Acme Corp');
    const appliedPos = md.indexOf('Beta Inc');
    expect(interviewPos).toBeLessThan(appliedPos);
  });

  it('puts rejected in closed section, not active', () => {
    const md = formatApplications(APPS, FIXED_DATE);
    const closedPos = md.indexOf('## Closed');
    const gammaPos = md.indexOf('Gamma Co');
    expect(gammaPos).toBeGreaterThan(closedPos);
  });

  it('generates gmail citation links from emailIds', () => {
    const md = formatApplications(APPS, FIXED_DATE);
    expect(md).toContain('[[src](https://mail.google.com/mail/u/0/#inbox/abc123)]');
  });

  it('shows active count in header', () => {
    const md = formatApplications(APPS, FIXED_DATE);
    expect(md).toContain('2 active');
  });

  it('handles empty applications gracefully', () => {
    const md = formatApplications([], FIXED_DATE);
    expect(md).toContain('No applications found');
  });
});

describe('formatThisWeek', () => {
  it('only shows active applications', () => {
    const md = formatThisWeek(APPS, FIXED_DATE);
    expect(md).toContain('Acme Corp');
    expect(md).toContain('Beta Inc');
    expect(md).not.toContain('Gamma Co'); // rejected
  });

  it('groups by status with labels', () => {
    const md = formatThisWeek(APPS, FIXED_DATE);
    expect(md).toContain('Interviewing');
    expect(md).toContain('Applied');
  });

  it('preserves citation links', () => {
    const md = formatThisWeek(APPS, FIXED_DATE);
    expect(md).toContain('[[src](https://mail.google.com/mail/u/0/#inbox/abc123)]');
  });

  it('handles no active applications', () => {
    const rejected: JobApplication[] = [
      { company: 'X', role: 'Y', appliedDate: '2026-05-01', status: 'rejected' },
    ];
    const md = formatThisWeek(rejected, FIXED_DATE);
    expect(md).toContain('No active applications');
  });
});
