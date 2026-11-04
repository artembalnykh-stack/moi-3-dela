import type { BackupFile, Priority, Status, Task } from '../types'
import { isValidDateKey, isValidIsoDateTime, nowIso } from './date'

export const BACKUP_APP = 'personal-task-tracker'
export const BACKUP_VERSION = 1
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const STATUSES: Status[] = ['todo', 'done']

type UnknownRecord = Record<string, unknown>

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITIES.includes(value as Priority)
}

function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && STATUSES.includes(value as Status)
}

export function validateTaskArray(value: unknown): ValidationResult<Task[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: 'Поле «tasks» должно быть массивом задач.' }
  }

  const tasks: Task[] = []
  const ids = new Set<string>()

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    const label = `Задача №${index + 1}`

    if (!isRecord(item)) {
      return { ok: false, error: `${label}: ожидается объект.` }
    }

    if (typeof item.id !== 'string' || !UUID_RE.test(item.id)) {
      return { ok: false, error: `${label}: поле «id» должно быть UUID.` }
    }
    if (ids.has(item.id)) {
      return { ok: false, error: `${label}: повторяющийся id «${item.id}».` }
    }
    ids.add(item.id)

    if (typeof item.title !== 'string') {
      return { ok: false, error: `${label}: поле «title» должно быть строкой.` }
    }
    const title = item.title.trim()
    if (title.length === 0) {
      return { ok: false, error: `${label}: название не может быть пустым.` }
    }
    if (title.length > 200) {
      return {
        ok: false,
        error: `${label}: название длиннее 200 символов.`,
      }
    }

    if (
      item.description !== undefined &&
      item.description !== null &&
      typeof item.description !== 'string'
    ) {
      return {
        ok: false,
        error: `${label}: поле «description» должно быть строкой.`,
      }
    }
    const description =
      typeof item.description === 'string' ? item.description.trim() : ''

    if (
      item.dueDate !== undefined &&
      item.dueDate !== null &&
      (typeof item.dueDate !== 'string' || !isValidDateKey(item.dueDate))
    ) {
      return {
        ok: false,
        error: `${label}: поле «dueDate» должно быть датой YYYY-MM-DD или null.`,
      }
    }
    const dueDate = typeof item.dueDate === 'string' ? item.dueDate : null

    if (!isPriority(item.priority)) {
      return {
        ok: false,
        error: `${label}: недопустимый приоритет «${String(item.priority)}».`,
      }
    }

    if (!isStatus(item.status)) {
      return {
        ok: false,
        error: `${label}: недопустимый статус «${String(item.status)}».`,
      }
    }

    if (
      typeof item.createdAt !== 'string' ||
      !isValidIsoDateTime(item.createdAt)
    ) {
      return {
        ok: false,
        error: `${label}: поле «createdAt» должно быть датой ISO 8601.`,
      }
    }

    if (
      item.completedAt !== undefined &&
      item.completedAt !== null &&
      (typeof item.completedAt !== 'string' ||
        !isValidIsoDateTime(item.completedAt))
    ) {
      return {
        ok: false,
        error: `${label}: поле «completedAt» должно быть датой ISO 8601 или null.`,
      }
    }
    const completedAt =
      typeof item.completedAt === 'string' ? item.completedAt : null

    if (item.status === 'done' && completedAt === null) {
      return {
        ok: false,
        error: `${label}: у выполненной задачи должен быть completedAt.`,
      }
    }
    if (item.status === 'todo' && completedAt !== null) {
      return {
        ok: false,
        error: `${label}: у незавершённой задачи completedAt должен быть null.`,
      }
    }

    tasks.push({
      id: item.id,
      title,
      description,
      dueDate,
      priority: item.priority,
      status: item.status,
      createdAt: item.createdAt,
      completedAt,
    })
  }

  return { ok: true, value: tasks }
}

export function buildBackup(tasks: Task[]): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    tasks,
  }
}

export function parseBackupText(text: string): ValidationResult<Task[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Файл не является корректным JSON.' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Корневой элемент файла должен быть объектом.' }
  }

  if (parsed.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Неподдерживаемая версия формата. Ожидается версия ${BACKUP_VERSION}.`,
    }
  }

  if (parsed.app !== undefined && typeof parsed.app !== 'string') {
    return { ok: false, error: 'Поле «app» должно быть строкой.' }
  }

  if (
    parsed.exportedAt !== undefined &&
    (typeof parsed.exportedAt !== 'string' ||
      !isValidIsoDateTime(parsed.exportedAt))
  ) {
    return {
      ok: false,
      error: 'Поле «exportedAt» должно быть датой ISO 8601.',
    }
  }

  if (!('tasks' in parsed)) {
    return { ok: false, error: 'В файле нет поля «tasks».' }
  }

  return validateTaskArray(parsed.tasks)
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
