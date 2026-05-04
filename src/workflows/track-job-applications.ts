import 'dotenv/config';
import { AuthService } from '../services/auth.service.js';
import { GmailService } from '../services/gmail.service.js';
import { AIService } from '../services/ai.service.js';
import type { JobApplication } from '../domains/career/types.js';

async function run() {
  console.log('--- Career Tracking Workflow ---');
  
  // This will eventually fetch recruiter emails, parse them with AI,
  // and update a Google Sheet or local database of job applications.
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
  }

  const auth = new AuthService();
  const ai = new AIService(apiKey);

  try {
    console.log('1. Authorizing...');
    await auth.authorize();
    
    const gmail = new GmailService(auth.auth);
    
    console.log('2. Searching for job-related emails...');
    // Placeholder query
    const query = 'subject:job OR subject:application OR subject:recruiter';
    const emails = await gmail.fetchRecentSchoolEmails(query); // Reusing for now
    
    console.log(`Found ${emails.length} potential career-related emails.`);
    
    // Future implementation:
    // const applications = await ai.parseJobApplications(emails);
    // console.log(applications);

  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

run();
