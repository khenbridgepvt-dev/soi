INSERT INTO application_types (name, code, sort_order) VALUES
  ('Skilled Worker Visa', 'SKW', 1),
  ('Graduate Visa', 'GRD', 2),
  ('Spouse Visa', 'SPV', 3),
  ('Indefinite Leave to Remain', 'ILR', 4),
  ('Naturalisation', 'NAT', 5),
  ('Fee Waiver', 'FWV', 6),
  ('Further Leave to Remain', 'FLR', 7),
  ('Skilled Worker Dependant', 'SKD', 8)
ON CONFLICT (code) DO NOTHING;
