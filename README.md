# 🔥 Phoenix Esports & Gaming Tournament Platform

A next-generation, high-performance esports platform designed for competitive gaming communities, tournament organizers, and pro players. Built with Next.js 16 App Router, TypeScript, Tailwind CSS 4, Framer Motion, and WebGL shader animations.

---

## ✨ Features & Highlights

### 🏆 Tournament Hub & Live Brackets
- **Live Tournament Catalog**: Filter upcoming, ongoing, and completed esports tournaments across VALORANT, BGMI, CS2, and FC24.
- **Dynamic Brackets & Prize Pools**: Interactive single/double elimination bracket visualizers with live prize pool breakdowns.
- **Instant Team & Solo Registration**: Streamlined multi-step tournament registration flow with custom team roster selection.

### 🎮 Player Profiles & 4K Cards
- **Pro Player Cards**: 4K high-resolution portrait cards displaying game main overlay chips (`VALORANT MAIN`, `BGMI IGL`, `CS2 SNIPER`, `FC24 PRO`).
- **Interactive Leaderboards**: Filter pro players by Win Rate, K/D Ratio, Total Earnings, and Tournament MVPs.
- **Stat Tracking & Showcase**: Detailed individual player performance analytics, match history, and trophy cabinets.

### 📺 Live Telecaster & Broadcast Center
- **Live Match Streaming**: Built-in broadcast viewer featuring real-time match stats, scoreboards, and commentary.
- **Audio Equalizer Visualizer**: Dynamic animated frequency audio bars for active live streams.

### 👥 Team Profiles & Roster Hub
- **Team Command Center**: Detailed team pages featuring roster breakdowns, active tournaments, achievement showcases, and transfer histories.
- **Player Transfer & Recruitment**: Dedicated recruitment board for teams looking for players or free agents seeking rosters.

### 🛡️ Admin & Organizer Tools
- **Admin Analytics Dashboard**: System metrics, revenue tracking, user growth, and active tournament statistics.
- **Organizer Hosting Portal**: Application and management portal for community organizers to host official tournaments.

### 🎨 Next-Gen UI/UX Design
- **WebGL Ferrofluid & Shader Visuals**: Dynamic, interactive canvas backgrounds powered by OGL.
- **Bento Grid Layouts**: Modern feature showcases using fluid glassmorphism and ambient lighting effects.
- **Ultra-Responsive Navbar & Smooth Scroll**: Floating responsive navigation pill with active section tracking.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4, CSS Modules & Custom Glassmorphism
- **Animations**: Framer Motion & OGL (WebGL)
- **Icons**: Lucide React
- **State & Data Handling**: Zustand, TanStack Query & React Hook Form + Zod
- **Database / ORM**: Prisma ORM with PostgreSQL / SQLite support
- **Package Manager**: Bun / NPM

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/prashanthpoloju990-oss/pheonix.git
   cd pheonix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or with bun
   bun install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma db push
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Project Structure

```
├── public/                 # Static assets, gallery images, and media
├── src/
│   ├── app/                # Next.js App Router (Pages & API routes)
│   │   ├── admin/          # Admin analytics & dashboard
│   │   ├── organizer/      # Tournament organizer portal
│   │   ├── players/        # Pro player hub & leaderboards
│   │   ├── registration/   # Tournament registration workflow
│   │   ├── teams/          # Team profile & roster pages
│   │   └── tournaments/    # Tournament listing & detail pages
│   ├── components/         # UI components & features
│   │   ├── ui/             # Core UI components (Ferrofluid, Dialogs, Buttons)
│   │   └── xenova/         # Platform sections (Hero, Bento Grid, Trophy, LiveMatches)
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility modules & Prisma client
├── prisma/                 # Database schemas & migrations
└── README.md
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
