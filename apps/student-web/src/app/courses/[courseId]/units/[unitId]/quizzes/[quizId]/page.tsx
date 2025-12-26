'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { getStoredToken } from '@/lib/auth';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function StudentQuizDetailPage() {
  const params = useParams<{ courseId: string; unitId: string; quizId: string }>();
  const router = useRouter();

  const courseId = params?.courseId;
  const unitId = params?.unitId;
  const quizId = params?.quizId;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [navError, setNavError] = useState<string | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt | null>(null);

  const storageKey = useMemo(() => {
    if (!quizId) return null;
    return `quiz-progress:${quizId}`;
  }, [quizId]);

  useEffect(() => {
    if (!unitId || !quizId) return;
    const token = getStoredToken();
    if (!token) return;

    let mounted = true;
    setLoadingQuiz(true);
    setLoadingSubmission(true);
    setQuizError(null);
    setSubmissionError(null);
    setQuiz(null);
    setSubmittedAttempt(null);
    setAnswersByQuestionId({});
    setCurrentQuestionIndex(0);
    setNavError(null);
    setTransitionPhase('idle');
    setResult(null);
    setSubmitError(null);

    fetch(`/api/learning-units/${unitId}/quizzes?limit=200&offset=0`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          quizzes?: Quiz[];
          error?: string;
          message?: string;
        };
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load quiz');
        const list = Array.isArray(data?.quizzes) ? data.quizzes : [];
        const found = list.find((q) => q.id === quizId) || null;
        if (!mounted) return;
        if (!found) {
          setQuizError('Quiz not found');
          setQuiz(null);
          return;
        }
        setQuiz(found);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setQuizError(err instanceof Error ? err.message : 'Failed to load quiz');
        setQuiz(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingQuiz(false);
      });

    fetch(`/api/progress/quizzes/${quizId}/submission/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          submitted?: boolean;
          attempt?: QuizAttempt;
          error?: string;
          message?: string;
        };
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load quiz submission');
        if (!mounted) return;
        if (data?.submitted && data?.attempt) {
          setSubmittedAttempt(data.attempt);
          setResult({
            score: data.attempt.score,
            maxScore: data.attempt.max_score,
            attemptNo: data.attempt.attempt_no,
            submittedAt: data.attempt.created_at,
          });
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setSubmissionError(err instanceof Error ? err.message : 'Failed to load quiz submission');
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingSubmission(false);
      });

    return () => {
      mounted = false;
    };
  }, [unitId, quizId]);

  const questions = quiz?.quiz_data?.questions ?? [];
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const isLocked = Boolean(result) || Boolean(submittedAttempt);
  const displayQuestionNumber = questions.length === 0 ? 0 : Math.min(currentQuestionIndex + 1, questions.length);
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

  const maxScore = useMemo(() => {
    let total = 0;
    for (const q of questions) {
      const pts = q.points && q.points > 0 ? q.points : 1;
      total += pts;
    }
    return total;
  }, [questions]);

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const q of questions) {
      if (answersByQuestionId[q.id]) n += 1;
    }
    return n;
  }, [answersByQuestionId, questions]);

  const canSubmit = questions.length > 0 && answeredCount === questions.length && !submitting && !isLocked;

  useEffect(() => {
    if (!storageKey) return;
    if (submittedAttempt || result) {
      localStorage.removeItem(storageKey);
    }
  }, [result, storageKey, submittedAttempt]);

  useEffect(() => {
    if (!storageKey) return;
    if (!quizId || !quiz) return;
    if (submittedAttempt || result) return;

    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    let parsed: { currentQuestionIndex?: unknown; answersByQuestionId?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw) as { currentQuestionIndex?: unknown; answersByQuestionId?: unknown };
    } catch {
      localStorage.removeItem(storageKey);
      return;
    }
    if (!parsed) return;

    const nextAnswers = typeof parsed?.answersByQuestionId === 'object' && parsed.answersByQuestionId ? (parsed.answersByQuestionId as Record<string, unknown>) : null;
    const filteredAnswers: Record<string, string> = {};
    if (nextAnswers) {
      const ids = new Set(questions.map((q) => q.id));
      for (const [k, v] of Object.entries(nextAnswers)) {
        if (!ids.has(k)) continue;
        if (typeof v !== 'string') continue;
        filteredAnswers[k] = v;
      }
    }

    const idx = typeof parsed?.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : 0;
    const safeIndex = Number.isFinite(idx) && idx >= 0 && idx < questions.length ? idx : 0;
    setAnswersByQuestionId(filteredAnswers);
    setCurrentQuestionIndex(safeIndex);
  }, [questions, quiz, quizId, result, storageKey, submittedAttempt]);

  useEffect(() => {
    if (!storageKey) return;
    if (!quizId || !quiz) return;
    if (submittedAttempt || result) return;

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentQuestionIndex,
        answersByQuestionId,
      }),
    );
  }, [answersByQuestionId, currentQuestionIndex, quiz, quizId, result, storageKey, submittedAttempt]);

  function goToQuestion(nextIndex: number, direction: 'next' | 'prev') {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    if (nextIndex === currentQuestionIndex) return;

    setTransitionDirection(direction);
    setTransitionPhase('out');
    window.setTimeout(() => {
      setCurrentQuestionIndex(nextIndex);
      setTransitionPhase('in');
      window.setTimeout(() => setTransitionPhase('idle'), 160);
    }, 140);
  }

  async function submitQuiz() {
    if (!quizId) return;
    const token = getStoredToken();
    if (!token) return;

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const answers = questions.map((q) => ({
        question_id: q.id,
        answer: answersByQuestionId[q.id] || '',
      }));

      const res = await fetch(`/api/progress/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        score?: number;
        max_score?: number;
        attempt_no?: number;
        submitted_at?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to submit quiz');
      }

      setResult({
        score: data?.score ?? 0,
        maxScore: data?.max_score ?? maxScore,
        attemptNo: data?.attempt_no ?? 1,
        submittedAt: data?.submitted_at ?? null,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StudentShell>
      <div className="space-y-6">
        <button
          type="button"
          className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => {
            if (courseId) {
              router.push(`/courses/${courseId}`);
              return;
            }
            router.back();
          }}
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to course
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">{quiz?.title || (loadingQuiz ? 'Loading quiz...' : 'Quiz')}</h1>
          <div className="text-sm text-zinc-600">
            {quiz?.quiz_data?.time_limit ? `Time limit: ${quiz.quiz_data.time_limit} minutes` : 'No time limit'}
          </div>
        </div>

        {quizError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{quizError}</div>}

        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <div>
                Score: {result.score}/{result.maxScore} (Attempt #{result.attemptNo})
              </div>
            </div>
          </div>
        )}

        {submitError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}
        {submissionError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submissionError}</div>}

        <Card title={`Question ${displayQuestionNumber} of ${questions.length}`}>
          <div className="space-y-6">
            {questions.length === 0 && <div className="text-sm text-zinc-600">No questions available.</div>}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-600">
                Answered {answeredCount}/{questions.length}
              </div>
              <div className="text-xs text-zinc-500">{loadingSubmission ? 'Checking submission…' : isLocked ? 'Submission locked' : 'Progress saved automatically'}</div>
            </div>

            {navError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{navError}</div>}

            {currentQuestion && (
              <div
                key={currentQuestion.id}
                className={`space-y-4 transition-all duration-200 ${
                  transitionPhase === 'out'
                    ? transitionDirection === 'next'
                      ? 'translate-x-2 opacity-0'
                      : '-translate-x-2 opacity-0'
                    : 'translate-x-0 opacity-100'
                }`}
              >
                <div className="text-sm font-semibold text-zinc-900">{currentQuestion.question}</div>

                <div className="grid gap-2">
                  {currentQuestion.options.map((opt) => {
                    const selected = answersByQuestionId[currentQuestion.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`rounded-lg border px-3 py-2 text-left text-sm ${
                          selected ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={isLocked}
                        onClick={() => {
                          setNavError(null);
                          setAnswersByQuestionId((prev) => ({ ...prev, [currentQuestion.id]: opt }));
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLocked || currentQuestionIndex <= 0}
                  onClick={() => {
                    setNavError(null);
                    goToQuestion(currentQuestionIndex - 1, 'prev');
                  }}
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    isLocked ||
                    !currentQuestion ||
                    currentQuestionIndex >= questions.length - 1 ||
                    !answersByQuestionId[currentQuestion.id]
                  }
                  onClick={() => {
                    if (!currentQuestion) return;
                    if (!answersByQuestionId[currentQuestion.id]) {
                      setNavError('Please answer this question before continuing.');
                      return;
                    }
                    setNavError(null);
                    goToQuestion(currentQuestionIndex + 1, 'next');
                  }}
                >
                  Next
                </button>
              </div>

              {isLastQuestion && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSubmit}
                  onClick={() => void submitQuiz()}
                >
                  {submitting ? 'Submitting...' : 'Submit quiz'}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  points: number;
};

type QuizData = {
  questions: QuizQuestion[];
  time_limit: number;
};

type Quiz = {
  id: string;
  learning_unit_id: string;
  title: string;
  quiz_data: QuizData;
  created_at: string;
  updated_at: string;
};

type QuizResult = {
  score: number;
  maxScore: number;
  attemptNo: number;
  submittedAt: string | null;
};

type QuizAttempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_no: number;
  score: number;
  max_score: number;
  created_at: string;
};
