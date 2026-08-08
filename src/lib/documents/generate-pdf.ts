import 'server-only';

import PDFDocument from 'pdfkit';

import {
  DEFAULT_COVERING_LETTER_PDF_FILENAME,
  DEFAULT_PARENTAL_CONSENT_PDF_FILENAME,
} from './constants';

export type GeneratedPdf = { buffer: Buffer; filename: string };

const PDF_LAYOUT = {
  size: 'A4' as const,
  margin: 72,
  fontSize: 12,
  lineGap: 2,
  blankLineGap: 0.5,
};

function writeMergedTextToPdf(mergedText: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PDF_LAYOUT.size,
      margin: PDF_LAYOUT.margin,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica').fontSize(PDF_LAYOUT.fontSize);

    for (const line of mergedText.split('\n')) {
      if (line.length === 0) {
        doc.moveDown(PDF_LAYOUT.blankLineGap);
      } else {
        doc.text(line, { lineGap: PDF_LAYOUT.lineGap });
      }
    }

    doc.end();
  });
}

async function generatePdfFromMergedText(
  mergedText: string,
  defaultFilename: string,
  options?: { filename?: string },
): Promise<GeneratedPdf> {
  const buffer = await writeMergedTextToPdf(mergedText);

  return {
    buffer,
    filename: options?.filename ?? defaultFilename,
  };
}

export function generateCoveringLetterPdf(
  mergedText: string,
  options?: { filename?: string },
): Promise<GeneratedPdf> {
  return generatePdfFromMergedText(
    mergedText,
    DEFAULT_COVERING_LETTER_PDF_FILENAME,
    options,
  );
}

export function generateParentalConsentPdf(
  mergedText: string,
  options?: { filename?: string },
): Promise<GeneratedPdf> {
  return generatePdfFromMergedText(
    mergedText,
    DEFAULT_PARENTAL_CONSENT_PDF_FILENAME,
    options,
  );
}
