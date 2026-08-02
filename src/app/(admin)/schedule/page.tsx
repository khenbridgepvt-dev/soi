import type { Metadata } from 'next';
import ScheduleGridView from '@/components/schedule/ScheduleGridView';

export const metadata: Metadata = {
  title: 'Scheduling Grid',
};

/** S-04 · Scheduling Grid */
export default function SchedulePage() {
  return <ScheduleGridView />;
}
