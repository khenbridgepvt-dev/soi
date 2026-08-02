import type { Metadata } from 'next';
import BlockedTasksPool from '@/components/blocked/BlockedTasksPool';

export const metadata: Metadata = {
  title: 'Blocked Tasks',
};

export default function BlockedTasksPage() {
  return <BlockedTasksPool />;
}
