import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import type { Priority, Task, TaskDraft } from '../types'
import { PRIORITY_LABELS } from '../types'
import { isValidDateKey } from '../lib/date'
import { CloseIcon, TrashIcon } from './Icons'

interface TaskDialogProps {
  open: boolean
  task: Task | null
  today: string
  onClose: () => void
  onSave: (draft: TaskDraft) => void
  onDelete: (id: string) => void
}

interface FormErrors {
  title?: string
  dueDate?: string
}

interface FormState {
  title: string
  description: string
  dueDate: string
  priority: Priority
}

export function TaskDialog({
  open,
  task,
  today,
  onClose,
  onSave,
  onDelete,
}: TaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dueRef = useRef<HTMLInputElement>(null)
  const initialRef = useRef<FormState>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEdit = task !== null
  const taskId = task?.id ?? null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!open) {
      if (dialog.open) dialog.close()
      return
    }

    const next: FormState = task
      ? {
          title: task.title,
          description: task.description,
          dueDate: task.dueDate ?? '',
          priority: task.priority,
        }
      : {
          title: '',
          description: '',
          dueDate: '',
          priority: 'medium',
        }

    initialRef.current = next
    setTitle(next.title)
    setDescription(next.description)
    setDueDate(next.dueDate)
    setPriority(next.priority)
    setErrors({})
    setShowDiscard(false)
    setShowDeleteConfirm(false)

    if (!dialog.open) dialog.showModal()
    window.setTimeout(() => titleRef.current?.focus(), 0)
    // Сбрасываем форму только при открытии или смене задачи, а не при каждом обновлении store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  function isDirty(): boolean {
    const initial = initialRef.current
    return (
      title !== initial.title ||
      description !== initial.description ||
      dueDate !== initial.dueDate ||
      priority !== initial.priority
    )
  }

  function requestClose() {
    if (isDirty()) {
      setShowDiscard(true)
      setShowDeleteConfirm(false)
      return
    }
    onClose()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) requestClose()
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    const trimmedTitle = title.trim()

    if (trimmedTitle.length === 0) {
      nextErrors.title = 'Введите название задачи.'
    } else if (trimmedTitle.length > 200) {
      nextErrors.title = 'Название не должно превышать 200 символов.'
    }

    if (dueDate.length > 0) {
      if (!isValidDateKey(dueDate)) {
        nextErrors.dueDate = 'Укажите корректную дату.'
      } else if (!isEdit && dueDate < today) {
        nextErrors.dueDate = 'Для новой задачи выберите сегодняшнюю или будущую дату.'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.title) titleRef.current?.focus()
      else if (nextErrors.dueDate) dueRef.current?.focus()
      return false
    }
    return true
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    onSave({
      title: title.trim(),
      description,
      dueDate: dueDate.length > 0 ? dueDate : null,
      priority,
    })
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog task-dialog"
      aria-labelledby="task-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={handleBackdropClick}
    >
      <div className="dialog__inner">
        <div className="dialog__head">
          <div>
            <h2 id="task-dialog-title" className="dialog__title">
              {isEdit ? 'Редактировать задачу' : 'Новая задача'}
            </h2>
            <p className="dialog__subtitle">
              {isEdit
                ? 'Изменения сохранятся только после нажатия «Сохранить».'
                : 'Заполните название. Остальное можно добавить по желанию.'}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={requestClose}
            aria-label="Закрыть"
            title="Закрыть"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <form className="dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="task-title">Название</label>
            <input
              ref={titleRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
              }}
              maxLength={200}
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              placeholder="Например, подготовить отчёт"
            />
            {errors.title ? (
              <p id="task-title-error" className="field-error" role="alert">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="task-description">
              Описание <span className="field__optional">необязательно</span>
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Детали, ссылки, что важно не забыть"
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="task-due">Срок</label>
              <input
                ref={dueRef}
                id="task-due"
                type="date"
                value={dueDate}
                min={isEdit ? undefined : today}
                onChange={(event) => {
                  setDueDate(event.target.value)
                  if (errors.dueDate) {
                    setErrors((current) => ({ ...current, dueDate: undefined }))
                  }
                }}
                aria-invalid={errors.dueDate ? true : undefined}
                aria-describedby={
                  errors.dueDate ? 'task-due-error' : 'task-due-hint'
                }
              />
              <p id="task-due-hint" className="field__hint">
                {isEdit
                  ? 'Можно указать прошедшую дату или убрать срок.'
                  : 'Только сегодня или позже. Оставьте пустым для «Без срока».'}
              </p>
              {errors.dueDate ? (
                <p id="task-due-error" className="field-error" role="alert">
                  {errors.dueDate}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="task-priority">Приоритет</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Priority)
                }
              >
                {(['high', 'medium', 'low'] as Priority[]).map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showDiscard ? (
            <div className="inline-warning" role="alert">
              <span>Есть несохранённые изменения. Закрыть форму без сохранения?</span>
              <div className="inline-warning__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setShowDiscard(false)}
                >
                  Продолжить редактирование
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={onClose}
                >
                  Закрыть без сохранения
                </button>
              </div>
            </div>
          ) : null}

          {showDeleteConfirm ? (
            <div className="inline-warning inline-warning--danger" role="alert">
              <span>
                Удалить задачу? Сразу после удаления можно будет нажать
                «Отменить».
              </span>
              <div className="inline-warning__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => {
                    if (task) onDelete(task.id)
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : null}

          <div className="dialog__footer">
            {isEdit ? (
              <button
                type="button"
                className="btn btn--ghost-danger"
                onClick={() => {
                  setShowDeleteConfirm(true)
                  setShowDiscard(false)
                }}
              >
                <TrashIcon size={17} />
                Удалить
              </button>
            ) : (
              <span />
            )}

            <div className="dialog__footer-right">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={requestClose}
              >
                Отмена
              </button>
              <button type="submit" className="btn btn--primary">
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  )
}
