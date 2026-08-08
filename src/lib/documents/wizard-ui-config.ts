import { DEFAULT_VISA_CATEGORY_LABEL } from './constants';
import type { VariantId, WizardSchemaId } from './types';

export const TITLE_OPTIONS = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Dr', label: 'Dr' },
] as const;

export const PRONOUN_OBJECT_OPTIONS = [
  { value: 'him', label: 'him' },
  { value: 'her', label: 'her' },
] as const;

export const PRONOUN_POSSESSIVE_OPTIONS = [
  { value: 'his', label: 'his' },
  { value: 'her', label: 'her' },
] as const;

export type WizardFieldType =
  | 'text'
  | 'select'
  | 'date'
  | 'boolean'
  | 'repeat_text'
  | 'repeat_applicant'
  | 'repeat_skd_applicant';

export type WizardFieldOption = {
  value: string;
  label: string;
};

export type WizardField = {
  key: string;
  label: string;
  type: WizardFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: readonly WizardFieldOption[];
};

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  fields: WizardField[];
  isReview?: boolean;
};

export const VARIANT_WIZARD_SCHEMA: Record<VariantId, WizardSchemaId> = {
  covering_skw_solo: 'wizard_covering_skw_solo',
  covering_skw_with_spouse_dep: 'wizard_covering_skw_with_spouse_dep',
  covering_fm_partner_dep: 'wizard_covering_fm_partner_dep',
  covering_nat_family: 'wizard_covering_nat_family',
  covering_skd_outside_uk: 'wizard_covering_skd_outside_uk',
  parental_consent_straightforward: 'wizard_parental_consent_straightforward',
};

const REVIEW_STEP: WizardStep = {
  id: 'review',
  title: 'Review',
  description: 'Check your answers before saving.',
  fields: [],
  isReview: true,
};

