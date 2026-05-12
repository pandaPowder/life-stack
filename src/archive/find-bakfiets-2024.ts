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
    
    // Look for ANY messages in 2024
    items.forEach((m: any) => {
      const d = new Date(m.timestamp);
      if (d.getFullYear() === 2024) {
        console.log(`[${m.timestamp}] ${m.senderName}: ${m.text}`);
      }
    });
  }
}

main().catch(console.error);
