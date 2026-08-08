import { describe, expect, it } from 'vitest';

import {
  buildDefaultAnswersForVariant,
  buildWizardPrefill,
} from '@/lib/documents/wizard-prefill';
import {
  getWizardSteps,
  validateWizardStep,
} from '@/lib/documents/wizard-ui-config';

describe('wizard-prefill', () => {
  const context = {
    clientFirstName: 'Jane',
    clientLastName: 'Doe',
    applicationTypeCode: 'SKW',
    dependants: [
      { name: 'John Doe', relationship: 'spouse' },
      { name: 'Amy Doe', relationship: 'child' },
    ],
  };

  it('prefills SKW solo applicant from case client', () => {
    const prefill = buildWizardPrefill(context);
    expect(prefill.applicant_name).toBe('Jane Doe');
    expect(prefill.present_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('prefills SKW with dependant names', () => {
    const answers = buildDefaultAnswersForVariant('covering_skw_with_spouse_dep', context);
    expect(answers.primary_applicant_name).toBe('Jane Doe');
    expect(answers.dependant_name).toBe('John Doe');
  });

  it('prefills parental consent child name', () => {
    const answers = buildDefaultAnswersForVariant(
      'parental_consent_straightforward',
      context,
    );
    expect(answers.child_name).toBe('Amy Doe');
  });
});

describe('wizard-ui-config', () => {
  it('returns steps for each wizard schema', () => {
    const steps = getWizardSteps('wizard_covering_skw_solo');
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.at(-1)?.isReview).toBe(true);
  });

  it('validates required text fields', () => {
    const steps = getWizardSteps('wizard_covering_skw_solo');
    const nameStep = steps[0];
    expect(validateWizardStep(nameStep, {})).toContain('required');
    expect(validateWizardStep(nameStep, { applicant_name: 'Jane Doe' })).toBeNull();
  });
});
