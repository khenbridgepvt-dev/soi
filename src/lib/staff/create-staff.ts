import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { StaffRole } from '@/lib/staff/validation';

export type CreateStaffInput = {
  full_name: string;
  email: string;
  username: string;
  role: StaffRole;
  password: string;
  timetable?: Partial<Database['public']['Tables']['staff_timetables']['Update']>;
};

export type CreateStaffResult = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
};

const DEFAULT_TIMETABLE: Database['public']['Tables']['staff_timetables']['Update'] = {
  mon_start: '09:00',
  mon_end: '17:00',
  tue_start: '09:00',
  tue_end: '17:00',
  wed_start: '09:00',
  wed_end: '17:00',
  thu_start: '09:00',
  thu_end: '17:00',
  fri_start: '09:00',
  fri_end: '17:00',
  sat_start: null,
  sat_end: null,
  sun_start: null,
  sun_end: null,
};

export async function createStaffMember(
  service: SupabaseClient<Database>,
  input: CreateStaffInput,
): Promise<CreateStaffResult> {
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      username: input.username,
    },
  });

  if (authError) {
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('Auth user was not created.');
  }

  const timetable = input.timetable ?? DEFAULT_TIMETABLE;

  const { error: timetableError } = await service
    .from('staff_timetables')
    .update(timetable)
    .eq('staff_id', userId);

  if (timetableError) {
    await service.auth.admin.deleteUser(userId);
    throw timetableError;
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .update({
      full_name: input.full_name,
      role: input.role,
      username: input.username,
    })
    .eq('id', userId)
    .select('id, full_name, username, email, role, is_active')
    .single();

  if (profileError || !profile) {
    await service.auth.admin.deleteUser(userId);
    throw profileError ?? new Error('Profile was not created.');
  }

  return {
    id: profile.id,
    full_name: profile.full_name,
    username: profile.username,
    email: profile.email,
    role: profile.role as StaffRole,
    is_active: profile.is_active,
  };
}
