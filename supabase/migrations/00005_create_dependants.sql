CREATE TABLE dependants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) >= 1),
  relationship text NOT NULL CHECK (length(relationship) >= 1),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
