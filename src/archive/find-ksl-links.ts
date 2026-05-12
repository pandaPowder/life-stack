import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  const res = await fetch(`${baseUrl}/search?query=ksl.com`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    const items = data.results?.messages?.items || [];
    const chats = data.results?.messages?.chats || {};
    
    items.forEach((m: any) => {
      const chatTitle = chats[m.chatID]?.title || 'Unknown Chat';
      const text = m.text || '';
      console.log(`[${m.timestamp}] ${m.senderName} (${chatTitle}): ${text}`);
    });
  }
}

main().catch(console.error);
