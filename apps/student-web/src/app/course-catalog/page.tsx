'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { getStoredToken } from '@/lib/auth';
import { BookOpen, Clock, Globe, Users } from 'lucide-react';

export default function CourseCatalogPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enrollmentByCourseId, setEnrollmentByCourseId] = useState<
    Record<string, { status: EnrollmentStatus }>
  >({});
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);

  const [query, setQuery] = useState('');
  const [accessType, setAccessType] = useState<'all' | AccessType>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');

  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/courses?limit=200&offset=0', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as CourseListResponse;
        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load courses');
        }
        const list = Array.isArray(data?.courses) ? data.courses : [];
        if (!mounted) return;
        setCourses(list);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load courses';
        setError(msg);
        setCourses([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const token = getStoredToken();
    if (!token) {
      setEnrollmentByCourseId({});
      setEnrollmentsLoaded(true);
      return () => {
        mounted = false;
      };
    }

    fetch('/api/enrollments/me', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as EnrollmentListResponse;
        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load enrollments');
        }
        const list = Array.isArray(data?.enrollments) ? data.enrollments : [];
        if (!mounted) return;
        const next: Record<string, { status: EnrollmentStatus }> = {};
        for (const e of list) {
          next[e.course_id] = { status: e.status };
        }
        setEnrollmentByCourseId(next);
        setEnrollmentsLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setEnrollmentByCourseId({});
        setEnrollmentsLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = courses;

    if (accessType !== 'all') {
      list = list.filter((c) => c.access_type === accessType);
    }

    if (q) {
      list = list.filter((c) => {
        const title = (c.title || '').toLowerCase();
        const description = (c.description || '').toLowerCase();
        return title.includes(q) || description.includes(q);
      });
    }

    const safeTime = (d?: string) => {
      if (!d) return 0;
      const t = Date.parse(d);
      return Number.isFinite(t) ? t : 0;
    };

    const sorted = [...list];
    if (sort === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => safeTime(a.created_at) - safeTime(b.created_at));
    } else {
      sorted.sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));
    }

    return sorted;
  }, [accessType, courses, query, sort]);

  async function handleCourseAction(course: Course) {
    if (busyCourseId) return;
    setActionError(null);

    const token = getStoredToken();
    if (!token) {
      setActionError('Please sign in to continue.');
      return;
    }

    const enrollment = enrollmentByCourseId[course.id];
    if (enrollment?.status === 'enrolled' || enrollment?.status === 'pending_approval') {
      return;
    }

    setBusyCourseId(course.id);
    try {
      if (course.access_type === 'public') {
        const res = await fetch(`/api/courses/${course.id}/join`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to enroll');
        setEnrollmentByCourseId((prev) => ({ ...prev, [course.id]: { status: 'enrolled' } }));
        return;
      }

      if (course.access_type === 'password') {
        const password = window.prompt('Enter course password');
        if (password == null) return;
        const res = await fetch(`/api/courses/${course.id}/join`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to enroll');
        setEnrollmentByCourseId((prev) => ({ ...prev, [course.id]: { status: 'enrolled' } }));
        return;
      }

      const res = await fetch(`/api/courses/${course.id}/request-access`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to request access');
      setEnrollmentByCourseId((prev) => ({ ...prev, [course.id]: { status: 'pending_approval' } }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setBusyCourseId(null);
    }
  }

  return (
    <StudentShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Course Catalog</h1>
            <p className="mt-1 text-sm text-zinc-600">Browse and discover courses</p>
          </div>
          <div className="text-sm text-zinc-600">{filteredCourses.length} courses</div>
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label htmlFor="course-search" className="block text-sm font-medium text-zinc-700">
                Search
              </label>
              <input
                id="course-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or description"
                className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="course-access" className="block text-sm font-medium text-zinc-700">
                Access Type
              </label>
              <select
                id="course-access"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as 'all' | AccessType)}
                className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="password">Password</option>
                <option value="by_request">By Request</option>
              </select>
            </div>

            <div>
              <label htmlFor="course-sort" className="block text-sm font-medium text-zinc-700">
                Sort
              </label>
              <select
                id="course-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'title')}
                className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>
        </Card>

        {!getStoredToken() && (
          <Card>
            <div className="text-sm text-zinc-700">Please sign in to enroll.</div>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {loading || (getStoredToken() && !enrollmentsLoaded) ? (
          <Card>
            <div className="text-sm text-zinc-700">Loading courses…</div>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card>
            <div className="text-sm text-zinc-700">No courses found.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.map((course) => {
              const enrollmentStatus = enrollmentByCourseId[course.id]?.status;
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollmentStatus={enrollmentStatus}
                  isBusy={busyCourseId === course.id}
                  onAction={() => void handleCourseAction(course)}
                />
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}

type AccessType = 'public' | 'password' | 'by_request';

type Course = {
  id: string;
  creator_id: string;
  creator_name?: string;
  title: string;
  description?: string;
  access_type: AccessType;
  student_count?: number;
  estimated_hours?: number;
  created_at?: string;
  updated_at?: string;
};

type CourseListResponse = {
  courses?: Course[];
  error?: string;
  message?: string;
};

type EnrollmentStatus = 'enrolled' | 'pending_approval' | 'denied';

type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  created_at?: string;
  updated_at?: string;
};

type EnrollmentListResponse = {
  enrollments?: Enrollment[];
  error?: string;
  message?: string;
};

function formatAccessType(accessType: AccessType) {
  if (accessType === 'public') return 'Public';
  if (accessType === 'password') return 'Password';
  return 'By Request';
}

function CourseCard({
  course,
  enrollmentStatus,
  isBusy,
  onAction,
}: {
  course: Course;
  enrollmentStatus?: EnrollmentStatus;
  isBusy: boolean;
  onAction: () => void;
}) {
  const isEnrolledOrPending = enrollmentStatus === 'enrolled' || enrollmentStatus === 'pending_approval';

  const buttonLabel = isEnrolledOrPending ? 'Already Enrolled' : isBusy ? 'Enrolling…' : 'Enroll Now';

  const canClick = !isEnrolledOrPending && !isBusy;

  const hours = course.estimated_hours != null ? `${course.estimated_hours} hours` : '— hours';

  return (
    <Card className="flex flex-col overflow-hidden" bodyClassName="p-0">
      <div className="relative h-28 w-full bg-[#5277DE]">
        <div className="flex h-full w-full items-center justify-center px-4 text-center">
          <div className="text-2xl font-semibold text-white">Course</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
          <Globe className="h-4 w-4" />
          <span>{formatAccessType(course.access_type)}</span>
        </div>

        <div className="mt-3 text-xl font-bold leading-tight tracking-tight text-zinc-900">
          {course.title}
        </div>

        <div className="mt-2 text-sm font-semibold text-zinc-700">by {course.creator_name || '—'}</div>

        <div
          className="mt-4 text-sm text-zinc-600"
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {course.description?.trim() ? course.description : 'No description provided.'}
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-zinc-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{hours}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{(course.student_count ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!canClick}
          onClick={onAction}
          className={[
            'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold',
            canClick ? 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50' : 'border-zinc-200 bg-zinc-50 text-zinc-500',
          ].join(' ')}
        >
          <BookOpen className="h-5 w-5" />
          {buttonLabel}
        </button>
      </div>
    </Card>
  );
}
