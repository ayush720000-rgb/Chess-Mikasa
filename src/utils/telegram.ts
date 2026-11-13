import { UserProfile } from '../types/chess';

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: TelegramWebAppUser;
          auth_date?: number;
          hash?: string;
          start_param?: string;
        };
        version?: string;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        ready?: () => void;
        expand?: () => void;
        close?: () => void;
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
        switchInlineQuery?: (query: string, choose_chat_types?: string[]) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
    fakeInitData?: string;
  }
}

const LOCAL_STORAGE_USER_KEY = 'chessnow_user_profile';
const ACTIVE_ROOM_KEY = 'chessnow_active_match';

/**
 * Generate a deterministic, handsome initials avatar with vibrant gradient.
 * Used whenever a Telegram user or guest has no custom photo uploaded,
 * ensuring players NEVER show the bot's mascot photo as their own profile picture.
 */
export function generateInitialAvatar(name: string): string {
  const cleanName = (name || 'Player').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = (
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0] ? parts[0].slice(0, 2) : 'GM'
  ).toUpperCase();

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 45) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g_${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 75%, 45%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 85%, 28%)" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g_${Math.abs(hash)})" />
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
    window.Telegram?.WebApp?.initData ||
    window.fakeInitData
  );
}

export function getTelegramInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData || window.fakeInitData || '';
}

export function extractTelegramUser(): TelegramWebAppUser | null {
  if (typeof window === 'undefined') return null;

  // 1. Direct object in window.Telegram.WebApp.initDataUnsafe
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }

  // 2. Parse from initData query string if not already deserialized
  const rawInitData = window.Telegram?.WebApp?.initData || window.fakeInitData;
  if (rawInitData) {
    try {
      const params = new URLSearchParams(rawInitData);
      const userStr = params.get('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed.id) return parsed as TelegramWebAppUser;
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback: Parse from URL parameters if passed from deep link
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('tg_user_id') || urlParams.get('user_id');
    const nameParam = urlParams.get('tg_name') || urlParams.get('user_name');
    const photoParam = urlParams.get('tg_photo') || urlParams.get('photo_url');
    if (idParam && nameParam) {
      return {
        id: parseInt(idParam, 10),
        first_name: nameParam,
        photo_url: photoParam || undefined,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export function getTelegramStartParam(): string | null {
  if (typeof window === 'undefined') return null;

  // Telegram Mini App links pass startapp values through initDataUnsafe.start_param.
  // Our invite format is join_<LOBBYCODE>; strip the prefix before calling joinRoom.
  const normalizeInvite = (value: string | null | undefined): string | null => {
    if (!value) return null;
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch { /* keep original value */ }
    const match = decoded.trim().match(/^join_(.+)$/i);
    const code = (match ? match[1] : decoded).trim();
    return code ? code.toUpperCase() : null;
  };

  const webApp = window.Telegram?.WebApp;
  const tgParam = normalizeInvite(webApp?.initDataUnsafe?.start_param);
  if (tgParam) return tgParam;

  // Telegram can also expose the start parameter in the launch URL on some clients.
  const urlParams = new URLSearchParams(window.location.search);
  const launchParam = normalizeInvite(
    urlParams.get('tgWebAppStartParam') || urlParams.get('startapp')
  );
  if (launchParam) return launchParam;

  // Keep existing browser links working: ?join=CODE, ?lobby=CODE and ?room=CODE.
  const lobby = normalizeInvite(
    urlParams.get('join') || urlParams.get('lobby') || urlParams.get('room')
  );
  if (lobby) return lobby;

  // Legacy hash links remain supported too.
  const hash = window.location.hash;
  if (hash.startsWith('#lobby=')) return normalizeInvite(hash.slice('#lobby='.length));
  if (hash.startsWith('#room=')) return normalizeInvite(hash.slice('#room='.length));

  return null;
}

// Fetch avatar from server bot endpoint if photo_url was not provided directly by Telegram WebApp
export async function fetchAndCacheTelegramAvatar(userId: number, currentProfile: UserProfile): Promise<void> {
  // The bot connection is initialized asynchronously on server startup. Retry briefly
  // so the first profile request is not lost if Telegram getMe() is still in progress.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`/api/user-avatar/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          currentProfile.avatarUrl = data.avatarUrl;
          saveUserProfile(currentProfile);
          window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: currentProfile }));
          return;
        }
      }
    } catch {
      // Retry transient startup/network failures; retain initials as a safe fallback.
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
}

export function getInitialUserProfile(): UserProfile {
  // Telegram identity is applied asynchronously only after the server verifies
  // WebApp initData with TELEGRAM_BOT_TOKEN. Do not trust initDataUnsafe here.

  // Check saved profile in localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && parsed.name) {
          // If avatar was an old placeholder or accidentally set to the Mikasa mascot, fix it
          if (!parsed.avatarUrl || parsed.avatarUrl.startsWith('/assets/') || parsed.avatarUrl.includes('mikasa')) {
            parsed.avatarUrl = generateInitialAvatar(parsed.name);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Generate clean guest profile with initials avatar
  const randomId = Math.floor(100000 + Math.random() * 900000);
  const guestNames = ['AlphaRook', 'QuantumKnight', 'SilentBishop', 'GrandmasterGamer', 'ApexPawn'];
  const name = guestNames[Math.floor(Math.random() * guestNames.length)];
  const avatarUrl = generateInitialAvatar(name);

  const profile: UserProfile = {
    id: randomId,
    name,
    avatarUrl,
    isBot: false,
  };

  saveUserProfile(profile);
  return profile;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }
}

export function setActiveRoomCode(roomCode: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        ACTIVE_ROOM_KEY,
        JSON.stringify({ code: roomCode.toUpperCase(), timestamp: Date.now() })
      );
    } catch {
      // ignore
    }
  }
}

export function getActiveRoomCode(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(ACTIVE_ROOM_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Only return if active within last 4 hours
        if (parsed.code && Date.now() - (parsed.timestamp || 0) < 4 * 60 * 60 * 1000) {
          return parsed.code.toUpperCase();
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function clearActiveRoomCode(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(ACTIVE_ROOM_KEY);
    } catch {
      // ignore
    }
  }
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    try {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } catch {
      // ignore
    }
  }
}

// Bot handle and Mini App short name, set at build time with VITE_BOT_USERNAME and
// VITE_MINIAPP_SHORT_NAME. The defaults are the Mikasa bot and its Chess Mini App.
const BOT_HANDLE = (import.meta.env.VITE_BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');
const MINIAPP_SHORT_NAME = import.meta.env.VITE_MINIAPP_SHORT_NAME || 'Chess';

export function shareLobbyLink(lobbyCode: string, botUsername?: string): { url: string; telegramShareUrl: string } {
  const code = lobbyCode.trim().toUpperCase();
  const handle = (botUsername || BOT_HANDLE).replace(/^@/, '');
  const inviteUrl = `https://t.me/${handle}/${MINIAPP_SHORT_NAME}?startapp=join_${encodeURIComponent(code)}`;
  const shareText = `♟️ Play chess with me on Mikasa Chess!\nJoin room: ${code}`;

  // openTelegramLink(telegramShareUrl) opens Telegram's native chat picker/share flow.
  const telegramShareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;

  return {
    url: inviteUrl,
    telegramShareUrl,
  };
}

export function getSessionToken(): string {
  if (typeof window === 'undefined') return 'server_session';
  let token = sessionStorage.getItem('chess_session_token');
  if (!token) {
    token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('chess_session_token', token);
  }
  return token;
}

