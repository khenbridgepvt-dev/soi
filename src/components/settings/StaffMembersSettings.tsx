'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TimetableEditor, { type TimetableEditorState } from '@/components/settings/TimetableEditor';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import {
  validateStaffEmail,
  validateStaffFullName,
  validateStaffPassword,
  validateStaffRole,
  type StaffRole,
} from '@/lib/staff/validation';
import { suggestUsernameFromEmail, validateUsername } from '@/lib/staff/username';
import { TIMETABLE_DAYS } from '@/lib/utils/dates';

type StaffMember = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'senior';
  is_active: boolean;
  working_hours: string;
};

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

function roleLabel(role: StaffMember['role']): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'senior':
      return 'Senior';
    default:
      return 'Staff';
  }
}

export default function StaffMembersSettings() {
  const invalidate = useInvalidateAfterMutation();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [password, setPassword] = useState('');
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<StaffMember['role']>('staff');
  const [resetPassword, setResetPassword] = useState('');
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editUsernameError, setEditUsernameError] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEditorState>({});
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableErrors, setTimetableErrors] = useState<Record<string, string>>({});
  const [timetableSuccess, setTimetableSuccess] = useState<string | null>(null);

  const {
    data: staff = [],
    isLoading: loading,
    isError,
    error: queryError,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: queryKeys.staff.list('all'),
    queryFn: async () => {
      const response = await fetch('/api/staff?is_active=all');
      const json = (await response.json()) as { data?: StaffMember[] } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load staff members.');
      }

      return json.data ?? [];
    },
  });

  const loadError =
    isError && queryError instanceof Error
      ? queryError.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;
  const displayError = bannerError ?? loadError;

  function openAdd() {
    setFullName('');
    setUsername('');
    setEmail('');
    setRole('staff');
    setPassword('');
    setFullNameError(null);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
    setAddOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditMember(member);
    setEditName(member.full_name);
    setEditUsername(member.username);
    setEditRole(member.role === 'admin' ? 'staff' : member.role);
    setResetPassword('');
    setEditNameError(null);
    setEditUsernameError(null);
    setResetPasswordError(null);
    setTimetable({});
    setTimetableErrors({});
    setTimetableSuccess(null);
    void loadTimetable(member.id);
  }

  async function loadTimetable(staffId: string) {
    setTimetableLoading(true);
    setTimetableErrors({});

    try {
      const response = await fetch(`/api/staff/${staffId}/timetable`);
      const json = (await response.json()) as {
        data?: Record<string, string | null>;
      } & ApiError;

      if (!response.ok || !json.data) {
        setBannerError(json.error?.message ?? 'Failed to load timetable.');
        return;
      }

      const next: TimetableEditorState = {};
      for (const day of TIMETABLE_DAYS) {
        next[`${day}_start`] = json.data[`${day}_start`] ?? null;
        next[`${day}_end`] = json.data[`${day}_end`] ?? null;
      }
      setTimetable(next);
    } catch {
      setBannerError('Failed to load timetable.');
    } finally {
      setTimetableLoading(false);
    }
  }

  async function handleAdd() {
    setFullNameError(null);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);

    const nameResult = validateStaffFullName(fullName);
    if (!nameResult.ok) {
      setFullNameError(nameResult.message);
      return;
    }

    const usernameResult = validateUsername(username);
    if (!usernameResult.ok) {
      setUsernameError(usernameResult.message);
      return;
    }

    const emailResult = validateStaffEmail(email);
    if (!emailResult.ok) {
      setEmailError(emailResult.message);
      return;
    }

    const roleResult = validateStaffRole(role);
    if (!roleResult.ok) {
      setBannerError(roleResult.message);
      return;
    }

    const passwordResult = validateStaffPassword(password);
    if (!passwordResult.ok) {
      setPasswordError(passwordResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: nameResult.value,
          username: usernameResult.value,
          email: emailResult.value,
          role: roleResult.value,
          password: passwordResult.value,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to create staff member.');
        return;
      }

      setAddOpen(false);
      await invalidate('staffSettings');
      void refetchStaff();
    } catch {
      setBannerError('Failed to create staff member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editMember) {
      return;
    }

    setEditNameError(null);
    setEditUsernameError(null);
    const nameResult = validateStaffFullName(editName);
    if (!nameResult.ok) {
      setEditNameError(nameResult.message);
      return;
    }

    const usernameResult = validateUsername(editUsername);
    if (!usernameResult.ok) {
      setEditUsernameError(usernameResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/staff/${editMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: nameResult.value,
          username: usernameResult.value,
          role: editMember.role === 'admin' ? undefined : editRole,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to update staff member.');
        return;
      }

      setEditMember(null);
      await invalidate('staffSettings');
      void refetchStaff();
    } catch {
      setBannerError('Failed to update staff member.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    setSaving(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to update status.');
        return;
      }

      if (editMember?.id === member.id) {
        setEditMember(null);
      }

      await invalidate('staffSettings');
      void refetchStaff();
    } catch {
      setBannerError('Failed to update status.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTimetable() {
    if (!editMember) {
      return;
    }

    setTimetableErrors({});
    setTimetableSuccess(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/staff/${editMember.id}/timetable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timetable),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of json.error?.details ?? []) {
          if (detail.field) {
            fieldErrors[detail.field] = detail.message;
          }
        }

        if (Object.keys(fieldErrors).length > 0) {
          setTimetableErrors(fieldErrors);
        }

        setBannerError(json.error?.message ?? 'Failed to save timetable.');
        return;
      }

      setTimetableSuccess('Timetable saved.');
      void invalidate('timetable');
      void refetchStaff();
    } catch {
      setBannerError('Failed to save timetable.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!editMember) {
      return;
    }

    setResetPasswordError(null);
    const passwordResult = validateStaffPassword(resetPassword, { requireComplexity: true });
    if (!passwordResult.ok) {
      setResetPasswordError(passwordResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/reset-password/${editMember.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temporary_password: passwordResult.value }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to reset password.');
        return;
      }

      setResetPassword('');
      setBannerError(null);
      setSuccessMessage('Temporary password set. Ask the staff member to change it after login.');
    } catch {
      setBannerError('Failed to reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff Members</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add staff, update profiles, and deactivate accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white"
        >
          + Add Staff
        </button>
      </div>

      {displayError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {displayError}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading staff…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{member.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">@{member.username}</td>
                  <td className="px-4 py-3 text-slate-600">{member.email}</td>
                  <td className="px-4 py-3">{roleLabel(member.role)}</td>
                  <td className="px-4 py-3 text-slate-600">{member.working_hours}</td>
                  <td className="px-4 py-3">
                    {member.is_active ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(member)}
                        className="text-[#063327] hover:underline"
                      >
                        Edit
                      </button>
                      {member.role !== 'admin' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleActive(member)}
                          className="text-slate-600 hover:underline disabled:opacity-50"
                        >
                          {member.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Add Staff Member</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="mb-1 block font-medium">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${fullNameError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {fullNameError && <p className="mt-1 text-xs text-red-600">{fullNameError}</p>}
              </div>
              <div>
                <label className="mb-1 block font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const nextEmail = e.target.value;
                    setEmail(nextEmail);
                    if (!username) {
                      setUsername(suggestUsernameFromEmail(nextEmail));
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 ${emailError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
              </div>
              <div>
                <label className="mb-1 block font-medium">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${usernameError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {usernameError && <p className="mt-1 text-xs text-red-600">{usernameError}</p>}
              </div>
              <div>
                <label className="mb-1 block font-medium">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="staff">Staff</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium">Temporary password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${passwordError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
              </div>
              <p className="text-xs text-slate-500">Default working hours: Mon–Fri 09:00–17:00</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAddOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleAdd}
                className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit {editMember.full_name}</h2>
            </div>
            <div className="space-y-5 px-5 py-4 text-sm">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-medium">Full name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 ${editNameError ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {editNameError && <p className="mt-1 text-xs text-red-600">{editNameError}</p>}
                </div>
                <div>
                  <label className="mb-1 block font-medium">Username</label>
                  <input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 ${editUsernameError ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {editUsernameError && (
                    <p className="mt-1 text-xs text-red-600">{editUsernameError}</p>
                  )}
                </div>
                {editMember.role !== 'admin' && (
                  <div>
                    <label className="mb-1 block font-medium">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as StaffMember['role'])}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="staff">Staff</option>
                      <option value="senior">Senior</option>
                    </select>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3">
                  <label className="mb-1 block font-medium">Reset password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="New temporary password"
                    className={`w-full rounded-md border px-3 py-2 ${resetPasswordError ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {resetPasswordError && (
                    <p className="mt-1 text-xs text-red-600">{resetPasswordError}</p>
                  )}
                  <button
                    type="button"
                    disabled={saving || !resetPassword}
                    onClick={handleResetPassword}
                    className="mt-2 text-sm font-medium text-[#063327] hover:underline disabled:opacity-50"
                  >
                    Set temporary password
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Weekly timetable</h3>
                    <p className="text-xs text-slate-500">
                      Uncheck a day to mark it off. Changes apply from tomorrow.
                    </p>
                  </div>
                </div>

                {timetableLoading ? (
                  <p className="text-sm text-slate-600">Loading timetable…</p>
                ) : (
                  <TimetableEditor
                    value={timetable}
                    onChange={setTimetable}
                    fieldErrors={timetableErrors}
                    disabled={saving}
                  />
                )}

                {timetableSuccess && (
                  <p className="mt-2 text-xs text-green-700">{timetableSuccess}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditMember(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || timetableLoading}
                onClick={handleSaveTimetable}
                className="rounded-md border border-[#063327] px-4 py-2 text-sm font-medium text-[#063327] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Timetable'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEdit}
                className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
