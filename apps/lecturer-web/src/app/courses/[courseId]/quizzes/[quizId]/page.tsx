"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import LecturerShell from '@/components/lecturer/LecturerShell';
import Card from '@/components/lecturer/Card';
import { ArrowLeft, Users } from 'lucide-react';
import {
  getLearningUnitQuizzes,
  getQuizAttempts,
  LearningUnitQuiz,
  QuizAttemptRow,
} from '@/lib/auth-api';

export default function QuizAttemptsPage() {
  const params = useParams<{ courseId: string; quizId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = params?.courseId;
  const quizId = params?.quizId;
  const unitId = searchParams?.get('unitId') ?? '';
  const mode = searchParams?.get('mode') ?? 'edit';

  const [quiz, setQuiz] = useState<LearningUnitQuiz | null>(null);
  const [rows, setRows] = useState<QuizAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayError = !unitId ? 'Missing learning unit id' : error;

  useEffect(() => {
    if (!quizId) return;
    if (!unitId) return;

    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    Promise.all([getLearningUnitQuizzes(unitId, 200, 0), getQuizAttempts(unitId, quizId)])
      .then(([quizzes, attempts]) => {
        if (!mounted) return;
        const found = quizzes.find((q) => q.id === quizId) ?? null;
        setQuiz(found);
        setRows(attempts.rows ?? []);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load quiz attempts');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [quizId, unitId]);

  const attempted = useMemo(() => rows.filter((r) => !!r.attempt), [rows]);
  const notAttempted = useMemo(() => rows.filter((r) => !r.attempt), [rows]);

  return (
    <LecturerShell>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="space-y-5">
          <button
            type="button"
            className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() => router.push(`/courses/${courseId}?mode=${mode}`)}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to course
          </button>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {quiz?.title || 'Quiz'}
            </h1>
            <div className="text-sm text-zinc-600">
              {attempted.length} attempted · {notAttempted.length} pending
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
          {displayError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {displayError}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              Loading quiz attempts...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title={`Attempted (${attempted.length})`} className="overflow-hidden" bodyClassName="p-0">
                {attempted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-600">
                    No attempts yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {attempted.map((r) => (
                      <div key={r.student.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {r.student.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 truncate">
                            {r.student.email}
                          </div>
                          {r.attempt && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Attempt #{r.attempt.attempt_no} · Score {r.attempt.score}/{r.attempt.max_score} ·{' '}
                              {new Date(r.attempt.created_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title={`Not Attempted (${notAttempted.length})`} className="overflow-hidden" bodyClassName="p-0">
                {notAttempted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-600">
                    Everyone attempted.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notAttempted.map((r) => (
                      <div key={r.student.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {r.student.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 truncate">
                            {r.student.email}
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600">
                          <Users className="h-4 w-4 text-zinc-500" />
                          Pending
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </LecturerShell>
  );
}
