import type { Metadata } from 'next';
import CaseList from '@/components/cases/CaseList';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Cases',
};

export default async function CasesPage() {
  const supabase = await createClient();

  const [{ data: applicationTypes }, { data: staffMembers }] = await Promise.all([
    supabase
      .from('application_types')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('profiles_staff_view')
      .select('id, full_name')
      .order('full_name', { ascending: true }),
  ]);

  return (
    <CaseList
      applicationTypes={applicationTypes ?? []}
      staffMembers={staffMembers ?? []}
    />
  );
}
