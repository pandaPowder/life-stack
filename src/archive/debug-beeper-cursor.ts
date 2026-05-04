import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  const res = await fetch(`${baseUrl}/chats/!59zvLppYRxuuShkygDN0:beeper.local/messages?limit=100`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    const items = data.items || [];
    
    // I need to find the cursor for June 2025
    // Let's search for messages before the earliest one found (June 11)
  }
}
