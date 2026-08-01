CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_cases_status ON cases (status, is_deleted);

CREATE INDEX idx_cases_urgent ON cases (is_urgent)
  WHERE is_urgent = true AND is_deleted = false;

CREATE INDEX idx_cases_created_by ON cases (created_by);

CREATE INDEX idx_cases_client_name ON cases
  USING gin ((client_first_name || ' ' || client_last_name) gin_trgm_ops)
  WHERE is_deleted = false;

CREATE INDEX idx_tasks_case_seq ON tasks (case_id, sequence)
  WHERE is_deleted = false;

CREATE INDEX idx_tasks_assigned ON tasks (assigned_to, status, is_deleted);

CREATE INDEX idx_tasks_blocked ON tasks (status)
  WHERE status = 'blocked' AND is_deleted = false;

CREATE INDEX idx_tasks_overdue ON tasks (is_overdue)
  WHERE is_overdue = true AND is_deleted = false;

CREATE INDEX idx_ta_staff_date ON task_assignments (staff_id, date)
  WHERE is_released = false;

CREATE INDEX idx_ta_date ON task_assignments (date)
  WHERE is_released = false;

CREATE INDEX idx_notif_user_unread ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX idx_notif_user_recent ON notifications (user_id, created_at DESC);

CREATE INDEX idx_leave_staff_dates ON leave_requests (staff_id, start_date, end_date)
  WHERE status IN ('pending', 'approved');

CREATE INDEX idx_leave_pending ON leave_requests (status)
  WHERE status = 'pending';

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
