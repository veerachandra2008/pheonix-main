'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  Mail, 
  Building2, 
  Gamepad2,
  CalendarCheck
} from 'lucide-react';

import { flaskApi } from '@/lib/flask-api';

export default function AdminOrganizerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const loadApplications = () => {
    try {
      const rawApps = localStorage.getItem('xenova_organizer_applications');
      let apps = rawApps ? JSON.parse(rawApps) : [];
      if (!Array.isArray(apps)) apps = [];
      setApplications(apps);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleAction = async (email: string, action: 'approve' | 'reject') => {
    try {
      // 1. Update User role in Supabase ('ORGANIZER' if approved, 'PLAYER' if rejected)
      const targetRole = action === 'approve' ? 'ORGANIZER' : 'PLAYER';
      await flaskApi.updateUserRole(email, targetRole);

      // 2. Update Application status
      const rawApps = localStorage.getItem('xenova_organizer_applications');
      let apps = rawApps ? JSON.parse(rawApps) : [];
      const updatedApps = apps.map((app: any) => {
        if (app.email?.toLowerCase() === email.toLowerCase()) {
          return { ...app, status: action === 'approve' ? 'approved' : 'rejected' };
        }
        return app;
      });
      localStorage.setItem('xenova_organizer_applications', JSON.stringify(updatedApps));

      // 3. Promote/demote user in local storage
      const rawUsers = localStorage.getItem('xenova_users');
      let users = rawUsers ? JSON.parse(rawUsers) : [];
      const updatedUsers = users.map((user: any) => {
        if (user.email?.toLowerCase() === email.toLowerCase()) {
          return { ...user, role: targetRole.toLowerCase() };
        }
        return user;
      });
      localStorage.setItem('xenova_users', JSON.stringify(updatedUsers));

      // 4. Sync active session if relevant
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        const sessionUser = JSON.parse(rawSession);
        if (sessionUser.email?.toLowerCase() === email.toLowerCase()) {
          sessionUser.role = targetRole.toLowerCase();
          localStorage.setItem('xenova_session', JSON.stringify(sessionUser));
          window.dispatchEvent(new Event('xenova-auth-change'));
        }
      }

      // Add a system notification for the user
      const rawNotifs = localStorage.getItem('xenova_notifications') || '[]';
      const notifications = JSON.parse(rawNotifs);
      const newNotif = {
        id: Math.random().toString(36).substring(7),
        userEmail: email,
        title: action === 'approve' ? 'Application Approved' : 'Application Rejected',
        message: action === 'approve' 
          ? 'Congratulations! Your application to become a Xenova organizer has been approved. You can now launch tournaments.'
          : 'Thank you for your application. Unfortunately, it has been rejected at this time. Please contact support for feedback.',
        type: action === 'approve' ? 'success' : 'alert',
        read: false,
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      localStorage.setItem('xenova_notifications', JSON.stringify([newNotif, ...notifications]));

      alert(`Application successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      loadApplications();
    } catch (e) {
      console.error(e);
      alert('An error occurred during application processing.');
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Roster Clearance</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Organizer Applications
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Audit and approve credentials of players wishing to host official college tournaments.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-white/5 border border-white/10 p-1 shrink-0" style={{ borderRadius: 12 }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition rounded-lg ${
                filter === t 
                  ? 'bg-rose-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Roster / applications list */}
      <section className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500">
            <Users className="h-10 w-10 mx-auto text-slate-600 mb-4" />
            <p className="text-sm font-bold uppercase tracking-wider">No applications found under this status</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredApps.map((app, idx) => (
              <motion.article
                key={app.email + idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl grid gap-6 md:grid-cols-[1.5fr_1fr]"
              >
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {app.status === 'approved' && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                      {app.status === 'rejected' && <X className="h-3 w-3 text-rose-400 shrink-0" />}
                      {app.status === 'pending' && <Clock className="h-3 w-3 text-amber-400 shrink-0" />}
                      {app.status}
                    </span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mt-3">{app.hostName}</h3>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      {app.email}
                    </span>
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      {app.college}
                    </span>
                    <span className="flex items-center gap-2">
                      <Gamepad2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      Fav Title: {app.preferredGame || 'Multiple'}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      Exp Level: {app.experience}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-sm leading-relaxed text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Hosting Intent / Experience</p>
                    "{app.details || 'No additional experience specified.'}"
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-between items-end gap-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic shrink-0">
                    Applied: {app.appliedAt || 'N/A'}
                  </span>

                  {app.status === 'pending' && (
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleAction(app.email, 'reject')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition px-5 py-3 text-[10px] font-black uppercase tracking-widest text-rose-400 rounded-xl"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(app.email, 'approve')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black transition px-5 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 rounded-xl"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
