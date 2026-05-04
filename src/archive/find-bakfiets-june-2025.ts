import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  const res = await fetch(`${baseUrl}/chats/!59zvLppYRxuuShkygDN0:beeper.local/messages?limit=1000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    const items = data.items || [];
    
    // Filter for May/June 2025
    const filtered = items.filter((m: any) => {
      const d = new Date(m.timestamp);
      return d.getFullYear() === 2025 && (d.getMonth() === 4 || d.getMonth() === 5); // May is 4, June is 5
    });

    console.log(`Found ${filtered.length} messages in May/June 2025.`);
    filtered.reverse().forEach((m: any) => {
      if (m.text && (m.text.toLowerCase().includes('bakfiets') || m.text.includes('$') || m.text.toLowerCase().includes('ksl'))) {
        console.log(`[${m.timestamp}] ${m.senderName}: ${m.text}`);
      }
    });
  }
}

main().catch(console.error);
