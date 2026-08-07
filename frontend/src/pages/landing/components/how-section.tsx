import { useTranslation } from 'react-i18next'

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const

export default function HowSection() {
  const { t } = useTranslation('landing')

  return (
    <section id="how" className="scroll-mt-16 border-t border-border/50 bg-secondary/25">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">

        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t('how.title')}
        </h2>

        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex flex-col gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="font-semibold text-foreground">
                {t(`how.${step}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`how.${step}.desc`)}
              </p>
            </li>
          ))}
        </ol>

      </div>
    </section>
  )
}
