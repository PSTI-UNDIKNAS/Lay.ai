"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import LecturerShell from '@/components/lecturer/LecturerShell';
import Card from '@/components/lecturer/Card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import {
  AssignmentSubmissionRow,
  downloadSubmissionPDF,
  getAssignmentSubmissions,
  getLearningUnitAssignments,
  LearningUnitAssignment,
} from '@/lib/auth-api';

export default function AssignmentSubmissionsPage() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = params?.courseId;
  const assignmentId = params?.assignmentId;
  const unitId = searchParams?.get('unitId') ?? '';
  const mode = searchParams?.get('mode') ?? 'edit';

  const [assignment, setAssignment] = useState<LearningUnitAssignment | null>(null);
  const [rows, setRows] = useState<AssignmentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    if (!unitId) {
      setError('Missing learning unit id');
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getLearningUnitAssignments(unitId, 200, 0),
      getAssignmentSubmissions(unitId, assignmentId),
    ])
      .then(([assignments, submissions]) => {
        if (!mounted) return;
        const found = assignments.find((a) => a.id === assignmentId) ?? null;
        setAssignment(found);
        setRows(submissions.rows ?? []);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load submissions');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [assignmentId, unitId]);

  const submitted = useMemo(
    () => rows.filter((r) => !!r.submission),
    [rows],
  );

  const notSubmitted = useMemo(
    () => rows.filter((r) => !r.submission),
    [rows],
  );

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
              {assignment?.title || 'Assignment'}
            </h1>
            <div className="text-sm text-zinc-600">
              {assignment?.due_date
                ? `Due ${new Date(assignment.due_date).toLocaleString()}`
                : 'No due date'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              Loading submissions...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card
                title={`Submitted (${submitted.length})`}
                className="overflow-hidden"
                bodyClassName="p-0"
              >
                {submitted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-600">
                    No submissions yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {submitted.map((r) => (
                      <div key={r.student.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {r.student.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 truncate">
                            {r.student.email}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Submitted {new Date(r.submission!.created_at).toLocaleString()}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!r.submission) return;
                            if (!unitId || !assignmentId) return;
                            if (downloadingSubmissionId) return;
                            setDownloadingSubmissionId(r.submission.id);
                            setError(null);
                            downloadSubmissionPDF({
                              unitId,
                              assignmentId,
                              submissionId: r.submission.id,
                            })
                              .then((blob) => {
                                const blobUrl = URL.createObjectURL(blob);
                                window.open(blobUrl, '_blank', 'noopener,noreferrer');
                                window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                              })
                              .catch((err: unknown) => {
                                setError(
                                  err instanceof Error ? err.message : 'Failed to open submission',
                                );
                              })
                              .finally(() => setDownloadingSubmissionId(null));
                          }}
                          disabled={downloadingSubmissionId === r.submission!.id}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {downloadingSubmissionId === r.submission!.id ? 'Opening...' : 'View'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title={`Not Submitted (${notSubmitted.length})`}
                className="overflow-hidden"
                bodyClassName="p-0"
              >
                {notSubmitted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-600">
                    Everyone submitted.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notSubmitted.map((r) => (
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

