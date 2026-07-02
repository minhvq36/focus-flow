import { useState, useRef, useEffect } from 'react';
import type { Profile } from '@/types/profile';
import { useProfileUpdate } from '../hooks/use-profile-update';
import ChangeNameModal from './change-name-modal';

interface ProfileHeaderProps {
  profile: Profile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { updateBioMutation } = useProfileUpdate();

  // Đổi state quản lý Name thành trạng thái đóng/mở Modal
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');

  const bioRef = useRef<HTMLDivElement>(null);
  const [isBioScrollable, setIsBioScrollable] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (bioRef.current) {
        setIsBioScrollable(bioRef.current.scrollHeight > bioRef.current.clientHeight);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [profile.bio, isEditingBio]);

  const handleSaveBio = () => {
    if (bio.trim() === (profile.bio || '')) {
      setIsEditingBio(false);
      return;
    }

    updateBioMutation.mutate(
      { bio: bio.trim() },
      { onSuccess: () => setIsEditingBio(false) }
    );
  };

  return (
    <>
      <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-6 md:p-8 relative">
        <div 
          className="absolute inset-0 z-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(var(--foreground) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start">
          {/* Avatar Area */}
          <div className="relative -mt-16 md:-mt-20 mb-4 md:mb-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white flex-shrink-0 ring-4 ring-white shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-5xl font-bold text-indigo-500 bg-indigo-50">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute bottom-2 right-2 bg-gray-900 text-white p-2 rounded-full shadow-md hover:bg-gray-800 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>

          {/* Profile Info Area */}
          {/* THÊM min-w-0 Ở ĐÂY LÀ QUAN TRỌNG NHẤT ĐỂ FLEXBOX CHO PHÉP CẮT CHỮ */}
          <div className="flex-1 w-full md:pt-2 min-w-0"> 
            
            {/* --- Name Section --- */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3 group max-w-full">
                <h1 
                  className="text-3xl md:text-4xl font-bold text-foreground tracking-tight truncate"
                  title={profile.display_name}
                >
                  {profile.display_name}
                </h1>
                
                {/* THÊM shrink-0 ĐỂ BADGE LEVEL LUÔN GIỮ NGUYÊN KÍCH THƯỚC, KHÔNG BỊ ÉP NHỎ LẠI */}
                <span className="px-3 py-1 text-sm font-bold text-white bg-indigo-500 rounded-full shadow-sm shrink-0">
                  Lv. {profile.level}
                </span>
                
                {/* THÊM shrink-0 CHO NÚT EDIT NỮA */}
                <button 
                  onClick={() => setIsNameModalOpen(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-full shrink-0"
                  title="Đổi tên hiển thị"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              </div>
            </div>

            {/* --- Bio Section --- */}
            <div className="group relative w-full flex items-start gap-2">
              {isEditingBio ? (
                <div className="flex flex-col gap-2 w-full max-w-3xl animate-in fade-in duration-200">
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={255}
                    placeholder="Write something about yourself..."
                    className="w-full px-4 py-3 bg-transparent text-foreground border border-gray-400/30 rounded-xl hover:border-gray-400/50 focus:outline-none focus:border-blue-300/60 focus:ring-1 focus:ring-blue-300/20 transition-all resize-none"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{bio.length}/255</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveBio}
                        disabled={updateBioMutation.isPending || bio.length > 255}
                        className="px-6 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        {updateBioMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => { setIsEditingBio(false); setBio(profile.bio || ''); }}
                        className="px-6 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. `flex-1` giúp vùng này chiếm TOÀN BỘ chiều rộng còn lại -> dễ lăn chuột.
                    2. Chặn `max-h-[140px]` tương đương 5 dòng (vì dòng dưới dùng leading-7 = 28px).
                    3. `mask-image` tạo hiệu ứng mờ dần ở mép dưới để báo hiệu còn text (chữ dài hơn 5 dòng).
                  */}
                  <div 
                    ref={bioRef}
                    className="flex-1 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    style={isBioScrollable ? {
                      maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                    } : {}}
                  >
                    <p 
                      className={`text-muted-foreground whitespace-pre-wrap leading-7 text-base md:text-lg ${!profile.bio && 'italic text-opacity-70'}`}
                      style={{ overflowWrap: 'anywhere' }} // Fix lỗi chữ aaaaaaa dính chùm
                    >
                      {profile.bio || "Add a bio so people can learn more about you..."}
                    </p>
                  </div>
                  
                  {/* Nút Edit luôn bị đẩy sát lề phải nhờ flex-1 của thẻ div bên trên */}
                  <button 
                    onClick={() => setIsEditingBio(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full flex-shrink-0 mt-1"
                    title="Edit bio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Render Modal ra bên ngoài cấu trúc flex/grid để tránh z-index issue */}
      <ChangeNameModal 
        isOpen={isNameModalOpen} 
        onClose={() => setIsNameModalOpen(false)} 
        currentName={profile.display_name} 
      />
    </>
  );
}