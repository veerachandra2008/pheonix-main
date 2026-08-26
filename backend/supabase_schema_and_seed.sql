-- ====================================================================
-- Phoenix / Xenova Esports Platform - Complete Schema & Seed Data
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 0. USERS TABLE (User profiles, avatar pictures, roles)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    college TEXT,
    role TEXT DEFAULT 'PLAYER',
    bio TEXT,
    tag TEXT,
    team TEXT,
    avatar_url TEXT DEFAULT '/valorant.jpg',
    rank INTEGER DEFAULT 1,
    win_rate NUMERIC DEFAULT 0.0,
    trophies INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 0.1 USER FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS user_follows (
    id BIGSERIAL PRIMARY KEY,
    follower_email TEXT NOT NULL,
    target_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_follow UNIQUE (follower_email, target_email)
);

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
    prize_1st TEXT,
    prize_2nd TEXT,
    prize_3rd TEXT,
    date TEXT DEFAULT 'Upcoming',
    region TEXT DEFAULT 'Pan India',
    format TEXT DEFAULT 'Tournament',
    teams TEXT DEFAULT '64/64',
    filled INTEGER DEFAULT 50,
    fee TEXT DEFAULT 'Free',
    description TEXT,
    rules TEXT,
    schedule TEXT,
    map_pool TEXT,
    contact_email TEXT,
    discord_url TEXT,
    organizer_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTRATIONS TABLE (Single Source of Truth for Free & Paid Entries + 4-Player Rosters)
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
    players JSONB DEFAULT '[]'::jsonb,
    player_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
    payment_status TEXT DEFAULT 'SUCCESS',
    order_id TEXT,
    payment_id TEXT,
    attendance_status TEXT DEFAULT 'NOT_MARKED',
    attended_at TIMESTAMPTZ,
    attended_by TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORGANIZER APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS organizer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    college TEXT NOT NULL,
    preferred_game TEXT NOT NULL DEFAULT 'Valorant',
    experience TEXT NOT NULL DEFAULT 'Intermediate',
    details TEXT,
    status TEXT DEFAULT 'PENDING',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EVENT ATTENDANCE TABLE (Dedicated table linked to registrations)
CREATE TABLE IF NOT EXISTS event_attendance (
    id BIGSERIAL PRIMARY KEY,
    pass_id TEXT NOT NULL REFERENCES registrations(pass_id) ON DELETE CASCADE,
    tournament_slug TEXT NOT NULL,
    team_name TEXT NOT NULL,
    captain_name TEXT,
    college TEXT,
    email TEXT,
    attendance_status TEXT NOT NULL DEFAULT 'NOT_MARKED',
    attended_at TIMESTAMPTZ,
    attended_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pass_attendance UNIQUE (pass_id)
);

-- 8. TOURNAMENT ROSTERS TABLE (Dedicated table for all 4 registered players grouped by tournament)
CREATE TABLE IF NOT EXISTS tournament_rosters (
    id BIGSERIAL PRIMARY KEY,
    tournament_slug TEXT NOT NULL,
    pass_id TEXT NOT NULL REFERENCES registrations(pass_id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 4),
    player_name TEXT NOT NULL,
    in_game_tag TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    college TEXT,
    is_captain BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pass_slot UNIQUE (pass_id, slot)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rosters ENABLE ROW LEVEL SECURITY;

-- Allow public read and write policies
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow public read user_follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_follows" ON user_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete user_follows" ON user_follows FOR DELETE USING (true);

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
CREATE POLICY "Allow public update registrations" ON registrations FOR UPDATE USING (true);

CREATE POLICY "Allow public read organizer_applications" ON organizer_applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert organizer_applications" ON organizer_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update organizer_applications" ON organizer_applications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete organizer_applications" ON organizer_applications FOR DELETE USING (true);

CREATE POLICY "Allow public read event_attendance" ON event_attendance FOR SELECT USING (true);
CREATE POLICY "Allow public insert event_attendance" ON event_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update event_attendance" ON event_attendance FOR UPDATE USING (true);
CREATE POLICY "Allow public delete event_attendance" ON event_attendance FOR DELETE USING (true);

CREATE POLICY "Allow public read tournament_rosters" ON tournament_rosters FOR SELECT USING (true);
CREATE POLICY "Allow public insert tournament_rosters" ON tournament_rosters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tournament_rosters" ON tournament_rosters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tournament_rosters" ON tournament_rosters FOR DELETE USING (true);

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
