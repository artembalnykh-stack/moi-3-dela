import type { Section } from '../types'
import { SECTION_LABELS } from '../types'
import { pluralTasks } from '../lib/date'

interface NavTabsProps {
  section: Section
  counts: Record<Section, number>
  overdue: number
  onChange: (section: Section) => void
}

const ORDER: Section[] = ['today', 'upcoming', 'completed']

export function NavTabs({ section, counts, overdue, onChange }: NavTabsProps) {
  return (
    <nav className="tabs" aria-label="Разделы задач">
      {ORDER.map((item) => {
        const count = counts[item]
        const overdueSuffix =
          item === 'today' && overdue > 0
            ? `, из них просрочено ${overdue}`
            : ''
        return (
          <button
            key={item}
            type="button"
            className="tab"
            aria-current={section === item ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            <span>{SECTION_LABELS[item]}</span>
            <span className="tab__count" aria-hidden="true">
              {count}
            </span>
            <span className="sr-only">
              {`${count} ${pluralTasks(count)}${overdueSuffix}`}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
