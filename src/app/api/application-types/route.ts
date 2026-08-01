import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  validateApplicationTypeCode,
  validateApplicationTypeName,
} from '@/lib/utils/application-type';

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { supabase, role } = auth;
  const url = new URL(request.url);
  const isActiveParam = url.searchParams.get('is_active');

  let query = supabase
    .from('application_types')
    .select('id, name, code, is_active, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (isActiveParam === 'true') {
    query = query.eq('is_active', true);
  } else if (isActiveParam === 'false') {
    query = query.eq('is_active', false);
  } else if (role !== 'admin') {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load application types.');
  }

  return Response.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth({ role: 'admin' });
  if (auth instanceof Response) {
    return auth;
  }

  const { supabase } = auth;
  const body = (await request.json()) as { name?: string; code?: string };

  const nameResult = validateApplicationTypeName(body.name ?? '');
  if (!nameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', nameResult.message, [
      { field: 'name', message: nameResult.message },
    ]);
  }

  const codeResult = validateApplicationTypeCode(body.code ?? '');
  if (!codeResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', codeResult.message, [
      { field: 'code', message: codeResult.message },
    ]);
  }

  const name = nameResult.name;
  const code = codeResult.code;

  const { data: existingByCode } = await supabase
    .from('application_types')
    .select('name')
    .eq('code', code)
    .maybeSingle();

  if (existingByCode) {
    return apiError(
      409,
      'CONFLICT',
      `The code '${code}' is already in use by '${existingByCode.name}'.`,
      [{ field: 'code', message: `The code '${code}' is already in use by '${existingByCode.name}'.` }],
    );
  }

  const { data: existingByName } = await supabase
    .from('application_types')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existingByName) {
    return apiError(
      409,
      'CONFLICT',
      'An application type with this name already exists.',
      [{ field: 'name', message: 'An application type with this name already exists.' }],
    );
  }

  const { data: maxRow } = await supabase
    .from('application_types')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('application_types')
    .insert({ name, code, sort_order: sortOrder })
    .select('id, name, code, is_active, sort_order')
    .single();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to create application type.');
  }

  return Response.json({ data }, { status: 201 });
}
