import type { AppRole } from '@/lib/auth/jwt';

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: ApiErrorBody['error']['details'],
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return Response.json(body, { status });
}

export function isApiRole(
  role: AppRole | null,
  allowed: AppRole | AppRole[] | 'any',
): boolean {
  if (!role) {
    return false;
  }
  if (allowed === 'any') {
    return true;
  }
  if (Array.isArray(allowed)) {
    return allowed.includes(role);
  }
  return role === allowed;
}
