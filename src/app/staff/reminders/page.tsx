import type { Metadata } from 'next';
import RemindersList from '@/components/reminders/RemindersList';

export const metadata: Metadata = {
  title: 'Reminders',
};

export default function StaffRemindersPage() {
  return <RemindersList caseLinkBase="/staff/cases" />;
}
