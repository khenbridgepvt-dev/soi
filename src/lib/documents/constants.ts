export const ADVISOR_NAME = 'Ephraim Abraham';
export const ADVISOR_TITLE = 'Immigration Advisor';
export const ADVISOR_EMAIL = 'ephraim@l-cedar.com';

export const DEFAULT_VISA_CATEGORY_LABEL =
  'PBS, Start-up, Innovator or Global Talent – Child Visa';

/** Letterhead shell with `{{body}}` placeholder (preferred). */
export const DEFAULT_COVERING_LETTERHEAD_PATH =
  'docs/templates/letterhead/covering-letter-shell.docx';

/** Bundled sample letterhead when the shell file is missing. */
export const FALLBACK_COVERING_LETTERHEAD_PATH =
  'docs/templates/letterhead/sample covering letter.docx';

export const DEFAULT_COVERING_LETTER_FILENAME = 'covering-letter.docx';
export const DEFAULT_PARENTAL_CONSENT_FILENAME = 'parental-consent.docx';
export const DEFAULT_COVERING_LETTER_PDF_FILENAME = 'covering-letter.pdf';
export const DEFAULT_PARENTAL_CONSENT_PDF_FILENAME = 'parental-consent.pdf';

/** Supabase Storage bucket for admin-uploaded document templates (letterhead only). */
export const DOCUMENT_TEMPLATES_BUCKET = 'document-templates';

/** Fixed object key for the covering letter letterhead shell. */
export const STORAGE_COVERING_LETTERHEAD_PATH = 'letterhead/covering-letter-shell.docx';

export const COVERING_LETTERHEAD_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const COVERING_LETTERHEAD_MAX_BYTES = 5 * 1024 * 1024;
