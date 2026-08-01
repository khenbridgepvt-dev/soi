import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { validateApplicationTypeName } from '@/lib/utils/application-type';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'admin' });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  const { supabase } = auth;
  const body = (await request.json()) as {
    name?: string;
    is_active?: boolean;
  };

  const { data: existing, error: fetchError } = await supabase
    .from('application_types')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load application type.');
  }

  if (!existing) {
    return apiError(404, 'NOT_FOUND', 'Application type not found.');
  }

  const updates: { name?: string; is_active?: boolean } = {};

  if (body.name !== undefined) {
    const nameResult = validateApplicationTypeName(body.name);
    if (!nameResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
        { field: 'name', message: nameResult.message },
      ]);
    }

    if (nameResult.name !== existing.name) {
      const { data: nameConflict } = await supabase
        .from('application_types')
        .select('id')
        .eq('name', nameResult.name)
        .maybeSingle();

      if (nameConflict && nameConflict.id !== id) {
        return apiError(
          409,
          'CONFLICT',
          'An application type with this name already exists.',
          [{ field: 'name', message: 'An application type with this name already exists.' }],
        );
      }

      updates.name = nameResult.name;
    }
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
    const { data } = await supabase
      .from('application_types')
      .select('id, name, code, is_active, sort_order')
      .eq('id', id)
      .single();
    return Response.json({ data });
  }

  const { data, error } = await supabase
    .from('application_types')
    .update(updates)
    .eq('id', id)
    .select('id, name, code, is_active, sort_order')
    .single();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update application type.');
  }

  return Response.json({ data });
}
