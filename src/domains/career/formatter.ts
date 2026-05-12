import type { JobApplication } from './types.js';

const STATUS_LABEL: Record<JobApplication['status'], string> = {
  outreach: '📬 Outreach',
  applied: '📝 Applied',
  interviewing: '🎯 Interviewing',
  offered: '🎉 Offered',
  rejected: '❌ Rejected',
  withdrawn: '↩️ Withdrawn',
};

const STATUS_ORDER: JobApplication['status'][] = [
  'offered', 'interviewing', 'applied', 'outreach', 'withdrawn', 'rejected',
];

function gmailLink(emailId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${emailId}`;
}

function citations(emailIds?: string[]): string {
  if (!emailIds || emailIds.length === 0) return '';
  return ' ' + emailIds.map(id => `[[src](${gmailLink(id)})]`).join(' ');
}

export function formatApplications(
  applications: JobApplication[],
  generatedAt: Date = new Date(),
): string {
  const sorted = [...applications].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  const active = sorted.filter(a => !['rejected', 'withdrawn'].includes(a.status));
  const closed = sorted.filter(a => ['rejected', 'withdrawn'].includes(a.status));

  const lines: string[] = [
    '# CAREER — JOB APPLICATIONS',
    `*Updated ${generatedAt.toLocaleDateString()} — ${active.length} active, ${closed.length} closed*`,
  ];

  if (active.length > 0) {
    lines.push('', '## Active');
    for (const app of active) {
      const loc = app.location ? ` · ${app.location}` : '';
      const src = app.source ? ` · via ${app.source}` : '';
      const note = app.notes ? `\n  *${app.notes}*` : '';
      lines.push(
        `- **${app.company}** — ${app.role}${loc}${src} · ${STATUS_LABEL[app.status]} (${app.appliedDate})${citations(app.emailIds)}${note}`,
      );
    }
  }

  if (closed.length > 0) {
    lines.push('', '## Closed');
    for (const app of closed) {
      lines.push(
        `- **${app.company}** — ${app.role} · ${STATUS_LABEL[app.status]} (${app.appliedDate})${citations(app.emailIds)}`,
      );
    }
  }

  if (applications.length === 0) {
    lines.push('', '*No applications found in the last 30 days.*');
  }

  return lines.join('\n');
}

export function formatThisWeek(
  applications: JobApplication[],
  generatedAt: Date = new Date(),
): string {
  const active = applications.filter(a => !['rejected', 'withdrawn'].includes(a.status));

  const lines: string[] = [
    '# CAREER — THIS WEEK',
    `*Updated ${generatedAt.toLocaleDateString()} — ${active.length} active application${active.length === 1 ? '' : 's'}*`,
  ];

  if (active.length === 0) {
    lines.push('', '*No active applications. Run track-job-applications to refresh.*');
    return lines.join('\n');
  }

  const byStatus: Partial<Record<JobApplication['status'], JobApplication[]>> = {};
  for (const app of active) {
    (byStatus[app.status] ??= []).push(app);
  }

  for (const status of STATUS_ORDER) {
    const group = byStatus[status];
    if (!group) continue;
    lines.push('', `### ${STATUS_LABEL[status]}`);
    for (const app of group) {
      const loc = app.location ? ` · ${app.location}` : '';
      const note = app.notes ? ` — ${app.notes}` : '';
      lines.push(`- **${app.company}** — ${app.role}${loc}${note}${citations(app.emailIds)}`);
    }
  }

  return lines.join('\n');
}
