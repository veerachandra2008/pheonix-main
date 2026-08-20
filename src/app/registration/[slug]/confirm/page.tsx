'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Mail,
  Lock,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { saveRegistration } from '@/lib/tournaments-db';
import { tournaments } from '@/app/tournaments/data';

interface PageProps {
  params?: Promise<{ slug: string }>;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function RegistrationStep2({ params: paramsPromise }: PageProps) {
  const urlParams = useParams();
  const rawSlug = (urlParams?.slug as string) || '';
  const router = useRouter();

  const [slug, setSlug] = useState(rawSlug);
  const [selection, setSelection] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [paymentStep, setPaymentStep] = useState<
    'idle' | 'creating_order' | 'opening_razorpay' | 'verifying_payment' | 'generating_pass'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let resolvedSlug = rawSlug;
    if (paramsPromise) {
      paramsPromise.then((p) => {
        if (p?.slug) {
          resolvedSlug = p.slug;
          setSlug(p.slug);
        }
      }).catch(() => {});
    }

    const raw = sessionStorage.getItem('reg_selection');
    if (raw) {
      const data = JSON.parse(raw);
      setSelection(data);
      setEmail(data.email || '');
    } else {
      async function resolveTournament() {
        let found: any = tournaments.find((t) => t.slug === resolvedSlug);
        if (!found) {
          try {
            const apiBase =
              typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                ? '/api'
                : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';
            const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              found = data.data.find((t: any) => t.slug === resolvedSlug);
            }
          } catch {}
        }

        let sessionUser: any = null;
        try {
          const rawSession = localStorage.getItem('xenova_session');
          if (rawSession) sessionUser = JSON.parse(rawSession);
        } catch {}

        if (found) {
          const fallbackSelection = {
            tournamentSlug: found.slug,
            tournamentTitle: found.title || found.name,
            tournamentGame: found.game || 'Esports',
            tournamentPrize: found.prize || '₹50,000',
            tournamentDate: found.date || 'Upcoming',
            tournamentFormat: found.format || 'Tournament',
            tournamentRegion: found.region || 'Pan India',
            tournamentFee: found.fee || 'Free',
            tournamentImage: found.image || '/hero-arena.jpg',
            teamId: 'team-1',
            teamName: sessionUser ? `${sessionUser.name}'s Squad` : 'Alpha Squad',
            college: sessionUser?.college || 'University',
            captainName: sessionUser?.name || 'Captain',
            email: sessionUser?.email || '',
          };
          setSelection(fallbackSelection);
          setEmail(fallbackSelection.email);
        } else {
          router.replace(`/registration/${resolvedSlug}`);
        }
      }
      resolveTournament();
    }

