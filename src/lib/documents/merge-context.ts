import { ADVISOR_EMAIL, ADVISOR_NAME, ADVISOR_TITLE } from './constants';
import { formatDobDisplay, formatPresentDate } from './format-date';
import {
  buildExtensionParagraph,
  buildNatRefSubject,
  buildParentalRefLine,
  buildSponsorDependantClause,
  childPronounObject,
  defaultPronounsFromTitle,
  formatApplicantGwfLines,
  formatApplicantUanLines,
  formatApplicantsList,
  formatApplicationRefsNat,
  formatApplicationRefsParental,
  formatApplicationRefsSkwDep,
  formatFullName,
  formatSkdApplicantsNamesList,
  partnerRelationshipWord,
  relationshipPhrase,
} from './merge-helpers';
import type {
  ApplicantNameFields,
  SkdOutsideUkApplicant,
  VariantId,
  WizardAnswers,
} from './types';

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
  }
  return fallback;
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array.`);
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${field} must contain at least one value.`);
  }

  return items;
}

function asApplicantArray(value: unknown, field: string): ApplicantNameFields[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array.`);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`${field}[${index}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    return {
      title: asString(record.title, `${field}[${index}].title`),
      name: asString(record.name, `${field}[${index}].name`),
    };
  });
}

function asSkdApplicantArray(value: unknown, field: string): SkdOutsideUkApplicant[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array.`);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`${field}[${index}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    return {
      title: asString(record.title, `${field}[${index}].title`),
      name: asString(record.name, `${field}[${index}].name`),
      gwf: asString(record.gwf, `${field}[${index}].gwf`),
      uan: asString(record.uan, `${field}[${index}].uan`),
    };
  });
}

function pronouns(answers: WizardAnswers, titleField: string) {
  const object = asOptionalString(answers.applicant_pronoun_object);
  const possessive = asOptionalString(answers.applicant_pronoun_possessive);
  if (object && possessive) {
    return {
      object,
      possessive,
    };
  }

  const title = asString(answers[titleField], titleField);
  return defaultPronounsFromTitle(title);
}

function buildSkwSoloContext(answers: WizardAnswers): Record<string, string> {
  const applicantTitle = asString(answers.applicant_title, 'applicant_title');
  const applicantName = asString(answers.applicant_name, 'applicant_name');
  const applicantFull = formatFullName(applicantTitle, applicantName);
  const { possessive } = pronouns(answers, 'applicant_title');

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    uan: asString(answers.uan, 'uan'),
    applicant_title: applicantTitle,
    applicant_name: applicantName,
    applicant_full: applicantFull,
    applicant_pronoun_object: pronouns(answers, 'applicant_title').object,
    applicant_pronoun_possessive: possessive,
    subject_line: `Skilled worker visa application – ${applicantFull}`,
    advisor_name: ADVISOR_NAME,
    advisor_title: ADVISOR_TITLE,
    advisor_email: ADVISOR_EMAIL,
  };
}

function buildSkwWithSpouseDepContext(answers: WizardAnswers): Record<string, string> {
  const primaryTitle = asString(answers.primary_applicant_title, 'primary_applicant_title');
  const primaryName = asString(answers.primary_applicant_name, 'primary_applicant_name');
  const dependantTitle = asString(answers.dependant_title, 'dependant_title');
  const dependantName = asString(answers.dependant_name, 'dependant_name');
  const primaryFull = formatFullName(primaryTitle, primaryName);
  const dependantFull = formatFullName(dependantTitle, dependantName);
  const dependantRelationship = asString(
    answers.dependant_relationship,
    'dependant_relationship',
  );
  const dependantRelationshipPhrase = relationshipPhrase(dependantRelationship);
  const dependantPossessive = defaultPronounsFromTitle(dependantTitle).possessive;

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    application_refs_display: formatApplicationRefsSkwDep(
      asStringArray(answers.application_refs, 'application_refs'),
    ),
    primary_applicant_title: primaryTitle,
    primary_applicant_name: primaryName,
    primary_applicant_full: primaryFull,
    dependant_title: dependantTitle,
    dependant_name: dependantName,
    dependant_full: dependantFull,
    dependant_relationship: dependantRelationship,
    dependant_relationship_phrase: dependantRelationshipPhrase,
    extension_paragraph: buildExtensionParagraph({
      isExtension: asBoolean(answers.is_extension),
      primaryApplicantFull: primaryFull,
      dependantRelationshipPhrase,
      dependantFull,
      dependantPossessive,
    }),
    subject_line: `Skilled worker and dependant visa applications – ${primaryFull} and ${dependantFull}`,
    advisor_name: ADVISOR_NAME,
    advisor_title: ADVISOR_TITLE,
    advisor_email: ADVISOR_EMAIL,
  };
}

function buildFmPartnerDepContext(answers: WizardAnswers): Record<string, string> {
  const applicantTitle = asString(answers.applicant_title, 'applicant_title');
  const applicantName = asString(answers.applicant_name, 'applicant_name');
  const partnerTitle = asString(answers.partner_title, 'partner_title');
  const partnerName = asString(answers.partner_name, 'partner_name');
  const applicantFull = formatFullName(applicantTitle, applicantName);
  const partnerFull = formatFullName(partnerTitle, partnerName);
  const { possessive } = pronouns(answers, 'applicant_title');

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    uan: asString(answers.uan, 'uan'),
    applicant_title: applicantTitle,
    applicant_name: applicantName,
    applicant_full: applicantFull,
    partner_title: partnerTitle,
    partner_name: partnerName,
    partner_full: partnerFull,
    applicant_pronoun_possessive: possessive,
    partner_relationship_word: partnerRelationshipWord(),
    subject_line: `Partner dependant visa application under family route – ${applicantFull}`,
    advisor_name: ADVISOR_NAME,
    advisor_title: ADVISOR_TITLE,
    advisor_email: ADVISOR_EMAIL,
  };
}

