import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParentingPlan } from '../types/index.js';
import type { McpService } from './mcp.service.js';

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
   * Summarizes raw school content and dynamically fetches WhatsApp context via MCP.
   */
  async generateParentingPlan(rawSchoolContent: string, personalContext: string = '', mcp?: McpService): Promise<ParentingPlan> {
    const tools = mcp ? [{ functionDeclarations: await mcp.getGeminiTools() }] : [];
    
    const chat = this.model.startChat({
      history: [],
      tools: tools
    });

    const prompt = `
      You are an expert parenting assistant. Your goal is to generate a weekly parenting plan.
      
      PERSONAL CONTEXT (Use this to prioritize and assign tasks):
      ---
      ${personalContext}
      ---
      
      SCHOOL CONTENT (Emails and Newsletters):
      ---
      ${rawSchoolContent}
      ---
      
      WHATSAPP ACCESS:
      You have access to Beeper tools to search and fetch WhatsApp messages. 
      Use these tools if you need to:
      1. Find discussions about logistics, schedule changes, or co-parenting agreements.
      2. Verify if a school event or purchase was already discussed or agreed upon.
      3. Look for mentions of child names (${personalContext.includes('Graham') ? 'Graham, ' : ''}${personalContext.includes('Nora') ? 'Nora, ' : ''}${personalContext.includes('Ansel') ? 'Ansel' : ''}) in recent chats.
      
      Specifically, extract:
      - Support needed with homework.
      - Items that need to be purchased.
      - Upcoming school activities/deadlines.
      - General announcements.
      - Logistical changes or parent agreements from WhatsApp.
      
      Return the final plan in this JSON structure:
      {
        "homeworkSupport": [{ "child": string, "subject": string, "description": string, "dueDate": string }],
        "purchasesNeeded": [{ "item": string, "reason": string, "priority": "high" | "medium" | "low" }],
        "upcomingActivities": [{ "title": string, "date": string, "location": string, "requirements": string[] }],
        "announcements": [string]
      }
    `;

    console.log("[AI] Starting synthesis loop...");
    let result = await chat.sendMessage(prompt);
    let response = result.response;

    // Agentic Tool-Calling Loop
    while (response.candidates[0].content.parts.some((part: any) => part.functionCall)) {
      const functionCalls = response.candidates[0].content.parts.filter((part: any) => part.functionCall);
      const toolResponses = [];

      for (const call of functionCalls) {
        const { name, args } = call.functionCall;
        console.log(`[AI] Gemini requested tool: ${name}`);
        
        if (mcp) {
          try {
            const content = await mcp.callTool(name, args);
            toolResponses.push({
              functionResponse: {
                name,
                response: { content }
              }
            });
          } catch (error) {
            console.error(`[AI] Tool call failed: ${name}`, error);
            toolResponses.push({
              functionResponse: {
                name,
                response: { error: "Tool execution failed" }
              }
            });
          }
        }
      }

      console.log("[AI] Sending tool responses back to Gemini...");
      result = await chat.sendMessage(toolResponses);
      response = result.response;
    }

    return JSON.parse(response.text());
  }
}
