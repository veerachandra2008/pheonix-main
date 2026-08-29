-- ====================================================================
-- XENOVA Esports Platform - Tournament Ticket Email System Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Add email status tracking columns to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS ticket_email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- 2. Create index on ticket_email_status for rapid querying
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_email_status ON registrations(ticket_email_status);
CREATE INDEX IF NOT EXISTS idx_registrations_pass_id ON registrations(pass_id);

-- 3. Ensure RLS allows Edge Function service role and public read/update as configured
-- Note: Service role automatically bypasses RLS in Supabase.
COMMENT ON COLUMN registrations.ticket_email_status IS 'Status of the ticket confirmation email: pending, sent, or failed';
COMMENT ON COLUMN registrations.email_sent_at IS 'Timestamp when the ticket confirmation email was dispatched by Resend';
COMMENT ON COLUMN registrations.email_error IS 'Error message if the email delivery encountered any issue';
