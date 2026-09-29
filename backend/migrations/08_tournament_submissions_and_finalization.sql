-- ==============================================================================
-- Migration: 08_tournament_submissions_and_finalization.sql
-- Description: Phase 5 - Finalized results snapshot and Admin submission records
-- Authoritative status tracking: DRAFT / LIVE / FINALIZED / SUBMITTED
-- ==============================================================================

-- 1. Table for storing finalized leaderboard submissions for admin review
CREATE TABLE IF NOT EXISTS tournament_result_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL,
    submitted_by TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- 'FINALIZED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED'
    snapshot JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_submissions_tournament_id ON tournament_result_submissions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON tournament_result_submissions(status);

-- 2. Table for tracking tournament leaderboard lifecycle state
CREATE TABLE IF NOT EXISTS tournament_leaderboard_status (
    tournament_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'LIVE', -- 'DRAFT', 'LIVE', 'FINALIZED', 'SUBMITTED'
    finalized_at TIMESTAMPTZ,
    finalized_by TEXT,
    submitted_at TIMESTAMPTZ,
    submitted_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_status_tournament ON tournament_leaderboard_status(tournament_id);
