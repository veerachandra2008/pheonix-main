-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 1: MANUAL UPI DATABASE FOUNDATION MIGRATION
-- XENOVA Esports Platform
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD MANUAL UPI FIELDS TO payment_orders TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Safe & idempotent: adds columns only if they do not already exist.
-- Preserves all existing Razorpay data and historical orders.
-- The column default is strictly NULL so no order is implicitly misclassified.

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;
ALTER TABLE payment_orders ALTER COLUMN payment_method SET DEFAULT NULL;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS payment_phone_number TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS utr_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS screenshot_path TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Protect historical Razorpay orders: ensure all existing Razorpay orders are classified as 'RAZORPAY'
UPDATE payment_orders
SET payment_method = 'RAZORPAY'
WHERE (order_id LIKE 'order_%' OR payment_id LIKE 'pay_%')
  AND (payment_method IS NULL OR payment_method = 'MANUAL_UPI');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. UTR UNIQUENESS & INTEGRITY CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Enforce that the same UTR / Transaction ID can NEVER be verified more than once.
-- This partial unique index guarantees at the PostgreSQL engine level that concurrent
-- or sequential verification attempts on duplicate UTRs fail atomically.

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_unique_verified_utr
ON payment_orders (utr_id)
WHERE status = 'VERIFIED' AND utr_id IS NOT NULL AND utr_id != '';

-- Fast lookup indexes for UTR searching and status filtering
CREATE INDEX IF NOT EXISTS idx_payment_orders_utr_id
ON payment_orders (utr_id)
WHERE utr_id IS NOT NULL AND utr_id != '';

CREATE INDEX IF NOT EXISTS idx_payment_orders_method_status
ON payment_orders (payment_method, status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_tournament_status
ON payment_orders (tournament_slug, status);

-- Ensure partial unique index on registrations payment_id exists for defense-in-depth
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_successful_payment_id 
ON registrations (payment_id) 
WHERE payment_id IS NOT NULL AND payment_id != '' AND payment_id != 'FREE';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONCURRENT DUPLICATE UTR SUBMISSION PROTECTION (TRIGGER)
-- ─────────────────────────────────────────────────────────────────────────────
-- If two players concurrently submit the exact same UTR, the database automatically:
--  a) Normalizes UTR to uppercase and trims whitespace.
--  b) Blocks verification if another order is already VERIFIED with that UTR.
--  c) Automatically transitions new submissions with an existing UTR to 'DUPLICATE_REVIEW'.

CREATE OR REPLACE FUNCTION check_duplicate_utr_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only inspect when utr_id is provided and non-empty
    IF NEW.utr_id IS NOT NULL AND TRIM(NEW.utr_id) != '' THEN
        -- Normalize UTR formatting
        NEW.utr_id := UPPER(TRIM(NEW.utr_id));

        -- 1. Block verification if another order is already VERIFIED with this UTR
        IF NEW.status = 'VERIFIED' THEN
            IF EXISTS (
                SELECT 1 FROM payment_orders
                WHERE utr_id = NEW.utr_id
                  AND status = 'VERIFIED'
                  AND order_id != NEW.order_id
            ) THEN
                RAISE EXCEPTION 'UTR % has already been verified for another payment order.', NEW.utr_id;
            END IF;
        END IF;

        -- 2. Detect duplicate submissions upon insertion:
        -- If another pending/unverified order already exists with the same UTR,
        -- mark status as DUPLICATE_REVIEW to prevent accidental automatic approval.
        IF TG_OP = 'INSERT' AND (NEW.status IS NULL OR NEW.status = 'PENDING' OR NEW.status = 'CREATED') THEN
            IF EXISTS (
                SELECT 1 FROM payment_orders
                WHERE utr_id = NEW.utr_id
                  AND order_id != NEW.order_id
            ) THEN
                NEW.status := 'DUPLICATE_REVIEW';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_duplicate_utr ON payment_orders;
CREATE TRIGGER trg_check_duplicate_utr
BEFORE INSERT OR UPDATE OF utr_id, status ON payment_orders
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_utr_submission();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PRIVATE SCREENSHOT STORAGE BUCKET CONFIGURATION
-- ─────────────────────────────────────────────────────────────────────────────
-- Payment screenshots are strictly private. No public read access.
-- Store only the storage path in payment_orders.screenshot_path.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-screenshots',
    'payment-screenshots',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

-- Storage RLS: Authenticated players can upload screenshots
DROP POLICY IF EXISTS "Authenticated users can upload payment screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

-- Storage RLS: Organizers and Admins can view payment screenshots
DROP POLICY IF EXISTS "Organizers and Admins can view all payment screenshots" ON storage.objects;
CREATE POLICY "Organizers and Admins can view all payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'payment-screenshots'
    AND (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'ORGANIZER')
        )
        OR auth.jwt()->>'email' = 'admin@xenova.gg'
    )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR payment_orders
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated players can view only their own payment orders
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
CREATE POLICY "Users can view own payment orders" ON payment_orders
FOR SELECT TO authenticated
USING (
    auth.uid()::text = user_id::text
    OR email = auth.jwt()->>'email'
);

-- Policy 2: Authenticated players can insert their own payment orders
DROP POLICY IF EXISTS "Users can insert own payment orders" ON payment_orders;
CREATE POLICY "Users can insert own payment orders" ON payment_orders
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid()::text = user_id::text
    OR email = auth.jwt()->>'email'
);

-- Policy 3: Organizers can view payment orders for tournaments they organize
DROP POLICY IF EXISTS "Organizers can view tournament payment orders" ON payment_orders;
CREATE POLICY "Organizers can view tournament payment orders" ON payment_orders
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tournaments
        WHERE tournaments.slug = payment_orders.tournament_slug
        AND (
            tournaments.organizer_email = auth.jwt()->>'email'
            OR tournaments.createdBy = auth.jwt()->>'email'
        )
    )
);

-- Policy 4: Organizers can update payment orders for tournaments they organize (Accept/Reject)
DROP POLICY IF EXISTS "Organizers can update tournament payment orders" ON payment_orders;
CREATE POLICY "Organizers can update tournament payment orders" ON payment_orders
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tournaments
        WHERE tournaments.slug = payment_orders.tournament_slug
        AND (
            tournaments.organizer_email = auth.jwt()->>'email'
            OR tournaments.createdBy = auth.jwt()->>'email'
        )
    )
);

-- Policy 5: Admins have full access across all payment orders
DROP POLICY IF EXISTS "Admins have full access to payment orders" ON payment_orders;
CREATE POLICY "Admins have full access to payment orders" ON payment_orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id::text = auth.uid()::text
        AND users.role = 'ADMIN'
    )
    OR auth.jwt()->>'email' = 'admin@xenova.gg'
);
