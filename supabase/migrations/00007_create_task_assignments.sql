CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles (id),
  date date NOT NULL CHECK (date >= CURRENT_DATE),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 15),
  is_released boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_assignments
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(
      (date + start_time) AT TIME ZONE 'UTC',
      (date + end_time) AT TIME ZONE 'UTC'
    ) WITH &&
  ) WHERE (is_released = false);
