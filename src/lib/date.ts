const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTHS_SHORT = [
  'янв.',
  'февр.',
  'мар.',
  'апр.',
  'мая',
  'июн.',
  'июл.',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
]
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local calendar date as YYYY-MM-DD. Never uses toISOString(), which shifts the date. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now = new Date()): string {
  return toDateKey(now)
}

/** Parses YYYY-MM-DD as a local calendar date at 00:00 local time. */
export function parseDateKey(value: string): Date | null {
  const match = DATE_KEY_RE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function isValidDateKey(value: string): boolean {
  return parseDateKey(value) !== null
}

/**
 * Difference between two local dates in calendar days.
 * Returns a positive number when `later` is after `earlier`.
 * Date.UTC is used only for the arithmetic, so DST changes do not add or lose a day.
 */
export function diffCalendarDays(later: string, earlier: string): number {
  const laterDate = parseDateKey(later)
  const earlierDate = parseDateKey(earlier)
  if (!laterDate || !earlierDate) return 0

  const laterUtc = Date.UTC(
    laterDate.getFullYear(),
    laterDate.getMonth(),
    laterDate.getDate(),
  )
  const earlierUtc = Date.UTC(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate(),
  )
  return Math.round((laterUtc - earlierUtc) / 86_400_000)
}

export function addDays(value: string, days: number): string | null {
  const date = parseDateKey(value)
  if (!date) return null
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function formatDateKey(value: string, withYear = false): string {
  const date = parseDateKey(value)
  if (!date) return value
  const currentYear = new Date().getFullYear()
  const year = withYear || date.getFullYear() !== currentYear ? ` ${date.getFullYear()}` : ''
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${year}`
}

export function formatLongDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  if (!date) return ''
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

export function formatTodayHeading(now = new Date()): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function pluralDays(count: number): string {
  const abs = Math.abs(count) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

export function pluralTasks(count: number): string {
  const abs = Math.abs(count) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'задач'
  if (last === 1) return 'задача'
  if (last >= 2 && last <= 4) return 'задачи'
  return 'задач'
}

export function isValidIsoDateTime(value: string): boolean {
  if (typeof value !== 'string' || !value.includes('T')) return false
  return Number.isFinite(Date.parse(value))
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatCompletedAt(value: string, today: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const completedKey = toDateKey(date)
  const time = formatTime(date)
  if (completedKey === today) return `Сегодня, ${time}`
  if (completedKey === addDays(today, -1)) return `Вчера, ${time}`

  const yearSuffix =
    date.getFullYear() === new Date().getFullYear() ? '' : ` ${date.getFullYear()}`
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${yearSuffix}, ${time}`
}
