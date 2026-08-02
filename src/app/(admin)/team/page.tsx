import type { Metadata } from 'next';
import TeamOverview from '@/components/team/TeamOverview';

export const metadata: Metadata = {
  title: 'Team Overview',
};

export default function TeamOverviewPage() {
  return <TeamOverview />;
}
