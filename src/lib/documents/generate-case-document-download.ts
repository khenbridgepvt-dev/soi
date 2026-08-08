import type { SupabaseClient } from '@supabase/supabase-js';

import { apiError } from '@/lib/api/response';
import type { Database } from '@/types/database';

import { buildDocumentFilename, type DocumentDownloadFormat } from './build-document-filename';
import type { CaseDocumentContext } from './fetch-case-document-context';
import {
  generateCoveringLetterDocx,
  generateParentalConsentDocx,
} from './generate-docx';
import {
  generateCoveringLetterPdf,
  generateParentalConsentPdf,
} from './generate-pdf';
import { getCaseDocument } from './list-case-documents';
import { renderMergedBody } from './render-body';
import { parseWizardAnswersForVariant } from './wizard-schemas';
import type { DocumentKind, VariantId } from './types';

export type GeneratedCaseDocumentDownload = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

type DownloadOutcome =
  | { ok: true; data: GeneratedCaseDocumentDownload }
  | { ok: false; response: Response };

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_CONTENT_TYPE = 'application/pdf';

function isDownloadFormat(value: string): value is DocumentDownloadFormat {
  return value === 'docx' || value === 'pdf';
}

export async function generateCaseDocumentDownload(
  client: SupabaseClient<Database>,
  context: CaseDocumentContext,
  kind: DocumentKind,
  format: string,
): Promise<DownloadOutcome> {
  if (!isDownloadFormat(format)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'format must be docx or pdf.', [
        { field: 'format', message: 'format must be docx or pdf.' },
      ]),
    };
  }

  const preparation = await getCaseDocument(client, context.id, kind);
  if (!preparation) {
    return {
      ok: false,
      response: apiError(404, 'NOT_FOUND', 'Document preparation not found.'),
    };
  }

  const parsedAnswers = parseWizardAnswersForVariant(
    preparation.variant_id as VariantId,
    preparation.answers,
  );

  if (!parsedAnswers.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', parsedAnswers.message, [
        { field: 'answers', message: parsedAnswers.message },
      ]),
    };
  }

  const { mergedText } = renderMergedBody(
    preparation.variant_id as VariantId,
    parsedAnswers.value,
  );
  const filename = buildDocumentFilename(context.reference, kind, format);

  if (format === 'docx') {
    if (kind === 'covering_letter') {
      const generated = await generateCoveringLetterDocx(mergedText, { filename });
      return {
        ok: true,
        data: {
          buffer: generated.buffer,
          filename: generated.filename,
          contentType: DOCX_CONTENT_TYPE,
        },
      };
    }

    const generated = await generateParentalConsentDocx(mergedText, { filename });
    return {
      ok: true,
      data: {
        buffer: generated.buffer,
        filename: generated.filename,
        contentType: DOCX_CONTENT_TYPE,
      },
    };
  }

  const generated =
    kind === 'covering_letter'
      ? await generateCoveringLetterPdf(mergedText, { filename })
      : await generateParentalConsentPdf(mergedText, { filename });

  return {
    ok: true,
    data: {
      buffer: generated.buffer,
      filename: generated.filename,
      contentType: PDF_CONTENT_TYPE,
    },
  };
}
