CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES profiles (id),
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  days_count smallint NOT NULL CHECK (days_count >= 1),
  reason text CHECK (reason IS NULL OR length(reason) <= 500),
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles (id),
  approved_at timestamptz,
  rejection_reason text,
  is_over_limit boolean NOT NULL DEFAULT false,
  excess_handling excess_leave_handling,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
