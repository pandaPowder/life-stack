export interface JobApplication {
  company: string;
  role: string;
  appliedDate: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  location?: string;
  source?: string;
  notes?: string;
}

export interface RecruiterEmail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: Date;
  company?: string;
}
