-- ====================================================================
-- XENOVA Esports Platform - Rollback Ticket Email Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Drop the email status index
DROP INDEX IF EXISTS idx_registrations_ticket_email_status;

-- 2. Drop the email tracking columns from registrations table
ALTER TABLE registrations
DROP COLUMN IF EXISTS ticket_email_status,
DROP COLUMN IF EXISTS email_sent_at,
DROP COLUMN IF EXISTS email_error;
