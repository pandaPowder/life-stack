import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { buildContext } from './ask.js';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ask-test-'));
}

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

afterEach(() => vi.restoreAllMocks());

describe('buildContext', () => {
  it('includes today.md and per-child files when they exist', async () => {
    const dir = await makeTempDir();
    const dataDir = path.join(dir, 'data');

    await writeFile(path.join(dataDir, 'today.md'), '# TODAY\n- Urgent item');
    await writeFile(path.join(dataDir, 'kids', 'graham', 'this-week.md'), '# GRAHAM\n- Graham task');
    await writeFile(path.join(dataDir, 'kids', 'nora', 'this-week.md'), '# NORA\n- Nora task');

    const ctx = await buildContext(dataDir, path.join(dir, 'weekly.md'));

    expect(ctx).toContain('Urgent item');
    expect(ctx).toContain('Graham task');
    expect(ctx).toContain('Nora task');

    await fs.rm(dir, { recursive: true });
  });

  it('labels each section with its relative file path', async () => {
    const dir = await makeTempDir();
    const dataDir = path.join(dir, 'data');
    await writeFile(path.join(dataDir, 'today.md'), '# TODAY');

    const ctx = await buildContext(dataDir, path.join(dir, 'weekly.md'));

    expect(ctx).toContain('today.md');

    await fs.rm(dir, { recursive: true });
  });

  it('falls back to the full weekly plan when data/ has no files', async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, 'weekly.md'), '# WEEKLY PARENTING PLAN\n- Fallback item');

    const ctx = await buildContext(path.join(dir, 'data'), path.join(dir, 'weekly.md'));

    expect(ctx).toContain('Fallback item');

    await fs.rm(dir, { recursive: true });
  });

  it('returns empty string when no context files exist at all', async () => {
    const dir = await makeTempDir();
    const ctx = await buildContext(path.join(dir, 'data'), path.join(dir, 'weekly.md'));
    expect(ctx).toBe('');
    await fs.rm(dir, { recursive: true });
  });

  it('preserves citation links from source files', async () => {
    const dir = await makeTempDir();
    const dataDir = path.join(dir, 'data');
    await writeFile(
      path.join(dataDir, 'today.md'),
      '# TODAY\n- Task [[src](beeper://chat/abc123)]'
    );

    const ctx = await buildContext(dataDir, path.join(dir, 'weekly.md'));

    expect(ctx).toContain('[[src](beeper://chat/abc123)]');

    await fs.rm(dir, { recursive: true });
  });
});
