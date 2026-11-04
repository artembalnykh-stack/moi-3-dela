import type { ReactNode } from 'react'
import { pluralTasks } from '../lib/date'

interface TaskGroupProps {
  id: string
  title: string
  count: number
  highlighted?: boolean
  tone?: 'default' | 'danger'
  children: ReactNode
}

export function TaskGroup({
  id,
  title,
  count,
  highlighted = false,
  tone = 'default',
  children,
}: TaskGroupProps) {
  return (
    <section
      id={id}
      className={[
        'task-group',
        tone === 'danger' ? 'task-group--danger' : '',
        highlighted ? 'task-group--highlight' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={`${id}-title`}
    >
      <div className="task-group__head">
        <h3 id={`${id}-title`} className="task-group__title">
          {title}
        </h3>
        <span className="count-chip" aria-label={`${count} ${pluralTasks(count)}`}>
          {count}
        </span>
      </div>
      <div className="task-list">{children}</div>
    </section>
  )
}
