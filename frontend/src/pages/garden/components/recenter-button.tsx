import { useTranslation } from 'react-i18next'

export function RecenterButton({ onRecenter }: { onRecenter: () => void }) {
  const { t } = useTranslation('garden')

  return (
    <button
      onClick={onRecenter}
      className="absolute bottom-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-background/90 backdrop-blur shadow border border-border hover:bg-background transition text-muted-foreground"
      title={t('recenter_tooltip')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>
  )
}