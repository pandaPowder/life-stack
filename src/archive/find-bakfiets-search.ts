import 'dotenv/config';
import { BeeperService } from '../services/beeper.service.js';

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
    const messages = data.results?.messages || [];

    console.log(`Found ${messages.length} messages containing "bakfiets".`);

    messages.forEach((m: any) => {
      console.log(`\n[${m.chatTitle}] ${m.senderName} (${new Date(m.timestamp).toLocaleString()}):`);
      console.log(`${m.text}`);
    });

    // Also search for "KSL"
    console.log(`\nSearching for "KSL" across all messages...`);
    const resKsl = await fetch(`${baseUrl}/search?query=KSL`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const dataKsl = await resKsl.json();
    const messagesKsl = dataKsl.results?.messages || [];
    console.log(`Found ${messagesKsl.length} messages containing "KSL".`);
    messagesKsl.forEach((m: any) => {
      console.log(`\n[${m.chatTitle}] ${m.senderName} (${new Date(m.timestamp).toLocaleString()}):`);
      console.log(`${m.text}`);
    });

  } catch (error) {
    console.error('Error searching:', error);
  }
}

main().catch(console.error);
