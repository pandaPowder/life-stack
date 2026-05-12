import { z } from 'zod';

export const JobApplicationSchema = z.object({
  company: z.string(),
  role: z.string(),
  appliedDate: z.string(),
  status: z.enum(['outreach', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn']),
  location: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  emailIds: z.array(z.string()).optional(),
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;

export const JobApplicationsResponseSchema = z.object({
  applications: z.array(JobApplicationSchema),
});

export interface RecruiterEmail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: Date;
  company?: string;
}
