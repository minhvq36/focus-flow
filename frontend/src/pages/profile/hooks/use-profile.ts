import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile } from '@/types/profile';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api.get<Profile>('/api/profile/me'),
  });
};