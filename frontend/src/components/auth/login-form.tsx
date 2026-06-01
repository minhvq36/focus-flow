import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export function LoginForm() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/garden` },
    })
    if (error) {
      setError(error.message)
      setLoadingGoogle(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoadingEmail(false)
      return
    }
    navigate('/garden')
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col gap-5">

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">{t('sign_in_with_email')}</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">{t('email')}</label>
          <Input id="email" type="email" placeholder={t('email_placeholder')}
            autoComplete="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loadingEmail || loadingGoogle} 
            tabIndex={1} /* 1. Email */
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">{t('password')}</label>
            <a href="#" 
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              tabIndex={6} /* 6. Forgot Password */
            >
              {t('forgot_password')}
            </a>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'}
              placeholder="••••••••" autoComplete="current-password" required
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loadingEmail || loadingGoogle} className="pr-10" 
              tabIndex={2} /* 2. Password */
            />
            <button type="button"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              onClick={() => setShowPassword(v => !v)}
              tabIndex={5} /* 5. Eye */
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground',
                'hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
              )}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full mt-1" 
          disabled={loadingEmail || loadingGoogle}
          tabIndex={3} /* 3. Sign In */
        >
          {loadingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('sign_in')}
        </Button>
      </form>

      <Button type="button" variant="outline" size="lg" className="w-full gap-3 font-medium"
        onClick={handleGoogleSignIn} disabled={loadingGoogle || loadingEmail}
        tabIndex={4} /* 4. Google */
      >
        {loadingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {t('continue_with_google')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('no_account')}{' '}
        <a href="#" 
          className="font-medium text-primary underline-offset-2 hover:underline transition-colors"
          tabIndex={7} /* 7. Create account */
        >
          {t('create_account')}
        </a>
      </p>

    </div>
  )
}