import Constants from 'expo-constants';

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'http://localhost:4100';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarInitial: string;
  isPremium: boolean;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  lessonsCompleted?: number;
  totalXp?: number;
};

export type LessonSummary = {
  id: string;
  dayIndex: number;
  title: string;
  category: string;
  readTime: string;
  thumbnail: string | null;
  isToday?: boolean;
  completed: boolean;
  locked?: boolean;
};

export type LessonFull = LessonSummary & {
  content: string;
  quizQuestion: string;
  answer: string;
  xp: number;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(json?.error ?? `Request failed (${res.status})`, res.status, json?.code);
  }

  return json as T;
}

export const api = {
  signup: (email: string, password: string, name: string) =>
    request<{ token: string; user: ApiUser }>('/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  me: () => request<ApiUser>('/me'),

  updateProfile: (fields: { name?: string; username?: string }) =>
    request<ApiUser>('/me', { method: 'PATCH', body: fields }),

  today: () => request<{ dayNumber: number; lesson: LessonFull }>('/lessons/today'),

  archive: () => request<{ dayNumber: number; lessons: LessonSummary[] }>('/lessons'),

  lesson: (id: string) => request<LessonFull>(`/lessons/${id}`),

  completeLesson: (id: string) =>
    request<{ completed: boolean; totalXp: number; currentStreak: number; longestStreak: number }>(
      `/lessons/${id}/complete`,
      { method: 'POST' }
    ),

  billingStatus: () =>
    request<{ isPremium: boolean; expiresAt: string | null; productId: string | null }>(
      '/billing/status'
    ),

  billingSync: () =>
    request<{ isPremium: boolean; expiresAt: string | null; productId: string | null }>(
      '/billing/sync',
      { method: 'POST' }
    ),
};
