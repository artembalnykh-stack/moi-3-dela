import type { Priority, Task, TodaySummary } from '../types'
import { addDays, diffCalendarDays, formatDateKey, todayKey } from './date'

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function compareCreated(a: Task, b: Task): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

function comparePriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareCreated(a, b)
}

export function sortOverdue(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
      comparePriority(a, b),
  )
}

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(comparePriority)
}

export function sortUpcoming(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
      comparePriority(a, b),
  )
}

export function sortCompleted(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
      compareCreated(a, b),
  )
}

export interface TodayBuckets {
  overdue: Task[]
  today: Task[]
  noDue: Task[]
}

export function getTodayBuckets(tasks: Task[], today: string): TodayBuckets {
  return {
    overdue: sortOverdue(
      tasks.filter(
        (task) =>
          task.status === 'todo' &&
          task.dueDate !== null &&
          task.dueDate < today,
      ),
    ),
    today: sortByPriority(
      tasks.filter((task) => task.status === 'todo' && task.dueDate === today),
    ),
    noDue: sortByPriority(
      tasks.filter((task) => task.status === 'todo' && task.dueDate === null),
    ),
  }
}

export function getUpcoming(tasks: Task[], today: string): Task[] {
  return sortUpcoming(
    tasks.filter(
      (task) =>
        task.status === 'todo' &&
        task.dueDate !== null &&
        task.dueDate > today,
    ),
  )
}

export function getCompleted(tasks: Task[]): Task[] {
  return sortCompleted(tasks.filter((task) => task.status === 'done'))
}

export function getCounts(tasks: Task[], today: string) {
  const buckets = getTodayBuckets(tasks, today)
  const upcoming = getUpcoming(tasks, today)
  const completed = getCompleted(tasks)
  return {
    today: buckets.overdue.length + buckets.today.length + buckets.noDue.length,
    upcoming: upcoming.length,
    completed: completed.length,
  }
}

export function getTodaySummary(tasks: Task[], today: string): TodaySummary {
  let overdue = 0
  let dueToday = 0
  for (const task of tasks) {
    if (task.status !== 'todo' || task.dueDate === null) continue
    if (task.dueDate < today) overdue += 1
    else if (task.dueDate === today) dueToday += 1
  }
  return { overdue, today: dueToday, total: overdue + dueToday }
}

export function getOverdueDays(task: Task, today: string): number {
  if (task.status !== 'todo' || task.dueDate === null) return 0
  const days = diffCalendarDays(today, task.dueDate)
  return days > 0 ? days : 0
}

export function isOverdue(task: Task, today: string): boolean {
  return getOverdueDays(task, today) > 0
}

export function formatDueLabel(dueDate: string | null, today: string): string {
  if (dueDate === null) return 'Без срока'
  if (dueDate === today) return 'Сегодня'
  if (dueDate === addDays(today, 1)) return 'Завтра'
  if (dueDate === addDays(today, -1)) return 'Вчера'
  return formatDateKey(dueDate)
}

export function getTodayDate(): string {
  return todayKey()
}
