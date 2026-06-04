import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from './generate-parenting-plan.js';
import { OFWService } from '../services/ofw.service.js';
import { AuthService } from '../services/auth.service.js';
import { ContextGatherer } from '../services/context-gatherer.service.js';
import { AIService } from '../services/ai.service.js';

vi.mock('../services/auth.service.js');
vi.mock('../services/gmail.service.js');
vi.mock('../services/drive.service.js');
vi.mock('../services/sway.service.js');
vi.mock('../services/beeper.service.js');
vi.mock('../services/ofw.service.js');
vi.mock('../services/ai.service.js');
vi.mock('../services/context-gatherer.service.js');

const EMPTY_CTX = {
  emails: [],
  beeperMessages: [],
  ofwMessages: [],
  driveContext: '',
  rawText: '',
  sourceMap: new Map(),
};

describe('generate-parenting-plan', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    vi.mocked(AuthService.prototype.authorize).mockResolvedValue(undefined);
    vi.mocked(ContextGatherer.prototype.gather).mockResolvedValue(EMPTY_CTX);
    vi.mocked(AIService.prototype.generateParentingPlan).mockResolvedValue({
      homeworkSupport: [],
      purchasesNeeded: [],
      upcomingActivities: [],
      announcements: [],
      routinesAndTransitions: [],
    } as any);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.clearAllMocks();
  });

  it('passes skipOfw=true to gatherer when --skip-ofw is provided', async () => {
    process.argv = ['node', 'generate-parenting-plan.ts', '-k', 'fake-key', '--skip-ofw'];

    await run();

    expect(ContextGatherer.prototype.gather).toHaveBeenCalledWith(
      expect.objectContaining({ skipOfw: true }),
    );
  });

  it('passes ofwPdf path to gatherer when --ofw-pdf is provided', async () => {
    process.argv = ['node', 'generate-parenting-plan.ts', '-k', 'fake-key', '--ofw-pdf', '/fake/path.pdf'];

    await run();

    expect(ContextGatherer.prototype.gather).toHaveBeenCalledWith(
      expect.objectContaining({ ofwPdf: '/fake/path.pdf' }),
    );
  });

  it('does not call OFWService directly — delegates to ContextGatherer', async () => {
    process.argv = ['node', 'generate-parenting-plan.ts', '-k', 'fake-key'];
    const downloadSpy = vi.spyOn(OFWService.prototype, 'downloadRecentMessages');
    const parseSpy = vi.spyOn(OFWService.prototype, 'parseFromPdf');

    await run();

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(parseSpy).not.toHaveBeenCalled();
  });
});
