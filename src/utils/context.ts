import * as fs from 'fs/promises';
import * as path from 'path';

async function discoverKidsFiles(dataDir: string): Promise<string[]> {
  const kidsDir = path.join(dataDir, 'kids');
  try {
    const entries = await fs.readdir(kidsDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => path.join(kidsDir, e.name, 'this-week.md'));
  } catch {
    return [];
  }
}

export async function buildContext(dataDir: string, planFile: string): Promise<string> {
  const staticCandidates = [
    path.join(dataDir, 'today.md'),
    path.join(dataDir, 'tasks', 'today.md'),
  ];
  const kidsCandidates = await discoverKidsFiles(dataDir);
  const candidates = [
    ...staticCandidates,
    ...kidsCandidates,
    path.join(dataDir, 'career', 'this-week.md'),
  ];

  const sections: string[] = [];
  for (const file of candidates) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const label = path.relative(dataDir, file);
      sections.push(`### ${label}\n${content}`);
    } catch {
      // file doesn't exist — skip silently
    }
  }

  if (sections.length > 0) return sections.join('\n\n---\n\n');

  // Fallback: use the full weekly plan if data/ hasn't been generated yet
  try {
    return await fs.readFile(planFile, 'utf8');
  } catch {
    return '';
  }
}
