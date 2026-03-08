export interface SchoolEmail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: Date;
  swayLinks: string[];
}

export interface ParentingPlan {
  homeworkSupport: SupportTask[];
  purchasesNeeded: PurchaseTask[];
  upcomingActivities: Activity[];
  announcements: string[];
}

export interface SupportTask {
  child: string;
  subject: string;
  description: string;
  dueDate?: string;
}

export interface PurchaseTask {
  item: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Activity {
  title: string;
  date: string;
  location?: string;
  requirements?: string[];
}
