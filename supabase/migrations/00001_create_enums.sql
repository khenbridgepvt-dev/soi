CREATE TYPE user_role AS ENUM ('admin', 'senior', 'staff');

CREATE TYPE online_status AS ENUM ('online', 'break', 'offline');

CREATE TYPE case_status AS ENUM ('lead_pending', 'active', 'rejected', 'completed');

CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');

CREATE TYPE senior_review_outcome AS ENUM ('pending', 'approved', 'revisions_required');

CREATE TYPE leave_type AS ENUM ('holiday', 'sick');

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE excess_leave_handling AS ENUM ('paid', 'salary_deduction');

CREATE TYPE notification_type AS ENUM (
  'new_task',
  'urgent_case',
  'task_overdue',
  'task_blocked',
  'leave_approved',
  'leave_rejected',
  'leave_requested'
);
