import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from './generate-parenting-plan.js';
import { OFWService } from '../services/ofw.service.js';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { DriveService } from '../services/drive.service.js';
import { AIService } from '../services/ai.service.js';
import { BeeperService } from '../services/beeper.service.js';

vi.mock('../services/auth.service.js');
vi.mock('../services/gmail.service.js');
vi.mock('../services/drive.service.js');
vi.mock('../services/ai.service.js');
vi.mock('../services/beeper.service.js');
vi.mock('../services/ofw.service.js');

describe('generate-parenting-plan', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    vi.mocked(AuthService.prototype.authorize).mockResolvedValue(undefined);
    vi.mocked(DriveService.prototype.getAIContextFolderContent).mockResolvedValue('');
    vi.mocked(GmailService.prototype.fetchRecentSchoolEmails).mockResolvedValue([]);
    vi.mocked(BeeperService.prototype.findChatIDs).mockResolvedValue([]);
    vi.mocked(AIService.prototype.generateParentingPlan).mockResolvedValue({
      homeworkSupport: [],
      purchasesNeeded: [],
      upcomingActivities: [],
      announcements: [],
      routinesAndTransitions: []
    } as any);
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.clearAllMocks();
  });

  it('skips OFW download when --skip-ofw is provided', async () => {
    process.argv = ['node', 'generate-parenting-plan.ts', '-k', 'fake-key', '--skip-ofw'];
    const downloadSpy = vi.spyOn(OFWService.prototype, 'downloadRecentMessages');
    const parseSpy = vi.spyOn(OFWService.prototype, 'parseFromPdf');
    
    // Stub console.log to avoid noise during test run, but still let the workflow run
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    await run();

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(parseSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping OFW as requested'));
  });

  it('uses parseFromPdf when --ofw-pdf is provided', async () => {
    process.argv = ['node', 'generate-parenting-plan.ts', '-k', 'fake-key', '--ofw-pdf', '/fake/path.pdf'];
    const downloadSpy = vi.spyOn(OFWService.prototype, 'downloadRecentMessages');
    const parseSpy = vi.spyOn(OFWService.prototype, 'parseFromPdf').mockReturnValue([]);
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    await run();

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(parseSpy).toHaveBeenCalledWith('/fake/path.pdf');
  });
});
