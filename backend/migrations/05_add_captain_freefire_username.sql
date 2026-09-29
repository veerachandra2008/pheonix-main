-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 1: ADD CAPTAIN FREE FIRE USERNAME TO REGISTRATIONS & TEAMS
-- XENOVA Esports Platform - Tournament Identification System
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. ADD captain_freefire_username & captain_in_game_name TO registrations TABLE
-- Supports full UTF-8 Unicode characters (e.g. 亗PHOENIX亗), special symbols, and case preservation.
-- Default is strictly NULL for backward-compatibility with existing registrations.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS captain_freefire_username TEXT DEFAULT NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS captain_in_game_name TEXT DEFAULT NULL;

-- 2. ADD captain_freefire_username & captain_in_game_name TO teams TABLE
-- Stored on the persistent team record if the captain's in-game identity belongs to the team.
-- Default is strictly NULL for existing teams (no usernames invented for historical records).
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_freefire_username TEXT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_in_game_name TEXT DEFAULT NULL;

-- 3. ENSURE UTF-8 / UNICODE INTEGRITY AND SAFE INDEXES
-- Partial indexes for fast tournament-day lookups by organizer without indexing NULLs
CREATE INDEX IF NOT EXISTS idx_registrations_captain_freefire_username 
ON registrations (captain_freefire_username) 
WHERE captain_freefire_username IS NOT NULL AND captain_freefire_username != '';

CREATE INDEX IF NOT EXISTS idx_registrations_captain_in_game_name 
ON registrations (captain_in_game_name) 
WHERE captain_in_game_name IS NOT NULL AND captain_in_game_name != '';

CREATE INDEX IF NOT EXISTS idx_teams_captain_freefire_username 
ON teams (captain_freefire_username) 
WHERE captain_freefire_username IS NOT NULL AND captain_freefire_username != '';

CREATE INDEX IF NOT EXISTS idx_teams_captain_in_game_name 
ON teams (captain_in_game_name) 
WHERE captain_in_game_name IS NOT NULL AND captain_in_game_name != '';
