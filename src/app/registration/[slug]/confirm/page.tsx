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
  Clock,
  RefreshCw,
} from 'lucide-react';
import { saveRegistration } from '@/lib/tournaments-db';
import { tournaments } from '@/app/tournaments/data';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { getXenovaSession } from '@/lib/auth-session';

interface PageProps {
  params?: Promise<{ slug: string }>;
}

declare global {
  interface Window {
    Razorpay?: any;
    Paytm?: any;
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
    'idle' | 'creating_order' | 'opening_gateway' | 'opening_razorpay' | 'verifying_payment' | 'generating_pass'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

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

    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlOrderId = searchParams.get('order_id');
        const urlStatus = searchParams.get('status');
        if (urlOrderId && (urlStatus === 'pending' || searchParams.get('pending') === 'true')) {
          setPendingOrderId(urlOrderId);
          setPendingMessage("Your payment is being confirmed by your bank/Paytm. Please don't pay again. We are checking the transaction.");
        }
      } catch {}
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
            const apiBase = getApiBaseUrl();
            const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              found = data.data.find((t: any) => t.slug === resolvedSlug);
            }
          } catch {}
        }

        let sessionUser: any = null;
        try {
          sessionUser = getXenovaSession();
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

  const loadPaytmScript = (paytmHost: string, mid: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if (window.Paytm && window.Paytm.CheckoutJS) {
        resolve(true);
        return;
      }
      const host = (paytmHost || 'https://securestage.paytmpayments.com').replace(/\/$/, '');
      const scriptSrc = `${host}/merchantpgpui/checkoutjs/merchants/${mid}.js`;
      const existingScript = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;
      if (existingScript) {
        if (window.Paytm?.CheckoutJS) {
          resolve(true);
          return;
        }
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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

  // Reconcile pending order authoritatively with backend
  const handleCheckPaymentStatus = async (overrideOrderId?: string) => {
    const targetOrderId = overrideOrderId || pendingOrderId;
    if (!targetOrderId) return;

    setIsReconciling(true);
    setErrorMessage('');
    const apiBase = getApiBaseUrl();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        router.push(`/login?redirect=/registration/${slug}/confirm`);
        return;
      }
      const token = session.access_token;

      const res = await fetch(`${apiBase}/payments/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ order_id: targetOrderId })
      });

      const data = await res.json().catch(() => ({}));

      if (data.local_status === 'SUCCESS' || data.passId || (data.success && data.reconciled && data.pass_id)) {
        const passId = data.passId || data.pass_id;
        try {
          sessionStorage.setItem(
            'reg_selection',
            JSON.stringify({
              ...selection,
              email,
              passId: passId,
              paymentId: targetOrderId,
            })
          );
        } catch {}
        router.push(`/registration/${slug}/pass?passId=${passId}`);
        return;
      }

      if (data.local_status === 'PENDING' || data.pending) {
        setPendingMessage("Your payment is still being confirmed. Please don't make another payment.");
      } else if (data.local_status === 'FAILED' || data.local_status === 'EXPIRED') {
        setPendingOrderId(null);
        setPendingMessage('');
        setErrorMessage('Payment failed. You can safely retry.');
      } else {
        setPendingMessage(data.message || 'Status checked. Transaction is still processing.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error checking payment status.');
    } finally {
      setIsReconciling(false);
    }
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
    const apiBase = getApiBaseUrl();

    // Authenticate user via Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      router.push(`/login?redirect=/registration/${slug}/confirm`);
      return;
    }
    const token = session.access_token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const numericAmount = parseFeeAmount(selection.tournamentFee);

    // ─── CASE A: FREE TOURNAMENT (Amount = 0) ───
    if (numericAmount === 0) {
      setPaymentStep('generating_pass');
      let createdPassId = '';

      try {
        const res = await fetch(`${apiBase}/registrations/create`, {
          method: 'POST',
          headers: authHeaders,
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
            players: selection.players || [],
            playerEmails: selection.playerEmails || [email],
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data.message || 'Registration failed.');
          setPaymentStep('idle');
          return;
        }

        if (data.success && data.passId) {
          createdPassId = data.passId;
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Network error connecting to registration server.');
        setPaymentStep('idle');
        return;
      }

      if (!createdPassId) {
        setErrorMessage('Failed to generate registration pass.');
        setPaymentStep('idle');
        return;
      }

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
      // Step 1: Request authoritative Paytm order from backend (server-authoritative amount)
      setPaymentStep('creating_order');
      let orderRes: Response;

      try {
        orderRes = await fetch(`${apiBase}/payments/create-order`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            name: selection.captainName,
            email,
            teamName: selection.teamName,
            tournamentSlug: selection.tournamentSlug,
            college: selection.college,
            players: selection.players || [],
          }),
        });
      } catch (fetchErr: any) {
        setErrorMessage('Could not connect to payment backend server. Please verify the backend server is running.');
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

      if (!orderRes.ok || !orderData || !orderData.success || !orderData.order_id || !orderData.txn_token) {
        if (orderRes.status === 409 && orderData?.pending && orderData?.order_id) {
          setPendingOrderId(orderData.order_id);
          setPendingMessage("Your payment is being confirmed by your bank/Paytm. Please don't pay again. We are checking the transaction.");
          setPaymentStep('idle');
          return;
        }
        if (orderData?.already_completed && orderData?.passId) {
          router.push(`/registration/${slug}/pass?passId=${orderData.passId}`);
          return;
        }
        setErrorMessage(orderData?.message || 'Failed to initialize payment order on Paytm.');
        setPaymentStep('idle');
        return;
      }

      // Step 2: Ensure Paytm CheckoutJS is loaded
      setPaymentStep('opening_gateway');
      const paytmHost = orderData.paytm_host || 'https://securestage.paytmpayments.com';
      const mid = orderData.mid;
      const isLoaded = await loadPaytmScript(paytmHost, mid);

      if (!isLoaded || !window.Paytm?.CheckoutJS) {
        setErrorMessage('Paytm Checkout failed to load. Please check your internet connection and try again.');
        setPaymentStep('idle');
        return;
      }

      // Step 3: Launch Paytm Checkout JS
      const amountStr = orderData.amount_rupees || (Number(orderData.amount) / 100).toFixed(2);
      const config = {
        root: '',
        flow: 'DEFAULT',
        data: {
          orderId: orderData.order_id,
          token: orderData.txn_token,
          tokenType: 'TXN_TOKEN',
          amount: amountStr,
        },
        handler: {
          notifyVerifyRequest: function (orderDetails: any) {
            console.log('[Paytm CheckoutJS] notifyVerifyRequest:', orderDetails);
          },
          transactionStatus: async function (paymentStatus: any) {
            console.log('[Paytm CheckoutJS] transactionStatus received:', paymentStatus);

            // If pending status reported by gateway
            if (paymentStatus && (paymentStatus.STATUS === 'PENDING' || paymentStatus.RESPCODE === '01')) {
              setPendingOrderId(orderData.order_id);
              setPendingMessage("Your payment is being confirmed by your bank/Paytm. Please don't pay again. We are checking the transaction.");
              setPaymentStep('idle');
              return;
            }

            // If explicit failure reported by gateway
            if (
              paymentStatus &&
              (paymentStatus.STATUS === 'TXN_FAILURE' ||
                paymentStatus.RESPCODE === '227' ||
                paymentStatus.RESPCODE === '295' ||
                paymentStatus.RESPCODE === '810')
            ) {
              setErrorMessage(paymentStatus.RESPMSG || 'Payment failed or was cancelled by user.');
              setPaymentStep('idle');
              return;
            }

            // Step 4: Authoritative Server-to-Server Payment Verification
            // Note: Browser response is never authoritative.
            // Backend executes Paytm Order Status API v3 query server-to-server.
            setPaymentStep('verifying_payment');

            try {
              const verifyRes = await fetch(`${apiBase}/payments/verify-payment`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                  order_id: orderData.order_id,
                  paytm_response: paymentStatus,
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
                  players: selection.players || [],
                  playerEmails: selection.playerEmails || [email],
                }),
              });

              let verifyData: any = null;
              try {
                verifyData = await verifyRes.json();
              } catch {
                setErrorMessage('Failed to parse payment verification response from server.');
                setPaymentStep('idle');
                return;
              }

              if (verifyRes.status === 202 || verifyData?.pending) {
                setPendingOrderId(orderData.order_id);
                setPendingMessage("Your payment is being confirmed by your bank/Paytm. Please don't pay again. We are checking the transaction.");
                setPaymentStep('idle');
                return;
              }

              if (!verifyRes.ok || !verifyData || !verifyData.success || !verifyData.passId) {
                setErrorMessage(
                  verifyData?.message || 'Paytm payment verification failed. No pass was generated.'
                );
                setPaymentStep('idle');
                return;
              }

              const verifiedPassId = verifyData.passId;

              setPaymentStep('generating_pass');
              try {
                sessionStorage.setItem(
                  'reg_selection',
                  JSON.stringify({
                    ...selection,
                    email,
                    passId: verifiedPassId,
                    paymentId: paymentStatus?.TXNID || orderData.order_id,
                  })
                );
              } catch {}

              router.push(`/registration/${slug}/pass?passId=${verifiedPassId}`);
            } catch (verifyErr: any) {
              setErrorMessage(verifyErr.message || 'Error occurred while verifying payment with Paytm.');
              setPaymentStep('idle');
            }
          },
        },
        merchant: {
          mid: mid,
          name: 'XENOVA Esports Platform',
          redirect: false,
        },
      };

      const launchPaytm = () => {
        window.Paytm.CheckoutJS.init(config)
          .then(() => {
            window.Paytm.CheckoutJS.invoke();
          })
          .catch((initErr: any) => {
            console.error('Paytm CheckoutJS init error:', initErr);
            setErrorMessage(initErr?.message || 'Could not open Paytm payment interface.');
            setPaymentStep('idle');
          });
      };

      if (typeof window.Paytm.CheckoutJS.onLoad === 'function') {
        window.Paytm.CheckoutJS.onLoad(launchPaytm);
      } else {
        launchPaytm();
      }
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
            {paymentStep === 'opening_gateway' && 'Opening Paytm Secure Gateway...'}
            {paymentStep === 'opening_razorpay' && 'Opening Secure Gateway...'}
            {paymentStep === 'verifying_payment' && 'Authoritatively Verifying Payment with Paytm...'}
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

        {/* Pending payment notification banner */}
        {pendingOrderId && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Payment Confirmation in Progress</p>
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  {pendingMessage || "Your payment is being confirmed by your bank/Paytm. Please don't pay again. We are checking the transaction."}
                </p>
                <p className="text-xs text-zinc-400 font-mono mt-1">Order ID: {pendingOrderId}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => handleCheckPaymentStatus()}
                disabled={isReconciling}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check Payment Status
                  </>
                )}
              </button>
            </div>
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

        {/* Team card with 4 Players Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Verified 4-Player Roster</p>
            <span className="text-[10px] font-black uppercase text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              4 / 4 Members Registered
            </span>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center font-black text-lg text-emerald-400 shrink-0">
                {selection.teamName?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-white">{selection.teamName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{selection.college}</p>
              </div>
            </div>

            {/* 4-Player Table */}
            <div className="space-y-2 pt-2">
              {(selection.players && selection.players.length > 0 ? selection.players : [
                { slot: 1, name: selection.captainName, inGameTag: 'CAPTAIN', email: selection.email, isCaptain: true },
                { slot: 2, name: 'Teammate 2', inGameTag: 'PLAYER_2', email: 'teammate2@university.edu', isCaptain: false },
                { slot: 3, name: 'Teammate 3', inGameTag: 'PLAYER_3', email: 'teammate3@university.edu', isCaptain: false },
                { slot: 4, name: 'Teammate 4', inGameTag: 'PLAYER_4', email: 'teammate4@university.edu', isCaptain: false },
              ]).map((p: any) => (
                <div
                  key={p.slot}
                  className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                      p.isCaptain || p.slot === 1
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/10 text-slate-300'
                    }`}>
                      {p.isCaptain || p.slot === 1 ? '👑 Captain' : `P${p.slot}`}
                    </span>
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">({p.inGameTag || 'IGN'})</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 sm:text-right truncate">{p.email}</span>
                </div>
              ))}
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
          <div className="border-t border-white/[0.07] pt-4 space-y-3">
            {pendingOrderId ? (
              <button
                onClick={() => handleCheckPaymentStatus()}
                disabled={isReconciling}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 text-black font-black text-sm uppercase tracking-wider hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking Payment Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check Payment Status ({pendingOrderId})
                  </>
                )}
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
