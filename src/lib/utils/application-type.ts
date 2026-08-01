export const APPLICATION_TYPE_CODE_REGEX = /^[A-Z]{3}$/;

export const APPLICATION_TYPE_CODE_FORMAT_ERROR =
  'Code must be exactly 3 uppercase letters (e.g., SKW).';

export const APPLICATION_TYPE_NAME_MIN = 2;
export const APPLICATION_TYPE_NAME_MAX = 100;

export function normalizeApplicationTypeCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidApplicationTypeCode(code: string): boolean {
  return APPLICATION_TYPE_CODE_REGEX.test(code);
}

export function validateApplicationTypeCode(input: string): {
  ok: true;
  code: string;
} | { ok: false; message: string } {
  const code = normalizeApplicationTypeCode(input);

  if (!isValidApplicationTypeCode(code)) {
    return { ok: false, message: APPLICATION_TYPE_CODE_FORMAT_ERROR };
  }

  return { ok: true, code };
}

export function validateApplicationTypeName(input: string): {
  ok: true;
  name: string;
} | { ok: false; message: string } {
  const name = input.trim();

  if (name.length < APPLICATION_TYPE_NAME_MIN || name.length > APPLICATION_TYPE_NAME_MAX) {
    return {
      ok: false,
      message: `Name must be between ${APPLICATION_TYPE_NAME_MIN} and ${APPLICATION_TYPE_NAME_MAX} characters.`,
    };
  }

  return { ok: true, name };
}
