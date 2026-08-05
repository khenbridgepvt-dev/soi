-- Ticket 0036: Skilled Worker Dependant as separate application type (code SKD).
INSERT INTO application_types (name, code, sort_order) VALUES
  ('Skilled Worker Dependant', 'SKD', 8)
ON CONFLICT (code) DO NOTHING;
