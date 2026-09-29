-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 3: TOURNAMENT MATCHES & DYNAMIC RESULTS SCHEMA
-- XENOVA Esports Platform - Match Results & Automatic Scoring Engine
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. TOURNAMENT MATCHES TABLE
-- Stores organizer-created matches for a specific tournament.
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL, -- tournament slug or UUID
    match_number INTEGER NOT NULL,
    title TEXT NOT NULL, -- e.g. "Match 1", "Match 2"
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id 
ON tournament_matches(tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_order 
ON tournament_matches(tournament_id, match_number);

-- 2. MATCH TEAM RESULTS TABLE
-- Stores RAW scores entered by organizers and server-authoritative calculated points.
-- Preserves raw values in raw_scores JSONB and computed points in calculated_scores JSONB.
CREATE TABLE IF NOT EXISTS match_team_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    tournament_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    raw_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_points NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_team_result UNIQUE (match_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_team_results_match_id 
ON match_team_results(match_id);

CREATE INDEX IF NOT EXISTS idx_match_team_results_tournament_id 
ON match_team_results(tournament_id);

CREATE INDEX IF NOT EXISTS idx_match_team_results_team_id 
ON match_team_results(team_id);
