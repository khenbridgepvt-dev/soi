import type { Metadata } from 'next';
import TaskBoardView from '@/components/task-board/TaskBoardView';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Task Board',
};

type TaskBoardPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function TaskBoardPage({ searchParams }: TaskBoardPageProps) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const { data: applicationTypes } = await supabase
    .from('application_types')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <TaskBoardView
      initialFilter={filter}
      applicationTypes={applicationTypes ?? []}
    />
  );
}
