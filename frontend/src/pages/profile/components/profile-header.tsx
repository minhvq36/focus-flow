import { useState } from 'react';
import type { Profile } from '@/types/profile';
import { useProfileUpdate } from '../hooks/use-profile-update';

interface ProfileHeaderProps {
  profile: Profile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { updateProfileMutation, changeNameMutation } = useProfileUpdate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(profile.display_name);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');

  const handleSaveName = () => {
    if (name.trim() === profile.display_name) {
      setIsEditingName(false);
      return;
    }
    
    if (confirm("Lưu ý: Việc đổi tên có thể tốn phí (hoặc lượt đổi). Bạn có chắc chắn?")) {
      changeNameMutation.mutate(
        { display_name: name.trim() },
        { 
          onSuccess: () => setIsEditingName(false),
          onError: () => setName(profile.display_name)
        }
      );
    }
  };

  const handleSaveBio = () => {
    if (bio.trim() === (profile.bio || '')) {
      setIsEditingBio(false);
      return;
    }

    updateProfileMutation.mutate(
      { bio: bio.trim() },
      { onSuccess: () => setIsEditingBio(false) }
    );
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 md:p-8 relative backdrop-blur-sm bg-white/80 dark:bg-card/90">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
        {/* Avatar */}
        <div className="relative -mt-16 md:-mt-20 mb-4 md:mb-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-background flex-shrink-0 ring-4 ring-background shadow-lg">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-5xl font-bold text-primary bg-primary/10">
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Nút sửa avatar */}
          <button className="absolute bottom-2 right-2 bg-foreground text-background p-2 rounded-full shadow-md hover:bg-foreground/90 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        </div>

        {/* Thông tin Profile */}
        <div className="flex-1 w-full pt-2">
          {/* --- Edit Name Section --- */}
          <div className="flex items-center gap-3 mb-4">
            {isEditingName ? (
              <div className="flex-1 flex flex-col md:flex-row gap-2 max-w-md">
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xl font-bold bg-transparent border-2 border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveName}
                    disabled={changeNameMutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {changeNameMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button 
                    onClick={() => { setIsEditingName(false); setName(profile.display_name); }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:opacity-80 transition-opacity"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.display_name}</h1>
                <span className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-200 rounded-full shadow-sm border border-amber-200/50">
                  Lv. {profile.level}
                </span>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                  title="Đổi tên hiển thị"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              </div>
            )}
          </div>

          {/* --- Edit Bio Section --- */}
          <div className="group relative">
            {isEditingBio ? (
              <div className="flex flex-col gap-2 max-w-2xl">
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Viết gì đó về bản thân..."
                  className="w-full px-3 py-2 bg-transparent text-foreground border-2 border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveBio}
                    disabled={updateProfileMutation.isPending}
                    className="px-4 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                  >
                    {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu tiểu sử'}
                  </button>
                  <button 
                    onClick={() => { setIsEditingBio(false); setBio(profile.bio || ''); }}
                    className="px-4 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:opacity-80 transition-opacity"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 max-w-2xl">
                <p className={`text-muted-foreground whitespace-pre-wrap leading-relaxed ${!profile.bio && 'italic'}`}>
                  {profile.bio || "Thêm tiểu sử để mọi người hiểu hơn về bạn..."}
                </p>
                <button 
                  onClick={() => setIsEditingBio(true)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-1.5 mt-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full flex-shrink-0"
                  title="Chỉnh sửa tiểu sử"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}