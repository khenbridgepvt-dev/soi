import 'server-only';

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import PizZip from 'pizzip';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';

import {
  COVERING_LETTERHEAD_MAX_BYTES,
  COVERING_LETTERHEAD_MIME,
  DEFAULT_COVERING_LETTERHEAD_PATH,
  DOCUMENT_TEMPLATES_BUCKET,
  FALLBACK_COVERING_LETTERHEAD_PATH,
  STORAGE_COVERING_LETTERHEAD_PATH,
} from './constants';

export type CoveringLetterheadSource = 'storage' | 'bundled' | 'override';

export type CoveringLetterheadStatus = {
  source: CoveringLetterheadSource;
  storage_path: string;
  bundled_path: string;
  updated_at: string | null;
};

function resolveProjectPath(relativeOrAbsolutePath: string): string {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(process.cwd(), relativeOrAbsolutePath);
}

function readBundledLetterheadBuffer(): Buffer {
  const shellPath = resolveProjectPath(DEFAULT_COVERING_LETTERHEAD_PATH);
  if (existsSync(shellPath)) {
    return readFileSync(shellPath);
  }

  const fallbackPath = resolveProjectPath(FALLBACK_COVERING_LETTERHEAD_PATH);
  if (existsSync(fallbackPath)) {
    return readFileSync(fallbackPath);
  }

  throw new Error('No covering letter letterhead template found');
}

function readLetterheadFromDisk(letterheadPath: string): Buffer {
  const resolved = resolveProjectPath(letterheadPath);
  if (!existsSync(resolved)) {
    throw new Error(`Letterhead not found: ${resolved}`);
  }
  return readFileSync(resolved);
}

async function downloadStorageLetterhead(
  client: SupabaseClient<Database>,
): Promise<Buffer | null> {
  const { data, error } = await client.storage
    .from(DOCUMENT_TEMPLATES_BUCKET)
    .download(STORAGE_COVERING_LETTERHEAD_PATH);

  if (error || !data) {
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

export function validateCoveringLetterheadUpload(buffer: Buffer): string | null {
  if (buffer.length === 0) {
    return 'Uploaded file is empty.';
  }

  if (buffer.length > COVERING_LETTERHEAD_MAX_BYTES) {
    return 'Uploaded file exceeds the 5 MB limit.';
  }

  if (buffer.subarray(0, 2).toString('utf8') !== 'PK') {
    return 'Uploaded file must be a valid DOCX document.';
  }

  try {
    const documentXml =
      new PizZip(buffer).file('word/document.xml')?.asText() ?? '';
    if (!documentXml.includes('{{body}}')) {
      return 'Letterhead must contain a {{body}} placeholder where letter content is inserted.';
    }
  } catch {
    return 'Uploaded file could not be read as a DOCX document.';
  }

  return null;
}

export async function getCoveringLetterheadStatus(
  client?: SupabaseClient<Database>,
): Promise<CoveringLetterheadStatus> {
  const supabase = client ?? createServiceClient();
  const { data: files, error } = await supabase.storage
    .from(DOCUMENT_TEMPLATES_BUCKET)
    .list('letterhead', {
      search: 'covering-letter-shell.docx',
      limit: 1,
    });

  const storageFile =
    !error && files?.some((file) => file.name === 'covering-letter-shell.docx')
      ? files.find((file) => file.name === 'covering-letter-shell.docx')
      : null;

  if (storageFile) {
    return {
      source: 'storage',
      storage_path: STORAGE_COVERING_LETTERHEAD_PATH,
      bundled_path: DEFAULT_COVERING_LETTERHEAD_PATH,
      updated_at: storageFile.updated_at ?? storageFile.created_at ?? null,
    };
  }

  return {
    source: 'bundled',
    storage_path: STORAGE_COVERING_LETTERHEAD_PATH,
    bundled_path: DEFAULT_COVERING_LETTERHEAD_PATH,
    updated_at: null,
  };
}

export async function uploadCoveringLetterhead(
  client: SupabaseClient<Database>,
  buffer: Buffer,
): Promise<void> {
  const validationError = validateCoveringLetterheadUpload(buffer);
  if (validationError) {
    throw new Error(validationError);
  }

  const { error } = await client.storage
    .from(DOCUMENT_TEMPLATES_BUCKET)
    .upload(STORAGE_COVERING_LETTERHEAD_PATH, buffer, {
      contentType: COVERING_LETTERHEAD_MIME,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveLetterheadBuffer(options?: {
  letterheadPath?: string;
}): Promise<Buffer> {
  if (options?.letterheadPath) {
    return readLetterheadFromDisk(options.letterheadPath);
  }

  const service = createServiceClient();
  const storageBuffer = await downloadStorageLetterhead(service);
  if (storageBuffer) {
    return storageBuffer;
  }

  return readBundledLetterheadBuffer();
}
