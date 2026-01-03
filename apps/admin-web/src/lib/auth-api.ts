const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export interface ApiError {
  error?: string;
  message?: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Login failed');
  }

  return data as LoginResponse;
}

export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    unique_identifier: string;
    role: string;
    status: string;
  };
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMe(): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Normalize to a consistent error message expected by UI
    const msg = data?.error || data?.message;
    if (response.status === 401) {
      throw new Error('Invalid or expired token');
    }
    throw new Error(msg || 'Failed to validate session');
  }

  return data as MeResponse;
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    // Best-effort: even if server fails, proceed to clear client state
    await response.json().catch(() => ({}));
  } catch {
    // ignore
  }
}
