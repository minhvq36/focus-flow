import { Sprout } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'

export default function Login() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">

      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-secondary/60 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sprout className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back to FocusFlow
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your garden is waiting. Sign in to keep growing.
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>.
        </p>

      </div>
    </main>
  )
}