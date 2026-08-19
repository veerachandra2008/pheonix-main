'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, Shield, PlayCircle, Eye, Sparkles, X, Activity, MessageSquare, Send } from 'lucide-react';

interface Match {
  id: string;
  team1: { name: string; score: string; college: string; logo: string; winner?: boolean };
  team2: { name: string; score: string; college: string; logo: string; winner?: boolean };
  status: 'LIVE' | 'COMPLETED' | 'UPCOMING';
  stage: 'Quarterfinals' | 'Semifinals' | 'Grand Finals';
}

const defaultMatches: Match[] = [
  // Quarterfinals
  {
    id: 'm1',
    stage: 'Quarterfinals',
    status: 'COMPLETED',
    team1: { name: 'IIT Bombay Titans', score: '13', college: 'IIT Bombay', logo: 'IT', winner: true },
    team2: { name: 'BITS Pilani Vipers', score: '11', college: 'BITS Pilani', logo: 'BP' },
  },
  {
    id: 'm2',
    stage: 'Quarterfinals',
    status: 'COMPLETED',
    team1: { name: 'SRM Strikers', score: '9', college: 'SRM Univ', logo: 'SR' },
    team2: { name: 'Anna Univ Knights', score: '13', college: 'Anna Univ', logo: 'AK', winner: true },
  },
  {
    id: 'm3',
    stage: 'Quarterfinals',
    status: 'COMPLETED',
    team1: { name: 'Delhi Univ Hub', score: '13', college: 'Delhi Univ', logo: 'DU', winner: true },
    team2: { name: 'DTU Cyberpunks', score: '8', college: 'DTU Delhi', logo: 'DT' },
  },
  {
    id: 'm4',
    stage: 'Quarterfinals',
    status: 'COMPLETED',
    team1: { name: 'VJTI Warriors', score: '10', college: 'VJTI Mumbai', logo: 'VW' },
    team2: { name: 'COEP Strikers', score: '13', college: 'COEP Pune', logo: 'CS', winner: true },
  },
  // Semifinals
  {
    id: 'm5',
    stage: 'Semifinals',
    status: 'LIVE',
    team1: { name: 'IIT Bombay Titans', score: '12', college: 'IIT Bombay', logo: 'IT' },
    team2: { name: 'Anna Univ Knights', score: '10', college: 'Anna Univ', logo: 'AK' },
  },
  {
    id: 'm6',
    stage: 'Semifinals',
    status: 'UPCOMING',
    team1: { name: 'Delhi Univ Hub', score: '0', college: 'Delhi Univ', logo: 'DU' },
    team2: { name: 'COEP Strikers', score: '0', college: 'COEP Pune', logo: 'CS' },
  },
  // Grand Finals
  {
    id: 'm7',
    stage: 'Grand Finals',
    status: 'UPCOMING',
    team1: { name: 'TBD (Semi 1 Winner)', score: '-', college: 'Championship Finalist', logo: '🏆' },
    team2: { name: 'TBD (Semi 2 Winner)', score: '-', college: 'Championship Finalist', logo: '🏆' },
  },
];

