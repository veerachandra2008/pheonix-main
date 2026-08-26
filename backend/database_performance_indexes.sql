-- ════════════════════════════════════════════════════════════════════════════════
-- HIGH-CONCURRENCY DATABASE INDEXES FOR 100+ SIMULTANEOUS USERS
-- Run this SQL in your Supabase SQL Editor for < 2ms query execution.
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Index registrations for instant lookups by slug, pass_id, and email
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_slug ON registrations(tournament_slug);
CREATE INDEX IF NOT EXISTS idx_registrations_pass_id ON registrations(pass_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_attendance ON registrations(attendance_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at DESC);

-- 2. Index tournament_rosters for instant 4-player squad joins
CREATE INDEX IF NOT EXISTS idx_rosters_pass_id ON tournament_rosters(pass_id);
CREATE INDEX IF NOT EXISTS idx_rosters_tournament_slug ON tournament_rosters(tournament_slug);
CREATE INDEX IF NOT EXISTS idx_rosters_email ON tournament_rosters(email);
CREATE INDEX IF NOT EXISTS idx_rosters_slot ON tournament_rosters(pass_id, slot);

-- 3. Index event_attendance for door scan and check-in desks
CREATE INDEX IF NOT EXISTS idx_event_attendance_pass_id ON event_attendance(pass_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_slug ON event_attendance(tournament_slug);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(attendance_status);

-- 4. Index tournaments table for instant catalog filters
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- 5. Index users table for instant authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. Index colleges & teams for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_colleges_slug ON colleges(slug);
CREATE INDEX IF NOT EXISTS idx_colleges_state ON colleges(state);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_game ON teams(game);
