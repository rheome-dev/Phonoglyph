export interface User {
  id: string; // UUID from Supabase auth.users
  email: string;
  user_metadata: {
    name?: string;
    avatar_url?: string;
    provider?: string;
  };
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthProvider {
  provider: 'google' | 'github' | 'discord';
  redirectTo?: string;
}

export interface AuthError {
  message: string;
  code?: string;
} 