import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile, ChangeNamePayload } from '@/types/profile';

export const useProfileUpdate = () => {
  const queryClient = useQueryClient();

  // Đã trỏ đúng vào endpoint PATCH /bio
  const updateBioMutation = useMutation({
    mutationFn: (payload: { bio: string }) => 
      api.patch<Profile>('/api/profile/bio', payload),
      
    onSuccess: (updatedProfile) => {
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

  return { updateBioMutation, changeNameMutation };
};