/**
 * Universal API configuration helper.
 * Ensures all API calls in deployment correctly route to the deployed Python API (/api)
 * while preserving localhost dev server support.
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side environment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`;
    }
    return process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5000/api';
  }

  // Client-side browser:
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocalhost) {
    // In production / Vercel deployment, ALWAYS use relative path '/api'
    return '/api';
  }

  // Local development
  return process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://127.0.0.1:5000/api';
}
