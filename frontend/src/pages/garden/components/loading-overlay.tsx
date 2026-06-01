import { useTranslation } from 'react-i18next'

export function LoadingOverlay() {
  const { t } = useTranslation('garden')

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {t('loading_message')}
      </p>
    </div>
  )
}