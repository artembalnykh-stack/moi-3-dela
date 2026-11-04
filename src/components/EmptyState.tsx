import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  text: string
  actions: ReactNode
}

export function EmptyState({ icon, title, text, actions }: EmptyStateProps) {
  return (
    <section className="empty" aria-labelledby="empty-title">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 id="empty-title" className="empty__title">
        {title}
      </h3>
      <p className="empty__text">{text}</p>
      <div className="empty__actions">{actions}</div>
    </section>
  )
}
