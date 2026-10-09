import { API_URL } from '@/lib/config';

/** Field networks drop and stall; give up rather than spin forever. */
const TIMEOUT_MS = 20_000;

/**
 * An API call that didn't succeed. `status` is the HTTP status, or 0 when the
 * server was never reached (offline, timeout, wrong address).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The parsed error body, for routes that return more than `error`. */
    readonly data: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The token is missing, expired, or the account was deactivated. */
  get isUnauthorized() {
    return this.status === 401;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** The session token. The web portal reads it from its `session` cookie,
   * so it is sent as that cookie rather than an Authorization header. */
  token?: string | null;
  /** Override the default timeout — e.g. an upload on a slow network. */
  timeoutMs?: number;
};

/** Calls the web portal's `/api/mobile/*` routes and returns the parsed JSON. */
export async function api<T>(
  path: string,
  { method = 'GET', body, token, timeoutMs = TIMEOUT_MS }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Cookie = `session=${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.';
    throw new ApiError(res.status, message, data && typeof data === 'object' ? data : null);
  }
  return data as T;
}
