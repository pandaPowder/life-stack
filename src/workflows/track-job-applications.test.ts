import { describe, it, expect } from 'vitest';

// The OR-joined query string from the workflow module.
// We reconstruct it here rather than importing the private const so the test
// stays independent of module internals — but it must stay in sync with
// GMAIL_QUERY in track-job-applications.ts.
const GMAIL_QUERY = [
  'subject:opportunity',
  'subject:interview',
  'subject:offer',
  'subject:"job opportunity"',
  'subject:"open role"',
  'subject:"your application"',
  'subject:recruiting',
  'subject:availability',
  'subject:schedule',
  'subject:"your profile"',
  'subject:"quick call"',
  'subject:"quick chat"',
  'from:linkedin.com',
  'from:greenhouse.io',
  'from:lever.co',
  'from:ashbyhq.com',
  'from:workday.com',
  'from:smartrecruiters.com',
].join(' OR ');

// Minimal simulation of Gmail's subject/from matching against the OR query.
// Returns true if any clause in the query matches the email.
function matchesQuery(query: string, email: { subject: string; from: string }): boolean {
  return query.split(' OR ').some(clause => {
    if (clause.startsWith('subject:')) {
      const term = clause.slice('subject:'.length).replace(/^"|"$/g, '').toLowerCase();
      return email.subject.toLowerCase().includes(term);
    }
    if (clause.startsWith('from:')) {
      const term = clause.slice('from:'.length).toLowerCase();
      return email.from.toLowerCase().includes(term);
    }
    return false;
  });
}

describe('GMAIL_QUERY', () => {
  it('matches WGU direct recruiter email (Call Availability subject)', () => {
    expect(
      matchesQuery(GMAIL_QUERY, {
        subject: 'Western Governors University - Call Availability',
        from: 'michael.maxfield@wgu.edu',
      }),
    ).toBe(true);
  });

  it('matches ATS-sent application confirmation', () => {
    expect(
      matchesQuery(GMAIL_QUERY, {
        subject: 'Your application at Acme Corp',
        from: 'no-reply@greenhouse.io',
      }),
    ).toBe(true);
  });

  it('matches interview scheduling request', () => {
    expect(
      matchesQuery(GMAIL_QUERY, {
        subject: 'Schedule a call — Senior Engineer role',
        from: 'recruiter@somecompany.com',
      }),
    ).toBe(true);
  });

  it('matches LinkedIn InMail forward', () => {
    expect(
      matchesQuery(GMAIL_QUERY, {
        subject: 'Your profile matches our open TPM role',
        from: 'inmail@linkedin.com',
      }),
    ).toBe(true);
  });

  it('does not match an unrelated email', () => {
    expect(
      matchesQuery(GMAIL_QUERY, {
        subject: 'Your Amazon order has shipped',
        from: 'shipment-tracking@amazon.com',
      }),
    ).toBe(false);
  });
});
