import { useTranslation } from 'react-i18next'
import type { PlacementResponse } from '@/types/garden'

interface TilePopupProps {
  selectedTile: { col: number; row: number; placement: PlacementResponse | null }
  onClose: () => void
}

export function TilePopup({ selectedTile, onClose }: TilePopupProps) {
  const { t } = useTranslation('garden')

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-2xl bg-card/95 backdrop-blur shadow-lg px-6 py-3 text-sm flex items-center gap-4 border border-border">
      <span className="text-muted-foreground">
        {t('tile_info', { col: selectedTile.col, row: selectedTile.row })}
      </span>
      {selectedTile.placement ? (
        <span className="font-medium text-primary">
          {selectedTile.placement.item_id} · {selectedTile.placement.health_status}
        </span>
      ) : (
        <span className="text-muted-foreground">{t('empty_tile')}</span>
      )}
      <button
        onClick={onClose}
        className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('close_button')}
      </button>
    </div>
  )
}