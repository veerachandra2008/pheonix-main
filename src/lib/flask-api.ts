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
      const { data, error } = await supabase.from('users').insert([{ email: cleanEmail, role: role }]);
      return { success: !error, message: `Role updated to ${role} in Supabase` };
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
};
