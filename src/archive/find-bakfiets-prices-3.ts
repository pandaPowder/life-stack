import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  // Search for $39, $40, $41, $42, $43, $44, $45
  const queries = ['$39', '$4', 'listing', 'bakfiets'];
  
  for (const q of queries) {
    console.log(`\n--- Searching for "${q}" ---`);
    const res = await fetch(`${baseUrl}/search?query=${encodeURIComponent(q)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const items = data.results?.messages?.items || [];
      items.forEach((m: any) => {
        if (m.text.toLowerCase().includes('bakfiets') || m.text.toLowerCase().includes('bike')) {
          console.log(`[${m.timestamp}] ${m.senderName} (${m.chatTitle}): ${m.text}`);
        }
      });
    }
  }
}

main().catch(console.error);
