import LandingHeader from './components/landing-header'
import HeroSection from './components/hero-section'
import FeaturesSection from './components/features-section'
import HowSection from './components/how-section'
import CtaSection from './components/cta-section'
import LandingFooter from './components/landing-footer'

/**
 * Trang công khai tại `/`. Chỉ hiện khi CHƯA có session — `GuestRoute` lo phần
 * chuyển hướng sang /garden nếu đã đăng nhập.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
