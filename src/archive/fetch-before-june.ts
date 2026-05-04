import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";
  const chatID = "!59zvLppYRxuuShkygDN0:beeper.local";

  // Try fetching messages before June 21, 2025
  const res = await fetch(`${baseUrl}/chats/${chatID}/messages?limit=100&before=2025-06-21T16:19:20.000Z`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    const items = data.items || [];
    console.log(`Found ${items.length} messages before June 21, 2025.`);
    items.forEach((m: any) => {
      console.log(`[${m.timestamp}] ${m.senderName}: ${m.text}`);
    });
  } else {
    console.error(`Fetch failed: ${res.status}`);
  }
}

main().catch(console.error);
