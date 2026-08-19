'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  UserCheck,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { ProfileCard } from '@/components/ui/profile-card';
import FinalCTA from '@/components/xenova/FinalCTA';

type Player = {
  id: string;
  name: string;
  email: string;
  tag: string;
  bio?: string;
  college?: string;
  team?: string;
  followers: string[];
  following: string[];
  bannerImage?: string;
  avatarImage?: string;
};

const defaultCampusPlayers: Player[] = [
  {
    id: 'p-1',
    name: 'Aarav "Viper" Rao',
    email: 'aarav.rao@bits-pilani.ac.in',
    tag: 'viper_bits',
    bio: 'Apex Controller & IGL for BITS Titans. 3x National Campus MVP.',
    college: 'BITS Pilani',
    team: 'Team Titans',
    followers: ['u-1', 'u-2', 'u-3'],
    following: ['u-4'],
    bannerImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-2',
    name: 'Nisha "Blaze" Menon',
    email: 'nisha.m@iitb.ac.in',
    tag: 'blaze_iitb',
    bio: 'Entry Fragger & Team Captain at IIT Bombay Esports.',
    college: 'IIT Bombay',
    team: 'Team Phoenix',
    followers: ['u-1', 'u-5'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-3',
    name: 'Rehan "Scope" Khan',
    email: 'rehan.k@du.ac.in',
    tag: 'scope_du',
    bio: 'CS2 Sniper Specialist. National Collegiate Cup Finalist.',
    college: 'Delhi University Esports Hub',
    team: 'Cyber Hawks',
    followers: ['u-2', 'u-3', 'u-6'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-4',
    name: 'Kavya "Astra" Sharma',
    email: 'kavya.s@srm.edu.in',
    tag: 'astra_srm',
    bio: 'VALORANT Sentinel Main & Tactical Strategist.',
    college: 'SRM Institute of Tech',
    team: 'SRM Strikers',
    followers: ['u-4'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-5',
    name: 'Vikram "Ghost" Patel',
    email: 'vikram.p@anna.edu',
    tag: 'ghost_anna',
    bio: 'BGMI Rusher & Clutch Master for Anna Varsity.',
    college: 'Anna University',
    team: 'Vanguard Varsity',
    followers: ['u-1', 'u-7'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-6',
    name: 'Rohan "Zenith" Verma',
    email: 'rohan.v@vit.ac.in',
    tag: 'zenith_vit',
    bio: 'EA Sports FC24 Collegiate Champion. 1v1 Specialist.',
    college: 'Vellore Institute of Technology',
    team: 'VIT Elite',
    followers: ['u-3'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-7',
    name: 'Ananya "Shadow" Iyer',
    email: 'ananya.i@iitm.ac.in',
    tag: 'shadow_iitm',
    bio: 'Free Fire IGL & Strategic Analyst for IIT Madras.',
    college: 'IIT Madras',
    team: 'Madras Mutineers',
    followers: ['u-2', 'u-5', 'u-8'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-8',
    name: 'Dev "Phantom" Kapoor',
    email: 'dev.k@dtu.ac.in',
    tag: 'phantom_dtu',
    bio: 'Rocket League Freestyle Specialist & Air Dribble King.',
    college: 'Delhi Technological University',
    team: 'DTU Dynamos',
    followers: ['u-1'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-9',
    name: 'Siddharth "Blitz" Nair',
    email: 'siddharth.n@manipal.edu',
    tag: 'blitz_manipal',
    bio: 'COD Mobile Slayer & Ranked Leaderboard Top 100.',
    college: 'Manipal Academy of Higher Ed',
    team: 'Manipal Mavericks',
    followers: ['u-6', 'u-7'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-10',
    name: 'Meera "Cypher" Deshmukh',
    email: 'meera.d@vjti.ac.in',
    tag: 'cypher_vjti',
    bio: 'VALORANT Initiator & Setup Genius for VJTI Mumbai.',
    college: 'VJTI Mumbai',
    team: 'VJTI Warriors',
    followers: ['u-2'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-11',
    name: 'Tarun "Spectre" Gupta',
    email: 'tarun.g@iiith.ac.in',
    tag: 'spectre_iiit',
    bio: 'CS2 Rifler & Headshot Machine. IIIT Hyderabad Captain.',
    college: 'IIIT Hyderabad',
    team: 'Hyderabad Falcons',
    followers: ['u-4', 'u-9'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-12',
    name: 'Yash "Frost" Singhania',
    email: 'yash.s@ju.ac.in',
    tag: 'frost_jadavpur',
    bio: 'BGMI Support & Scout for Jadavpur Varsity Squad.',
    college: 'Jadavpur University',
    team: 'Jadavpur Jaguars',
    followers: ['u-1', 'u-10'],
    following: [],
    bannerImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  }
];

export default function PlayersPage() {
  const router = useRouter();
  const [session, setSession] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    let user = rawSession ? JSON.parse(rawSession) : null;
    if (!user) {
      user = {
        id: 'guest-user',
        name: 'Guest Athlete',
        email: 'guest@xenova.com',
        tag: 'guest_gamer',
        followers: [],
        following: [],
      };
    }
    setSession(user);

    try {
      const rawUsers = localStorage.getItem('xenova_users');
      const storedUsers: Player[] = rawUsers ? JSON.parse(rawUsers) : [];
      
      // Combine stored users with default campus players, ensuring uniqueness by ID & Email
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      const combined: Player[] = [];

      for (const u of storedUsers) {
        if (u && u.id && !seenIds.has(u.id)) {
          seenIds.add(u.id);
          if (u.email) seenEmails.add(u.email);
          combined.push(u);
        }
      }

      for (const dp of defaultCampusPlayers) {
        if (!seenIds.has(dp.id) && (!dp.email || !seenEmails.has(dp.email)) && dp.email !== user.email && dp.id !== user.id) {
          seenIds.add(dp.id);
          if (dp.email) seenEmails.add(dp.email);
          combined.push(dp);
        }
      }

      const otherPlayers = combined.filter((u: Player) => u.email !== user.email && u.id !== user.id);
      setPlayers(otherPlayers);
      setFilteredPlayers(otherPlayers);
      setLoading(false);
    } catch (error) {
      setPlayers(defaultCampusPlayers);
      setFilteredPlayers(defaultCampusPlayers);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    let filtered = players;

    if (selectedFilter === 'following') {
      filtered = players.filter((p) => session.following?.includes(p.id));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.tag.toLowerCase().includes(term) ||
          p.college?.toLowerCase().includes(term) ||
          p.team?.toLowerCase().includes(term)
      );
    }

    setFilteredPlayers(filtered);
  }, [searchTerm, selectedFilter, players, session]);

  const toggleFollow = (playerId: string) => {
    if (!session) return;

    const isFollowing = session.following?.includes(playerId);
    const updatedFollowing = isFollowing
      ? session.following.filter((id) => id !== playerId)
      : [...(session.following || []), playerId];

    const updatedUser = { ...session, following: updatedFollowing };
    localStorage.setItem('xenova_session', JSON.stringify(updatedUser));
    setSession(updatedUser);

    const updatedPlayers = players.map((p) => {
      if (p.id === playerId) {
        const hasFollower = p.followers?.includes(session.id);
        const updatedFollowers = hasFollower
          ? p.followers.filter((id) => id !== session.id)
          : [...(p.followers || []), session.id];
        return { ...p, followers: updatedFollowers };
      }
      return p;
    });

    setPlayers(updatedPlayers);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        
        <div className="absolute inset-0 z-0">
          <img
            src="/freefire.jpg"
            alt="Campus Athletes"
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Users className="h-4 w-4" /> Varsity Athlete Roster ({filteredPlayers.length} Connected)
              </div>

              <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
                Campus <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Athletes</span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-2xl">
                Connect with verified university gamers across India. Follow squad leaders, discover top duellists, and explore collegiate rosters.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-[#09090b] p-1.5 rounded-2xl border border-white/15 backdrop-blur-xl shadow-2xl shrink-0">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  selectedFilter === 'all' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Athletes ({players.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('following')}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  selectedFilter === 'following' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Following ({session?.following?.length || 0})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mt-8 pt-6 border-t border-zinc-900 relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search athlete tag, name, team or university..."
              className="w-full rounded-2xl border border-white/10 bg-[#09090b] pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition shadow-inner"
            />
          </div>

        </div>
      </section>

      {/* ═══════════════ PLAYERS GRID WITH REDESIGNED PROFILE CARDS ═══════════════ */}
      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {filteredPlayers.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-16 text-center text-zinc-400 text-sm">
              {selectedFilter === 'following'
                ? 'You are not following any campus athletes yet.'
                : 'No athletes match your search criteria.'}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((player, idx) => {
                const isFollowing = session?.following?.includes(player.id);
                
                const bannerImages = [
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&auto=format&fit=crop&q=80'
                ];
                
                const avatarImages = [
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'
                ];

                const cardBanner = player.bannerImage || bannerImages[idx % bannerImages.length];
                const cardAvatar = player.avatarImage || avatarImages[idx % avatarImages.length];

                const gameMains = ['VALORANT MAIN', 'BGMI IGL', 'CS2 SNIPER', 'FC24 PRO', 'APEX CONTROLLER', 'FREE FIRE IGL', 'ROCKET LEAGUE', 'CODM SLAYER'];
                const cardGameMain = gameMains[idx % gameMains.length];

                return (
                  <motion.div
                    key={`${player.id}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: (idx % 3) * 0.08 }}
                  >
                    <ProfileCard
                      name={player.name}
                      tag={player.tag}
                      timeAgo={`${player.followers?.length || 0} Followers`}
                      image={cardBanner}
                      avatar={cardAvatar}
                      college={player.college}
                      team={player.team}
                      gameMain={cardGameMain}
                      isFollowing={isFollowing}
                      onFollowToggle={() => toggleFollow(player.id)}
                      onViewProfile={() => router.push(`/players/${player.id}`)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* Final CTA */}
      <FinalCTA />
    </main>
  );
}
