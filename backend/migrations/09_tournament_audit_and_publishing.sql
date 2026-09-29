-- ==============================================================================
-- Migration: 09_tournament_audit_and_publishing.sql
-- Description: Phase 6 - Tournament Result Audit Trail, Approval & Public Publishing
-- Lifecycle: LIVE -> FINALIZED -> SUBMITTED -> CHANGES_REQUESTED -> FINALIZED -> SUBMITTED -> APPROVED -> PUBLISHED
-- ==============================================================================

-- 1. Audit Trail Table for Tournament Results
CREATE TABLE IF NOT EXISTS tournament_result_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id TEXT NOT NULL,
    submission_id UUID,
    action TEXT NOT NULL, -- 'SUBMITTED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'APPROVED', 'PUBLISHED'
    performed_by TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_audit_tournament_id ON tournament_result_audit(tournament_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON tournament_result_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON tournament_result_audit(created_at DESC);

-- 2. Extend tournament_leaderboard_status for Phase 6 lifecycle tracking
ALTER TABLE tournament_leaderboard_status 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by TEXT,
ADD COLUMN IF NOT EXISTS change_request_reason TEXT,
ADD COLUMN IF NOT EXISTS change_requested_by TEXT,
ADD COLUMN IF NOT EXISTS change_requested_at TIMESTAMPTZ;

-- 3. Extend tournament_result_submissions for Phase 6 review and approval metadata
ALTER TABLE tournament_result_submissions 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by TEXT,
ADD COLUMN IF NOT EXISTS change_request_reason TEXT,
ADD COLUMN IF NOT EXISTS change_requested_by TEXT,
ADD COLUMN IF NOT EXISTS change_requested_at TIMESTAMPTZ;
