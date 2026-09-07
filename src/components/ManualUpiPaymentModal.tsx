'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import {
  X,
  CreditCard,
  AlertCircle,
  Upload,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldAlert,
  FileText,
  Phone,
  Hash,
} from 'lucide-react';
import { MANUAL_UPI_CONFIG } from '@/config/payment';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

interface ManualUpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentSlug: string;
  tournamentTitle: string;
  tournamentFee: string;
  selection: any; // Full registration payload with all 4 players
  captainEmail: string;
}

type ModalStep = 'qr' | 'details' | 'submitting' | 'pending_success';

export default function ManualUpiPaymentModal({
  isOpen,
  onClose,
  tournamentSlug,
  tournamentTitle,
  tournamentFee,
  selection,
  captainEmail,
}: ManualUpiPaymentModalProps) {
  const [step, setStep] = useState<ModalStep>('qr');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [utrId, setUtrId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [qrLoadError, setQrLoadError] = useState(false);

  // Validation & Error states
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedOrderId, setSubmittedOrderId] = useState('');
  const [submittedUtr, setSubmittedUtr] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate MIME type
    if (!MANUAL_UPI_CONFIG.allowedMimeTypes.includes(file.type)) {
      setErrorMessage('Invalid file format. Please upload a PNG, JPEG, or WEBP image.');
      return;
    }

    // Client-side 5MB limit check
    if (file.size > MANUAL_UPI_CONFIG.maxScreenshotSizeBytes) {
      setErrorMessage('Screenshot exceeds the 5MB size limit. Please choose a smaller image.');
      return;
    }

    setScreenshotFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit payment handler
  const handleSubmitPayment = async () => {
    setErrorMessage('');

    // 1. Validate Phone
    const cleanPhone = paymentPhone.trim().replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      setErrorMessage('Please enter a valid 10 to 15 digit UPI payment phone number.');
      return;
    }

    // 2. Validate UTR
    const cleanUtr = utrId.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 30) {
      setErrorMessage('Please enter a valid UTR / Transaction ID (6-30 characters).');
      return;
    }

    // 3. Validate Screenshot
    if (!screenshotFile) {
      setErrorMessage('Payment screenshot is required for organizer verification.');
      return;
    }

    setStep('submitting');

    try {
      // Authenticate via Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        setErrorMessage('Authentication session expired. Please log in again to submit.');
        setStep('details');
        return;
      }

      const token = session.access_token;
      const apiBase = getApiBaseUrl();

      // Construct multipart form-data
      const formData = new FormData();
      formData.append('tournamentSlug', tournamentSlug);
      formData.append('paymentPhoneNumber', cleanPhone);
      formData.append('utrId', cleanUtr);

      // Preserve the complete 4-player squad payload
      const regPayload = {
        team_name: selection?.teamName || '',
        college: selection?.college || '',
        captain_name: selection?.captainName || '',
        captain_email: captainEmail,
        players: selection?.players || [],
        tournament_slug: tournamentSlug,
      };
      formData.append('registrationData', JSON.stringify(regPayload));
      formData.append('screenshot', screenshotFile);

      const response = await fetch(`${apiBase}/payments/manual/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Let fetch set Content-Type with boundary for multipart/form-data
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 201 && data.success) {
        setSubmittedOrderId(data.order_id || '');
        setSubmittedUtr(cleanUtr);
        setStep('pending_success');
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('xenova-tournaments-updated'));
          }
        } catch {}
      } else {
        // User-friendly error message based on status code
        if (response.status === 401) {
          setErrorMessage('Session expired or unauthorized. Please log in again.');
        } else if (response.status === 409) {
          setErrorMessage(data.message || 'You already have a pending payment verification for this tournament.');
        } else if (response.status === 413) {
          setErrorMessage('The screenshot file is too large. Maximum size is 5MB.');
        } else {
          setErrorMessage(data.message || 'Payment submission failed. Please verify your details and try again.');
        }
        setStep('details');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error connecting to payment server. Please check your connection.');
      setStep('details');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col my-auto rounded-3xl bg-[#0B0F1C] border border-white/10 shadow-2xl shadow-emerald-500/10 overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Top Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="modal-title" className="text-sm font-bold tracking-wider uppercase text-white">
                {step === 'pending_success' ? 'Payment Submitted' : 'Pay via UPI'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-[220px] sm:max-w-[300px]">
                {tournamentTitle}
              </p>
            </div>
          </div>

          {step !== 'submitting' && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 1: QR DISPLAY                                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {step === 'qr' && (
            <div className="space-y-5 text-center">
              {/* Fee Announcement Strip */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  Amount to Pay
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                  {tournamentFee}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Exact tournament entry fee (Non-editable)
                </p>
              </div>

              {/* Department UPI QR Code Image */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-2.5 bg-white rounded-2xl shadow-xl border-4 border-emerald-500/30 w-52 sm:w-60 max-h-[250px] aspect-[3/4] relative flex items-center justify-center overflow-hidden">
                  {!qrLoadError ? (
                    <img
                      src={MANUAL_UPI_CONFIG.qrImagePath}
                      alt="Department UPI QR Code"
                      className="w-full h-full object-contain"
                      onError={() => setQrLoadError(true)}
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2 text-zinc-800">
                      <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
                      <p className="text-xs font-bold text-red-600">Failed to load QR image</p>
                      <p className="text-[11px] text-zinc-600">Please refresh the page</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1.5 text-xs text-zinc-400 leading-relaxed px-2">
                <p className="font-semibold text-white">
                  Scan this QR code using your preferred UPI app.
                </p>
                <p>
                  Pay the exact amount shown above (<span className="text-emerald-400 font-bold">{tournamentFee}</span>).
                </p>
              </div>

              {/* Continue button */}
              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-sm uppercase tracking-wider hover:bg-emerald-400 active:scale-[0.99] transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                I Have Paid
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 2: PAYMENT DETAILS FORM                                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {(step === 'details' || step === 'submitting') && (
            <div className="space-y-4">
              {/* Back to QR button */}
              {step !== 'submitting' && (
                <button
                  type="button"
                  onClick={() => setStep('qr')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to QR Code
                </button>
              )}

              {/* Compact Fee Summary */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-xs text-zinc-400">Entry Fee:</span>
                <span className="text-sm font-bold text-emerald-400">{tournamentFee}</span>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3.5">
                {/* 1. UPI Payment Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    UPI Payment Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    disabled={step === 'submitting'}
                    value={paymentPhone}
                    onChange={(e) => {
                      setPaymentPhone(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Enter the phone number used to make this UPI payment.
                  </p>
                </div>

                {/* 2. UTR / Transaction ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    UTR / Transaction ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={step === 'submitting'}
                    value={utrId}
                    onChange={(e) => {
                      setUtrId(e.target.value.toUpperCase());
                      setErrorMessage('');
                    }}
                    placeholder="e.g. 424212345678"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 uppercase transition"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Enter the 12-digit UTR or transaction ID from your UPI receipt.
                  </p>
                </div>

                {/* 3. Payment Screenshot Upload */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Payment Screenshot <span className="text-red-400">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    disabled={step === 'submitting'}
                    onChange={handleFileChange}
                    className="hidden"
                    id="upi-screenshot-input"
                  />

                  {!screenshotFile ? (
                    <label
                      htmlFor="upi-screenshot-input"
                      className="flex flex-col items-center justify-center p-4 border border-dashed border-white/20 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/50 cursor-pointer transition text-center group"
                    >
                      <Upload className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 mb-2 transition" />
                      <span className="text-xs font-semibold text-white">
                        Click to upload payment screenshot
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5">
                        PNG, JPEG, or WEBP (Max 5MB)
                      </span>
                    </label>
                  ) : (
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        {screenshotPreview && (
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        )}
                        <div className="truncate text-left min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {screenshotFile.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {formatFileSize(screenshotFile.size)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              Attached
                            </span>
                          </div>
                        </div>
                      </div>

                      {step !== 'submitting' && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                          title="Remove screenshot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500">
                    Your screenshot will be reviewed by the tournament organizer.
                  </p>
                </div>
              </div>

              {/* Confirmation Notice */}
              <div className="p-3 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 text-sky-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Please make sure the UTR and payment screenshot are correct. Your payment will be reviewed by the tournament organizer.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={
                  step === 'submitting' ||
                  !paymentPhone.trim() ||
                  !utrId.trim() ||
                  !screenshotFile
                }
                onClick={handleSubmitPayment}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-sm uppercase tracking-wider hover:bg-emerald-400 active:scale-[0.99] transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {step === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Payment...
                  </>
                ) : (
                  'Submit Payment'
                )}
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STEP 3: PENDING SUCCESS STATE                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {step === 'pending_success' && (
            <div className="text-center space-y-5 py-2">
              {/* Status Badge */}
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-white uppercase tracking-wider">
                  Payment Submitted Successfully
                </h4>
                <p className="text-xs text-amber-400/90 font-medium">
                  Your payment is currently pending organizer verification.
                </p>
              </div>

              {/* Summary Details Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Tournament:</span>
                  <span className="font-bold text-white truncate max-w-[200px]">{tournamentTitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Amount:</span>
                  <span className="font-bold text-emerald-400">{tournamentFee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">UTR / Transaction ID:</span>
                  <span className="font-mono font-bold text-white">{submittedUtr}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-zinc-500">Review Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] tracking-wider uppercase">
                    PENDING REVIEW
                  </span>
                </div>
              </div>

              {/* Organizer Review Notice */}
              <p className="text-xs text-zinc-400 leading-relaxed px-3">
                Your registration has been placed in the organizer queue. Once the organizer verifies your payment, your entry pass and attendance record will be generated.
              </p>

              {/* Navigation Action */}
              <div className="pt-2 space-y-2">
                <Link
                  href="/tournaments"
                  className="block w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition text-center"
                >
                  Explore More Tournaments
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full py-2.5 text-xs text-zinc-400 hover:text-white transition text-center"
                >
                  Go to Player Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
