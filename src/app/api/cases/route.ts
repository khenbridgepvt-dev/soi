import { requireAdminApiAuth, requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchCaseList } from '@/lib/cases/fetch-case-list';
import { buildPaginationMeta, parseCaseListQuery } from '@/lib/cases/list-query';
import {
  validateLeadApplicationTypeId,
  validateLeadClientName,
  validateLeadNotes,
} from '@/lib/utils/lead-form';

export async function GET(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { supabase, role } = auth;
  const url = new URL(request.url);
  const query = parseCaseListQuery(url.searchParams, role);

  try {
    const { rows, total } = await fetchCaseList(supabase, query);

    return Response.json({
      data: rows,
      pagination: buildPaginationMeta(query.page, query.limit, total),
    });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load cases.');
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { supabase, userId } = auth;
  const body = (await request.json()) as {
    client_first_name?: string;
    client_last_name?: string;
    application_type_id?: string;
    notes?: string;
  };

  const firstNameResult = validateLeadClientName(
    body.client_first_name ?? '',
    'Client first name',
  );
  if (!firstNameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', firstNameResult.message, [
      { field: 'client_first_name', message: firstNameResult.message },
    ]);
  }

  const lastNameResult = validateLeadClientName(
    body.client_last_name ?? '',
    'Client last name',
  );
  if (!lastNameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', lastNameResult.message, [
      { field: 'client_last_name', message: lastNameResult.message },
    ]);
  }

  const typeResult = validateLeadApplicationTypeId(body.application_type_id);
  if (!typeResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', typeResult.message, [
      { field: 'application_type_id', message: typeResult.message },
    ]);
  }

  const notesResult = validateLeadNotes(body.notes);
  if (!notesResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', notesResult.message, [
      { field: 'notes', message: notesResult.message },
    ]);
  }

  const { data: applicationType, error: typeError } = await supabase
    .from('application_types')
    .select('id, name, is_active')
    .eq('id', typeResult.value)
    .maybeSingle();

  if (typeError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to validate application type.');
  }

  if (!applicationType || !applicationType.is_active) {
    return apiError(404, 'NOT_FOUND', 'Application type not found.');
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      client_first_name: firstNameResult.value,
      client_last_name: lastNameResult.value,
      application_type_id: typeResult.value,
      notes: notesResult.value,
      status: 'lead_pending',
      created_by: userId,
    })
    .select(
      'id, client_first_name, client_last_name, application_type_id, status, reference, is_urgent, notes, created_by, created_at',
    )
    .single();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to create lead.');
  }

  return Response.json(
    {
      data: {
        ...data,
        application_type_name: applicationType.name,
      },
    },
    { status: 201 },
  );
}
