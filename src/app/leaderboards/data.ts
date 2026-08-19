'use client';

export type LeaderboardEntry = {
  rank: number;
  name: string;
  tag: string;
  points: number;
  wins: number;
  change: string;
  accent: string;
  detail: string;
};

export const leaderboardTabs = ['Colleges', 'Players'] as const;

export const collegeStandings: LeaderboardEntry[] = [
  { rank: 1, name: 'IIT Bombay', tag: 'TECH', points: 12480, wins: 28, change: '+120', accent: '#FBBF24', detail: 'Top college with the strongest season momentum.' },
  { rank: 2, name: 'BITS Pilani', tag: 'PILA', points: 11820, wins: 25, change: '+85', accent: '#6366F1', detail: 'Second place with consistent tournament finishes.' },
  { rank: 3, name: 'VIT Vellore', tag: 'VITV', points: 10560, wins: 22, change: '+74', accent: '#FB923C', detail: 'Aggressive climb on the leaderboard this season.' },
  { rank: 4, name: 'DTU Delhi', tag: 'DTU', points: 9740, wins: 21, change: '+66', accent: '#22D3EE', detail: 'Strong defense and clutch performance in finals.' },
  { rank: 5, name: 'NIT Trichy', tag: 'NITT', points: 9210, wins: 19, change: '+52', accent: '#A855F7', detail: 'Fastest points growth over the last month.' },
  { rank: 6, name: 'IIIT Hyderabad', tag: 'IITH', points: 8870, wins: 18, change: '+40', accent: '#10B981', detail: 'Steady form with powerful late-game comebacks.' },
  { rank: 7, name: 'SRM Chennai', tag: 'SRM', points: 8460, wins: 16, change: '+33', accent: '#F43F5E', detail: 'Punchy roster with high aggression stats.' },
  { rank: 8, name: 'Amrita Coimbatore', tag: 'AMRI', points: 8180, wins: 15, change: '+26', accent: '#8B5CF6', detail: 'Advanced strategy and strong opening rounds.' },
];

export const playerStandings: LeaderboardEntry[] = [
  { rank: 1, name: 'Aman', tag: 'MVP', points: 6480, wins: 14, change: '+88', accent: '#FBBF24', detail: 'Highest clutch contribution with the strongest rating.' },
  { rank: 2, name: 'Riya', tag: 'SHD', points: 6260, wins: 13, change: '+73', accent: '#6366F1', detail: 'Elite support play and pressure control.' },
  { rank: 3, name: 'Karan', tag: 'STR', points: 5980, wins: 12, change: '+65', accent: '#FB923C', detail: 'Top damage output and map command.' },
  { rank: 4, name: 'Priya', tag: 'ZEN', points: 5620, wins: 11, change: '+50', accent: '#22D3EE', detail: 'Best objective control and timing.' },
  { rank: 5, name: 'Sameer', tag: 'GLD', points: 5390, wins: 10, change: '+43', accent: '#A855F7', detail: 'Explosive carry performance in eliminations.' },
  { rank: 6, name: 'Tanvi', tag: 'RAY', points: 5170, wins: 10, change: '+37', accent: '#10B981', detail: 'Consistent high-value plays every match.' },
  { rank: 7, name: 'Nikhil', tag: 'GRV', points: 4890, wins: 9, change: '+28', accent: '#F43F5E', detail: 'A rising star with clutch finishing power.' },
  { rank: 8, name: 'Meera', tag: 'ELY', points: 4620, wins: 8, change: '+24', accent: '#8B5CF6', detail: 'Steadiest form and low-risk decision making.' },
];
