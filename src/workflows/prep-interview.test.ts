import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prepInterview } from './prep-interview.js';

describe('prep-interview', () => {
  const original = process.env.LIFE_GEMINI_API_KEY;

  afterEach(() => {
    process.env.LIFE_GEMINI_API_KEY = original;
  });

  it('throws when LIFE_GEMINI_API_KEY is not set', async () => {
    delete process.env.LIFE_GEMINI_API_KEY;
    await expect(prepInterview('Jane Doe', 'Acme')).rejects.toThrow('LIFE_GEMINI_API_KEY not set.');
  });
});
