import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  const res = await fetch(`${baseUrl}/search?query=bakfiets`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    const items = data.results?.messages?.items || [];
    
    // Sort by timestamp ascending
    items.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log('--- All Bakfiets Mentions (Sorted) ---');
    items.forEach((m: any) => {
      console.log(`[${m.timestamp}] ${m.senderName}: ${m.text}`);
    });
  }
}

main().catch(console.error);
