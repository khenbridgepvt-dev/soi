CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) >= 1),
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  online_status online_status NOT NULL DEFAULT 'offline',
  timezone text DEFAULT 'Europe/London',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
