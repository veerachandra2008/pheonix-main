-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 1: PAYMENT SECURITY HARDENING & REGISTRATIONS RLS MIGRATION
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Create partial unique index on payment_id to prevent double-spending / replay attacks
-- Only enforces uniqueness on non-empty, non-FREE payment IDs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_successful_payment_id 
ON registrations (payment_id) 
WHERE payment_id IS NOT NULL AND payment_id != '' AND payment_id != 'FREE';

-- 2. Create minimal payment_orders persistence table to avoid fake/incomplete registrations
CREATE TABLE IF NOT EXISTS payment_orders (
    order_id TEXT PRIMARY KEY,
    tournament_slug TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'PAID', 'FAILED'
    payment_id TEXT,
    registration_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index payment_orders for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_orders_slug ON payment_orders(tournament_slug);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id ON payment_orders(payment_id);

-- Enable RLS on payment_orders (backend service role bypasses RLS)
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- 3. Create processed_webhook_events table for webhook idempotency / deduplication
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on processed_webhook_events
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 4. Secure registrations Row Level Security (RLS)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Drop legacy wide-open policies if present
DROP POLICY IF EXISTS "Allow public read registrations" ON registrations;
DROP POLICY IF EXISTS "Allow public insert registrations" ON registrations;
DROP POLICY IF EXISTS "Allow public update registrations" ON registrations;
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Organizers can view tournament registrations" ON registrations;
DROP POLICY IF EXISTS "Admins have full access to registrations" ON registrations;

-- Policy A: Authenticated users can view only their own registrations
CREATE POLICY "Users can view own registrations" ON registrations 
FOR SELECT TO authenticated 
USING (
    auth.uid()::text = user_id::text 
    OR email = auth.jwt()->>'email'
);

-- Policy B: Organizers can view registrations for tournaments they host
CREATE POLICY "Organizers can view tournament registrations" ON registrations 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE tournaments.slug = registrations.tournament_slug 
        AND tournaments.organizer_email = auth.jwt()->>'email'
    )
);

-- Policy C: Platform Administrators have full access
CREATE POLICY "Admins have full access to registrations" ON registrations 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id::text = auth.uid()::text 
        AND users.role::text = 'ADMIN'
    ) 
    OR auth.jwt()->>'email' = 'admin@xenova.gg'
);
