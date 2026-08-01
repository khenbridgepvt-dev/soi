export const DEPENDANT_NAME_MAX = 100;
export const DEPENDANT_RELATIONSHIP_MAX = 50;

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
): { ok: true; value: string } | { ok: false; message: string } {
  const value = (input ?? '').trim();

  if (!value) {
    return { ok: false, message: 'Relationship is required.' };
  }

  if (value.length > DEPENDANT_RELATIONSHIP_MAX) {
    return {
      ok: false,
      message: `Relationship must be at most ${DEPENDANT_RELATIONSHIP_MAX} characters.`,
    };
  }

  return { ok: true, value };
}
