export type HistoryCursor = {
  completed_at: string;
  id: string;
};

export function encodeHistoryCursor(completedAt: string, taskId: string): string {
  const payload = JSON.stringify({ completed_at: completedAt, id: taskId });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeHistoryCursor(cursor: string): HistoryCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as HistoryCursor;
    if (typeof parsed.completed_at !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clampHistoryLimit(limit: number | undefined, defaultLimit = 10, max = 20): number {
  if (!limit || Number.isNaN(limit)) {
    return defaultLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), max);
}
