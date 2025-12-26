export type StudentUser = {
  id: string;
  name: string;
  email: string;
  unique_identifier: string;
  role: string;
  status: string;
};

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getStoredUser(): StudentUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentUser;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

export function isActiveStudent(user: StudentUser | null | undefined) {
  return !!user && user.role === 'student' && user.status === 'active';
}

export async function fetchMe() {
  const token = getStoredToken();
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to validate session';
    throw new Error(msg);
  }
  return data as { user: StudentUser };
}

export async function requestLogout() {
  const token = getStoredToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {}
}

