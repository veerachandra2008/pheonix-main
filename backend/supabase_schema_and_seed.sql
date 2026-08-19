-- ====================================================================
-- Phoenix / Xenova Esports Platform - Complete Schema & Seed Data
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS colleges (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    state TEXT,
    type TEXT,
    national_rank INTEGER DEFAULT 99,
    state_rank INTEGER DEFAULT 99,
    players INTEGER DEFAULT 0,
    teams INTEGER DEFAULT 0,
    teams_count INTEGER DEFAULT 0,
    trophies INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT true,
    verification_status TEXT DEFAULT 'approved',
    accent TEXT DEFAULT '#6366f1',
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    game TEXT NOT NULL,
    rank INTEGER DEFAULT 99,
    win_rate INTEGER DEFAULT 50,
    streak TEXT DEFAULT 'W1',
    captain TEXT,
    trophies INTEGER DEFAULT 0,
    members INTEGER DEFAULT 5,
    recent_wins INTEGER DEFAULT 0,
    form TEXT[] DEFAULT ARRAY['W'],
    active_score INTEGER DEFAULT 80,
    joined INTEGER DEFAULT 2026,
    accent TEXT DEFAULT '#6366f1',
    verified BOOLEAN DEFAULT true,
    verification_status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    time TEXT DEFAULT 'Just now',
    read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS tournaments (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    host TEXT DEFAULT 'Xenova',
    image TEXT DEFAULT '/hero-arena.jpg',
    game TEXT NOT NULL,
    status TEXT DEFAULT 'Registering',
    status_color TEXT DEFAULT '#22C55E',
    prize TEXT DEFAULT '₹50,000',
    date TEXT DEFAULT 'Upcoming',
    region TEXT DEFAULT 'Pan India',
    format TEXT DEFAULT 'Tournament',
    teams TEXT DEFAULT '64/64',
    filled INTEGER DEFAULT 50,
    fee TEXT DEFAULT 'Free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
    id BIGSERIAL PRIMARY KEY,
    pass_id TEXT UNIQUE NOT NULL,
    tournament_slug TEXT NOT NULL,
    tournament_title TEXT,
    team_id TEXT,
    team_name TEXT NOT NULL,
    college TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    email TEXT NOT NULL,
    payment_status TEXT DEFAULT 'SUCCESS',
    order_id TEXT,
    payment_id TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TOURNAMENT_REGISTRATIONS (Payment Tracking)
CREATE TABLE IF NOT EXISTS tournament_registrations (
    id BIGSERIAL PRIMARY KEY,
    tournament_slug TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    captain_email TEXT NOT NULL,
    team_name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'PENDING',
    order_id TEXT UNIQUE,
    payment_id TEXT,
    signature TEXT,
    pass_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for public table operations or enable public read/write
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public read and write policies
CREATE POLICY "Allow public read colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "Allow public insert colleges" ON colleges FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert teams" ON teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notifications" ON notifications FOR UPDATE USING (true);

CREATE POLICY "Allow public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public insert tournaments" ON tournaments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read registrations" ON registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert registrations" ON registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read tournament_registrations" ON tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert tournament_registrations" ON tournament_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tournament_registrations" ON tournament_registrations FOR UPDATE USING (true);

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- Seed Tournaments
INSERT INTO tournaments (slug, title, host, image, game, status, status_color, prize, date, region, format, teams, filled, fee)
VALUES
('nexus-valorant-champions-cup', 'Nexus Valorant Champions Cup', 'Xenova', '/valorant.jpg', 'Valorant', 'Live', '#FF3B30', '₹50,000', '18 May', 'Pan India', 'Double Elimination', '64/64', 100, 'Free'),
('bgmi-college-cup-season-4', 'BGMI College Cup Season 4', 'Xenova', '/bgmi.jpg', 'BGMI', 'Registering', '#22C55E', '₹2,50,000', '2 Jun', 'South Zone', 'Squad BR', '78/128', 61, '₹500/team'),
('cs2-campus-clash', 'CS2 Campus Clash', 'Xenova', '/cs2.jpg', 'CS2', 'Upcoming', '#38BDF8', '₹1,80,000', '15 Jun', 'North Zone', 'Single Elim', '32/64', 50, '₹300/team'),
('free-fire-bharat-league', 'Free Fire Bharat League', 'Xenova', '/freefire.jpg', 'Free Fire', 'Registering', '#22C55E', '₹3,20,000', '28 May', 'Pan India', 'Squad BR', '152/200', 76, 'Free'),
('fc-collegiate-open', 'FC Collegiate Open', 'Xenova', '/fc.jpg', 'FC / FIFA', 'Live', '#FF3B30', '₹75,000', '15 May', 'West Zone', '1v1 Knockout', '96/128', 75, '₹150'),
('apex-rivalry-iit-vs-nit', 'Apex Rivalry: IIT vs NIT', 'Xenova', '/apex.jpg', 'Apex Legends', 'Upcoming', '#38BDF8', '₹1,20,000', '2 Jul', 'Pan India', 'Trios Best of 5', '24/32', 75, 'Free')
ON CONFLICT (slug) DO NOTHING;

-- Seed Colleges
INSERT INTO colleges (slug, name, location, state, type, national_rank, state_rank, players, teams, teams_count, trophies, wins, verified, verification_status, accent, website)
VALUES
('nexus-institute-of-technology', 'Nexus Institute of Technology', 'Bengaluru, Karnataka', 'Karnataka', 'Engineering', 1, 1, 428, 18, 18, 34, 21, true, 'approved', '#6366f1', 'nexus.edu'),
('arcadia-college', 'Arcadia College', 'Mumbai, Maharashtra', 'Maharashtra', 'University', 2, 1, 392, 16, 16, 31, 19, true, 'approved', '#f43f5e', 'arcadia.ac.in'),
('metro-school-of-design', 'Metro School of Design', 'New Delhi, Delhi', 'Delhi', 'Design', 5, 2, 244, 11, 11, 16, 12, true, 'approved', '#22d3ee', 'metrodesign.edu'),
('eastern-commerce-university', 'Eastern Commerce University', 'Chennai, Tamil Nadu', 'Tamil Nadu', 'Commerce', 8, 3, 210, 9, 9, 12, 10, true, 'approved', '#10b981', 'easterncommerce.com'),
('westbridge-engineering-college', 'Westbridge Engineering College', 'Hyderabad, Telangana', 'Telangana', 'Engineering', 4, 1, 318, 14, 14, 22, 17, true, 'approved', '#fbbf24', 'westbridge.edu'),
('national-sports-academy', 'National Sports Academy', 'Pune, Maharashtra', 'Maharashtra', 'Sports', 6, 2, 276, 12, 12, 18, 14, true, 'approved', '#a855f7', 'nsa.edu.in'),
('malla-reddy-university', 'Malla Reddy University', 'Hyderabad, Telangana', 'Telangana', 'University', 7, 2, 264, 10, 10, 15, 11, true, 'approved', '#ef4444', 'mallareddyuniversity.ac.in')
ON CONFLICT (slug) DO NOTHING;

-- Seed Teams
INSERT INTO teams (slug, name, college, game, rank, win_rate, streak, captain, trophies, members, recent_wins, form, active_score, joined, accent, verified, verification_status)
VALUES
('team-titans', 'Team Titans', 'Nexus Institute of Technology', 'Valorant', 2, 86, 'W7', 'Aarav "Viper" Rao', 9, 6, 5, ARRAY['W', 'W', 'W', 'L', 'W'], 98, 2026, '#6366f1', true, 'approved'),
('team-phoenix', 'Team Phoenix', 'Arcadia College', 'BGMI', 1, 91, 'W11', 'Nisha "Blaze" Menon', 12, 5, 7, ARRAY['W', 'W', 'W', 'W', 'W'], 96, 2025, '#f43f5e', true, 'approved'),
('team-wolves', 'Team Wolves', 'Metro School of Design', 'Valorant', 5, 73, 'L1', 'Kabir "Ghost" Singh', 5, 6, 3, ARRAY['W', 'L', 'W', 'W', 'L'], 88, 2024, '#22d3ee', true, 'approved'),
('team-alpha', 'Team Alpha', 'Eastern Commerce University', 'Free Fire', 8, 68, 'W2', 'Ishan "Ace" Verma', 4, 4, 2, ARRAY['L', 'W', 'L', 'W', 'W'], 77, 2026, '#10b981', true, 'approved'),
('cyber-hawks', 'Cyber Hawks', 'Westbridge Engineering College', 'CS2', 4, 79, 'W4', 'Rehan "Scope" Khan', 7, 5, 4, ARRAY['W', 'W', 'L', 'W', 'W'], 91, 2025, '#fbbf24', true, 'approved'),
('royal-strikers', 'Royal Strikers', 'National Sports Academy', 'FC24', 6, 75, 'W3', 'Dev "Prime" Kapoor', 6, 3, 4, ARRAY['W', 'L', 'W', 'W', 'W'], 84, 2024, '#a855f7', true, 'approved')
ON CONFLICT (slug) DO NOTHING;

-- Seed Notifications
INSERT INTO notifications (id, title, message, time, read, type)
VALUES
('n1', 'Tournament Registration Confirmed', 'Your squad Titans is locked in for VALORANT Collegiate League Season 4.', '10 mins ago', false, 'tournament'),
('n2', 'Squad Roster Update', 'Nisha "Blaze" Menon updated team captain handle for Team Phoenix.', '1 hour ago', false, 'team'),
('n3', 'Anti-Cheat Client Update', 'Xenova Anti-Cheat v4.2 client is required for tomorrow match lobbies.', '3 hours ago', true, 'system')
ON CONFLICT (id) DO NOTHING;
