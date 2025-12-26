'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { getStoredToken } from '@/lib/auth';
import { ArrowLeft, Upload } from 'lucide-react';

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ courseId: string; unitId: string; assignmentId: string }>();
  const router = useRouter();

  const courseId = params?.courseId;
  const unitId = params?.unitId;
  const assignmentId = params?.assignmentId;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  useEffect(() => {
    if (!unitId || !assignmentId) return;
    const token = getStoredToken();
    if (!token) return;

    let mounted = true;
    setLoadingAssignment(true);
    setAssignmentError(null);
    setAssignment(null);

    fetch(`/api/learning-units/${unitId}/assignments?limit=200&offset=0`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          assignments?: Assignment[];
          error?: string;
          message?: string;
        };
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load assignment');
        const list = Array.isArray(data?.assignments) ? data.assignments : [];
        const found = list.find((a) => a.id === assignmentId) || null;
        if (!mounted) return;
        if (!found) {
          setAssignmentError('Assignment not found');
          setAssignment(null);
          return;
        }
        setAssignment(found);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setAssignmentError(err instanceof Error ? err.message : 'Failed to load assignment');
        setAssignment(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingAssignment(false);
      });

    return () => {
      mounted = false;
    };
  }, [unitId, assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;
    const token = getStoredToken();
    if (!token) return;

    let mounted = true;
    setLoadingSubmission(true);
    setExistingSubmission(null);

    fetch(`/api/progress/assignments/${assignmentId}/submission/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          submitted?: boolean;
          submission?: Submission;
        };
        if (!res.ok) return;
        if (!mounted) return;
        if (data?.submitted && data?.submission) {
          setExistingSubmission(data.submission);
        } else {
          setExistingSubmission(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setExistingSubmission(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingSubmission(false);
      });

    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  const dueLabel = useMemo(() => {
    if (!assignment?.due_date) return 'No due date';
    try {
      return `Due ${new Date(assignment.due_date).toLocaleString()}`;
    } catch {
      return 'Due date unavailable';
    }
  }, [assignment?.due_date]);

  async function submitPDF() {
    if (!assignmentId) return;
    const token = getStoredToken();
    if (!token) return;
    if (existingSubmission) {
      setSubmitError('You already submitted this assignment.');
      setSubmitSuccess(null);
      return;
    }
    if (!selectedFile) {
      setSubmitError('Please select a PDF file.');
      setSubmitSuccess(null);
      return;
    }

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setSubmitError('Only PDF files are accepted.');
      setSubmitSuccess(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const form = new FormData();
      form.append('file', selectedFile);

      const uploadRes = await fetch(`/api/progress/assignments/${assignmentId}/upload`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        newFileName?: string;
        error?: string;
        message?: string;
      };
      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || uploadData?.message || 'Failed to upload PDF');
      }
      if (!uploadData.newFileName) {
        throw new Error('Upload failed: missing file reference');
      }

      const submitRes = await fetch(`/api/progress/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ file_path: uploadData.newFileName }),
      });
      const submitData = (await submitRes.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!submitRes.ok) {
        throw new Error(submitData?.error || submitData?.message || 'Failed to submit assignment');
      }

      setSubmitSuccess('Submitted successfully.');
      setSelectedFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit assignment');
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
          <h1 className="text-2xl font-semibold text-zinc-900">
            {assignment?.title || (loadingAssignment ? 'Loading assignment...' : 'Assignment')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <div>{dueLabel}</div>
            {existingSubmission && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                Submitted
              </span>
            )}
            {loadingSubmission && <div className="text-xs text-zinc-500">Checking submission...</div>}
          </div>
        </div>

        {assignmentError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{assignmentError}</div>
        )}

        <Card title="Details">
          <div className="space-y-3 text-sm">
            <div className="text-zinc-700 whitespace-pre-wrap">{assignment?.description || '—'}</div>
          </div>
        </Card>

        <Card title="Submit (PDF only)">
          <div className="space-y-4">
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
            )}
            {submitSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {submitSuccess}
              </div>
            )}
            {existingSubmission && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                You already submitted this assignment.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-600">File</div>
                <div className="truncate text-sm text-zinc-900">
                  {selectedFile?.name || existingSubmission?.file_path || 'No file selected'}
                </div>
              </div>

              <label
                className={`inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 ${existingSubmission || submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={!!existingSubmission || submitting}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (!f) return;
                    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                    if (!isPdf) {
                      setSelectedFile(null);
                      setSubmitError('Only PDF files are accepted.');
                      setSubmitSuccess(null);
                      return;
                    }
                    setSelectedFile(f);
                    setSubmitError(null);
                    setSubmitSuccess(null);
                  }}
                />
                Choose PDF
              </label>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={!!existingSubmission || !selectedFile || submitting}
              onClick={() => void submitPDF()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit assignment'}
            </button>
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  file_path: string;
  grade?: string;
  feedback?: string;
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
