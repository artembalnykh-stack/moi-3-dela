import { LockIcon, SettingsIcon, SparkIcon } from './Icons'

interface HeaderProps {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand__mark" aria-hidden="true">
          <SparkIcon size={22} />
        </div>
        <div className="brand__text">
          <h1 className="brand__name">Мои 3 дела</h1>
          <p className="brand__tagline">Личный трекер задач без лишнего</p>
        </div>
      </div>

      <div className="header__actions">
        <span className="local-chip">
          <LockIcon size={14} />
          Только на этом устройстве
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={onOpenSettings}
          aria-label="Настройки"
          title="Настройки"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </header>
  )
}
