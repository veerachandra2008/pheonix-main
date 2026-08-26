/**
 * Universal API configuration helper.
 * Ensures all API calls in deployment correctly route to the deployed Python API (/api)
 * while preserving localhost dev server support.
 */

const PRODUCTION_RENDER_BACKEND = 'https://pheonix-main.onrender.com/api';

export function getApiBaseUrl(): string {
  // If an external deployed backend URL (Render, Railway, Fly.io) is provided in environment variables, use it directly!
  const envUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || PRODUCTION_RENDER_BACKEND;
  if (envUrl && (envUrl.includes('render.com') || envUrl.includes('railway.app') || envUrl.includes('railway.internal') || envUrl.includes('fly.dev'))) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  if (typeof window === 'undefined') {
    // Server-side environment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`;
    }
    return envUrl || PRODUCTION_RENDER_BACKEND;
  }

  // Client-side browser:
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocalhost) {
    if (envUrl && envUrl.startsWith('https://') && !envUrl.includes('localhost')) {
      return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }
    return PRODUCTION_RENDER_BACKEND;
  }

  // Local development
  return process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://127.0.0.1:5000/api';
}
