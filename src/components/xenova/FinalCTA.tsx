'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, ArrowRight, Zap, ChevronRight } from 'lucide-react';
import Ferrofluid from '@/components/ui/Ferrofluid';

const footerLinks = {
  platform: [
    { label: 'Tournaments', href: '/tournaments' },
    { label: 'Leaderboards', href: '/leaderboards' },
    { label: 'Teams', href: '/teams' },
    { label: 'Players', href: '/players' },
  ],
  games: [
    { label: 'VALORANT', href: '#' },
    { label: 'CS2', href: '#' },
    { label: 'BGMI', href: '#' },
    { label: 'Apex Legends', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Partners', href: '#' },
    { label: 'Press Kit', href: '#' },
  ],
  support: [
    { label: 'Help Center', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
};

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const socialLinks = [
  { icon: DiscordIcon, href: '#', label: 'Discord' },
  { icon: TwitterIcon, href: '#', label: 'Twitter' },
  { icon: YoutubeIcon, href: '#', label: 'YouTube' },
  { icon: InstagramIcon, href: '#', label: 'Instagram' },
];

interface FinalCTAProps {
  showCTA?: boolean;
}

export default function FinalCTA({ showCTA }: FinalCTAProps) {
  const pathname = usePathname();
  const isMainPage = pathname === '/';
  const shouldRenderCTA = showCTA !== undefined ? showCTA : isMainPage;

  return (
    <footer className="relative bg-black border-t border-zinc-900 text-white font-sans overflow-hidden">
      
      {/* ═══════════════ FLAWLESS SLANT CUT CTA SECTION (MAIN PAGE ONLY) ═══════════════ */}
      {shouldRenderCTA && (
        <section className="relative z-10 py-16 md:py-24 bg-black overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
                
                {/* Left Side - Full Background Image Container */}
                <div className="lg:col-span-6 relative h-[320px] lg:h-auto w-full overflow-hidden group">
                  <img
                    src="/valorant.jpg"
                    alt="Esports Varsity Players Competing"
                    className="w-full h-full object-cover filter brightness-95 saturate-125 group-hover:scale-105 transition duration-700"
                  />
                  
                  {/* Gradient Vibe Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-[#09090b] lg:to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-90 lg:hidden" />

                  {/* Live Varsity League Badge */}
                  <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> Live Varsity League
                  </div>
                </div>

                {/* Slanted Cut Divider Overlay (Desktop Only) */}
                <div className="hidden lg:block absolute left-[50%] top-0 bottom-0 w-32 -ml-16 z-20 pointer-events-none">
                  <div 
                    className="w-full h-full bg-[#09090b]"
                    style={{
                      clipPath: 'polygon(65% 0, 100% 0, 35% 100%, 0 100%)',
                    }}
                  />
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-emerald-400 via-teal-300 to-emerald-500 opacity-70 blur-[1px]"
                    style={{
                      clipPath: 'polygon(63% 0, 66% 0, 33% 100%, 30% 100%)',
                    }}
                  />
                </div>

                {/* Right Side - Content & Action Panel */}
                <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col items-start justify-center space-y-6 text-left z-30 bg-[#09090b]">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Dominate the Brackets
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                    Ready to Claim Your <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Esports Legacy?</span>
                  </h2>

                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                    Connect with collegiate players, join verified university squads, and battle in high-stakes bracket tournaments across India.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link href="/login" prefetch={true}>
                      <button
                        type="button"
                        className="blob-btn bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 hover:scale-105 inline-flex items-center gap-2.5 cursor-pointer border border-emerald-400/40"
                      >
                        <span className="nav-menu-link tracking-[0.12em]">Get Started Free</span> <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>

                    <Link href="/tournaments" prefetch={true}>
                      <button
                        type="button"
                        className="blob-btn-secondary border border-white/15 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition hover:scale-105 inline-flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        <span className="nav-menu-link tracking-[0.12em]">Explore Tournaments</span>
                      </button>
                    </Link>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>
      )}

      {/* Footer Links & Navigation */}
      <div className="relative z-10 border-t border-zinc-900 bg-black overflow-hidden">
        
        {/* 🌊 REACT BITS FERROFLUID EFFECT BACKGROUND (FOOTER ONLY) 🌊 */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <Ferrofluid
            colors={["#ffffff", "#ffffff", "#ffffff"]}
            speed={0.5}
            scale={1}
            turbulence={1}
            fluidity={0.1}
            rimWidth={0.2}
            sharpness={3}
            shimmer={1}
            glow={2}
            flowDirection="down"
            opacity={1}
            mouseInteraction={true}
            mouseStrength={1}
            mouseRadius={0.3}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 w-fit">
                <Zap className="h-4 w-4 fill-emerald-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">XENOVA</span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                The official collegiate esports infrastructure for varsity squads and campus champions.
              </p>
              {/* Social Links */}
              <div className="flex gap-2 pt-1">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-400 flex items-center justify-center text-zinc-400 transition"
                      aria-label={social.label}
                    >
                      <Icon />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Links Columns */}
            {[
              { title: 'Platform', links: footerLinks.platform },
              { title: 'Games', links: footerLinks.games },
              { title: 'Company', links: footerLinks.company },
              { title: 'Support', links: footerLinks.support },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4">{section.title}</h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-zinc-400 hover:text-white text-xs transition inline-flex items-center gap-1 group"
                      >
                        {link.label}
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© 2026 XENOVA Esports Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['Terms of Service', 'Privacy Policy', 'Cookie Rules'].map((item) => (
                <a key={item} href="#" className="hover:text-zinc-300 transition">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
