import type { WizardSchemaId } from './types';
import { buildDefaultAnswers, getWizardSchemaIdForVariant } from './wizard-ui-config';
import type { VariantId } from './types';

export type WizardPrefillDependant = {
  name: string;
  relationship: string;
};

export type WizardPrefillContext = {
  clientFirstName: string;
  clientLastName: string;
  applicationTypeCode: string;
  dependants: WizardPrefillDependant[];
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function findSpouseOrPartner(
  dependants: WizardPrefillDependant[],
): WizardPrefillDependant | undefined {
  return dependants.find(
    (dependant) => dependant.relationship === 'spouse' || dependant.relationship === 'partner',
  );
}

function findChild(dependants: WizardPrefillDependant[]): WizardPrefillDependant | undefined {
  return dependants.find((dependant) => dependant.relationship === 'child');
}

function pronounsFromTitle(title: string): {
  applicant_pronoun_object: string;
  applicant_pronoun_possessive: string;
} {
  const feminine = title === 'Mrs' || title === 'Ms' || title === 'Miss';
  return feminine
    ? { applicant_pronoun_object: 'her', applicant_pronoun_possessive: 'her' }
    : { applicant_pronoun_object: 'him', applicant_pronoun_possessive: 'his' };
}

export function buildWizardPrefill(
  context: WizardPrefillContext,
): Record<string, unknown> {
  const applicantName = fullName(context.clientFirstName, context.clientLastName);
  const spouseOrPartner = findSpouseOrPartner(context.dependants);
  const child = findChild(context.dependants);

  return {
    applicant_name: applicantName,
    primary_applicant_name: applicantName,
    lead_applicant_name: applicantName,
    partner_name: applicantName,
    sponsor_name: applicantName,
    dependant_name: spouseOrPartner?.name ?? '',
    dependant_relationship: spouseOrPartner?.relationship ?? '',
    child_name: child?.name ?? '',
    present_date: todayIsoDate(),
    application_type_code: context.applicationTypeCode,
  };
}

export function buildDefaultAnswersForVariant(
  variantId: VariantId,
  context: WizardPrefillContext,
): Record<string, unknown> {
  const wizardSchemaId = getWizardSchemaIdForVariant(variantId);
  const prefill = buildWizardPrefill(context);
  const applicantName = `${context.clientFirstName} ${context.clientLastName}`.trim();
  const spouseOrPartner = findSpouseOrPartner(context.dependants);

  const defaults = buildDefaultAnswers(wizardSchemaId, prefill);

  if (wizardSchemaId === 'wizard_covering_skw_solo') {
    const title = 'Mr';
    return {
      ...defaults,
      applicant_title: title,
      ...pronounsFromTitle(title),
    };
  }

  if (wizardSchemaId === 'wizard_covering_skw_with_spouse_dep') {
    return {
      ...defaults,
      primary_applicant_title: 'Mrs',
      dependant_title: 'Mr',
      application_refs: [''],
      is_extension: false,
    };
  }

  if (wizardSchemaId === 'wizard_covering_fm_partner_dep') {
    return {
      ...defaults,
      applicant_name: spouseOrPartner?.name ?? '',
      applicant_title: 'Mr',
      partner_name: applicantName,
      partner_title: 'Mrs',
    };
  }

  if (wizardSchemaId === 'wizard_covering_nat_family') {
    return {
      ...defaults,
      lead_applicant_title: 'Ms',
      applicants: spouseOrPartner
        ? [{ title: 'Mr', name: spouseOrPartner.name }]
        : [{ title: 'Mr', name: '' }],
      application_refs: [''],
    };
  }

  if (wizardSchemaId === 'wizard_covering_skd_outside_uk') {
    const dependants = context.dependants.filter(
      (dependant) => dependant.relationship === 'child' || dependant.relationship === 'spouse',
    );
    return {
      ...defaults,
      sponsor_name: `Mr. ${applicantName}`,
      sponsor_relationship: spouseOrPartner ? 'husband' : 'father',
      applicants:
        dependants.length > 0
          ? dependants.map((dependant) => ({
              title: dependant.relationship === 'child' ? 'Miss' : 'Mrs',
              name: dependant.name,
              gwf: '',
              uan: '',
            }))
          : [{ title: 'Mrs', name: '', gwf: '', uan: '' }],
    };
  }

  if (wizardSchemaId === 'wizard_parental_consent_straightforward') {
    return {
      ...defaults,
      application_refs: [''],
    };
  }

  return defaults;
}

export function mergeAnswersWithDefaults(
  wizardSchemaId: WizardSchemaId,
  answers: Record<string, unknown>,
  prefill: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...buildDefaultAnswers(wizardSchemaId, prefill),
    ...answers,
  };
}
