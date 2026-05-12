import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParentingPlan } from '../types/index.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private textModel: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Summarizes the raw school email text, Sway content, and WhatsApp logs.
   */
  async generateParentingPlan(rawText: string, context: string = ''): Promise<ParentingPlan> {
    const prompt = `
      You are an expert parenting assistant. Below is text extracted from school emails, newsletters, and WhatsApp chat history between parents.
      Analyze the text and extract all important information for my children's weekly parenting plan.
      
      IMPORTANT RECIPIENT CONTEXT:
      - This report is for ME (Dallas). 
      - In the WhatsApp logs, messages from "ME (Dallas)" are requests or info I have already sent.
      - DO NOT list requests I made to others as "Homework Support" or "Purchases Needed" for myself.
      - DO focus on requests or info sent TO me by my co-parent (Jenny) or my kids.
      - Use my own messages ("ME (Dallas)") only as context to understand agreements or confirmed plans.
      
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
      
      CITATIONS:
      For every item you find, include a "sources" array containing the exact email subjects or WhatsApp chat names where the information was found.
      
      Return the data in the following JSON structure:
      {
        "homeworkSupport": [{ "child": string, "subject": string, "description": string, "dueDate": string, "sources": string[] }],
        "purchasesNeeded": [{ "item": string, "reason": string, "priority": "high" | "medium" | "low", "sources": string[] }],
        "upcomingActivities": [{ "title": string, "date": string, "location": string, "requirements": string[], "sources": string[] }],
        "announcements": [{ "text": string, "sources": string[] }]
      }
      
      RAW CONTENT (School Communications & WhatsApp):
      ---
      ${rawText}
      ---
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const plan = JSON.parse(response.text());
    console.log(`[AI] Generated plan with ${plan.homeworkSupport.length + plan.purchasesNeeded.length + plan.upcomingActivities.length + plan.announcements.length} items.`);
    return plan;
  }

  async ask(question: string, context: string): Promise<string> {
    const prompt = `You are a personal assistant helping Dallas manage his family and career.
Dallas has ADHD and needs a single, direct answer — no preamble, no bullet lists unless specifically asked.
When your answer refers to something from the context, preserve the citation links exactly as they appear (e.g. [[src](url)]).

CONTEXT (from this week's parenting plan and career notes):
---
${context}
---

QUESTION: ${question}`;

    const result = await this.textModel.generateContent(prompt);
    return result.response.text();
  }
}
