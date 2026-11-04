export type Priority = 'high' | 'medium' | 'low'
export type Status = 'todo' | 'done'
export type Section = 'today' | 'upcoming' | 'completed'

export interface Task {
  id: string
  title: string
  description: string
  dueDate: string | null
  priority: Priority
  status: Status
  createdAt: string
  completedAt: string | null
}

export interface TaskDraft {
  title: string
  description: string
  dueDate: string | null
  priority: Priority
}

export interface Settings {
  version: 1
  notificationsEnabled: boolean
}

export interface BackupFile {
  app: string
  version: 1
  exportedAt: string
  tasks: Task[]
}

export interface TodaySummary {
  overdue: number
  today: number
  total: number
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export const SECTION_LABELS: Record<Section, string> = {
  today: 'Сегодня',
  upcoming: 'Предстоящие',
  completed: 'Завершённые',
}
