import type { Metadata } from 'next';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'My Profile',
};

export default function StaffProfilePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Change your account password.</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
