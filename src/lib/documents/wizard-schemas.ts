import { DEFAULT_VISA_CATEGORY_LABEL } from './constants';
import { getVariantById } from './registry';
import type { WizardAnswers, WizardSchemaId } from './types';

export type WizardParseResult =
  | { ok: true; value: WizardAnswers }
  | { ok: false; message: string };

function fail(message: string): WizardParseResult {
  return { ok: false, message };
}

function ok(value: WizardAnswers): WizardParseResult {
  return { ok: true, value };
}

function requireString(
  raw: Record<string, unknown>,
  field: string,
): string | WizardParseResult {
  const value = raw[field];
  if (typeof value !== 'string' || !value.trim()) {
    return fail(`${field} is required.`);
  }
  return value.trim();
}

function requireStringArray(
  raw: Record<string, unknown>,
  field: string,
): string[] | WizardParseResult {
  const value = raw[field];
  if (!Array.isArray(value) || value.length === 0) {
    return fail(`${field} must be a non-empty array.`);
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (items.length === 0) {
    return fail(`${field} must contain at least one value.`);
  }

  return items;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
  }
  return fallback;
}

function parseSkwSolo(raw: Record<string, unknown>): WizardParseResult {
  const applicantName = requireString(raw, 'applicant_name');
  if (typeof applicantName !== 'string') return applicantName;
  const applicantTitle = requireString(raw, 'applicant_title');
  if (typeof applicantTitle !== 'string') return applicantTitle;
  const uan = requireString(raw, 'uan');
  if (typeof uan !== 'string') return uan;

  return ok({
    applicant_name: applicantName,
    applicant_title: applicantTitle,
    uan,
    applicant_pronoun_object:
      typeof raw.applicant_pronoun_object === 'string'
        ? raw.applicant_pronoun_object.trim()
        : undefined,
    applicant_pronoun_possessive:
      typeof raw.applicant_pronoun_possessive === 'string'
        ? raw.applicant_pronoun_possessive.trim()
        : undefined,
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  });
}

function parseSkwWithSpouseDep(raw: Record<string, unknown>): WizardParseResult {
  const primaryName = requireString(raw, 'primary_applicant_name');
  if (typeof primaryName !== 'string') return primaryName;
  const primaryTitle = requireString(raw, 'primary_applicant_title');
  if (typeof primaryTitle !== 'string') return primaryTitle;
  const dependantName = requireString(raw, 'dependant_name');
  if (typeof dependantName !== 'string') return dependantName;
  const dependantTitle = requireString(raw, 'dependant_title');
  if (typeof dependantTitle !== 'string') return dependantTitle;
  const dependantRelationship = requireString(raw, 'dependant_relationship');
  if (typeof dependantRelationship !== 'string') return dependantRelationship;
  const applicationRefs = requireStringArray(raw, 'application_refs');
  if (!Array.isArray(applicationRefs)) return applicationRefs;

  return ok({
    primary_applicant_name: primaryName,
    primary_applicant_title: primaryTitle,
    dependant_name: dependantName,
    dependant_title: dependantTitle,
    dependant_relationship: dependantRelationship,
    application_refs: applicationRefs,
    is_extension: parseBoolean(raw.is_extension),
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  });
}

function parseFmPartnerDep(raw: Record<string, unknown>): WizardParseResult {
  const applicantName = requireString(raw, 'applicant_name');
  if (typeof applicantName !== 'string') return applicantName;
  const applicantTitle = requireString(raw, 'applicant_title');
  if (typeof applicantTitle !== 'string') return applicantTitle;
  const partnerName = requireString(raw, 'partner_name');
  if (typeof partnerName !== 'string') return partnerName;
  const partnerTitle = requireString(raw, 'partner_title');
  if (typeof partnerTitle !== 'string') return partnerTitle;
  const uan = requireString(raw, 'uan');
  if (typeof uan !== 'string') return uan;

  return ok({
    applicant_name: applicantName,
    applicant_title: applicantTitle,
    partner_name: partnerName,
    partner_title: partnerTitle,
    uan,
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  });
}

