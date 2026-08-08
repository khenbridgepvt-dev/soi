'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';

type LetterheadStatus = {
  source: 'storage' | 'bundled';
  storage_path: string;
  bundled_path: string;
  updated_at: string | null;
};

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

const ACCEPTED_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function CoveringLetterheadSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    data: status,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.coveringLetterhead(),
    queryFn: async () => {
      const response = await fetch('/api/settings/covering-letterhead');
      const json = (await response.json()) as { data?: LetterheadStatus } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load letterhead status.');
      }

      return json.data!;
    },
  });

  const loadError =
    isError && queryError instanceof Error
      ? queryError.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;
  const displayError = bannerError ?? loadError;

  async function handleUpload(file: File) {
    setBannerError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/settings/covering-letterhead', {
        method: 'POST',
        body: formData,
      });
      const json = (await response.json()) as { data?: LetterheadStatus } & ApiError;

      if (!response.ok) {
        const detail = json.error?.details?.[0]?.message;
        throw new Error(detail ?? json.error?.message ?? 'Upload failed.');
      }

      await refetch();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleUpload(file);
  }

  const usingCustom = status?.source === 'storage';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Settings
        </p>
        <h1 className="text-xl font-semibold text-text">Covering Letter Letterhead</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Upload a Word letterhead shell with a{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">{'{{body}}'}</code> placeholder.
          Covering letter DOCX exports use the uploaded file when present; otherwise the bundled
          default is used. PDF exports remain plain text.
        </p>
      </div>

      {displayError && (
        <div
          role="alert"
          className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
        >
          {displayError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border bg-page px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Current letterhead</h2>
        </div>
        <dl className="divide-y divide-border text-sm">
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-text-secondary">Source</dt>
            <dd className="text-text">
              {isLoading
                ? 'Loading…'
                : usingCustom
                  ? 'Custom upload (Storage)'
                  : 'Bundled default'}
            </dd>
          </div>
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-text-secondary">Storage path</dt>
            <dd className="font-mono text-xs text-text-secondary">
              {status?.storage_path ?? 'letterhead/covering-letter-shell.docx'}
            </dd>
          </div>
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-text-secondary">Bundled fallback</dt>
            <dd className="font-mono text-xs text-text-secondary">
              {status?.bundled_path ?? 'docs/templates/letterhead/covering-letter-shell.docx'}
            </dd>
          </div>
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-text-secondary">Last updated</dt>
            <dd className="text-text">{formatUpdatedAt(status?.updated_at ?? null)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Upload replacement</h2>
        <p className="mt-1 text-sm text-text-secondary">
          DOCX only, max 5 MB. The file must include{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">{'{{body}}'}</code> where letter
          content is inserted. Uploading overwrites the previous custom letterhead.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_DOCX}
            onChange={onFileChange}
            disabled={uploading}
            className="block max-w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:border-border file:bg-page file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-surface"
          />
          {uploading && (
            <span className="text-sm text-text-muted" aria-live="polite">
              Uploading…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
