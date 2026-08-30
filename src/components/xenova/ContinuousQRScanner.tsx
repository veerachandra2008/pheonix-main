'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Flashlight,
  RefreshCw,
  AlertTriangle,
  ScanLine,
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  SwitchCamera
} from 'lucide-react';
import {
  scanVideoFrame,
  extractPassId,
  hasNativeBarcodeDetector,
  ensureFallbackEngine
} from '@/lib/qr-scanner-engine';

interface ContinuousQRScannerProps {
  onScan: (passId: string) => void;
  isProcessing?: boolean;
  activePassId?: string | null;
  onCameraError?: (errorMsg: string) => void;
  onSwitchToManual?: () => void;
  cooldownMs?: number;
  className?: string;
}

export const ContinuousQRScanner: React.FC<ContinuousQRScannerProps> = ({
  onScan,
  isProcessing = false,
  activePassId = null,
  onCameraError,
  onSwitchToManual,
  cooldownMs = 3500,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'active' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);

  // In-memory duplicate lock & timestamp
  const lastScannedRef = useRef<{ id: string; timestamp: number } | null>(null);
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  // Initialize camera stream ONCE per session
  const startCamera = useCallback(async (desiredFacing: 'environment' | 'user' = 'environment') => {
    setCameraState('initializing');
    setErrorMessage(null);

    // If stream already active with same facing mode, keep it running
    if (streamRef.current && streamRef.current.active) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
      setCameraState('active');
      return;
    }

    // Stop any existing stream before switching camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported on this browser or connection.');
      }

      // Preload fallback engine if native BarcodeDetector is not present
      if (!hasNativeBarcodeDetector()) {
        ensureFallbackEngine().catch(() => {});
      }

      // Mobile optimized constraints: rear camera priority, 720p ideal for speed
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities && (track.getCapabilities() as any)) || {};
          if (capabilities.torch) {
            setTorchSupported(true);
          }
        } catch {}
      }

      setCameraState('active');
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        (err.message && err.message.toLowerCase().includes('permission'));

      const userMsg = isDenied
        ? 'Camera access unavailable — enter Ticket ID manually.'
        : 'Unable to start camera stream. Please check permissions or enter Ticket ID manually.';

      setErrorMessage(userMsg);
      setCameraState('error');
      if (onCameraError) onCameraError(userMsg);
    }
  }, [onCameraError]);

  // Toggle Torch / Flashlight for dark tournament venue entrance
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && (track.applyConstraints as any)) {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Switch Front / Back Camera
  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    await startCamera(nextFacing);
  };

  // High-performance continuous detection loop
  useEffect(() => {
    if (cameraState !== 'active') return;

    let isScanningLoopActive = true;
    let lastScanLoopTime = 0;
    const FRAME_INTERVAL_MS = 40; // ~25 FPS to conserve mobile battery while ensuring instant detection

    const detectionStep = async (timestamp: number) => {
      if (!isScanningLoopActive) return;

      if (timestamp - lastScanLoopTime >= FRAME_INTERVAL_MS) {
        lastScanLoopTime = timestamp;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && video.readyState >= 2 && !isProcessingRef.current) {
          try {
            const rawQR = await scanVideoFrame(video, canvas);

            if (rawQR && isScanningLoopActive) {
              const passId = extractPassId(rawQR);

              if (passId) {
                const now = Date.now();
                const last = lastScannedRef.current;

                // DUPLICATE SUPPRESSION:
                // If the same pass ID is continuously in view, ignore until cooldownMs expires
                const isSameCode = last && last.id === passId;
                const isCooldownActive = isSameCode && now - last.timestamp < cooldownMs;

                if (!isCooldownActive && !isProcessingRef.current) {
                  lastScannedRef.current = { id: passId, timestamp: now };
                  setLastDetectedCode(passId);
                  onScan(passId);
                }
              }
            }
          } catch {}
        }
      }

      if (isScanningLoopActive) {
        animFrameIdRef.current = requestAnimationFrame(detectionStep);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(detectionStep);

    return () => {
      isScanningLoopActive = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraState, cooldownMs, onScan]);

  // Mount lifecycle: Start camera on mount, cleanup on unmount
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-black border border-white/10 ${className}`}>
      {/* ── Hidden Offscreen Canvas for Fallback Image Sampling ── */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* ── Live Video Stream ── */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video max-h-[380px] bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* ── Camera Initializing Overlay ── */}
        {cameraState === 'initializing' && (
          <div className="absolute inset-0 bg-[#070B14]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Starting Camera...</h3>
              <p className="text-xs text-slate-400 mt-1">Initializing optical scanner engine</p>
            </div>
          </div>
        )}

        {/* ── Camera Error / Permission Denied State ── */}
        {cameraState === 'error' && (
          <div className="absolute inset-0 bg-[#0C111D] flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
              <CameraOff className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Camera Unavailable</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {errorMessage || 'Camera access unavailable — enter Ticket ID manually.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs pt-1">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
              </button>

              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50"
                >
                  Manual Entry
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Optical Reticle & Scanning Animation (When Camera Active) ── */}
        {cameraState === 'active' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark Vignette Mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

            {/* Target Square Frame */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-dashed border-emerald-500/40 flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Scanning Laser Line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-bounce duration-1000" />

              {/* Center Crosshair */}
              <div className="w-2 h-2 rounded-full bg-emerald-400/50" />
            </div>

            {/* In-Flight Processing Indicator */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-auto">
                <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying Ticket...
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Top Floating Bar Controls (Torch, Camera Flip) ── */}
        {cameraState === 'active' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono tracking-wider uppercase">GATE SCANNER ACTIVE</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Torch Toggle (if supported on device) */}
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-full backdrop-blur-md border transition cursor-pointer shadow-lg ${
                    torchOn
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-black/60 text-white border-white/15 hover:bg-white/10'
                  }`}
                  title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              {/* Camera Switch (Environment / User) */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-white/10 transition cursor-pointer shadow-lg"
                title="Switch Camera (Rear/Front)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Status Bar ── */}
      <div className="p-3 bg-[#0C111D] border-t border-white/10 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">Point camera at attendee QR ticket pass</span>
        </div>

        {lastDetectedCode && (
          <div className="font-mono text-emerald-400 font-bold tracking-wider">
            Last: {lastDetectedCode}
          </div>
        )}
      </div>
    </div>
  );
};
