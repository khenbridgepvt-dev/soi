import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_COVERING_LETTERHEAD_PATH } from '@/lib/documents/constants';
import { validateCoveringLetterheadUpload } from '@/lib/documents/resolve-letterhead';

describe('validateCoveringLetterheadUpload', () => {
  it('accepts the bundled shell DOCX', () => {
    const buffer = readFileSync(
      path.join(process.cwd(), DEFAULT_COVERING_LETTERHEAD_PATH),
    );

    expect(validateCoveringLetterheadUpload(buffer)).toBeNull();
  });

  it('rejects empty buffers', () => {
    expect(validateCoveringLetterheadUpload(Buffer.alloc(0))).toBe(
      'Uploaded file is empty.',
    );
  });

  it('rejects non-DOCX content', () => {
    expect(validateCoveringLetterheadUpload(Buffer.from('not a docx'))).toBe(
      'Uploaded file must be a valid DOCX document.',
    );
  });
});
