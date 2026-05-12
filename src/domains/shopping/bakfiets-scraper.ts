import 'dotenv/config';
import { BeeperService } from '../../services/beeper.service.js';

async function main() {
  const beeper = new BeeperService(process.env.BEEPER_ACCESS_TOKEN);
  const chatNamesStr = process.env.BEEPER_CHAT_NAMES || '';
  const chatNames = chatNamesStr.split(',').map(n => n.trim());

  console.log(`Searching for bakfiets in chats: ${chatNames.join(', ')}`);
  const chatIDs = await beeper.findChatIDs(chatNames);
  
  if (chatIDs.length === 0) {
    console.log('No matching WhatsApp chats found.');
    return;
  }

  // Fetch messages from the last 365 days
  const messages = await beeper.getRecentMessages(chatIDs, 365);
  console.log(`Fetched ${messages.length} messages.`);

  const filtered = messages.filter((m: any) => 
    m.text.toLowerCase().includes('bakfiets') || 
    m.text.toLowerCase().includes('cargo bike') ||
    m.text.toLowerCase().includes('ksl') ||
    m.text.toLowerCase().includes('price') ||
    m.text.toLowerCase().includes('$')
  );

  console.log('\n--- Relevant Messages ---');
  filtered.forEach((m: any) => {
    const senderLabel = m.isFromMe ? `ME (Dallas)` : m.senderName;
    console.log(`[${m.chatName}] ${senderLabel} (${new Date(m.timestamp).toLocaleString()}): ${m.text}`);
  });
}

main().catch(console.error);
