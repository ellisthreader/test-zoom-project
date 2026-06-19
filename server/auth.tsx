import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Request, Response } from 'express';
import { config } from './config.js';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: string;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  token: string;
  user_id: string;
  expires_at: string;
};

type OAuthStateRow = {
  state: string;
  return_to: string;
  expires_at: string;
};

const dbDirectory = path.dirname(config.authDbPath);
fs.mkdirSync(dbDirectory, { recursive: true });

const db = new Database(config.authDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  create table if not exists users (
    id text primary key,
    email text not null unique,
    name text,
    avatar_url text,
    provider text not null,
    provider_id text,
    created_at text not null,
    updated_at text not null
  );

  create table if not exists sessions (
    token text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at text not null,
    created_at text not null
  );

  create table if not exists oauth_states (
    state text primary key,
    return_to text not null,
    expires_at text not null,
    created_at text not null
  );
`);

const selectUserByEmail = db.prepare<string, UserRow>('select * from users where lower(email) = lower(?)');
const selectUserById = db.prepare<string, UserRow>('select * from users where id = ?');
const insertUser = db.prepare(`
  insert into users (id, email, name, avatar_url, provider, provider_id, created_at, updated_at)
  values (@id, @email, @name, @avatarUrl, @provider, @providerId, @now, @now)
`);
const updateUser = db.prepare(`
  update users
  set name = coalesce(@name, name),
      avatar_url = coalesce(@avatarUrl, avatar_url),
      provider = @provider,
      provider_id = coalesce(@providerId, provider_id),
      updated_at = @now
  where id = @id
`);
const insertSession = db.prepare(`
  insert into sessions (token, user_id, expires_at, created_at)
  values (@token, @userId, @expiresAt, @now)
`);
const selectSession = db.prepare<string, SessionRow>('select * from sessions where token = ?');
const deleteSession = db.prepare<string>('delete from sessions where token = ?');
const deleteExpiredSessions = db.prepare<string>('delete from sessions where expires_at <= ?');
const insertOAuthState = db.prepare(`
  insert into oauth_states (state, return_to, expires_at, created_at)
  values (@state, @returnTo, @expiresAt, @now)
`);
const selectOAuthState = db.prepare<string, OAuthStateRow>('select * from oauth_states where state = ?');
const deleteOAuthState = db.prepare<string>('delete from oauth_states where state = ?');
const deleteExpiredOAuthStates = db.prepare<string>('delete from oauth_states where expires_at <= ?');

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
};

export function isGoogleAuthConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);
}

export function getRequestUser(req: Request): AuthUser | null {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  const session = selectSession.get(token);
  const now = new Date().toISOString();

  if (!session || session.expires_at <= now) {
    if (session) {
      deleteSession.run(token);
    }
    return null;
  }

  const user = selectUserById.get(session.user_id);
  return user ? serializeUser(user) : null;
}

export function requireAuth(req: Request, res: Response): AuthUser | null {
  const user = getRequestUser(req);

  if (!user) {
    res.status(401).json({ error: 'Sign in before opening the dashboard.' });
    return null;
  }

  return user;
}

export function handleCurrentUser(req: Request, res: Response) {
  res.json({
    user: getRequestUser(req),
    googleAuthAvailable: isGoogleAuthConfigured(),
  });
}

export function handleEmailLogin(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Enter your password.' });
    return;
  }

  const user = upsertUser({
    email,
    name: email.split('@')[0],
    avatarUrl: null,
    provider: 'email',
    providerId: null,
  });

  createSession(res, user.id);
  res.status(201).json({ user: serializeUser(user), googleAuthAvailable: isGoogleAuthConfigured() });
}

export function handleLogout(req: Request, res: Response) {
  const token = getSessionToken(req);

  if (token) {
    deleteSession.run(token);
  }

  clearSessionCookie(res);
  res.json({ ok: true });
}

export function handleGoogleStart(_req: Request, res: Response) {
  if (!isGoogleAuthConfigured()) {
    res.status(503).json({ error: 'Google login is not configured on this server.' });
    return;
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  deleteExpiredOAuthStates.run(now.toISOString());
  insertOAuthState.run({
    state,
    returnTo: `${config.appBaseUrl.replace(/\/$/, '')}/?view=dashboard`,
    expiresAt,
    now: now.toISOString(),
  });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.googleClientId);
  url.searchParams.set('redirect_uri', config.googleRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  res.redirect(url.toString());
}

export async function handleGoogleCallback(req: Request, res: Response) {
  if (!isGoogleAuthConfigured()) {
    res.status(503).type('html').send(renderAuthReturn('Google login is not configured.', config.appBaseUrl));
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const storedState = state ? selectOAuthState.get(state) : null;
  const now = new Date().toISOString();

  if (!code || !storedState || storedState.expires_at <= now) {
    if (state) {
      deleteOAuthState.run(state);
    }
    res.status(400).type('html').send(renderAuthReturn('Google login expired. Please try again.', config.appBaseUrl));
    return;
  }

  deleteOAuthState.run(state);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.googleRedirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    res.status(502).type('html').send(renderAuthReturn('Google did not approve the login.', config.appBaseUrl));
    return;
  }

  const tokens = await tokenResponse.json() as { access_token?: string };

  if (!tokens.access_token) {
    res.status(502).type('html').send(renderAuthReturn('Google did not return an access token.', config.appBaseUrl));
    return;
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    res.status(502).type('html').send(renderAuthReturn('Google profile lookup failed.', config.appBaseUrl));
    return;
  }

  const profile = await profileResponse.json() as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  const email = normalizeEmail(profile.email);

  if (!email) {
    res.status(400).type('html').send(renderAuthReturn('Google account did not include an email address.', config.appBaseUrl));
    return;
  }

  const user = upsertUser({
    email,
    name: profile.name || email.split('@')[0],
    avatarUrl: profile.picture || null,
    provider: 'google',
    providerId: profile.sub || null,
  });

  createSession(res, user.id);
  res.redirect(storedState.return_to);
}

function upsertUser(input: {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  providerId: string | null;
}) {
  const existing = selectUserByEmail.get(input.email);
  const now = new Date().toISOString();

  if (existing) {
    updateUser.run({
      id: existing.id,
      name: input.name,
      avatarUrl: input.avatarUrl,
      provider: input.provider,
      providerId: input.providerId,
      now,
    });
    return selectUserById.get(existing.id) as UserRow;
  }

  const id = crypto.randomUUID();
  insertUser.run({
    id,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    provider: input.provider,
    providerId: input.providerId,
    now,
  });

  return selectUserById.get(id) as UserRow;
}

function createSession(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  deleteExpiredSessions.run(now.toISOString());
  insertSession.run({ token, userId, expiresAt, now: now.toISOString() });
  setSessionCookie(res, token, expiresAt);
}

function getSessionToken(req: Request) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );

  return cookies.get(config.authCookieName) || '';
}

function setSessionCookie(res: Response, token: string, expiresAt: string) {
  const secure = config.appBaseUrl.startsWith('https://') || config.apiBaseUrl.startsWith('https://');
  res.cookie(config.authCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: new Date(expiresAt),
    path: '/',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(config.authCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.appBaseUrl.startsWith('https://') || config.apiBaseUrl.startsWith('https://'),
    path: '/',
  });
}

function serializeUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    avatarUrl: user.avatar_url || '',
    provider: user.provider,
  };
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function renderAuthReturn(message: string, returnTo: string) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>RelayClarity sign in</title></head>
  <body>
    <p>${escapeHtml(message)}</p>
    <p><a href="${escapeHtml(returnTo)}">Return to RelayClarity</a></p>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
