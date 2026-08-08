import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COVERING_LETTERHEAD_PATH,
} from '@/lib/documents/constants';
import {
  getCoveringLetterheadStatus,
  resolveLetterheadBuffer,
  uploadCoveringLetterhead,
  validateCoveringLetterheadUpload,
} from '@/lib/documents/resolve-letterhead';
import { signInAsRole } from './rls-harness';

function loadBundledShell(): Buffer {
  return readFileSync(
    path.join(process.cwd(), DEFAULT_COVERING_LETTERHEAD_PATH),
  );
}

describe('covering letter letterhead storage (ticket 0061)', () => {
  it('admin can upload letterhead and resolveLetterheadBuffer prefers Storage', async () => {
    const shell = loadBundledShell();
    expect(validateCoveringLetterheadUpload(shell)).toBeNull();

    const { client: admin } = await signInAsRole('admin');

    await uploadCoveringLetterhead(admin, shell);

    const after = await getCoveringLetterheadStatus(admin);
    expect(after.source).toBe('storage');
    expect(after.updated_at).toBeTruthy();

    const resolved = await resolveLetterheadBuffer();
    expect(resolved.equals(shell)).toBe(true);

    await admin.auth.signOut();
  });

  it('staff cannot upload letterhead (storage RLS)', async () => {
    const shell = loadBundledShell();
    const { client: staff } = await signInAsRole('staff');

    await expect(uploadCoveringLetterhead(staff, shell)).rejects.toThrow();

    await staff.auth.signOut();
  });
});
