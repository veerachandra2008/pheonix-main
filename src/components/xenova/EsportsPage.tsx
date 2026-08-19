'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';

type Feature = {
  title: string;
  detail: string;
  icon: LucideIcon;
};

type Spotlight = {
  label: string;
  value: string;
  meta: string;
  accent: string;
};

type EsportsPageProps = {
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  heroIcon: LucideIcon;
  features: Feature[];
  spotlights: Spotlight[];
  ticker: string[];
  closingTitle: string;
  closingText: string;
};

export function EsportsPage({
  accent,
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  heroIcon: HeroIcon,
  features,
  spotlights,
  ticker,
  closingTitle,
  closingText,
}: EsportsPageProps) {
  const tickerItems = [...ticker, ...ticker];

  return (
    <main className="arena-shell">
      <div className="arena-content">
        <section className="arena-hero">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-7"
            >
              <span className="arena-kicker" style={{ color: accent }}>
                <HeroIcon className="h-4 w-4" />
                {eyebrow}
              </span>
              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                {description}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryHref} className="arena-button arena-button-primary">
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={secondaryHref} className="arena-button arena-button-ghost">
                  {secondaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="arena-panel scan-panel min-h-[430px]"
            >
              <div className="relative z-10 grid h-full gap-4">
                {spotlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.18 + index * 0.08 }}
                    className="arena-card grid grid-cols-[1fr_auto] items-center gap-4"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
                      <h2 className="mt-3 text-2xl font-black text-white">{item.value}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.meta}</p>
                    </div>
                    <div
                      className="flex h-16 w-16 items-center justify-center border text-xl font-black"
                      style={{ borderColor: `${item.accent}66`, color: item.accent, background: `${item.accent}14`, borderRadius: 8 }}
                    >
                      {index + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <div className="arena-ticker">
          <div className="arena-ticker-track">
            {tickerItems.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="arena-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-500">Core System</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-black text-white sm:text-4xl">
                  Built like a tournament control room, polished like a broadcast package.
                </h2>
              </div>
              <div className="arena-kicker" style={{ color: accent }}>Live Interface</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.45, delay: index * 0.06 }}
                    className="arena-card"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center border"
                      style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14`, borderRadius: 8 }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{feature.detail}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="arena-section border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="arena-panel">
              <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-500">Final Push</p>
                  <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">{closingTitle}</h2>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{closingText}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {spotlights.slice(0, 4).map((item) => (
                    <div key={item.label} className="arena-card">
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
                      <p className="mt-3 text-2xl font-black text-white" style={{ color: item.accent }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
