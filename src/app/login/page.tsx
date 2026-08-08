import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';
import { getAppDisplayName, getAppMonogram } from '@/lib/app/display-name';
import { sanitizeNextPath } from '@/lib/auth/login-redirect';

export const metadata: Metadata = {
  title: 'Sign in',
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const appName = getAppDisplayName();
  const appMonogram = getAppMonogram(appName);
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next ?? null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {appMonogram}
          </div>
          <h1 className="text-xl font-semibold text-text">{appName}</h1>
        </div>
        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
