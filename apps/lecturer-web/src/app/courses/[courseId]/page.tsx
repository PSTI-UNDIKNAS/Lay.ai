"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LecturerShell from '@/components/lecturer/LecturerShell';
import Card from '@/components/lecturer/Card';
import StatCard from '@/components/lecturer/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, FileText, Layers, ArrowLeft } from 'lucide-react';
import {
  LecturerCourse,
  LearningUnit,
  getCourseLearningUnits,
  getMyCourses,
  createLearningUnit,
} from '@/lib/auth-api';

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const courseId = params?.courseId;

  const [course, setCourse] = useState<LecturerCourse | null>(null);
  const [units, setUnits] = useState<LearningUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [unitOrder, setUnitOrder] = useState<number>(1);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    let mounted = true;
    setLoadingCourse(true);
    setError(null);

    getMyCourses(100, 0)
      .then((courses) => {
        if (!mounted) return;
        const found = courses.find((c) => c.id === courseId);
        if (found) {
          setCourse(found);
        } else {
          setError('Course not found');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load course details',
        );
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
    let mounted = true;
    setLoadingUnits(true);
    setError(null);

    getCourseLearningUnits(courseId, 200, 0)
      .then((data) => {
        if (!mounted) return;
        setUnits(data);
        const nextOrder = data.length > 0 ? data[data.length - 1].unit_order + 1 : 1;
        setUnitOrder(nextOrder);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load learning units',
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingUnits(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const stats = useMemo(
    () => ({
      totalUnits: units.length,
    }),
    [units],
  );

  async function handleCreateUnit() {
    if (!courseId) return;
    if (!unitTitle.trim()) return;
    setCreatingUnit(true);
    setError(null);
    setCreatedMessage(null);
    try {
      const unit = await createLearningUnit(
        courseId,
        unitTitle.trim(),
        unitDescription.trim(),
        unitOrder,
      );
      setUnits((prev) => [...prev, unit].sort((a, b) => a.unit_order - b.unit_order));
      setUnitTitle('');
      setUnitDescription('');
      const nextOrder =
        unit.unit_order >= unitOrder ? unit.unit_order + 1 : unitOrder + 1;
      setUnitOrder(nextOrder);
      setCreatedMessage('Learning unit created successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create learning unit',
      );
    } finally {
      setCreatingUnit(false);
    }
  }

  return (
    <LecturerShell>
      <div className="flex h-full flex-col space-y-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <button
              type="button"
              className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-800"
              onClick={() => router.push('/courses')}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to courses
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                {course?.title || (loadingCourse ? 'Loading course...' : 'Course')}
              </h1>
              {course?.description && (
                <p className="mt-2 text-sm text-zinc-600">{course.description}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setCreatedMessage(null);
              setCreateOpen(true);
            }}
          >
            Create Learning Unit
          </Button>
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setCreateOpen(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title="Create Learning Unit"
                className="w-full max-w-xl"
                bodyClassName="space-y-4"
              >
                {createdMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {createdMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Title
                  </div>
                  <Input
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    disabled={creatingUnit}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                    value={unitDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUnitDescription(e.target.value)
                    }
                    disabled={creatingUnit}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Order
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={unitOrder}
                    onChange={(e) => setUnitOrder(Number(e.target.value) || 1)}
                    disabled={creatingUnit}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={creatingUnit}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateUnit}
                    disabled={creatingUnit || !unitTitle.trim()}
                  >
                    {creatingUnit ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Learning Units"
            value={<span>{stats.totalUnits}</span>}
            icon={<Layers className="h-6 w-6" />}
          />
          <StatCard
            title="Course Created"
            value={
              <span>
                {course?.created_at
                  ? new Date(course.created_at).toLocaleDateString()
                  : '-'}
              </span>
            }
            icon={<BookOpen className="h-6 w-6" />}
          />
          <StatCard
            title="Last Updated"
            value={
              <span>
                {course?.updated_at
                  ? new Date(course.updated_at).toLocaleDateString()
                  : '-'}
              </span>
            }
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
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

          {!loadingUnits && units.length === 0 && !error && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              No learning units have been created for this course yet.
            </div>
          )}

          {units.map((unit) => (
            <Card key={unit.id} title={unit.title}>
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Unit {unit.unit_order}
                </div>
                {unit.description && (
                  <p className="text-sm text-zinc-700">{unit.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Created{' '}
                    {new Date(unit.created_at).toLocaleString()}
                  </span>
                  <span>
                    Last updated{' '}
                    {new Date(unit.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </LecturerShell>
  );
}
