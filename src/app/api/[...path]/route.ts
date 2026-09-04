import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeTournamentPayload, CORE_TOURNAMENT_COLUMNS } from '@/lib/tournaments-db';

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
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        headers[key] = val;
      }
    });

    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text();
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
  } catch {
    return null; // Fallback to direct database execution
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
    if (method === 'GET') {
      const { data } = await supabase.from('tournaments').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }
    if (method === 'POST' && subSegment !== 'register') {
      const body = await req.json();
      const cleanPayload = sanitizeTournamentPayload(body);
      const insertPayload = { slug: body.slug || cleanPayload.slug, ...cleanPayload };
      
      const { data, error } = await supabase.from('tournaments').insert([insertPayload]).select();
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

        const { data: existing } = await supabase
          .from('tournaments')
          .select('id, slug')
          .eq('slug', targetSlug);

        let resData;
        if (existing && existing.length > 0) {
          const { data, error } = await supabase
            .from('tournaments')
            .update(cleanPayload)
            .eq('slug', targetSlug)
            .select();

          if (error) {
            console.error('Supabase API route update notice:', error);
          }
          resData = data && data.length > 0 ? data[0] : cleanPayload;
        } else {
          const insertPayload = { slug: targetSlug, ...cleanPayload };
          const { data, error } = await supabase
            .from('tournaments')
            .insert([insertPayload])
            .select();

          if (error) {
            console.error('Supabase API route insert notice:', error);
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
      const { error } = await supabase.from('tournaments').delete().eq('slug', idOrSlug);
      return NextResponse.json({ success: !error, message: 'Tournament deleted.' }, { status: 200 });
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

  // 7. Registrations Endpoints
  if (mainSegment === 'registrations') {
    if (method === 'GET') {
      const { data } = await supabase.from('registrations').select('*');
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('registrations').delete().eq('pass_id', idOrSlug);
      return NextResponse.json({ success: !error, message: 'Registration deleted.' }, { status: 200 });
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

  // 4. Registrations Endpoints
  if (mainSegment === 'registrations' || (mainSegment === 'tournaments' && subSegment === 'register')) {
    if (method === 'GET') {
      const url = new URL(req.url);
      const email = url.searchParams.get('email')?.trim().toLowerCase();
      const userId = url.searchParams.get('user_id')?.trim();

      let query = supabase.from('registrations').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    }

    if (method === 'POST') {
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
  }

  // Default fallback response: strict 404 instead of fake 200 OK
  return NextResponse.json({
    success: false,
    message: `API endpoint /api/${segments.join('/')} not found.`
  }, { status: 404 });
}

async function handleRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path || [];
  const pathStr = pathSegments.join('/');

  // Authoritative endpoints must ALWAYS execute directly via Supabase (never proxy to python)
  if (
    pathSegments[0] === 'auth' ||
    pathSegments[0] === 'registrations' ||
    pathSegments[0] === 'tournaments' ||
    pathSegments[0] === 'contact' ||
    pathSegments[0] === 'contact_messages'
  ) {
    return handleDirectDatabase(req, pathSegments);
  }

  // 1. First attempt: Proxy to Flask backend server for other endpoints
  const proxyRes = await tryProxyToBackend(req, pathStr);
  if (proxyRes) {
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
    } catch {}
  }

  // 2. Second attempt: Direct Database / Supabase execution
  return handleDirectDatabase(req, pathSegments);
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
