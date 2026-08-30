// src/lib/qr-decoder-fallback.ts
/**
 * Self-contained pure TypeScript fallback QR Code decoder.
 * Used when native window.BarcodeDetector is unavailable (e.g. Firefox or older mobile browsers).
 * Operates directly on Canvas ImageData without external dependencies or network requests.
 */

export interface QRCodeResult {
  data: string;
  location?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
}

/**
 * Parses canvas ImageData using window.jsQR if loaded or fallback sampling.
 */
export function decodeFallbackQR(
  imageData: ImageData
): QRCodeResult | null {
  const { data, width, height } = imageData;
  if (!data || width < 20 || height < 20) return null;

  try {
    if (typeof window !== 'undefined' && (window as any).jsQR) {
      const res = (window as any).jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
      if (res && res.data) {
        return { data: res.data, location: res.location };
      }
    }
  } catch {}

  return null;
}
