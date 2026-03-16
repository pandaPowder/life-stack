import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParentingPlan } from '../types/index.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });
  }

  /**
   * Summarizes the raw school email text, Sway content, and WhatsApp logs.
   */
  async generateParentingPlan(rawText: string, context: string = ''): Promise<ParentingPlan> {
    const prompt = `
      You are an expert parenting assistant. Below is text extracted from school emails, newsletters, and WhatsApp chat history between parents.
      Analyze the text and extract all important information for my children's weekly parenting plan.
      
      PERSONAL CONTEXT (Use this to prioritize and assign tasks):
      ---
      ${context}
      ---
      
      Specifically, look for:
      - Support needed with homework (specific assignments, subjects).
      - Items that need to be purchased (supplies, clothes, special equipment).
      - Upcoming school activities, deadlines, or events.
      - General important school announcements or reminders.
      - Logistical changes, parent agreements, or requests from the WhatsApp history.
      
      Return the data in the following JSON structure:
      {
        "homeworkSupport": [{ "child": string, "subject": string, "description": string, "dueDate": string }],
        "purchasesNeeded": [{ "item": string, "reason": string, "priority": "high" | "medium" | "low" }],
        "upcomingActivities": [{ "title": string, "date": string, "location": string, "requirements": string[] }],
        "announcements": [string]
      }
      
      RAW CONTENT (School Communications & WhatsApp):
      ---
      ${rawText}
      ---
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }
}
