-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 4: EVENT ATTENDANCE & PAYMENT STATUS INTEGRITY RECOVERY MIGRATION
-- XENOVA Esports Platform
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENSURE UNIQUE CONSTRAINT & INDEX ON event_attendance (pass_id)
-- ─────────────────────────────────────────────────────────────────────────────
-- Fixes PostgREST error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- when performing upserts on event_attendance by pass_id.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_pass_attendance' 
          AND conrelid = 'event_attendance'::regclass
    ) THEN
        BEGIN
            ALTER TABLE event_attendance ADD CONSTRAINT unique_pass_attendance UNIQUE (pass_id);
        EXCEPTION
            WHEN duplicate_table THEN
                NULL;
            WHEN others THEN
                RAISE NOTICE 'Notice adding unique_pass_attendance constraint: %', SQLERRM;
        END;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendance_unique_pass_id 
ON event_attendance(pass_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RECOVER MANUAL UPI ORDERS WITH STATUS 'PAID'
-- ─────────────────────────────────────────────────────────────────────────────
-- Fixes "Cannot verify payment with status 'PAID'. Only PENDING payments can be verified."

-- Case A: Order was completed and registration already exists -> ensure status is VERIFIED
UPDATE payment_orders po
SET status = 'VERIFIED'
FROM registrations r
WHERE (po.order_id = r.order_id OR po.order_id = r.payment_id)
  AND po.payment_method = 'MANUAL_UPI'
  AND po.status = 'PAID';

-- Case B: Order was marked PAID before completion and has no registration -> return to PENDING so organizer can verify
UPDATE payment_orders po
SET status = 'PENDING'
WHERE po.payment_method = 'MANUAL_UPI'
  AND po.status = 'PAID'
  AND NOT EXISTS (
      SELECT 1 FROM registrations r 
      WHERE r.order_id = po.order_id OR r.payment_id = po.order_id
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ENSURE EVENT ATTENDANCE RECORDS EXIST FOR ALL CONFIRMED REGISTRATIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- Guarantees door scanners and verification gates can instantly read and update
-- attendance without encountering missing foreign keys or null constraint errors.

INSERT INTO event_attendance (
    pass_id,
    tournament_slug,
    team_name,
    captain_name,
    college,
    email,
    attendance_status,
    attended_at,
    attended_by,
    created_at,
    updated_at
)
SELECT 
    r.pass_id,
    COALESCE(r.tournament_slug, 'tournament'),
    COALESCE(r.team_name, 'Squad'),
    COALESCE(r.captain_name, 'Captain'),
    COALESCE(r.college, ''),
    COALESCE(r.email, ''),
    COALESCE(r.attendance_status, 'NOT_MARKED'),
    r.attended_at,
    r.attended_by,
    NOW(),
    NOW()
FROM registrations r
WHERE r.pass_id IS NOT NULL 
  AND TRIM(r.pass_id) != ''
ON CONFLICT (pass_id) DO UPDATE
SET 
    tournament_slug = EXCLUDED.tournament_slug,
    team_name = EXCLUDED.team_name,
    captain_name = EXCLUDED.captain_name,
    college = EXCLUDED.college,
    email = EXCLUDED.email,
    updated_at = NOW()
WHERE event_attendance.team_name IS NULL OR event_attendance.tournament_slug IS NULL;
