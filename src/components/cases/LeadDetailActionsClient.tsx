'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LeadReviewModal, { type LeadReviewTarget } from '@/components/cases/LeadReviewModal';

type LeadDetailActionsClientProps = {
  lead: LeadReviewTarget;
};

export default function LeadDetailActionsClient({ lead }: LeadDetailActionsClientProps) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      {message && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={() => setReviewOpen(true)}
        className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white"
      >
        Review Lead
      </button>

      <LeadReviewModal
        open={reviewOpen}
        lead={lead}
        onClose={() => setReviewOpen(false)}
        onRejected={(successMessage) => {
          setMessage(successMessage);
          router.refresh();
        }}
      />
    </>
  );
}
