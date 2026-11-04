import type { Settings, Task } from '../types'
import {
  type ValidationResult,
  validateTaskArray,
} from './backup'
import { nowIso } from './date'

export const TASKS_KEY = 'tracker.tasks.v1'
export const SETTINGS_KEY = 'tracker.settings.v1'
export const LAST_NOTIFIED_KEY = 'tracker.lastNotifiedAt.v1'
const STORAGE_VERSION = 1

export interface LoadError {
  message: string
  raw?: string
}

export interface InitialState {
  tasks: Task[]
  settings: Settings
  loadError: LoadError | null
  storageError: string | null
  storageAvailable: boolean
}

export function createDefaultSettings(): Settings {
  return { version: 1, notificationsEnabled: false }
}

export function describeStorageError(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      return 'Хранилище браузера переполнено. Задачи не сохраняются. Скачайте резервную копию и освободите место.'
    }
    if (error.name === 'SecurityError') {
      return 'Браузер запретил доступ к локальному хранилищу. Изменения не сохраняются.'
    }
  }
  return 'Не удалось сохранить данные в локальном хранилище. Попробуйте ещё раз или скачайте резервную копию.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseStoredTasksText(
  text: string,
): ValidationResult<Task[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Сохранённые данные не являются корректным JSON.' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Сохранённые данные имеют неверную структуру.' }
  }
  if (parsed.version !== STORAGE_VERSION) {
    return {
      ok: false,
      error: 'Версия сохранённых данных не поддерживается.',
    }
  }
  if (!('tasks' in parsed)) {
    return { ok: false, error: 'В сохранённых данных нет списка задач.' }
  }
  return validateTaskArray(parsed.tasks)
}

export function parseStoredSettingsText(text: string): Settings | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) return null
    if (parsed.version !== STORAGE_VERSION) return null
    if (typeof parsed.notificationsEnabled !== 'boolean') return null
    return {
      version: 1,
      notificationsEnabled: parsed.notificationsEnabled,
    }
  } catch {
    return null
  }
}

export function loadInitialState(): InitialState {
  let storageAvailable = true
  let storageError: string | null = null
  let tasks: Task[] = []
  let settings = createDefaultSettings()
  let loadError: LoadError | null = null

  try {
    const rawTasks = window.localStorage.getItem(TASKS_KEY)
    if (rawTasks !== null) {
      const result = parseStoredTasksText(rawTasks)
      if (result.ok) {
        tasks = result.value
      } else {
        loadError = {
          message: result.error,
          raw: rawTasks,
        }
      }
    }
  } catch (error) {
    storageAvailable = false
    storageError = describeStorageError(error)
  }

  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_KEY)
    if (rawSettings !== null) {
      const parsed = parseStoredSettingsText(rawSettings)
      if (parsed) settings = parsed
    }
  } catch (error) {
    if (storageAvailable) {
      storageError = describeStorageError(error)
    }
  }

  return {
    tasks,
    settings,
    loadError,
    storageError,
    storageAvailable,
  }
}

export function saveTasks(tasks: Task[]): string | null {
  try {
    window.localStorage.setItem(
      TASKS_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        updatedAt: nowIso(),
        tasks,
      }),
    )
    return null
  } catch (error) {
    return describeStorageError(error)
  }
}

export function saveSettings(settings: Settings): string | null {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        notificationsEnabled: settings.notificationsEnabled,
      }),
    )
    return null
  } catch (error) {
    return describeStorageError(error)
  }
}

export function clearTasksStorage(): string | null {
  try {
    window.localStorage.removeItem(TASKS_KEY)
    return null
  } catch (error) {
    return describeStorageError(error)
  }
}
