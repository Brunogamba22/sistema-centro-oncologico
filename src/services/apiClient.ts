import { env } from '@/config/env';
import type { ApiErrorBody } from '@/types';
import { authStorage } from './authStorage';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* ------------------------------------------------------------------ */
/* Modo demostración                                                   */
/* ------------------------------------------------------------------ */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simula una respuesta asíncrona del servidor devolviendo una copia de los datos
 * (evita mutaciones accidentales de los mocks desde la UI).
 */
export async function mockResponse<T>(data: T, delay: number = env.mockDelay): Promise<T> {
  await wait(delay);
  return structuredClone(data);
}

/* ------------------------------------------------------------------ */
/* Cliente HTTP para la futura API REST                                */
/* ------------------------------------------------------------------ */

type QueryParams = Record<string, string | number | boolean | undefined>;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: QueryParams;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${env.apiUrl.replace(/\/$/, '')}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(path: string, { body, query, headers, ...init }: RequestOptions = {}): Promise<T> {
  const token = authStorage.getToken();

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      errorBody?.message ?? `Error ${response.status}`,
      response.status,
      errorBody?.code,
      errorBody?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, query?: QueryParams) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
