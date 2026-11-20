/**
 * Shared API client for making authenticated requests from the browser to /api/*.
 *
 * Rules:
 * - Sends `credentials: 'same-origin'` on every request so the browser automatically
 *   attaches secure HttpOnly session cookies.
 * - No Authorization headers, no token reads from localStorage.
 * - Handles 401 Unauthorized responses by calling POST /api/auth/refresh once,
 *   retrying the original request once with the new rotated cookies, and only
 *   redirecting to /login if refresh fails.
 * - Deduplicates concurrent refresh requests to ensure refresh tokens are not
 *   rotated multiple times simultaneously.
 */

interface ApiFetchOptions extends RequestInit {
  _isRetry?: boolean;
}

let activeRefreshPromise: Promise<boolean> | null = null;

async function executeTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: ApiFetchOptions
): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials || 'same-origin',
  });

  // Handle 401 Unauthorized responses
  if (response.status === 401 && typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';
    const isAuthRoute =
      urlString.includes('/api/auth/refresh') ||
      urlString.includes('/api/auth/login') ||
      urlString.includes('/api/auth/signup') ||
      urlString.includes('/api/auth/logout');

    // If this request is already a retry, or is an auth route itself, do not refresh
    if (!init?._isRetry && !isAuthRoute) {
      if (!activeRefreshPromise) {
        activeRefreshPromise = executeTokenRefresh().finally(() => {
          activeRefreshPromise = null;
        });
      }

      const refreshed = await activeRefreshPromise;
      if (refreshed) {
        // Retry the original request once with fresh cookies
        return apiFetch(input, {
          ...init,
          _isRetry: true,
        });
      }
    }

    // Refresh failed or second 401: redirect to /login
    if (currentPath !== '/login' && currentPath !== '/register') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  return response;
}