    // Preload Razorpay SDK script if not already present
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [rawSlug, paramsPromise, router]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      ) as HTMLScriptElement;
      if (existingScript) {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const validateEmail = (v: string) => {
    if (!v) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(v)) return 'Enter a valid email address';
    return '';
  };

  // Helper to extract numeric amount from fee string (e.g. "₹500/team" -> 500, "Free" -> 0)
  const parseFeeAmount = (feeStr?: string): number => {
    if (!feeStr || feeStr.toLowerCase().includes('free')) return 0;
    const match = feeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const handleContinue = async () => {
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    if (!confirmed) {
      setEmailError('Please confirm your student enrollment before proceeding.');
      return;
    }

    setErrorMessage('');
    const numericAmount = parseFeeAmount(selection.tournamentFee);
    const envUrl = process.env.NEXT_PUBLIC_FLASK_API_URL;
    const apiBase = envUrl ? (envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl) : '/api';

    // ─── CASE A: FREE TOURNAMENT (Amount = 0) ───
    if (numericAmount === 0) {
      setPaymentStep('generating_pass');
      let createdPassId = '';

      try {
        const res = await fetch(`${apiBase}/registrations/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentSlug: selection.tournamentSlug,
            tournamentTitle: selection.tournamentTitle,
            tournamentGame: selection.tournamentGame,
            tournamentDate: selection.tournamentDate,
            tournamentFormat: selection.tournamentFormat,
            tournamentRegion: selection.tournamentRegion,
            tournamentFee: selection.tournamentFee || 'Free',
            teamName: selection.teamName,
            college: selection.college,
            captainName: selection.captainName,
            email,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.passId) {
            createdPassId = data.passId;
          }
        }
      } catch (err: any) {
        console.warn('Backend pass generation notice:', err);
      }

      if (!createdPassId) {
        createdPassId = `XPH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      }

      try {
        await saveRegistration({
          tournamentSlug: selection.tournamentSlug,
          tournamentTitle: selection.tournamentTitle,
          tournamentGame: selection.tournamentGame,
          tournamentPrize: selection.tournamentPrize || 'Verified Entry',
          tournamentDate: selection.tournamentDate || 'Soon',
          tournamentFormat: selection.tournamentFormat || 'Tournament',
          tournamentRegion: selection.tournamentRegion || 'Pan India',
          tournamentFee: selection.tournamentFee || 'Free',
          teamId: selection.teamSlug || 'team-1',
          teamName: selection.teamName,
          college: selection.college,
          captainName: selection.captainName,
          email,
          passId: createdPassId,
          registeredAt: new Date().toISOString(),
        });
      } catch {}

      try {
        sessionStorage.setItem(
          'reg_selection',
          JSON.stringify({
            ...selection,
            email,
            passId: createdPassId,
          })
        );
      } catch {}

      router.push(`/registration/${slug}/pass?passId=${createdPassId}`);
      return;
    }

    // ─── CASE B: PAID TOURNAMENT (Amount > 0) ───
    try {
      // Step 1: Request real Razorpay order from backend
      setPaymentStep('creating_order');
      let orderRes: Response;

      try {
        orderRes = await fetch(`${apiBase}/payments/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: numericAmount,
            name: selection.captainName,
            email,
            teamName: selection.teamName,
            tournamentSlug: selection.tournamentSlug,
            college: selection.college,
          }),
        });
      } catch (fetchErr: any) {
        setErrorMessage('Could not connect to payment backend server. Please verify the Flask server is running.');
        setPaymentStep('idle');
        return;
      }

      let orderData: any = null;
      try {
        orderData = await orderRes.json();
      } catch (parseErr) {
        setErrorMessage(`Invalid response from payment server (status ${orderRes.status}).`);
        setPaymentStep('idle');
        return;
      }

      if (!orderRes.ok || !orderData || !orderData.success || !orderData.order_id || !orderData.key_id) {
        setErrorMessage(orderData?.message || 'Failed to initialize payment order on Razorpay.');
        setPaymentStep('idle');
        return;
      }

      // Step 2: Ensure Razorpay SDK is fully loaded before opening checkout
      setPaymentStep('opening_razorpay');
      const isLoaded = await loadRazorpayScript();

      if (!isLoaded || !window.Razorpay) {
        setErrorMessage('Razorpay SDK failed to load. Please check your internet connection and try again.');
        setPaymentStep('idle');
        return;
      }

      // Step 3: Launch Razorpay Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Xenova Esports Platform',
        description: `Entry Fee for ${selection.tournamentTitle}`,
        order_id: orderData.order_id,
        prefill: {
          name: selection.captainName,
          email,
        },
        theme: {
          color: '#10B981', // Emerald 500 theme accent
        },
        handler: async function (response: any) {
          if (!response.razorpay_payment_id || !response.razorpay_signature) {
            setErrorMessage('Payment completed on gateway but verification details were missing.');
            setPaymentStep('idle');
            return;
          }

          // Step 4: Backend HMAC-SHA256 Payment Verification
          setPaymentStep('verifying_payment');

          try {
            const verifyRes = await fetch(`${apiBase}/payments/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tournamentSlug: selection.tournamentSlug,
                tournamentTitle: selection.tournamentTitle,
                tournamentGame: selection.tournamentGame,
                tournamentDate: selection.tournamentDate,
                tournamentFormat: selection.tournamentFormat,
                tournamentRegion: selection.tournamentRegion,
                tournamentFee: selection.tournamentFee,
                teamName: selection.teamName,
                college: selection.college,
                captainName: selection.captainName,
                email,
                amount: numericAmount,
              }),
            });

            let verifyData: any = null;
            try {
              verifyData = await verifyRes.json();
            } catch (err) {
              setErrorMessage('Failed to parse payment verification response from server.');
              setPaymentStep('idle');
              return;
            }

            if (!verifyRes.ok || !verifyData || !verifyData.success || !verifyData.passId) {
              setErrorMessage(
                verifyData?.message || 'Payment signature verification failed. No pass was generated.'
              );
              setPaymentStep('idle');
              return;
            }

            const verifiedPassId = verifyData.passId;

            // Step 5: Save verified registration ONLY AFTER backend verification succeeds
            setPaymentStep('generating_pass');
            try {
              await saveRegistration({
                tournamentSlug: selection.tournamentSlug,
                tournamentTitle: selection.tournamentTitle,
                tournamentGame: selection.tournamentGame || 'Esports',
                tournamentPrize: selection.tournamentPrize || 'Verified Entry',
                tournamentDate: selection.tournamentDate || 'Soon',
                tournamentFormat: selection.tournamentFormat || 'Tournament',
                tournamentRegion: selection.tournamentRegion || 'Pan India',
                tournamentFee: selection.tournamentFee || 'Paid',
                teamId: selection.teamSlug || 'team-1',
                teamName: selection.teamName,
                college: selection.college,
                captainName: selection.captainName,
                email,
                passId: verifiedPassId,
                registeredAt: new Date().toISOString(),
              });
            } catch (saveErr) {
              console.warn('Local registration cache update notice:', saveErr);
            }

            try {
              sessionStorage.setItem(
                'reg_selection',
                JSON.stringify({
                  ...selection,
                  email,
                  passId: verifiedPassId,
                  paymentId: response.razorpay_payment_id,
                })
              );
            } catch {}

            router.push(`/registration/${slug}/pass?passId=${verifiedPassId}`);
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.message || 'Error occurred while verifying payment signature.');
            setPaymentStep('idle');
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentStep('idle');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        const failDesc = response?.error?.description || response?.error?.reason || 'Payment failed or was cancelled.';
        setErrorMessage(`Payment Failed: ${failDesc}`);
        setPaymentStep('idle');
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred initiating checkout.');
      setPaymentStep('idle');
    }
  };

  if (!selection) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin" />
      </main>
    );
  }

  const numericAmount = parseFeeAmount(selection.tournamentFee);

  return (
    <main className="min-h-screen bg-[#09090b] text-white font-sans relative">
      {/* ─── FULLSCREEN LOADING OVERLAY ─── */}
      {paymentStep !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <p className="text-xl font-black text-white tracking-tight mb-2">
            {paymentStep === 'creating_order' && 'Creating Payment Order...'}
            {paymentStep === 'opening_razorpay' && 'Opening Razorpay Secure Gateway...'}
            {paymentStep === 'verifying_payment' && 'Verifying HMAC Payment Signature...'}
            {paymentStep === 'generating_pass' && 'Generating Verified Database Ticket...'}
          </p>
          <p className="text-sm text-zinc-400 max-w-sm">
            Please do not refresh or close this window while we secure your entry pass.
          </p>
        </div>
      )}

      {/* ─── STICKY TOP NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href={`/registration/${slug}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          {/* Step Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {['Select Team', 'Verify Squad', 'Entry Pass'].map((label, i) => (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    i === 1
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : i < 1
                      ? 'text-emerald-600 border border-emerald-500/20'
                      : 'text-zinc-600 border border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                      i < 1
                        ? 'bg-emerald-500 text-black'
                        : i === 1
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/5 text-zinc-600'
                    }`}
                  >
                    {i < 1 ? (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  {label}
                </div>
                {i < 2 && <div className="w-4 h-px bg-white/[0.08]" />}
              </React.Fragment>
            ))}
          </div>

          <div className="text-xs text-zinc-600 font-medium">Step 2 of 3</div>
        </div>
      </nav>

      {/* ─── CONTENT ─── */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            Squad Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Confirm your squad details</h1>
          <p className="text-sm text-zinc-400">
            Review your team information and verify your student status before proceeding.
          </p>
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1 font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Tournament summary strip */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
            <img
              src={selection.tournamentImage || '/hero-arena.jpg'}
              alt={selection.tournamentGame}
              className="w-full h-full object-cover brightness-75"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{selection.tournamentTitle}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {selection.tournamentGame} · {selection.tournamentFormat} · {selection.tournamentDate}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-zinc-500">Entry Fee</p>
            <p className="text-sm font-black text-emerald-400">{selection.tournamentFee}</p>
          </div>
        </div>

        {/* Team card */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Registering Team</p>
          <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center font-black text-lg text-emerald-400 shrink-0">
                {selection.teamName?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-white">{selection.teamName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{selection.college}</p>
              </div>
              <div className="shrink-0">
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  SELECTED
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/[0.06]">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Captain</p>
                <p className="text-sm font-semibold text-white">{selection.captainName || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">University</p>
                <p className="text-sm font-semibold text-white truncate">{selection.college || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification form */}
        <div className="space-y-5 p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
          <div>
            <p className="text-sm font-bold text-white mb-1">Identity Verification</p>
            <p className="text-xs text-zinc-500">
              Your institutional email ties your registration to a verified student record.
            </p>
          </div>

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              University Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="you@university.ac.in"
              className={`w-full rounded-2xl bg-white/[0.04] border px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition backdrop-blur-sm ${
                emailError ? 'border-red-500/60' : 'border-white/10 hover:border-white/20'
              }`}
            />
            {emailError && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {emailError}
              </div>
            )}
          </div>

          {/* Confirmation checkbox */}
          <button
            onClick={() => {
              setConfirmed(!confirmed);
              setEmailError('');
            }}
            className="w-full flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-white/15 transition text-left"
          >
            <div
              className={`w-5 h-5 rounded-lg border shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200 ${
                confirmed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-white/[0.03]'
              }`}
            >
              {confirmed && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-snug">
                I confirm all team members are currently enrolled at{' '}
                <span className="text-emerald-400">{selection.college || 'my university'}</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                False declarations may result in immediate disqualification and account suspension.
              </p>
            </div>
          </button>
        </div>

        {/* Info strip */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-500/[0.06] border border-sky-500/20">
          <Lock className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your information is used solely for identity verification and tournament communications. It will not be shared with third parties.
          </p>
        </div>

        {/* Final summary before commit */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Order Summary</p>
          <div className="space-y-2.5">
            {[
              { label: 'Tournament', value: selection.tournamentTitle },
              { label: 'Team', value: selection.teamName },
              { label: 'Format', value: selection.tournamentFormat },
              { label: 'Date', value: selection.tournamentDate },
              { label: 'Entry Fee', value: selection.tournamentFee, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className={`text-xs font-semibold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.07] pt-4">
            <button
              onClick={handleContinue}
              disabled={paymentStep !== 'idle'}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-black font-black text-sm uppercase tracking-wider hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {numericAmount > 0 ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {selection.tournamentFee} & Confirm Registration
                </>
              ) : (
                <>
                  Confirm Registration (Free Entry)
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
