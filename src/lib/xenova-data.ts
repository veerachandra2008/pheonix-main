export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface XenovaCollege {
  slug: string;
  name: string;
  location: string;
  state: string;
  type: string;
  nationalRank: number;
  stateRank: number;
  players: number;
  teams: number;
  teamsCount?: number;
  trophies: number;
  wins: number;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verification_status?: VerificationStatus | string;
  accent: string;
  website: string;
  submittedBy?: string;
  submittedAt?: string;
  isCustom?: boolean;
}

export interface XenovaTeam {
  slug: string;
  name: string;
  college: string;
  game: string;
  rank: number;
  winRate: number;
  streak: string;
  captain: string;
  trophies: number;
  members: number;
  recentWins: number;
  form: string[];
  activeScore: number;
  joined: number;
  accent: string;
  roster?: string[];
  verified: boolean;
  verificationStatus: VerificationStatus;
  verification_status?: VerificationStatus | string;
  createdBy?: string;
  captainEmail?: string;
  isCustom?: boolean;
}

export const defaultColleges: XenovaCollege[] = [
  {
    slug: 'nexus-institute-of-technology',
    name: 'Nexus Institute of Technology',
    location: 'Bengaluru, Karnataka',
    state: 'Karnataka',
    type: 'Engineering',
    nationalRank: 1,
    stateRank: 1,
    players: 428,
    teams: 18,
    teamsCount: 18,
    trophies: 34,
    wins: 21,
    verified: true,
    verificationStatus: 'approved',
    accent: '#6366f1',
    website: 'nexus.edu',
  },
  {
    slug: 'arcadia-college',
    name: 'Arcadia College',
    location: 'Mumbai, Maharashtra',
    state: 'Maharashtra',
    type: 'University',
    nationalRank: 2,
    stateRank: 1,
    players: 392,
    teams: 16,
    teamsCount: 16,
    trophies: 31,
    wins: 19,
    verified: true,
    verificationStatus: 'approved',
    accent: '#f43f5e',
    website: 'arcadia.ac.in',
  },
  {
    slug: 'metro-school-of-design',
    name: 'Metro School of Design',
    location: 'New Delhi, Delhi',
    state: 'Delhi',
    type: 'Design',
    nationalRank: 5,
    stateRank: 2,
    players: 244,
    teams: 11,
    teamsCount: 11,
    trophies: 16,
    wins: 12,
    verified: true,
    verificationStatus: 'approved',
    accent: '#22d3ee',
    website: 'metrodesign.edu',
  },
  {
    slug: 'eastern-commerce-university',
    name: 'Eastern Commerce University',
    location: 'Chennai, Tamil Nadu',
    state: 'Tamil Nadu',
    type: 'Commerce',
    nationalRank: 8,
    stateRank: 3,
    players: 210,
    teams: 9,
    teamsCount: 9,
    trophies: 12,
    wins: 10,
    verified: true,
    verificationStatus: 'approved',
    accent: '#10b981',
    website: 'easterncommerce.com',
  },
  {
    slug: 'westbridge-engineering-college',
    name: 'Westbridge Engineering College',
    location: 'Hyderabad, Telangana',
    state: 'Telangana',
    type: 'Engineering',
    nationalRank: 4,
    stateRank: 1,
    players: 318,
    teams: 14,
    teamsCount: 14,
    trophies: 22,
    wins: 17,
    verified: true,
    verificationStatus: 'approved',
    accent: '#fbbf24',
    website: 'westbridge.edu',
  },
  {
    slug: 'national-sports-academy',
    name: 'National Sports Academy',
    location: 'Pune, Maharashtra',
    state: 'Maharashtra',
    type: 'Sports',
    nationalRank: 6,
    stateRank: 2,
    players: 276,
    teams: 12,
    teamsCount: 12,
    trophies: 18,
    wins: 14,
    verified: true,
    verificationStatus: 'approved',
    accent: '#a855f7',
    website: 'nsa.edu.in',
  },
  {
    slug: 'malla-reddy-university',
    name: 'Malla Reddy University',
    location: 'Hyderabad, Telangana',
    state: 'Telangana',
    type: 'University',
    nationalRank: 7,
    stateRank: 2,
    players: 264,
    teams: 10,
    teamsCount: 10,
    trophies: 15,
    wins: 11,
    verified: true,
    verificationStatus: 'approved',
    accent: '#ef4444',
    website: 'mallareddyuniversity.ac.in',
  },
];

