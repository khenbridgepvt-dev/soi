import 'server-only';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import Docxtemplater from 'docxtemplater';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import PizZip from 'pizzip';

import {
  DEFAULT_COVERING_LETTER_FILENAME,
  DEFAULT_COVERING_LETTERHEAD_PATH,
  DEFAULT_PARENTAL_CONSENT_FILENAME,
  FALLBACK_COVERING_LETTERHEAD_PATH,
} from './constants';
import { resolveLetterheadBuffer } from './resolve-letterhead';

export type GeneratedDocx = { buffer: Buffer; filename: string };

const DOCXTEMPLATER_DELIMITERS = { start: '{{', end: '}}' } as const;

function renderLetterheadDocx(buffer: Buffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    delimiters: DOCXTEMPLATER_DELIMITERS,
    linebreaks: true,
    paragraphLoop: true,
  });

  doc.render(data);

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
}

function mergedTextToParagraphs(mergedText: string): Paragraph[] {
  return mergedText.split('\n').map(
    (line) =>
      new Paragraph({
        children: line.length > 0 ? [new TextRun(line)] : [],
      }),
  );
}

export async function generateCoveringLetterDocx(
  mergedText: string,
  options?: { letterheadPath?: string; filename?: string },
): Promise<GeneratedDocx> {
  const letterheadBuffer = await resolveLetterheadBuffer({
    letterheadPath: options?.letterheadPath,
  });
  const buffer = renderLetterheadDocx(letterheadBuffer, { body: mergedText });

  return {
    buffer,
    filename: options?.filename ?? DEFAULT_COVERING_LETTER_FILENAME,
  };
}

export async function generateParentalConsentDocx(
  mergedText: string,
  options?: { filename?: string },
): Promise<GeneratedDocx> {
  const document = new Document({
    sections: [
      {
        children: mergedTextToParagraphs(mergedText),
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);

  return {
    buffer,
    filename: options?.filename ?? DEFAULT_PARENTAL_CONSENT_FILENAME,
  };
}

/** @internal Exported for tests that need bundled shell paths without storage. */
export const BUNDLED_LETTERHEAD_PATHS = {
  shell: DEFAULT_COVERING_LETTERHEAD_PATH,
  fallback: FALLBACK_COVERING_LETTERHEAD_PATH,
} as const;

/** @internal Read a bundled letterhead file for unit tests. */
export function readBundledLetterheadForTest(relativePath: string): Buffer {
  const resolved = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);
  return readFileSync(resolved);
}
