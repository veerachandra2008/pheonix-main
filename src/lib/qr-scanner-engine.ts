// src/lib/qr-scanner-engine.ts
import { decodeFallbackQR } from './qr-decoder-fallback';

/**
 * Parses raw scanned QR string or URL to extract the XENOVA Ticket Pass ID.
 * Examples handled:
 * - Direct: "XNV-8F42K1", "XPH-EC07E3ED", "XNV_12345678", "XPH-A101"
 * - Full URL: "https://xenova.gg/verify/XNV-8F42K1", "http://localhost:3000/verify/XPH-EC07E3ED?source=qr"
 * - Relative Path: "/verify/XNV-8F42K1"
 * - JSON: '{"passId": "XNV-8F42K1"}' or '{"pass_id": "XPH-EC07E3ED"}'
 */
export function extractPassId(rawInput: string): string {
  if (!rawInput) return '';
  const text = rawInput.trim();

  // 1. JSON String parsing
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      const val = parsed.passId || parsed.pass_id || parsed.id || parsed.code || parsed.ticketId;
      if (val) {
        return val.toString().trim().toUpperCase();
      }
    } catch {}
  }

  // 2. URL containing /verify/
  if (text.includes('/verify/')) {
    const after = text.split('/verify/')[1];
    if (after) {
      const clean = after.split('?')[0].split('#')[0].split('/')[0].trim();
      if (clean) {
        return decodeURIComponent(clean).toUpperCase();
      }
    }
  }

  // 3. Match XNV- or XPH- standard ticket pass format (e.g. XNV-XXXXXXXX or XPH-XXXXXXXX)
  const prefixMatch = text.match(/(?:XNV|XPH)[-_][A-Za-z0-9_-]+/i);
  if (prefixMatch) {
    return prefixMatch[0].toUpperCase().replace('_', '-');
  }

  // 4. If URL with query parameter (e.g. ?pass=... or ?id=...)
  if (text.includes('?')) {
    try {
      const url = new URL(text.startsWith('http') ? text : `http://dummy.com/${text}`);
      const param = url.searchParams.get('passId') || url.searchParams.get('pass') || url.searchParams.get('id') || url.searchParams.get('ticket');
      if (param) return param.trim().toUpperCase();
    } catch {}
  }

  // 5. Default cleaned string
  return text.split('?')[0].split('#')[0].trim().toUpperCase();
}

// ----------------------------------------------------
// DUAL-ENGINE QR DETECTION (Native BarcodeDetector + Fallback)
// ----------------------------------------------------

let barcodeDetectorInstance: any = null;
let fallbackScriptLoaded = false;
let fallbackScriptLoading = false;

/**
 * Checks if native BarcodeDetector API is supported in current browser.
 */
export function hasNativeBarcodeDetector(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).BarcodeDetector !== 'undefined';
}

/**
 * Lazy-loads the lightweight pure JS QR decoder script only when scanner is opened
 * and BarcodeDetector is unavailable.
 */
export async function ensureFallbackEngine(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).jsQR) return true;
  if (fallbackScriptLoaded) return true;
  if (fallbackScriptLoading) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (fallbackScriptLoaded || (window as any).jsQR) {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, 3000);
    });
  }

  fallbackScriptLoading = true;
  try {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    const loaded = await new Promise<boolean>((resolve) => {
      script.onload = () => {
        fallbackScriptLoaded = true;
        fallbackScriptLoading = false;
        resolve(true);
      };
      script.onerror = () => {
        fallbackScriptLoading = false;
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return loaded;
  } catch {
    fallbackScriptLoading = false;
    return false;
  }
}

/**
 * Fast Single-Frame QR Scan
 * 1. Tries native BarcodeDetector first (GPU/NPU hardware accelerated)
 * 2. Falls back to Canvas ImageData decoding if BarcodeDetector is unavailable
 */
export async function scanVideoFrame(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement | null
): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // 1. Primary: Native BarcodeDetector
  if (hasNativeBarcodeDetector()) {
    try {
      if (!barcodeDetectorInstance) {
        barcodeDetectorInstance = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      }
      const barcodes = await barcodeDetectorInstance.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // BarcodeDetector frame read glitch or fallback needed
    }
  }

  // 2. Fallback: Canvas ImageData analysis
  if (canvas) {
    try {
      const width = Math.min(video.videoWidth, 640);
      const height = Math.floor(video.videoHeight * (width / video.videoWidth));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);

        // Try global jsQR if loaded
        if (typeof window !== 'undefined' && (window as any).jsQR) {
          const res = (window as any).jsQR(imgData.data, width, height, {
            inversionAttempts: 'dontInvert',
          });
          if (res && res.data) {
            return res.data;
          }
        }

        // Try internal fallback
        const fallbackRes = decodeFallbackQR(imgData);
        if (fallbackRes && fallbackRes.data) {
          return fallbackRes.data;
        }
      }
    } catch {}
  }

  return null;
}

// ----------------------------------------------------
// AUDIO & HAPTIC FEEDBACK (Web Audio API Synthesizer)
// ----------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays synthesized auditory alert tone without external audio files.
 * Works completely offline with zero latency.
 */
export function playScanSound(type: 'success' | 'warning' | 'error') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Crisp high two-tone chord (880Hz -> 1320Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'warning') {
      // Double amber alert tone (580Hz -> 440Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.setValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      // Low crimson buzz (220Hz -> 140Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {}
}

/**
 * Triggers mobile device haptic vibration.
 */
export function triggerScanHaptic(type: 'success' | 'warning' | 'error') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  try {
    if (type === 'success') {
      navigator.vibrate([40, 60, 40]);
    } else if (type === 'warning') {
      navigator.vibrate([80, 50, 80]);
    } else {
      navigator.vibrate([150, 80, 150]);
    }
  } catch {}
}
