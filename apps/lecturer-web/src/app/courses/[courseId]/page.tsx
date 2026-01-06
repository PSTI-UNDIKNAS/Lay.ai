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
  X,
} from 'lucide-react';
import {
  LecturerCourse,
  LearningUnit,
  LearningUnitAssignment,
  LearningUnitDocument,
  LearningUnitQuiz,
  QuizData,
  QuizQuestion,
  createLearningUnitAssignment,
  createLearningUnitQuiz,
  deleteLearningUnitAssignment,
  deleteLearningUnitQuiz,
  getCourseEnrolledStudentCount,
  getCourseLearningUnits,
  getCourseLearningUnitSummaries,
  getLearningUnitAssignments,
  getLearningUnitDocuments,
  getLearningUnitQuizzes,
  getMe,
  getMyCourses,
  createLearningUnit,
  updateLearningUnitAssignment,
  updateLearningUnit,
  updateCourse,
  updateLearningUnitQuiz,
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

  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loadingStudentCount, setLoadingStudentCount] = useState(false);
  const [lecturerName, setLecturerName] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [loadingLecturer, setLoadingLecturer] = useState(false);

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

  const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
  const [materialViewerUrl, setMaterialViewerUrl] = useState<string | null>(null);
  const [materialViewerName, setMaterialViewerName] = useState('');
  const [materialViewerLoading, setMaterialViewerLoading] = useState(false);
  const [materialViewerError, setMaterialViewerError] = useState<string | null>(null);

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentUnitId, setAssignmentUnitId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const [assignmentsByUnitId, setAssignmentsByUnitId] = useState<Record<string, LearningUnitAssignment[]>>({});
  const [assignmentsLoadingByUnitId, setAssignmentsLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [assignmentsErrorByUnitId, setAssignmentsErrorByUnitId] = useState<Record<string, string | null>>({});

  const [quizzesByUnitId, setQuizzesByUnitId] = useState<Record<string, LearningUnitQuiz[]>>({});
  const [quizzesLoadingByUnitId, setQuizzesLoadingByUnitId] = useState<Record<string, boolean>>({});
  const [quizzesErrorByUnitId, setQuizzesErrorByUnitId] = useState<Record<string, string | null>>({});

  const [unitSummaryByUnitId, setUnitSummaryByUnitId] = useState<
    Record<string, { materialCount: number; assignmentCount: number; quizCount: number }>
  >({});

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizUnitId, setQuizUnitId] = useState<string | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState<number>(10);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizMessage, setQuizMessage] = useState<string | null>(null);
  const [quizModalError, setQuizModalError] = useState<string | null>(null);

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

  function closeMaterialViewer() {
    setMaterialViewerOpen(false);
    setMaterialViewerLoading(false);
    setMaterialViewerError(null);
    setMaterialViewerUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  useEffect(() => {
    return () => {
      if (materialViewerUrl) URL.revokeObjectURL(materialViewerUrl);
    };
  }, [materialViewerUrl]);

  async function loadAssignments(unitId: string) {
    setAssignmentsLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setAssignmentsErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const assignments = await getLearningUnitAssignments(unitId, 100, 0);
      setAssignmentsByUnitId((prev) => ({ ...prev, [unitId]: assignments }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[unitId];
        return {
          ...prev,
          [unitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: assignments.length,
            quizCount: current?.quizCount ?? 0,
          },
        };
      });
      return assignments;
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

  async function loadQuizzes(unitId: string) {
    setQuizzesLoadingByUnitId((prev) => ({ ...prev, [unitId]: true }));
    setQuizzesErrorByUnitId((prev) => ({ ...prev, [unitId]: null }));
    try {
      const quizzes = await getLearningUnitQuizzes(unitId, 100, 0);
      setQuizzesByUnitId((prev) => ({ ...prev, [unitId]: quizzes }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[unitId];
        return {
          ...prev,
          [unitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: current?.assignmentCount ?? 0,
            quizCount: quizzes.length,
          },
        };
      });
      return quizzes;
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
    if (!quizOpen) return;
    if (quizQuestions.length === 0) {
      if (selectedQuestionId) setSelectedQuestionId(null);
      return;
    }
    const stillExists = selectedQuestionId
      ? quizQuestions.some((q) => q.id === selectedQuestionId)
      : false;
    if (!selectedQuestionId || !stillExists) {
      setSelectedQuestionId(quizQuestions[0].id);
    }
  }, [quizOpen, quizQuestions, selectedQuestionId]);

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
    let mounted = true;
    setLoadingLecturer(true);
    getMe()
      .then((res) => {
        if (!mounted) return;
        setLecturerName(res.user.name ?? '');
        setLecturerEmail(res.user.email ?? '');
      })
      .catch(() => {
        if (!mounted) return;
        setLecturerName('');
        setLecturerEmail('');
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingLecturer(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    setLoadingStudentCount(true);

    getCourseEnrolledStudentCount(courseId)
      .then((count) => {
        if (!mounted) return;
        setStudentCount(count);
      })
      .catch(() => {
        if (!mounted) return;
        setStudentCount(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingStudentCount(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    getCourseLearningUnitSummaries(courseId)
      .then((summaries) => {
        if (!mounted) return;
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
      const docs = await loadMaterials(materialUnitId);
      if (docs) {
        setUnitSummaryByUnitId((prev) => {
          const current = prev[materialUnitId];
          return {
            ...prev,
            [materialUnitId]: {
              materialCount: docs.length,
              assignmentCount: current?.assignmentCount ?? 0,
              quizCount: current?.quizCount ?? 0,
            },
          };
        });
      }
      setMaterialUnitId(null);
    } catch (err) {
      setMaterialError(err instanceof Error ? err.message : 'Failed to upload material');
    } finally {
      setMaterialUploading(false);
    }
  }

  function formatDatetimeLocal(isoValue: string | null | undefined) {
    if (!isoValue) return '';
    try {
      const date = new Date(isoValue);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours(),
      )}:${pad(date.getMinutes())}`;
    } catch {
      return '';
    }
  }

  async function handleCreateAssignment() {
    if (!assignmentUnitId) return;
    if (!assignmentTitle.trim()) return;
    setAssignmentSaving(true);
    setAssignmentMessage(null);
    setAssignmentsErrorByUnitId((prev) => ({ ...prev, [assignmentUnitId]: null }));

    const dueDate =
      assignmentDueDate.trim() ? new Date(assignmentDueDate).toISOString() : undefined;

    try {
      const created = await createLearningUnitAssignment(assignmentUnitId, {
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim(),
        ...(dueDate ? { due_date: dueDate } : {}),
      });

      setAssignmentsByUnitId((prev) => ({
        ...prev,
        [assignmentUnitId]: [created, ...(prev[assignmentUnitId] ?? [])],
      }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[assignmentUnitId];
        return {
          ...prev,
          [assignmentUnitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: (current?.assignmentCount ?? 0) + 1,
            quizCount: current?.quizCount ?? 0,
          },
        };
      });
      setAssignmentMessage('Assignment created successfully.');
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      setAssignmentOpen(false);
      setAssignmentUnitId(null);
    } catch (err) {
      setAssignmentsErrorByUnitId((prev) => ({
        ...prev,
        [assignmentUnitId]:
          err instanceof Error ? err.message : 'Failed to create assignment',
      }));
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleSaveAssignment() {
    if (!assignmentUnitId || !editingAssignmentId) return;
    if (!assignmentTitle.trim()) return;
    setAssignmentSaving(true);
    setAssignmentMessage(null);
    setAssignmentsErrorByUnitId((prev) => ({ ...prev, [assignmentUnitId]: null }));

    const dueDateValue = assignmentDueDate.trim()
      ? new Date(assignmentDueDate).toISOString()
      : '';

    try {
      const updated = await updateLearningUnitAssignment(assignmentUnitId, editingAssignmentId, {
        title: assignmentTitle.trim(),
        description: assignmentDescription,
        due_date: dueDateValue,
      });

      setAssignmentsByUnitId((prev) => {
        const next = (prev[assignmentUnitId] ?? []).map((a) =>
          a.id === updated.id ? updated : a,
        );
        return { ...prev, [assignmentUnitId]: next };
      });

      setAssignmentMessage('Assignment updated successfully.');
      setAssignmentOpen(false);
      setAssignmentUnitId(null);
      setEditingAssignmentId(null);
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
    } catch (err) {
      setAssignmentsErrorByUnitId((prev) => ({
        ...prev,
        [assignmentUnitId]:
          err instanceof Error ? err.message : 'Failed to update assignment',
      }));
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleDeleteAssignment(params: { unitId: string; assignmentId: string }) {
    const ok = window.confirm('Delete this assignment?');
    if (!ok) return;
    setAssignmentsErrorByUnitId((prev) => ({ ...prev, [params.unitId]: null }));
    try {
      await deleteLearningUnitAssignment(params.unitId, params.assignmentId);
      setAssignmentsByUnitId((prev) => {
        const next = (prev[params.unitId] ?? []).filter((a) => a.id !== params.assignmentId);
        return { ...prev, [params.unitId]: next };
      });
      setUnitSummaryByUnitId((prev) => {
        const current = prev[params.unitId];
        if (!current) return prev;
        return {
          ...prev,
          [params.unitId]: {
            ...current,
            assignmentCount: Math.max(0, current.assignmentCount - 1),
          },
        };
      });
    } catch (err) {
      setAssignmentsErrorByUnitId((prev) => ({
        ...prev,
        [params.unitId]:
          err instanceof Error ? err.message : 'Failed to delete assignment',
      }));
    }
  }

  function makeClientId() {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
      }
    } catch {}
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function makeBlankQuestion(): QuizQuestion {
    return {
      id: makeClientId(),
      question: '',
      options: ['', '', '', ''],
      answer: '',
      points: 1,
    };
  }

  function updateQuestion(questionId: string, patch: Partial<QuizQuestion>) {
    setQuizQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...patch } : q)));
  }

  function updateQuestionOption(questionId: string, optionIndex: number, value: string) {
    setQuizQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const nextOptions = [...(q.options ?? [])];
        nextOptions[optionIndex] = value;
        const normalizedAnswer = (q.answer ?? '').trim();
        const normalizedOptions = nextOptions.map((o) => o.trim()).filter((o) => !!o);
        const answer = normalizedOptions.includes(normalizedAnswer) ? normalizedAnswer : '';
        return { ...q, options: nextOptions, answer };
      }),
    );
  }

  function addOption(questionId: string) {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, options: [...q.options, ''] } : q)),
    );
  }

  function removeOption(questionId: string, optionIndex: number) {
    setQuizQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.options.length <= 2) return q;
        const nextOptions = q.options.filter((_, idx) => idx !== optionIndex);
        const normalizedAnswer = (q.answer ?? '').trim();
        const normalizedOptions = nextOptions.map((o) => o.trim()).filter((o) => !!o);
        const answer = normalizedOptions.includes(normalizedAnswer) ? normalizedAnswer : '';
        return { ...q, options: nextOptions, answer };
      }),
    );
  }

  function removeQuestion(questionId: string) {
    setQuizQuestions((prev) => {
      const next = prev.filter((q) => q.id !== questionId);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  async function handleCreateQuiz() {
    if (!quizUnitId) return;
    if (!quizTitle.trim()) return;

    const normalizedQuestions: QuizQuestion[] = quizQuestions.map((q) => {
      const options = (q.options ?? [])
        .map((o) => o.trim())
        .filter((o) => !!o);
      const points = Number.isFinite(Number(q.points)) ? Math.max(1, Math.floor(Number(q.points))) : 1;
      const question = q.question?.trim() ?? '';
      const id = q.id?.trim() ? q.id.trim() : makeClientId();
      const answer = q.answer?.trim() ?? '';
      return { id, question, options, answer, points };
    });

    if (normalizedQuestions.length === 0) {
      setQuizModalError('Add at least one question.');
      return;
    }

    for (const q of normalizedQuestions) {
      if (!q.question) {
        setQuizModalError('Each question must have text.');
        return;
      }
      if (q.options.length < 2) {
        setQuizModalError('Each question must have at least two options.');
        return;
      }
      if (!q.answer || !q.options.includes(q.answer)) {
        setQuizModalError('Each question must have a valid correct answer.');
        return;
      }
    }

    const timeLimit =
      Number.isFinite(Number(quizTimeLimit)) ? Math.max(1, Math.floor(Number(quizTimeLimit))) : 10;

    const payload: QuizData = {
      questions: normalizedQuestions,
      time_limit: timeLimit,
    };

    setQuizSaving(true);
    setQuizModalError(null);
    setQuizMessage(null);
    setQuizzesErrorByUnitId((prev) => ({ ...prev, [quizUnitId]: null }));
    try {
      const created = await createLearningUnitQuiz(quizUnitId, {
        title: quizTitle.trim(),
        quiz_data: payload,
      });

      setQuizzesByUnitId((prev) => ({
        ...prev,
        [quizUnitId]: [created, ...(prev[quizUnitId] ?? [])],
      }));
      setUnitSummaryByUnitId((prev) => {
        const current = prev[quizUnitId];
        return {
          ...prev,
          [quizUnitId]: {
            materialCount: current?.materialCount ?? 0,
            assignmentCount: current?.assignmentCount ?? 0,
            quizCount: (current?.quizCount ?? 0) + 1,
          },
        };
      });

      setQuizMessage('Quiz created successfully.');
      setQuizTitle('');
      setQuizTimeLimit(10);
      setQuizQuestions([]);
      setSelectedQuestionId(null);
      setQuizOpen(false);
      setQuizUnitId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create quiz';
      setQuizModalError(msg);
      setQuizzesErrorByUnitId((prev) => ({ ...prev, [quizUnitId]: msg }));
    } finally {
      setQuizSaving(false);
    }
  }

  async function handleSaveQuiz() {
    if (!quizUnitId || !editingQuizId) return;
    if (!quizTitle.trim()) return;

    const normalizedQuestions: QuizQuestion[] = quizQuestions.map((q) => {
      const options = (q.options ?? [])
        .map((o) => o.trim())
        .filter((o) => !!o);
      const points = Number.isFinite(Number(q.points)) ? Math.max(1, Math.floor(Number(q.points))) : 1;
      const question = q.question?.trim() ?? '';
      const id = q.id?.trim() ? q.id.trim() : makeClientId();
      const answer = q.answer?.trim() ?? '';
      return { id, question, options, answer, points };
    });

    if (normalizedQuestions.length === 0) {
      setQuizModalError('Add at least one question.');
      return;
    }

    for (const q of normalizedQuestions) {
      if (!q.question) {
        setQuizModalError('Each question must have text.');
        return;
      }
      if (q.options.length < 2) {
        setQuizModalError('Each question must have at least two options.');
        return;
      }
      if (!q.answer || !q.options.includes(q.answer)) {
        setQuizModalError('Each question must have a valid correct answer.');
        return;
      }
    }

    const timeLimit =
      Number.isFinite(Number(quizTimeLimit)) ? Math.max(1, Math.floor(Number(quizTimeLimit))) : 10;

    const payload: QuizData = {
      questions: normalizedQuestions,
      time_limit: timeLimit,
    };

    setQuizSaving(true);
    setQuizModalError(null);
    setQuizMessage(null);
    setQuizzesErrorByUnitId((prev) => ({ ...prev, [quizUnitId]: null }));
    try {
      const updated = await updateLearningUnitQuiz(quizUnitId, editingQuizId, {
        title: quizTitle.trim(),
        quiz_data: payload,
      });

      setQuizzesByUnitId((prev) => {
        const next = (prev[quizUnitId] ?? []).map((q) => (q.id === updated.id ? updated : q));
        return { ...prev, [quizUnitId]: next };
      });

      setQuizMessage('Quiz updated successfully.');
      setQuizTitle('');
      setQuizTimeLimit(10);
      setQuizQuestions([]);
      setSelectedQuestionId(null);
      setQuizOpen(false);
      setQuizUnitId(null);
      setEditingQuizId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update quiz';
      setQuizModalError(msg);
      setQuizzesErrorByUnitId((prev) => ({ ...prev, [quizUnitId]: msg }));
    } finally {
      setQuizSaving(false);
    }
  }

  async function handleDeleteQuiz(params: { unitId: string; quizId: string }) {
    const ok = window.confirm('Delete this quiz?');
    if (!ok) return;
    setQuizzesErrorByUnitId((prev) => ({ ...prev, [params.unitId]: null }));
    try {
      await deleteLearningUnitQuiz(params.unitId, params.quizId);
      setQuizzesByUnitId((prev) => {
        const next = (prev[params.unitId] ?? []).filter((q) => q.id !== params.quizId);
        return { ...prev, [params.unitId]: next };
      });
      setUnitSummaryByUnitId((prev) => {
        const current = prev[params.unitId];
        if (!current) return prev;
        return {
          ...prev,
          [params.unitId]: {
            ...current,
            quizCount: Math.max(0, current.quizCount - 1),
          },
        };
      });
    } catch (err) {
      setQuizzesErrorByUnitId((prev) => ({
        ...prev,
        [params.unitId]: err instanceof Error ? err.message : 'Failed to delete quiz',
      }));
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
                <div>
                  Students:{' '}
                  {loadingStudentCount
                    ? 'Loading...'
                    : studentCount != null
                      ? studentCount
                      : '—'}
                </div>
              </div>
              <div className="space-y-1">
                <div>
                  Lecturer:{' '}
                  {loadingLecturer ? 'Loading...' : lecturerName || '—'}
                </div>
                <div>
                  Lecturer email:{' '}
                  {loadingLecturer ? 'Loading...' : lecturerEmail || '—'}
                </div>
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
                  <Input
                    value={unitQuery}
                    onChange={(e) => setUnitQuery(e.target.value)}
                    placeholder="Search units..."
                    className="pl-9"
                  />
                </div>
                {isEditMode && (
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
                )}
              </div>
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

        {materialViewerOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                closeMaterialViewer();
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title={materialViewerName || 'Material'}
                className="w-full max-w-5xl"
                bodyClassName="p-0"
                headerRight={
                  <Button variant="outline" onClick={closeMaterialViewer}>
                    <X className="h-4 w-4" />
                  </Button>
                }
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

        {isEditMode && assignmentOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (assignmentSaving) return;
                setAssignmentOpen(false);
                setAssignmentUnitId(null);
                setEditingAssignmentId(null);
                setAssignmentTitle('');
                setAssignmentDescription('');
                setAssignmentDueDate('');
                setAssignmentMessage(null);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title={editingAssignmentId ? 'Edit Assignment' : 'Add Assignment'}
                className="w-full max-w-xl"
                bodyClassName="space-y-4"
              >
                {assignmentMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {assignmentMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Title
                  </div>
                  <Input
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    disabled={assignmentSaving}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                    value={assignmentDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setAssignmentDescription(e.target.value)
                    }
                    disabled={assignmentSaving}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Due Date (optional)
                  </div>
                  <Input
                    type="datetime-local"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    disabled={assignmentSaving}
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (assignmentSaving) return;
                      setAssignmentOpen(false);
                      setAssignmentUnitId(null);
                      setEditingAssignmentId(null);
                      setAssignmentTitle('');
                      setAssignmentDescription('');
                      setAssignmentDueDate('');
                      setAssignmentMessage(null);
                    }}
                    disabled={assignmentSaving}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={editingAssignmentId ? handleSaveAssignment : handleCreateAssignment}
                    disabled={assignmentSaving || !assignmentTitle.trim()}
                  >
                    {assignmentSaving
                      ? editingAssignmentId
                        ? 'Saving...'
                        : 'Creating...'
                      : editingAssignmentId
                        ? 'Save'
                        : 'Create'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {isEditMode && quizOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (quizSaving) return;
                setQuizOpen(false);
                setQuizUnitId(null);
                setEditingQuizId(null);
                setQuizTitle('');
                setQuizTimeLimit(10);
                setQuizQuestions([]);
                setSelectedQuestionId(null);
                setQuizMessage(null);
                setQuizModalError(null);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card
                title={editingQuizId ? 'Edit Quiz' : 'Add Quiz'}
                className="w-full max-w-3xl"
                bodyClassName="space-y-4"
              >
                {quizMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {quizMessage}
                  </div>
                )}

                {quizModalError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {quizModalError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Title
                    </div>
                    <Input
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      disabled={quizSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Time Limit (minutes)
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={quizTimeLimit}
                      onChange={(e) => setQuizTimeLimit(Number(e.target.value) || 1)}
                      disabled={quizSaving}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-900">
                      Questions
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuizModalError(null);
                        const next = makeBlankQuestion();
                        setQuizQuestions((prev) => [...prev, next]);
                        setSelectedQuestionId(next.id);
                      }}
                      disabled={quizSaving}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>

                  {quizQuestions.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
                      No questions added yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
                      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Question List
                        </div>
                        <div className="max-h-[22rem] overflow-y-auto divide-y divide-zinc-100">
                          {quizQuestions.map((q, idx) => {
                            const isActive = q.id === selectedQuestionId;
                            const title = q.question.trim() ? q.question.trim() : 'Untitled question';
                            return (
                              <button
                                key={q.id}
                                type="button"
                                className={`w-full px-4 py-3 text-left hover:bg-zinc-50 ${isActive ? 'bg-zinc-50' : 'bg-white'}`}
                                onClick={() => setSelectedQuestionId(q.id)}
                                disabled={quizSaving}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-zinc-900">
                                      {`Q${idx + 1}: ${title}`}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                      {q.points ?? 1} pts • {(q.options?.filter((o) => o.trim()).length ?? 0)} options
                                    </div>
                                  </div>
                                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isActive ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
                        {(() => {
                          const q = quizQuestions.find((x) => x.id === selectedQuestionId) ?? null;
                          if (!q) {
                            return (
                              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600">
                                Select a question to edit.
                              </div>
                            );
                          }

                          const nonEmptyOptions = q.options.map((o) => o.trim()).filter((o) => !!o);
                          const uniqueOptions = Array.from(new Set(nonEmptyOptions));

                          return (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm font-semibold text-zinc-900">
                                  Edit Question
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => removeQuestion(q.id)}
                                  disabled={quizSaving || quizQuestions.length <= 1}
                                >
                                  Delete
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                  Question
                                </div>
                                <textarea
                                  className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                                  value={q.question}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    updateQuestion(q.id, { question: e.target.value })
                                  }
                                  disabled={quizSaving}
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Points
                                  </div>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={q.points}
                                    onChange={(e) =>
                                      updateQuestion(q.id, { points: Number(e.target.value) || 1 })
                                    }
                                    disabled={quizSaving}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Correct Answer
                                  </div>
                                  <select
                                    key={`${q.id}:${uniqueOptions.join('|')}`}
                                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 focus-visible:ring-2"
                                    value={q.answer}
                                    onChange={(e) => updateQuestion(q.id, { answer: e.target.value })}
                                    disabled={quizSaving || uniqueOptions.length === 0}
                                  >
                                    <option value="">
                                      {uniqueOptions.length === 0 ? 'Add options first' : 'Select answer'}
                                    </option>
                                    {uniqueOptions.map((opt, optIndex) => (
                                      <option key={`${opt}-${optIndex}`} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Options
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() => addOption(q.id)}
                                    disabled={quizSaving}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Option
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {q.options.map((opt, optionIndex) => (
                                    <div key={`${q.id}-${optionIndex}`} className="flex items-center gap-2">
                                      <Input
                                        value={opt}
                                        onChange={(e) =>
                                          updateQuestionOption(q.id, optionIndex, e.target.value)
                                        }
                                        disabled={quizSaving}
                                        placeholder={`Option ${optionIndex + 1}`}
                                      />
                                      <Button
                                        variant="outline"
                                        onClick={() => removeOption(q.id, optionIndex)}
                                        disabled={quizSaving || q.options.length <= 2}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (quizSaving) return;
                      setQuizOpen(false);
                      setQuizUnitId(null);
                      setEditingQuizId(null);
                      setQuizTitle('');
                      setQuizTimeLimit(10);
                      setQuizQuestions([]);
                      setSelectedQuestionId(null);
                      setQuizMessage(null);
                      setQuizModalError(null);
                    }}
                    disabled={quizSaving}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={editingQuizId ? handleSaveQuiz : handleCreateQuiz}
                    disabled={quizSaving || !quizTitle.trim()}
                  >
                    {quizSaving
                      ? editingQuizId
                        ? 'Saving...'
                        : 'Creating...'
                      : editingQuizId
                        ? 'Save'
                        : 'Create'}
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
            const summary = unitSummaryByUnitId[unit.id];
            const materialsCount = summary?.materialCount ?? materialsByUnitId[unit.id]?.length ?? 0;
            const assignmentsCount =
              summary?.assignmentCount ?? assignmentsByUnitId[unit.id]?.length ?? 0;
            const quizzesCount = summary?.quizCount ?? quizzesByUnitId[unit.id]?.length ?? 0;
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
                                      setMaterialViewerOpen(true);
                                      setMaterialViewerLoading(true);
                                      setMaterialViewerError(null);
                                      setMaterialViewerName(doc.file_name || 'Material');
                                      setMaterialViewerUrl((prev) => {
                                        if (prev) URL.revokeObjectURL(prev);
                                        return null;
                                      });
                                      downloadDocumentPDF(doc.id)
                                        .then((blob) => {
                                          const blobUrl = URL.createObjectURL(blob);
                                          setMaterialViewerUrl(blobUrl);
                                        })
                                        .catch((err: unknown) => {
                                          const message =
                                            err instanceof Error ? err.message : 'Failed to open document';
                                          setMaterialsErrorByUnitId((prev) => ({
                                            ...prev,
                                            [unit.id]: message,
                                          }));
                                          setMaterialViewerError(message);
                                        })
                                        .finally(() => setMaterialViewerLoading(false));
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
                                            setMaterialsByUnitId((prev) => {
                                              const nextDocs = (prev[unit.id] ?? []).filter((d) => d.id !== doc.id);
                                              setUnitSummaryByUnitId((summaryPrev) => {
                                                const current = summaryPrev[unit.id];
                                                if (!current) {
                                                  return summaryPrev;
                                                }
                                                return {
                                                  ...summaryPrev,
                                                  [unit.id]: {
                                                    ...current,
                                                    materialCount: Math.max(0, current.materialCount - 1),
                                                  },
                                                };
                                              });
                                              return {
                                                ...prev,
                                                [unit.id]: nextDocs,
                                              };
                                            });
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
                                onClick={() => {
                                  setAssignmentsErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                  setAssignmentMessage(null);
                                  setAssignmentTitle('');
                                  setAssignmentDescription('');
                                  setAssignmentDueDate('');
                                  setAssignmentUnitId(unit.id);
                                  setEditingAssignmentId(null);
                                  setAssignmentOpen(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Assignment
                              </Button>
                            )}
                          </div>

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
                                <div
                                  key={a.id}
                                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
                                >
                                  <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => {
                                      if (!courseId) return;
                                      const next = new URLSearchParams();
                                      next.set('unitId', unit.id);
                                      next.set('mode', mode);
                                      router.push(
                                        `/courses/${courseId}/assignments/${a.id}?${next.toString()}`,
                                      );
                                    }}
                                  >
                                    <div className="truncate text-sm font-medium text-zinc-900">
                                      {a.title}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                      {a.due_date
                                        ? `Due ${new Date(a.due_date).toLocaleString()}`
                                        : 'No due date'}
                                    </div>
                                    {a.description && (
                                      <div className="mt-2 text-sm text-zinc-600 whitespace-pre-wrap">
                                        {a.description}
                                      </div>
                                    )}
                                  </button>

                                  {isEditMode && (
                                    <div className="flex shrink-0 items-center gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setAssignmentsErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                          setAssignmentMessage(null);
                                          setAssignmentTitle(a.title ?? '');
                                          setAssignmentDescription(a.description ?? '');
                                          setAssignmentDueDate(formatDatetimeLocal(a.due_date));
                                          setAssignmentUnitId(unit.id);
                                          setEditingAssignmentId(a.id);
                                          setAssignmentOpen(true);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleDeleteAssignment({ unitId: unit.id, assignmentId: a.id })}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
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
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-900">
                              Quizzes
                            </div>
                            {isEditMode && (
                              <Button
                                variant="outline"
                                className="border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                                onClick={() => {
                                  setQuizzesErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                  setQuizTitle('');
                                  setQuizTimeLimit(10);
                                  const first = makeBlankQuestion();
                                  setQuizQuestions([first]);
                                  setSelectedQuestionId(first.id);
                                  setQuizMessage(null);
                                  setQuizModalError(null);
                                  setQuizUnitId(unit.id);
                                  setEditingQuizId(null);
                                  setQuizOpen(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Quiz
                              </Button>
                            )}
                          </div>

                          {quizzesErrorByUnitId[unit.id] && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {quizzesErrorByUnitId[unit.id]}
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
                                <div
                                  key={q.id}
                                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
                                >
                                  <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => {
                                      if (!courseId) return;
                                      const next = new URLSearchParams();
                                      next.set('unitId', unit.id);
                                      next.set('mode', mode);
                                      router.push(
                                        `/courses/${courseId}/quizzes/${q.id}?${next.toString()}`,
                                      );
                                    }}
                                  >
                                    <div className="truncate text-sm font-medium text-zinc-900">
                                      {q.title}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                      {(q.quiz_data?.questions?.length ?? 0)} questions •{' '}
                                      {q.quiz_data?.time_limit ?? '—'} min • Created{' '}
                                      {q.created_at ? new Date(q.created_at).toLocaleString() : '—'}
                                    </div>
                                  </button>

                                  {isEditMode && (
                                    <div className="flex shrink-0 items-center gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setQuizzesErrorByUnitId((prev) => ({ ...prev, [unit.id]: null }));
                                          setQuizTitle(q.title ?? '');
                                          setQuizTimeLimit(q.quiz_data?.time_limit ?? 10);
                                          const questions = (q.quiz_data?.questions ?? []).map((x) => ({
                                            ...x,
                                            id: x.id?.trim() ? x.id : makeClientId(),
                                            options: Array.isArray(x.options) ? x.options : [],
                                            points: x.points ?? 1,
                                          }));
                                          const initialQuestions = questions.length > 0 ? questions : [makeBlankQuestion()];
                                          setQuizQuestions(initialQuestions);
                                          setSelectedQuestionId(initialQuestions[0]?.id ?? null);
                                          setQuizMessage(null);
                                          setQuizModalError(null);
                                          setQuizUnitId(unit.id);
                                          setEditingQuizId(q.id);
                                          setQuizOpen(true);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => handleDeleteQuiz({ unitId: unit.id, quizId: q.id })}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
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
    </LecturerShell>
  );
}
