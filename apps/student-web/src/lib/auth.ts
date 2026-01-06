export type StudentUser = {
  id: string;
  name: string;
  email: string;
  unique_identifier: string;
  role: string;
  status: string;
};

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getStoredUser(): StudentUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentUser;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

export function isActiveStudent(user: StudentUser | null | undefined) {
  return !!user && user.role === 'student' && user.status === 'active';
}

export async function fetchMe() {
  const token = getStoredToken();
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error || data?.message || 'Failed to validate session';
    throw new Error(msg);
  }
  return data as { user: StudentUser };
}

export async function requestLogout() {
  const token = getStoredToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {}
}

const API_BASE_URL = '/api';

export interface ApiError {
  error?: string;
  message?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LecturerCourse {
  id: string;
  creator_id?: string;
  title: string;
  description?: string;
  access_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LearningUnit {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  unit_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface LearningUnitSummary {
  unit_id: string;
  material_count: number;
  assignment_count: number;
  quiz_count: number;
}

export async function getMyCourses(limit = 100, offset = 0): Promise<LecturerCourse[]> {
  const courseParams = new URLSearchParams();
  if (limit != null) courseParams.set('limit', String(limit));
  if (offset != null) courseParams.set('offset', String(offset));

  const coursesRes = await fetch(
    `${API_BASE_URL}/courses${courseParams.toString() ? `?${courseParams.toString()}` : ''}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );
  const coursesData = (await coursesRes.json().catch(() => ({}))) as { courses?: LecturerCourse[] } & ApiError;
  if (!coursesRes.ok) {
    throw new Error(coursesData?.error || coursesData?.message || 'Failed to load courses');
  }
  const allCourses = Array.isArray(coursesData?.courses) ? coursesData.courses : [];

  const enrollRes = await fetch(`${API_BASE_URL}/enrollments/me`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const enrollData = (await enrollRes.json().catch(() => ({}))) as {
    enrollments?: Array<{ course_id?: string; status?: string }>;
  } & ApiError;
  if (!enrollRes.ok) {
    throw new Error(enrollData?.error || enrollData?.message || 'Failed to load enrollments');
  }
  const enrolledIds = new Set(
    (Array.isArray(enrollData?.enrollments) ? enrollData.enrollments : [])
      .filter((e) => e?.status === 'enrolled' && typeof e?.course_id === 'string')
      .map((e) => e.course_id as string),
  );

  return allCourses.filter((c) => enrolledIds.has(c.id));
}

export async function getCourseLearningUnits(
  courseId: string,
  limit = 100,
  offset = 0,
): Promise<LearningUnit[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));

  const response = await fetch(
    `${API_BASE_URL}/learning-units/courses/${courseId}/units${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    units?: LearningUnit[];
    learning_units?: LearningUnit[];
  } & ApiError;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch learning units');
  }

  if (Array.isArray(data.units)) return data.units as LearningUnit[];
  if (Array.isArray(data.learning_units)) return data.learning_units as LearningUnit[];
  return [];
}

export async function getCourseLearningUnitSummaries(courseId: string): Promise<LearningUnitSummary[]> {
  const response = await fetch(`${API_BASE_URL}/learning-units/courses/${courseId}/units/summary`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });

  const data = (await response.json().catch(() => ({}))) as { summaries?: LearningUnitSummary[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch learning unit summaries');
  }

  if (Array.isArray(data?.summaries)) return data.summaries as LearningUnitSummary[];
  return [];
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  knowledge_base_learning_unit_ids?: string[];
  knowledge_base_course_ids?: string[];
  created_at: string;
  updated_at: string;
}

export async function listAIConversations(): Promise<AIConversation[]> {
  const response = await fetch(`${API_BASE_URL}/ai/conversations`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as { conversations?: AIConversation[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch AI conversations');
  }
  return Array.isArray(data?.conversations) ? (data.conversations as AIConversation[]) : [];
}

export async function createAIConversation(title: string): Promise<AIConversation> {
  const response = await fetch(`${API_BASE_URL}/ai/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ title }),
  });
  const data = (await response.json().catch(() => ({}))) as { conversation?: AIConversation } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to create AI conversation');
  }
  if (data?.conversation) return data.conversation as AIConversation;
  throw new Error('Invalid AI conversation response');
}

export async function updateAIConversationTitle(conversationId: string, title: string): Promise<AIConversation> {
  return updateAIConversation(conversationId, { title });
}

export async function updateAIConversation(
  conversationId: string,
  updates: {
    title?: string;
    knowledge_base_learning_unit_ids?: string[];
    knowledge_base_course_ids?: string[];
  },
): Promise<AIConversation> {
  const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(updates),
  });
  const data = (await response.json().catch(() => ({}))) as { conversation?: AIConversation } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to update AI conversation');
  }
  if (data?.conversation) return data.conversation as AIConversation;
  throw new Error('Invalid AI conversation response');
}

export async function deleteAIConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to delete AI conversation');
  }
}

export interface AIAnswerSource {
  id: string;
  document_id: string;
  learning_unit_id?: string;
  content: string;
}

export interface AIAnswerResponse {
  answer: string;
  sources: AIAnswerSource[];
}

export async function answerAI(params: {
  query: string;
  lens?: string;
  top_k?: number;
  document_id?: string;
  learning_unit_ids?: string[];
}): Promise<AIAnswerResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<AIAnswerResponse> & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to get AI answer');
  }
  if (typeof data?.answer === 'string' && Array.isArray(data?.sources)) return data as AIAnswerResponse;
  if (typeof data?.answer === 'string') return { answer: data.answer, sources: [] };
  throw new Error('Invalid AI answer response');
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedFlashcardSetResponse {
  id: string;
  title: string;
  flashcards: GeneratedFlashcard[];
  source_unit_ids: string[];
}

export interface GeneratedFlashcardSetSummary {
  id: string;
  title: string;
  flashcards_count: number;
  created_at: string;
}

export async function generateFlashcards(
  courseId: string,
  params?: { learning_unit_ids?: string[]; quantity?: number; context?: string },
): Promise<GeneratedFlashcardSetResponse> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/flashcards/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      learning_unit_ids: params?.learning_unit_ids,
      quantity: params?.quantity,
      context: params?.context,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<GeneratedFlashcardSetResponse> & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to generate flashcards');
  }
  if (data && typeof data === 'object' && typeof data.id === 'string' && typeof data.title === 'string' && Array.isArray((data as any).flashcards)) {
    return data as GeneratedFlashcardSetResponse;
  }
  throw new Error('Invalid generate flashcards response');
}

export async function listGeneratedFlashcardSets(courseId: string): Promise<GeneratedFlashcardSetSummary[]> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/flashcards/generated`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as { flashcards?: GeneratedFlashcardSetSummary[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to list generated flashcards');
  }
  return Array.isArray(data?.flashcards) ? (data.flashcards as GeneratedFlashcardSetSummary[]) : [];
}

export async function getGeneratedFlashcardSet(courseId: string, setId: string): Promise<GeneratedFlashcardSetResponse> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/flashcards/generated/${setId}`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as Partial<GeneratedFlashcardSetResponse> & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch generated flashcards');
  }
  if (data && typeof data === 'object' && typeof data.id === 'string' && typeof data.title === 'string' && Array.isArray((data as any).flashcards)) {
    return data as GeneratedFlashcardSetResponse;
  }
  throw new Error('Invalid generated flashcards response');
}

export async function deleteGeneratedFlashcardSet(courseId: string, setId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/flashcards/generated/${setId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to delete generated flashcards');
  }
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  points: number;
}

export interface GeneratedQuizResponse {
  id: string;
  title: string;
  questions: GeneratedQuizQuestion[];
  source_unit_ids: string[];
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuizSummary {
  id: string;
  title: string;
  questions_count: number;
  created_at: string;
}

export async function generateQuiz(
  courseId: string,
  params?: { learning_unit_ids?: string[]; quantity?: number; context?: string; difficulty?: QuizDifficulty },
): Promise<GeneratedQuizResponse> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      learning_unit_ids: params?.learning_unit_ids,
      quantity: params?.quantity,
      context: params?.context,
      difficulty: params?.difficulty,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<GeneratedQuizResponse> & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to generate quiz');
  }
  if (data && typeof data === 'object' && typeof data.id === 'string' && typeof data.title === 'string' && Array.isArray((data as any).questions)) {
    return data as GeneratedQuizResponse;
  }
  throw new Error('Invalid generate quiz response');
}

export async function listGeneratedQuizzes(courseId: string): Promise<GeneratedQuizSummary[]> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/quizzes/generated`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as { quizzes?: GeneratedQuizSummary[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to list generated quizzes');
  }
  return Array.isArray(data?.quizzes) ? (data.quizzes as GeneratedQuizSummary[]) : [];
}

export async function getGeneratedQuiz(courseId: string, quizId: string): Promise<GeneratedQuizResponse> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/quizzes/generated/${quizId}`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as Partial<GeneratedQuizResponse> & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch generated quiz');
  }
  if (data && typeof data === 'object' && typeof data.id === 'string' && typeof data.title === 'string' && Array.isArray((data as any).questions)) {
    return data as GeneratedQuizResponse;
  }
  throw new Error('Invalid generated quiz response');
}

export async function deleteGeneratedQuiz(courseId: string, quizId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/quizzes/generated/${quizId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const data = (await response.json().catch(() => ({}))) as ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to delete generated quiz');
  }
}

export interface Assignment {
  id: string;
  learning_unit_id: string;
  title: string;
  description: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLearningUnitAssignments(unitId: string, limit = 200, offset = 0): Promise<Assignment[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));

  const response = await fetch(
    `${API_BASE_URL}/learning-units/${unitId}/assignments${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    },
  );

  const data = (await response.json().catch(() => ({}))) as { assignments?: Assignment[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch assignments');
  }

  return Array.isArray(data?.assignments) ? (data.assignments as Assignment[]) : [];
}

export async function getMySubmittedAssignmentIdsByUnit(unitId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/progress/units/${unitId}/assignments/submissions/me`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });

  const data = (await response.json().catch(() => ({}))) as { submitted_assignment_ids?: string[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch assignment submissions');
  }

  return Array.isArray(data?.submitted_assignment_ids) ? (data.submitted_assignment_ids as string[]) : [];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

export async function getMyQuizAttemptsByUnit(unitId: string): Promise<QuizAttempt[]> {
  const response = await fetch(`${API_BASE_URL}/progress/units/${unitId}/quizzes/submissions/me`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });

  const data = (await response.json().catch(() => ({}))) as { attempts?: QuizAttempt[] } & ApiError;
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch quiz submissions');
  }

  return Array.isArray(data?.attempts) ? (data.attempts as QuizAttempt[]) : [];
}

type DashboardStatsInput = {
  upcomingDays?: number;
  courseLimit?: number;
};

export type StudentDashboardStats = {
  enrolledCoursesCount: number;
  upcomingDeadlinesCount: number;
  achievementsCount: number;
  submittedAssignmentsCount: number;
  quizAttemptsCount: number;
  upcomingDays: number;
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function fetchStudentDashboardStats(input?: DashboardStatsInput): Promise<StudentDashboardStats> {
  const upcomingDays = input?.upcomingDays ?? 7;
  const courseLimit = input?.courseLimit ?? 200;

  const courses = await getMyCourses(courseLimit, 0);
  const enrolledCoursesCount = courses.length;

  if (enrolledCoursesCount === 0) {
    return {
      enrolledCoursesCount,
      upcomingDeadlinesCount: 0,
      achievementsCount: 0,
      submittedAssignmentsCount: 0,
      quizAttemptsCount: 0,
      upcomingDays,
    };
  }

  const unitsByCourse = await Promise.all(
    courses.map((course) => getCourseLearningUnits(course.id, 10_000, 0).catch(() => [])),
  );
  const unitIds = unitsByCourse
    .flat()
    .map((u) => u?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (unitIds.length === 0) {
    return {
      enrolledCoursesCount,
      upcomingDeadlinesCount: 0,
      achievementsCount: 0,
      submittedAssignmentsCount: 0,
      quizAttemptsCount: 0,
      upcomingDays,
    };
  }

  const now = Date.now();
  const end = now + upcomingDays * 24 * 60 * 60 * 1000;

  const unitStats = await mapLimit(unitIds, 6, async (unitId) => {
    const [assignments, submittedAssignmentIds, attempts] = await Promise.all([
      getLearningUnitAssignments(unitId, 200, 0).catch(() => []),
      getMySubmittedAssignmentIdsByUnit(unitId).catch(() => []),
      getMyQuizAttemptsByUnit(unitId).catch(() => []),
    ]);

    return {
      assignments,
      submittedAssignmentIds: new Set(submittedAssignmentIds.filter((id) => typeof id === 'string')),
      quizAttemptsCount: attempts.length,
    };
  });

  let upcomingDeadlinesCount = 0;
  let submittedAssignmentsCount = 0;
  let quizAttemptsCount = 0;

  for (const unit of unitStats) {
    submittedAssignmentsCount += unit.submittedAssignmentIds.size;
    quizAttemptsCount += unit.quizAttemptsCount;

    for (const a of unit.assignments) {
      if (!a || typeof a.id !== 'string') continue;
      if (unit.submittedAssignmentIds.has(a.id)) continue;
      if (typeof a.due_date !== 'string' || a.due_date.length === 0) continue;
      const dueMs = Date.parse(a.due_date);
      if (!Number.isFinite(dueMs)) continue;
      if (dueMs >= now && dueMs <= end) {
        upcomingDeadlinesCount += 1;
      }
    }
  }

  const achievementsCount = submittedAssignmentsCount + quizAttemptsCount;

  return {
    enrolledCoursesCount,
    upcomingDeadlinesCount,
    achievementsCount,
    submittedAssignmentsCount,
    quizAttemptsCount,
    upcomingDays,
  };
}
