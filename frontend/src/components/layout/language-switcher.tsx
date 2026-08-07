import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'

/**
 * Nút đổi ngôn ngữ (EN/VI). Dùng ở cả header app và header landing nên nằm ở
 * components/layout thay vì cục bộ trong 1 trang.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { currentLang, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = languages.find(l => l.code === currentLang)

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors py-1.5"
      >
        {current?.shortLabel}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[120px] rounded-md border border-border bg-popover shadow-md z-50">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary',
                currentLang === lang.code
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <span className="font-mono text-[10px] tracking-widest">{lang.shortLabel}</span>
              <span>{lang.nativeLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
