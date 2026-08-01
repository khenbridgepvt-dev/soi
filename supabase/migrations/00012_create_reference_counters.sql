CREATE TABLE reference_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month varchar(4) NOT NULL UNIQUE CHECK (year_month ~ '^\d{4}$'),
  last_sequence integer NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
