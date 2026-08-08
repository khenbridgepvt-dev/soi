import type { Metadata } from 'next';
import CoveringLetterheadSettings from '@/components/settings/CoveringLetterheadSettings';

export const metadata: Metadata = {
  title: 'Covering Letter Letterhead',
};

export default function CoveringLetterheadSettingsPage() {
  return <CoveringLetterheadSettings />;
}
