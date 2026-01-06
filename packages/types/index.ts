// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

// Auth Store State
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth Store Actions
export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  setLoading: (loading: boolean) => void;
}