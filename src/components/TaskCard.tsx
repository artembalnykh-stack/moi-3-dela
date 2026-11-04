import type { Task } from '../types'
import { PRIORITY_LABELS } from '../types'
import { formatCompletedAt, pluralDays } from '../lib/date'
import { formatDueLabel, getOverdueDays } from '../lib/tasks'
import { AlertIcon, CalendarIcon, CheckIcon } from './Icons'

interface TaskCardProps {
  task: Task
  today: string
  highlighted: boolean
  onEdit: (task: Task) => void
  onToggle: (id: string) => void
}

export function TaskCard({
  task,
  today,
  highlighted,
  onEdit,
  onToggle,
}: TaskCardProps) {
  const done = task.status === 'done'
  const overdueDays = getOverdueDays(task, today)
  const dueLabel = formatDueLabel(task.dueDate, today)
  const completedLabel =
    done && task.completedAt ? formatCompletedAt(task.completedAt, today) : ''

  return (
    <article
      id={`task-${task.id}`}
      className={[
        'task-card',
        done ? 'task-card--done' : '',
        overdueDays > 0 ? 'task-card--overdue' : '',
        highlighted ? 'task-card--highlight' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-task-id={task.id}
    >
      <button
        type="button"
        className={`task-check ${done ? 'is-done' : ''}`}
        aria-pressed={done}
        aria-label={
          done
            ? `Вернуть в работу: ${task.title}`
            : `Отметить выполненной: ${task.title}`
        }
        onClick={() => onToggle(task.id)}
      >
        <span className="task-check__box" aria-hidden="true">
          {done ? <CheckIcon size={15} /> : null}
        </span>
      </button>

      <button
        type="button"
        className="task-card__body"
        onClick={() => onEdit(task)}
      >
        <span className="task-card__title">
          <span className="sr-only">Редактировать задачу: </span>
          {task.title}
        </span>

        <span className="task-card__meta">
          <span className={`priority priority--${task.priority}`}>
            <span className="priority__dot" aria-hidden="true" />
            {PRIORITY_LABELS[task.priority]}
          </span>

          <span className={`task-meta ${overdueDays > 0 ? 'is-overdue' : ''}`}>
            <CalendarIcon size={14} />
            {task.dueDate ? (
              <time dateTime={task.dueDate}>{dueLabel}</time>
            ) : (
              dueLabel
            )}
          </span>

          {overdueDays > 0 ? (
            <span className="overdue-badge">
              <AlertIcon size={13} />
              Просрочено на {overdueDays} {pluralDays(overdueDays)}
            </span>
          ) : null}

          {done ? (
            <span className="task-meta task-meta--completed">
              <CheckIcon size={14} />
              Завершено {completedLabel}
            </span>
          ) : null}
        </span>
      </button>
    </article>
  )
}
