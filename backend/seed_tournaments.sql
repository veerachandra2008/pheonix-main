-- ====================================================================
-- Phoenix Esports Platform - Tournaments Data Seeding
-- 
-- IMPORTANT (PostgreSQL Rule):
-- Step 1 and Step 2 must be run separately in Supabase SQL Editor!
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: Run this block FIRST to commit new enum values into PostgreSQL:
-- --------------------------------------------------------------------
ALTER TYPE tournament_status_type ADD VALUE IF NOT EXISTS 'Live';
ALTER TYPE tournament_status_type ADD VALUE IF NOT EXISTS 'Registering';
ALTER TYPE tournament_status_type ADD VALUE IF NOT EXISTS 'Upcoming';


-- --------------------------------------------------------------------
-- STEP 2: After Step 1 succeeds, run this INSERT block:
-- --------------------------------------------------------------------
INSERT INTO tournaments (
    slug,
    title,
    game,
    organizer_email,
    format,
    prize_pool,
    entry_fee,
    max_teams,
    registered_count,
    start_date,
    end_date,
    status,
    rules_text,
    accent_color
) VALUES
(
    'nexus-valorant-champions-cup',
    'Nexus Valorant Champions Cup',
    'Valorant',
    'organizer@xenova.gg',
    'Double Elimination',
    50000.00,
    0.00,
    64,
    64,
    '2026-05-18 10:00:00+00',
    '2026-05-20 18:00:00+00',
    'Live'::tournament_status_type,
    'Standard Valorant 5v5 Competitive Rules. 64 teams double elimination bracket.',
    '#FF3B30'
),
(
    'bgmi-college-cup-season-4',
    'BGMI College Cup Season 4',
    'BGMI',
    'organizer@xenova.gg',
    'Squad BR',
    250000.00,
    500.00,
    128,
    78,
    '2026-06-02 14:00:00+00',
    '2026-06-05 20:00:00+00',
    'Registering'::tournament_status_type,
    'Squad Battle Royale tournament for college students across South Zone.',
    '#22C55E'
),
(
    'cs2-campus-clash',
    'CS2 Campus Clash',
    'CS2',
    'organizer@xenova.gg',
    'Single Elim',
    180000.00,
    300.00,
    64,
    32,
    '2026-06-15 11:00:00+00',
    '2026-06-18 19:00:00+00',
    'Upcoming'::tournament_status_type,
    'Counter-Strike 2 Campus Clash. 5v5 Single Elimination Bracket.',
    '#38BDF8'
),
(
    'free-fire-bharat-league',
    'Free Fire Bharat League',
    'Free Fire',
    'organizer@xenova.gg',
    'Squad BR',
    320000.00,
    0.00,
    200,
    152,
    '2026-05-28 12:00:00+00',
    '2026-05-31 21:00:00+00',
    'Registering'::tournament_status_type,
    'Free Fire Bharat League Pan-India Open Championship.',
    '#22C55E'
),
(
    'fc-collegiate-open',
    'FC Collegiate Open',
    'FC / FIFA',
    'organizer@xenova.gg',
    '1v1 Knockout',
    75000.00,
    150.00,
    128,
    96,
    '2026-05-15 15:00:00+00',
    '2026-05-17 21:00:00+00',
    'Live'::tournament_status_type,
    'EA Sports FC 1v1 Knockout Championship for collegiate players.',
    '#FF3B30'
),
(
    'apex-rivalry-iit-vs-nit',
    'Apex Rivalry: IIT vs NIT',
    'Apex Legends',
    'organizer@xenova.gg',
    'Trios Best of 5',
    120000.00,
    0.00,
    32,
    24,
    '2026-07-02 16:00:00+00',
    '2026-07-04 22:00:00+00',
    'Upcoming'::tournament_status_type,
    'Apex Legends Trios Inter-college rivalry match between IIT and NIT teams.',
    '#38BDF8'
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    game = EXCLUDED.game,
    organizer_email = EXCLUDED.organizer_email,
    format = EXCLUDED.format,
    prize_pool = EXCLUDED.prize_pool,
    entry_fee = EXCLUDED.entry_fee,
    max_teams = EXCLUDED.max_teams,
    registered_count = EXCLUDED.registered_count,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    status = EXCLUDED.status,
    rules_text = EXCLUDED.rules_text,
    accent_color = EXCLUDED.accent_color;
