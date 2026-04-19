// Social types
export interface Friend {
  id: string;
  username: string;
  avatar: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
}
