// API Error Type
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Token Storage Utilities
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },
  
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },
  
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }
};

// API Utilities
export const createAuthHeaders = (token?: string): HeadersInit => {
  const authToken = token || tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` })
  };
};

export const handleApiError = (error: any): ApiError => {
  if (error.response?.data) {
    return {
      message: error.response.data.message || 'An error occurred',
      code: error.response.data.code,
      details: error.response.data.details
    };
  }
  
  return {
    message: error.message || 'Network error occurred'
  };
};

// API Base URL
export const getApiUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  return '/api';
};