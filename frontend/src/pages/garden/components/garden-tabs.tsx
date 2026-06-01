import { useTranslation } from 'react-i18next'
import type { GardenListItem } from '@/types/garden'

interface GardenTabsProps {
  gardenList?: GardenListItem[]
  activeGardenId: string | null
  onChange: (id: string) => void
}

export function GardenTabs({ gardenList, activeGardenId, onChange }: GardenTabsProps) {
  const { t } = useTranslation('garden')
  
  // Giữ nguyên logic: chỉ hiện nếu có từ 2 khu vườn trở lên
  if (!gardenList || gardenList.length <= 1) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
      {gardenList.map((g) => (
        <button
          key={g.id}
          onClick={() => onChange(g.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-colors border ${
            g.id === activeGardenId
              ? 'bg-primary text-primary-foreground border-transparent'
              : 'bg-background/80 backdrop-blur border-border hover:bg-background'
          }`}
        >
          {t('garden_tab', { index: g.garden_index })}
        </button>
      ))}
    </div>
  )
}