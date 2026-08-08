export {
  ADVISOR_EMAIL,
  ADVISOR_NAME,
  ADVISOR_TITLE,
  DEFAULT_COVERING_LETTERHEAD_PATH,
  DEFAULT_COVERING_LETTER_FILENAME,
  DEFAULT_COVERING_LETTER_PDF_FILENAME,
  DEFAULT_PARENTAL_CONSENT_FILENAME,
  DEFAULT_PARENTAL_CONSENT_PDF_FILENAME,
  DEFAULT_VISA_CATEGORY_LABEL,
  FALLBACK_COVERING_LETTERHEAD_PATH,
} from './constants';
export {
  generateCoveringLetterDocx,
  generateParentalConsentDocx,
  type GeneratedDocx,
} from './generate-docx';
export {
  generateCoveringLetterPdf,
  generateParentalConsentPdf,
  type GeneratedPdf,
} from './generate-pdf';
export {
  formatDobDisplay,
  formatPresentDate,
  formatUkOrdinalDate,
  resolvePresentDate,
  ukOrdinalSuffix,
} from './format-date';
export { buildMergeContext } from './merge-context';
export {
  buildExtensionParagraph,
  buildNatRefSubject,
  buildParentalRefLine,
  buildSponsorDependantClause,
  formatApplicantGwfLines,
  formatApplicantUanLines,
  formatApplicantsList,
  formatApplicationRefsNat,
  formatApplicationRefsParental,
  formatApplicationRefsSkwDep,
  formatFullName,
  formatSkdApplicantsNamesList,
  joinWithOxfordComma,
} from './merge-helpers';
export { loadTemplate, loadTemplateSync } from './load-template';
export {
  DOCUMENT_VARIANTS,
  getVariantById,
  listVariantsByKind,
  type DocumentVariantDefinition,
} from './registry';
export {
  renderMergedBody,
  renderMergedBodyFromTemplate,
  substituteMergeTokens,
  mergedTextToHtml,
  escapeHtml,
} from './render-body';
export {
  canOfferParentalConsent,
  listVariantsForKind,
  suggestCoveringVariant,
} from './resolve-variant';
export type {
  ApplicantNameFields,
  DependantForVariantResolution,
  DocumentKind,
  RenderedDocumentBody,
  SkdOutsideUkApplicant,
  VariantId,
  VariantResolutionContext,
  WizardAnswers,
  WizardSchemaId,
} from './types';
export {
  DOCUMENT_KINDS,
  VARIANT_IDS,
  WIZARD_SCHEMA_IDS,
} from './types';
export {
  parseWizardAnswers,
  parseWizardAnswersForVariant,
  type WizardParseResult,
} from './wizard-schemas';
