-- ====================================================================
-- Migration: Remove Obsolete Custom Password Storage Columns
-- Run in Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================
-- Supabase Auth is the single authority for authentication credentials.
-- Passwords must never be stored in public.users.

ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.users DROP COLUMN IF EXISTS password;
