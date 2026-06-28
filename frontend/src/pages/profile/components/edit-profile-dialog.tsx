import { useState } from 'react';
import type { Profile } from '@/types/profile';
import { useProfileUpdate } from '../hooks/use-profile-update';

export default function EditProfileDialog({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state cho form
  const [bio, setBio] = useState(profile.bio || '');
  const [name, setName] = useState(profile.display_name);
  
  const { updateProfileMutation, changeNameMutation } = useProfileUpdate();

  const handleSaveFreeInfo = () => {
    updateProfileMutation.mutate(
      { bio },
      { onSuccess: () => alert('Cập nhật tiểu sử thành công!') }
    );
  };

  const handleSaveName = () => {
    if (name === profile.display_name) return; // Không đổi thì không gọi API
    
    if (confirm("Đổi tên có thể tốn phí (hoặc lượt đổi). Bạn có chắc chắn?")) {
      changeNameMutation.mutate(
        { display_name: name },
        { onSuccess: () => alert('Đổi tên thành công!') }
      );
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)} 
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Chỉnh sửa trang
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
        {/* Phần 1: Miễn phí */}
        <h2 className="text-lg font-bold mb-4 text-gray-900">Thông tin cơ bản (Miễn phí)</h2>
        <textarea 
          className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          rows={3}
          value={bio} 
          onChange={e => setBio(e.target.value)}
          placeholder="Viết gì đó về bản thân..."
        />
        <button 
          onClick={handleSaveFreeInfo} 
          disabled={updateProfileMutation.isPending}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu Tiểu Sử'}
        </button>

        <div className="my-6 border-t border-gray-200"></div>

        {/* Phần 2: Có phí */}
        <h2 className="text-lg font-bold mb-4 text-rose-600">Đổi tên hiển thị (Có thể tốn phí)</h2>
        <input 
          className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-rose-500 focus:outline-none" 
          value={name} 
          onChange={e => setName(e.target.value)}
        />
        <button 
          onClick={handleSaveName} 
          disabled={changeNameMutation.isPending || name === profile.display_name}
          className="w-full bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50"
        >
          {changeNameMutation.isPending ? 'Đang xử lý...' : 'Xác nhận Đổi Tên'}
        </button>

        {/* Nút Đóng */}
        <button 
          onClick={() => setIsOpen(false)} 
          className="mt-6 w-full text-center text-gray-500 font-medium hover:text-gray-700"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}