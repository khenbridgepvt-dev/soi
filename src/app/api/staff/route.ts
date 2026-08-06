import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { createStaffMember } from '@/lib/staff/create-staff';
import { fetchStaffList } from '@/lib/staff/fetch-staff-list';
import {
  validateStaffEmail,
  validateStaffFullName,
  validateStaffPassword,
  validateStaffRole,
} from '@/lib/staff/validation';
import { createServiceClient } from '@/lib/supabase/service';

/** EP-19 · GET /api/staff */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const url = new URL(request.url);
  const isActiveParam = url.searchParams.get('is_active');
  const roleParam = url.searchParams.get('role');

  const filters: {
    is_active?: boolean;
    role?: 'admin' | 'staff' | 'senior';
  } = {};

  if (isActiveParam === 'all') {
    // no is_active filter — settings table shows active + inactive
  } else if (isActiveParam === 'true') {
    filters.is_active = true;
  } else if (isActiveParam === 'false') {
    filters.is_active = false;
  } else if (isActiveParam === null) {
    filters.is_active = true;
  }

  if (roleParam === 'admin' || roleParam === 'staff' || roleParam === 'senior') {
    filters.role = roleParam;
  }

  try {
    const service = createServiceClient();
    const data = await fetchStaffList(auth.supabase, service, filters);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load staff members.');
  }
}

/** EP-18 · POST /api/staff */
export async function POST(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as {
    full_name?: string;
    email?: string;
    role?: string;
    password?: string;
    timetable?: Record<string, string | null>;
  };

  const nameResult = validateStaffFullName(body.full_name);
  if (!nameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
      { field: 'full_name', message: nameResult.message },
    ]);
  }

  const emailResult = validateStaffEmail(body.email);
  if (!emailResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', emailResult.message, [
      { field: 'email', message: emailResult.message },
    ]);
  }

  const roleResult = validateStaffRole(body.role);
  if (!roleResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', roleResult.message, [
      { field: 'role', message: roleResult.message },
    ]);
  }

  const passwordResult = validateStaffPassword(body.password);
  if (!passwordResult.ok) {
    return apiError(400, passwordResult.code ?? 'VALIDATION_ERROR', passwordResult.message, [
      { field: 'password', message: passwordResult.message },
    ]);
  }

  const service = createServiceClient();

  try {
    const data = await createStaffMember(service, {
      full_name: nameResult.value,
      email: emailResult.value,
      role: roleResult.value,
      password: passwordResult.value,
      timetable: body.timetable,
    });

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('already registered') || message.includes('already exists')) {
      return apiError(409, 'CONFLICT', 'Email already exists.');
    }

    return apiError(500, 'INTERNAL_ERROR', 'Failed to create staff member.');
  }
}
