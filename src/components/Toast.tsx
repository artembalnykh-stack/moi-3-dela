import { useEffect } from 'react'
import { CloseIcon } from './Icons'

export interface ToastState {
  id: number
  message: string
  tone?: 'default' | 'error'
  actionLabel?: string
  onAction?: () => void
}

interface ToastProps {
  toast: ToastState
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(
      onClose,
      toast.tone === 'error' ? 8_000 : 6_000,
    )
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.tone, onClose])

  return (
    <div
      className={`toast ${toast.tone === 'error' ? 'toast--error' : ''}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast__message">{toast.message}</span>
      {toast.actionLabel && toast.onAction ? (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.onAction?.()
            onClose()
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Закрыть уведомление"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
