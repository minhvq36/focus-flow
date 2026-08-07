import { useTranslation } from 'react-i18next'
import { ListChecks, Timer, Gift, Trees } from 'lucide-react'

/*
  Key i18n để tách rời khỏi icon: đổi thứ tự/nội dung chỉ sửa landing.json,
  file này chỉ giữ ánh xạ key -> icon.
*/
const FEATURES = [
  { key: 'task',   icon: ListChecks },
  { key: 'focus',  icon: Timer      },
  { key: 'reward', icon: Gift       },
  { key: 'garden', icon: Trees      },
] as const

export default function FeaturesSection() {
  const { t } = useTranslation('landing')

  return (
    <section id="features" className="scroll-mt-16 border-t border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">

        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-foreground">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`features.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
