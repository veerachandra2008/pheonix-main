import React, { useEffect, useState } from 'react';
import { MatchCard } from '@/components/live/MatchCard';
import { TrophyShowcase } from '@/components/xenova/TrophyShowcase';
import { BackgroundParticles } from '@/components/xenova/BackgroundParticles';
import Link from 'next/link';

const HomePage: React.FC<any> = ({ isLoggedIn: propsIsLoggedIn, user: propsUser }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(propsIsLoggedIn || false);
  const [user, setUser] = useState(propsUser || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('xenova_session');
    if (session) {
      setIsLoggedIn(true);
      setUser(JSON.parse(session));
    }
    setIsLoading(false);
  }, [propsIsLoggedIn, propsUser]);

  if (isLoading) return <div className="min-h-screen bg-black" />; // Prevent flash of landing page

  return (
    <div className="container mx-auto p-8">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-br from-blue-900 to-purple-900 rounded-3xl mb-12">
        <h1 className="hero-title text-6xl font-black uppercase tracking-tighter mb-4">Welcome to XENOVA</h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Your ultimate platform for collegiate esports. Compete, connect, and conquer!
        </p>
        {!isLoggedIn ? (
          <div className="mt-8 flex justify-center">
            <div className="flex gap-4">
              <Link href="/signup" className="bg-white text-black px-12 py-4 rounded-full font-black text-xl hover:bg-blue-400 hover:text-white transition-all shadow-lg hover:shadow-blue-500/50 transform hover:scale-105">
                GET STARTED
              </Link>
              <Link href="/login" className="bg-transparent border-2 border-white text-white px-12 py-4 rounded-full font-black text-xl hover:bg-white hover:text-black transition-all transform hover:scale-105">
                LOGIN
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/tournaments" className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-400 hover:text-white transition-all">
              Find Tournaments
            </Link>
            <Link href={`/players/${user?.tag || 'profile'}`} className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-white hover:text-black transition-all">
              My Profile
            </Link>
          </div>
        )}
      </section>

      {isLoggedIn && (
        <div className="animate-fade-in space-y-12">
          {/* Live Matches Section */}
          <section>
            <h2 className="text-4xl font-bold mb-8 text-center">Live Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <MatchCard teamA="Team Alpha" teamB="Team Beta" game="Valorant" isLive={true} streamLink="https://twitch.tv/stream1" />
              <MatchCard teamA="Gaming Gods" teamB="Pixel Prowlers" game="CS2" isLive={false} />
              <MatchCard teamA="Esports Elite" teamB="Victory Vipers" game="BGMI" isLive={true} streamLink="https://youtube.com/stream2" />
            </div>
          </section>

          {/* Trophy Section */}
          <TrophyShowcase />

          {/* Quick Links */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 hover:border-purple-500 transition-all">
              <h3 className="text-3xl font-bold mb-4">Leaderboards</h3>
              <p className="text-gray-400 mb-4">Track rankings and see where you stand among the best.</p>
              <Link href="/leaderboards" className="text-blue-400 hover:underline">View Leaderboards &rarr;</Link>
            </div>
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 hover:border-green-500 transition-all">
              <h3 className="text-3xl font-bold mb-4">AI Tools</h3>
              <p className="text-gray-400 mb-4">Generate posters, rules, and schedules with our smart AI.</p>
              <Link href="/ai-features" className="text-blue-400 hover:underline">Explore AI Features &rarr;</Link>
            </div>
          </section>
        </div>
      )}

      <footer className="relative py-20 mt-12 overflow-hidden border-t border-zinc-900">
        <BackgroundParticles />
        <p className="text-center text-zinc-600 relative z-10">© 2024 XENOVA ESPORTS PLATFORM</p>
      </footer>
    </div>
  );
};

export default HomePage;