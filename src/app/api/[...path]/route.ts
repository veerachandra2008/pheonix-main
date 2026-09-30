import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeTournamentPayload, CORE_TOURNAMENT_COLUMNS, isTournamentExpired } from '@/lib/tournaments-db';

// Disable static optimization for API routes
export const dynamic = 'force-dynamic';

function getBackendUrl(): string {
  const envUrl = process.env.FLASK_API_URL || process.env.NEXT_PUBLIC_FLASK_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://pheonix-main.onrender.com';
  }
  return 'http://127.0.0.1:5000';
}

async function tryProxyToBackend(req: NextRequest, pathStr: string): Promise<Response | null> {
  const backendBase = getBackendUrl();
  const url = new URL(req.url);
  const targetUrl = `${backendBase}/api/${pathStr}${url.search}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'host' && lower !== 'content-length') {
        headers[key] = val;
      }
    });

    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const arrayBuf = await req.arrayBuffer();
        if (arrayBuf.byteLength > 0) {
          body = Buffer.from(arrayBuf);
        }
      } catch {}
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...headers,
        'Content-Type': headers['content-type'] || 'application/json',
      },
      body: body || undefined,
      signal: controller.signal,
    });

    return response;
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed forwarding /api/${pathStr} to Render:`, err?.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fallback Direct Database Handler when Flask server is offline or proxy fails
async function handleDirectDatabase(req: NextRequest, segments: string[]) {
  const method = req.method;
  const mainSegment = segments[0] || '';
  const subSegment = segments[1] || '';
  const idOrSlug = segments[segments.length - 1] || '';

  // 1. Health Check
  if (mainSegment === 'health') {
    return NextResponse.json({
      status: 'healthy',
      service: 'Xenova Direct Database API Engine',
      version: '3.0.0',
    }, { status: 200 });
  }

  // 2. Auth Endpoints
  if (mainSegment === 'auth') {
    // 2a. POST /api/auth/register
    if (subSegment === 'register' && method === 'POST') {
      try {
        const body = await req.json();
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();
        const name = (body.name || '').trim();
        const college = (body.college || '').trim();
        // Enforce security: public registration can NEVER assign privileged roles (ADMIN, ORGANIZER).
        // All public registrations are strictly assigned the PLAYER role.
        const role = 'PLAYER';

        if (!email || !password || !name) {
          return NextResponse.json({
            success: false,
            message: 'Name, email, and password are required.'
          }, { status: 400 });
        }

        if (password.length < 6) {
          return NextResponse.json({
            success: false,
            message: 'Password must be at least 6 characters long.'
          }, { status: 400 });
        }

        // Check if user already exists in public.users or auth.users
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', email)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing user in public.users:', checkError);
        }

        if (existingUser) {
          return NextResponse.json({
            success: false,
            message: 'An account with this email already exists. Please sign in.',
            already_registered: true
          }, { status: 400 });
        }

        // NOTE (Architecture Decision): email_confirm is set to true by design because
        // external SMTP email sending is not configured on this Supabase project.
        // This provisions an immediately active Supabase Auth user.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, college, role }
        });

        if (authError || !authData?.user?.id) {
          console.error('Supabase Auth createUser error:', authError);
          const msg = authError?.message || 'Failed to create Supabase Auth account.';
          return NextResponse.json({
            success: false,
            message: msg.includes('already registered')
              ? 'An account with this email already exists. Please sign in.'
              : msg,
            already_registered: msg.includes('already registered')
          }, { status: 400 });
        }

        const userId = authData.user.id;
        const tag = `${name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'PLAYER'}#${Math.floor(1000 + Math.random() * 9000)}`;

        // Insert profile into public.users with matching UUID
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('users')
          .insert([
            {
              id: userId,
              email,
              name,
              college: college || 'Collegiate Competitor',
              role,
              tag,
              team: 'Free Agent',
              bio: 'Official collegiate esports athlete.',
              rank: 0,
              win_rate: 0,
              trophies: 0,
            }
          ])
          .select()
          .single();

        if (profileError) {
          console.error('Failed to create public.users profile, rolling back auth account:', profileError);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return NextResponse.json({
            success: false,
            message: 'Failed to create user profile: ' + profileError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Account created successfully.',
          user: {
            id: profileData.id,
            email: profileData.email,
            name: profileData.name,
            college: profileData.college,
            role: profileData.role,
            tag: profileData.tag,
          }
        }, { status: 201 });
      } catch (err: any) {
        console.error('Register endpoint exception:', err);
        return NextResponse.json({
          success: false,
          message: err.message || 'Internal server error during registration.'
        }, { status: 500 });
      }
    }

    // 2b. POST /api/auth/login
    if (subSegment === 'login' && method === 'POST') {
      try {
        const body = await req.json();
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();

        if (!email || !password) {
          return NextResponse.json({ success: false, message: 'Email and password required.' }, { status: 400 });
        }

        // Supabase Auth is the single authoritative source of truth for password verification
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError || !authData?.user) {
          return NextResponse.json({
            success: false,
            message: authError?.message || 'Invalid email or password.'
          }, { status: 401 });
        }

        // Fetch authoritative profile from public.users using user.id
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile fetch error after login:', profileError);
        }

        const userObj = {
          id: authData.user.id,
          email: authData.user.email || email,
          name: profile?.name || authData.user.user_metadata?.name || 'Player',
          college: profile?.college || authData.user.user_metadata?.college || 'Collegiate Competitor',
          role: (profile?.role || authData.user.user_metadata?.role || 'PLAYER').trim().toUpperCase(),
          avatar: profile?.avatar_url || '/valorant.jpg',
          tag: profile?.tag || `${(profile?.name || 'Gamer').toUpperCase().replace(/\s+/g, '')}#1337`,
          bio: profile?.bio || ''
        };

        return NextResponse.json({
          success: true,
          message: 'Signed in successfully!',
          user: userObj,
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_at: authData.session?.expires_at,
            user: {
              id: authData.user.id,
              email: authData.user.email,
            }
          }
        }, { status: 200 });
      } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'Login error' }, { status: 500 });
      }
    }

    // 2c. POST /api/auth/logout
    if (subSegment === 'logout' && method === 'POST') {
      await supabase.auth.signOut();
      return NextResponse.json({ success: true, message: 'Logged out successfully.' }, { status: 200 });
    }

    if (subSegment === 'users' && method === 'GET') {
      const { data } = await supabase.from('users').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }

    if (subSegment === 'organizers' && method === 'GET') {
      const [uRes, aRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('organizer_applications').select('*'),
      ]);
      const orgMap = new Map<string, any>();
      if (aRes.data && Array.isArray(aRes.data)) {
        for (const a of aRes.data) {
          const st = (a.status || a.application_status || '').toLowerCase().trim();
          const em = (a.email || '').toLowerCase().trim();
          if (em && (st === 'approved' || st === 'verified')) {
            orgMap.set(em, {
              id: a.id,
              email: a.email,
              name: a.host_name || a.name || em.split('@')[0],
              college: a.college || 'Campus Esports',
              role: 'ORGANIZER',
              status: 'APPROVED',
              tag: a.tag || `HOST#1001`
            });
          }
        }
      }
      if (uRes.data && Array.isArray(uRes.data)) {
        for (const u of uRes.data) {
          const rl = (u.role || '').toUpperCase().trim();
          const em = (u.email || '').toLowerCase().trim();
          if (em && (rl === 'ORGANIZER' || rl === 'ADMIN') && !orgMap.has(em)) {
            orgMap.set(em, {
              id: u.id,
              email: u.email,
              name: u.name || u.host_name || em.split('@')[0],
              college: u.college || 'Campus Esports',
              role: rl === 'ADMIN' ? 'ADMIN' : 'ORGANIZER',
              status: 'APPROVED',
              tag: u.tag || `HOST#1001`
            });
          }
        }
      }
      return NextResponse.json({ success: true, data: Array.from(orgMap.values()) }, { status: 200 });
    }

    if (subSegment === 'analytics' && method === 'GET') {
      const [uRes, tRes, cRes, trRes, rRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('colleges').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('registrations').select('*'),
      ]);

      const users = uRes.data || [];
      const teams = tRes.data || [];
      const colleges = cRes.data || [];
      const tourns = trRes.data || [];
      const regs = rRes.data || [];

      return NextResponse.json({
        success: true,
        data: {
          totalUsers: users.length,
          totalTeams: teams.length,
          totalColleges: colleges.length,
          totalTournaments: tourns.length,
          totalRegistrations: regs.length,
          gamePopularity: [
            { title: 'Valorant', Players: Math.max(120, teams.length * 5), Teams: Math.max(12, teams.length), color: '#f43f5e' },
            { title: 'BGMI', Players: Math.max(80, teams.length * 4), Teams: Math.max(8, Math.floor(teams.length * 0.8)), color: '#fbbf24' },
            { title: 'Free Fire', Players: 50, Teams: 10, color: '#10b981' },
            { title: 'CS2', Players: 45, Teams: 9, color: '#22d3ee' },
            { title: 'FC24', Players: 30, Teams: 6, color: '#a855f7' },
          ],
          tournamentSplit: [
            { name: 'Double Elimination', value: 45 },
            { name: 'Single Elimination', value: 35 },
            { name: 'Squad BR', value: 20 },
          ],
          signupData: [
            { name: 'Jan 26', Players: Math.max(1, Math.round(users.length * 0.2)), Growth: 12 },
            { name: 'Feb 26', Players: Math.max(2, Math.round(users.length * 0.4)), Growth: 24 },
            { name: 'Mar 26', Players: Math.max(3, Math.round(users.length * 0.6)), Growth: 38 },
            { name: 'Apr 26', Players: Math.max(4, Math.round(users.length * 0.8)), Growth: 55 },
            { name: 'May 26', Players: Math.max(5, users.length), Growth: 72 },
          ],
          paidRegistrations: regs.filter(r => (r.payment_status || '').toUpperCase() === 'SUCCESS').length,
          freeRegistrations: regs.filter(r => (r.payment_status || '').toUpperCase() !== 'SUCCESS').length,
        }
      }, { status: 200 });
    }
  }

  // 3. Tournaments Endpoints
  if (mainSegment === 'tournaments') {
    const dbClient = supabaseAdmin || supabase;
    if (method === 'GET') {
      const { data } = await dbClient.from('tournaments').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }
    if (method === 'POST' && subSegment !== 'register') {
      const body = await req.json();
      const cleanPayload = sanitizeTournamentPayload(body);
      const insertPayload = { slug: body.slug || cleanPayload.slug, ...cleanPayload };
      
      const { data, error } = await dbClient.from('tournaments').insert([insertPayload]).select();
      return NextResponse.json({ success: !error, data: data ? data[0] : insertPayload }, { status: error ? 400 : 201 });
    }
    if (method === 'PATCH' || method === 'PUT') {
      try {
        const body = await req.json();
        const targetSlug = idOrSlug && idOrSlug !== 'tournaments' ? idOrSlug : (body.slug || '');
        const cleanPayload = sanitizeTournamentPayload(body);

        if (!targetSlug) {
          return NextResponse.json({ success: false, message: 'Tournament slug required.' }, { status: 400 });
        }

        const { data: existing } = await dbClient
          .from('tournaments')
          .select('id, slug')
          .eq('slug', targetSlug);

        let resData;
        if (existing && existing.length > 0) {
          const { data, error } = await dbClient
            .from('tournaments')
            .update(cleanPayload)
            .eq('slug', targetSlug)
            .select();

          if (error) {
            console.error('Supabase API route update error:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
          }
          resData = data && data.length > 0 ? data[0] : cleanPayload;
        } else {
          const insertPayload = { slug: targetSlug, ...cleanPayload };
          const { data, error } = await dbClient
            .from('tournaments')
            .insert([insertPayload])
            .select();

          if (error) {
            console.error('Supabase API route insert error:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
          }
          resData = data && data.length > 0 ? data[0] : insertPayload;
        }

        return NextResponse.json({
          success: true,
          data: resData,
          message: 'Tournament updated successfully.'
        }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
      }
    }
    if (method === 'DELETE') {
      const { error } = await dbClient.from('tournaments').delete().eq('slug', idOrSlug);
      return NextResponse.json({ success: !error, message: error ? error.message : 'Tournament deleted.' }, { status: error ? 400 : 200 });
    }
  }

  // 4. Teams Endpoints
  if (mainSegment === 'teams') {
    if (method === 'GET') {
      const { data } = await supabase.from('teams').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('teams').delete().eq('slug', idOrSlug);
      return NextResponse.json({ success: !error }, { status: 200 });
    }
  }

  // 5. Colleges Endpoints
  if (mainSegment === 'colleges') {
    if (method === 'GET') {
      const { data } = await supabase.from('colleges').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('colleges').delete().eq('slug', idOrSlug);
      return NextResponse.json({ success: !error }, { status: 200 });
    }
  }

  // 6. Applications Endpoints
  if (mainSegment === 'applications') {
    if (method === 'GET') {
      const [orgsRes, teamsRes, collegesRes, tournsRes] = await Promise.all([
        supabase.from('organizer_applications').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('colleges').select('*'),
        supabase.from('tournaments').select('*'),
      ]);

      const orgs = orgsRes.data || [];
      const teams = teamsRes.data || [];
      const colleges = collegesRes.data || [];
      const tourns = tournsRes.data || [];

      return NextResponse.json({
        success: true,
        data: {
          organizers: orgs,
          teams: teams,
          colleges: colleges,
          tournaments: tourns,
          stats: {
            pending_organizers: orgs.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length,
            pending_teams: teams.filter(t => (t.verification_status || 'approved').toLowerCase() === 'pending').length,
            pending_colleges: colleges.filter(c => (c.verification_status || 'approved').toLowerCase() === 'pending').length,
            pending_tournaments: tourns.filter(t => (t.status || '').toLowerCase() === 'pending').length,
            total_pending: 0,
          }
        }
      }, { status: 200 });
    }
  }

  // 8. Rosters Endpoints
  if (mainSegment === 'rosters') {
    if (method === 'GET') {
      try {
        const url = new URL(req.url);
        const tournamentSlug = url.searchParams.get('tournament_slug') || url.searchParams.get('tournamentSlug') || '';
        const passId = url.searchParams.get('pass_id') || url.searchParams.get('passId') || '';
        const organizerEmail = (url.searchParams.get('organizer_email') || url.searchParams.get('organizerEmail') || '').toLowerCase().trim();

        let allowedSlugs: string[] = [];
        if (organizerEmail && organizerEmail !== 'admin@xenova.gg') {
          const { data: tourns } = await supabase.from('tournaments').select('*');
          if (tourns && Array.isArray(tourns)) {
            allowedSlugs = tourns
              .filter((t: any) => {
                const em = (t.createdBy || t.organizer_email || t.organizerEmail || t.contact_email || '').toLowerCase().trim();
                const hst = (t.host || t.hostName || '').toLowerCase().trim();
                return em === organizerEmail || hst.includes(organizerEmail);
              })
              .map((t: any) => (t.slug || '').toLowerCase().trim())
              .filter(Boolean);
          }
        }

        const [rostRes, regRes] = await Promise.all([
          supabase.from('tournament_rosters').select('*'),
          supabase.from('registrations').select('*'),
        ]);

        let dbRosters = rostRes.data || [];
        let registrations = regRes.data || [];

        if (tournamentSlug) {
          const cleanSlug = tournamentSlug.toLowerCase().trim();
          dbRosters = dbRosters.filter((r: any) => (r.tournament_slug || '').toLowerCase().trim() === cleanSlug);
          registrations = registrations.filter((r: any) => (r.tournament_slug || '').toLowerCase().trim() === cleanSlug);
        }

        if (passId) {
          dbRosters = dbRosters.filter((r: any) => r.pass_id === passId);
          registrations = registrations.filter((r: any) => (r.pass_id || r.id) === passId);
        }

        if (organizerEmail && organizerEmail !== 'admin@xenova.gg') {
          const slugSet = new Set(allowedSlugs);
          dbRosters = dbRosters.filter((r: any) => slugSet.has((r.tournament_slug || '').toLowerCase().trim()));
          registrations = registrations.filter((r: any) => slugSet.has((r.tournament_slug || '').toLowerCase().trim()));
        }

        const teamsMap = new Map<string, any>();

        for (const reg of registrations) {
          const pid = reg.pass_id || reg.id;
          if (!pid) continue;
          const regPlayers = Array.isArray(reg.players) ? reg.players : [];
          teamsMap.set(pid, {
            pass_id: pid,
            tournament_slug: reg.tournament_slug || '',
            tournament_title: reg.tournament_title || reg.tournament_slug || '',
            team_name: reg.team_name || 'Squad Entry',
            college: reg.college || 'Collegiate Campus',
            captain_name: reg.captain_name || (regPlayers[0]?.name) || 'Captain',
            captain_freefire_username: reg.captain_freefire_username || reg.captainFreeFireUsername || null,
            captainFreeFireUsername: reg.captain_freefire_username || reg.captainFreeFireUsername || null,
            email: reg.email,
            registered_at: reg.registered_at || new Date().toISOString(),
            players: regPlayers.length > 0 ? regPlayers.map((p: any, idx: number) => ({
              slot: p.slot || idx + 1,
              player_name: p.name || p.player_name || `Player ${idx + 1}`,
              in_game_tag: p.inGameTag || p.in_game_tag || p.ign || `TAG_${idx + 1}`,
              email: p.email || reg.email || '',
              is_captain: p.isCaptain || p.is_captain || idx === 0
            })) : []
          });
        }

        for (const r of dbRosters) {
          const pid = r.pass_id;
          if (!pid) continue;
          if (!teamsMap.has(pid)) {
            teamsMap.set(pid, {
              pass_id: pid,
              tournament_slug: r.tournament_slug || '',
              tournament_title: r.tournament_slug || '',
              team_name: r.team_name || 'Squad Entry',
              college: r.college || 'Collegiate Campus',
              captain_name: r.is_captain ? r.player_name : '',
              email: r.email,
              players: []
            });
          }
          const team = teamsMap.get(pid);
          const existingSlotIdx = team.players.findIndex((p: any) => p.slot === r.slot);
          const pObj = {
            slot: r.slot,
            player_name: r.player_name,
            in_game_tag: r.in_game_tag,
            email: r.email,
            phone: r.phone,
            college: r.college,
            is_captain: r.is_captain
          };
          if (existingSlotIdx >= 0) {
            team.players[existingSlotIdx] = pObj;
          } else {
            team.players.push(pObj);
          }
          if (r.is_captain) {
            team.captain_name = r.player_name;
          }
        }

        const teams = Array.from(teamsMap.values()).map((t) => {
          t.players.sort((a: any, b: any) => (a.slot || 1) - (b.slot || 1));
          return t;
        });

        return NextResponse.json({
          success: true,
          count: dbRosters.length,
          teams_count: teams.length,
          data: dbRosters,
          teams: teams,
          tournament_slug: tournamentSlug || 'all'
        }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
      }
    }
  }

  // 8b. Registrations Endpoints (Direct DB Fallback)
  if (mainSegment === 'registrations') {
    if (method === 'GET') {
      const url = new URL(req.url);
      const email = url.searchParams.get('email')?.trim().toLowerCase();
      const passId = (idOrSlug && idOrSlug !== 'registrations') ? idOrSlug : (url.searchParams.get('pass_id') || url.searchParams.get('passId') || '');
      
      let query = supabaseAdmin.from('registrations').select('*');
      if (passId) {
        query = query.eq('pass_id', passId);
      } else if (email) {
        query = query.ilike('email', email);
      }
      const { data, error } = await query;
      if (error || !data) {
        return NextResponse.json({ success: false, data: [] }, { status: 200 });
      }

      if (passId && data.length > 0) {
        const item = data[0];
        const { data: rosterRows } = await supabaseAdmin
          .from('tournament_rosters')
          .select('*')
          .eq('pass_id', passId)
          .order('slot');
        
        const players = (rosterRows || []).map(p => ({
          slot: p.slot,
          name: p.player_name,
          inGameTag: p.in_game_tag,
          email: p.email,
          phone: p.phone || '',
          isCaptain: p.is_captain ?? (p.slot === 1)
        }));

        const resultRecord = {
          ...item,
          passId: item.pass_id,
          pass_id: item.pass_id,
          players,
          player_emails: players.map(p => p.email)
        };
        return NextResponse.json({ success: true, data: resultRecord }, { status: 200 });
      }

      return NextResponse.json({ success: true, data }, { status: 200 });
    }
    if (method === 'DELETE') {
      const { error } = await supabaseAdmin.from('registrations').delete().eq('pass_id', idOrSlug);
      return NextResponse.json({ success: !error, message: 'Registration deleted.' }, { status: 200 });
    }
  }

  // 9. Contact & Support Tickets Endpoints
  if (mainSegment === 'contact' || mainSegment === 'contact_messages') {
    if (method === 'POST') {
      try {
        // 1. Authenticate via Bearer token
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token) {
          return NextResponse.json({
            success: false,
            message: 'Authentication required'
          }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
          return NextResponse.json({
            success: false,
            message: 'Authentication required'
          }, { status: 401 });
        }

        // 2. Validate input fields
        const body = await req.json();
        const subject = (body.subject || '').trim();
        const message = (body.message || '').trim();

        if (!subject || !message) {
          return NextResponse.json({
            success: false,
            message: 'Subject and message are required fields.'
          }, { status: 400 });
        }

        if (message.length > 5000) {
          return NextResponse.json({
            success: false,
            message: 'Message exceeds maximum allowed length of 5000 characters.'
          }, { status: 400 });
        }

        // 3. Enforce authentic user identity (never trust client-supplied user_id or impersonated email)
        const authenticatedUserId = user.id;
        const authenticatedEmail = user.email || (body.email || '').trim().toLowerCase();
        const authenticatedName = user.user_metadata?.name || (body.name || '').trim() || 'Player';

        const payload = {
          user_id: authenticatedUserId,
          name: authenticatedName,
          email: authenticatedEmail,
          phone: (body.phone || '').trim(),
          college: user.user_metadata?.college || (body.college || '').trim() || 'General Campus',
          category: body.category || 'General Inquiry',
          subject,
          message,
          status: 'unread',
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from('contact_messages')
          .insert([payload])
          .select();

        if (error) {
          return NextResponse.json({
            success: false,
            message: error.message || 'Failed to save support ticket to database.'
          }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Support ticket submitted successfully.', 
          data: data?.[0] 
        }, { status: 201 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message || 'Invalid request body.' }, { status: 400 });
      }
    }

    if (method === 'GET') {
      try {
        const url = new URL(req.url);
        const emailFilter = (url.searchParams.get('email') || '').trim().toLowerCase();

        let query = supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
        if (emailFilter) {
          query = query.eq('email', emailFilter);
        }

        const { data, error } = await query;
        return NextResponse.json({ success: !error, data: data || [] }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
      }
    }

    if (method === 'PATCH' || method === 'PUT') {
      try {
        const body = await req.json();
        const updatePayload: any = {
          updated_at: new Date().toISOString()
        };

        if (body.status) updatePayload.status = body.status;
        if (body.admin_reply !== undefined) {
          updatePayload.admin_reply = (body.admin_reply || '').trim();
          updatePayload.admin_reply_at = new Date().toISOString();
          updatePayload.admin_reply_by = body.admin_reply_by || 'Xenova Operations Desk';
          if (!body.status) updatePayload.status = 'resolved';
        }

        const { error } = await supabase
          .from('contact_messages')
          .update(updatePayload)
          .eq('id', idOrSlug);
        return NextResponse.json({ success: !error, data: updatePayload }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 400 });
      }
    }

    if (method === 'DELETE') {
      const { error } = await supabase.from('contact_messages').delete().eq('id', idOrSlug);
      return NextResponse.json({ success: !error }, { status: 200 });
    }
  }

  // 4. Registrations Creation Endpoints
  if ((mainSegment === 'registrations' || (mainSegment === 'tournaments' && subSegment === 'register')) && method === 'POST') {
    try {
      const body = await req.json();
        const payload: any = {
          tournament_slug: body.tournamentSlug || body.tournament_slug,
          tournament_title: body.tournamentTitle || body.tournament_title || '',
          team_id: String(body.teamId || body.team_id || ''),
          team_name: body.teamName || body.team_name || 'My Squad',
          college: body.college || 'Collegiate Competitor',
          captain_name: body.captainName || body.captain_name || 'Captain',
          email: (body.email || '').trim().toLowerCase(),
          pass_id: body.passId || body.pass_id || `XPH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          registered_at: body.registeredAt || body.registered_at || new Date().toISOString(),
          payment_status: body.paymentStatus || body.payment_status || 'SUCCESS',
        };

        if (body.userId || body.user_id) {
          payload.user_id = body.userId || body.user_id;
        }

        if (!payload.tournament_slug || !payload.email) {
          return NextResponse.json({
            success: false,
            message: 'Tournament slug and email are required for registration.'
          }, { status: 400 });
        }

        // Prevent duplicate registration for the same tournament & user
        let dupQuery = supabase.from('registrations')
          .select('id, pass_id')
          .eq('tournament_slug', payload.tournament_slug);

        if (payload.user_id) {
          dupQuery = dupQuery.or(`user_id.eq.${payload.user_id},email.eq.${payload.email}`);
        } else {
          dupQuery = dupQuery.eq('email', payload.email);
        }

        const { data: existingRegs } = await dupQuery;
        if (existingRegs && existingRegs.length > 0) {
          return NextResponse.json({
            success: false,
            message: 'You have already registered for this tournament.',
            passId: existingRegs[0].pass_id,
            already_registered: true
          }, { status: 400 });
        }

        const { data, error } = await supabase.from('registrations').insert([payload]).select();
        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: data ? data[0] : payload, passId: payload.pass_id }, { status: 201 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message || 'Registration failed.' }, { status: 500 });
      }
    }

  // 10. Manual UPI Payment Endpoint (Native Next.js / Supabase Handler)
  if (mainSegment === 'payments' && subSegment === 'manual' && segments[2] === 'create' && method === 'POST') {
    try {
      // 1. Authenticate user from Bearer token
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        return NextResponse.json({ success: false, message: 'Authentication required. Missing token.' }, { status: 401 });
      }

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ success: false, message: 'Authentication session expired or invalid.' }, { status: 401 });
      }

      const userId = user.id;
      const userEmail = user.email || '';

      // 2. Parse Multipart Form Data
      const formData = await req.formData();
      const tournamentSlug = ((formData.get('tournamentSlug') as string) || (formData.get('tournament_slug') as string) || '').trim();
      const rawPhone = ((formData.get('paymentPhoneNumber') as string) || (formData.get('payment_phone_number') as string) || '').trim();
      const rawUtr = ((formData.get('utrId') as string) || (formData.get('utr_id') as string) || '').trim();
      const rawRegData = (formData.get('registrationData') as string) || (formData.get('registration_data') as string) || '{}';
      const screenshotFile = formData.get('screenshot') as File | null;

      if (!tournamentSlug) {
        return NextResponse.json({ success: false, message: 'Tournament slug is required.' }, { status: 400 });
      }

      // 3. Authoritative Tournament Fee from DB
      const { data: tournament, error: tournError } = await supabaseAdmin
        .from('tournaments')
        .select('*')
        .eq('slug', tournamentSlug)
        .maybeSingle();

      if (tournError || !tournament) {
        return NextResponse.json({ success: false, message: `Tournament '${tournamentSlug}' not found.` }, { status: 404 });
      }

      const rawFee = tournament.fee || 'Free';
      const feeClean = String(rawFee).trim().toLowerCase();
      if (feeClean.includes('free') || feeClean === '0') {
        return NextResponse.json({ success: false, message: 'This is a free tournament. Payment is not required; use free registration.' }, { status: 400 });
      }

      const feeMatches = rawFee.match(/\d+(?:\.\d+)?/);
      const amountRupees = feeMatches ? parseFloat(feeMatches[0]) : 0;
      if (amountRupees <= 0) {
        return NextResponse.json({ success: false, message: 'Invalid tournament fee configuration.' }, { status: 400 });
      }
      const amountPaise = Math.round(amountRupees * 100);

      // 4. Validate Phone Number (10-15 digits)
      const phoneDigits = rawPhone.replace(/[^\d]/g, '');
      if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 15) {
        return NextResponse.json({ success: false, message: 'UPI payment phone number must be 10 to 15 digits.' }, { status: 400 });
      }

      // 5. Validate UTR (6-30 alphanumeric characters)
      const normalizedUtr = rawUtr.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!normalizedUtr || normalizedUtr.length < 6 || normalizedUtr.length > 30) {
        return NextResponse.json({ success: false, message: 'UTR / Transaction ID must be between 6 and 30 characters.' }, { status: 400 });
      }

      // 6. Check for duplicate pending payment orders for this user & tournament
      const { data: existingPending } = await supabaseAdmin
        .from('payment_orders')
        .select('order_id, status')
        .eq('user_id', userId)
        .eq('tournament_slug', tournamentSlug)
        .eq('status', 'PENDING');

      if (existingPending && existingPending.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'You already have a pending payment verification for this tournament. Please wait for the organizer to review it.'
        }, { status: 409 });
      }

      // 7. Check for duplicate UTR
      const { data: existingUtr } = await supabaseAdmin
        .from('payment_orders')
        .select('order_id, status')
        .eq('utr_id', normalizedUtr)
        .in('status', ['PENDING', 'SUCCESS', 'VERIFIED']);

      if (existingUtr && existingUtr.length > 0) {
        return NextResponse.json({
          success: false,
          message: `UTR ${normalizedUtr} has already been submitted and is currently pending verification.`
        }, { status: 400 });
      }

      // 8. Validate Screenshot File
      if (!screenshotFile || !(screenshotFile instanceof Blob)) {
        return NextResponse.json({ success: false, message: 'Payment screenshot is required.' }, { status: 400 });
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (screenshotFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, message: 'Screenshot file size exceeds 5MB limit.' }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await screenshotFile.arrayBuffer());
      if (fileBuffer.length === 0) {
        return NextResponse.json({ success: false, message: 'Payment screenshot file is empty.' }, { status: 400 });
      }

      // Check magic bytes
      let detectedExt = 'png';
      let contentType = 'image/png';
      if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
        detectedExt = 'jpg';
        contentType = 'image/jpeg';
      } else if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4e && fileBuffer[3] === 0x47) {
        detectedExt = 'png';
        contentType = 'image/png';
      } else if (fileBuffer.toString('utf8', 0, 4) === 'RIFF' && fileBuffer.toString('utf8', 8, 12) === 'WEBP') {
        detectedExt = 'webp';
        contentType = 'image/webp';
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid screenshot image format. Allowed formats: PNG, JPEG, WEBP.'
        }, { status: 400 });
      }

      // 9. Parse registration payload
      let parsedRegData: any = {};
      try {
        parsedRegData = typeof rawRegData === 'string' ? JSON.parse(rawRegData) : rawRegData;
      } catch {
        parsedRegData = {};
      }

      const fullRegPayload = {
        team_name: parsedRegData.team_name || parsedRegData.teamName || 'Squad Entry',
        college: parsedRegData.college || 'Collegiate Campus',
        captain_name: parsedRegData.captain_name || parsedRegData.captainName || user.user_metadata?.name || 'Captain',
        players: parsedRegData.players || [],
        tournament_slug: tournamentSlug,
        captain_email: userEmail,
        captain_id: userId,
      };

      // 10. Upload Screenshot to Private Supabase Storage Bucket
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const storageFilename = `${userId}_${Date.now()}_${randomSuffix}.${detectedExt}`;
      const storagePath = `orders/${tournamentSlug}/${storageFilename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('payment-screenshots')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('[Supabase Storage Upload Error]', uploadError);
        return NextResponse.json({
          success: false,
          message: 'Failed to securely store payment screenshot. Please try again.'
        }, { status: 500 });
      }

      // 11. Insert Pending Payment Order
      const orderId = `UPI_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Math.floor(Date.now() / 1000)}`;
      const orderRecord = {
        order_id: orderId,
        tournament_slug: tournamentSlug,
        user_id: userId,
        email: userEmail,
        amount_paise: amountPaise,
        currency: 'INR',
        status: 'PENDING',
        payment_method: 'MANUAL_UPI',
        payment_phone_number: phoneDigits,
        utr_id: normalizedUtr,
        screenshot_path: storagePath,
        registration_payload: fullRegPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabaseAdmin
        .from('payment_orders')
        .insert([orderRecord]);

      if (insertError) {
        console.error('[DB Insert Error in payment_orders]', insertError);
        await supabaseAdmin.storage.from('payment-screenshots').remove([storagePath]).catch(() => {});
        return NextResponse.json({
          success: false,
          message: 'Failed to record payment submission. Please try again.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        order_id: orderId,
        status: 'PENDING',
        message: 'Payment submitted successfully and is pending organizer verification.'
      }, { status: 201 });
    } catch (err: any) {
      console.error('[Manual UPI Exception]', err);
      return NextResponse.json({ success: false, message: err?.message || 'Server error processing payment.' }, { status: 500 });
    }
  }

  // 11. User Tournaments Payment & Registration Status Endpoint
  if (mainSegment === 'payments' && subSegment === 'user-tournaments-status' && method === 'GET') {
    try {
      const url = new URL(req.url);
      let email = (url.searchParams.get('email') || '').trim().toLowerCase();
      let userId = (url.searchParams.get('user_id') || '').trim();

      // Check Bearer token if provided
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        try {
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user) {
            if (!userId) userId = user.id;
            if (!email && user.email) email = user.email.toLowerCase();
          }
        } catch {}
      }

      if (!email && !userId) {
        return NextResponse.json({
          success: true,
          registered: [],
          pending: [],
          rejected: [],
        }, { status: 200 });
      }

      // 1. Query registrations for confirmed passes
      let regQuery = supabaseAdmin.from('registrations').select('*');
      if (userId && email) {
        regQuery = regQuery.or(`user_id.eq.${userId},email.eq.${email}`);
      } else if (userId) {
        regQuery = regQuery.eq('user_id', userId);
      } else {
        regQuery = regQuery.eq('email', email);
      }
      const { data: regsData } = await regQuery;

      const registered = (regsData || []).map((r: any) => ({
        tournamentSlug: r.tournament_slug,
        passId: r.pass_id,
        teamName: r.team_name,
        registeredAt: r.registered_at,
      }));

      const registeredSlugs = new Set(registered.map((r: any) => (r.tournamentSlug || '').toLowerCase()));

      // 2. Query payment_orders for PENDING or REJECTED statuses
      let orderQuery = supabaseAdmin
        .from('payment_orders')
        .select('order_id, tournament_slug, status, created_at, utr_id, amount_paise, payment_method')
        .order('created_at', { ascending: false });

      if (userId && email) {
        orderQuery = orderQuery.or(`user_id.eq.${userId},email.eq.${email}`);
      } else if (userId) {
        orderQuery = orderQuery.eq('user_id', userId);
      } else {
        orderQuery = orderQuery.eq('email', email);
      }
      const { data: ordersData } = await orderQuery;

      const pendingMap = new Map<string, any>();
      const rejectedMap = new Map<string, any>();

      for (const order of ordersData || []) {
        const slug = (order.tournament_slug || '').toLowerCase();
        if (!slug || registeredSlugs.has(slug)) continue;

        const st = (order.status || '').toUpperCase();
        if (st === 'PENDING' || st === 'DUPLICATE_REVIEW') {
          if (!pendingMap.has(slug)) {
            pendingMap.set(slug, {
              tournamentSlug: order.tournament_slug,
              orderId: order.order_id,
              status: order.status,
              createdAt: order.created_at,
              utrId: order.utr_id,
            });
          }
        } else if (st === 'REJECTED') {
          if (!pendingMap.has(slug) && !rejectedMap.has(slug)) {
            rejectedMap.set(slug, {
              tournamentSlug: order.tournament_slug,
              orderId: order.order_id,
              status: order.status,
              createdAt: order.created_at,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        registered,
        pending: Array.from(pendingMap.values()),
        rejected: Array.from(rejectedMap.values()),
      }, { status: 200 });
    } catch (err: any) {
      console.error('[User Tournament Status Exception]', err);
      return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
    }
  }

  // 12. Attendance Update Endpoints (Native Next.js / Supabase Admin Handler)
  // Handles POST /api/registrations/attendance/update and POST /api/attendance/update / POST /api/attendance/:passId
  const isAttendanceUpdate =
    method === 'POST' &&
    ((mainSegment === 'registrations' && subSegment === 'attendance' && segments[2] === 'update') ||
     (mainSegment === 'attendance' && (subSegment === 'update' || segments.length === 2)));

  if (isAttendanceUpdate) {
    try {
      const body = await req.json().catch(() => ({}));
      const passId = (body.pass_id || body.passId || (mainSegment === 'attendance' && subSegment !== 'update' ? subSegment : '') || '').trim();
      const attendanceStatus = (body.attendance_status || body.attendanceStatus || 'PRESENT').toUpperCase();
      const attendedBy = body.attended_by || body.attendedBy || 'Desk Scanner';
      const nowIso = body.attended_at || body.attendedAt || new Date().toISOString();

      if (!passId) {
        return NextResponse.json({ success: false, message: 'pass_id is required.' }, { status: 400 });
      }

      // 1. Fetch registration from DB using supabaseAdmin
      const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .ilike('pass_id', passId)
        .maybeSingle();

      const tournamentSlug = body.tournament_slug || body.tournamentSlug || reg?.tournament_slug || 'tournament';
      const teamName = body.team_name || body.teamName || reg?.team_name || 'Squad';
      const captainName = body.captain_name || body.captainName || reg?.captain_name || '';
      const college = body.college || reg?.college || '';
      const email = body.email || reg?.email || '';

      // 2. Check if event_attendance row exists
      const { data: existingAtt } = await supabaseAdmin
        .from('event_attendance')
        .select('id, pass_id')
        .ilike('pass_id', passId)
        .maybeSingle();

      if (existingAtt) {
        await supabaseAdmin
          .from('event_attendance')
          .update({
            attendance_status: attendanceStatus,
            attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
            attended_by: attendanceStatus === 'NOT_MARKED' ? null : attendedBy,
            updated_at: nowIso,
          })
          .eq('id', existingAtt.id);
      } else {
        await supabaseAdmin
          .from('event_attendance')
          .insert([{
            pass_id: passId,
            tournament_slug: tournamentSlug,
            team_name: teamName,
            captain_name: captainName,
            college: college,
            email: email,
            attendance_status: attendanceStatus,
            attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
            attended_by: attendanceStatus === 'NOT_MARKED' ? null : attendedBy,
            updated_at: nowIso,
          }]);
      }

      // 3. Also update registrations table
      await supabaseAdmin
        .from('registrations')
        .update({
          attendance_status: attendanceStatus,
          attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
          attended_by: attendanceStatus === 'NOT_MARKED' ? null : attendedBy,
        })
        .ilike('pass_id', passId);

      return NextResponse.json({
        success: true,
        message: `Attendance updated to ${attendanceStatus}`,
        pass_id: passId,
        attendance_status: attendanceStatus,
        attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
        attended_by: attendanceStatus === 'NOT_MARKED' ? null : attendedBy,
      }, { status: 200 });
    } catch (attErr: any) {
      console.error('[Attendance Update Exception]', attErr);
      return NextResponse.json({ success: false, message: attErr?.message || 'Server error' }, { status: 500 });
    }
  }

  // 13. Entrance Gate Pass Verification (Native Next.js / Supabase Admin Handler)
  // GET or POST /api/registrations/verify/:passId
  if (mainSegment === 'registrations' && subSegment === 'verify') {
    try {
      const passId = (segments[2] || '').trim();
      const url = new URL(req.url);
      const autoCheckIn = url.searchParams.get('auto_check_in') === 'true';
      const attendedBy = url.searchParams.get('attended_by') || 'Entrance Gate Scanner';
      const nowIso = new Date().toISOString();

      if (!passId) {
        return NextResponse.json({ valid: false, status: 'INVALID', message: 'Empty pass ID provided' }, { status: 200 });
      }

      const [regRes, attRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*').ilike('pass_id', passId).maybeSingle(),
        supabaseAdmin.from('event_attendance').select('*').ilike('pass_id', passId).maybeSingle(),
      ]);

      if (!regRes.data) {
        return NextResponse.json({ valid: false, status: 'INVALID', passId, message: 'Pass ID not found on server' }, { status: 200 });
      }

      const item = regRes.data;
      const existingAtt = attRes.data;
      const currentAttStatus = (existingAtt?.attendance_status || item.attendance_status || 'NOT_MARKED').toUpperCase();

      // Check if tournament date concluded
      let isExpired = false;
      let expDate = '';
      if (item.tournament_slug) {
        const { data: tData } = await supabaseAdmin.from('tournaments').select('*').eq('slug', item.tournament_slug).maybeSingle();
        if (tData) {
          isExpired = isTournamentExpired(tData);
          expDate = tData.end_date || tData.date || 'Concluded';
        }
      }

      if (isExpired) {
        return NextResponse.json({
          valid: false,
          status: 'EXPIRED',
          is_expired: true,
          passId,
          message: `This ticket pass has expired. Tournament concluded on ${expDate}.`,
          data: item,
        }, { status: 200 });
      }

      if (currentAttStatus === 'PRESENT') {
        return NextResponse.json({
          valid: true,
          status: 'ALREADY_CHECKED_IN',
          already_checked_in: true,
          passId,
          message: 'Participant is already checked in.',
          data: { ...item, attendance_status: 'PRESENT', attended_at: existingAtt?.attended_at || item.attended_at },
        }, { status: 200 });
      }

      if (autoCheckIn) {
        await Promise.allSettled([
          supabaseAdmin.from('registrations').update({
            attendance_status: 'PRESENT',
            attended_at: nowIso,
            attended_by: attendedBy,
          }).ilike('pass_id', passId),
          existingAtt
            ? supabaseAdmin.from('event_attendance').update({
                attendance_status: 'PRESENT',
                attended_at: nowIso,
                attended_by: attendedBy,
                updated_at: nowIso,
              }).eq('id', existingAtt.id)
            : supabaseAdmin.from('event_attendance').insert([{
                pass_id: passId,
                tournament_slug: item.tournament_slug || 'tournament',
                team_name: item.team_name || 'Squad',
                captain_name: item.captain_name || '',
                college: item.college || '',
                email: item.email || '',
                attendance_status: 'PRESENT',
                attended_at: nowIso,
                attended_by: attendedBy,
                updated_at: nowIso,
              }]),
        ]);

        return NextResponse.json({
          valid: true,
          status: 'VERIFIED',
          already_checked_in: false,
          passId,
          message: 'Participant verified and checked in as PRESENT.',
          data: { ...item, attendance_status: 'PRESENT', attended_at: nowIso, attended_by: attendedBy },
        }, { status: 200 });
      }

      return NextResponse.json({
        valid: true,
        status: 'VERIFIED',
        already_checked_in: false,
        passId,
        message: 'Pass verified successfully.',
        data: { ...item, attendance_status: currentAttStatus },
      }, { status: 200 });
    } catch (verErr: any) {
      console.error('[Verify Pass Exception]', verErr);
      return NextResponse.json({ valid: false, status: 'INVALID', message: verErr?.message || 'Server error' }, { status: 500 });
    }
  }

  // 14. Native Registrations Query (Strict Filtering + Expiry Detection)
  // Handles GET /api/registrations?email=...&user_id=...&tournament_slug=...
  if (mainSegment === 'registrations' && !subSegment && method === 'GET') {
    try {
      const url = new URL(req.url);
      const email = (url.searchParams.get('email') || '').trim().toLowerCase();
      const userId = (url.searchParams.get('user_id') || url.searchParams.get('userId') || '').trim();
      const slug = (url.searchParams.get('tournament_slug') || url.searchParams.get('tournamentSlug') || '').trim().toLowerCase();

      // Anonymous requests with no filters return empty list to protect user privacy
      if (!email && !userId && !slug) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }

      let q = supabaseAdmin.from('registrations').select('*');

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      if (email && isUuid) {
        q = q.or(`email.ilike.${email},user_id.eq.${userId}`);
      } else if (email) {
        q = q.ilike('email', email);
      } else if (isUuid) {
        q = q.eq('user_id', userId);
      }

      if (slug) {
        q = q.eq('tournament_slug', slug);
      }

      const { data: rows, error: qErr } = await q.order('registered_at', { ascending: false });
      if (qErr) {
        console.error('[Registrations Query Error]', qErr);
        return NextResponse.json({ success: false, message: qErr.message }, { status: 500 });
      }

      const rawRecords = rows || [];
      // Strictly enforce ownership if email or userId was queried
      const filtered = rawRecords.filter((r: any) => {
        const rEmail = (r.email || '').trim().toLowerCase();
        const rUserId = String(r.user_id || '').trim();
        if (email && userId) {
          return rEmail === email || rUserId === userId;
        }
        if (email) return rEmail === email;
        if (userId) return rUserId === userId;
        return true;
      });

      // Enrich with tournament metadata (dates, status) to calculate is_expired
      const tournamentSlugs = Array.from(new Set(filtered.map((r: any) => r.tournament_slug).filter(Boolean)));
      const tournamentMap: Record<string, any> = {};
      if (tournamentSlugs.length > 0) {
        const { data: tournaments } = await supabaseAdmin
          .from('tournaments')
          .select('slug, title, date, end_date, status, game, image')
          .in('slug', tournamentSlugs);
        if (tournaments) {
          tournaments.forEach((t: any) => {
            tournamentMap[(t.slug || '').toLowerCase()] = t;
          });
        }
      }

      const enriched = filtered.map((r: any) => {
        const t = tournamentMap[(r.tournament_slug || '').toLowerCase()];
        const isExpired = isTournamentExpired(t, r.tournament_end_date || r.tournament_date || t?.end_date || t?.date);

        return {
          ...r,
          id: r.id || r.pass_id,
          passId: r.pass_id,
          pass_id: r.pass_id,
          tournamentSlug: r.tournament_slug,
          tournament_slug: r.tournament_slug,
          tournamentTitle: r.tournament_title || t?.title || r.tournament_slug,
          tournament_title: r.tournament_title || t?.title || r.tournament_slug,
          tournamentDate: t?.date || r.tournament_date || 'Upcoming',
          tournament_date: t?.date || r.tournament_date || 'Upcoming',
          tournamentEndDate: t?.end_date || r.tournament_end_date,
          tournament_end_date: t?.end_date || r.tournament_end_date,
          tournamentStatus: t?.status || 'Registering',
          tournament_status: t?.status || 'Registering',
          tournamentGame: t?.game || 'Esports',
          tournament_game: t?.game || 'Esports',
          isExpired,
          is_expired: isExpired,
        };
      });

      return NextResponse.json({ success: true, data: enriched }, { status: 200 });
    } catch (err: any) {
      console.error('[Registrations GET Exception]', err);
      return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
    }
  }

  // 15. Single Registration Pass Lookup (Native Next.js / Supabase Admin Handler)
  // Handles GET /api/registrations/:passId
  if (mainSegment === 'registrations' && subSegment && subSegment !== 'attendance' && subSegment !== 'verify' && method === 'GET') {
    try {
      const passId = subSegment.trim();
      const { data: reg, error: regErr } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .ilike('pass_id', passId)
        .maybeSingle();

      if (regErr || !reg) {
        return NextResponse.json({ success: false, message: `Registration pass ${passId} not found` }, { status: 404 });
      }

      // Fetch roster players
      const { data: rosterRows } = await supabaseAdmin
        .from('tournament_rosters')
        .select('*')
        .ilike('pass_id', passId)
        .order('slot');

      const players = (rosterRows || []).map((p: any) => ({
        slot: p.slot,
        name: p.player_name,
        inGameTag: p.in_game_tag,
        email: p.email,
        phone: p.phone || '',
        isCaptain: p.is_captain ?? (p.slot === 1)
      }));

      // Fetch tournament details
      let isExpired = false;
      let expDate = '';
      let tTitle = reg.tournament_title;
      let tDate = reg.tournament_date || 'Upcoming';
      let tEndDate = reg.tournament_end_date;
      let tStatus = reg.tournament_status || 'Registering';
      let tGame = reg.tournament_game || 'Esports';

      if (reg.tournament_slug) {
        const { data: tData } = await supabaseAdmin
          .from('tournaments')
          .select('slug, title, date, end_date, status, game')
          .eq('slug', reg.tournament_slug)
          .maybeSingle();

        if (tData) {
          isExpired = isTournamentExpired(tData, tData.end_date || tData.date);
          expDate = tData.end_date || tData.date || '';
          tTitle = tData.title || tTitle;
          tDate = tData.date || tDate;
          tEndDate = tData.end_date || tEndDate;
          tStatus = tData.status || tStatus;
          tGame = tData.game || tGame;
        }
      }

      const item = {
        ...reg,
        id: reg.id || reg.pass_id,
        passId: reg.pass_id,
        pass_id: reg.pass_id,
        tournamentSlug: reg.tournament_slug,
        tournament_slug: reg.tournament_slug,
        tournamentTitle: tTitle,
        tournament_title: tTitle,
        tournamentDate: tDate,
        tournament_date: tDate,
        tournamentEndDate: tEndDate,
        tournament_end_date: tEndDate,
        tournamentStatus: tStatus,
        tournament_status: tStatus,
        tournamentGame: tGame,
        tournament_game: tGame,
        players,
        player_emails: players.map((p: any) => p.email).filter(Boolean),
        isExpired,
        is_expired: isExpired,
        expiryMessage: isExpired ? `Tournament concluded on ${expDate || 'matchday'}.` : ''
      };

      return NextResponse.json({ success: true, data: item }, { status: 200 });
    } catch (e: any) {
      console.error('[Registration Pass Lookup Exception]', e);
      return NextResponse.json({ success: false, message: e?.message || 'Server error' }, { status: 500 });
    }
  }

  if (mainSegment === 'registrations' && method === 'DELETE') {
    try {
      const passId = segments[1] || '';
      if (!passId) {
        return NextResponse.json({ success: false, message: 'pass_id required for deletion' }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from('registrations').delete().ilike('pass_id', passId);
      return NextResponse.json({ success: !error, message: error ? error.message : 'Registration deleted.' }, { status: error ? 400 : 200 });
    } catch (delErr: any) {
      return NextResponse.json({ success: false, message: delErr?.message || 'Server error' }, { status: 500 });
    }
  }

  // 17. Leaderboard Direct Database Handler (Ultra-Resilient Server-Authoritative Execution)
  if (mainSegment === 'leaderboard') {
    const slug = (segments[1] || '').trim().toLowerCase();
    const action = segments[2] || '';
    const subAction = segments[3] || '';

    // Helper: Server-authoritative Score Calculation Engine
    const calculateScoreForRule = (rule: any, rawVal: any): number => {
      const ruleType = (rule.type || 'PER_UNIT').toUpperCase();
      const pointsPerUnit = Number(rule.points_per_unit) || 0;
      const rawNum = Number(rawVal) || 0;

      if (ruleType === 'PER_UNIT' || ruleType === 'OCCURRENCE') {
        return rawNum * pointsPerUnit;
      }
      if (ruleType === 'PENALTY') {
        return pointsPerUnit > 0 ? -(rawNum * pointsPerUnit) : rawNum * pointsPerUnit;
      }
      if (ruleType === 'PLACEMENT') {
        const pos = Math.round(rawNum);
        if (pos <= 0) return 0;
        const placementList = rule.placement_points || [];
        const found = placementList.find((p: any) => Number(p.placement) === pos);
        return found ? Number(found.points) || 0 : 0;
      }
      return 0;
    };

    // Helper: Fetch Present Teams using Registration and Attendance records
    const getPresentTeamsForTournament = async (cleanSlug: string) => {
      const [attRes, regRes] = await Promise.all([
        supabaseAdmin.from('event_attendance').select('*').ilike('tournament_slug', cleanSlug),
        supabaseAdmin.from('registrations').select('*').ilike('tournament_slug', cleanSlug),
      ]);

      const allAtt = attRes.data || [];
      const allRegs = regRes.data || [];

      const attendanceStatusMap: Record<string, string> = {};
      allAtt.forEach((a: any) => {
        const status = String(a.attendance_status || 'NOT_MARKED').toUpperCase();
        if (a.pass_id) attendanceStatusMap[String(a.pass_id)] = status;
        if (a.team_id) attendanceStatusMap[String(a.team_id)] = status;
        if (a.id) attendanceStatusMap[String(a.id)] = status;
      });

      const seenTeamIds = new Set<string>();
      const presentTeams: any[] = [];

      allRegs.forEach((r: any) => {
        const teamId = String(r.team_id || r.pass_id || r.id);
        const passId = String(r.pass_id || r.id);

        const status = (
          attendanceStatusMap[passId] ||
          attendanceStatusMap[teamId] ||
          String(r.attendance_status || 'NOT_MARKED')
        ).toUpperCase();

        if (status === 'PRESENT') {
          if (!seenTeamIds.has(teamId)) {
            seenTeamIds.add(teamId);
            presentTeams.push({
              team_id: teamId,
              team_name: r.team_name || 'Squad',
              captain_name: r.captain_name || 'Captain',
              captain_in_game_name: r.captain_in_game_name || r.captain_freefire_username || '',
              college: r.college || '',
              pass_id: passId,
              attended_at: r.attended_at || new Date().toISOString(),
            });
          }
        }
      });

      allAtt.forEach((a: any) => {
        if (String(a.attendance_status).toUpperCase() === 'PRESENT') {
          const teamId = String(a.team_id || a.pass_id || a.id);
          const passId = String(a.pass_id || a.id);
          if (!seenTeamIds.has(teamId)) {
            seenTeamIds.add(teamId);
            presentTeams.push({
              team_id: teamId,
              team_name: a.team_name || 'Squad',
              captain_name: a.captain_name || 'Captain',
              captain_in_game_name: a.captain_in_game_name || '',
              college: a.college || '',
              pass_id: passId,
              attended_at: a.attended_at || new Date().toISOString(),
            });
          }
        }
      });

      return {
        registeredCount: allRegs.length,
        presentTeams,
      };
    };

    // Helper: Fetch Scoring Rules (Auto-seeds standard Battle Royale rules if empty)
    const getRulesForTournament = async (cleanSlug: string) => {
      const { data: rules } = await supabaseAdmin
        .from('tournament_scoring_rules')
        .select('*')
        .eq('tournament_id', cleanSlug)
        .order('sort_order', { ascending: true });

      let ruleList = rules || [];

      if (ruleList.length === 0) {
        const rule1Id = crypto.randomUUID();
        const rule2Id = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        const defaultRule1 = {
          id: rule1Id,
          tournament_id: cleanSlug,
          name: 'Placement Points',
          type: 'PLACEMENT',
          points_per_unit: 0,
          sort_order: 1,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const defaultRule2 = {
          id: rule2Id,
          tournament_id: cleanSlug,
          name: 'Kill Points',
          type: 'PER_UNIT',
          points_per_unit: 1,
          sort_order: 2,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const placementPointsMatrix = [
          { placement: 1, points: 12 },
          { placement: 2, points: 9 },
          { placement: 3, points: 8 },
          { placement: 4, points: 7 },
          { placement: 5, points: 6 },
          { placement: 6, points: 5 },
          { placement: 7, points: 4 },
          { placement: 8, points: 3 },
          { placement: 9, points: 2 },
          { placement: 10, points: 1 },
          { placement: 11, points: 0 },
          { placement: 12, points: 0 },
        ];

        try {
          await supabaseAdmin.from('tournament_scoring_rules').insert([defaultRule1, defaultRule2]);
          const placementInserts = placementPointsMatrix.map((p) => ({
            id: crypto.randomUUID(),
            scoring_rule_id: rule1Id,
            placement: p.placement,
            points: p.points,
          }));
          await supabaseAdmin.from('placement_scoring_rules').insert(placementInserts);

          return [
            { ...defaultRule1, placement_points: placementPointsMatrix },
            { ...defaultRule2, placement_points: [] },
          ];
        } catch (seedErr) {
          console.warn('Auto-seed default scoring rules notice:', seedErr);
          return [
            { ...defaultRule1, placement_points: placementPointsMatrix },
            { ...defaultRule2, placement_points: [] },
          ];
        }
      }

      const placementRuleIds = ruleList
        .filter((r: any) => (r.type || '').toUpperCase() === 'PLACEMENT')
        .map((r: any) => r.id);
      const placementMap: Record<string, any[]> = {};

      if (placementRuleIds.length > 0) {
        const { data: pData } = await supabaseAdmin
          .from('placement_scoring_rules')
          .select('*')
          .in('scoring_rule_id', placementRuleIds)
          .order('placement', { ascending: true });

        (pData || []).forEach((p: any) => {
          const parentId = String(p.scoring_rule_id);
          if (!placementMap[parentId]) placementMap[parentId] = [];
          placementMap[parentId].push({
            id: p.id,
            placement: Number(p.placement),
            points: Number(p.points),
          });
        });
      }

      return ruleList.map((r: any) => ({
        ...r,
        type: (r.type || 'PER_UNIT').toUpperCase(),
        points_per_unit: Number(r.points_per_unit) || 0,
        sort_order: Number(r.sort_order) || 0,
        placement_points: placementMap[String(r.id)] || [],
      }));
    };

    // Helper: Recalculate match results when scoring rules change
    const recalculateMatchResults = async (cleanSlug: string) => {
      try {
        const rules = await getRulesForTournament(cleanSlug);
        const { data: rows } = await supabaseAdmin
          .from('match_team_results')
          .select('*')
          .eq('tournament_id', cleanSlug);
        if (!rows || rows.length === 0) return;

        const nowIso = new Date().toISOString();
        for (const row of rows) {
          const rawScores = row.raw_scores || {};
          const isParticipating = rawScores._participating !== 0 && rawScores._participating !== false;
          if (!isParticipating) {
            await supabaseAdmin
              .from('match_team_results')
              .update({
                calculated_scores: {},
                total_points: 0,
                updated_at: nowIso,
              })
              .eq('id', row.id);
            continue;
          }
          const calcScores: Record<string, number> = {};
          rules.forEach((col: any) => {
            const rawVal = rawScores[col.id] !== undefined ? Number(rawScores[col.id]) || 0 : 0;
            calcScores[col.id] = calculateScoreForRule(col, rawVal);
          });
          const totalPoints = Object.values(calcScores).reduce((a, b) => a + b, 0);
          await supabaseAdmin
            .from('match_team_results')
            .update({
              calculated_scores: calcScores,
              total_points: totalPoints,
              updated_at: nowIso,
            })
            .eq('id', row.id);
        }
      } catch (err) {
        console.warn('Notice recalculating match results:', err);
      }
    };

    // 1. Status: GET /api/leaderboard/:slug/status
    if (action === 'status' && method === 'GET') {
      try {
        const { data: statusRows } = await supabaseAdmin
          .from('tournament_leaderboard_status')
          .select('*')
          .eq('tournament_id', slug);

        const statusRecord = statusRows && statusRows.length > 0 ? statusRows[0] : null;
        const currentStatus = (statusRecord?.status || 'LIVE').toUpperCase();
        const isLocked = ['FINALIZED', 'SUBMITTED', 'APPROVED', 'PUBLISHED'].includes(currentStatus);

        return NextResponse.json({
          success: true,
          status: currentStatus,
          is_locked: isLocked,
          finalized_at: statusRecord?.finalized_at || null,
          finalized_by: statusRecord?.finalized_by || null,
          submitted_at: statusRecord?.submitted_at || null,
          submitted_by: statusRecord?.submitted_by || null,
          approved_at: statusRecord?.approved_at || null,
          approved_by: statusRecord?.approved_by || null,
          published_at: statusRecord?.published_at || null,
          published_by: statusRecord?.published_by || null,
          change_request_reason: statusRecord?.change_request_reason || null,
          change_requested_by: statusRecord?.change_requested_by || null,
          change_requested_at: statusRecord?.change_requested_at || null,
          submission_id: statusRecord?.submission_id || null,
        }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: true, status: 'LIVE', is_locked: false }, { status: 200 });
      }
    }

    // 2. Matches Management
    if (action === 'matches') {
      // GET /api/leaderboard/:slug/matches
      if (!subAction && method === 'GET') {
        try {
          const { data: matches } = await supabaseAdmin
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', slug)
            .order('match_number', { ascending: true });

          return NextResponse.json({
            success: true,
            tournament_slug: slug,
            matches: matches || [],
          }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: true, tournament_slug: slug, matches: [] }, { status: 200 });
        }
      }

      // POST /api/leaderboard/:slug/matches (Create Match)
      if (!subAction && method === 'POST') {
        try {
          const body = await req.json().catch(() => ({}));
          const { data: existingMatches } = await supabaseAdmin
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', slug)
            .order('match_number', { ascending: true });

          const matchesList = existingMatches || [];
          let matchNumber = body.match_number;
          if (!matchNumber) {
            const maxNum = matchesList.length > 0 ? Math.max(...matchesList.map((m: any) => Number(m.match_number) || 0)) : 0;
            matchNumber = maxNum + 1;
          } else {
            matchNumber = Number(matchNumber);
          }

          const title = (body.title || '').trim() || `Match ${matchNumber}`;
          const matchId = crypto.randomUUID();
          const nowIso = new Date().toISOString();

          const newMatch = {
            id: matchId,
            tournament_id: slug,
            match_number: matchNumber,
            title,
            status: body.status || 'COMPLETED',
            created_at: nowIso,
            updated_at: nowIso,
          };

          const { error: insErr } = await supabaseAdmin.from('tournament_matches').insert([newMatch]);
          if (insErr) {
            console.error('Error inserting tournament match:', insErr);
            return NextResponse.json({ success: false, message: insErr.message }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            message: `Match '${title}' created successfully.`,
            match: newMatch,
          }, { status: 201 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to create match.' }, { status: 500 });
        }
      }

      // Save Match Results: PUT or POST /api/leaderboard/:slug/matches/:matchId/results
      if (subAction && segments[4] === 'results' && (method === 'PUT' || method === 'POST')) {
        const matchId = subAction;
        try {
          const body = await req.json().catch(() => ({}));
          const submittedResults = body.results || [];
          if (!Array.isArray(submittedResults)) {
            return NextResponse.json({ success: false, message: 'results list is required.' }, { status: 400 });
          }

          const [rules, { presentTeams }] = await Promise.all([
            getRulesForTournament(slug),
            getPresentTeamsForTournament(slug),
          ]);

          const presentTeamIds = new Set(presentTeams.map((t: any) => String(t.team_id)));
          const presentTeamMap = new Map(presentTeams.map((t: any) => [String(t.team_id), t]));
          const nowIso = new Date().toISOString();

          const upsertRows: any[] = [];
          const processedResults: any[] = [];

          for (const item of submittedResults) {
            const teamId = String(item.team_id);
            if (!presentTeamIds.has(teamId)) {
              return NextResponse.json({
                success: false,
                message: `Team ID '${teamId}' is not marked PRESENT. Only verified PRESENT teams can participate in match results.`,
              }, { status: 400 });
            }

            const inputRaw = item.raw_scores || {};
            const isParticipating = item.participating !== false && inputRaw._participating !== 0;
            const rawScores: Record<string, number> = {
              _participating: isParticipating ? 1 : 0,
            };
            const calcScores: Record<string, number> = {};

            if (isParticipating) {
              rules.forEach((col: any) => {
                const rawVal = inputRaw[col.id] !== undefined ? Number(inputRaw[col.id]) || 0 : 0;
                rawScores[col.id] = rawVal;
                calcScores[col.id] = calculateScoreForRule(col, rawVal);
              });
            } else {
              rules.forEach((col: any) => {
                rawScores[col.id] = 0;
                calcScores[col.id] = 0;
              });
            }

            const totalPoints = isParticipating ? Object.values(calcScores).reduce((a, b) => a + b, 0) : 0;

            const resultRow = {
              match_id: matchId,
              tournament_id: slug,
              team_id: teamId,
              raw_scores: rawScores,
              calculated_scores: calcScores,
              total_points: totalPoints,
              updated_at: nowIso,
            };
            upsertRows.push(resultRow);

            const teamInfo = presentTeamMap.get(teamId) || {};
            processedResults.push({
              ...resultRow,
              team_name: teamInfo.team_name || 'Squad',
              captain_in_game_name: teamInfo.captain_in_game_name || '',
              participating: isParticipating,
            });
          }

          if (upsertRows.length > 0) {
            const { error: upsertErr } = await supabaseAdmin
              .from('match_team_results')
              .upsert(upsertRows, { onConflict: 'match_id,team_id' });

            if (upsertErr) {
              console.error('Upsert match_team_results error:', upsertErr);
            }
          }

          return NextResponse.json({
            success: true,
            message: `Match results saved successfully for ${processedResults.length} squads.`,
            match_id: matchId,
            results: processedResults,
          }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to save results.' }, { status: 500 });
        }
      }

      // GET /api/leaderboard/:slug/matches/:matchId (Match Details)
      if (subAction && !segments[4] && method === 'GET') {
        const matchId = subAction;
        try {
          const [matchRes, rules, { registeredCount, presentTeams }, resultsRes] = await Promise.all([
            supabaseAdmin.from('tournament_matches').select('*').eq('id', matchId).maybeSingle(),
            getRulesForTournament(slug),
            getPresentTeamsForTournament(slug),
            supabaseAdmin.from('match_team_results').select('*').eq('match_id', matchId),
          ]);

          const matchObj = matchRes.data;
          if (!matchObj) {
            return NextResponse.json({ success: false, message: `Match ID '${matchId}' not found.` }, { status: 404 });
          }

          const resultsData = resultsRes.data || [];
          const resultsMap: Record<string, any> = {};
          resultsData.forEach((r: any) => {
            resultsMap[String(r.team_id)] = r;
          });

          const formattedTeams = presentTeams.map((t: any) => {
            const tid = String(t.team_id);
            const r = resultsMap[tid];
            const rawScores: Record<string, number> = {};
            const calcScores: Record<string, number> = {};

            rules.forEach((col: any) => {
              const rawVal = r?.raw_scores?.[col.id] !== undefined ? Number(r.raw_scores[col.id]) || 0 : 0;
              rawScores[col.id] = rawVal;
              calcScores[col.id] = calculateScoreForRule(col, rawVal);
            });

            const totalPoints = r?.total_points !== undefined ? Number(r.total_points) : Object.values(calcScores).reduce((a, b) => a + b, 0);
            const isParticipating = r ? (r.raw_scores?._participating !== 0 && r.raw_scores?._participating !== false) : true;

            return {
              ...t,
              raw_scores: rawScores,
              calculated_scores: calcScores,
              total_points: totalPoints,
              participating: isParticipating,
            };
          });

          return NextResponse.json({
            success: true,
            match: matchObj,
            columns: rules,
            teams: formattedTeams,
            counts: {
              registered: registeredCount,
              present: presentTeams.length,
            },
          }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch match details.' }, { status: 500 });
        }
      }

      // DELETE /api/leaderboard/:slug/matches/:matchId
      if (subAction && !segments[4] && method === 'DELETE') {
        const matchId = subAction;
        try {
          await supabaseAdmin.from('match_team_results').delete().eq('match_id', matchId);
          await supabaseAdmin.from('tournament_matches').delete().eq('id', matchId);
          return NextResponse.json({ success: true, message: 'Match deleted successfully.' }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to delete match.' }, { status: 500 });
        }
      }
    }

    // 3. Scoring Rules Management
    if (action === 'rules') {
      // GET /api/leaderboard/:slug/rules
      if (!subAction && method === 'GET') {
        try {
          const rules = await getRulesForTournament(slug);
          return NextResponse.json({ success: true, columns: rules }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, columns: [] }, { status: 500 });
        }
      }

      // POST /api/leaderboard/:slug/rules (Create Rule)
      if (!subAction && method === 'POST') {
        try {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').trim();
          const ruleType = (body.type || 'PER_UNIT').trim().toUpperCase();
          const pointsPerUnit = Number(body.points_per_unit) || 0;
          const sortOrder = Number(body.sort_order) || 1;
          const placementPoints = body.placement_points || [];

          if (!name) {
            return NextResponse.json({ success: false, message: 'Column name is required.' }, { status: 400 });
          }

          const ruleId = crypto.randomUUID();
          const nowIso = new Date().toISOString();

          const newRule = {
            id: ruleId,
            tournament_id: slug,
            name,
            type: ruleType,
            points_per_unit: pointsPerUnit,
            sort_order: sortOrder,
            created_at: nowIso,
            updated_at: nowIso,
          };

          await supabaseAdmin.from('tournament_scoring_rules').insert([newRule]);

          let cleanPlacementPoints: any[] = [];
          if (ruleType === 'PLACEMENT') {
            cleanPlacementPoints = (Array.isArray(placementPoints) ? placementPoints : []).map((p: any) => ({
              id: crypto.randomUUID(),
              scoring_rule_id: ruleId,
              placement: Number(p.placement),
              points: Number(p.points),
            }));
            if (cleanPlacementPoints.length > 0) {
              await supabaseAdmin.from('placement_scoring_rules').insert(cleanPlacementPoints);
            }
          }

          await recalculateMatchResults(slug);

          return NextResponse.json({
            success: true,
            message: `Scoring column '${name}' added successfully.`,
            column: {
              ...newRule,
              placement_points: cleanPlacementPoints.map((p) => ({ id: p.id, placement: p.placement, points: p.points })),
            },
          }, { status: 201 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to add rule.' }, { status: 500 });
        }
      }

      // POST /api/leaderboard/:slug/rules/reorder
      if (subAction === 'reorder' && method === 'POST') {
        try {
          const body = await req.json().catch(() => ({}));
          const ruleIds = body.rule_ids || [];
          for (let i = 0; i < ruleIds.length; i++) {
            await supabaseAdmin.from('tournament_scoring_rules').update({ sort_order: i + 1 }).eq('id', ruleIds[i]);
          }
          return NextResponse.json({ success: true, message: 'Rules reordered.' }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to reorder rules.' }, { status: 500 });
        }
      }

      // PUT /api/leaderboard/:slug/rules/:id
      if (subAction && method === 'PUT') {
        const ruleId = subAction;
        try {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').trim();
          const ruleType = (body.type || 'PER_UNIT').trim().toUpperCase();
          const pointsPerUnit = Number(body.points_per_unit) || 0;
          const placementPoints = body.placement_points || [];
          const nowIso = new Date().toISOString();

          await supabaseAdmin.from('tournament_scoring_rules').update({
            name,
            type: ruleType,
            points_per_unit: pointsPerUnit,
            updated_at: nowIso,
          }).eq('id', ruleId);

          if (ruleType === 'PLACEMENT') {
            await supabaseAdmin.from('placement_scoring_rules').delete().eq('scoring_rule_id', ruleId);
            const cleanPlacementPoints = (Array.isArray(placementPoints) ? placementPoints : []).map((p: any) => ({
              id: crypto.randomUUID(),
              scoring_rule_id: ruleId,
              placement: Number(p.placement),
              points: Number(p.points),
            }));
            if (cleanPlacementPoints.length > 0) {
              await supabaseAdmin.from('placement_scoring_rules').insert(cleanPlacementPoints);
            }
          }

          await recalculateMatchResults(slug);

          return NextResponse.json({ success: true, message: 'Scoring rule updated.' }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to update rule.' }, { status: 500 });
        }
      }

      // DELETE /api/leaderboard/:slug/rules/:id
      if (subAction && method === 'DELETE') {
        const ruleId = subAction;
        try {
          await supabaseAdmin.from('placement_scoring_rules').delete().eq('scoring_rule_id', ruleId);
          await supabaseAdmin.from('tournament_scoring_rules').delete().eq('id', ruleId);
          await recalculateMatchResults(slug);
          return NextResponse.json({ success: true, message: 'Scoring rule deleted.' }, { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ success: false, message: err?.message || 'Failed to delete rule.' }, { status: 500 });
        }
      }
    }

    // 4. Standings: GET /api/leaderboard/:slug/standings
    if (action === 'standings' && method === 'GET') {
      try {
        const [rules, matchesRes, resultsRes, { registeredCount, presentTeams }] = await Promise.all([
          getRulesForTournament(slug),
          supabaseAdmin.from('tournament_matches').select('*').eq('tournament_id', slug).order('match_number', { ascending: true }),
          supabaseAdmin.from('match_team_results').select('*').eq('tournament_id', slug),
          getPresentTeamsForTournament(slug),
        ]);

        const matches = matchesRes.data || [];
        const results = resultsRes.data || [];

        const resultsByMatch: Record<string, Record<string, any>> = {};
        matches.forEach((m: any) => {
          resultsByMatch[String(m.id)] = {};
        });
        results.forEach((r: any) => {
          const mid = String(r.match_id);
          const tid = String(r.team_id);
          if (!resultsByMatch[mid]) resultsByMatch[mid] = {};
          resultsByMatch[mid][tid] = r;
        });

        // Build standings for ONLY VERIFIED PRESENT teams!
        const standingsList = presentTeams.map((t: any) => {
          const tid = String(t.team_id);
          const matchScores: Record<string, number> = {};
          const matchBreakdowns: Record<string, any> = {};
          let overallTotal = 0;

          matches.forEach((m: any) => {
            const mid = String(m.id);
            const mRes = resultsByMatch[mid]?.[tid];
            let pts = 0;
            const rawScores: Record<string, number> = {};
            const calcScores: Record<string, number> = {};

            let isParticipating = true;
            if (mRes) {
              isParticipating = mRes.raw_scores?._participating !== 0 && mRes.raw_scores?._participating !== false;
              if (isParticipating) {
                const inRaw = mRes.raw_scores || {};
                rules.forEach((col: any) => {
                  const rVal = inRaw[col.id] !== undefined ? Number(inRaw[col.id]) || 0 : 0;
                  rawScores[col.id] = rVal;
                  calcScores[col.id] = calculateScoreForRule(col, rVal);
                });
                pts = mRes.total_points !== undefined ? Number(mRes.total_points) : Object.values(calcScores).reduce((a, b) => a + b, 0);
              } else {
                rules.forEach((col: any) => {
                  rawScores[col.id] = 0;
                  calcScores[col.id] = 0;
                });
                pts = 0;
              }
            } else {
              rules.forEach((col: any) => {
                rawScores[col.id] = 0;
                calcScores[col.id] = 0;
              });
              pts = 0;
              const matchResultsList = resultsByMatch[mid] ? Object.values(resultsByMatch[mid]) : [];
              if (matchResultsList.length > 0) {
                isParticipating = false;
              }
            }

            matchScores[mid] = pts;
            matchBreakdowns[mid] = {
              match_id: mid,
              match_title: m.title || `Match ${m.match_number || 1}`,
              match_number: Number(m.match_number) || 1,
              total_points: pts,
              raw_scores: rawScores,
              calculated_scores: calcScores,
              participating: isParticipating,
            };
            overallTotal += pts;
          });

          return {
            team_id: tid,
            team_name: t.team_name || 'Squad',
            captain_name: t.captain_name || '',
            captain_in_game_name: t.captain_in_game_name || '',
            college: t.college || '',
            pass_id: t.pass_id || '',
            match_scores: matchScores,
            match_breakdowns: matchBreakdowns,
            overall_total: overallTotal,
          };
        });

        // Deterministic sort: overall_total DESC, team_name ASC
        standingsList.sort((a, b) => {
          if (b.overall_total !== a.overall_total) return b.overall_total - a.overall_total;
          return a.team_name.localeCompare(b.team_name);
        });

        const rankedStandings = standingsList.map((row, idx) => ({
          ...row,
          rank: idx + 1,
        }));

        return NextResponse.json({
          success: true,
          tournament_slug: slug,
          matches,
          columns: rules,
          counts: {
            registered: registeredCount,
            present: presentTeams.length,
            matches: matches.length,
          },
          standings: rankedStandings,
        }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          tournament_slug: slug,
          matches: [],
          columns: [],
          counts: { registered: 0, present: 0, matches: 0 },
          standings: [],
        }, { status: 200 });
      }
    }

    // 5. Finalize: POST /api/leaderboard/:slug/finalize
    if (action === 'finalize' && method === 'POST') {
      try {
        const nowIso = new Date().toISOString();
        const { data: statusRows } = await supabaseAdmin.from('tournament_leaderboard_status').select('*').eq('tournament_id', slug);
        if (statusRows && statusRows.length > 0) {
          await supabaseAdmin.from('tournament_leaderboard_status').update({
            status: 'FINALIZED',
            finalized_at: nowIso,
            updated_at: nowIso,
          }).eq('tournament_id', slug);
        } else {
          await supabaseAdmin.from('tournament_leaderboard_status').insert([{
            id: crypto.randomUUID(),
            tournament_id: slug,
            status: 'FINALIZED',
            finalized_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          }]);
        }
        return NextResponse.json({ success: true, status: 'FINALIZED', finalized_at: nowIso }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err?.message || 'Failed to finalize.' }, { status: 500 });
      }
    }

    // 6. Submit: POST /api/leaderboard/:slug/submit
    if (action === 'submit' && method === 'POST') {
      try {
        const body = await req.json().catch(() => ({}));
        const nowIso = new Date().toISOString();
        const subId = crypto.randomUUID();

        await supabaseAdmin.from('tournament_submissions').insert([{
          id: subId,
          tournament_id: slug,
          status: 'SUBMITTED',
          notes: body.notes || '',
          submitted_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        }]);

        await supabaseAdmin.from('tournament_leaderboard_status').upsert({
          tournament_id: slug,
          status: 'SUBMITTED',
          submitted_at: nowIso,
          submission_id: subId,
          updated_at: nowIso,
        }, { onConflict: 'tournament_id' });

        return NextResponse.json({ success: true, status: 'SUBMITTED', submission_id: subId, submitted_at: nowIso }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err?.message || 'Failed to submit.' }, { status: 500 });
      }
    }

    // 7. Export CSV: GET /api/leaderboard/:slug/export
    if (action === 'export' && method === 'GET') {
      try {
        const [rules, matchesRes, resultsRes, { presentTeams }] = await Promise.all([
          getRulesForTournament(slug),
          supabaseAdmin.from('tournament_matches').select('*').eq('tournament_id', slug).order('match_number', { ascending: true }),
          supabaseAdmin.from('match_team_results').select('*').eq('tournament_id', slug),
          getPresentTeamsForTournament(slug),
        ]);

        const matches = matchesRes.data || [];
        const results = resultsRes.data || [];
        const resultsByMatch: Record<string, Record<string, any>> = {};
        matches.forEach((m: any) => { resultsByMatch[String(m.id)] = {}; });
        results.forEach((r: any) => {
          const mid = String(r.match_id);
          const tid = String(r.team_id);
          if (!resultsByMatch[mid]) resultsByMatch[mid] = {};
          resultsByMatch[mid][tid] = r;
        });

        const matchHeaders = matches.map((m: any) => `"${m.title || `Match ${m.match_number}`}"`);
        const csvHeader = ['Rank', 'Team Name', 'Captain Name', 'Captain IGN', 'College', 'Pass ID', ...matchHeaders, 'Overall Total'].join(',');

        const rows = presentTeams.map((t: any) => {
          const tid = String(t.team_id);
          let overall = 0;
          const matchPts = matches.map((m: any) => {
            const mid = String(m.id);
            const mRes = resultsByMatch[mid]?.[tid];
            const pts = Number(mRes?.total_points) || 0;
            overall += pts;
            return pts;
          });

          return [
            0,
            `"${(t.team_name || '').replace(/"/g, '""')}"`,
            `"${(t.captain_name || '').replace(/"/g, '""')}"`,
            `"${(t.captain_in_game_name || '').replace(/"/g, '""')}"`,
            `"${(t.college || '').replace(/"/g, '""')}"`,
            `"${(t.pass_id || '').replace(/"/g, '""')}"`,
            ...matchPts,
            overall,
          ];
        });

        rows.sort((a, b) => (b[b.length - 1] as number) - (a[a.length - 1] as number));
        rows.forEach((r, idx) => { r[0] = idx + 1; });

        const csvContent = [csvHeader, ...rows.map(r => r.join(','))].join('\n');

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="leaderboard_${slug}.csv"`,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err?.message || 'Export failed.' }, { status: 500 });
      }
    }

    // 8. Main Organizer View: GET /api/leaderboard/:slug
    if (!action && method === 'GET') {
      try {
        const [rules, matchesRes, { registeredCount, presentTeams }] = await Promise.all([
          getRulesForTournament(slug),
          supabaseAdmin.from('tournament_matches').select('*').eq('tournament_id', slug).order('match_number', { ascending: true }),
          getPresentTeamsForTournament(slug),
        ]);

        const matches = matchesRes.data || [];

        const formattedTeams = presentTeams.map((t: any, idx: number) => {
          const scores: Record<string, number> = {};
          rules.forEach((col: any) => {
            scores[col.id] = 0;
          });
          return {
            ...t,
            rank: idx + 1,
            scores,
            total: 0,
          };
        });

        return NextResponse.json({
          success: true,
          tournament_slug: slug,
          counts: {
            registered: registeredCount,
            present: presentTeams.length,
            matches: matches.length,
          },
          columns: rules,
          matches: matches,
          teams: formattedTeams,
        }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          tournament_slug: slug,
          counts: { registered: 0, present: 0, matches: 0 },
          columns: [],
          matches: [],
          teams: [],
        }, { status: 200 });
      }
    }
  }

  // Default fallback response: strict 404 instead of fake 200 OK
  return NextResponse.json({
    success: false,
    message: `API endpoint /api/${segments.join('/')} not found.`
  }, { status: 404 });
}

function isNextJsNativeRoute(segments: string[]): boolean {
  const main = segments[0] || '';
  const sub = segments[1] || '';
  const sub2 = segments[2] || '';

  if (main === 'health') return true;

  if (main === 'auth') {
    // Only register, login, logout, users, organizers, analytics are Next.js native.
    // profile, user, follow, following, update-role, users/role are Flask-backed!
    return sub === 'register' || sub === 'login' || sub === 'logout' ||
           sub === 'users' || sub === 'organizers' || sub === 'analytics';
  }

  if (main === 'contact' || main === 'contact_messages') return true;

  if (main === 'tournaments') {
    // tournaments/register is Flask-backed
    return sub !== 'register';
  }

  if (main === 'registrations') {
    return true;
  }

  if (main === 'attendance') {
    return true;
  }

  if (main === 'payments') {
    if (sub === 'manual' && sub2 === 'create') return true;
    if (sub === 'user-tournaments-status') return true;
  }

  if (main === 'leaderboard') {
    return true;
  }

  return false;
}

async function handleRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path || [];
  const pathStr = pathSegments.join('/');

  // 1. Next.js-native endpoints execute directly via Supabase
  if (isNextJsNativeRoute(pathSegments)) {
    return handleDirectDatabase(req, pathSegments);
  }

  // 2. All Flask-backed endpoints are proxied to Render Flask backend
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes && proxyRes.status !== 404 && proxyRes.status !== 502) {
    try {
      const responseData = await proxyRes.text();
      const contentType = proxyRes.headers.get('content-type') || 'application/json';
      return new NextResponse(responseData, {
        status: proxyRes.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (err) {
      console.error(`[API Proxy] Error parsing response from /api/${pathStr}:`, err);
    }
  }

  // 3. Fallback to direct database execution if Render is offline, sleeping, or route not found on Render
  const fallbackRes = await handleDirectDatabase(req, pathSegments);
  if (fallbackRes.status !== 404) {
    return fallbackRes;
  }

  // If proxyRes had a response (e.g. 400 validation error from Flask), return that
  if (proxyRes) {
    const responseData = await proxyRes.text();
    const contentType = proxyRes.headers.get('content-type') || 'application/json';
    return new NextResponse(responseData, {
      status: proxyRes.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 4. If Render is offline or unreachable and no fallback matches, return 502 Bad Gateway
  return NextResponse.json({
    success: false,
    message: 'Backend service unavailable. Please try again shortly.'
  }, { status: 502 });
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
