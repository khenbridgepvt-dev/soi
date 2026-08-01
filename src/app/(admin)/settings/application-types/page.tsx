import type { Metadata } from 'next';
import ApplicationTypesSettings from '@/components/settings/ApplicationTypesSettings';

export const metadata: Metadata = {
  title: 'Application Types',
};

export default function ApplicationTypesSettingsPage() {
  return <ApplicationTypesSettings />;
}
