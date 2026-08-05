'use client';

import { useEffect, useState } from 'react';
import CreateAndOpenCaseModal from '@/components/cases/CreateAndOpenCaseModal';
import CreateCaseForkModal from '@/components/cases/CreateCaseForkModal';
import CreateLeadModal from '@/components/cases/CreateLeadModal';

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type CreateCaseIntakeProps = {
  open: boolean;
  applicationTypes: ApplicationTypeOption[];
  onClose: () => void;
  onLeadCreated: (message: string) => void;
};

type IntakeStep = 'fork' | 'lead' | 'open';

export default function CreateCaseIntake({
  open,
  applicationTypes,
  onClose,
  onLeadCreated,
}: CreateCaseIntakeProps) {
  const [step, setStep] = useState<IntakeStep>('fork');

  useEffect(() => {
    if (open) {
      setStep('fork');
    }
  }, [open]);

  function handleCloseAll() {
    setStep('fork');
    onClose();
  }

  return (
    <>
      <CreateCaseForkModal
        open={open && step === 'fork'}
        onCreateLead={() => setStep('lead')}
        onCreateAndOpen={() => setStep('open')}
        onClose={handleCloseAll}
      />

      <CreateLeadModal
        open={open && step === 'lead'}
        applicationTypes={applicationTypes}
        onClose={handleCloseAll}
        onCreated={(message) => {
          onLeadCreated(message);
          handleCloseAll();
        }}
      />

      <CreateAndOpenCaseModal
        open={open && step === 'open'}
        applicationTypes={applicationTypes}
        onClose={handleCloseAll}
      />
    </>
  );
}
