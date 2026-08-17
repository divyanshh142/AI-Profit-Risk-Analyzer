import { api } from './client';
import type { AuthResponse, User } from '../types';
import { DEMO_USER } from '../data/demoData';

const TOKEN_KEY = 'pc_token';
const USER_KEY = 'pc_user';
const UPLOADS_KEY = 'pc_uploads';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function cleanName(raw: string): string {
  const cleaned = raw.replace(/[._\-\d]+/g, ' ').trim();
  if (!cleaned) return raw;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractCompanyName(username: string): string {
  if (!username || username === DEMO_USER.username) {
    return DEMO_USER.companyName;
  }
  if (username.includes('@')) {
    const domainPart = username.split('@')[1] || '';
    const domainName = domainPart.split('.')[0] || '';
    const publicProviders = ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'];
    if (domainName && !publicProviders.includes(domainName.toLowerCase())) {
      return cleanName(domainName) + ' Inc';
    }
    const localPart = username.split('@')[0];
    return cleanName(localPart) + "'s Store";
  }
  return cleanName(username);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function buildUser(username: string): User {
  const isDemo = !username || username === DEMO_USER.username;
  return {
    username,
    companyName: extractCompanyName(username),
    tenantId: isDemo ? DEMO_USER.tenantId : Math.abs(hashCode(username)) % 10000 + 10,
  };
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<{ user: User; token: string; offline: boolean }> {
  try {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { username, password });
    const user = buildUser(data.username);
    return { user, token: data.token, offline: false };
  } catch {
    const user = buildUser(username || DEMO_USER.username);
    return { user, token: 'demo-offline-token', offline: true };
  }
}

export async function loginWithGoogleEmail(email: string): Promise<{ user: User; token: string; offline: boolean }> {
  return loginWithCredentials(email, 'google-oauth');
}

export async function fetchMe(): Promise<User | null> {
  const stored = getStoredUser();
  if (stored) return stored;
  return null;
}

export async function logout(): Promise<void> {
  clearSession();
}

export function getUploadedFiles(): string[] {
  const raw = sessionStorage.getItem(UPLOADS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveUploadedFiles(files: string[]) {
  sessionStorage.setItem(UPLOADS_KEY, JSON.stringify(files));
}

export function addUploadedFile(name: string) {
  const files = getUploadedFiles();
  if (!files.includes(name)) {
    saveUploadedFiles([...files, name]);
  }
}
