const DEFAULT_APP_DISPLAY_NAME = 'Soi (Beta)';

/** Product name shown in the shell, login, and document title (overridable via env). */
export function getAppDisplayName(): string {
  const configured = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_APP_DISPLAY_NAME;
}

/** Two-letter monogram for auth screens derived from the display name. */
export function getAppMonogram(name: string = getAppDisplayName()): string {
  const words = name
    .replace(/\([^)]*\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }

  return 'SB';
}
