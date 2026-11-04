import { AlertIcon, DownloadIcon, RotateIcon } from './Icons'

interface StorageBannerProps {
  message: string
  onRetry: () => void
  onExport: () => void
}

export function StorageBanner({ message, onRetry, onExport }: StorageBannerProps) {
  return (
    <div className="storage-banner" role="alert">
      <div className="storage-banner__icon" aria-hidden="true">
        <AlertIcon size={20} />
      </div>
      <p className="storage-banner__text">{message}</p>
      <div className="storage-banner__actions">
        <button type="button" className="btn btn--small btn--secondary" onClick={onRetry}>
          <RotateIcon size={15} />
          Повторить
        </button>
        <button type="button" className="btn btn--small btn--secondary" onClick={onExport}>
          <DownloadIcon size={15} />
          Скачать копию
        </button>
      </div>
    </div>
  )
}
