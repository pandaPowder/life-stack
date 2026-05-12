import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  const queries = ['bakfiets', 'cargo bike', 'ksl', 'listed'];
  
  for (const q of queries) {
    console.log(`\n--- Searching for "${q}" ---`);
    const res = await fetch(`${baseUrl}/search?query=${encodeURIComponent(q)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const items = data.results?.messages?.items || [];
      const chats = data.results?.messages?.chats || {};
      
      items.forEach((m: any) => {
        const text = m.text || '';
        // Look for messages in early 2025
        const d = new Date(m.timestamp);
        if (d.getFullYear() === 2025 && d.getMonth() < 7) { // Before August
           const chatTitle = chats[m.chatID]?.title || 'Unknown Chat';
           console.log(`[${m.timestamp}] ${m.senderName} (${chatTitle}): ${text}`);
        }
      });
    }
  }
}

main().catch(console.error);
