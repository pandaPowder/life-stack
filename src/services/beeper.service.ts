import BeeperDesktop from '@beeper/desktop-api';

export interface BeeperMessage {
  senderName: string;
  text: string;
  timestamp: string;
  chatName: string;
}

export class BeeperService {
  private client: any;

  constructor(accessToken?: string) {
    this.client = new BeeperDesktop({
      accessToken,
    });
  }

  /**
   * Finds chat IDs for a list of display names.
   */
  async findChatIDs(names: string[]): Promise<string[]> {
    console.log(`[BEEPER] Searching for chats: ${names.join(', ')}`);
    const chatIDs: string[] = [];
    
    try {
      // client.chats.list() returns an async iterator
      for await (const chat of this.client.chats.list()) {
        if (names.includes(chat.name)) {
          console.log(`[BEEPER] Found chat: ${chat.name} (${chat.id})`);
          chatIDs.push(chat.id);
        }
      }
    } catch (error) {
      console.error('[BEEPER] Error listing chats:', error);
    }

    return chatIDs;
  }

  /**
   * Fetches messages from the last N days for the given chat IDs.
   */
  async getRecentMessages(chatIDs: string[], days: number = 7): Promise<BeeperMessage[]> {
    const messages: BeeperMessage[] = [];
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days);
    const afterISO = afterDate.toISOString();

    console.log(`[BEEPER] Fetching messages after ${afterISO} for ${chatIDs.length} chats.`);

    try {
      for (const chatID of chatIDs) {
        // Find the chat name for logging context
        const chat = await this.client.chats.get(chatID);
        const chatName = chat?.name || 'Unknown Chat';

        // client.messages.search() returns an async iterator
        for await (const message of this.client.messages.search({
          chatIDs: [chatID],
          after: afterISO,
        })) {
          messages.push({
            senderName: message.senderName || 'Unknown',
            text: message.text || '',
            timestamp: message.timestamp,
            chatName,
          });
        }
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

    let output = '\n--- WhatsApp Chat Context ---\n';
    messages.forEach(m => {
      output += `[${m.chatName}] ${m.senderName} (${new Date(m.timestamp).toLocaleString()}): ${m.text}\n`;
    });
    output += '--- End of WhatsApp Context ---\n';
    
    return output;
  }
}
