CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_urgent boolean NOT NULL DEFAULT false,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles (id),
  case_id uuid REFERENCES cases (id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks (id) ON DELETE SET NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
