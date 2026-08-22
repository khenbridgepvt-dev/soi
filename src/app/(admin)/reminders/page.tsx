import type { Metadata } from 'next';
import RemindersList from '@/components/reminders/RemindersList';

export const metadata: Metadata = {
  title: 'Reminders',
};

export default function AdminRemindersPage() {
  return <RemindersList caseLinkBase="/cases" showAssignedStaff />;
}