function parseNatFamily(raw: Record<string, unknown>): WizardParseResult {
  const leadName = requireString(raw, 'lead_applicant_name');
  if (typeof leadName !== 'string') return leadName;
  const leadTitle = requireString(raw, 'lead_applicant_title');
  if (typeof leadTitle !== 'string') return leadTitle;
  const applicationRefs = requireStringArray(raw, 'application_refs');
  if (!Array.isArray(applicationRefs)) return applicationRefs;

  const applicants = Array.isArray(raw.applicants) ? raw.applicants : [];

  return ok({
    lead_applicant_name: leadName,
    lead_applicant_title: leadTitle,
    applicants,
    application_refs: applicationRefs,
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  });
}

function parseSkdOutsideUk(raw: Record<string, unknown>): WizardParseResult {
  const sponsorName = requireString(raw, 'sponsor_name');
  if (typeof sponsorName !== 'string') return sponsorName;
  const sponsorRelationship = requireString(raw, 'sponsor_relationship');
  if (typeof sponsorRelationship !== 'string') return sponsorRelationship;

  if (!Array.isArray(raw.applicants) || raw.applicants.length === 0) {
    return fail('applicants must be a non-empty array.');
  }

  return ok({
    sponsor_name: sponsorName,
    sponsor_relationship: sponsorRelationship,
    applicants: raw.applicants,
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  });
}

function parseParentalConsent(raw: Record<string, unknown>): WizardParseResult {
  const requiredFields = [
    'child_name',
    'child_dob',
    'child_passport_number',
    'parent1_name',
    'parent1_passport_country',
    'parent1_passport_number',
    'parent2_name',
    'parent2_passport_country',
    'parent2_passport_number',
    'shared_address',
    'parent1_email',
    'parent1_mobile',
    'parent2_email',
    'parent2_mobile',
  ] as const;

  const parsed: WizardAnswers = {
    visa_category_label:
      typeof raw.visa_category_label === 'string' && raw.visa_category_label.trim()
        ? raw.visa_category_label.trim()
        : DEFAULT_VISA_CATEGORY_LABEL,
    present_date:
      typeof raw.present_date === 'string' ? raw.present_date.trim() : undefined,
  };

  for (const field of requiredFields) {
    const value = requireString(raw, field);
    if (typeof value !== 'string') {
      return value;
    }
    parsed[field] = value;
  }

  const applicationRefs = requireStringArray(raw, 'application_refs');
  if (!Array.isArray(applicationRefs)) {
    return applicationRefs;
  }
  parsed.application_refs = applicationRefs;

  return ok(parsed);
}

const PARSERS: Record<WizardSchemaId, (raw: Record<string, unknown>) => WizardParseResult> =
  {
    wizard_covering_skw_solo: parseSkwSolo,
    wizard_covering_skw_with_spouse_dep: parseSkwWithSpouseDep,
    wizard_covering_fm_partner_dep: parseFmPartnerDep,
    wizard_covering_nat_family: parseNatFamily,
    wizard_covering_skd_outside_uk: parseSkdOutsideUk,
    wizard_parental_consent_straightforward: parseParentalConsent,
  };

export function parseWizardAnswers(
  wizardSchemaId: WizardSchemaId,
  raw: unknown,
): WizardParseResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fail('Answers must be an object.');
  }

  const parser = PARSERS[wizardSchemaId];
  if (!parser) {
    return fail(`Unknown wizard schema: ${wizardSchemaId}`);
  }

  return parser(raw as Record<string, unknown>);
}

export function parseWizardAnswersForVariant(
  variantId: Parameters<typeof getVariantById>[0],
  raw: unknown,
): WizardParseResult {
  const variant = getVariantById(variantId);
  return parseWizardAnswers(variant.wizardSchemaId, raw);
}
