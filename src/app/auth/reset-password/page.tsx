import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Set new password',
};

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager';

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-text">{appName}</h1>
          <p className="mt-2 text-sm text-text-secondary">Set a new password</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
