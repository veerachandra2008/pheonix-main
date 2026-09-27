'use client';

export interface Tournament {
  id?: number | string;
  created_at?: string;
  slug: string;
  title: string;
  host: string;
  college?: string;
  image: string;
  game: string;
  status: 'Live' | 'Registering' | 'Upcoming';
  statusColor: string;
  prize: string;
  date: string;
  end_date?: string | null;
  endDate?: string | null;
  region: string;
  format: string;
  teams: string;
  filled: number;
  fee: string;
  description?: string;
  rules?: string;
  schedule?: string;
  map_pool?: string;
  discord_url?: string;
  contact_email?: string;
  registration_deadline?: string | null;
  is_registration_closed?: boolean;
  registeredCount?: number;
  remainingSlots?: number;
  totalSlots?: number;
}

export const gameFilters = ['All', 'Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC / FIFA', 'COD Mobile', 'Apex Legends', 'Rocket League'];
export const statusFilters = ['All', 'Live', 'Registering', 'Upcoming'];

export function isGameFilterMatch(tournamentGame?: string | null, selectedFilter?: string | null): boolean {
  if (!selectedFilter || selectedFilter.toLowerCase() === 'all') return true;
  if (!tournamentGame) return false;

  const tGame = tournamentGame.toLowerCase().trim();
  const filter = selectedFilter.toLowerCase().trim();

  // Exact or direct substring match
  if (tGame === filter || tGame.includes(filter) || filter.includes(tGame)) return true;

  const aliases: Record<string, string[]> = {
    'fc / fifa': ['fc', 'fifa', 'ea sports fc', 'fc24', 'fc 24', 'fc25', 'fifa 24', 'fifa 23', 'ea sports'],
    'cs2': ['cs2', 'cs:go', 'csgo', 'counter-strike', 'counter strike', 'counter strike 2'],
    'cod mobile': ['cod mobile', 'codm', 'call of duty: mobile', 'call of duty mobile', 'call of duty', 'cod'],
    'free fire': ['free fire', 'freefire', 'free fire max', 'ff'],
    'apex legends': ['apex legends', 'apex', 'apex mobile'],
    'rocket league': ['rocket league', 'rl', 'rocketleague'],
    'valorant': ['valorant', 'val'],
    'bgmi': ['bgmi', 'battlegrounds mobile india', 'pubg', 'pubg mobile'],
  };

  // Check if selected filter corresponds to an alias group
  for (const [key, aliasList] of Object.entries(aliases)) {
    if (filter === key || key.includes(filter) || filter.includes(key)) {
      if (aliasList.some((alias) => tGame.includes(alias) || alias.includes(tGame))) {
        return true;
      }
    }
  }

  // Check if tournament game matches any alias group and filter matches group key or aliases
  for (const [key, aliasList] of Object.entries(aliases)) {
    if (aliasList.some((alias) => tGame.includes(alias))) {
      if (filter === key || key.includes(filter) || aliasList.some((alias) => filter.includes(alias))) {
        return true;
      }
    }
  }

  return false;
}

export const tournaments: Tournament[] = [
  {
    slug: 'nexus-valorant-champions-cup',
    title: 'Nexus Valorant Champions Cup',
    host: 'Xenova',
    image: '/valorant.jpg',
    game: 'Valorant',
    status: 'Live',
    statusColor: '#FF3B30',
    prize: '₹50,000',
    date: '18 May',
    region: 'Pan India',
    format: 'Double Elimination',
    teams: '64/64',
    filled: 100,
    fee: 'Free',
  },
  {
    slug: 'bgmi-college-cup-season-4',
    title: 'BGMI College Cup Season 4',
    host: 'Xenova',
    image: '/bgmi.jpg',
    game: 'BGMI',
    status: 'Registering',
    statusColor: '#22C55E',
    prize: '₹2,50,000',
    date: '2 Jun',
    region: 'South Zone',
    format: 'Squad BR',
    teams: '78/128',
    filled: 61,
    fee: '₹500/team',
  },
  {
    slug: 'cs2-campus-clash',
    title: 'CS2 Campus Clash',
    host: 'Xenova',
    image: '/cs2.jpg',
    game: 'CS2',
    status: 'Upcoming',
    statusColor: '#38BDF8',
    prize: '₹1,80,000',
    date: '15 Jun',
    region: 'North Zone',
    format: 'Single Elim',
    teams: '32/64',
    filled: 50,
    fee: '₹300/team',
  },
  {
    slug: 'free-fire-bharat-league',
    title: 'Free Fire Bharat League',
    host: 'Xenova',
    image: '/freefire.jpg',
    game: 'Free Fire',
    status: 'Registering',
    statusColor: '#22C55E',
    prize: '₹3,20,000',
    date: '28 May',
    region: 'Pan India',
    format: 'Squad BR',
    teams: '152/200',
    filled: 76,
    fee: 'Free',
  },
  {
    slug: 'fc-collegiate-open',
    title: 'FC Collegiate Open',
    host: 'Xenova',
    image: '/fc.jpg',
    game: 'FC / FIFA',
    status: 'Live',
    statusColor: '#FF3B30',
    prize: '₹75,000',
    date: '15 May',
    region: 'West Zone',
    format: '1v1 Knockout',
    teams: '96/128',
    filled: 75,
    fee: '₹150',
  },
];
