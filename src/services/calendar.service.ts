import { google } from 'googleapis';
import type { CalendarEvent } from '../domains/career/types.js';

const JOB_KEYWORDS = /interview|recruiter|recruiting|screening|hiring|coding challenge|coding assessment|technical assessment/i;

export class CalendarService {
  private calendar;

  constructor(auth: any) {
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async fetchJobRelatedEvents(lookbackDays = 30, lookaheadDays = 14): Promise<CalendarEvent[]> {
    const now = new Date();
    const timeMin = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000).toISOString();

    const res = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = res.data.items ?? [];
    const events: CalendarEvent[] = [];

    for (const item of items) {
      const title = item.summary ?? '';
      const description = item.description ?? '';

      if (!JOB_KEYWORDS.test(title) && !JOB_KEYWORDS.test(description)) continue;

      const event: CalendarEvent = {
        id: item.id ?? '',
        title,
        start: item.start?.dateTime ?? item.start?.date ?? '',
      };
      const end = item.end?.dateTime ?? item.end?.date;
      if (end) event.end = end;
      if (description) event.description = description.slice(0, 500);
      if (item.location) event.location = item.location;
      const attendees = item.attendees?.map(a => a.email ?? '').filter(Boolean);
      if (attendees?.length) event.attendees = attendees;
      events.push(event);
    }

    console.log(`[Calendar] Found ${events.length} job-related event(s).`);
    return events;
  }
}
