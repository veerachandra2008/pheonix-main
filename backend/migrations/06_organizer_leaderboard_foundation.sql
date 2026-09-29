-- ════════════════════════════════════════════════════════════════════════════════
-- PHASE 2: XENOVA ORGANIZER LEADERBOARD FOUNDATION
-- Dynamic Scoring Rules & Placement Configuration Tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. TOURNAMENT SCORING RULES TABLE
-- Stores organizer-configured dynamic scoring columns per tournament.
-- Supported types: 'PER_UNIT', 'OCCURRENCE', 'PENALTY', 'PLACEMENT'
CREATE TABLE IF NOT EXISTS tournament_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL, -- tournament slug or UUID
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PER_UNIT', 'OCCURRENCE', 'PENALTY', 'PLACEMENT')),
    points_per_unit NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of scoring columns by tournament
CREATE INDEX IF NOT EXISTS idx_tournament_scoring_rules_tournament_id 
ON tournament_scoring_rules(tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_scoring_rules_sort_order 
ON tournament_scoring_rules(tournament_id, sort_order);

-- 2. PLACEMENT SCORING RULES TABLE
-- Dynamic placement scoring matrix for 'PLACEMENT' columns (1st -> 12, 2nd -> 9, etc.)
CREATE TABLE IF NOT EXISTS placement_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scoring_rule_id UUID NOT NULL REFERENCES tournament_scoring_rules(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL CHECK (placement > 0),
    points NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rule_placement UNIQUE (scoring_rule_id, placement)
);

CREATE INDEX IF NOT EXISTS idx_placement_scoring_rules_rule_id 
ON placement_scoring_rules(scoring_rule_id);
