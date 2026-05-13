import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export async function extractDocxText(filePath: string): Promise<string>;
export async function extractDocxText(buffer: Buffer): Promise<string>;
export async function extractDocxText(input: string | Buffer): Promise<string> {
  let tmp: string | null = null;
  let target: string;

  if (Buffer.isBuffer(input)) {
    tmp = path.join(os.tmpdir(), `docx-${Date.now()}.docx`);
    await fs.writeFile(tmp, input);
    target = tmp;
  } else {
    target = input;
  }

  try {
    const xml = execSync(`unzip -p "${target}" word/document.xml`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } finally {
    if (tmp) await fs.unlink(tmp).catch(() => null);
  }
}
