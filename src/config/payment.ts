/**
 * Department Manual UPI Payment Configuration
 * Centralized settings for the Manual UPI payment flow.
 */
export const MANUAL_UPI_CONFIG = {
  // Path to the exact department UPI QR image provided
  qrImagePath: '/images/upi-qr.png',
  fallbackQrText: 'Department UPI QR Code',
  maxScreenshotSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
};
