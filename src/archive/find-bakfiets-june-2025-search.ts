import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  // Search for "box" and "bike" in early 2025
  const queries = ['box', 'bike', 'price', '$'];
  
  for (const q of queries) {
    const res = await fetch(`${baseUrl}/search?query=${encodeURIComponent(q)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const items = data.results?.messages?.items || [];
      const chats = data.results?.messages?.chats || {};
      
      items.forEach((m: any) => {
        const d = new Date(m.timestamp);
        if (d.getFullYear() === 2025 && d.getMonth() === 5) { // June 2025
           const chatTitle = chats[m.chatID]?.title || 'Unknown Chat';
           const text = m.text || '';
           console.log(`[${m.timestamp}] ${m.senderName} (${chatTitle}): ${text}`);
        }
      });
    }
  }
}

main().catch(console.error);
