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

  it('renders notes inline', () => {
    const apps: JobApplication[] = [
      {
        company: 'Noteworthy', role: 'SWE', appliedDate: '2026-05-10', status: 'interviewing',
        notes: 'Onsite next week',
      },
    ];
    const md = formatThisWeek(apps, FIXED_DATE);
    expect(md).toContain('Onsite next week');
  });

  it('uses singular "application" when count is 1', () => {
    const apps: JobApplication[] = [
      { company: 'Solo', role: 'Dev', appliedDate: '2026-05-10', status: 'applied' },
    ];
    const md = formatThisWeek(apps, FIXED_DATE);
    expect(md).toContain('1 active application*');
  });
});

describe('formatApplications — edge cases', () => {
  it('puts withdrawn applications in the Closed section', () => {
    const apps: JobApplication[] = [
      { company: 'Zeta Ltd', role: 'Engineer', appliedDate: '2026-05-05', status: 'withdrawn' },
    ];
    const md = formatApplications(apps, FIXED_DATE);
    const closedPos = md.indexOf('## Closed');
    const zetaPos = md.indexOf('Zeta Ltd');
    expect(closedPos).toBeGreaterThanOrEqual(0);
    expect(zetaPos).toBeGreaterThan(closedPos);
  });

  it('renders the notes field as an italic snippet', () => {
    const apps: JobApplication[] = [
      {
        company: 'Acme', role: 'Dev', appliedDate: '2026-05-10', status: 'applied',
        notes: 'Referral from Jane',
      },
    ];
    const md = formatApplications(apps, FIXED_DATE);
    expect(md).toContain('Referral from Jane');
  });

  it('renders multiple emailIds as multiple citation links', () => {
    const apps: JobApplication[] = [
      {
        company: 'Multi', role: 'Dev', appliedDate: '2026-05-10', status: 'applied',
        emailIds: ['id1', 'id2'],
      },
    ];
    const md = formatApplications(apps, FIXED_DATE);
    expect(md).toContain('[[src](https://mail.google.com/mail/u/0/#inbox/id1)]');
    expect(md).toContain('[[src](https://mail.google.com/mail/u/0/#inbox/id2)]');
  });

  it('omits citation suffix when emailIds is absent', () => {
    const apps: JobApplication[] = [
      { company: 'NoCite', role: 'Dev', appliedDate: '2026-05-10', status: 'applied' },
    ];
    const md = formatApplications(apps, FIXED_DATE);
    expect(md).not.toContain('[[src]');
  });
});
