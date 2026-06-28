import { useProfile } from './hooks/use-profile';
import ProfileHeader from './components/profile-header';

export default function MePage() {
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 flex justify-center">
        <div className="animate-pulse text-gray-500">Đang tải thông tin...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 flex justify-center">
        <div className="text-red-500">Đã có lỗi xảy ra khi tải profile.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 1. Header (Có API rồi) */}
      <ProfileHeader profile={profile} />

      {/* 2. Grid cho các tính năng tương lai */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái (Rộng hơn): Hiển thị Vườn / Item */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center text-gray-400 border-dashed">
            {/* <GardenPreview /> */}
            [Khu vực hiển thị Vườn (Chưa gen)]
          </div>
        </div>

        {/* Cột phải: Thống kê / Đổi Frame / Badges */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[150px] flex items-center justify-center text-gray-400 border-dashed">
             {/* <ProfileStats /> */}
             [Thống kê Task (Chưa gen)]
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[150px] flex items-center justify-center text-gray-400 border-dashed">
             {/* <FrameSelector /> */}
             [Chọn Khung Avatar (Chưa gen)]
          </div>
        </div>

      </div>
    </div>
  );
}