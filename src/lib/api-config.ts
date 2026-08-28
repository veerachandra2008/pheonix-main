/**
 * Universal API configuration helper.
 * Ensures all API calls in deployment correctly route to the deployed Python API (/api)
 * while preserving localhost dev server support and preventing network hangs.
 */

export function getApiBaseUrl(): string {
  // If an external deployed backend URL (Render, Railway, Fly.io, etc.) is explicitly provided in environment variables, use it
  const explicitEnvUrl = process.env.NEXT_PUBLIC_FLASK_API_URL?.trim();
  if (explicitEnvUrl) {
    return explicitEnvUrl.endsWith('/') ? explicitEnvUrl.slice(0, -1) : explicitEnvUrl;
  }

  // Server-side rendering / Server Component environment:
  if (typeof window === 'undefined') {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`;
    }
    return 'http://127.0.0.1:5000/api';
  }

  // Client-side browser:
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!isLocalhost) {
    // In production deployment, use relative '/api' on the same origin.
    // This works automatically on Vercel serverless, Render, Railway, and any reverse-proxy setup.
    return '/api';
  }

  // Local development
  return 'http://127.0.0.1:5000/api';
}

/**
 * Fetch wrapper with built-in timeout protection to ensure requests never hang indefinitely.
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}
