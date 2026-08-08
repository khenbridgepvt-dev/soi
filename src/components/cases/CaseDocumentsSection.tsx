'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import DocumentWizardModal from '@/components/cases/DocumentWizardModal';
import { downloadCaseDocument } from '@/lib/documents/download-case-document';
import type { WizardPrefillContext } from '@/lib/documents/wizard-prefill';
import type { DocumentKind, VariantId } from '@/lib/documents/types';

type DependantSummary = {
  name: string;
  relationship: string;
};

type CaseDocumentListItem = {
  kind: DocumentKind;
  variant_id: VariantId;
  wizard_schema_id: string;
  updated_at: string;
  updated_by: string;
};

type CaseDocumentDetail = CaseDocumentListItem & {
  answers: Record<string, unknown>;
  merged_text: string;
  merged_html: string | null;
};

type CaseDocumentsSectionProps = {
  caseId: string;
  readOnly: boolean;
  clientFirstName: string;
  clientLastName: string;
  applicationTypeCode: string;
  dependants: DependantSummary[];
  reference: string | null;
};

type ApiError = {
  error?: { message?: string };
};

type ActiveWizard = {
  kind: DocumentKind;
  variantId?: VariantId;
  answers?: Record<string, unknown>;
};

function formatSavedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DocumentCard({
  title,
  description,
  saved,
  readOnly,
  downloading,
  onStart,
  onEdit,
  onDownloadDocx,
  onDownloadPdf,
}: {
  title: string;
  description: string;
  saved: CaseDocumentListItem | null;
  readOnly: boolean;
  downloading: 'docx' | 'pdf' | null;
  onStart: () => void;
  onEdit: () => void;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          {saved ? (
            <p className="mt-2 text-xs text-slate-500">
              Saved {formatSavedAt(saved.updated_at)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Not started</p>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={saved ? onEdit : onStart}
            className="rounded-md bg-[#0F2B5B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0c2248]"
          >
            {saved ? 'Edit' : 'Start'}
          </button>
        )}
      </div>

      {saved && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={downloading !== null}
              onClick={onDownloadDocx}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading === 'docx' ? 'Downloading…' : 'Download DOCX'}
            </button>
            <button
              type="button"
              disabled={downloading !== null}
              onClick={onDownloadPdf}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading === 'pdf' ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            DOCX includes letterhead; PDF is a plain readable copy.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CaseDocumentsSection({
  caseId,
  readOnly,
  clientFirstName,
  clientLastName,
  applicationTypeCode,
  dependants,
  reference,
}: CaseDocumentsSectionProps) {
  const [documents, setDocuments] = useState<CaseDocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [activeWizard, setActiveWizard] = useState<ActiveWizard | null>(null);
  const [downloading, setDownloading] = useState<{
    kind: DocumentKind;
    format: 'docx' | 'pdf';
  } | null>(null);

  const hasChildDependant = useMemo(
    () => dependants.some((dependant) => dependant.relationship === 'child'),
    [dependants],
  );

  const prefillContext: WizardPrefillContext = useMemo(
    () => ({
      clientFirstName,
      clientLastName,
      applicationTypeCode,
      dependants,
    }),
    [clientFirstName, clientLastName, applicationTypeCode, dependants],
  );

  const coveringDocument = documents.find((doc) => doc.kind === 'covering_letter') ?? null;
  const parentalDocument =
    documents.find((doc) => doc.kind === 'parental_consent') ?? null;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/documents`);
      const json = (await response.json()) as {
        data?: CaseDocumentListItem[];
      } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load documents.');
      }

      setDocuments(json.data ?? []);
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : 'Failed to load documents.',
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function openWizard(kind: DocumentKind, existing?: CaseDocumentListItem | null) {
    setBannerError(null);

    if (existing) {
      try {
        const response = await fetch(`/api/cases/${caseId}/documents/${kind}`);
        const json = (await response.json()) as {
          data?: CaseDocumentDetail;
        } & ApiError;

        if (!response.ok || !json.data) {
          throw new Error(json.error?.message ?? 'Failed to load saved answers.');
        }

        setActiveWizard({
          kind,
          variantId: json.data.variant_id,
          answers: json.data.answers,
        });
        return;
      } catch (error) {
        setBannerError(
          error instanceof Error ? error.message : 'Failed to load saved answers.',
        );
        return;
      }
    }

    setActiveWizard({ kind });
  }

  async function handleDownload(kind: DocumentKind, format: 'docx' | 'pdf') {
    setDownloading({ kind, format });
    setBannerError(null);

    try {
      await downloadCaseDocument(caseId, kind, format);
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : 'Failed to download document.',
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Prepare documents
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Guided letters for this case. Answers overwrite previous saves.
        {reference ? ` Reference: ${reference}.` : ''}
      </p>

      {bannerError && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {bannerError}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-600">Loading documents…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <DocumentCard
            title="Covering letter"
            description="One covering letter per case for UKVI."
            saved={coveringDocument}
            readOnly={readOnly}
            downloading={
              downloading?.kind === 'covering_letter' ? downloading.format : null
            }
            onStart={() => openWizard('covering_letter')}
            onEdit={() => openWizard('covering_letter', coveringDocument)}
            onDownloadDocx={() => handleDownload('covering_letter', 'docx')}
            onDownloadPdf={() => handleDownload('covering_letter', 'pdf')}
          />

          {hasChildDependant && (
            <DocumentCard
              title="Parental consent"
              description="Required when the case includes a child dependant."
              saved={parentalDocument}
              readOnly={readOnly}
              downloading={
                downloading?.kind === 'parental_consent' ? downloading.format : null
              }
              onStart={() => openWizard('parental_consent')}
              onEdit={() => openWizard('parental_consent', parentalDocument)}
              onDownloadDocx={() => handleDownload('parental_consent', 'docx')}
              onDownloadPdf={() => handleDownload('parental_consent', 'pdf')}
            />
          )}
        </div>
      )}

      {activeWizard && (
        <DocumentWizardModal
          open
          caseId={caseId}
          kind={activeWizard.kind}
          prefillContext={prefillContext}
          initialVariantId={activeWizard.variantId}
          initialAnswers={activeWizard.answers}
          onClose={() => setActiveWizard(null)}
          onSaved={() => {
            setActiveWizard(null);
            void loadDocuments();
          }}
        />
      )}
    </div>
  );
}
