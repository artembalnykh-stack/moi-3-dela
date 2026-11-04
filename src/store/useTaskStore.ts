import { create } from 'zustand'
import type { Section, Settings, Task, TaskDraft } from '../types'
import {
  type LoadError,
  clearTasksStorage,
  createDefaultSettings,
  loadInitialState,
  saveSettings,
  saveTasks,
} from '../lib/storage'
import { nowIso } from '../lib/date'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

interface TaskStore {
  tasks: Task[]
  settings: Settings
  section: Section
  storageError: string | null
  loadError: LoadError | null
  storageAvailable: boolean
  highlightTaskId: string | null
  highlightGroup: string | null

  addTask: (draft: TaskDraft) => Task
  updateTask: (id: string, draft: TaskDraft) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => Task | null
  restoreTask: (task: Task) => void
  replaceTasks: (tasks: Task[]) => string | null
  resetStorage: () => string | null
  retrySave: () => boolean
  reloadFromStorage: () => boolean
  syncTasks: (tasks: Task[]) => void
  syncSettings: (settings: Settings) => void
  setSettings: (patch: Partial<Settings>) => void
  setStorageError: (message: string | null) => void
  setSection: (section: Section) => void
  setHighlightTaskId: (id: string | null) => void
  setHighlightGroup: (group: string | null) => void
  clearHighlights: () => void
}

function persistTasks(
  set: (partial: Partial<TaskStore>) => void,
  tasks: Task[],
): string | null {
  const error = saveTasks(tasks)
  if (error) {
    set({ storageError: error })
  } else {
    set({ storageError: null, storageAvailable: true })
  }
  return error
}

const initialState = loadInitialState()

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: initialState.tasks,
  settings: initialState.settings ?? createDefaultSettings(),
  section: 'today',
  storageError: initialState.storageError,
  loadError: initialState.loadError,
  storageAvailable: initialState.storageAvailable,
  highlightTaskId: null,
  highlightGroup: null,

  addTask: (draft) => {
    const task: Task = {
      id: createId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      dueDate: draft.dueDate,
      priority: draft.priority,
      status: 'todo',
      createdAt: nowIso(),
      completedAt: null,
    }
    const tasks = [task, ...get().tasks]
    set({ tasks })
    persistTasks(set, tasks)
    return task
  },

  updateTask: (id, draft) => {
    const tasks = get().tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            title: draft.title.trim(),
            description: draft.description.trim(),
            dueDate: draft.dueDate,
            priority: draft.priority,
          }
        : task,
    )
    set({ tasks })
    persistTasks(set, tasks)
  },

  toggleTask: (id) => {
    const tasks = get().tasks.map((task) => {
      if (task.id !== id) return task
      if (task.status === 'done') {
        return {
          ...task,
          status: 'todo' as const,
          completedAt: null,
        }
      }
      return {
        ...task,
        status: 'done' as const,
        completedAt: nowIso(),
      }
    })
    set({ tasks })
    persistTasks(set, tasks)
  },

  deleteTask: (id) => {
    const removed = get().tasks.find((task) => task.id === id) ?? null
    if (!removed) return null
    const tasks = get().tasks.filter((task) => task.id !== id)
    set({ tasks })
    persistTasks(set, tasks)
    return removed
  },

  restoreTask: (task) => {
    if (get().tasks.some((item) => item.id === task.id)) return
    const tasks = [...get().tasks, task]
    set({ tasks })
    persistTasks(set, tasks)
  },

  replaceTasks: (tasks) => {
    set({ tasks, loadError: null })
    return persistTasks(set, tasks)
  },

  resetStorage: () => {
    const clearError = clearTasksStorage()
    set({
      tasks: [],
      loadError: null,
      highlightTaskId: null,
      highlightGroup: null,
    })
    if (clearError) {
      set({ storageError: clearError })
      return clearError
    }
    return persistTasks(set, [])
  },

  retrySave: () => {
    const error = persistTasks(set, get().tasks)
    return error === null
  },

  reloadFromStorage: () => {
    const next = loadInitialState()
    set({
      tasks: next.tasks,
      settings: next.settings,
      loadError: next.loadError,
      storageError: next.storageError,
      storageAvailable: next.storageAvailable,
    })
    return next.loadError === null
  },

  syncTasks: (tasks) => {
    set({ tasks, loadError: null })
  },

  syncSettings: (settings) => {
    set({ settings })
  },

  setSettings: (patch) => {
    const settings: Settings = { ...get().settings, ...patch, version: 1 }
    set({ settings })
    const error = saveSettings(settings)
    if (error) set({ storageError: error })
  },

  setStorageError: (message) => {
    set({ storageError: message })
  },

  setSection: (section) => {
    set({ section })
  },

  setHighlightTaskId: (id) => {
    set({ highlightTaskId: id })
  },

  setHighlightGroup: (group) => {
    set({ highlightGroup: group })
  },

  clearHighlights: () => {
    set({ highlightTaskId: null, highlightGroup: null })
  },
}))
