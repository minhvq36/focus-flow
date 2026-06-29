import { useState, useRef } from 'react';
import { useProfile } from './hooks/use-profile';
import ProfileHeader from './components/profile-header';

export default function MePage() {
  const { data: profile, isLoading, error } = useProfile();

  // MOCK DATA: Ảnh nền mặc định
  const defaultWallpaper = "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=2560&auto=format&fit=crop";
  const [wallpaper, setWallpaper] = useState(defaultWallpaper);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý đổi ảnh nền (Preview FE Only)
  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // FE Validation: Giới hạn 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("Vui lòng chọn ảnh có dung lượng dưới 5MB!");
        return;
      }
      // Tạo URL tạm thời để preview ảnh vừa chọn
      const previewUrl = URL.createObjectURL(file);
      setWallpaper(previewUrl);
    }
  };

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
    <div className="min-h-screen relative overflow-hidden">
      {/* 1. Lớp Ảnh nền (Wallpaper) - Fixed đằng sau */}
      <div className="fixed inset-0 z-[-2] bg-background">
        <img 
          src={wallpaper} 
          alt="Profile Wallpaper" 
          className="w-full h-full object-cover opacity-90 transition-all duration-500"
        />
      </div>

      {/* 2. Main Container - Width rất bự (max-w-7xl) và pt-32 để không bị che bởi thanh điều hướng (navbar) ở trên */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
        
        {/* Nút đổi hình nền */}
        <div className="flex justify-end mb-6">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleWallpaperChange}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-background/80 hover:bg-background backdrop-blur text-sm font-medium px-4 py-2 rounded-lg border border-border shadow-sm flex items-center gap-2 transition-all text-foreground"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Đổi hình nền
          </button>
        </div>

        {/* 3. Header Profile (Có avatar lòi lên) */}
        <ProfileHeader profile={profile} />

        {/* Các tính năng khác (Bài viết, Bạn bè, Lịch sử...) */}
        <div className="mt-8 bg-card/95 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-border shadow-xl min-h-[400px] relative">
           {/* Thêm chút texture lưới nhẹ cho các block tính năng */}
           <div 
            className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none rounded-2xl"
            style={{
              backgroundImage: 'radial-gradient(var(--foreground) 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px'
            }}
          />
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-foreground mb-4">Khu vực tính năng (Sẽ làm sau)</h2>
            <div className="text-muted-foreground italic text-sm">
              Nội dung các tab...
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}