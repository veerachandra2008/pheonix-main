'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, CheckCircle2, QrCode, Shield, Sparkles, Trophy, Calendar, MapPin, Users } from 'lucide-react';

interface TicketBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const eventsList = [
  { id: '1', name: 'Inter-College Valorant Showdown', game: 'VALORANT', date: 'Aug 05, 2026', host: 'IIT Bombay Esports' },
  { id: '2', name: 'National Collegiate BGMI Championship', game: 'BGMI', date: 'Aug 12, 2026', host: 'Delhi University Hub' },
  { id: '3', name: 'All-India CS2 Campus League', game: 'CS2', date: 'Aug 18, 2026', host: 'Anna University' },
];

const ticketTiers = [
  { id: 'competitor', title: 'Competitor Entry Pass', price: 'FREE', desc: 'For verified college players competing in official bracket rounds.' },
  { id: 'spectator', title: 'Spectator Stadium Pass', price: '₹99', desc: 'Live stream access, spectator chat badge, and community giveaways.' },
  { id: 'vip', title: 'VIP Campus Access Pass', price: '₹249', desc: 'Exclusive Discord lounge, priority entry, and tournament swag digital kit.' },
];

export default function TicketBookingModal({ isOpen, onClose }: TicketBookingModalProps) {
  const [selectedEvent, setSelectedEvent] = useState(eventsList[0]);
  const [selectedTier, setSelectedTier] = useState(ticketTiers[0]);
  const [formData, setFormData] = useState({ name: '', college: '', email: '', tag: '' });
  const [ticketIssued, setTicketIssued] = useState<any>(null);

  if (!isOpen) return null;

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const pass = {
      ticketId: `XEN-${Math.floor(100000 + Math.random() * 900000)}`,
      name: formData.name,
      tag: formData.tag || `@${formData.name.toUpperCase().replace(/\s+/g, '')}`,
      college: formData.college || 'Verified College',
      event: selectedEvent.name,
      game: selectedEvent.game,
      tier: selectedTier.title,
      price: selectedTier.price,
      date: selectedEvent.date,
    };

    setTicketIssued(pass);
  };

  const resetAndClose = () => {
    setTicketIssued(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#0E1119] p-6 sm:p-8 shadow-2xl text-white font-sans"
        >
          {/* Close button */}
          <button
            onClick={resetAndClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {!ticketIssued ? (
            <div className="space-y-6">
              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold uppercase tracking-tight text-white">Book Tournament Ticket</h2>
                  <p className="text-xs text-zinc-400">Select an event and issue your official pass.</p>
                </div>
              </div>

              <form onSubmit={handleBooking} className="space-y-5">
                {/* Event Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Select Tournament</label>
                  <select
                    value={selectedEvent.id}
                    onChange={(e) => {
                      const ev = eventsList.find((x) => x.id === e.target.value);
                      if (ev) setSelectedEvent(ev);
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  >
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-zinc-900 text-white">
                        {ev.name} ({ev.game})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ticket Tier Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Choose Pass Tier</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ticketTiers.map((tier) => {
                      const isSelected = selectedTier.id === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedTier(tier)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 text-white'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">{tier.price}</span>
                            <h4 className="text-xs font-bold text-white mt-1 leading-snug">{tier.title}</h4>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Aarav Rao"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">College / Institute</label>
                    <input
                      type="text"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      placeholder="IIT Bombay"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="aarav@university.edu"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">In-Game Tag</label>
                    <input
                      type="text"
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                      placeholder="VIPER#999"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" /> Issue Ticket Pass ({selectedTier.price})
                </button>
              </form>
            </div>
          ) : (
            /* Digital Ticket Result Card */
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Pass Issued Successfully</span>
                <h3 className="text-2xl font-extrabold text-white mt-1">{ticketIssued.event}</h3>
                <p className="text-xs text-zinc-400 mt-1">{ticketIssued.tier} • {ticketIssued.date}</p>
              </div>

              {/* Digital Pass Visual Card */}
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-900 p-6 text-left shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-zinc-500 block">Holder</span>
                    <span className="text-sm font-bold text-white uppercase">{ticketIssued.name}</span>
                    <span className="text-xs font-mono text-emerald-400 block">{ticketIssued.tag}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 block">Ticket Code</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">{ticketIssued.ticketId}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-zinc-500 block">University</span>
                    <span className="text-xs text-zinc-300">{ticketIssued.college}</span>
                  </div>
                  <div className="h-12 w-12 bg-white p-1 rounded-md flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-zinc-950" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Done / Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
