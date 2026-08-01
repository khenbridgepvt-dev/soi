CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  sequence smallint NOT NULL CHECK (sequence >= 1),
  name text NOT NULL,
  abbreviation varchar(20) NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'not_started',
  assigned_to uuid REFERENCES profiles (id),
  notes text CHECK (notes IS NULL OR length(notes) <= 500),
  is_urgent boolean NOT NULL DEFAULT false,
  is_overdue boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  blocked_reason text,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles (id),
  senior_approval senior_review_outcome,
  revision_notes text,
  priority_position integer,
  is_overtime boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tasks_case_id_sequence_active
  ON tasks (case_id, sequence)
  WHERE is_deleted = false;
