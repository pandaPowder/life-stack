import 'dotenv/config';

async function main() {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  const baseUrl = "http://localhost:23373/v1";

  console.log(`Searching for "bakfiets" across all messages...`);
  
  try {
    const res = await fetch(`${baseUrl}/search?query=bakfiets`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) {
      console.error(`Search failed: ${res.status}`);
      return;
    }
    
    const data = await res.json();
    console.log('Search response data structure:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error searching:', error);
  }
}

main().catch(console.error);
