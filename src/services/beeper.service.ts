import 'dotenv/config';

export interface BeeperMessage {
  senderName: string;
  text: string;
  timestamp: string;
  chatName: string;
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
      // Fetch all chats (might need pagination if user has 100s of chats)
      const res = await fetch(`${this.baseUrl}/chats?limit=100`, {
        headers: { "Authorization": `Bearer ${this.token}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      const allChats = data.items || [];

      for (const targetName of names) {
        // Use a more flexible match (some names might have kids' names separated by slashes etc)
        const chat = allChats.find((c: any) => 
          c.title.toLowerCase() === targetName.toLowerCase() ||
          c.title.toLowerCase().includes(targetName.toLowerCase())
        );
        
        if (chat) {
          console.log(`[BEEPER] Found chat: ${chat.title} (${chat.id})`);
          chatIDs.push(chat.id);
        } else {
          console.warn(`[BEEPER] Chat NOT found for name: ${targetName}`);
        }
      }
    } catch (error) {
      console.error('[BEEPER] Error listing chats:', error);
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
        
        // Find the chat name from the first message if possible or a separate call
        // To be safe and avoid extra calls, we'll just use the ID if we can't find title easily
        // But since we just found IDs by title, we could pass titles along. 
        // For now, let's just get the chat title from the API.
        const chatRes = await fetch(`${this.baseUrl}/chats/${chatID}`, {
          headers: { "Authorization": `Bearer ${this.token}` }
        });
        const chatData = await chatRes.json();
        const chatName = chatData.title || 'Unknown Chat';

        const recent = (msgData.items || []).filter((m: any) => new Date(m.timestamp) > afterDate);
        
        console.log(`[BEEPER] Found ${recent.length} recent messages in "${chatName}".`);

        recent.forEach((m: any) => {
          messages.push({
            senderName: m.senderName || 'Unknown',
            text: m.text || '',
            timestamp: m.timestamp,
            chatName,
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
      output += `[${m.chatName}] ${m.senderName} (${new Date(m.timestamp).toLocaleString()}): ${m.text}\n`;
    });
    output += '--- End of WhatsApp History ---\n';
    
    return output;
  }
}
