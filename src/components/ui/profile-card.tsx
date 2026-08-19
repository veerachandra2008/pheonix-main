'use client';

import React from 'react';

export interface ProfileCardProps {
  name: string;
  tag: string;
  timeAgo?: string;
  image: string;
  avatar: string;
  college?: string;
  team?: string;
  gameMain?: string;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onViewProfile?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  tag,
  timeAgo = "Active Now",
  image,
  avatar,
  college,
  team,
  gameMain = "VARSITY PRO",
  isFollowing = false,
  onFollowToggle,
  onViewProfile,
}) => {
  return (
    <>
      <style jsx global>{`
        .hover-scale {
          transition: transform 700ms ease-out;
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        .image-scale {
          transition: transform 700ms ease-out;
        }
        
        .image-container:hover .image-scale {
          transform: scale(1.04);
        }
        
        .hover-translate {
          transition: transform 500ms ease-out;
        }
        
        .hover-translate:hover {
          transform: translateX(4px);
        }
        
        .hover-scale-sm {
          transition: transform 500ms ease-out;
        }
        
        .hover-scale-sm:hover {
          transform: scale(1.1);
        }
      `}</style>
      
      <div className="w-full">
        <div className="bg-zinc-900/90 border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden hover-scale transition-all duration-500 group">
          
          {/* Card Top Image Container */}
          <div 
            className="relative overflow-hidden image-container h-64 sm:h-72 cursor-pointer"
            onClick={onViewProfile}
          >
            <img 
              src={image}
              alt={name} 
              className="w-full h-full object-cover image-scale filter brightness-95 saturate-110"
            />
            {/* Gradient Dark Vignette Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
            
            {/* Top Left Game Main Badge */}
            <div className="absolute top-4 left-4 bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-300 shadow-lg">
              🎮 {gameMain}
            </div>

            {/* Top Right Team Badge */}
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[10px] font-black uppercase text-white shadow-lg">
              {team || 'Free Agent'}
            </div>

            {/* Bottom Name & College info */}
            <div className="absolute bottom-4 left-6 right-6">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white drop-shadow-lg tracking-tight group-hover:text-emerald-400 transition-colors">
                {name}
              </h2>
              <p className="text-xs text-zinc-300 font-extrabold drop-shadow mt-0.5">
                {college || 'University Esports'}
              </p>
            </div>
          </div>
          
          {/* Card Footer Info */}
          <div className="p-4 flex items-center justify-between bg-zinc-950 border-t border-zinc-800/80">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={onViewProfile}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden hover-scale-sm ring-2 ring-emerald-500/50 shrink-0 bg-zinc-800">
                <img 
                  src={avatar}
                  alt={name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hover-translate">
                <div className="text-xs font-black text-emerald-400">@{tag}</div>
                <div className="text-[10px] text-zinc-400 font-semibold">{timeAgo}</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onFollowToggle) onFollowToggle();
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider
                       transition-all duration-500 ease-out transform hover:scale-105 
                       active:scale-95 cursor-pointer shadow-md ${
                         isFollowing
                           ? 'bg-zinc-800 text-zinc-300 hover:bg-rose-500/20 hover:text-rose-400 border border-zinc-700'
                           : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
                       }`}
            >
              {isFollowing ? '✓ Following' : '+ Add member'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ProfileCard;
