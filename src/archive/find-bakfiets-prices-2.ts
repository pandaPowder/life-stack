import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  // Search for price patterns
  const queries = ['bakfiets price', 'ksl bakfiets', '3999', '4000', '4500', '3500'];
  
  for (const q of queries) {
    console.log(`\n--- Searching for "${q}" ---`);
    const res = await fetch(`${baseUrl}/search?query=${encodeURIComponent(q)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const items = data.results?.messages?.items || [];
      items.forEach((m: any) => {
        console.log(`[${m.timestamp}] ${m.senderName}: ${m.text}`);
      });
    }
  }
}

main().catch(console.error);
