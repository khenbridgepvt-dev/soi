CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  client_first_name text NOT NULL CHECK (length(client_first_name) >= 1),
  client_last_name text NOT NULL CHECK (length(client_last_name) >= 1),
  application_type_id uuid NOT NULL REFERENCES application_types (id),
  status case_status NOT NULL DEFAULT 'lead_pending',
  is_urgent boolean NOT NULL DEFAULT false,
  senior_revision_count integer NOT NULL DEFAULT 0 CHECK (senior_revision_count >= 0),
  last_date date,
  appointment_date timestamptz,
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  created_by uuid NOT NULL REFERENCES profiles (id),
  accepted_at timestamptz,
  completed_at timestamptz,
  fee_agreement text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cases_reference ON cases (reference) WHERE reference IS NOT NULL;
