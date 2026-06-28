import type { Profile } from '@/types/profile';
import EditProfileDialog from './edit-profile-dialog';

interface ProfileHeaderProps {
  profile: Profile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-4 ring-white shadow-md">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400">
            {profile.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
          <span className="px-3 py-1 text-xs font-bold text-white bg-indigo-500 rounded-full">
            Lv. {profile.level}
          </span>
        </div>
        <p className="text-gray-600 mt-2 whitespace-pre-wrap">
          {profile.bio || "Người dùng này chưa có tiểu sử."}
        </p>
      </div>

      {/* Action: Truyền nguyên object profile vào dialog */}
      <div className="mt-4 md:mt-0">
        <EditProfileDialog profile={profile} />
      </div>
    </div>
  );
}