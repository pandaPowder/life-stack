import { describe, it, expect, vi } from 'vitest';
import { ContextGatherer } from './context-gatherer.service.js';

function makeGmail(emails: any[] = []) {
  return { fetchMessages: vi.fn().mockResolvedValue(emails) };
}

function makeDrive(content = '') {
  return { getAIContextFolderContent: vi.fn().mockResolvedValue(content) };
}

function makeBeeper(messages: any[] = []) {
  return {
    findChatIDs: vi.fn().mockResolvedValue(['chat1']),
    getRecentMessages: vi.fn().mockResolvedValue(messages),
    formatMessagesForAI: vi.fn().mockReturnValue(''),
  };
}

function makeSway() {
  return { scrapeSway: vi.fn().mockResolvedValue('') };
}

describe('ContextGatherer', () => {
  it('returns GatheredContext shape with empty inputs', async () => {
    const gatherer = new ContextGatherer({
      gmail: makeGmail() as any,
      drive: makeDrive() as any,
      beeper: makeBeeper() as any,
      sway: makeSway() as any,
    });

    const ctx = await gatherer.gather({
      query: 'label:kids',
      days: 7,
      skipEmails: false,
      chatNames: [],
    });

    expect(ctx.emails).toHaveLength(0);
    expect(ctx.beeperMessages).toHaveLength(0);
    expect(ctx.driveContext).toBe('');
    expect(ctx.rawText).toBe('');
    expect(ctx.sourceMap).toBeInstanceOf(Map);
    expect(ctx.sourceMap.size).toBe(0);
  });

  it('populates emails and sourceMap from fetched emails', async () => {
    const email = {
      id: 'msg1',
      sender: 'teacher@school.edu',
      subject: 'Weekly Update',
      body: 'Homework due Friday.',
      date: new Date(),
      swayLinks: [],
    };

    const gatherer = new ContextGatherer({
      gmail: makeGmail([email]) as any,
      drive: makeDrive() as any,
      beeper: makeBeeper() as any,
      sway: makeSway() as any,
    });

    const ctx = await gatherer.gather({
      query: 'label:kids',
      days: 7,
      skipEmails: false,
      chatNames: [],
    });

    expect(ctx.emails).toHaveLength(1);
    expect(ctx.sourceMap.has('Weekly Update')).toBe(true);
    expect(ctx.sourceMap.get('Weekly Update')?.type).toBe('gmail');
    expect(ctx.rawText).toContain('Homework due Friday.');
  });

  it('skips email fetching when skipEmails is true', async () => {
    const fetchMessages = vi.fn().mockResolvedValue([]);
    const gatherer = new ContextGatherer({
      gmail: { fetchMessages } as any,
      drive: makeDrive() as any,
      beeper: makeBeeper() as any,
      sway: makeSway() as any,
    });

    await gatherer.gather({
      query: 'label:kids',
      days: 7,
      skipEmails: true,
      chatNames: [],
    });

    expect(fetchMessages).not.toHaveBeenCalled();
  });

  it('applies SCHOOL_NOISE_FILTER to the Gmail query', async () => {
    const fetchMessages = vi.fn().mockResolvedValue([]);
    const gatherer = new ContextGatherer({
      gmail: { fetchMessages } as any,
      drive: makeDrive() as any,
      beeper: makeBeeper() as any,
      sway: makeSway() as any,
    });

    await gatherer.gather({
      query: 'label:kids',
      days: 7,
      skipEmails: false,
      chatNames: [],
    });

    const calledQuery = fetchMessages.mock.calls[0]![0] as string;
    expect(calledQuery).toContain('-subject:"Assignment Graded"');
    expect(calledQuery).toContain('label:kids');
  });
});
