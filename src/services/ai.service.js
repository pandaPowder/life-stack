import { GoogleGenerativeAI } from '@google/generative-ai';
export class AIService {
    genAI;
    model;
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            }
        });
    }
    /**
     * Summarizes the raw school email text and Sway content.
     */
    async generateParentingPlan(rawText) {
        const prompt = `
      You are an expert parenting assistant. Below is text extracted from school emails and newsletters (including Sways).
      Analyze the text and extract all important information for a 10-year-old child's weekly parenting plan.
      
      Specifically, look for:
      - Support needed with homework (specific assignments, subjects).
      - Items that need to be purchased (supplies, clothes, special equipment).
      - Upcoming school activities, deadlines, or events.
      - General important school announcements or reminders.
      
      Return the data in the following JSON structure:
      {
        "homeworkSupport": [{ "child": string, "subject": string, "description": string, "dueDate": string }],
        "purchasesNeeded": [{ "item": string, "reason": string, "priority": "high" | "medium" | "low" }],
        "upcomingActivities": [{ "title": string, "date": string, "location": string, "requirements": string[] }],
        "announcements": [string]
      }
      
      School Content:
      ---
      ${rawText}
      ---
    `;
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    }
}
//# sourceMappingURL=ai.service.js.map