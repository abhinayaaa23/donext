export interface SubTask {
  id: string;
  name: string;
  completed: boolean;
  group?: string; // Group/category like 'UI Foundation'
  duration?: number; // Estimated duration in minutes
}

export interface Task {
  id: string;
  userId: string;
  name: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  aiEstimateHours?: number;
  aiEstimateReasoning?: string;
  actualHours?: number;
  completed: boolean;
  createdAt: string; // ISO String
  completedAt?: string; // ISO String
  isRecurring: boolean;
  recurrencePattern: 'none' | 'daily' | 'weekly' | 'monthly';
  subtasks: SubTask[];
  riskLevel: 'Low' | 'Medium' | 'High';
  riskReason: string;
}

export interface WorkloadDay {
  dayName: string; // Monday, Tuesday, etc.
  date: string; // YYYY-MM-DD
  status: 'Low' | 'Moderate' | 'High';
  estimatedHours: number;
  taskCount: number;
}

export interface ForecastSummary {
  todayStatus: 'Low' | 'Moderate' | 'High';
  upcomingPeak: string; // Day Name or Date
  completionProbability: number; // percentage (0 - 100)
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface RecommendedAction {
  taskId: string;
  taskName: string;
  actionText: string;
  estimatedHours: number;
  expectedRiskReduction: number; // percentage reduction
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  text: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}
