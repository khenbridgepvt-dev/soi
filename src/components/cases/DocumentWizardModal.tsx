'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatAnswerForReview,
  getWizardSchemaIdForVariant,
  getWizardSteps,
  TITLE_OPTIONS,
  validateWizardStep,
  type WizardField,
  type WizardStep,
} from '@/lib/documents/wizard-ui-config';
import {
  buildDefaultAnswersForVariant,
  buildWizardPrefill,
  mergeAnswersWithDefaults,
  type WizardPrefillContext,
} from '@/lib/documents/wizard-prefill';
import type { DocumentKind, VariantId } from '@/lib/documents/types';

type ApiError = {
  error?: { message?: string };
};

type VariantOptionsResponse = {
  suggested_variant_id: VariantId | null;
  variants: Array<{ id: VariantId; label: string }>;
};

type DocumentWizardModalProps = {
  open: boolean;
  caseId: string;
  kind: DocumentKind;
  prefillContext: WizardPrefillContext;
  initialVariantId?: VariantId;
  initialAnswers?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
};

function setNestedAnswer(
  answers: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return { ...answers, [key]: value };
}

function WizardFieldInput({
  field,
  answers,
  onChange,
}: {
  field: WizardField;
  answers: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = answers[field.key];

  if (field.type === 'select') {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">Select…</option>
        {(field.options ?? TITLE_OPTIONS).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={value === true}
            onChange={() => onChange(field.key, true)}
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={value === false}
            onChange={() => onChange(field.key, false)}
          />
          No
        </label>
      </div>
    );
  }

  if (field.type === 'repeat_text') {
    const items = Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item : ''))
      : [''];

    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={item}
              placeholder={field.placeholder}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(field.key, next);
              }}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(field.key, [...items, ''])}
          className="text-sm font-medium text-[#0F2B5B] hover:underline"
        >
          + Add another
        </button>
      </div>
    );
  }

  if (field.type === 'repeat_applicant') {
    const items = Array.isArray(value)
      ? value.map((item) =>
          item && typeof item === 'object'
            ? (item as { title?: string; name?: string })
            : { title: 'Mr', name: '' },
        )
      : [{ title: 'Mr', name: '' }];

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <select
              value={item.title ?? 'Mr'}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], title: event.target.value };
                onChange(field.key, next);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {TITLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={item.name ?? ''}
              placeholder="Full name"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], name: event.target.value };
                onChange(field.key, next);
              }}
              className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(field.key, [...items, { title: 'Mr', name: '' }])}
          className="text-sm font-medium text-[#0F2B5B] hover:underline"
        >
          + Add applicant
        </button>
      </div>
    );
  }

  if (field.type === 'repeat_skd_applicant') {
    const items = Array.isArray(value)
      ? value.map((item) =>
          item && typeof item === 'object'
            ? (item as { title?: string; name?: string; gwf?: string; uan?: string })
            : { title: 'Mrs', name: '', gwf: '', uan: '' },
        )
      : [{ title: 'Mrs', name: '', gwf: '', uan: '' }];

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={item.title ?? 'Mrs'}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...next[index], title: event.target.value };
                  onChange(field.key, next);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {TITLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={item.name ?? ''}
                placeholder="Full name"
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...next[index], name: event.target.value };
                  onChange(field.key, next);
                }}
                className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              value={item.gwf ?? ''}
              placeholder="GWF"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], gwf: event.target.value };
                onChange(field.key, next);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={item.uan ?? ''}
              placeholder="UAN"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], uan: event.target.value };
                onChange(field.key, next);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                className="text-sm text-slate-600 hover:underline"
              >
                Remove applicant
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange(field.key, [...items, { title: 'Mrs', name: '', gwf: '', uan: '' }])
          }
          className="text-sm font-medium text-[#0F2B5B] hover:underline"
        >
          + Add dependant applicant
        </button>
      </div>
    );
  }

  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      placeholder={field.placeholder}
      onChange={(event) => onChange(field.key, event.target.value)}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
    />
  );
}

