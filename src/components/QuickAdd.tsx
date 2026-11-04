import { useState, type FormEvent, type RefObject } from 'react'
import { PlusIcon } from './Icons'

interface QuickAddProps {
  inputRef: RefObject<HTMLInputElement | null>
  onAdd: (title: string) => { ok: boolean; error?: string }
  onOpenCreate: () => void
}

export function QuickAdd({ inputRef, onAdd, onOpenCreate }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      setError('Введите название задачи.')
      inputRef.current?.focus()
      return
    }
    if (trimmed.length > 200) {
      setError('Название не должно превышать 200 символов.')
      inputRef.current?.focus()
      return
    }

    const result = onAdd(trimmed)
    if (!result.ok) {
      setError(result.error ?? 'Не удалось добавить задачу.')
      return
    }

    setValue('')
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit} noValidate>
      <div className="quick-add__main">
        <label className="sr-only" htmlFor="quick-add-input">
          Название новой задачи
        </label>
        <input
          ref={inputRef}
          id="quick-add-input"
          className="quick-add__input"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError(null)
          }}
          placeholder="Что нужно сделать?"
          maxLength={200}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'quick-add-error' : 'quick-add-hint'}
        />
        <button type="submit" className="btn btn--primary quick-add__submit">
          <PlusIcon size={18} />
          Добавить
        </button>
      </div>

      <div className="quick-add__footer">
        <button
          type="button"
          className="link-button"
          onClick={onOpenCreate}
        >
          Подробнее: срок, приоритет и описание
        </button>
        <span id="quick-add-hint" className="quick-add__hint">
          Enter — добавить без срока
        </span>
      </div>

      {error ? (
        <p id="quick-add-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
