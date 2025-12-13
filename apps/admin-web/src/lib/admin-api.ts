const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:8080/api' : '/api');

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type DashboardMetrics = {
  usersCount: number | null;
  coursesCount: number | null;
  pendingLecturers: number | null;
  healthStatus: string | null;
};

export async function getUsersCount(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users?limit=5000`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const d = await res.json();
    if (!res.ok) return null;
    return typeof d.count === 'number' ? d.count : Array.isArray(d.users) ? d.users.length : null;
  } catch {
    return null;
  }
}

export async function getCoursesCount(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/courses?limit=5000`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const d = await res.json();
    if (!res.ok) return null;
    return typeof d.count === 'number' ? d.count : Array.isArray(d.courses) ? d.courses.length : null;
  } catch {
    return null;
  }
}

export async function getPendingLecturersCount(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lecturers?status=pending_approval`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const d = await res.json();
    if (!res.ok) return null;
    return typeof d.count === 'number' ? d.count : Array.isArray(d.lecturers) ? d.lecturers.length : null;
  } catch {
    return null;
  }
}

export type PendingLecturer = {
  id: string;
  name: string;
  email: string;
  unique_identifier: string;
  created_at: string;
};

export async function getPendingLecturers(): Promise<PendingLecturer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lecturers?status=pending_approval`, {
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const d = await res.json();
    if (!res.ok) {
      const msg = d?.error || d?.message || 'Failed to fetch pending lecturers';
      throw new Error(msg);
    }
    return Array.isArray(d.lecturers) ? d.lecturers : [];
  } catch {
    return [];
  }
}

export type AdminUserRole = 'student' | 'lecturer' | 'admin'
export type AdminUserStatus = 'active' | 'pending_approval' | 'inactive'
export type AdminUser = {
  id: string
  name: string
  email: string
  unique_identifier: string
  role: AdminUserRole
  status: AdminUserStatus
  created_at: string
  updated_at: string
}

export async function getUsers(params?: {
  role?: AdminUserRole
  status?: AdminUserStatus
  limit?: number
  offset?: number
}): Promise<AdminUser[]> {
  const query = new URLSearchParams()
  if (params?.role) query.set('role', params.role)
  if (params?.status) query.set('status', params.status)
  if (params?.limit != null) query.set('limit', String(params.limit))
  if (params?.offset != null) query.set('offset', String(params.offset))

  const url = `${API_BASE_URL}/admin/users${query.toString() ? `?${query.toString()}` : ''}`
  const res = await fetch(url, { headers: { Accept: 'application/json', ...getAuthHeaders() } })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = d?.error || d?.message || 'Failed to fetch users'
    throw new Error(msg)
  }
  return Array.isArray(d.users) ? d.users : []
}

export async function getSystemHealthStatus(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      headers: { Accept: 'application/json' },
    });
    const d = await res.json();
    if (!res.ok) return null;
    return typeof d.status === 'string' ? d.status : null;
  } catch {
    return null;
  }
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [usersCount, coursesCount, pendingLecturers, healthStatus] = await Promise.all([
    getUsersCount(),
    getCoursesCount(),
    getPendingLecturersCount(),
    getSystemHealthStatus(),
  ]);
  return { usersCount, coursesCount, pendingLecturers, healthStatus };
}
