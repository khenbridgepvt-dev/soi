CREATE TABLE leave_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  holiday_total_annual smallint NOT NULL DEFAULT 12 CHECK (holiday_total_annual >= 0),
  sick_total_annual smallint NOT NULL DEFAULT 12 CHECK (sick_total_annual >= 0),
  accrual_rate_per_month numeric(3, 1) NOT NULL DEFAULT 1.0 CHECK (accrual_rate_per_month >= 0),
  accrual_start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
