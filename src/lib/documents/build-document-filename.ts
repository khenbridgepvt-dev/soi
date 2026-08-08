import {
  DEFAULT_COVERING_LETTER_FILENAME,
  DEFAULT_COVERING_LETTER_PDF_FILENAME,
  DEFAULT_PARENTAL_CONSENT_FILENAME,
  DEFAULT_PARENTAL_CONSENT_PDF_FILENAME,
} from './constants';
import type { DocumentKind } from './types';

export type DocumentDownloadFormat = 'docx' | 'pdf';

function sanitizeCaseReference(reference: string): string {
  return reference.trim().replace(/\//g, '-');
}

function defaultFilename(kind: DocumentKind, format: DocumentDownloadFormat): string {
  if (format === 'docx') {
    return kind === 'covering_letter'
      ? DEFAULT_COVERING_LETTER_FILENAME
      : DEFAULT_PARENTAL_CONSENT_FILENAME;
  }

  return kind === 'covering_letter'
    ? DEFAULT_COVERING_LETTER_PDF_FILENAME
    : DEFAULT_PARENTAL_CONSENT_PDF_FILENAME;
}

export function buildDocumentFilename(
  caseReference: string | null | undefined,
  kind: DocumentKind,
  format: DocumentDownloadFormat,
): string {
  const baseKind = kind === 'covering_letter' ? 'covering-letter' : 'parental-consent';

  if (caseReference?.trim()) {
    return `${sanitizeCaseReference(caseReference)}-${baseKind}.${format}`;
  }

  return defaultFilename(kind, format);
}
