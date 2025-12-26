'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { getStoredToken } from '@/lib/auth';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  HelpCircle,
  Search,
  Users,
  X,
} from 'lucide-react';

type UnitTabKey = 'materials' | 'assignments' | 'quizzes';

export default function StudentCourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const courseId = params?.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<LearningUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unitQuery, setUnitQuery] = useState('');
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UnitTabKey>('materials');

  const [materialsByUnitId, setMaterialsByUnitId] = useState<Record<string, LearningUnitDocument[]>>({});
  const [materialsLoadingByUnitId, setMaterialsLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [materialsErrorByUnitId, setMaterialsErrorByUnitId] = useState<Record<string, string | null>>({});

  const [assignmentsByUnitId, setAssignmentsByUnitId] = useState<Record<string, Assignment[]>>({});
  const [assignmentsLoadingByUnitId, setAssignmentsLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [assignmentsErrorByUnitId, setAssignmentsErrorByUnitId] = useState<Record<string, string | null>>({});

  const [submittedAssignmentsByUnitId, setSubmittedAssignmentsByUnitId] = useState<Record<string, Record<string, string>>>({});
  const [submittedAssignmentsLoadingByUnitId, setSubmittedAssignmentsLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [submittedAssignmentsErrorByUnitId, setSubmittedAssignmentsErrorByUnitId] = useState<Record<string, string | null>>({});

  const [submittedQuizzesByUnitId, setSubmittedQuizzesByUnitId] = useState<Record<string, Record<string, string>>>({});
  const [submittedQuizzesLoadingByUnitId, setSubmittedQuizzesLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [submittedQuizzesErrorByUnitId, setSubmittedQuizzesErrorByUnitId] = useState<Record<string, string | null>>({});

  const [quizzesByUnitId, setQuizzesByUnitId] = useState<Record<string, Quiz[]>>({});
  const [quizzesLoadingByUnitId, setQuizzesLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [quizzesErrorByUnitId, setQuizzesErrorByUnitId] = useState<Record<string, string | null>>({});

  const [unitSummaryByUnitId, setUnitSummaryByUnitId] = useState<
    Record<string, { materialCount: number; assignmentCount: number; quizCount: number }>
  >({});

  const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
  const [materialViewerUrl, setMaterialViewerUrl] = useState<string | null>(null);
  const [materialViewerName, setMaterialViewerName] = useState('');
  const [materialViewerLoading, setMaterialViewerLoading] = useState(false);
  const [materialViewerError, setMaterialViewerError] = useState<string | null>(null);

  async function loadMaterials(unitId: string) {
    const token = getStoredToken();
    if (!token) return null;
    setMaterialsLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setMaterialsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const res = await fetch(`/api/learning-units/${unitId}/materials`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as { documents?: LearningUnitDocument[]; error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load materials');
      }
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      setMaterialsByUnitId((prev) => ({ ...prev, [unitId]: docs }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[unitId];
        return {
          ...prev,
          [unitId]: {
            materialCount: docs.length,
            assignmentCount: current?.assignmentCount ?? 0,
            quizCount: current?.quizCount ?? 0,
          },
        };
      });
      return docs;
    } catch (err) {
      setMaterialsErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load materials',
      }));
      return null;
    } finally {
      setMaterialsLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  async function loadAssignments(unitId: string) {
    const token = getStoredToken();
    if (!token) return null;
    setAssignmentsLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setAssignmentsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const res = await fetch(`/api/learning-units/${unitId}/assignments?limit=200&offset=0`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        assignments?: Assignment[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load assignments');
      }
      const list = Array.isArray(data?.assignments) ? data.assignments : [];
      setAssignmentsByUnitId((prev) => ({ ...prev, [unitId]: list }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[unitId];
        return {
          ...prev,
          [unitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: list.length,
            quizCount: current?.quizCount ?? 0,
          },
        };
      });
      void loadSubmittedAssignments(unitId);
      return list;
    } catch (err) {
      setAssignmentsErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load assignments',
      }));
      return null;
    } finally {
      setAssignmentsLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  async function loadSubmittedAssignments(unitId: string) {
    const token = getStoredToken();
    if (!token) return null;
    if (submittedAssignmentsLoadingByUnitId[unitId]) return null;
    setSubmittedAssignmentsLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setSubmittedAssignmentsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const res = await fetch(`/api/progress/units/${unitId}/assignments/submissions/me`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        submissions?: Array<{ assignment_id: string; created_at: string }>;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load submission status');
      }
      const map: Record<string, string> = {};
      for (const s of Array.isArray(data?.submissions) ? data.submissions : []) {
        if (!s?.assignment_id) continue;
        map[s.assignment_id] = s.created_at;
      }
      setSubmittedAssignmentsByUnitId((prev) => ({ ...prev, [unitId]: map }));
      return map;
    } catch (err) {
      setSubmittedAssignmentsErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load submission status',
      }));
      return null;
    } finally {
      setSubmittedAssignmentsLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  async function loadQuizzes(unitId: string) {
    const token = getStoredToken();
    if (!token) return null;
    setQuizzesLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setQuizzesErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const res = await fetch(`/api/learning-units/${unitId}/quizzes?limit=200&offset=0`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        quizzes?: Quiz[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load quizzes');
      }
      const list = Array.isArray(data?.quizzes) ? data.quizzes : [];
      setQuizzesByUnitId((prev) => ({ ...prev, [unitId]: list }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[unitId];
        return {
          ...prev,
          [unitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: current?.assignmentCount ?? 0,
            quizCount: list.length,
          },
        };
      });
      void loadSubmittedQuizzes(unitId);
      return list;
    } catch (err) {
      setQuizzesErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load quizzes',
      }));
      return null;
    } finally {
      setQuizzesLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  async function loadSubmittedQuizzes(unitId: string) {
    const token = getStoredToken();
    if (!token) return null;
    if (submittedQuizzesLoadingByUnitId[unitId]) return null;
    setSubmittedQuizzesLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setSubmittedQuizzesErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const res = await fetch(`/api/progress/units/${unitId}/quizzes/submissions/me`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        attempts?: Array<{ quiz_id: string; created_at: string }>;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to load quiz status');
      }
      const map: Record<string, string> = {};
      for (const a of Array.isArray(data?.attempts) ? data.attempts : []) {
        if (!a?.quiz_id) continue;
        map[a.quiz_id] = a.created_at;
      }
      setSubmittedQuizzesByUnitId((prev) => ({ ...prev, [unitId]: map }));
      return map;
    } catch (err) {
      setSubmittedQuizzesErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load quiz status',
      }));
      return null;
    } finally {
      setSubmittedQuizzesLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  async function openMaterial(doc: LearningUnitDocument, unitId: string) {
    const token = getStoredToken();
    if (!token) return;
    setMaterialsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    setMaterialViewerOpen(true);
    setMaterialViewerLoading(true);
    setMaterialViewerError(null);
    setMaterialViewerName(doc.file_name || 'Material');
    setMaterialViewerUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const res = await fetch(`/api/learning-units/materials/${doc.id}/download`, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(data?.error || data?.message || 'Failed to open document');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setMaterialViewerUrl(blobUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open document';
      setMaterialsErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: message,
      }));
      setMaterialViewerError(message);
    } finally {
      setMaterialViewerLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (materialViewerUrl) URL.revokeObjectURL(materialViewerUrl);
    };
  }, [materialViewerUrl]);

  useEffect(() => {
    if (!courseId) return;

    let mounted = true;
    setLoadingCourse(true);
    setError(null);

    fetch(`/api/courses/${courseId}`, { method: 'GET', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { course?: Course; error?: string; message?: string };
        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load course');
        }
        if (!mounted) return;
        setCourse(data.course ?? null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load course');
        setCourse(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCourse(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    const token = getStoredToken();
    if (!token) return;

    let mounted = true;
    setLoadingUnits(true);
    setError(null);
    setOpenUnitId(null);

    fetch(`/api/learning-units/courses/${courseId}/units?limit=200&offset=0`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          units?: LearningUnit[];
          learning_units?: LearningUnit[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to load learning units');
        }
        const list = Array.isArray(data?.units)
          ? data.units
          : Array.isArray(data?.learning_units)
            ? data.learning_units
            : [];
        if (!mounted) return;
        setUnits(list);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load learning units');
        setUnits([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingUnits(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    const token = getStoredToken();
    if (!token) return;

    let mounted = true;
    fetch(`/api/learning-units/courses/${courseId}/units/summary`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          summaries?: Array<{
            unit_id: string;
            material_count: number;
            assignment_count: number;
            quiz_count: number;
          }>;
          error?: string;
          message?: string;
        };
        if (!res.ok) return;
        if (!mounted) return;
        const summaries = Array.isArray(data?.summaries) ? data.summaries : [];
        setUnitSummaryByUnitId(() => {
          const next: Record<string, { materialCount: number; assignmentCount: number; quizCount: number }> = {};
          for (const s of summaries) {
            next[s.unit_id] = {
              materialCount: s.material_count ?? 0,
              assignmentCount: s.assignment_count ?? 0,
              quizCount: s.quiz_count ?? 0,
            };
          }
          return next;
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!openUnitId) return;
    if (activeTab !== 'materials') return;
    if (materialsByUnitId[openUnitId]) return;
    if (materialsLoadingByUnitId[openUnitId]) return;
    void loadMaterials(openUnitId);
  }, [activeTab, openUnitId, materialsByUnitId, materialsLoadingByUnitId]);

  useEffect(() => {
    if (!openUnitId) return;
    if (activeTab !== 'assignments') return;
    if (assignmentsByUnitId[openUnitId]) return;
    if (assignmentsLoadingByUnitId[openUnitId]) return;
    void loadAssignments(openUnitId);
  }, [activeTab, openUnitId, assignmentsByUnitId, assignmentsLoadingByUnitId]);

  useEffect(() => {
    if (!openUnitId) return;
    if (activeTab !== 'quizzes') return;
    if (quizzesByUnitId[openUnitId]) return;
    if (quizzesLoadingByUnitId[openUnitId]) return;
    void loadQuizzes(openUnitId);
  }, [activeTab, openUnitId, quizzesByUnitId, quizzesLoadingByUnitId]);

  useEffect(() => {
    if (!openUnitId) return;
    if (activeTab !== 'quizzes') return;
    if (!quizzesByUnitId[openUnitId]) return;
    if (submittedQuizzesByUnitId[openUnitId]) return;
    if (submittedQuizzesLoadingByUnitId[openUnitId]) return;
    void loadSubmittedQuizzes(openUnitId);
  }, [activeTab, openUnitId, quizzesByUnitId, submittedQuizzesByUnitId, submittedQuizzesLoadingByUnitId]);

  const filteredUnits = useMemo(() => {
    const q = unitQuery.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => {
      const title = u.title?.toLowerCase() ?? '';
      const desc = u.description?.toLowerCase() ?? '';
      return title.includes(q) || desc.includes(q) || String(u.unit_order).includes(q);
    });
  }, [unitQuery, units]);

  const hasToken = !!getStoredToken();

  return (
    <StudentShell>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="space-y-5">
          <button
            type="button"
            className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() => router.push('/enrolled-courses')}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to enrolled courses
          </button>

          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-zinc-900">
                {course?.title || (loadingCourse ? 'Loading course...' : 'Course')}
              </h1>
              <div className="text-sm text-zinc-600">
                {course?.description || (loadingCourse ? 'Loading description...' : '—')}
              </div>
            </div>

            <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" />
                <div>Students: {course?.student_count != null ? course.student_count : '—'}</div>
              </div>
              <div className="space-y-1">
                <div>Lecturer: {course?.creator_name || '—'}</div>
                <div>Estimated hours: {course?.estimated_hours != null ? course.estimated_hours : '—'}</div>
              </div>
            </div>

            <div className="h-px w-full bg-zinc-200" />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Learning Units</h2>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end">
                <div className="relative w-full md:w-[320px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={unitQuery}
                    onChange={(e) => setUnitQuery(e.target.value)}
                    placeholder="Search units..."
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 pl-9 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
          {!hasToken && (
            <Card>
              <div className="text-sm text-zinc-700">Please sign in to view this course.</div>
            </Card>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loadingUnits && units.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              Loading learning units...
            </div>
          )}

          {!loadingUnits && units.length === 0 && !error && hasToken && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              No learning units have been created for this course yet.
            </div>
          )}

          {filteredUnits.map((unit) => {
            const isOpen = openUnitId === unit.id;
            const summary = unitSummaryByUnitId[unit.id];
            const materialsCount = summary?.materialCount ?? materialsByUnitId[unit.id]?.length ?? 0;
            const assignmentsCount = summary?.assignmentCount ?? assignmentsByUnitId[unit.id]?.length ?? 0;
            const quizzesCount = summary?.quizCount ?? quizzesByUnitId[unit.id]?.length ?? 0;
            const studentsLabel = '—';

            return (
              <Card key={unit.id} bodyClassName="p-0" className="overflow-hidden">
                <div className="flex items-start gap-4 px-6 py-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900">
                    <Check className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-zinc-900">{unit.title}</h3>
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Unit {unit.unit_order}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-zinc-600">
                          {unit.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 md:pl-4">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          onClick={() => {
                            setActiveTab('materials');
                            setOpenUnitId((prev) => (prev === unit.id ? null : unit.id));
                          }}
                          aria-label={isOpen ? 'Collapse unit' : 'Expand unit'}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600">
                      <div className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium">{materialsCount}</span>
                        <span>Materials</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium">{assignmentsCount}</span>
                        <span>Assignments</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium">{quizzesCount}</span>
                        <span>Quizzes</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-500" />
                        <span>{studentsLabel} Students</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-200">
                    <div className="flex items-center gap-6 border-b border-zinc-200 bg-zinc-50 px-6">
                      {(
                        [
                          { key: 'materials', label: 'Materials', count: materialsCount, icon: FileText },
                          { key: 'assignments', label: 'Assignments', count: assignmentsCount, icon: ClipboardList },
                          { key: 'quizzes', label: 'Quizzes', count: quizzesCount, icon: HelpCircle },
                        ] as const
                      ).map((t) => {
                        const isActive = activeTab === t.key;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setActiveTab(t.key)}
                            className={`relative flex items-center gap-2 py-4 text-sm font-medium ${
                              isActive ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{t.label}</span>
                            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                              {t.count}
                            </span>
                            {isActive && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-zinc-900" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-6 py-6">
                      {activeTab === 'materials' && (
                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-zinc-900">Course Materials</div>

                          {materialsErrorByUnitId[unit.id] && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {materialsErrorByUnitId[unit.id]}
                            </div>
                          )}

                          {materialsLoadingByUnitId[unit.id] && !materialsByUnitId[unit.id] && (
                            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                              Loading materials...
                            </div>
                          )}

                          {!!materialsByUnitId[unit.id]?.length && (
                            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                              {materialsByUnitId[unit.id].map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-zinc-900">
                                      {doc.file_name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      Uploaded {new Date(doc.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                                    onClick={() => void openMaterial(doc, unit.id)}
                                  >
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {!materialsLoadingByUnitId[unit.id] &&
                            (!materialsByUnitId[unit.id] || materialsByUnitId[unit.id].length === 0) &&
                            !materialsErrorByUnitId[unit.id] && (
                              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                                No materials yet.
                              </div>
                            )}
                        </div>
                      )}

                      {activeTab === 'assignments' && (
                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-zinc-900">Assignments</div>

                          {assignmentsErrorByUnitId[unit.id] && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {assignmentsErrorByUnitId[unit.id]}
                            </div>
                          )}

                          {assignmentsLoadingByUnitId[unit.id] && !assignmentsByUnitId[unit.id] && (
                            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                              Loading assignments...
                            </div>
                          )}

                          {!!assignmentsByUnitId[unit.id]?.length && (
                            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                              {assignmentsByUnitId[unit.id].map((a) => (
                                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                  <button
                                    type="button"
                                    className="min-w-0 text-left"
                                    onClick={() => {
                                      if (!courseId) return;
                                      router.push(`/courses/${courseId}/units/${unit.id}/assignments/${a.id}`);
                                    }}
                                  >
                                    <div className="truncate text-sm font-medium text-zinc-900">{a.title}</div>
                                    <div className="text-xs text-zinc-500">
                                      {a.due_date ? `Due ${new Date(a.due_date).toLocaleString()}` : 'No due date'}
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {submittedAssignmentsByUnitId[unit.id]?.[a.id] && (
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                        Submitted
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                                      onClick={() => {
                                        if (!courseId) return;
                                        router.push(`/courses/${courseId}/units/${unit.id}/assignments/${a.id}`);
                                      }}
                                    >
                                      View
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!assignmentsLoadingByUnitId[unit.id] &&
                            (!assignmentsByUnitId[unit.id] || assignmentsByUnitId[unit.id].length === 0) &&
                            !assignmentsErrorByUnitId[unit.id] && (
                              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                                No assignments yet.
                              </div>
                            )}
                        </div>
                      )}

                      {activeTab === 'quizzes' && (
                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-zinc-900">Quizzes</div>

                          {quizzesErrorByUnitId[unit.id] && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {quizzesErrorByUnitId[unit.id]}
                            </div>
                          )}

                          {submittedQuizzesErrorByUnitId[unit.id] && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {submittedQuizzesErrorByUnitId[unit.id]}
                            </div>
                          )}

                          {quizzesLoadingByUnitId[unit.id] && !quizzesByUnitId[unit.id] && (
                            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                              Loading quizzes...
                            </div>
                          )}

                          {!!quizzesByUnitId[unit.id]?.length && (
                            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                              {quizzesByUnitId[unit.id].map((q) => (
                                <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-zinc-900">{q.title}</div>
                                    <div className="text-xs text-zinc-500">
                                      Updated {new Date(q.updated_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {submittedQuizzesByUnitId[unit.id]?.[q.id] ? (
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                        Done
                                      </span>
                                    ) : (
                                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                                        Not done
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                                      onClick={() => {
                                        if (!courseId) return;
                                        router.push(`/courses/${courseId}/units/${unit.id}/quizzes/${q.id}`);
                                      }}
                                    >
                                      Take quiz
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!quizzesLoadingByUnitId[unit.id] &&
                            (!quizzesByUnitId[unit.id] || quizzesByUnitId[unit.id].length === 0) &&
                            !quizzesErrorByUnitId[unit.id] && (
                              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                                No quizzes yet.
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {materialViewerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setMaterialViewerOpen(false);
              setMaterialViewerError(null);
              setMaterialViewerLoading(false);
              setMaterialViewerUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
              });
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card
              title={materialViewerName || 'Material'}
              headerRight={
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    setMaterialViewerOpen(false);
                    setMaterialViewerError(null);
                    setMaterialViewerLoading(false);
                    setMaterialViewerUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                  }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              }
              className="w-full max-w-5xl"
              bodyClassName="p-0"
            >
              <div className="h-[75vh] w-full bg-zinc-50">
                {materialViewerError && (
                  <div className="p-5">
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {materialViewerError}
                    </div>
                  </div>
                )}

                {materialViewerLoading && !materialViewerError && (
                  <div className="p-5 text-sm text-zinc-600">Loading material...</div>
                )}

                {!materialViewerLoading && !materialViewerError && materialViewerUrl && (
                  <iframe
                    title={materialViewerName || 'Material'}
                    src={materialViewerUrl}
                    className="h-full w-full"
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
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

type LearningUnit = {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  unit_order: number;
  created_at: string;
  updated_at: string;
};

type LearningUnitDocument = {
  id: string;
  learning_unit_id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

type Assignment = {
  id: string;
  learning_unit_id: string;
  title: string;
  description?: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
};

type Quiz = {
  id: string;
  learning_unit_id: string;
  title: string;
  quiz_data?: unknown;
  created_at: string;
  updated_at: string;
};
