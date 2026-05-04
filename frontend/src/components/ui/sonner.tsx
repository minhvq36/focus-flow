import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

export const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg':    'var(--popover)',
          '--normal-text':  'var(--popover-foreground)',
          '--normal-border':'var(--border)',

          // success → emerald
          '--success-bg':    'var(--color-emerald-50)',
          '--success-text':  'var(--color-emerald-700)',
          '--success-border':'var(--color-emerald-200)',

          // warning → amber (V0 style)
          '--warning-bg':    'var(--color-amber-50)',
          '--warning-text':  'var(--color-amber-700)',
          '--warning-border':'var(--color-amber-200)',

          // error → red
          '--error-bg':    'var(--color-red-50)',
          '--error-text':  'var(--color-red-600)',
          '--error-border':'var(--color-red-200)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}