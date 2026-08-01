import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from('cases')
    .select(
      `
        id,
        reference,
        client_first_name,
        client_last_name,
        status,
        is_urgent,
        notes,
        created_at,
        application_types ( id, name )
      `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const applicationType = Array.isArray(data.application_types)
    ? data.application_types[0]
    : data.application_types;

  return Response.json({
    data: {
      id: data.id,
      reference: data.reference,
      client_first_name: data.client_first_name,
      client_last_name: data.client_last_name,
      status: data.status,
      is_urgent: data.is_urgent,
      notes: data.notes,
      application_type_id: applicationType?.id ?? null,
      application_type_name: applicationType?.name ?? null,
      created_at: data.created_at,
    },
  });
}
