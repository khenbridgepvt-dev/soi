/**
 * Case reference format seam (database_schema.md §9.1, ADR-0009).
 *
 * Format: `{MMYY}{zero-padded sequence}/{TYPE}/{first 3 of first name}`
 * e.g. `072604/SKW/MAR`.
 *
 * This mirrors what `public.accept_lead()` does in the database so the UI can
 * format and validate references without a round trip. The database remains
 * the only place a reference is *allocated* — the counter UPSERT lives there.
 */

export const REFERENCE_NAME_SEGMENT_LENGTH = 3;
export const REFERENCE_SEQUENCE_MIN_DIGITS = 2;
export const REFERENCE_NAME_PAD_CHAR = 'X';

const NON_LETTER_RE = /[^\p{L}]/gu;
const REFERENCE_RE = /^(\d{4})(\d{2,})\/([A-Z]{3})\/(\p{L}{3})$/u;

/** `MMYY` for the given instant, in UTC to match the database counter. */
export function formatYearMonth(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear() % 100).padStart(2, '0');
  return `${month}${year}`;
}

export function currentYearMonth(): string {
  return formatYearMonth(new Date());
}

/**
 * First three letters of the client's first name, uppercased. Non-letters are
 * dropped and names shorter than three letters are padded with `X` (TC-019).
 */
export function formatNameSegment(clientFirstName: string): string {
  const letters = clientFirstName.replace(NON_LETTER_RE, '').toUpperCase();
  return letters
    .slice(0, REFERENCE_NAME_SEGMENT_LENGTH)
    .padEnd(REFERENCE_NAME_SEGMENT_LENGTH, REFERENCE_NAME_PAD_CHAR);
}

export function formatSequence(sequence: number): string {
  return String(sequence).padStart(REFERENCE_SEQUENCE_MIN_DIGITS, '0');
}

export function formatCaseReference(input: {
  yearMonth: string;
  sequence: number;
  typeCode: string;
  clientFirstName: string;
}): string {
  const sequence = formatSequence(input.sequence);
  const typeCode = input.typeCode.toUpperCase();
  const name = formatNameSegment(input.clientFirstName);
  return `${input.yearMonth}${sequence}/${typeCode}/${name}`;
}

/**
 * What the reference will look like once the lead is accepted (S-08). The
 * sequence is only allocated by the counter UPSERT inside the acceptance
 * transaction, so it shows as `NN` until then.
 */
export function formatCaseReferencePreview(input: {
  typeCode: string;
  clientFirstName: string;
  at?: Date;
}): string {
  const yearMonth = formatYearMonth(input.at ?? new Date());
  const placeholder = 'N'.repeat(REFERENCE_SEQUENCE_MIN_DIGITS);
  const typeCode = input.typeCode.toUpperCase();
  return `${yearMonth}${placeholder}/${typeCode}/${formatNameSegment(input.clientFirstName)}`;
}

export type ParsedCaseReference = {
  yearMonth: string;
  sequence: number;
  typeCode: string;
  nameSegment: string;
};

export function parseCaseReference(reference: string): ParsedCaseReference | null {
  const match = REFERENCE_RE.exec(reference.trim());
  if (!match) {
    return null;
  }

  return {
    yearMonth: match[1],
    sequence: Number(match[2]),
    typeCode: match[3],
    nameSegment: match[4],
  };
}

export function isValidCaseReference(reference: string): boolean {
  return parseCaseReference(reference) !== null;
}
