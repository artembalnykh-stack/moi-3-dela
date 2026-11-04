import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Section, Task, TaskDraft } from './types'
import { useTaskStore } from './store/useTaskStore'
import {
  SETTINGS_KEY,
  TASKS_KEY,
  parseStoredSettingsText,
  parseStoredTasksText,
} from './lib/storage'
import { downloadJson, downloadText, buildBackup } from './lib/backup'
import {
  getNotificationPermission,
  requestNotificationPermission,
  showSystemNotificationOnce,
  type PermissionState,
} from './lib/notifications'
import {
  formatLongDate,
  formatTodayHeading,
  todayKey,
} from './lib/date'
import {
  getCompleted,
  getCounts,
  getTodayBuckets,
  getTodaySummary,
  getUpcoming,
} from './lib/tasks'
import { Header } from './components/Header'
import { NavTabs } from './components/NavTabs'
import { QuickAdd } from './components/QuickAdd'
import { SectionHeader } from './components/SectionHeader'
import { SummaryBanner } from './components/SummaryBanner'
import { TaskCard } from './components/TaskCard'
import { TaskGroup } from './components/TaskGroup'
import { EmptyState } from './components/EmptyState'
import { TaskDialog } from './components/TaskDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { StorageBanner } from './components/StorageBanner'
import { StorageErrorScreen } from './components/StorageErrorScreen'
import { Toast, type ToastState } from './components/Toast'
import {
  ArrowRightIcon,
  CalendarIcon,
  InboxIcon,
  PlusIcon,
} from './components/Icons'

function sectionForTask(task: Task, today: string): Section {
  if (task.status === 'done') return 'completed'
  if (task.dueDate === null || task.dueDate <= today) return 'today'
  return 'upcoming'
}

