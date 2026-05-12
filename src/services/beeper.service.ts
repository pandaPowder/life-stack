import dotenv from 'dotenv';
dotenv.config({ override: true });

export interface BeeperMessage {
  senderName: string;
  text: string;
  timestamp: string;
  chatName: string;
  chatID: string;
  isFromMe: boolean;
}

export class BeeperService {
  private token: string;
  private baseUrl: string = "http://localhost:23373/v1";

  constructor(token?: string) {
    this.token = token || '';
  }

  /**
   * Finds chat IDs for a list of display names.
   */
  async findChatIDs(names: string[]): Promise<string[]> {
    console.log(`[BEEPER] Searching for chats: ${names.join(', ')}`);
    const chatIDs: string[] = [];
    
    try {
      for (const targetName of names) {
        // Use the generic search endpoint which works for chats and messages
        const res = await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(targetName)}`, {
          headers: { "Authorization": `Bearer ${this.token}` }
        });
        
        if (!res.ok) {
          console.warn(`[BEEPER] Search failed for "${targetName}": ${res.status}`);
          continue;
        }
        
        const data = await res.json();
        const foundChats = data.results?.chats || [];

        // Normalize for better matching
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const normalizedTarget = normalize(targetName);

        const bestMatch = foundChats.find((c: any) => {
          const normalizedTitle = normalize(c.title);
          return normalizedTitle === normalizedTarget || normalizedTitle.includes(normalizedTarget);
        });
        
        if (bestMatch) {
          console.log(`[BEEPER] Found chat: "${bestMatch.title}" for target "${targetName}"`);
          chatIDs.push(bestMatch.id);
        } else {
          console.warn(`[BEEPER] Chat NOT found for name: "${targetName}"`);
        }
      }
    } catch (error) {
      console.error('[BEEPER] Error searching for chats:', error);
    }

    return Array.from(new Set(chatIDs)); // Unique IDs
  }

  /**
   * Fetches messages from the last N days for the given chat IDs.
   */
  async getRecentMessages(chatIDs: string[], days: number = 7): Promise<BeeperMessage[]> {
    const messages: BeeperMessage[] = [];
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days);

    console.log(`[BEEPER] Fetching messages from last ${days} days for ${chatIDs.length} chats.`);

    try {
      for (const chatID of chatIDs) {
        // Fetch messages (limit 100 for now, could paginate if needed)
        const msgRes = await fetch(`${this.baseUrl}/chats/${chatID}/messages?limit=100`, {
          headers: { "Authorization": `Bearer ${this.token}` }
        });
        const msgData = await msgRes.json();
        
        // Find the chat name
        const chatRes = await fetch(`${this.baseUrl}/chats/${chatID}`, {
          headers: { "Authorization": `Bearer ${this.token}` }
        });
        const chatData = await chatRes.json();
        const chatName = chatData.title || 'Unknown Chat';

        const recent = (msgData.items || []).filter((m: any) => new Date(m.timestamp) > afterDate);
        
        if (recent.length === 0) {
          console.log(`[BEEPER] Skipping stale chat: "${chatName}" (no activity in ${days} days).`);
          continue;
        }

        console.log(`[BEEPER] Found ${recent.length} recent messages in "${chatName}".`);

        recent.forEach((m: any) => {
          messages.push({
            senderName: m.senderName || 'Unknown',
            text: m.text || '',
            timestamp: m.timestamp,
            chatName,
            chatID,
            isFromMe: !!m.isSender,
          });
        });
      }
    } catch (error) {
      console.error('[BEEPER] Error fetching messages:', error);
    }

    // Sort messages by timestamp ascending
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Formats messages into a single string for AI consumption.
   */
  formatMessagesForAI(messages: BeeperMessage[]): string {
    if (messages.length === 0) return '';

    let output = '\n--- WhatsApp Chat History (Last 7 Days) ---\n';
    messages.forEach(m => {
      const senderLabel = m.isFromMe ? `ME (Dallas)` : m.senderName;
      output += `[${m.chatName}] ${senderLabel} (${new Date(m.timestamp).toLocaleString()}): ${m.text}\n`;
    });
    output += '--- End of WhatsApp History ---\n';
    
    return output;
  }
}
