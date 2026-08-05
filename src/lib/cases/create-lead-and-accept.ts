import type { SupabaseClient } from '@supabase/supabase-js';
import { mapAcceptLeadError } from '@/lib/cases/accept-errors';
import { apiError } from '@/lib/api/response';
import {
  validateLeadApplicationTypeId,
  validateLeadClientName,
  validateLeadNotes,
} from '@/lib/utils/lead-form';
import type { Database } from '@/types/database';

export type CreateLeadInput = {
  client_first_name?: string;
  client_last_name?: string;
  application_type_id?: string;
  notes?: string;
};

export type CreateLeadAndAcceptResult = {
  id: string;
  reference: string;
  status: string;
  tasks_created: number;
};

type CreateLeadOutcome =
  | { ok: true; caseId: string }
  | { ok: false; response: Response };

type AcceptOutcome =
  | { ok: true; data: CreateLeadAndAcceptResult }
  | { ok: false; response: Response };

export async function createLeadRecord(
  client: SupabaseClient<Database>,
  userId: string,
  input: CreateLeadInput,
): Promise<CreateLeadOutcome> {
  const firstNameResult = validateLeadClientName(
    input.client_first_name ?? '',
    'Client first name',
  );
  if (!firstNameResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', firstNameResult.message, [
        { field: 'client_first_name', message: firstNameResult.message },
      ]),
    };
  }

  const lastNameResult = validateLeadClientName(
    input.client_last_name ?? '',
    'Client last name',
  );
  if (!lastNameResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', lastNameResult.message, [
        { field: 'client_last_name', message: lastNameResult.message },
      ]),
    };
  }

  const typeResult = validateLeadApplicationTypeId(input.application_type_id);
  if (!typeResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', typeResult.message, [
        { field: 'application_type_id', message: typeResult.message },
      ]),
    };
  }

  const notesResult = validateLeadNotes(input.notes);
  if (!notesResult.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', notesResult.message, [
        { field: 'notes', message: notesResult.message },
      ]),
    };
  }

  const { data: applicationType, error: typeError } = await client
    .from('application_types')
    .select('id, is_active')
    .eq('id', typeResult.value)
    .maybeSingle();

  if (typeError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to validate application type.'),
    };
  }

  if (!applicationType?.is_active) {
    return {
      ok: false,
      response: apiError(404, 'NOT_FOUND', 'Application type not found.'),
    };
  }

  const { data, error } = await client
    .from('cases')
    .insert({
      client_first_name: firstNameResult.value,
      client_last_name: lastNameResult.value,
      application_type_id: typeResult.value,
      notes: notesResult.value,
      status: 'lead_pending',
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to create lead.'),
    };
  }

  return { ok: true, caseId: data.id };
}

export async function acceptLeadRecord(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<AcceptOutcome> {
  const { data, error } = await client.rpc('accept_lead', { p_case_id: caseId });

  if (error || !data) {
    const mapped = mapAcceptLeadError(error);
    return {
      ok: false,
      response: apiError(mapped.status, mapped.code, mapped.message),
    };
  }

  return { ok: true, data: data as CreateLeadAndAcceptResult };
}

export async function createLeadAndAccept(
  client: SupabaseClient<Database>,
  userId: string,
  input: CreateLeadInput,
): Promise<
  | { ok: true; data: CreateLeadAndAcceptResult }
  | { ok: false; response: Response; caseId?: string }
> {
  const createResult = await createLeadRecord(client, userId, input);
  if (!createResult.ok) {
    return createResult;
  }

  const acceptResult = await acceptLeadRecord(client, createResult.caseId);
  if (!acceptResult.ok) {
    return { ...acceptResult, caseId: createResult.caseId };
  }

  return acceptResult;
}
