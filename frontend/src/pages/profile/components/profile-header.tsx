import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { Profile } from '@/types/profile';
import { useProfileUpdate } from '../hooks/use-profile-update';
import ChangeNameModal from './change-name-modal';
import AvatarCropModal from './avatar-crop-modal';
import { getCroppedWebp } from '@/lib/utils';
import { uploadUserImage } from '@/lib/storage';

interface ProfileHeaderProps {
  profile: Profile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { updateBioMutation, updateAvatarMutation } = useProfileUpdate();

  // State cho Tên và Bio
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');

  const bioRef = useRef<HTMLDivElement>(null);
  const [isBioScrollable, setIsBioScrollable] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  // State cho Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isViewingAvatar, setIsViewingAvatar] = useState(false);
  const [tempImage, setTempImage] = useState<{ src: string, file: File } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ==========================================
  // LOGIC BIO
  // ==========================================
  useEffect(() => {
    const checkScroll = () => {
      if (bioRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = bioRef.current;
        setIsBioScrollable(scrollHeight > clientHeight);
        setIsScrolledToBottom(Math.ceil(scrollTop + clientHeight) >= scrollHeight);
      }
    };
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [profile.bio, isEditingBio]);

  const handleBioScroll = () => {
    if (bioRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = bioRef.current;
      setIsScrolledToBottom(Math.ceil(scrollTop + clientHeight) >= scrollHeight);
    }
  };

  const handleSaveBio = () => {
    if (bio.trim() === (profile.bio || '')) {
      setIsEditingBio(false);
      return;
    }
    updateBioMutation.mutate(
      { bio: bio.trim() },
      { 
        onSuccess: () => {
          toast.success("Bio updated successfully!");
          setIsEditingBio(false);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update bio")
      }
    );
  };

  // ==========================================
  // LOGIC AVATAR (CHỌN ẢNH VÀ CROP)
  // ==========================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Please select an image under 5MB.");
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error("Incorrect format. Please select a JPG, PNG, or WebP file.");
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setTempImage({ src: objectUrl, file });
    if (avatarInputRef.current) avatarInputRef.current.value = ''; // Reset input
  };

  const handleCropConfirm = async (croppedAreaPixels: any) => {
    if (!tempImage) return;

    let toastId: any;
    try {
      setIsUploadingAvatar(true);
      toastId = toast.loading("Processing image..."); 

      // 1. Cắt ảnh và chuyển thành WebP
      const webpFile = await getCroppedWebp(tempImage.src, croppedAreaPixels, tempImage.file.name);
      
      toast.loading("Uploading image...", { id: toastId }); 
      
      // 2. Upload lên Storage
      const finalAvatarUrl = await uploadUserImage(profile.id, 'avatar', webpFile);
      
      toast.loading("Saving changes...", { id: toastId }); 

      // 3. Cập nhật Database
      updateAvatarMutation.mutate(
        { avatar_url: finalAvatarUrl },
        {
          onSuccess: () => {
            toast.success("Avatar updated successfully", { id: toastId });
            handleCloseCrop();
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Error saving Avatar", { id: toastId });
            setIsUploadingAvatar(false);
          }
        }
      );
    } catch (error: any) {
      toast.error("An error occurred while saving image", { id: toastId }); 
      setIsUploadingAvatar(false);
    }
  };

  const handleCloseCrop = () => {
    if (tempImage) URL.revokeObjectURL(tempImage.src);
    setTempImage(null);
    setIsUploadingAvatar(false);
  };

  return (
    <>
      <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-6 md:p-8 relative">
        <div 
          className="absolute inset-0 z-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(var(--foreground) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start">
          
          {/* ========================================== */}
          {/* KHU VỰC AVATAR */}
          {/* ========================================== */}
          <div className="relative -mt-16 md:-mt-20 mb-4 md:mb-0 group">
            
            {/* Ảnh Avatar - Bấm để Xem */}
            <div 
              onClick={() => profile.avatar_url && setIsViewingAvatar(true)}
              className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white flex-shrink-0 ring-4 ring-white shadow-lg transition duration-200 ${profile.avatar_url ? 'cursor-pointer hover:opacity-90' : ''}`}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-5xl font-bold text-indigo-500 bg-indigo-50">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Nút Đen - Bấm để Đổi Ảnh */}
            <button 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-gray-900 text-white p-2.5 rounded-full shadow-lg hover:opacity-85 hover:scale-110 transition-all z-10"
              title="Change Avatar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>

            {/* Input Ẩn */}
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp, image/gif" 
              className="hidden" 
              ref={avatarInputRef} 
              onChange={handleFileSelect} 
            />
          </div>

          {/* ========================================== */}
          {/* KHU VỰC THÔNG TIN (TÊN & BIO) */}
          {/* ========================================== */}
          <div className="flex-1 w-full md:pt-2 min-w-0"> 
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3 group max-w-full">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight truncate" title={profile.display_name}>
                  {profile.display_name}
                </h1>
                <span className="px-3 py-1 text-sm font-bold text-white bg-indigo-500 rounded-full shadow-sm shrink-0">
                  Lv. {profile.level}
                </span>
                <button onClick={() => setIsNameModalOpen(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-full shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              </div>
            </div>

            <div className="group relative w-full flex items-start gap-2">
              {isEditingBio ? (
                <div className="flex flex-col gap-2 w-full max-w-3xl animate-in fade-in duration-200">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={255} placeholder="Write something about yourself..." className="w-full px-4 py-3 bg-transparent text-foreground border border-gray-400/30 rounded-xl hover:border-gray-400/50 focus:outline-none focus:border-blue-300/60 focus:ring-1 focus:ring-blue-300/20 transition-all resize-none" rows={4} autoFocus />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{bio.length}/255</span>
                    <div className="flex gap-2">
                      <button onClick={handleSaveBio} disabled={updateBioMutation.isPending || bio.length > 255} className="px-6 py-2 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                        {updateBioMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setIsEditingBio(false); setBio(profile.bio || ''); }} className="px-6 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:opacity-80">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div ref={bioRef} onScroll={handleBioScroll} className="flex-1 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={isBioScrollable && !isScrolledToBottom ? { maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' } : {}}>
                    <p className={`text-muted-foreground whitespace-pre-wrap leading-7 text-base md:text-lg ${!profile.bio && 'italic text-opacity-70'}`} style={{ overflowWrap: 'anywhere' }}>
                      {profile.bio || "Add a bio so people can learn more about you..."}
                    </p>
                  </div>
                  <button onClick={() => setIsEditingBio(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full flex-shrink-0 mt-1" title="Edit bio">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* CÁC MODALS OUT-OF-FLOW */}
      {/* ========================================== */}
      
      {/* 1. Modal Đổi Tên */}
      <ChangeNameModal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} currentName={profile.display_name} />
      
      {/* 2. Modal Crop Ảnh */}
      <AvatarCropModal 
        isOpen={!!tempImage} 
        imageSrc={tempImage?.src || ''} 
        onClose={handleCloseCrop} 
        onConfirm={handleCropConfirm} 
        isProcessing={isUploadingAvatar}
      />

      {/* 3. Overlay Xem Ảnh To */}
      {isViewingAvatar && profile.avatar_url && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 pt-20 animate-in fade-in duration-200"
          onClick={() => setIsViewingAvatar(false)}
        >
          <img 
            src={profile.avatar_url} 
            alt="Avatar Full" 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl pointer-events-auto" 
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white p-2 transition-colors"
            onClick={() => setIsViewingAvatar(false)}
            title="Đóng"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}
    </>
  );
}