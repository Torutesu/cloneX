/**
 * Thin fetch wrapper for client components. Every API route responds with
 * `{ error: { code, message } }` on failure (src/lib/api/errors.ts) — this
 * normalizes that into a thrown ApiClientError so callers can show
 * `error.message` directly (already Japanese, user-facing).
 */
export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<{ message: string; code: string }> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return {
      message: body?.error?.message ?? "エラーが発生しました",
      code: body?.error?.code ?? "UNKNOWN",
    };
  } catch {
    return { message: "エラーが発生しました", code: "UNKNOWN" };
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const { message, code } = await parseErrorMessage(res);
    throw new ApiClientError(message, code, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}
