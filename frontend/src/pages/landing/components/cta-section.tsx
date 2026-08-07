import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CtaSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-28">

        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t('cta.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          {t('cta.subtitle')}
        </p>

        <Button asChild size="lg" className="mt-10 h-12 px-8 text-base">
          <Link to="/register">
            {t('cta.button')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>

      </div>
    </section>
  )
}
