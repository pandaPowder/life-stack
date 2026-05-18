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
      expect(output).toContain('--- Messaging History');
      expect(output).toContain('Alice');
      expect(output).toContain('ME ('); // label format for isFromMe messages
      expect(output).toContain('Need to buy shoes');
      expect(output).toContain('OK');
    });

    it('should return empty string if no messages', () => {
      expect(service.formatMessagesForAI([])).toBe('');
    });
  });

  describe('getRecentMessages', () => {
    const recentTs = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();  // 1 day ago
    const staleTs  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago

    it('returns only messages newer than the cutoff', async () => {
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
          { senderName: 'Alice', text: 'recent msg', timestamp: recentTs, isSender: false },
          { senderName: 'Bob',   text: 'stale msg',  timestamp: staleTs,  isSender: false },
        ]}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Test Chat' }) });

      const msgs = await service.getRecentMessages(['chat1'], 7);
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.text).toBe('recent msg');
    });

    it('sorts messages by timestamp ascending across chats', async () => {
      const ts1 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
      const ts2 = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago

      // chat1: one message at ts2, chat2: one message at ts1
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ senderName: 'A', text: 'later', timestamp: ts2, isSender: false }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Chat1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ senderName: 'B', text: 'earlier', timestamp: ts1, isSender: false }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Chat2' }) });

      const msgs = await service.getRecentMessages(['chat1', 'chat2'], 7);
      expect(msgs[0]!.text).toBe('earlier');
      expect(msgs[1]!.text).toBe('later');
    });

    it('skips chats with no recent messages', async () => {
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
          { senderName: 'Z', text: 'old', timestamp: staleTs, isSender: false },
        ]}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Stale Chat' }) });

      const msgs = await service.getRecentMessages(['chat1'], 7);
      expect(msgs).toHaveLength(0);
    });

    it('returns an empty array when chatIDs is empty', async () => {
      const msgs = await service.getRecentMessages([], 7);
      expect(msgs).toHaveLength(0);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});