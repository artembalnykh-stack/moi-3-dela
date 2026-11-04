import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Settings, Task } from '../types'
import type { PermissionState } from '../lib/notifications'
import {
  MAX_IMPORT_BYTES,
  parseBackupText,
} from '../lib/backup'
import { CloseIcon, DownloadIcon, UploadIcon } from './Icons'
import { pluralTasks } from '../lib/date'

interface SettingsDialogProps {
  open: boolean
  tasksCount: number
  settings: Settings
  permission: PermissionState
  onClose: () => void
  onToggleNotifications: () => void
  onRefreshPermission: () => void
  onExport: () => void
  onImport: (tasks: Task[]) => string | null
}

interface ImportPreview {
  fileName: string
  tasks: Task[]
}

function permissionLabel(permission: PermissionState): string {
  switch (permission) {
    case 'granted':
      return 'Разрешены'
    case 'denied':
      return 'Заблокированы'
    case 'default':
      return 'Не запрошены'
    default:
      return 'Не поддерживаются'
  }
}

export function SettingsDialog({
  open,
  tasksCount,
  settings,
  permission,
  onClose,
  onToggleNotifications,
  onRefreshPermission,
  onExport,
  onImport,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      window.setTimeout(() => closeButtonRef.current?.focus(), 0)
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  function handleClose() {
    setImportPreview(null)
    setImportError(null)
    onClose()
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImportError(null)
    setImportPreview(null)

    if (file.size > MAX_IMPORT_BYTES) {
      setImportError('Файл слишком большой. Максимум — 5 МБ.')
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setImportError('Не удалось прочитать файл.')
      return
    }

    const result = parseBackupText(text)
    if (!result.ok) {
      setImportError(result.error)
      return
    }

    setImportPreview({ fileName: file.name, tasks: result.value })
  }

  function confirmImport() {
    if (!importPreview) return
    const error = onImport(importPreview.tasks)
    if (error) {
      setImportError(error)
      return
    }
    setImportPreview(null)
    handleClose()
  }

  const supported = permission !== 'unsupported'
  const enabled = settings.notificationsEnabled
  const statusTone =
    permission === 'granted'
      ? 'success'
      : permission === 'denied'
        ? 'danger'
        : 'neutral'

  return (
    <dialog
      ref={dialogRef}
      className="dialog settings-dialog"
      aria-labelledby="settings-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
    >
      <div className="dialog__inner">
        <div className="dialog__head">
          <div>
            <h2 id="settings-dialog-title" className="dialog__title">
              Настройки
            </h2>
            <p className="dialog__subtitle">
              Уведомления и резервная копия задач.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={handleClose}
            aria-label="Закрыть настройки"
            title="Закрыть"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <section className="settings-section" aria-labelledby="settings-notifications">
          <div className="settings-section__head">
            <h3 id="settings-notifications">Уведомления</h3>
            <span className={`status-pill status-pill--${statusTone}`}>
              {permissionLabel(permission)}
            </span>
          </div>

          <div className="switch-row">
            <div>
              <p className="settings-label">Системные уведомления</p>
              <p className="settings-text">
                Сводка при открытии приложения. Без звука и только пока
                приложение открыто.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Системные уведомления"
              className="switch"
              disabled={!supported}
              onClick={onToggleNotifications}
            >
              <span className="switch__knob" aria-hidden="true" />
            </button>
          </div>

          <p className="settings-text settings-text--muted">
            {permission === 'unsupported'
              ? 'Браузер не поддерживает системные уведомления. Сводка будет показываться в интерфейсе.'
              : permission === 'denied'
                ? 'Уведомления заблокированы в браузере. Разрешите их для этого сайта, затем обновите статус.'
                : permission === 'default'
                  ? 'Разрешение будет запрошено только при включении этого переключателя.'
                  : enabled
                    ? 'Включены. Следующая сводка появится при новом открытии приложения.'
                    : 'Разрешены, но сейчас выключены.'}
          </p>

          <p className="settings-text settings-text--muted">
            Сводка внутри интерфейса показывается при каждом открытии независимо
            от системных уведомлений.
          </p>

          {permission === 'denied' ? (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={onRefreshPermission}
            >
              Проверить разрешение
            </button>
          ) : null}
        </section>

        <section className="settings-section" aria-labelledby="settings-backup">
          <div className="settings-section__head">
            <h3 id="settings-backup">Резервная копия</h3>
            <span className="status-pill status-pill--neutral">
              {tasksCount} {pluralTasks(tasksCount)}
            </span>
          </div>

          <p className="settings-text">
            Сохраните копию задач в файл, чтобы не потерять их при очистке
            браузера или перенести на другое устройство. Восстановление заменит
            текущий список целиком.
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onExport}
            >
              <DownloadIcon size={17} />
              Скачать резервную копию
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon size={17} />
              Восстановить из копии
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              aria-label="Выбрать файл резервной копии"
            />
          </div>

          <p className="settings-text settings-text--muted">
            Файл .json — обычный файл с данными. Открывать его вручную не нужно:
            он нужен только для восстановления в этом приложении.
          </p>

          {importError ? (
            <p className="field-error" role="alert">
              {importError}
            </p>
          ) : null}

          {importPreview ? (
            <div className="import-preview" role="alert">
              <p>
                Файл <strong>{importPreview.fileName}</strong>: задач —{' '}
                {importPreview.tasks.length}. Текущие {tasksCount}{' '}
                {pluralTasks(tasksCount)} будут заменены целиком. Это действие
                нельзя отменить.
              </p>
              <div className="import-preview__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setImportPreview(null)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={confirmImport}
                >
                  Восстановить и заменить
                </button>
              </div>
            </div>
          ) : null}

          <p className="backup-warning">
            Очистка данных сайта или браузера может удалить задачи. Резервная
            копия хранится там, куда вы её скачали.
          </p>
        </section>

        <section className="settings-section" aria-labelledby="settings-about">
          <h3 id="settings-about">О приложении</h3>
          <p className="settings-text">
            «Мои 3 дела» — локальный трекер задач. Данные не отправляются на
            сервер и не синхронизируются между устройствами.
          </p>
          <p className="settings-text settings-text--muted">
            Версия 1.0 · React, TypeScript, Vite
          </p>
        </section>
      </div>
    </dialog>
  )
}