export default function TournamentBracketTree() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [chatMessages, setChatMessages] = useState([
    { user: 'ViperMain99', text: 'IIT Bombay Titans looking clean on Haven retakes!', time: '12:04' },
    { user: 'ValorantAarav', text: 'Clutch defuse from Anna Univ Knights in round 18!', time: '12:05' },
  ]);
  const [newMsg, setNewMsg] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages([...chatMessages, { user: 'You (Spectator)', text: newMsg.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setNewMsg('');
  };

  const quarters = defaultMatches.filter((m) => m.stage === 'Quarterfinals');
  const semis = defaultMatches.filter((m) => m.stage === 'Semifinals');
  const finals = defaultMatches.filter((m) => m.stage === 'Grand Finals');

  return (
    <div className="space-y-8 font-sans">
      
      {/* Interactive Bracket Tree Grid */}
      <div className="grid gap-6 lg:grid-cols-3 relative overflow-x-auto p-4 bg-[#0A0D14] rounded-3xl border border-zinc-800/80 shadow-2xl">
        
        {/* ROUND 1: QUARTERFINALS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Quarterfinals (Bo3)</span>
          </div>
          <div className="space-y-3">
            {quarters.map((m) => (
              <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </div>

        {/* ROUND 2: SEMIFINALS */}
        <div className="space-y-4 lg:pt-12">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Swords className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Semifinals (Bo3)</span>
          </div>
          <div className="space-y-8">
            {semis.map((m) => (
              <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </div>

        {/* ROUND 3: GRAND FINALS */}
        <div className="space-y-4 lg:pt-24">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Grand Finals (Bo5)</span>
          </div>
          <div className="space-y-3">
            {finals.map((m) => (
              <MatchCard key={m.id} match={m} isFinals onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </div>

      </div>

      {/* SPECTATOR LOUNGE MODAL */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#0E1119] p-6 shadow-2xl text-white space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Match Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{selectedMatch.stage} • Live Spectator Lounge</span>
                  <h3 className="text-xl font-extrabold text-white mt-0.5">{selectedMatch.team1.name} vs {selectedMatch.team2.name}</h3>
                </div>
                <span className="px-3 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 animate-pulse" /> {selectedMatch.status}
                </span>
              </div>

              {/* Scoreboard visual */}
              <div className="grid grid-cols-3 gap-4 text-center items-center bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                    {selectedMatch.team1.logo}
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase">{selectedMatch.team1.name}</h4>
                  <p className="text-[11px] text-zinc-400">{selectedMatch.team1.college}</p>
                </div>

                <div>
                  <span className="text-3xl font-black font-mono text-emerald-400">{selectedMatch.team1.score} : {selectedMatch.team2.score}</span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1">Map 2 • Haven</span>
                </div>

                <div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 font-extrabold text-sm flex items-center justify-center mx-auto mb-2 border border-blue-500/30">
                    {selectedMatch.team2.logo}
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase">{selectedMatch.team2.name}</h4>
                  <p className="text-[11px] text-zinc-400">{selectedMatch.team2.college}</p>
                </div>
              </div>

              {/* Stream Chat Simulator */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <MessageSquare className="h-4 w-4 text-emerald-400" /> Caster Live Spectator Stream Chat
                </div>

                <div className="h-40 overflow-y-auto space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">{msg.time}</span>
                      <span className="font-bold text-emerald-400 shrink-0">{msg.user}:</span>
                      <span className="text-zinc-300">{msg.text}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Send caster message..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function MatchCard({ match, isFinals = false, onClick }: { match: Match; isFinals?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl border p-4 transition duration-200 shadow-md ${
        isFinals
          ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400'
          : match.status === 'LIVE'
          ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400'
          : 'border-zinc-800 bg-[#0E1119] hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-3">
        <span className={match.status === 'LIVE' ? 'text-emerald-400 flex items-center gap-1' : 'text-zinc-500'}>
          {match.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {match.status}
        </span>
        <span className="text-zinc-500 group-hover:text-white transition flex items-center gap-1">
          <Eye className="h-3 w-3" /> Spectate
        </span>
      </div>

      <div className="space-y-2">
        {/* Team 1 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${match.team1.winner ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-zinc-900/60'}`}>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold text-zinc-400 w-5">{match.team1.logo}</span>
            <span className={`text-xs font-bold truncate ${match.team1.winner ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {match.team1.name}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-white">{match.team1.score}</span>
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${match.team2.winner ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-zinc-900/60'}`}>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold text-zinc-400 w-5">{match.team2.logo}</span>
            <span className={`text-xs font-bold truncate ${match.team2.winner ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {match.team2.name}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-white">{match.team2.score}</span>
        </div>
      </div>
    </div>
  );
}
