"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import LecturerShell from '@/components/lecturer/LecturerShell';
import Card from '@/components/lecturer/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import {
  LecturerCourse,
  LearningUnit,
  LearningUnitDocument,
  getCourseLearningUnits,
  getLearningUnitDocuments,
  getMyCourses,
  createLearningUnit,
  updateLearningUnit,
  updateCourse,
  deleteDocument,
  downloadDocumentPDF,
  ingestPDF,
  uploadPDFToR2,
} from '@/lib/auth-api';

type UnitTabKey = 'materials' | 'assignments' | 'quizzes';

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.courseId;
  const mode = searchParams?.get('mode') ?? 'view';
  const isEditMode = mode === 'edit';

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

  const [unitQuery, setUnitQuery] = useState('');
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UnitTabKey>('materials');

  const [courseEditOpen, setCourseEditOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseAccessType, setCourseAccessType] = useState<'public' | 'password' | 'by_request'>('public');
  const [savingCourse, setSavingCourse] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialUnitId, setMaterialUnitId] = useState<string | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [materialMessage, setMaterialMessage] = useState<string | null>(null);

  const [materialsByUnitId, setMaterialsByUnitId] = useState<Record<string, LearningUnitDocument[]>>({});
  const [materialsLoadingByUnitId, setMaterialsLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [materialsErrorByUnitId, setMaterialsErrorByUnitId] = useState<Record<string, string | null>>({});
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxFiles: 1,
    onDropAccepted: (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const name = file.name?.toLowerCase() ?? '';
      const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
      if (!isPdf) {
        setMaterialFile(null);
        setMaterialError('Only pdf file are accepted');
        return;
      }
      setMaterialError(null);
      setMaterialMessage(null);
      setMaterialFile(file);
    },
    onDropRejected: () => {
      setMaterialFile(null);
      setMaterialError('Only pdf file are accepted');
    },
  });

  async function loadMaterials(unitId: string) {
    setMaterialsLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setMaterialsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const docs = await getLearningUnitDocuments(unitId);
      setMaterialsByUnitId((prev) => ({ ...prev, [unitId]: docs }));
    } catch (err) {
      setMaterialsErrorByUnitId((prev) => ({
        ...prev,
        [unitId]: err instanceof Error ? err.message : 'Failed to load materials',
      }));
    } finally {
      setMaterialsLoadingByUnitId((prev) => ({ ...prev, [unitId]: false }));
    }
  }

  useEffect(() => {
    if (!openUnitId) return;
    if (activeTab !== 'materials') return;
    if (materialsByUnitId[openUnitId]) return;
    if (materialsLoadingByUnitId[openUnitId]) return;
    void loadMaterials(openUnitId);
  }, [activeTab, openUnitId, materialsByUnitId, materialsLoadingByUnitId]);

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
          setCourseTitle(found.title ?? '');
          setCourseDescription(found.description ?? '');
          setCourseAccessType((found.access_type as 'public' | 'password' | 'by_request') || 'public');
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

  const filteredUnits = useMemo(() => {
    const q = unitQuery.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => {
      const title = u.title?.toLowerCase() ?? '';
      const desc = u.description?.toLowerCase() ?? '';
      return title.includes(q) || desc.includes(q) || String(u.unit_order).includes(q);
    });
  }, [unitQuery, units]);

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

  async function handleSaveEdit() {
    if (!editingUnitId) return;
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    setError(null);
    setEditMessage(null);
    try {
      const updated = await updateLearningUnit(editingUnitId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        unit_order: editOrder,
      });
      setUnits((prev) =>
        prev
          .map((u) => (u.id === updated.id ? updated : u))
          .sort((a, b) => a.unit_order - b.unit_order),
      );
      setEditMessage('Learning unit updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update learning unit');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveCourse() {
    if (!courseId) return;
    if (!courseTitle.trim()) return;
    setSavingCourse(true);
    setError(null);
    try {
      const updated = await updateCourse(courseId, {
        title: courseTitle.trim(),
        description: courseDescription.trim(),
        access_type: courseAccessType,
      });
      setCourse(updated);
      setCourseEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleUploadMaterial() {
    if (!materialUnitId || !materialFile) return;
    setMaterialUploading(true);
    setMaterialError(null);
    setMaterialMessage(null);
    try {
      const { originalFileName, newFileName } = await uploadPDFToR2(materialFile);
      await ingestPDF({
        originalFileName,
        newFileName,
        learningUnitId: materialUnitId,
      });

      setMaterialMessage('Material uploaded successfully.');
      setMaterialFile(null);
      setMaterialOpen(false);
      await loadMaterials(materialUnitId);
      setMaterialUnitId(null);
    } catch (err) {
      setMaterialError(err instanceof Error ? err.message : 'Failed to upload material');
    } finally {
      setMaterialUploading(false);
    }
  }

  return (
    <LecturerShell>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="space-y-5">
          <button
            type="button"
            className="inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() => router.push('/courses')}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to courses
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-zinc-900">Learning Units</h1>
              <div className="text-sm text-zinc-600">
                {course?.title || (loadingCourse ? 'Loading course...' : 'Course')}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end">
              <div className="relative w-full md:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={unitQuery}
                  onChange={(e) => setUnitQuery(e.target.value)}
                  placeholder="Search units..."
                  className="pl-9"
                />
              </div>
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCourseTitle(course?.title ?? '');
                      setCourseDescription(course?.description ?? '');
                      setCourseAccessType((course?.access_type as 'public' | 'password' | 'by_request') || 'public');
                      setCourseEditOpen(true);
                    }}
                  >
                    Edit Course
                  </Button>
                  <Button
                    variant="outline"
                    className="border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                    onClick={() => {
                      setCreatedMessage(null);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Unit
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/courses/${courseId}?mode=edit`)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {isEditMode && createOpen && (
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

        {isEditMode && editOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (savingEdit) return;
                setEditOpen(false);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title="Edit Learning Unit"
                className="w-full max-w-xl"
                bodyClassName="space-y-4"
              >
                {editMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {editMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Title
                  </div>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={savingEdit}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                    value={editDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditDescription(e.target.value)
                    }
                    disabled={savingEdit}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Order
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={editOrder}
                    onChange={(e) => setEditOrder(Number(e.target.value) || 1)}
                    disabled={savingEdit}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingUnitId(null);
                    }}
                    disabled={savingEdit}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editTitle.trim()}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {isEditMode && courseEditOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (savingCourse) return;
                setCourseEditOpen(false);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title="Edit Course"
                className="w-full max-w-xl"
                bodyClassName="space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Title
                  </div>
                  <Input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    disabled={savingCourse}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                    value={courseDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCourseDescription(e.target.value)
                    }
                    disabled={savingCourse}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Access Type
                  </div>
                  <select
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 focus-visible:ring-2"
                    value={courseAccessType}
                    onChange={(e) => setCourseAccessType(e.target.value as 'public' | 'password' | 'by_request')}
                    disabled={savingCourse}
                  >
                    <option value="public">Public (anyone can join)</option>
                    <option value="password">Password protected</option>
                    <option value="by_request">Request to join</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCourseEditOpen(false)}
                    disabled={savingCourse}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveCourse}
                    disabled={savingCourse || !courseTitle.trim()}
                  >
                    {savingCourse ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {isEditMode && materialOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (materialUploading) return;
                setMaterialOpen(false);
                setMaterialUnitId(null);
                setMaterialFile(null);
                setMaterialError(null);
                setMaterialMessage(null);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title="Add Material"
                className="w-full max-w-xl"
                bodyClassName="space-y-4"
              >
                <div className="text-sm text-zinc-600">
                  Upload a PDF by dragging it here, or click to browse your files.
                </div>

                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center text-sm ${
                    isDragActive
                      ? 'border-zinc-900 bg-zinc-50 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="font-medium">
                    {materialFile ? materialFile.name : 'Drag and drop a PDF here, or click to select'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">Only PDF files are accepted</div>
                </div>

                {materialError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {materialError}
                  </div>
                )}

                {materialMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {materialMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (materialUploading) return;
                      setMaterialOpen(false);
                      setMaterialUnitId(null);
                      setMaterialFile(null);
                      setMaterialError(null);
                      setMaterialMessage(null);
                    }}
                    disabled={materialUploading}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUploadMaterial}
                    disabled={materialUploading || !materialFile}
                  >
                    {materialUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
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

          {filteredUnits.map((unit) => {
            const isOpen = openUnitId === unit.id;
            const materialsCount = materialsByUnitId[unit.id]?.length ?? 0;
            const assignmentsCount = 0;
            const quizzesCount = 0;
            const studentsLabel = '—';

            return (
              <Card
                key={unit.id}
                bodyClassName="p-0"
                className="overflow-hidden"
              >
                <div className="flex items-start gap-4 px-6 py-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900">
                    <Check className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-zinc-900">
                            {unit.title}
                          </h3>
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Unit {unit.unit_order}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-zinc-600">
                          {unit.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 md:pl-4">
                        {isEditMode && (
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                            aria-label="Edit unit"
                            onClick={() => {
                              setEditMessage(null);
                              setEditingUnitId(unit.id);
                              setEditTitle(unit.title ?? '');
                              setEditDescription(unit.description ?? '');
                              setEditOrder(unit.unit_order || 1);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

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
                            {isActive && (
                              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-zinc-900" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-6 py-6">
                      {activeTab === 'materials' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-900">
                              Course Materials
                            </div>
                            {isEditMode && (
                              <Button
                                variant="outline"
                                className="border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                                onClick={() => {
                                  setMaterialError(null);
                                  setMaterialMessage(null);
                                  setMaterialFile(null);
                                  setMaterialUnitId(unit.id);
                                  setMaterialOpen(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Material
                              </Button>
                            )}
                          </div>

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
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setMaterialsErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                      downloadDocumentPDF(doc.id)
                                        .then((blob) => {
                                          const blobUrl = URL.createObjectURL(blob);
                                          window.open(blobUrl, '_blank', 'noopener,noreferrer');
                                          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                                        })
                                        .catch((err: unknown) => {
                                          setMaterialsErrorByUnitId((prev) => ({
                                            ...prev,
                                            [unit.id]:
                                              err instanceof Error ? err.message : 'Failed to open document',
                                          }));
                                        });
                                    }}
                                  >
                                    View
                                  </Button>
                                  {isEditMode && (
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        if (deletingDocumentId) return;
                                        const ok = window.confirm('Delete this material?');
                                        if (!ok) return;
                                        setDeletingDocumentId(doc.id);
                                        setMaterialsErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                        deleteDocument(doc.id)
                                          .then(() => {
                                            setMaterialsByUnitId((prev) => ({
                                              ...prev,
                                              [unit.id]: (prev[unit.id] ?? []).filter((d) => d.id !== doc.id),
                                            }));
                                          })
                                          .catch((err: unknown) => {
                                            setMaterialsErrorByUnitId((prev) => ({
                                              ...prev,
                                              [unit.id]:
                                                err instanceof Error ? err.message : 'Failed to delete document',
                                            }));
                                          })
                                          .finally(() => setDeletingDocumentId(null));
                                      }}
                                      disabled={deletingDocumentId === doc.id}
                                    >
                                      {deletingDocumentId === doc.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                  )}
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
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-900">
                              Assignments
                            </div>
                            {isEditMode && (
                              <Button
                                variant="outline"
                                className="border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                                onClick={() => setError('Add assignment is not implemented yet')}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Assignment
                              </Button>
                            )}
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                            No assignments yet.
                          </div>
                        </div>
                      )}

                      {activeTab === 'quizzes' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-900">
                              Quizzes
                            </div>
                            {isEditMode && (
                              <Button
                                variant="outline"
                                className="border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                                onClick={() => setError('Add quiz is not implemented yet')}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Quiz
                              </Button>
                            )}
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                            No quizzes yet.
                          </div>
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
    </LecturerShell>
  );
}
