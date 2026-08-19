'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, School, Shirt, CheckCircle, ArrowRight } from 'lucide-react';

type ProfileCompletionModalProps = {
  isOpen: boolean;
  onComplete: (college: string, team: string) => void;
  onSkip?: () => void;
};

export default function ProfileCompletionModal({ isOpen, onComplete, onSkip }: ProfileCompletionModalProps) {
  const [college, setCollege] = useState('');
  const [team, setTeam] = useState('');
  const [step, setStep] = useState<'info' | 'complete'>('info');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!college.trim() || !team.trim()) {
      alert('Please fill in all fields');
      return;
    }
    setStep('complete');
    setTimeout(() => {
      onComplete(college, team);
    }, 2000);
  };

  const handleSkip = () => {
    setCollege('');
    setTeam('');
    setStep('info');
    onSkip?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden border border-white/10 bg-[#141416] shadow-[0_30px_100px_rgba(0,0,0,0.4)]"
            style={{ borderRadius: 12 }}
          >
            {/* Top bar */}
            <div className="h-1 bg-gradient-to-r from-[#00F5A0] to-[#7C3AED]" />

            <div className="p-8">
              <AnimatePresence mode="wait">
                {step === 'info' ? (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-black uppercase italic text-[#EEEEEE] mb-2">
                        Complete Your Profile
                      </h2>
                      <p className="text-sm text-[#888888]">
                        Add your college and team to unlock full player features and connect with your campus community.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* College Field */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#888888] mb-2">
                          College / University
                        </label>
                        <div
                          className="flex items-center gap-3 border border-white/10 bg-[#1A1A1F] px-4 py-3 transition focus-within:border-[#00F5A0]/60"
                          style={{ borderRadius: 8 }}
                        >
                          <School className="h-5 w-5 text-[#7C3AED] flex-shrink-0" />
                          <input
                            type="text"
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            placeholder="e.g., MIT, Stanford, IIT Bombay"
                            className="w-full bg-transparent text-[#EEEEEE] outline-none placeholder:text-[#888888]"
                          />
                        </div>
                      </div>

                      {/* Team Field */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#888888] mb-2">
                          Team / Organization
                        </label>
                        <div
                          className="flex items-center gap-3 border border-white/10 bg-[#1A1A1F] px-4 py-3 transition focus-within:border-[#00F5A0]/60"
                          style={{ borderRadius: 8 }}
                        >
                          <Shirt className="h-5 w-5 text-[#00F5A0] flex-shrink-0" />
                          <input
                            type="text"
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            placeholder="e.g., Valorant Squad, BGMI Team"
                            className="w-full bg-transparent text-[#EEEEEE] outline-none placeholder:text-[#888888]"
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider border border-white/10 bg-[#1A1A1F] text-[#888888] rounded transition hover:text-[#00F5A0]"
                        >
                          Skip for Now
                        </button>
                        <motion.button
                          type="submit"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider bg-[#00F5A0] text-[#0D2C1F] rounded transition"
                        >
                          Complete
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.6 }}
                      className="flex justify-center mb-4"
                    >
                      <CheckCircle className="h-16 w-16 text-[#00F5A0]" />
                    </motion.div>
                    <h3 className="text-xl font-black uppercase italic text-[#EEEEEE] mb-2">
                      Profile Complete!
                    </h3>
                    <p className="text-sm text-[#888888]">
                      Your profile has been updated. You're ready to compete!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
