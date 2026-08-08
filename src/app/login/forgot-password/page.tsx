import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { getAppDisplayName } from '@/lib/app/display-name';

export const metadata: Metadata = {
  title: 'Forgot password',
};

export default function ForgotPasswordPage() {
  const appName = getAppDisplayName();

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-text">{appName}</h1>
          <p className="mt-2 text-sm text-text-secondary">Reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