function buildNatFamilyContext(answers: WizardAnswers): Record<string, string> {
  const leadTitle = asString(answers.lead_applicant_title, 'lead_applicant_title');
  const leadName = asString(answers.lead_applicant_name, 'lead_applicant_name');
  const leadFull = formatFullName(leadTitle, leadName);
  const additionalApplicants = Array.isArray(answers.applicants)
    ? asApplicantArray(answers.applicants, 'applicants')
    : [];
  const allApplicants: ApplicantNameFields[] = [
    { title: leadTitle, name: leadName },
    ...additionalApplicants,
  ];

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    application_refs_display: formatApplicationRefsNat(
      asStringArray(answers.application_refs, 'application_refs'),
    ),
    lead_applicant_title: leadTitle,
    lead_applicant_name: leadName,
    applicants_list: formatApplicantsList(allApplicants),
    ref_subject: buildNatRefSubject(leadFull),
    advisor_name: ADVISOR_NAME,
    advisor_title: ADVISOR_TITLE,
    advisor_email: ADVISOR_EMAIL,
  };
}

function buildSkdOutsideUkContext(answers: WizardAnswers): Record<string, string> {
  const applicants = asSkdApplicantArray(answers.applicants, 'applicants');
  const sponsorName = asString(answers.sponsor_name, 'sponsor_name');
  const sponsorRelationship = asString(answers.sponsor_relationship, 'sponsor_relationship');
  const applicantsShort = applicants
    .map((applicant) => formatFullName(applicant.title, applicant.name))
    .join(' and ');

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    applicant_gwf_lines: formatApplicantGwfLines(applicants),
    applicant_uan_lines: formatApplicantUanLines(applicants),
    applicants_names_list: formatSkdApplicantsNamesList(applicants),
    sponsor_name: sponsorName,
    sponsor_relationship: sponsorRelationship,
    sponsor_dependant_clause: buildSponsorDependantClause(sponsorName, sponsorRelationship),
    subject_line: `Skilled worker dependant visa application – ${applicantsShort}.`,
    advisor_name: ADVISOR_NAME,
    advisor_title: ADVISOR_TITLE,
    advisor_email: ADVISOR_EMAIL,
  };
}

function buildParentalConsentContext(answers: WizardAnswers): Record<string, string> {
  const childName = asString(answers.child_name, 'child_name');
  const parent1Name = asString(answers.parent1_name, 'parent1_name');
  const parent2Name = asString(answers.parent2_name, 'parent2_name');

  return {
    present_date: formatPresentDate(asOptionalString(answers.present_date)),
    child_name: childName,
    child_dob: formatDobDisplay(asString(answers.child_dob, 'child_dob')),
    child_passport_number: asString(answers.child_passport_number, 'child_passport_number'),
    visa_category_label: asString(answers.visa_category_label, 'visa_category_label'),
    parent1_name: parent1Name,
    parent1_passport_country: asString(
      answers.parent1_passport_country,
      'parent1_passport_country',
    ),
    parent1_passport_number: asString(
      answers.parent1_passport_number,
      'parent1_passport_number',
    ),
    parent2_name: parent2Name,
    parent2_passport_country: asString(
      answers.parent2_passport_country,
      'parent2_passport_country',
    ),
    parent2_passport_number: asString(
      answers.parent2_passport_number,
      'parent2_passport_number',
    ),
    shared_address: asString(answers.shared_address, 'shared_address'),
    application_uans_display: formatApplicationRefsParental(
      asStringArray(answers.application_refs, 'application_refs'),
    ),
    ref_line: buildParentalRefLine(childName),
    parent1_email: asString(answers.parent1_email, 'parent1_email'),
    parent1_mobile: asString(answers.parent1_mobile, 'parent1_mobile'),
    parent2_email: asString(answers.parent2_email, 'parent2_email'),
    parent2_mobile: asString(answers.parent2_mobile, 'parent2_mobile'),
    parent1_signatory_name: `Mr ${parent1Name}`,
    parent2_signatory_name: `Mrs ${parent2Name}`,
    child_pronoun_object: childPronounObject(),
  };
}

export function buildMergeContext(
  variantId: VariantId,
  answers: WizardAnswers,
): Record<string, string> {
  switch (variantId) {
    case 'covering_skw_solo':
      return buildSkwSoloContext(answers);
    case 'covering_skw_with_spouse_dep':
      return buildSkwWithSpouseDepContext(answers);
    case 'covering_fm_partner_dep':
      return buildFmPartnerDepContext(answers);
    case 'covering_nat_family':
      return buildNatFamilyContext(answers);
    case 'covering_skd_outside_uk':
      return buildSkdOutsideUkContext(answers);
    case 'parental_consent_straightforward':
      return buildParentalConsentContext(answers);
    default: {
      const exhaustive: never = variantId;
      throw new Error(`Unsupported variant: ${exhaustive}`);
    }
  }
}
