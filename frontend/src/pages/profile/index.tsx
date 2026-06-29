import { useProfile } from './hooks/use-profile';
import ProfileHeader from './components/profile-header';

export default function MePage() {
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Đang tải hồ sơ...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive font-medium">Không thể tải thông tin hồ sơ.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Cover Wallpaper - Dùng CSS hoàn toàn, 0 byte storage */}
      <div className="h-48 md:h-64 w-full relative overflow-hidden bg-background-focus border-b border-border">
        {/* 1. Các khối mờ chuyển động (Dùng animation blob trong file CSS của bạn) */}
        <div 
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[80px] opacity-60"
          style={{ backgroundColor: 'var(--primary)', animation: 'blob-1 15s infinite alternate' }} 
        />
        <div 
          className="absolute top-12 -right-12 w-72 h-72 rounded-full blur-[60px] opacity-50"
          style={{ backgroundColor: 'var(--accent)', animation: 'blob-2 20s infinite alternate' }} 
        />
        <div 
          className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full blur-[80px] opacity-40"
          style={{ backgroundColor: 'var(--secondary)', animation: 'blob-3 18s infinite alternate' }} 
        />

        {/* 2. Texture Overlay (Tạo cảm giác giấy dán tường / Wallpaper lưới) */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(var(--primary) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 3. Lớp gradient mờ dần ở dưới đáy để hòa quyện vào body */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/40 to-transparent" />
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <ProfileHeader profile={profile} />
      </div>
    </div>
  );
}