export default function App() {
  const {
    tasks,
    settings,
    section,
    storageError,
    loadError,
    storageAvailable,
    highlightTaskId,
    highlightGroup,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    restoreTask,
    replaceTasks,
    resetStorage,
    retrySave,
    reloadFromStorage,
    syncTasks,
    syncSettings,
    setSettings,
    setStorageError,
    setSection,
    setHighlightTaskId,
    setHighlightGroup,
  } = useTaskStore()

  const quickAddRef = useRef<HTMLInputElement>(null)
  const didSummaryRef = useRef(false)
  const didNotifyRef = useRef(false)
  const toastIdRef = useRef(0)

  const [today, setToday] = useState(todayKey)
  const [todayHeading, setTodayHeading] = useState(() => formatTodayHeading())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [permission, setPermission] = useState<PermissionState>(
    getNotificationPermission,
  )
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const summary = useMemo(() => getTodaySummary(tasks, today), [tasks, today])
  const counts = useMemo(() => getCounts(tasks, today), [tasks, today])
  const buckets = useMemo(() => getTodayBuckets(tasks, today), [tasks, today])
  const upcoming = useMemo(() => getUpcoming(tasks, today), [tasks, today])
  const completed = useMemo(() => getCompleted(tasks), [tasks])

  const showToast = useCallback(
    (
      message: string,
      options: {
        tone?: 'default' | 'error'
        actionLabel?: string
        onAction?: () => void
      } = {},
    ) => {
      toastIdRef.current += 1
      setToast({
        id: toastIdRef.current,
        message,
        tone: options.tone,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      })
    },
    [],
  )

  const closeToast = useCallback(() => setToast(null), [])

  const refreshPermission = useCallback(() => {
    setPermission(getNotificationPermission())
  }, [])

  useEffect(() => {
    const update = () => {
      setToday(todayKey())
      setTodayHeading(formatTodayHeading())
    }
    const interval = window.setInterval(update, 30_000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  useEffect(() => {
    if (didSummaryRef.current || loadError) return
    didSummaryRef.current = true
    setSummaryVisible(summary.total > 0)
  }, [loadError, summary.total])

  useEffect(() => {
    if (didNotifyRef.current || loadError) return
    if (!settings.notificationsEnabled) return

    didNotifyRef.current = true
    if (permission !== 'granted' || summary.total === 0) return

    void showSystemNotificationOnce(summary, () => {
      useTaskStore.getState().setSection('today')
      window.focus()
    })
  }, [loadError, settings.notificationsEnabled, permission, summary])

  useEffect(() => {
    const update = () => refreshPermission()
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [refreshPermission])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === TASKS_KEY) {
        if (event.newValue === null) {
          syncTasks([])
          return
        }
        const result = parseStoredTasksText(event.newValue)
        if (result.ok) {
          syncTasks(result.value)
        } else {
          setStorageError(
            'Данные в другой вкладке не удалось прочитать. Обновите страницу.',
          )
        }
      }

      if (event.key === SETTINGS_KEY && event.newValue !== null) {
        const parsed = parseStoredSettingsText(event.newValue)
        if (parsed) syncSettings(parsed)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [syncTasks, syncSettings, setStorageError])

  useEffect(() => {
    if (!highlightTaskId) return
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`task-${highlightTaskId}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    const clearTimer = window.setTimeout(() => setHighlightTaskId(null), 2_400)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearTimer)
    }
  }, [highlightTaskId, setHighlightTaskId])

  useEffect(() => {
    if (!highlightGroup) return
    const timer = window.setTimeout(() => {
      const element = document.getElementById(highlightGroup)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    const clearTimer = window.setTimeout(() => setHighlightGroup(null), 2_400)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearTimer)
    }
  }, [highlightGroup, setHighlightGroup])

  function openCreateDialog() {
    setEditingTask(null)
    setDialogOpen(true)
  }

  function openEditDialog(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  function closeTaskDialog() {
    setDialogOpen(false)
    setEditingTask(null)
  }

  function handleQuickAdd(title: string): { ok: boolean; error?: string } {
    const task = addTask({
      title,
      description: '',
      dueDate: null,
      priority: 'medium',
    })
    setSection('today')
    setHighlightTaskId(task.id)
    return { ok: true }
  }

  function handleSave(draft: TaskDraft) {
    if (editingTask) {
      updateTask(editingTask.id, draft)
      const updated = useTaskStore
        .getState()
        .tasks.find((task) => task.id === editingTask.id)
      if (updated) {
        setSection(sectionForTask(updated, today))
        setHighlightTaskId(updated.id)
      }
      showToast('Изменения сохранены')
    } else {
      const task = addTask(draft)
      setSection(sectionForTask(task, today))
      setHighlightTaskId(task.id)
      showToast('Задача добавлена')
    }
    closeTaskDialog()
  }

  function handleDelete(id: string) {
    const removed = deleteTask(id)
    closeTaskDialog()
    if (!removed) return

    showToast('Задача удалена', {
      actionLabel: 'Отменить',
      onAction: () => {
        restoreTask(removed)
        setSection(sectionForTask(removed, today))
        setHighlightTaskId(removed.id)
      },
    })
  }

  function handleToggle(id: string) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    const wasDone = task.status === 'done'
    toggleTask(id)
    showToast(wasDone ? 'Задача возвращена в работу' : 'Задача выполнена', {
      actionLabel: 'Отменить',
      onAction: () => toggleTask(id),
    })
  }

  function handleExport() {
    try {
      const backup = buildBackup(tasks)
      downloadJson(`tasks-backup-${today}.json`, backup)
      showToast('Резервная копия скачана')
    } catch {
      showToast('Не удалось создать файл резервной копии.', { tone: 'error' })
    }
  }

  function handleImport(importedTasks: Task[]): string | null {
    const error = replaceTasks(importedTasks)
    if (error) return error

    setSection('today')
    showToast(`Восстановлено задач: ${importedTasks.length}`)
    return null
  }

  function handleResetStorage() {
    const error = resetStorage()
    if (error) {
      showToast(error, { tone: 'error' })
    } else {
      showToast('Данные сброшены')
    }
  }

  function handleRetryLoad() {
    const ok = reloadFromStorage()
    if (!ok) {
      showToast('Данные всё ещё не читаются.', { tone: 'error' })
    }
  }

  function handleDownloadRaw() {
    if (!loadError?.raw) return
    try {
      downloadText(`tracker-raw-${today}.txt`, loadError.raw)
    } catch {
      showToast('Не удалось скачать повреждённые данные.', { tone: 'error' })
    }
  }

  async function handleToggleNotifications() {
    if (permission === 'unsupported') {
      showToast('Браузер не поддерживает системные уведомления.', {
        tone: 'error',
      })
      return
    }

    if (settings.notificationsEnabled) {
      setSettings({ notificationsEnabled: false })
      showToast('Системные уведомления выключены')
      return
    }

    if (permission === 'granted') {
      setSettings({ notificationsEnabled: true })
      didNotifyRef.current = true
      showToast('Системные уведомления включены')
      return
    }

    if (permission === 'denied') {
      showToast(
        'Уведомления заблокированы в браузере. Разрешите их в настройках сайта.',
        { tone: 'error' },
      )
      return
    }

    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      setSettings({ notificationsEnabled: true })
      didNotifyRef.current = true
      showToast('Системные уведомления включены')
    } else {
      setSettings({ notificationsEnabled: false })
      showToast(
        'Разрешение не выдано. Сводка останется в интерфейсе приложения.',
        { tone: 'error' },
      )
    }
  }

  function handleRefreshPermission() {
    const next = getNotificationPermission()
    setPermission(next)
    if (next === 'granted') {
      showToast('Разрешение получено. Можно включить уведомления.')
    } else if (next === 'denied') {
      showToast('Разрешение всё ещё заблокировано в браузере.', {
        tone: 'error',
      })
    } else {
      showToast('Разрешение пока не выдано.')
    }
  }

  function focusQuickAdd() {
    if (section !== 'today') setSection('today')
    window.setTimeout(() => {
      quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      quickAddRef.current?.focus()
    }, 40)
  }

  function openNoDueGroup() {
    setSection('today')
    setHighlightGroup('group-no-due')
  }

  function openToday() {
    setSection('today')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openSummary() {
    setSection('today')
    if (summary.overdue > 0) setHighlightGroup('group-overdue')
    else setHighlightGroup('group-today')
  }

  function handleRetrySave() {
    const ok = retrySave()
    showToast(ok ? 'Данные сохранены' : 'Сохранить пока не удалось.', {
      tone: ok ? 'default' : 'error',
    })
  }

  if (loadError) {
    return (
      <StorageErrorScreen
        loadError={loadError}
        onRetry={handleRetryLoad}
        onDownloadRaw={handleDownloadRaw}
        onImport={handleImport}
        onReset={handleResetStorage}
      />
    )
  }

  const showSummary = summaryVisible && summary.total > 0 && !loadError
  const todayEmpty =
    buckets.overdue.length === 0 &&
    buckets.today.length === 0 &&
    buckets.noDue.length === 0

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Перейти к задачам
      </a>

      <div className="container">
        <Header
          onOpenSettings={() => {
            refreshPermission()
            setSettingsOpen(true)
          }}
        />

        {storageError ? (
          <StorageBanner
            message={
              storageAvailable
                ? storageError
                : `${storageError} Изменения пока хранятся только в памяти.`
            }
            onRetry={handleRetrySave}
            onExport={handleExport}
          />
        ) : null}

        <NavTabs
          section={section}
          counts={counts}
          overdue={summary.overdue}
          onChange={setSection}
        />

        {showSummary ? (
          <SummaryBanner
            summary={summary}
            dateLabel={formatLongDate(today)}
            onOpen={openSummary}
            onDismiss={() => setSummaryVisible(false)}
          />
        ) : null}

        <main id="main-content" className="main">
          <SectionHeader
            section={section}
            todayLabel={todayHeading}
            overdue={summary.overdue}
            onOpenOverdue={() => setHighlightGroup('group-overdue')}
          />

          <QuickAdd
            inputRef={quickAddRef}
            onAdd={handleQuickAdd}
            onOpenCreate={openCreateDialog}
          />

          {section === 'today' ? (
            todayEmpty ? (
              <EmptyState
                icon={<InboxIcon size={26} />}
                title="На сегодня задач нет"
                text="Добавьте первое дело или запланируйте его на будущее. Задачи без срока тоже живут здесь."
                actions={
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={focusQuickAdd}
                    >
                      <PlusIcon size={17} />
                      Добавить задачу
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={openCreateDialog}
                    >
                      <CalendarIcon size={17} />
                      Создать со сроком
                    </button>
                  </>
                }
              />
            ) : (
              <div className="groups">
                {buckets.overdue.length > 0 ? (
                  <TaskGroup
                    id="group-overdue"
                    title="Просрочено"
                    count={buckets.overdue.length}
                    tone="danger"
                    highlighted={highlightGroup === 'group-overdue'}
                  >
                    {buckets.overdue.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        today={today}
                        highlighted={highlightTaskId === task.id}
                        onEdit={openEditDialog}
                        onToggle={handleToggle}
                      />
                    ))}
                  </TaskGroup>
                ) : null}

                {buckets.today.length > 0 ? (
                  <TaskGroup
                    id="group-today"
                    title="На сегодня"
                    count={buckets.today.length}
                    highlighted={highlightGroup === 'group-today'}
                  >
                    {buckets.today.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        today={today}
                        highlighted={highlightTaskId === task.id}
                        onEdit={openEditDialog}
                        onToggle={handleToggle}
                      />
                    ))}
                  </TaskGroup>
                ) : null}

                {buckets.noDue.length > 0 ? (
                  <TaskGroup
                    id="group-no-due"
                    title="Без срока"
                    count={buckets.noDue.length}
                    highlighted={highlightGroup === 'group-no-due'}
                  >
                    {buckets.noDue.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        today={today}
                        highlighted={highlightTaskId === task.id}
                        onEdit={openEditDialog}
                        onToggle={handleToggle}
                      />
                    ))}
                  </TaskGroup>
                ) : null}
              </div>
            )
          ) : null}

          {section === 'upcoming' ? (
            upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon size={26} />}
                title="Предстоящих задач нет"
                text="Задачи со сроком на будущие дни появятся здесь. Можно начать с задачи без срока."
                actions={
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={openCreateDialog}
                    >
                      <PlusIcon size={17} />
                      Добавить задачу
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={openNoDueGroup}
                    >
                      Открыть задачи без срока
                      <ArrowRightIcon size={16} />
                    </button>
                  </>
                }
              />
            ) : (
              <div className="task-list" aria-label="Предстоящие задачи">
                {upcoming.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    today={today}
                    highlighted={highlightTaskId === task.id}
                    onEdit={openEditDialog}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )
          ) : null}

          {section === 'completed' ? (
            completed.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={26} />}
                title="Нет завершённых задач"
                text="Отмечайте сделанное — задачи будут собираться здесь, чтобы можно было вернуться к ним."
                actions={
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={focusQuickAdd}
                    >
                      <PlusIcon size={17} />
                      Добавить задачу
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={openToday}
                    >
                      К задачам на сегодня
                      <ArrowRightIcon size={16} />
                    </button>
                  </>
                }
              />
            ) : (
              <div className="task-list" aria-label="Завершённые задачи">
                {completed.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    today={today}
                    highlighted={highlightTaskId === task.id}
                    onEdit={openEditDialog}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )
          ) : null}
        </main>

        <footer className="app-footer">
          <span>
            Данные хранятся только в этом браузере. Очистка данных сайта может
            удалить задачи.
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              refreshPermission()
              setSettingsOpen(true)
            }}
          >
            Резервная копия и уведомления
          </button>
        </footer>
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        today={today}
        onClose={closeTaskDialog}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <SettingsDialog
        open={settingsOpen}
        tasksCount={tasks.length}
        settings={settings}
        permission={permission}
        onClose={() => setSettingsOpen(false)}
        onToggleNotifications={handleToggleNotifications}
        onRefreshPermission={handleRefreshPermission}
        onExport={handleExport}
        onImport={handleImport}
      />

      {toast ? <Toast toast={toast} onClose={closeToast} /> : null}
    </div>
  )
}
