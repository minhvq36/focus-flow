export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  bio?: string;
  avatar_url?: string;
}

export interface ChangeNamePayload {
  display_name: string;
}

export interface UserPrivate {
  user_id: string;
  email: string;
  plan_type: string;
  name_change_count: number;
  updated_at: string;
}