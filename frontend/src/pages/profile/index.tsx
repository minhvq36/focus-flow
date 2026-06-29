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
      // Giới hạn 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("Vui lòng chọn ảnh có dung lượng dưới 5MB!");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setWallpaper(previewUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Đang tải hồ sơ...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-destructive font-medium">Không thể tải thông tin hồ sơ.</div>
      </div>
    );
  }

  return (
    // relative w-full và min-h-full giúp container lấy chiều cao cuộn của thẻ <main>
    <div className="relative w-full min-h-full pb-24">
      
      {/* 1. LỚP ẢNH NỀN: Đã đổi thành z-[10]. 
          Nó sẽ bung full 100% màn hình, lót dưới Header và đứng im khi cuộn */}
      <div className="fixed inset-0 z-[10] pointer-events-none">
        <img 
          src={wallpaper} 
          alt="Profile Wallpaper" 
          className="w-full h-full object-cover opacity-90 transition-all duration-700"
        />
        {/* Lớp phủ mờ xíu xiu để chữ dễ đọc hơn */}
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* 2. LỚP NỘI DUNG CHÍNH: Đã thêm z-[20] để nó nổi lên trên ảnh nền */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-[20]">
        
        {/* Nút đổi hình nền */}
        <div className="flex justify-end mb-6">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleWallpaperChange} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-card/80 hover:bg-card backdrop-blur-md text-sm font-medium px-4 py-2 rounded-lg border border-border shadow-sm flex items-center gap-2 transition-all text-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Đổi hình nền
          </button>
        </div>

        {/* Header Profile */}
        <ProfileHeader profile={profile} />

        {/* Tính năng khác */}
        <div className="mt-8 bg-card/90 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-border shadow-xl min-h-[400px]">
          <h2 className="text-xl font-bold text-foreground mb-4">Hoạt động gần đây</h2>
        </div>

      </div>
    </div>
  );
}