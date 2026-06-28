import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile, UpdateProfilePayload, ChangeNamePayload } from '@/types/profile';

export const useProfileUpdate = () => {
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    // Sử dụng api.patch truyền sẵn generic type Profile
    mutationFn: (payload: UpdateProfilePayload) => 
      api.patch<Profile>('/api/profile/me', payload),
      
    onSuccess: (updatedProfile) => {
      // Cập nhật state local ngay lập tức (Optimistic update)
      queryClient.setQueryData(['profile', 'me'], updatedProfile);
    },
  });

  const changeNameMutation = useMutation({
    // Sử dụng api.post
    mutationFn: (payload: ChangeNamePayload) => 
      api.post<void>('/api/profile/me/change-name', payload),
      
    onSuccess: () => {
      // Vì đổi tên ở DB backend không trả về profile, ta báo cache hết hạn để tự fetch lại
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });

  return { updateProfileMutation, changeNameMutation };
};