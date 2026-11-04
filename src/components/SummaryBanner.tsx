import type { TodaySummary } from '../types'
import { buildSummaryBody } from '../lib/notifications'
import { ArrowRightIcon, BellIcon, CloseIcon } from './Icons'

interface SummaryBannerProps {
  summary: TodaySummary
  dateLabel: string
  onOpen: () => void
  onDismiss: () => void
}

export function SummaryBanner({
  summary,
  dateLabel,
  onOpen,
  onDismiss,
}: SummaryBannerProps) {
  return (
    <section className="summary" aria-label="Сводка на сегодня">
      <div className="summary__icon" aria-hidden="true">
        <BellIcon size={22} />
      </div>
      <div className="summary__text">
        <p className="summary__title">{buildSummaryBody(summary)}</p>
        <p className="summary__date">Сводка на {dateLabel}</p>
      </div>
      <div className="summary__actions">
        <button type="button" className="btn btn--soft btn--small" onClick={onOpen}>
          Открыть «Сегодня»
          <ArrowRightIcon size={15} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--small"
          onClick={onDismiss}
          aria-label="Скрыть сводку"
          title="Скрыть сводку"
        >
          <CloseIcon size={17} />
        </button>
      </div>
    </section>
  )
}
