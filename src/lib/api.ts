export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

const ACCESS_TOKEN_KEY = "tps_access_token";
const REFRESH_TOKEN_KEY = "tps_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: { access_token: string; refresh_token: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

let refreshPromise: Promise<void> | null = null;

async function refreshTokensIfNeeded() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error("Refresh failed");
    }
    const data = await res.json();
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return {
    status: res.status,
    message: body?.detail || body?.message || res.statusText || "Request failed",
    details: body,
  };
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  auth?: boolean;
  headers?: Record<string, string>;
  retryOn401?: boolean;
};

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOn401 = true, headers = {}, ...rest } = opts;

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: reqHeaders });

  if (res.status === 401 && retryOn401 && auth) {
    await refreshTokensIfNeeded();
    const token = getAccessToken();
    const res2 = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: { ...reqHeaders, Authorization: token ? `Bearer ${token}` : "" },
    });
    if (!res2.ok) throw await parseError(res2);
    return (await res2.json()) as T;
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...(opts || {}), method: "GET" });
export const apiPost = <T>(path: string, body?: unknown, opts?: RequestOptions) =>
  api<T>(path, { ...(opts || {}), method: "POST", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPut = <T>(path: string, body?: unknown, opts?: RequestOptions) =>
  api<T>(path, { ...(opts || {}), method: "PUT", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string, opts?: RequestOptions) => api<T>(path, { ...(opts || {}), method: "DELETE" });

