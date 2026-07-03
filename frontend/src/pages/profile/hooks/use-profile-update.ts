// frontend\src\pages\profile\hooks\use-profile-update.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile, ChangeNamePayload } from '@/types/profile';

export const useProfileUpdate = () => {
  const queryClient = useQueryClient();

  const updateBioMutation = useMutation({
    mutationFn: (payload: { bio: string }) => 
      api.patch<Profile>('/api/profile/bio', payload),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile', 'me'], updatedProfile);
    },
  });

  // 1. THÊM MUTATION CHO AVATAR
  const updateAvatarMutation = useMutation({
    mutationFn: (payload: { avatar_url: string }) => 
      api.patch<Profile>('/api/profile/avatar-url', payload),
    onSuccess: (updatedProfile) => {
      // Cập nhật ngay cache để UI đổi hình chớp nhoáng
      queryClient.setQueryData(['profile', 'me'], updatedProfile);
    },
  });

  const changeNameMutation = useMutation({
    mutationFn: (payload: ChangeNamePayload) => 
      api.post<void>('/api/profile/change-name', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['economy', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'private'] });
    },
  });

  return { updateBioMutation, changeNameMutation, updateAvatarMutation };
};