const WIZARD_STEPS: Record<WizardSchemaId, WizardStep[]> = {
  wizard_covering_skw_solo: [
    {
      id: 'applicant_name',
      title: 'Applicant name',
      description: 'Confirm the skilled worker applicant name.',
      fields: [{ key: 'applicant_name', label: 'Applicant name', type: 'text', required: true }],
    },
    {
      id: 'applicant_title',
      title: 'Applicant title',
      fields: [
        {
          key: 'applicant_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'uan',
      title: 'UAN',
      fields: [
        {
          key: 'uan',
          label: 'UAN',
          type: 'text',
          required: true,
          placeholder: '1212-0001-xxxx-xxxx',
        },
      ],
    },
    {
      id: 'pronouns',
      title: 'Pronouns',
      description: 'Used in the letter body.',
      fields: [
        {
          key: 'applicant_pronoun_object',
          label: 'Object pronoun',
          type: 'select',
          required: true,
          options: PRONOUN_OBJECT_OPTIONS,
        },
        {
          key: 'applicant_pronoun_possessive',
          label: 'Possessive pronoun',
          type: 'select',
          required: true,
          options: PRONOUN_POSSESSIVE_OPTIONS,
        },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
  wizard_covering_skw_with_spouse_dep: [
    {
      id: 'primary_applicant',
      title: 'Primary applicant',
      fields: [
        {
          key: 'primary_applicant_name',
          label: 'Skilled worker name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'primary_title',
      title: 'Primary applicant title',
      fields: [
        {
          key: 'primary_applicant_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'dependant_name',
      title: 'Dependant name',
      fields: [{ key: 'dependant_name', label: 'Dependant name', type: 'text', required: true }],
    },
    {
      id: 'dependant_title',
      title: 'Dependant title',
      fields: [
        {
          key: 'dependant_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'dependant_relationship',
      title: 'Dependant relationship',
      fields: [
        {
          key: 'dependant_relationship',
          label: 'Relationship',
          type: 'text',
          required: true,
          placeholder: 'e.g. husband, wife, partner',
        },
      ],
    },
    {
      id: 'application_refs',
      title: 'Application references',
      fields: [
        {
          key: 'application_refs',
          label: 'UAN / reference numbers',
          type: 'repeat_text',
          required: true,
          placeholder: '1212-0001-xxxx-xxxx/00',
        },
      ],
    },
    {
      id: 'is_extension',
      title: 'Extension application?',
      fields: [
        {
          key: 'is_extension',
          label: 'Is this an extension application?',
          type: 'boolean',
          required: true,
        },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
  wizard_covering_fm_partner_dep: [
    {
      id: 'applicant_name',
      title: 'Dependant applicant name',
      fields: [{ key: 'applicant_name', label: 'Applicant name', type: 'text', required: true }],
    },
    {
      id: 'applicant_title',
      title: 'Applicant title',
      fields: [
        {
          key: 'applicant_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'partner_name',
      title: 'Partner in the UK',
      fields: [{ key: 'partner_name', label: 'Partner name', type: 'text', required: true }],
    },
    {
      id: 'partner_title',
      title: 'Partner title',
      fields: [
        {
          key: 'partner_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'uan',
      title: 'UAN',
      fields: [
        {
          key: 'uan',
          label: 'UAN',
          type: 'text',
          required: true,
          placeholder: '1212-0001-xxxx-xxxx',
        },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
  wizard_covering_nat_family: [
    {
      id: 'lead_applicant',
      title: 'Lead applicant',
      fields: [
        {
          key: 'lead_applicant_name',
          label: 'Lead applicant name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'lead_title',
      title: 'Lead applicant title',
      fields: [
        {
          key: 'lead_applicant_title',
          label: 'Title',
          type: 'select',
          required: true,
          options: TITLE_OPTIONS,
        },
      ],
    },
    {
      id: 'applicants',
      title: 'Additional applicants',
      description: 'Add each family member included in the application.',
      fields: [
        {
          key: 'applicants',
          label: 'Applicants',
          type: 'repeat_applicant',
          required: true,
        },
      ],
    },
    {
      id: 'application_refs',
      title: 'Application references',
      fields: [
        {
          key: 'application_refs',
          label: 'UAN / reference numbers',
          type: 'repeat_text',
          required: true,
          placeholder: '1212-0001-xxxx-xxxx/00',
        },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
  wizard_covering_skd_outside_uk: [
    {
      id: 'sponsor',
      title: 'Sponsor name',
      fields: [
        {
          key: 'sponsor_name',
          label: 'Sponsor (main skilled worker)',
          type: 'text',
          required: true,
          placeholder: 'Mr John Doe',
        },
      ],
    },
    {
      id: 'sponsor_relationship',
      title: 'Sponsor relationship',
      fields: [
        {
          key: 'sponsor_relationship',
          label: 'Relationship to dependants',
          type: 'text',
          required: true,
          placeholder: 'husband, father, etc.',
        },
      ],
    },
    {
      id: 'applicants',
      title: 'Dependant applicants',
      description: 'Add each dependant applying outside the UK.',
      fields: [
        {
          key: 'applicants',
          label: 'Dependant applicants',
          type: 'repeat_skd_applicant',
          required: true,
        },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
  wizard_parental_consent_straightforward: [
    {
      id: 'child_name',
      title: "Child's name",
      fields: [{ key: 'child_name', label: 'Child full name', type: 'text', required: true }],
    },
    {
      id: 'child_dob',
      title: "Child's date of birth",
      fields: [
        {
          key: 'child_dob',
          label: 'Date of birth',
          type: 'text',
          required: true,
          placeholder: 'DD/MM/YYYY',
        },
      ],
    },
    {
      id: 'child_passport',
      title: "Child's passport",
      fields: [
        {
          key: 'child_passport_number',
          label: 'Passport number',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'visa_category',
      title: 'Visa category',
      fields: [
        {
          key: 'visa_category_label',
          label: 'Visa category wording',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'parent1_name',
      title: 'Parent 1 name',
      fields: [{ key: 'parent1_name', label: 'Parent 1 full name', type: 'text', required: true }],
    },
    {
      id: 'parent1_passport_country',
      title: 'Parent 1 passport country',
      fields: [
        {
          key: 'parent1_passport_country',
          label: 'Passport country',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'parent1_passport_number',
      title: 'Parent 1 passport number',
      fields: [
        {
          key: 'parent1_passport_number',
          label: 'Passport number',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'parent2_name',
      title: 'Parent 2 name',
      fields: [{ key: 'parent2_name', label: 'Parent 2 full name', type: 'text', required: true }],
    },
    {
      id: 'parent2_passport_country',
      title: 'Parent 2 passport country',
      fields: [
        {
          key: 'parent2_passport_country',
          label: 'Passport country',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'parent2_passport_number',
      title: 'Parent 2 passport number',
      fields: [
        {
          key: 'parent2_passport_number',
          label: 'Passport number',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'shared_address',
      title: 'Family address',
      fields: [
        {
          key: 'shared_address',
          label: 'Shared address',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'application_refs',
      title: 'Application UAN(s)',
      fields: [
        {
          key: 'application_refs',
          label: 'UAN / reference numbers',
          type: 'repeat_text',
          required: true,
        },
      ],
    },
    {
      id: 'parent1_contact',
      title: 'Parent 1 contact',
      fields: [
        { key: 'parent1_email', label: 'Email', type: 'text', required: true },
        { key: 'parent1_mobile', label: 'Mobile', type: 'text', required: true },
      ],
    },
    {
      id: 'parent2_contact',
      title: 'Parent 2 contact',
      fields: [
        { key: 'parent2_email', label: 'Email', type: 'text', required: true },
        { key: 'parent2_mobile', label: 'Mobile', type: 'text', required: true },
      ],
    },
    {
      id: 'present_date',
      title: 'Letter date',
      fields: [{ key: 'present_date', label: 'Date', type: 'date', required: true }],
    },
    REVIEW_STEP,
  ],
};

export function getWizardSchemaIdForVariant(variantId: VariantId): WizardSchemaId {
  return VARIANT_WIZARD_SCHEMA[variantId];
}

export function getWizardSteps(wizardSchemaId: WizardSchemaId): WizardStep[] {
  return WIZARD_STEPS[wizardSchemaId] ?? [];
}

export function buildDefaultAnswers(
  wizardSchemaId: WizardSchemaId,
  prefill: Record<string, unknown> = {},
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    present_date: new Date().toISOString().slice(0, 10),
    visa_category_label: DEFAULT_VISA_CATEGORY_LABEL,
    application_refs: [''],
    applicants: [{ title: 'Mr', name: '' }],
    is_extension: false,
    ...prefill,
  };

  if (wizardSchemaId === 'wizard_covering_skd_outside_uk') {
    defaults.applicants = [{ title: 'Mrs', name: '', gwf: '', uan: '' }];
  }

  if (wizardSchemaId === 'wizard_covering_nat_family') {
    defaults.applicants = [{ title: 'Mr', name: '' }];
  }

  return defaults;
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateWizardStep(
  step: WizardStep,
  answers: Record<string, unknown>,
): string | null {
  if (step.isReview) {
    return null;
  }

  for (const field of step.fields) {
    const value = answers[field.key];

    if (field.type === 'repeat_text') {
      const items = Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' && item.trim())
        : [];
      if (field.required && items.length === 0) {
        return `${field.label} requires at least one entry.`;
      }
      continue;
    }

    if (field.type === 'repeat_applicant') {
      const items = Array.isArray(value) ? value : [];
      const valid = items.filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          isNonEmptyString((item as { name?: string }).name),
      );
      if (field.required && valid.length === 0) {
        return 'Add at least one applicant with a name.';
      }
      continue;
    }

    if (field.type === 'repeat_skd_applicant') {
      const items = Array.isArray(value) ? value : [];
      const valid = items.filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          isNonEmptyString((item as { name?: string }).name) &&
          isNonEmptyString((item as { gwf?: string }).gwf) &&
          isNonEmptyString((item as { uan?: string }).uan),
      );
      if (field.required && valid.length === 0) {
        return 'Add at least one dependant applicant with name, GWF, and UAN.';
      }
      continue;
    }

    if (field.type === 'boolean') {
      if (field.required && typeof value !== 'boolean') {
        return `${field.label} is required.`;
      }
      continue;
    }

    if (field.required && !isNonEmptyString(value)) {
      return `${field.label} is required.`;
    }
  }

  return null;
}

export function formatAnswerForReview(
  field: WizardField,
  answers: Record<string, unknown>,
): string {
  const value = answers[field.key];

  if (field.type === 'boolean') {
    return value === true ? 'Yes' : value === false ? 'No' : '—';
  }

  if (field.type === 'repeat_text') {
    const items = Array.isArray(value)
      ? value.filter((item) => typeof item === 'string' && item.trim())
      : [];
    return items.length > 0 ? items.join(', ') : '—';
  }

  if (field.type === 'repeat_applicant' || field.type === 'repeat_skd_applicant') {
    const items = Array.isArray(value) ? value : [];
    if (items.length === 0) {
      return '—';
    }
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }
        const row = item as Record<string, string>;
        const name = [row.title, row.name].filter(Boolean).join(' ');
        if (field.type === 'repeat_skd_applicant') {
          return [name, row.gwf, row.uan].filter(Boolean).join(' · ');
        }
        return name;
      })
      .filter(Boolean)
      .join('; ');
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return '—';
}
