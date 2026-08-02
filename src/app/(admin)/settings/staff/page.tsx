import type { Metadata } from 'next';
import StaffMembersSettings from '@/components/settings/StaffMembersSettings';

export const metadata: Metadata = {
  title: 'Staff Members',
};

export default function StaffSettingsPage() {
  return <StaffMembersSettings />;
}
