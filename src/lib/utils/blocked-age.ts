export function formatBlockedAge(blockedAt: string, now = new Date()): string {
  const blocked = new Date(blockedAt);
  const diffMs = now.getTime() - blocked.getTime();

  if (diffMs < 0) {
    return 'just now';
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    return minutes <= 1 ? 'just now' : `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}
