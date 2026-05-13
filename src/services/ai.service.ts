import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParentingPlan } from '../types/index.js';
import type { RecruiterEmail, JobApplication } from '../domains/career/types.js';
import { JobApplicationsResponseSchema } from '../domains/career/types.js';
import { userConfig } from '../config/user.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private textModel: any;
  private searchModel: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.searchModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} } as any],
    });
  }

  /**
   * Summarizes the raw school email text, Sway content, and WhatsApp logs.
   */
  async generateParentingPlan(rawText: string, context: string = ''): Promise<ParentingPlan> {
    const prompt = `
      You are an expert parenting assistant. Below is text extracted from school emails, newsletters, and WhatsApp chat history between parents.
      Analyze the text and extract all important information for my children's weekly parenting plan.
      
      IMPORTANT RECIPIENT CONTEXT:
      - This report is for ME (${userConfig.userName}).
      - In the WhatsApp logs, messages from "ME (${userConfig.userName})" are requests or info I have already sent.
      - DO NOT list requests I made to others as "Homework Support" or "Purchases Needed" for myself.
      - DO focus on requests or info sent TO me by my co-parent (${userConfig.coparentName}) or my kids.
      - Use my own messages ("ME (${userConfig.userName})") only as context to understand agreements or confirmed plans.
      
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

  async parseJobApplications(emails: RecruiterEmail[]): Promise<JobApplication[]> {
    if (emails.length === 0) return [];

    const emailsText = emails
      .map(e =>
        `EMAIL_ID: ${e.id}\nFrom: ${e.sender}\nSubject: ${e.subject}\nDate: ${e.date.toISOString().split('T')[0]}\nBody:\n${e.body.slice(0, 2000)}`,
      )
      .join('\n\n---\n\n');

    const prompt = `You are parsing job-search emails for ${userConfig.userName} to build a job application tracker.

Group emails by unique company+role. For each group, return the current state based on the most recent email.

STATUS RULES:
- "outreach": a recruiter contacted ${userConfig.userName} but no application has been submitted
- "applied": ${userConfig.userName} applied (application confirmation or submission)
- "interviewing": interview is scheduled or has happened, awaiting next steps
- "offered": a job offer was extended
- "rejected": application was declined
- "withdrawn": ${userConfig.userName} withdrew

For appliedDate use the date of the most relevant email (first contact or application submission).
Include the EMAIL_IDs of all relevant emails in the emailIds array (use the exact ID strings).
Omit purely promotional/newsletter emails (e.g. job alert digests with no specific outreach).

Return JSON:
{
  "applications": [{
    "company": string,
    "role": string,
    "appliedDate": string (YYYY-MM-DD or descriptive),
    "status": "outreach"|"applied"|"interviewing"|"offered"|"rejected"|"withdrawn",
    "location": string (optional),
    "source": string (optional, e.g. "LinkedIn", "Referral"),
    "notes": string (optional, one sentence on next steps or key detail),
    "emailIds": string[]
  }]
}

EMAILS:
---
${emailsText}
---`;

    const result = await this.model.generateContent(prompt);
    const raw = JSON.parse(result.response.text());
    const parsed = JobApplicationsResponseSchema.parse(raw);
    console.log(`[AI] Parsed ${parsed.applications.length} job applications.`);
    return parsed.applications;
  }

  async prepInterview(
    interviewer: string,
    company: string,
    opts: {
      linkedinUrl?: string;
      linkedinContext?: string;
      mutualConnections?: string[];
      resume?: string;
      jobDescription?: string;
    } = {},
  ): Promise<string> {
    const { linkedinUrl, linkedinContext, mutualConnections, resume, jobDescription } = opts;

    const interviewerSection = linkedinContext
      ? `INTERVIEWER PROFILE (scraped from LinkedIn — use this as the authoritative source for their role and career history):
---
${linkedinContext}
---
Also search: "${interviewer}" "${company}" to find any articles, talks, blog posts, conference appearances, or press mentions that aren't on their LinkedIn profile.`
      : linkedinUrl
        ? `Search for the interviewer's LinkedIn profile at ${linkedinUrl} and any press mentions or bios for "${interviewer}" "${company}".`
        : `Search: "${interviewer}" "${company}" site:linkedin.com, then check ${company}'s team/leadership page as a fallback.`;

    const connectionsNote = mutualConnections && mutualConnections.length > 0
      ? `LinkedIn shows ${userConfig.userName} has mutual connections with ${mutualConnections.join(' and ')}. List each by name explicitly and suggest how to use them as a warm opener (e.g. "You and I are both connected to Curtis — how do you know them?").`
      : linkedinContext
        ? `From the scraped profile above, identify any employers, schools, or groups that overlap with ${userConfig.userName}'s network (${userConfig.networkContext}).`
        : `Search for any public overlap between ${interviewer} and ${userConfig.userName}'s known network (${userConfig.networkContext}).`;

    const resumeSection = resume
      ? `RESUME (use this to ground STAR suggestions in ${userConfig.userName}'s actual experience):
---
${resume}
---`
      : '';

    const jdSection = jobDescription
      ? `JOB DESCRIPTION (extracted from emails — use this to identify key requirements and tailor everything):
---
${jobDescription}
---`
      : '';

    const prompt = `You are acting as Executive Research Assistant for ${userConfig.userName}, who is interviewing today with ${interviewer} at ${company}.

${resumeSection}

${jdSection}

${interviewerSection}

ADDITIONAL RESEARCH — run these searches:
1. Fetch ${company}'s website (about/team page) for positioning and leadership.
2. Search: ${company} news 2024 2025 — announcements, funding, product launches.
3. Search: ${company} Glassdoor reviews — culture and pain-point signals.

Produce a concise 15-minute briefing in this exact markdown structure:

# Interview Briefing: ${interviewer} @ ${company}

## 1. The Interviewer
- **Current role & tenure** at ${company} (note: ${userConfig.userName} is interviewing for an IC engineering role, not a management role — frame yourself accordingly)
- **Career highlights** — 2–3 previous roles or notable achievements
- **Mutual connections** — ${connectionsNote}
- **Ice-breaker topics** — 2–3 specific hooks from their actual background, not generic topics

## 2. The Company
- **Mission** (one sentence)
- **Business model** — how they make money
- **Recent news** — major announcements, product launches, funding, or leadership changes in the last 12 months

## 3. Why Us? (3 Challenges ${userConfig.userName} Could Help Solve)
Based on ${company}'s industry position, recent trajectory, Glassdoor signals${jobDescription ? ', and the job description' : ''}, name the 3 most likely pain points ${userConfig.userName} could address. Frame each as: "Challenge: … | Opportunity for ${userConfig.userName}: …"

## 4. Reverse Interview Questions
3 sophisticated, high-signal questions for ${interviewer} — tailored to their specific background and ${company}'s current trajectory. Signal strategic thinking, not just curiosity.

## 5. STAR Story Bank
Identify the 4 most likely behavioral interview questions for this role based on the job description and challenges above. For each, provide a STAR scaffold grounded in ${userConfig.userName}'s resume. Do NOT invent story details — provide the framework and prompt ${userConfig.userName} to fill in specifics.

Format each as:
**Q: "[Likely behavioral question]"**
- **Situation**: [Which role/project from ${userConfig.userName}'s background is the best fit? Prompt to recall a specific moment.]
- **Task**: [What was ${userConfig.userName} responsible for in that situation?]
- **Action**: [What specific steps were taken? Prompt for 2–3 concrete actions.]
- **Result**: [What should be quantified? Suggest metrics to reach for — time saved, revenue, team size, adoption rate, etc.]

---
*Sources: list each URL on its own line as a markdown link in the format "- [page title](https://url)". Do not leave this section empty.*

${userConfig.communicationStyle ? `Keep each section tight. ${userConfig.communicationStyle}` : 'Keep each section tight and scannable.'}`;

    const result = await this.searchModel.generateContent(prompt);
    return result.response.text();
  }

  async ask(question: string, context: string): Promise<string> {
    const styleNote = userConfig.communicationStyle
      ? `${userConfig.communicationStyle} Give a single, direct answer — no preamble, no bullet lists unless specifically asked.`
      : 'Give a single, direct answer — no preamble, no bullet lists unless specifically asked.';
    const prompt = `You are a personal assistant helping ${userConfig.userName} manage their family and career.
${styleNote}
When your answer refers to something from the context, preserve the citation links exactly as they appear (e.g. [[src](url)]).

TASK AWARENESS: The context may include a "tasks/today.md" section listing Dallas's Todoist tasks for today and overdue items.
- If your recommendation is already captured as a Todoist task, say so explicitly and include the task link.
- If your recommendation is NOT in Todoist, say so — it's a signal it should be added.
- Do not re-surface tasks that are already captured unless they are the highest-priority action.

CONTEXT (parenting plan, career notes, and today's Todoist tasks):
---
${context}
---

QUESTION: ${question}`;

    const result = await this.textModel.generateContent(prompt);
    return result.response.text();
  }
}
