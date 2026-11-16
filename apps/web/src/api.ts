import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from './config';

/** Evently: UserResponse */
export type Profile = { id: string; email: string; firstName: string; lastName: string };

/** Same shapes as the Java ProblemDetails / FieldError records */
export type FieldError = { code: string; description: string };
export type ProblemDetails = { type: string; title: string; status: number; detail?: string; errors?: FieldError[] };

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.detail ?? problem?.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }

  /** 401 (missing token) or 403 (token rejected) from the Cognito authorizer → sign in again */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

type Options = { method?: 'GET' | 'PUT'; body?: unknown };

async function apiFetch(path: string, { method = 'GET', body }: Options = {}): Promise<Response> {
  const session = await fetchAuthSession();          // refreshes an expired ID token automatically
  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) {
    throw new ApiError(401, null);
  }

  const headers: Record<string, string> = { Authorization: idToken };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(new URL(path, config.apiUrl), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(response.status, problem);
  }
  return response;
}

export async function getProfile(): Promise<Profile> {
  const response = await apiFetch('v1/users/profile');
  return (await response.json()) as Profile;
}

export async function updateProfile(update: { firstName: string; lastName: string }): Promise<void> {
  await apiFetch('v1/users/profile', { method: 'PUT', body: update });   // 204 No Content
}
