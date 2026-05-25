import { supabase } from './supabase' // Import client đã khởi tạo từ trước

export const getAssetUrl = (fileName: string): string => {
  // Trỏ vào bucket 'assets' và thư mục 'items'
  const { data } = supabase.storage
    .from('assets')
    .getPublicUrl(`items/${fileName}.png`)

  return data.publicUrl
}