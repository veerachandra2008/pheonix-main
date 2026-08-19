import React from 'react'; // No change to content, just assuming new path

interface MatchProps {
  teamA: string;
  teamB: string;
  game: string;
  isLive: boolean;
  streamLink?: string;
}

export const MatchCard: React.FC<MatchProps> = ({ teamA, teamB, game, isLive, streamLink }) => {
  return (
    <div className="relative group bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-hidden">
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase text-red-500">Live Now</span>
        </div>
      )}
      
      <div className="text-zinc-500 text-xs font-bold uppercase mb-4">{game}</div>
      
      <div className="flex items-center justify-between gap-4">
        <div className="text-center flex-1">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl mx-auto mb-2" />
          <div className="font-black truncate uppercase tracking-tighter">{teamA}</div>
        </div>
        <div className="text-4xl font-black italic text-zinc-700">VS</div>
        <div className="text-center flex-1">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl mx-auto mb-2" />
          <div className="font-black truncate uppercase tracking-tighter">{teamB}</div>
        </div>
      </div>

      <button className="w-full mt-6 py-3 bg-white text-black rounded-xl font-black uppercase text-sm group-hover:bg-blue-500 group-hover:text-white transition-all">
        {isLive ? 'Watch Stream' : 'Set Reminder'}
      </button>
    </div>
  );
};