export const DEPENDANT_NAME_MAX = 100;

export const DEPENDANT_RELATIONSHIPS = [
  'spouse',
  'partner',
  'child',
  'other',
] as const;

export type DependantRelationship = (typeof DEPENDANT_RELATIONSHIPS)[number];

export const DEPENDANT_RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: DependantRelationship;
  label: string;
}> = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
];

const RELATIONSHIP_SET = new Set<string>(DEPENDANT_RELATIONSHIPS);

export function isDependantRelationship(
  value: string,
): value is DependantRelationship {
  return RELATIONSHIP_SET.has(value);
}

export function formatDependantRelationshipLabel(
  relationship: string,
): string {
  return (
    DEPENDANT_RELATIONSHIP_OPTIONS.find((option) => option.value === relationship)
      ?.label ?? relationship
  );
}

export function validateDependantName(
  input: string | undefined,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (!value) {
    return { ok: false, message: 'Name is required.' };
  }

  if (value.length > DEPENDANT_NAME_MAX) {
    return {
      ok: false,
      message: `Name must be at most ${DEPENDANT_NAME_MAX} characters.`,
    };
  }

  return { ok: true, value };
}

export function validateDependantRelationship(
  input: string | undefined,
): { ok: true; value: DependantRelationship } | { ok: false; message: string } {
  const value = (input ?? '').trim().toLowerCase();

  if (!value) {
    return { ok: false, message: 'Relationship is required.' };
  }

  if (!isDependantRelationship(value)) {
    return {
      ok: false,
      message: 'Relationship must be spouse, partner, child, or other.',
    };
  }

  return { ok: true, value };
}
