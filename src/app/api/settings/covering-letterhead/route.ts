import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  getCoveringLetterheadStatus,
  uploadCoveringLetterhead,
} from '@/lib/documents/resolve-letterhead';

/** EP-62 · GET /api/settings/covering-letterhead */
export async function GET() {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const data = await getCoveringLetterheadStatus(auth.supabase);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load covering letter letterhead status.');
  }
}

/** EP-62 · POST /api/settings/covering-letterhead */
export async function POST(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request must be multipart form data.');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return apiError(400, 'VALIDATION_ERROR', 'A DOCX file is required.', [
      { field: 'file', message: 'Upload a .docx letterhead file.' },
    ]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadCoveringLetterhead(auth.supabase, buffer);
    const data = await getCoveringLetterheadStatus(auth.supabase);
    return Response.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload letterhead.';
    return apiError(400, 'VALIDATION_ERROR', message, [
      { field: 'file', message },
    ]);
  }
}
