import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile, UserPrivate } from '@/types/profile';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api.get<Profile>('/api/profile'),
  });
};

export const useUserPrivate = () => {
  return useQuery({
    queryKey: ['profile', 'private'],
    queryFn: () => api.get<UserPrivate>('/api/profile/private'), // Đảm bảo đường dẫn map đúng với backend của bạn
  });
};