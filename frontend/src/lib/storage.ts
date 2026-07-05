import { supabase } from './supabase' // Import client đã khởi tạo từ trước

export const getAssetUrl = (fileName: string): string => {
  // Trỏ vào bucket 'assets' và thư mục 'items'
  const { data } = supabase.storage
    .from('assets')
    .getPublicUrl(`/${fileName}.png`)

  return data.publicUrl
}

export const uploadUserImage = async (
  userId: string, 
  type: 'avatar' | 'wallpaper', 
  file: File
): Promise<string> => {
  const fileName = `${userId}/${type}.webp`;

  // 1. Upload với upsert (Ghi đè)
  const { error } = await supabase.storage
    .from('users')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  // 2. Lấy link và gắn Timestamp để phá Cache trình duyệt
  const { data } = supabase.storage.from('users').getPublicUrl(fileName);
  return `${data.publicUrl}?t=${Date.now()}`;
};