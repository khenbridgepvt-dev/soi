import type { Metadata } from 'next';
import TaskBoardView from '@/components/task-board/TaskBoardView';

export const metadata: Metadata = {
  title: 'Task Board',
};

type TaskBoardPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function TaskBoardPage({ searchParams }: TaskBoardPageProps) {
  const { filter } = await searchParams;

  return <TaskBoardView initialFilter={filter} />;
}
