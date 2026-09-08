-- ════════════════════════════════════════════════════════════════════════════════
-- MIGRATION 03: REGISTRATION CLOSING DEADLINE
-- ════════════════════════════════════════════════════════════════════════════════
-- Adds server-authoritative registration closing deadline to tournaments.
-- NULL indicates no registration deadline is configured.
-- Stored as TIMESTAMPTZ in UTC for exact server-side deadline comparison.
-- PRODUCTION-SAFE: No existing tournament data is inserted, updated, deleted, or seeded.

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ NULL DEFAULT NULL;

-- Optional index to accelerate queries filtering by registration_deadline
CREATE INDEX IF NOT EXISTS idx_tournaments_registration_deadline 
ON tournaments(registration_deadline);

-- Enable tournament update policy if not present (matches policies on notifications, attendance, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tournaments' AND policyname = 'Allow public update tournaments'
    ) THEN
        CREATE POLICY "Allow public update tournaments" ON tournaments FOR UPDATE USING (true);
    END IF;
END $$;

