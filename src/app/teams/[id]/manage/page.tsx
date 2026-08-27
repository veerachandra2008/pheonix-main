'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Trash2, 
  Plus, 
  Save, 
  ShieldCheck, 
  Gamepad2,
  Lock,
  Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const defaultTeams = [
  {
    slug: 'team-titans',
    name: 'Team Titans',
    college: 'Nexus Institute of Technology',
    game: 'Valorant',
    rank: 2,
    winRate: 86,
    streak: 'W7',
    captain: 'Aarav "Viper" Rao',
    trophies: 9,
    members: 6,
    accent: '#6366f1',
    roster: ['Aarav "Viper" Rao (Captain)', 'Rohan "Sage" Dev', 'Karan "Omen" Sen', 'Amit "Breach" Roy', 'Vikas "Sova" Jha', 'Neil "Jett" Vyas']
  },
  {
    slug: 'team-phoenix',
    name: 'Team Phoenix',
    college: 'Arcadia College',
    game: 'BGMI',
    rank: 1,
    winRate: 91,
    streak: 'W11',
    captain: 'Nisha "Blaze" Menon',
    trophies: 12,
    members: 5,
    accent: '#f43f5e',
    roster: ['Nisha "Blaze" Menon (Captain)', 'Rahul "Psycho" Nair', 'Abhi "Raptor" Sen', 'Vikram "Spike" Das', 'Kriti "Frost" Pillai']
  },
  {
    slug: 'team-wolves',
    name: 'Team Wolves',
    college: 'Metro School of Design',
    game: 'Valorant',
    rank: 5,
    winRate: 73,
    streak: 'L1',
    captain: 'Kabir "Ghost" Singh',
    trophies: 5,
    members: 6,
    accent: '#22d3ee',
    roster: ['Kabir "Ghost" Singh (Captain)', 'Siddharth "Neon" Lal', 'Aman "Cypher" Shah', 'Meera "Fade" Patel', 'Dev "Chamber" Gill', 'Jaya "Reyna" Bose']
  },
  {
    slug: 'team-alpha',
    name: 'Team Alpha',
    college: 'Eastern Commerce University',
    game: 'Free Fire',
    rank: 8,
    winRate: 68,
    streak: 'W2',
    captain: 'Ishan "Ace" Verma',
    trophies: 4,
    members: 4,
    accent: '#10b981',
    roster: ['Ishan "Ace" Verma (Captain)', 'Raj "Sniper" Pal', 'Priya "Storm" Vyas', 'Sunny "Viper" Gill']
  },
  {
    slug: 'cyber-hawks',
    name: 'Cyber Hawks',
    college: 'Westbridge Engineering College',
    game: 'CS2',
    rank: 4,
    winRate: 79,
    streak: 'W4',
    captain: 'Rehan "Scope" Khan',
    trophies: 7,
    members: 5,
    accent: '#fbbf24',
    roster: ['Rehan "Scope" Khan (Captain)', 'Arijit "Flash" Roy', 'Nikhil "Smoke" Dev', 'Sameer "Burst" Das', 'Tanu "Heal" Shah']
  },
  {
    slug: 'royal-strikers',
    name: 'Royal Strikers',
    college: 'National Sports Academy',
    game: 'FC24',
    rank: 6,
    winRate: 75,
    streak: 'W3',
    captain: 'Dev "Prime" Kapoor',
    trophies: 6,
    members: 3,
    accent: '#a855f7',
    roster: ['Dev "Prime" Kapoor (Captain)', 'Aashish "Striker" Rao', 'Varun "Defense" Sen']
  },
];

interface Props {
  params?: Promise<{ id: string }>;
}

