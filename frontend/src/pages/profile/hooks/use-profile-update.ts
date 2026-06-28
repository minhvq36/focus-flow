import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile, UpdateProfilePayload, ChangeNamePayload } from '@/types/profile';

export const useProfileUpdate = () => {
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => 
      api.patch<Profile>('/api/profile', payload),
      
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile', 'me'], updatedProfile);
    },
  });

  const changeNameMutation = useMutation({
    mutationFn: (payload: ChangeNamePayload) => 
      api.post<void>('/api/profile/change-name', payload),
      
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });

  return { updateProfileMutation, changeNameMutation };
};