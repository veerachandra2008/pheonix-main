import React from 'react';
import { VerifiedBadge, Trophy, Sword } from '@/components/icons';

const CollegePage = ({ collegeName = "Stanford Esports" }) => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Header - Long Scroll Area 1 */}
      <section className="h-[60vh] flex flex-col justify-end p-10 bg-gradient-to-t from-black to-blue-900">
        <div className="flex items-center gap-4">
          <h1 className="text-6xl font-black tracking-tighter uppercase">{collegeName}</h1>
          <VerifiedBadge className="w-10 h-10 text-blue-400" />
        </div>
        <p className="text-xl text-gray-400 mt-4 max-w-2xl">
          The official home for collegiate gaming. Competing in Valorant, CS2, and FC24.
        </p>
      </section>

      {/* Trophy Cabinet - Long Scroll Area 2 */}
      <section className="p-10 border-t border-gray-800">
        <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> Trophy Cabinet
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all">
              <div className="text-4xl mb-2">🏆</div>
              <div className="font-bold">Zonal Champions 2023</div>
              <div className="text-sm text-gray-500">Valorant Collegiate League</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Rivalries - Long Scroll Area 3 */}
      <section className="p-10 bg-zinc-950">
        <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Sword className="text-red-500" /> Inter-College Rivalries
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-black p-6 rounded-xl border-l-4 border-red-500">
            <div className="flex items-center gap-8">
              <span className="text-2xl font-bold">Stanford</span>
              <span className="text-gray-600 font-black italic">VS</span>
              <span className="text-2xl font-bold text-gray-400">MIT</span>
            </div>
            <button className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase text-sm">Watch Battle</button>
          </div>
        </div>
      </section>

      {/* College Leaderboard - Long Scroll Area 4 */}
      <section className="p-10">
        <h2 className="text-3xl font-bold mb-8">Top College Players</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 uppercase text-xs tracking-widest border-b border-gray-800">
              <th className="pb-4">Rank</th>
              <th className="pb-4">Player</th>
              <th className="pb-4">Game</th>
              <th className="pb-4">XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {[1, 2, 3, 4, 5].map((r) => (
              <tr key={r} className="hover:bg-gray-900/50 transition-colors">
                <td className="py-6 font-mono text-blue-500">#0{r}</td>
                <td className="py-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  <span className="font-bold">GamerName_{r}</span>
                </td>
                <td className="py-6 text-gray-300">Valorant</td>
                <td className="py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${100 - r * 10}%` }} />
                    </div>
                    <span className="text-xs">{5000 - r * 200} XP</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default CollegePage;
