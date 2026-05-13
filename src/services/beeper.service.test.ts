import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BeeperService } from './beeper.service.js';

describe('BeeperService', () => {
  let service: BeeperService;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    service = new BeeperService('test-token');
  });

  describe('findChatIDs', () => {
    it('should return chat IDs for matching names', async () => {
      const mockResponse = {
        results: {
          chats: [
            { id: 'chat1', title: 'Parenting Group' },
            { id: 'chat2', title: 'School News' }
          ]
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const ids = await service.findChatIDs(['Parenting Group']);
      expect(ids).toContain('chat1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('Parenting%20Group'),
        expect.any(Object)
      );
    });

    it('should normalize names during matching', async () => {
      const mockResponse = {
        results: {
          chats: [
            { id: 'chat1', title: 'Parenting! Group' }
          ]
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const ids = await service.findChatIDs(['parenting group']);
      expect(ids).toContain('chat1');
    });
  });

  describe('formatMessagesForAI', () => {
    it('should format messages correctly for AI consumption', () => {
      const messages = [
        {
          senderName: 'Alice',
          text: 'Need to buy shoes',
          timestamp: '2026-03-15T10:00:00Z',
          chatName: 'Co-Parenting',
          chatID: '1',
          isFromMe: false
        },
        {
          senderName: 'Bob',
          text: 'OK',
          timestamp: '2026-03-15T10:05:00Z',
          chatName: 'Co-Parenting',
          chatID: '1',
          isFromMe: true
        }
      ];

      const output = service.formatMessagesForAI(messages);
      expect(output).toContain('--- WhatsApp Chat History');
      expect(output).toContain('Alice');
      expect(output).toContain('ME ('); // label format for isFromMe messages
      expect(output).toContain('Need to buy shoes');
      expect(output).toContain('OK');
    });

    it('should return empty string if no messages', () => {
      expect(service.formatMessagesForAI([])).toBe('');
    });
  });
});
