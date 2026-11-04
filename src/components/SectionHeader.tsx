import type { Section } from '../types'
import { SECTION_LABELS } from '../types'
import { AlertIcon } from './Icons'

interface SectionHeaderProps {
  section: Section
  todayLabel: string
  overdue: number
  onOpenOverdue: () => void
}

const SUBTITLES: Record<Section, string> = {
  today: '',
  upcoming: 'Задачи со сроком позже сегодняшнего дня',
  completed: 'Последние завершённые — сверху',
}

export function SectionHeader({
  section,
  todayLabel,
  overdue,
  onOpenOverdue,
}: SectionHeaderProps) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-head__title">{SECTION_LABELS[section]}</h2>
        <p className="section-head__subtitle">
          {section === 'today' ? todayLabel : SUBTITLES[section]}
        </p>
      </div>

      {section === 'today' && overdue > 0 ? (
        <button
          type="button"
          className="overdue-pill"
          onClick={onOpenOverdue}
        >
          <AlertIcon size={16} />
          Просрочено · {overdue}
          <span className="sr-only">Перейти к группе просроченных задач</span>
        </button>
      ) : null}
    </div>
  )
}
