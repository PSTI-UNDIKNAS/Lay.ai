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
