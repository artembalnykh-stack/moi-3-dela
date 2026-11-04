import { useRef, useState, type ChangeEvent } from 'react'
import type { Task } from '../types'
import type { LoadError } from '../lib/storage'
import {
  MAX_IMPORT_BYTES,
  parseBackupText,
} from '../lib/backup'
import {
  AlertIcon,
  DownloadIcon,
  RotateIcon,
  TrashIcon,
  UploadIcon,
} from './Icons'

interface StorageErrorScreenProps {
  loadError: LoadError
  onRetry: () => void
  onDownloadRaw: () => void
  onImport: (tasks: Task[]) => string | null
  onReset: () => void
}

interface ImportPreview {
  fileName: string
  tasks: Task[]
}

export function StorageErrorScreen({
  loadError,
  onRetry,
  onDownloadRaw,
  onImport,
  onReset,
}: StorageErrorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setPreview(null)

    if (file.size > MAX_IMPORT_BYTES) {
      setError('Файл слишком большой. Максимум — 5 МБ.')
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setError('Не удалось прочитать файл.')
      return
    }

    const result = parseBackupText(text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPreview({ fileName: file.name, tasks: result.value })
  }

  function confirmImport() {
    if (!preview) return
    const importError = onImport(preview.tasks)
    if (importError) {
      setError(importError)
      return
    }
    setPreview(null)
  }

  return (
    <main className="error-screen">
      <div className="error-screen__card">
        <div className="error-screen__icon" aria-hidden="true">
          <AlertIcon size={28} />
        </div>
        <h1 className="error-screen__title">Не удалось прочитать задачи</h1>
        <p className="error-screen__text">
          Сохранённые данные повреждены или имеют неподдерживаемый формат.
          Приложение не стало заменять их пустым списком.
        </p>
        <p className="error-screen__detail">{loadError.message}</p>

        <div className="error-screen__actions">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            <RotateIcon size={17} />
            Повторить чтение
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onDownloadRaw}
            disabled={!loadError.raw}
          >
            <DownloadIcon size={17} />
            Скачать повреждённые данные
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

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        {preview ? (
          <div className="import-preview" role="alert">
            <p>
              Файл <strong>{preview.fileName}</strong>: задач —{' '}
              {preview.tasks.length}. Восстановление заменит повреждённые данные.
            </p>
            <div className="import-preview__actions">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setPreview(null)}
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

        <div className="error-screen__reset">
          {showResetConfirm ? (
            <div className="inline-warning inline-warning--danger" role="alert">
              <span>
                Удалить повреждённые данные и начать с пустого списка? Это
                действие нельзя отменить.
              </span>
              <div className="inline-warning__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={onReset}
                >
                  Сбросить данные
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="link-button link-button--danger"
              onClick={() => setShowResetConfirm(true)}
            >
              <TrashIcon size={15} />
              Сбросить повреждённые данные
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
