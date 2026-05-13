export interface TodoistTask {
  id: string;
  content: string;
  priority: 1 | 2 | 3 | 4; // 4 = urgent, 3 = high, 2 = medium, 1 = normal
  due?: {
    date: string;
    string: string;
  };
  url: string;
}
