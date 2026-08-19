'use client';

export interface Tournament {
  slug: string;
  title: string;
  host: string;
  image: string;
  game: string;
  status: 'Live' | 'Registering' | 'Upcoming';
  statusColor: string;
  prize: string;
  date: string;
  region: string;
  format: string;
  teams: string;
  filled: number;
  fee: string;
}

export const gameFilters = ['All', 'Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC / FIFA', 'COD Mobile', 'Apex Legends', 'Rocket League'];
export const statusFilters = ['All', 'Live', 'Registering', 'Upcoming'];

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
  {
    slug: 'apex-rivalry-iit-vs-nit',
    title: 'Apex Rivalry: IIT vs NIT',
    host: 'Xenova',
    image: '/apex.jpg',
    game: 'Apex Legends',
    status: 'Upcoming',
    statusColor: '#38BDF8',
    prize: '₹1,20,000',
    date: '2 Jul',
    region: 'Pan India',
    format: 'Trios Best of 5',
    teams: '24/32',
    filled: 75,
    fee: 'Free',
  },
];
