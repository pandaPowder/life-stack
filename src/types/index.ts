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
  announcements: Announcement[];
}

export interface SupportTask {
  child: string;
  subject: string;
  description: string;
  dueDate?: string;
  sources?: string[]; // Subject or chat name
}

export interface PurchaseTask {
  item: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  sources?: string[];
}

export interface Activity {
  title: string;
  date: string;
  location?: string;
  requirements?: string[];
  sources?: string[];
}

export interface Announcement {
  text: string;
  sources?: string[];
}
