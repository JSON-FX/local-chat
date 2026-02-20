import { createHash } from 'crypto';

// SSO API configuration from environment
const SSO_API_URL = process.env.SSO_API_URL || 'http://lgu-sso.test/api/v1';
const SSO_LOGIN_URL = process.env.SSO_LOGIN_URL || 'http://lgu-sso-ui.test/sso/login';
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';
const SSO_REDIRECT_URI = process.env.SSO_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const SSO_TOKEN_CACHE_TTL = parseInt(process.env.SSO_TOKEN_CACHE_TTL || '300') * 1000; // ms

const SSO_REQUEST_TIMEOUT = 5000; // 5-second timeout for all SSO API calls

interface CachedValidation {
  employee: any;
  role: string;
  validatedAt: number;
}

class SsoService {
  private tokenCache: Map<string, CachedValidation> = new Map();

  // Hash a token for use as a cache key
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Build common headers for SSO API requests
  private getAppHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Client-ID': SSO_CLIENT_ID,
      'X-Client-Secret': SSO_CLIENT_SECRET,
    };
  }

  // Create an AbortController with a 5-second timeout
  private createTimeoutController(): { controller: AbortController; timeout: NodeJS.Timeout } {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SSO_REQUEST_TIMEOUT);
    return { controller, timeout };
  }

  // Validate an SSO token via POST /sso/validate
  async validateToken(token: string): Promise<any | null> {
    const { controller, timeout } = this.createTimeoutController();

    try {
      const response = await fetch(`${SSO_API_URL}/sso/validate`, {
        method: 'POST',
        headers: this.getAppHeaders(),
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`SSO validate returned status ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error('SSO validate request timed out');
      } else {
        console.error('SSO validate request failed:', error.message);
      }
      return null;
    }
  }

  // Authorize an employee via POST /sso/authorize
  async authorizeEmployee(token: string): Promise<any | null> {
    const { controller, timeout } = this.createTimeoutController();

    try {
      const response = await fetch(`${SSO_API_URL}/sso/authorize`, {
        method: 'POST',
        headers: this.getAppHeaders(),
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`SSO authorize returned status ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error('SSO authorize request timed out');
      } else {
        console.error('SSO authorize request failed:', error.message);
      }
      return null;
    }
  }

  // Get employee data via GET /sso/employee
  async getEmployee(token: string): Promise<any | null> {
    const { controller, timeout } = this.createTimeoutController();

    try {
      const response = await fetch(`${SSO_API_URL}/sso/employee`, {
        method: 'GET',
        headers: {
          ...this.getAppHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`SSO getEmployee returned status ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error('SSO getEmployee request timed out');
      } else {
        console.error('SSO getEmployee request failed:', error.message);
      }
      return null;
    }
  }

  // Build the SSO login redirect URL
  getLoginUrl(state: string): string {
    return `${SSO_LOGIN_URL}?client_id=${SSO_CLIENT_ID}&redirect_uri=${encodeURIComponent(SSO_REDIRECT_URI)}&state=${state}`;
  }

  // Get cached validation result if still within TTL
  getCachedValidation(token: string): CachedValidation | null {
    const key = this.hashToken(token);
    const cached = this.tokenCache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.validatedAt > SSO_TOKEN_CACHE_TTL) {
      this.tokenCache.delete(key);
      return null;
    }

    return cached;
  }

  // Store a validation result in the cache
  cacheValidation(token: string, employee: any, role: string): void {
    const key = this.hashToken(token);
    this.tokenCache.set(key, {
      employee,
      role,
      validatedAt: Date.now(),
    });
  }

  // Remove a token from the cache
  invalidateCache(token: string): void {
    const key = this.hashToken(token);
    this.tokenCache.delete(key);
  }
}

export const ssoService = new SsoService();
