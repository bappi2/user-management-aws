import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from './config';

/** Evently: UserResponse */
export type Profile = { id: string; email: string; firstName: string; lastName: string };
/** Same values as the Java Tier enum. Unknown future values are still strings → treated as no access. */
export type Tier = 'FREE' | 'PRO';

/** GET /v1/users/me */
export type Me = Profile & { tier: Tier; tutorialVersion: number };


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

  /** 403 Tier.Required from Java: valid user, tier too low → upgrade prompt, NOT sign-in */
  get isTierError(): boolean {
    return this.status === 403 && this.problem?.title === 'Tier.Required';
  }

  /** 401 (missing token) or 403 (token rejected) from the Cognito authorizer → sign in again */
  get isAuthError(): boolean {
    return (this.status === 401 || this.status === 403) && !this.isTierError;
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

export async function getMe(): Promise<Me> {
  const response = await apiFetch('v1/users/me');
  return (await response.json()) as Me;
}

export async function getProDemo(): Promise<{ message: string }> {
  const response = await apiFetch('v1/demo/pro');
  return (await response.json()) as { message: string };
}

export async function updateTutorialProgress(version: number): Promise<void> {
  await apiFetch('v1/users/me/tutorial', { method: 'PUT', body: { version } });   // 204, only ever raises it
}
