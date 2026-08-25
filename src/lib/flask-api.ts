// src/lib/flask-api.ts
import { supabase } from './supabase';

const FLASK_API_BASE =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

export interface CreateOrderParams {
  tournamentId?: string;
  name: string;
  email: string;
  teamName: string;
  amount: number;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RegisterUserParams {
  name: string;
  email: string;
  password?: string;
  college?: string;
  role?: string;
}

export interface LoginUserParams {
  email: string;
  password?: string;
}

export const flaskApi = {
  // Check Flask API Status
  async healthCheck() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', service: 'Direct Supabase Mode' };
    }
  },

  // Register user (tries Flask API first, falls back to direct Supabase query)
  async registerUser(params: RegisterUserParams) {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok || res.status === 400) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Flask server not reachable, falling back to direct Supabase connection:', e);
    }

    // Direct Supabase Fallback
    try {
      const email = params.email.trim().toLowerCase();
      // Check if user exists
      const { data: existing } = await supabase.from('users').select('*').eq('email', email);
      if (existing && existing.length > 0) {
        return {
          success: false,
          already_registered: true,
          message: 'Account already exists for this email! Please sign in.',
        };
      }

      // Insert new user into Supabase 'users' table (Default to PLAYER)
      const initialRole = params.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PLAYER';
      const userPayload = {
        name: params.name,
        email: email,
        college: params.college || 'General Campus',
        role: initialRole,
        bio: `Registered player from ${params.college || 'Collegiate Esports'}`,
        rank: 1,
        win_rate: 0.0,
        trophies: 0,
      };

      const { data, error } = await supabase.from('users').insert([userPayload]).select();
      if (error) throw error;

      return {
        success: true,
        message: 'Registration successful! You are registered as PLAYER. You can now sign in.',
        user: data ? data[0] : userPayload,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Supabase registration error' };
    }
  },

  // Update User Role in Supabase (Used by Admin Approval / Revocation)
  async updateUserRole(email: string, role: 'ORGANIZER' | 'PLAYER') {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) return await res.json();
    } catch {}

    // Direct Supabase Fallback
    try {
      const cleanEmail = email.trim().toLowerCase();
      // Check if existing role is ADMIN
      const { data: existing } = await supabase.from('users').select('*').eq('email', cleanEmail);
      if (existing && existing.length > 0 && (existing[0].role === 'ADMIN' || existing[0].role === 'admin')) {
        return { success: true, message: 'User is ADMIN, role unchanged.' };
      }

      // Update role in Supabase 'users' table
      const { data, error } = await supabase.from('users').update({ role: role }).eq('email', cleanEmail);
      return { success: !error, message: `Role updated to ${role} in Supabase` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  // Delete / Revoke organizer privileges
  async deleteOrganizer(email: string) {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/organizers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (res.ok) return await res.json();
    } catch {}

    try {
      const res = await fetch(`${FLASK_API_BASE}/applications/organizer/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (res.ok) return await res.json();
    } catch {}

    // Direct Supabase Fallback
    try {
      const cleanEmail = email.trim().toLowerCase();
      await supabase.from('users').update({ role: 'PLAYER' }).eq('email', cleanEmail);
      await supabase.from('organizer_applications').delete().eq('email', cleanEmail);
      return { success: true, message: 'Organizer revoked in Supabase' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  // Login user (tries Flask API first, falls back to direct Supabase query)
  async loginUser(params: LoginUserParams) {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok || res.status === 404 || res.status === 401) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Flask server not reachable, falling back to direct Supabase connection:', e);
    }

    // Direct Supabase Fallback
    try {
      const email = params.email.trim().toLowerCase();
      const { data, error } = await supabase.from('users').select('*').eq('email', email);
      
      if (error) {
        console.error('Supabase query error:', error);
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          requires_registration: true,
          message: 'No account found with this email in Supabase! You must register first before signing in.',
        };
      }

      const user = data[0];
      return {
        success: true,
        message: 'Signed in successfully!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          college: user.college,
          role: (user.role || 'PLAYER').toLowerCase(),
          avatar: user.avatar_url || '/valorant.jpg',
          tag: `${(user.name || 'Gamer').toUpperCase().replace(/\s+/g, '')}#1337`,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        requires_registration: true,
        message: 'Could not connect to Supabase. Please verify your credentials or register first.',
      };
    }
  },

  // Create Razorpay Order via Flask Backend
  async createRazorpayOrder(params: CreateOrderParams) {
    const res = await fetch(`${FLASK_API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // Verify Payment Signature via Flask Backend
  async verifyPayment(params: VerifyPaymentParams) {
    const res = await fetch(`${FLASK_API_BASE}/payments/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // Fetch Colleges from Flask / Supabase
  async getColleges() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/colleges/`);
      if (res.ok) return await res.json();
    } catch {}
    const { data } = await supabase.from('colleges').select('*');
    return { success: true, data: data || [] };
  },

  // Fetch Teams from Flask / Supabase
  async getTeams() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/teams/`);
      if (res.ok) return await res.json();
    } catch {}
    const { data } = await supabase.from('teams').select('*');
    return { success: true, data: data || [] };
  },

  // Fetch Tournaments from Flask / Supabase
  async getTournaments() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/tournaments/`);
      if (res.ok) return await res.json();
    } catch {}
    const { data } = await supabase.from('tournaments').select('*');
    return { success: true, data: data || [] };
  },

  // Applications Hub API Methods
  async getApplications() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/applications/`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Applications fetch error:', e);
    }
    return {
      success: true,
      data: {
        organizers: [],
        teams: [],
        colleges: [],
        tournaments: [],
        stats: {
          pending_organizers: 0,
          pending_teams: 0,
          pending_colleges: 0,
          pending_tournaments: 0,
          total_pending: 0,
        },
      },
    };
  },

  async submitOrganizerApplication(payload: any) {
    const res = await fetch(`${FLASK_API_BASE}/applications/organizer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async handleOrganizerAction(email: string, action: 'approve' | 'reject') {
    const res = await fetch(`${FLASK_API_BASE}/applications/organizer/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action }),
    });
    return await res.json();
  },

  async handleTeamAction(identifier: { slug?: string; name?: string }, action: 'approve' | 'reject') {
    const res = await fetch(`${FLASK_API_BASE}/applications/team/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identifier, action }),
    });
    return await res.json();
  },

  async handleCollegeAction(identifier: { slug?: string; name?: string }, action: 'approve' | 'reject') {
    const res = await fetch(`${FLASK_API_BASE}/applications/college/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identifier, action }),
    });
    return await res.json();
  },

  async handleTournamentAction(slug: string, action: 'approve' | 'reject') {
    const res = await fetch(`${FLASK_API_BASE}/applications/tournament/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action }),
    });
    return await res.json();
  },

  async getOrganizers() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/organizers`);
      if (res.ok) return await res.json();
    } catch {}
    const { data } = await supabase.from('users').select('*').in('role', ['ORGANIZER', 'ADMIN', 'organizer', 'admin']);
    return { success: true, data: data || [] };
  },

  async getAllUsers() {
    try {
      const res = await fetch(`${FLASK_API_BASE}/auth/users`);
      if (res.ok) return await res.json();
    } catch {}
    const { data } = await supabase.from('users').select('*');
    return { success: true, data: data || [] };
  },

  async updateCollege(slug: string, payload: any) {
    const res = await fetch(`${FLASK_API_BASE}/colleges/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async deleteCollege(slug: string) {
    const res = await fetch(`${FLASK_API_BASE}/colleges/${slug}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  async updateTeam(slug: string, payload: any) {
    const res = await fetch(`${FLASK_API_BASE}/teams/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async deleteTeam(slug: string) {
    const res = await fetch(`${FLASK_API_BASE}/teams/${slug}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  async updateTournament(slug: string, payload: any) {
    const res = await fetch(`${FLASK_API_BASE}/tournaments/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async deleteTournament(slug: string) {
    const res = await fetch(`${FLASK_API_BASE}/tournaments/${slug}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  // Dedicated Event Attendance APIs (Stores in event_attendance table)
  async getEventAttendance(tournamentSlug?: string) {
    try {
      const query = tournamentSlug ? `?tournament_slug=${encodeURIComponent(tournamentSlug)}` : '';
      const res = await fetch(`${FLASK_API_BASE}/attendance${query}`, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Flask /attendance API not reachable, falling back to Supabase:', e);
    }

    // Direct Supabase Fallback for event_attendance
    try {
      let query = supabase.from('event_attendance').select('*');
      if (tournamentSlug) {
        query = query.eq('tournament_slug', tournamentSlug);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return { success: true, data };
      }
    } catch {}

    // Registrations fallback
    return await this.getRegistrationsByTournament(tournamentSlug);
  },

  async getRegistrationsByTournament(tournamentSlug?: string) {
    const query = tournamentSlug ? `?tournament_slug=${encodeURIComponent(tournamentSlug)}` : '';
    const res = await fetch(`${FLASK_API_BASE}/registrations${query}`, { cache: 'no-store' });
    return await res.json();
  },

  async updateAttendance(passId: string, attendanceStatus: 'PRESENT' | 'ABSENT' | 'NOT_MARKED', attendedBy?: string, additionalData?: any) {
    try {
      const res = await fetch(`${FLASK_API_BASE}/attendance/${encodeURIComponent(passId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_status: attendanceStatus,
          attended_by: attendedBy || 'Organizer',
          ...additionalData,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Flask attendance update notice, falling back:', e);
    }

    // Direct Supabase table fallback
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        pass_id: passId,
        attendance_status: attendanceStatus,
        attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
        attended_by: attendanceStatus === 'NOT_MARKED' ? null : (attendedBy || 'Organizer'),
        updated_at: nowIso,
        ...additionalData,
      };
      await supabase.from('event_attendance').upsert(payload, { onConflict: 'pass_id' });
      await supabase.from('registrations').update({
        attendance_status: attendanceStatus,
        attended_at: attendanceStatus === 'NOT_MARKED' ? null : nowIso,
        attended_by: attendanceStatus === 'NOT_MARKED' ? null : (attendedBy || 'Organizer'),
      }).eq('pass_id', passId);
      return { success: true, message: 'Updated via Supabase event_attendance table', data: payload };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async markRemainingAbsent(tournamentSlug: string, attendedBy?: string) {
    try {
      const res = await fetch(`${FLASK_API_BASE}/attendance/mark-all-absent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_slug: tournamentSlug,
          attended_by: attendedBy || 'Organizer',
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Batch mark absent error, falling back:', e);
    }

    // Direct Supabase fallback
    try {
      const nowIso = new Date().toISOString();
      await supabase.from('event_attendance').update({
        attendance_status: 'ABSENT',
        attended_at: nowIso,
        attended_by: attendedBy || 'Organizer',
        updated_at: nowIso,
      }).eq('tournament_slug', tournamentSlug).eq('attendance_status', 'NOT_MARKED');

      await supabase.from('registrations').update({
        attendance_status: 'ABSENT',
        attended_at: nowIso,
        attended_by: attendedBy || 'Organizer',
      }).eq('tournament_slug', tournamentSlug).eq('attendance_status', 'NOT_MARKED');

      return { success: true, message: 'Marked remaining absent in database' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
};