export const defaultTeams: XenovaTeam[] = [
  { slug: 'team-titans', name: 'Team Titans', college: 'Nexus Institute of Technology', game: 'Valorant', rank: 2, winRate: 86, streak: 'W7', captain: 'Aarav "Viper" Rao', trophies: 9, members: 6, recentWins: 5, form: ['W', 'W', 'W', 'L', 'W'], activeScore: 98, joined: 2026, accent: '#6366f1', verified: true, verificationStatus: 'approved' },
  { slug: 'team-phoenix', name: 'Team Phoenix', college: 'Arcadia College', game: 'BGMI', rank: 1, winRate: 91, streak: 'W11', captain: 'Nisha "Blaze" Menon', trophies: 12, members: 5, recentWins: 7, form: ['W', 'W', 'W', 'W', 'W'], activeScore: 96, joined: 2025, accent: '#f43f5e', verified: true, verificationStatus: 'approved' },
  { slug: 'team-wolves', name: 'Team Wolves', college: 'Metro School of Design', game: 'Valorant', rank: 5, winRate: 73, streak: 'L1', captain: 'Kabir "Ghost" Singh', trophies: 5, members: 6, recentWins: 3, form: ['W', 'L', 'W', 'W', 'L'], activeScore: 88, joined: 2024, accent: '#22d3ee', verified: true, verificationStatus: 'approved' },
  { slug: 'team-alpha', name: 'Team Alpha', college: 'Eastern Commerce University', game: 'Free Fire', rank: 8, winRate: 68, streak: 'W2', captain: 'Ishan "Ace" Verma', trophies: 4, members: 4, recentWins: 2, form: ['L', 'W', 'L', 'W', 'W'], activeScore: 77, joined: 2026, accent: '#10b981', verified: true, verificationStatus: 'approved' },
  { slug: 'cyber-hawks', name: 'Cyber Hawks', college: 'Westbridge Engineering College', game: 'CS2', rank: 4, winRate: 79, streak: 'W4', captain: 'Rehan "Scope" Khan', trophies: 7, members: 5, recentWins: 4, form: ['W', 'W', 'L', 'W', 'W'], activeScore: 91, joined: 2025, accent: '#fbbf24', verified: true, verificationStatus: 'approved' },
  { slug: 'royal-strikers', name: 'Royal Strikers', college: 'National Sports Academy', game: 'FC24', rank: 6, winRate: 75, streak: 'W3', captain: 'Dev "Prime" Kapoor', trophies: 6, members: 3, recentWins: 4, form: ['W', 'L', 'W', 'W', 'W'], activeScore: 84, joined: 2024, accent: '#a855f7', verified: true, verificationStatus: 'approved' },
];

export const slugify = (value?: string) =>
  (value || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const parseStored = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getCustomColleges = () =>
  parseStored<XenovaCollege>('xenova_colleges').map((college) => ({
    ...college,
    slug: college.slug || slugify(college.name || 'college'),
    teams: college.teams ?? college.teamsCount ?? 0,
    teamsCount: college.teamsCount ?? college.teams ?? 0,
    verified: college.verificationStatus === 'approved' || college.verified === true,
    verificationStatus: college.verificationStatus || (college.verified ? 'approved' : 'pending'),
    isCustom: true,
  }));

export const saveCustomColleges = (colleges: XenovaCollege[]) => {
  localStorage.setItem('xenova_colleges', JSON.stringify(colleges));
  window.dispatchEvent(new Event('xenova-colleges-change'));
};

export const getAllColleges = ({ includePending = false } = {}) => {
  const custom = getCustomColleges();
  const combined = [...custom, ...defaultColleges];
  const seen = new Set<string>();
  const deduplicated = combined.filter((college) => {
    const key = (college.slug || slugify(college.name)).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return includePending ? deduplicated : deduplicated.filter((college) => college.verificationStatus === 'approved');
};

export const getVerifiedCollegeNames = () => getAllColleges().map((college) => college.name);

export const getCustomTeams = () =>
  parseStored<XenovaTeam>('xenova_teams').map((team) => ({
    ...team,
    slug: team.slug || slugify(team.name || 'team'),
    verified: team.verificationStatus === 'approved' || team.verified === true,
    verificationStatus: team.verificationStatus || (team.verified ? 'approved' : 'pending'),
    isCustom: true,
  }));

export const saveCustomTeams = (teams: XenovaTeam[]) => {
  localStorage.setItem('xenova_teams', JSON.stringify(teams));
  window.dispatchEvent(new Event('xenova-teams-change'));
};

export const getAllTeams = ({ includePending = false } = {}) => {
  const custom = getCustomTeams();
  const combined = [...custom, ...defaultTeams.map((team) => ({ ...team, isCustom: false }))];
  const seen = new Set<string>();
  const deduplicated = combined.filter((team) => {
    const key = (team.slug || slugify(team.name)).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return includePending ? deduplicated : deduplicated.filter((team) => team.verificationStatus === 'approved');
};
