import type { TodaySummary } from '../types'
import { LAST_NOTIFIED_KEY } from './storage'

const LOCK_NAME = 'tracker.daily-summary.v1'
const FALLBACK_LOCK_KEY = 'tracker.notificationLock.v1'
const DEDUPE_WINDOW_MS = 5_000

export type PermissionState = NotificationPermission | 'unsupported'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): PermissionState {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

function readLastNotifiedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(LAST_NOTIFIED_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function markNotified(): void {
  try {
    window.localStorage.setItem(LAST_NOTIFIED_KEY, String(Date.now()))
  } catch {
    // Уведомление всё равно можно показать, даже если отметка не сохранилась.
  }
}

function isRecentlyNotified(): boolean {
  const last = readLastNotifiedAt()
  return last !== null && Date.now() - last < DEDUPE_WINDOW_MS
}

export function buildSummaryBody(summary: TodaySummary): string {
  const parts: string[] = []
  if (summary.overdue > 0) parts.push(`Просрочено: ${summary.overdue}`)
  if (summary.today > 0) parts.push(`На сегодня: ${summary.today}`)
  return parts.join(' · ')
}

function showNotification(
  summary: TodaySummary,
  onClick?: () => void,
): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  if (summary.total === 0) return

  try {
    const notification = new Notification('Задачи на сегодня', {
      body: buildSummaryBody(summary),
      tag: 'today-summary',
      silent: true,
    })
    notification.onclick = () => {
      window.focus()
      onClick?.()
      notification.close()
    }
  } catch {
    // Некоторые браузеры могут запретить создание уведомления в фоне.
  }
}

async function withFallbackLock(run: () => void): Promise<void> {
  if (isRecentlyNotified()) return

  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    const currentRaw = window.localStorage.getItem(FALLBACK_LOCK_KEY)
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as { at?: unknown }
      if (
        typeof current.at === 'number' &&
        Date.now() - current.at < 2_000
      ) {
        return
      }
    }

    window.localStorage.setItem(
      FALLBACK_LOCK_KEY,
      JSON.stringify({ token, at: Date.now() }),
    )
    await new Promise((resolve) => window.setTimeout(resolve, 60))

    const checkRaw = window.localStorage.getItem(FALLBACK_LOCK_KEY)
    const check = checkRaw
      ? (JSON.parse(checkRaw) as { token?: unknown })
      : null
    if (!check || check.token !== token) return

    markNotified()
    run()
  } catch {
    markNotified()
    run()
  }
}

/**
 * Показывает одну системную сводку при загрузке приложения.
 * Web Locks не даёт двум вкладкам показать уведомление одновременно;
 * отметка в localStorage подавляет дубль при почти одновременной загрузке.
 */
export async function showSystemNotificationOnce(
  summary: TodaySummary,
  onClick?: () => void,
): Promise<void> {
  if (
    !isNotificationSupported() ||
    Notification.permission !== 'granted' ||
    summary.total === 0
  ) {
    return
  }

  if (navigator.locks) {
    try {
      await navigator.locks.request(
        LOCK_NAME,
        { ifAvailable: true },
        async (lock) => {
          if (!lock) return
          if (isRecentlyNotified()) return
          markNotified()
          showNotification(summary, onClick)
        },
      )
      return
    } catch {
      // Переходим к безопасному fallback.
    }
  }

  await withFallbackLock(() => showNotification(summary, onClick))
}
