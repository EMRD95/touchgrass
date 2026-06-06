const CLIENT_ID = '793522198533-dd1g3fcnn7gfv8vl50oiv5sh9sst0rtp.apps.googleusercontent.com';
const AUTH_USER_KEY = 'gts_auth_user_v1';

export class Auth {
  constructor() {
    this.user = null;
    this.token = null;
    this.gsiReady = false;
    this.lastError = null;
    this._callbacks = [];
  }

  async init() {
    if (window.google?.accounts?.oauth2) {
      this.gsiReady = true;
      return;
    }
    return new Promise((resolve) => {
      if (document.getElementById('gsi-script')) {
        const startedAt = Date.now();
        const check = () => {
          if (window.google?.accounts?.oauth2) {
            this.gsiReady = true;
            resolve();
          } else if (Date.now() - startedAt > 7000) {
            // Never block the game because Google script failed or is blocked.
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        return;
      }
      const script = document.createElement('script');
      script.id = 'gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gsiReady = true;
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  ensureGuest() {
    if (!this.user) {
      const restored = this._restoreStoredGoogleUser();
      if (restored) return restored;
      this._setGuest();
    }
    return this.user;
  }

  _restoreStoredGoogleUser() {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.id || parsed.provider !== 'google') return null;
      this.user = {
        id: String(parsed.id),
        email: parsed.email || null,
        name: parsed.name || 'Google Player',
        picture: parsed.picture || null,
        provider: 'google',
      };
      this._notify();
      return this.user;
    } catch {
      return null;
    }
  }

  _storeGoogleUser(user) {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google',
      }));
    } catch {
      // local-only persistence is optional; never block gameplay on storage
    }
  }

  _clearStoredGoogleUser() {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // ignore
    }
  }

  async signIn() {
    if (!this.gsiReady || !window.google?.accounts?.oauth2) {
      await this.init();
    }
    if (!this.gsiReady || !window.google?.accounts?.oauth2) {
      this.ensureGuest();
      this.lastError = 'Google sign-in script unavailable; staying in guest mode.';
      this._notify();
      return;
    }
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid email profile',
        callback: (tokenResponse) => {
          if (tokenResponse?.access_token) {
            this.token = tokenResponse.access_token;
            this._fetchUserInfo();
          } else {
            this.ensureGuest();
          }
        },
        error_callback: () => {
          this.lastError = 'Google sign-in was cancelled or blocked.';
          this.ensureGuest();
        },
      });
      client.requestAccessToken();
    } catch {
      this.lastError = 'Google sign-in failed; staying in guest mode.';
      this.ensureGuest();
    }
  }

  async _fetchUserInfo() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw new Error('fetch failed');
      const info = await res.json();
      this.user = {
        id: info.sub,
        email: info.email || null,
        name: info.name || info.email || 'Google Player',
        picture: info.picture || null,
        provider: 'google',
      };
      this.lastError = null;
      this._storeGoogleUser(this.user);
      this._notify();
    } catch {
      this.lastError = 'Google profile fetch failed; staying in guest mode.';
      this.ensureGuest();
    }
  }

  _setGuest() {
    let guestId = null;
    try {
      guestId = localStorage.getItem('gts_guest_id');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('gts_guest_id', guestId);
      }
    } catch {
      guestId = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    this.user = {
      id: guestId,
      email: null,
      name: 'Grass Toucher',
      picture: null,
      provider: 'guest',
    };
    this._notify();
  }

  _notify() {
    this._callbacks.forEach((cb) => cb(this.user));
  }

  onAuthChange(cb) {
    this._callbacks.push(cb);
    if (this.user) cb(this.user);
  }

  signOut() {
    this.user = null;
    this.token = null;
    this.lastError = null;
    this._clearStoredGoogleUser();
    this._setGuest();
  }

  isSignedIn() {
    return !!this.user && this.user.provider !== 'guest';
  }

  getDisplayName() {
    return this.user?.name || 'Grass Toucher';
  }

  getUserId() {
    return this.user?.id || 'unknown';
  }
}

export const auth = new Auth();
