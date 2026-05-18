import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { extractDocxText } from './docx.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('extractDocxText', () => {
  beforeEach(() => vi.clearAllMocks());

  it('strips XML tags from the unzipped content', async () => {
    vi.mocked(execSync).mockReturnValue('<w:t>Hello</w:t> <w:t>World</w:t>');
    const result = await extractDocxText('/path/to/file.docx');
    expect(result).toBe('Hello World');
  });

  it('collapses multiple whitespace into single spaces', async () => {
    vi.mocked(execSync).mockReturnValue('<w:body>  <w:t>   spaced   </w:t>  </w:body>');
    const result = await extractDocxText('/path/to/file.docx');
    expect(result).toBe('spaced');
  });

  it('calls unzip with the correct file path and entry', async () => {
    vi.mocked(execSync).mockReturnValue('<w:t>text</w:t>');
    await extractDocxText('/some/path/doc.docx');
    const cmd = vi.mocked(execSync).mock.calls[0]![0] as string;
    expect(cmd).toContain('/some/path/doc.docx');
    expect(cmd).toContain('word/document.xml');
  });

  it('writes a Buffer to a temp .docx file before extracting', async () => {
    vi.mocked(execSync).mockReturnValue('<w:t>from buffer</w:t>');
    const result = await extractDocxText(Buffer.from('fake-docx-bytes'));
    expect(result).toBe('from buffer');
    const cmd = vi.mocked(execSync).mock.calls[0]![0] as string;
    expect(cmd).toContain('.docx');
  });

  it('returns empty string for a document with no text nodes', async () => {
    vi.mocked(execSync).mockReturnValue('<w:body><w:p><w:pPr/></w:p></w:body>');
    const result = await extractDocxText('/empty.docx');
    expect(result).toBe('');
  });
});