function ReviewSummary({
  steps,
  answers,
}: {
  steps: WizardStep[];
  answers: Record<string, unknown>;
}) {
  const fields = steps
    .filter((step) => !step.isReview)
    .flatMap((step) => step.fields);

  return (
    <dl className="space-y-3 text-sm">
      {fields.map((field) => (
        <div key={field.key}>
          <dt className="font-medium text-slate-900">{field.label}</dt>
          <dd className="mt-0.5 text-slate-700">{formatAnswerForReview(field, answers)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function DocumentWizardModal({
  open,
  caseId,
  kind,
  prefillContext,
  initialVariantId,
  initialAnswers,
  onClose,
  onSaved,
}: DocumentWizardModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<VariantOptionsResponse | null>(null);
  const [variantId, setVariantId] = useState<VariantId | ''>('');
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const wizardSchemaId = variantId ? getWizardSchemaIdForVariant(variantId) : null;
  const steps = useMemo(
    () => (wizardSchemaId ? getWizardSteps(wizardSchemaId) : []),
    [wizardSchemaId],
  );
  const currentStep = steps[stepIndex] ?? null;
  const isReviewStep = Boolean(currentStep?.isReview);

  const resetWizard = useCallback(
    (nextVariantId: VariantId, nextAnswers?: Record<string, unknown>) => {
      setVariantId(nextVariantId);
      setStepIndex(0);
      setStepError(null);
      setAnswers(
        nextAnswers ??
          buildDefaultAnswersForVariant(nextVariantId, prefillContext),
      );
    },
    [prefillContext],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setBannerError(null);
    setStepError(null);
    setLoading(true);

    async function load() {
      try {
        const response = await fetch(
          `/api/cases/${caseId}/documents/variants?kind=${kind}`,
        );
        const json = (await response.json()) as {
          data?: VariantOptionsResponse;
        } & ApiError;

        if (!response.ok || !json.data) {
          throw new Error(json.error?.message ?? 'Failed to load document variants.');
        }

        setVariantOptions(json.data);

        const resolvedVariant =
          initialVariantId ??
          json.data.suggested_variant_id ??
          json.data.variants[0]?.id;

        if (!resolvedVariant) {
          throw new Error('No document variants are available for this case.');
        }

        const prefill = buildWizardPrefill(prefillContext);
        const schemaId = getWizardSchemaIdForVariant(resolvedVariant);
        const mergedAnswers = initialAnswers
          ? mergeAnswersWithDefaults(schemaId, initialAnswers, prefill)
          : buildDefaultAnswersForVariant(resolvedVariant, prefillContext);

        resetWizard(resolvedVariant, mergedAnswers);
      } catch (error) {
        setBannerError(
          error instanceof Error ? error.message : 'Failed to open document wizard.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [open, caseId, kind, initialVariantId, initialAnswers, prefillContext, resetWizard]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, saving]);

  const canGoBack = stepIndex > 0;
  const isLastStep = stepIndex === steps.length - 1;

  const reviewSteps = useMemo(() => steps.filter((step) => !step.isReview), [steps]);

  function handleFieldChange(key: string, value: unknown) {
    setAnswers((current) => setNestedAnswer(current, key, value));
    setStepError(null);
  }

  function handleVariantChange(nextVariantId: VariantId) {
    resetWizard(nextVariantId);
  }

  function handleNext() {
    if (!currentStep) {
      return;
    }

    const validationError = validateWizardStep(currentStep, answers);
    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  async function handleSave() {
    if (!variantId) {
      return;
    }

    setSaving(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/documents/${kind}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variantId,
          answers,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to save document.');
      }

      onSaved();
      onClose();
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : 'Failed to save document.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  const kindLabel = kind === 'covering_letter' ? 'Covering letter' : 'Parental consent';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="flex max-h-[95vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-lg bg-white shadow-lg md:max-h-[90vh] md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-wizard-title"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="document-wizard-title" className="text-lg font-semibold text-slate-900">
              {kindLabel}
            </h2>
            {steps.length > 0 && (
              <p className="mt-1 text-sm text-slate-600">
                Step {stepIndex + 1} of {steps.length}
                {currentStep ? ` · ${currentStep.title}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {bannerError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {bannerError}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-600">Loading wizard…</p>
          ) : (
            <div className="space-y-4">
              {variantOptions && variantOptions.variants.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">
                    Letter variant
                  </label>
                  <select
                    value={variantId}
                    onChange={(event) =>
                      handleVariantChange(event.target.value as VariantId)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    {variantOptions.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentStep && (
                <>
                  {currentStep.description && (
                    <p className="text-sm text-slate-600">{currentStep.description}</p>
                  )}

                  {isReviewStep ? (
                    <ReviewSummary steps={reviewSteps} answers={answers} />
                  ) : (
                    <div className="space-y-4">
                      {currentStep.fields.map((field) => (
                        <div key={field.key}>
                          <label className="mb-1 block text-sm font-medium text-slate-900">
                            {field.label}
                            {field.required ? ' *' : ''}
                          </label>
                          <WizardFieldInput
                            field={field}
                            answers={answers}
                            onChange={handleFieldChange}
                          />
                          {field.hint && (
                            <p className="mt-1 text-xs text-slate-500">{field.hint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {stepError && (
                    <p className="text-sm text-red-700">{stepError}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canGoBack || saving || loading}
              onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                disabled={saving || loading || !variantId}
                onClick={handleSave}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !currentStep}
                onClick={handleNext}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
