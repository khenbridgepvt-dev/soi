import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { validateStaffPassword } from '@/lib/staff/validation';
import { createServiceClient } from '@/lib/supabase/service';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/** EP-56 · POST /api/admin/reset-password/:userId */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { userId } = await context.params;
  if (!isUuid(userId)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const body = (await request.json()) as { temporary_password?: string };

  const passwordResult = validateStaffPassword(body.temporary_password, {
    requireComplexity: true,
  });
  if (!passwordResult.ok) {
    return apiError(400, passwordResult.code ?? 'VALIDATION_ERROR', passwordResult.message, [
      { field: 'temporary_password', message: passwordResult.message },
    ]);
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    password: passwordResult.value,
  });

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to reset password.');
  }

  return Response.json({
    data: {
      message: 'Password reset for staff member',
      user_id: userId,
    },
  });
}
