import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { banAuthUser, unbanAuthUser } from '@/lib/staff/auth-ban';
import {
  validateProfileRoleUpdate,
  validateStaffFullName,
} from '@/lib/staff/validation';
import { validateUsername } from '@/lib/staff/username';
import { isUsernameAvailable } from '@/lib/staff/check-username-available';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-20 · PATCH /api/staff/:id */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const body = (await request.json()) as {
    full_name?: string;
    username?: string;
    role?: string;
    is_active?: boolean;
  };

  const updates: {
    full_name?: string;
    username?: string;
    role?: 'admin' | 'staff' | 'senior';
    is_active?: boolean;
  } = {};

  if (body.full_name !== undefined) {
    const nameResult = validateStaffFullName(body.full_name);
    if (!nameResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
        { field: 'full_name', message: nameResult.message },
      ]);
    }
    updates.full_name = nameResult.value;
  }

  if (body.username !== undefined) {
    const usernameResult = validateUsername(body.username);
    if (!usernameResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', usernameResult.message, [
        { field: 'username', message: usernameResult.message },
      ]);
    }

    const available = await isUsernameAvailable(
      auth.supabase,
      usernameResult.value,
      id,
    );
    if (!available) {
      return apiError(409, 'CONFLICT', 'Username is already taken.', [
        { field: 'username', message: 'Username is already taken.' },
      ]);
    }

    updates.username = usernameResult.value;
  }

  if (body.role !== undefined) {
    const roleResult = validateProfileRoleUpdate(body.role);
    if (!roleResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', roleResult.message, [
        { field: 'role', message: roleResult.message },
      ]);
    }
    updates.role = roleResult.value;
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') {
      return apiError(400, 'VALIDATION_ERROR', 'is_active must be a boolean.', [
        { field: 'is_active', message: 'is_active must be a boolean.' },
      ]);
    }
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return apiError(400, 'VALIDATION_ERROR', 'No valid fields to update.');
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existing) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const service = createServiceClient();

  if (updates.is_active === false && existing.is_active) {
    try {
      await banAuthUser(service, id);
    } catch {
      return apiError(500, 'INTERNAL_ERROR', 'Failed to deactivate staff auth account.');
    }
  }

  if (updates.is_active === true && !existing.is_active) {
    try {
      await unbanAuthUser(service, id);
    } catch {
      return apiError(500, 'INTERNAL_ERROR', 'Failed to reactivate staff auth account.');
    }
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, full_name, username, email, role, is_active, online_status')
    .single();

  if (error || !data) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update staff member.');
  }

  return Response.json({ data });
}
