import type { Metadata } from 'next';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import NotificationPreferencesForm from '@/components/settings/NotificationPreferencesForm';

export const metadata: Metadata = {
  title: 'My Profile',
};

export default function ProfileSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your password and notification preferences.
        </p>
      </div>
      <ChangePasswordForm />
      <NotificationPreferencesForm />
    </div>
  );
}