export default function TeamManagePage({ params }: Props) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || '';
  const router = useRouter();
  
  const [teamName, setTeamName] = useState('');
  const [activeGame, setActiveGame] = useState('Valorant');
  const [roster, setRoster] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [fullTeamData, setFullTeamData] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);

  const loadTeamAndInvites = () => {
    try {
      const rawCustom = localStorage.getItem('xenova_teams');
      const custom = rawCustom ? JSON.parse(rawCustom) : [];
      const combined = [...custom, ...defaultTeams];

      const foundTeam = combined.find(
        (t: any) => t.slug === id || t.name.toLowerCase().replace(/\s+/g, '-') === id
      );

      if (foundTeam) {
        setFullTeamData(foundTeam);
        setTeamName(foundTeam.name);
        setActiveGame(foundTeam.game);
        setRoster(foundTeam.roster || []);
      } else {
        router.replace('/teams');
        return;
      }

      // Load invites
      const rawInvites = localStorage.getItem('xenova_team_invites');
      const allInvites = rawInvites ? JSON.parse(rawInvites) : [];
      setInvites(allInvites.filter((inv: any) => inv.teamSlug === id || inv.teamSlug === foundTeam.slug));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTeamAndInvites();
    
    // Add event listener to reload when invites or roster updates
    window.addEventListener('xenova-teams-change', loadTeamAndInvites);
    return () => {
      window.removeEventListener('xenova-teams-change', loadTeamAndInvites);
    };
  }, [id, router]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlayer = newPlayerName.trim();
    if (!cleanPlayer) return;

    if (roster.some((p) => p.toLowerCase() === cleanPlayer.toLowerCase() || p.replace(' (Captain)', '').toLowerCase() === cleanPlayer.toLowerCase())) {
      alert('This player is already on the roster.');
      return;
    }

    if (invites.some((inv) => inv.invitedPlayerTagOrEmail.toLowerCase() === cleanPlayer.toLowerCase() && inv.status === 'pending')) {
      alert('An invitation has already been sent to this player.');
      return;
    }

    try {
      const rawAllInvites = localStorage.getItem('xenova_team_invites');
      const allInvites = rawAllInvites ? JSON.parse(rawAllInvites) : [];
      
      const newInvite = {
        id: Math.random().toString(36).substring(7),
        teamSlug: fullTeamData?.slug || id,
        teamName: teamName,
        invitedPlayerTagOrEmail: cleanPlayer,
        status: 'pending',
        sentAt: new Date().toLocaleDateString()
      };

      const updatedAllInvites = [newInvite, ...allInvites];
      localStorage.setItem('xenova_team_invites', JSON.stringify(updatedAllInvites));
      setInvites([newInvite, ...invites]);
      
      // Insert official team invitation notification into Supabase database
      const targetEmail = (cleanPlayer.includes('@') ? cleanPlayer : '').trim().toLowerCase();
      try {
        await supabase.from('notifications').insert({
          user_email: targetEmail || null,
          title: `Squad Invitation: ${teamName}`,
          message: `You have been officially invited to join "${teamName}" in the ${activeGame} division.`,
          type: 'team',
          badge: 'SQUAD INVITE',
          action_url: `/teams/${id}`,
          action_label: 'View Squad',
          read: false,
        });
      } catch (err) {
        console.warn('Supabase notification insert warning:', err);
      }

      setNewPlayerName('');
      alert(`Invitation sent to ${cleanPlayer}!`);
    } catch (e) {
      console.error(e);
      alert('Failed to send invitation');
    }
  };

  const handleCancelInvite = (inviteId: string) => {
    if (!confirm('Cancel this invitation?')) return;
    try {
      const rawAllInvites = localStorage.getItem('xenova_team_invites');
      let allInvites = rawAllInvites ? JSON.parse(rawAllInvites) : [];
      allInvites = allInvites.filter((inv: any) => inv.id !== inviteId);
      localStorage.setItem('xenova_team_invites', JSON.stringify(allInvites));
      setInvites(invites.filter((inv) => inv.id !== inviteId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickPlayer = (player: string) => {
    if (player.toLowerCase().includes('captain')) {
      alert('Cannot kick the Team Captain.');
      return;
    }
    const updatedRoster = roster.filter((p) => p !== player);
    setRoster(updatedRoster);

    // Save automatically
    try {
      const rawCustom = localStorage.getItem('xenova_teams');
      let custom = rawCustom ? JSON.parse(rawCustom) : [];
      if (!Array.isArray(custom)) custom = [];

      const filteredCustom = custom.filter((t: any) => t.slug !== fullTeamData.slug);

      const updatedTeam = {
        ...fullTeamData,
        roster: updatedRoster,
        members: updatedRoster.length,
      };

      localStorage.setItem('xenova_teams', JSON.stringify([...filteredCustom, updatedTeam]));
      window.dispatchEvent(new Event('xenova-teams-change'));
      alert(`${player} removed from the roster.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveChanges = () => {
    if (!teamName.trim()) {
      alert('Team Name is required.');
      return;
    }

    try {
      const rawCustom = localStorage.getItem('xenova_teams');
      let custom = rawCustom ? JSON.parse(rawCustom) : [];
      if (!Array.isArray(custom)) custom = [];

      const filteredCustom = custom.filter((t: any) => t.slug !== fullTeamData.slug);

      const updatedTeam = {
        ...fullTeamData,
        name: teamName,
        game: activeGame,
        roster: roster,
        members: roster.length,
      };

      localStorage.setItem('xenova_teams', JSON.stringify([...filteredCustom, updatedTeam]));
      alert('Team details saved successfully!');
      window.dispatchEvent(new Event('xenova-teams-change'));
      router.push(`/teams/${fullTeamData.slug || id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to save team roster changes.');
    }
  };

  if (!fullTeamData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(244,63,94,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <Link href={`/teams/${fullTeamData.slug || id}`} className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-400 transition mb-10">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Team Profile
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          
          {/* Settings Left Column */}
          <div className="space-y-6">
            <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl space-y-6 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-rose-400 mb-2">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em]">Captain Console</span>
                </div>
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Team Details</h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Name</span>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Division Focus</span>
                  <select
                    value={activeGame}
                    onChange={(e) => setActiveGame(e.target.value)}
                    className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white appearance-none"
                  >
                    {['Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC24'].map((g) => (
                      <option key={g} value={g} className="bg-[#0C111D] text-white">{g}</option>
                    ))}
                  </select>
                </label>

                <div className="pt-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Affiliated College</p>
                  <p className="text-sm text-slate-300 font-semibold mt-1">{fullTeamData.college}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveChanges}
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Team Details
            </button>
          </div>

          {/* Roster Right Column */}
          <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Roster Control</h2>
                <p className="text-xs text-slate-500 mt-1">Invite new players to join your official competitive roster.</p>
              </div>

              {/* Add player form */}
              <form onSubmit={handleSendInvite} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Invite Player (Name or Email)"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  className="px-4 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white transition rounded-xl flex items-center justify-center whitespace-nowrap text-xs font-black uppercase tracking-wider gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Invite
                </button>
              </form>

              {/* Pending Invites list */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sent Pending Invites</p>
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                      <div className="flex items-center gap-3 text-slate-400 text-xs">
                        <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="font-semibold">{inv.invitedPlayerTagOrEmail}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase">Pending</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-slate-500 hover:text-rose-500 transition text-xs font-bold uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Roster members list */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified Players ({roster.length})</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {roster.map((player, index) => {
                    const isCap = player.toLowerCase().includes('captain');
                    return (
                      <div key={index} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-slate-500 shrink-0" />
                          <span className="text-sm font-semibold text-white">{player}</span>
                        </div>
                        
                        {!isCap && (
                          <button
                            type="button"
                            onClick={() => handleKickPlayer(player)}
                            className="h-8 w-8 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition flex items-center justify-center rounded-lg"
                            title="Kick player"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-[10px] leading-relaxed text-slate-500 mt-6 flex items-center gap-3">
              <Lock className="h-5 w-5 shrink-0" />
              <span>Collegiate rosters require at least 3 active players to declare tournament readiness. Players must accept pending invitations under their notifications hub.</span>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
