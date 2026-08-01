CREATE TABLE staff_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  mon_start time,
  mon_end time,
  tue_start time,
  tue_end time,
  wed_start time,
  wed_end time,
  thu_start time,
  thu_end time,
  fri_start time,
  fri_end time,
  sat_start time,
  sat_end time,
  sun_start time,
  sun_end time,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (mon_start IS NULL AND mon_end IS NULL) OR
    (mon_start IS NOT NULL AND mon_end IS NOT NULL AND mon_end > mon_start)
  ),
  CHECK (
    (tue_start IS NULL AND tue_end IS NULL) OR
    (tue_start IS NOT NULL AND tue_end IS NOT NULL AND tue_end > tue_start)
  ),
  CHECK (
    (wed_start IS NULL AND wed_end IS NULL) OR
    (wed_start IS NOT NULL AND wed_end IS NOT NULL AND wed_end > wed_start)
  ),
  CHECK (
    (thu_start IS NULL AND thu_end IS NULL) OR
    (thu_start IS NOT NULL AND thu_end IS NOT NULL AND thu_end > thu_start)
  ),
  CHECK (
    (fri_start IS NULL AND fri_end IS NULL) OR
    (fri_start IS NOT NULL AND fri_end IS NOT NULL AND fri_end > fri_start)
  ),
  CHECK (
    (sat_start IS NULL AND sat_end IS NULL) OR
    (sat_start IS NOT NULL AND sat_end IS NOT NULL AND sat_end > sat_start)
  ),
  CHECK (
    (sun_start IS NULL AND sun_end IS NULL) OR
    (sun_start IS NOT NULL AND sun_end IS NOT NULL AND sun_end > sun_start)
  )
);
