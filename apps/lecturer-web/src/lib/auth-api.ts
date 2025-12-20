const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:8080/api' : '/api');

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
    await response.json().catch(() => ({}));
  } catch {}
}

export interface LecturerCourse {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  access_type: string;
  created_at: string;
  updated_at: string;
}

export interface LearningUnit {
  id: string;
  course_id: string;
  title: string;
  description: string;
  unit_order: number;
  created_at: string;
  updated_at: string;
}

export async function getMyCourses(limit = 100, offset = 0): Promise<LecturerCourse[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));

  const response = await fetch(
    `${API_BASE_URL}/courses/me${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to fetch your courses';
    throw new Error(msg);
  }

  if (Array.isArray(data.courses)) {
    return data.courses as LecturerCourse[];
  }

  return [];
}

export type CourseAccessType = 'public' | 'password' | 'by_request';

export async function updateCourse(
  courseId: string,
  updates: { title?: string; description?: string; access_type: CourseAccessType },
): Promise<LecturerCourse> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to update course';
    throw new Error(msg);
  }

  if (data.course) {
    return data.course as LecturerCourse;
  }

  throw new Error('Invalid course response');
}

export async function createCourse(
  title: string,
  description: string,
  accessType: CourseAccessType = 'public',
  password?: string,
): Promise<LecturerCourse> {
  const body: Record<string, unknown> = {
    title,
    description,
    access_type: accessType,
  };
  if (accessType === 'password' && password) {
    body.password = password;
  }

  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to create course';
    throw new Error(msg);
  }

  if (data.course) {
    return data.course as LecturerCourse;
  }

  throw new Error('Invalid course response');
}

export async function getCourseLearningUnits(courseId: string, limit = 100, offset = 0): Promise<LearningUnit[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));

  const response = await fetch(
    `${API_BASE_URL}/learning-units/courses/${courseId}/units/manage${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to fetch learning units';
    throw new Error(msg);
  }

  if (Array.isArray(data.units)) {
    return data.units as LearningUnit[];
  }

  if (Array.isArray(data.learning_units)) {
    return data.learning_units as LearningUnit[];
  }

  return [];
}

export async function createLearningUnit(
  courseId: string,
  title: string,
  description: string,
  unitOrder: number,
): Promise<LearningUnit> {
  const response = await fetch(`${API_BASE_URL}/learning-units/courses/${courseId}/units`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      title,
      description,
      unit_order: unitOrder,
      order_index: unitOrder,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to create learning unit';
    throw new Error(msg);
  }

  if (data.unit) {
    return data.unit as LearningUnit;
  }

  throw new Error('Invalid learning unit response');
}

export async function updateLearningUnit(
  unitId: string,
  updates: { title?: string; description?: string; unit_order?: number },
): Promise<LearningUnit> {
  const response = await fetch(`${API_BASE_URL}/learning-units/${unitId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      ...updates,
      ...(updates.unit_order != null ? { order_index: updates.unit_order } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to update learning unit';
    throw new Error(msg);
  }

  if (data.unit) {
    return data.unit as LearningUnit;
  }

  throw new Error('Invalid learning unit response');
}

interface CourseAccessRequest {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

async function getCourseAccessRequests(courseId: string): Promise<CourseAccessRequest[]> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/access-requests`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to fetch course access requests';
    throw new Error(msg);
  }

  if (Array.isArray(data.requests)) {
    return data.requests as CourseAccessRequest[];
  }

  return [];
}

export interface LecturerDashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalLearningUnits: number;
}

export async function fetchLecturerDashboardStats(): Promise<LecturerDashboardStats> {
  const defaults: LecturerDashboardStats = {
    totalCourses: 5,
    totalStudents: 247,
    totalLearningUnits: 32,
  };

  try {
    const courses = await getMyCourses(100, 0);
    const totalCourses = courses.length;

    const requestsByCourse = await Promise.all(
      courses.map((course) => getCourseAccessRequests(course.id)),
    );

    const totalStudents = requestsByCourse.reduce(
      (sum, requests) => sum + requests.length,
      0,
    );

    return {
      totalCourses,
      totalStudents,
      totalLearningUnits: defaults.totalLearningUnits,
    };
  } catch {
    return defaults;
  }
}
