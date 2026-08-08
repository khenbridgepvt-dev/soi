import type { DocumentKind } from './types';

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

export async function downloadCaseDocument(
  caseId: string,
  kind: DocumentKind,
  format: 'docx' | 'pdf',
): Promise<void> {
  const response = await fetch(
    `/api/cases/${caseId}/documents/${kind}/download?format=${format}`,
  );

  if (!response.ok) {
    let message = 'Failed to download document.';
    try {
      const json = (await response.json()) as { error?: { message?: string } };
      message = json.error?.message ?? message;
    } catch {
      // Binary or empty error body — keep default message.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
    `${kind}.${format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
