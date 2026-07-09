import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Request, Response } from 'express';
import { config } from './config.js';
import { isEmailDeliveryConfigured, sendPasswordResetEmail } from './email.js';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: string;
  provider_id: string | null;
  password_hash: string | null;
  onboarded_at: string | null;
  account_type: string;
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

type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  meta: string;
  business_type: string | null;
  website_url: string | null;
  phone_contact_number: string | null;
  launch_report: string | null;
  created_at: string;
  updated_at: string;
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
    password_hash text,
    onboarded_at text,
    account_type text not null default 'customer',
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

  create table if not exists password_reset_tokens (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    token_hash text not null unique,
    expires_at text not null,
    used_at text,
    created_at text not null
  );

  create index if not exists password_reset_tokens_user_id_idx on password_reset_tokens(user_id);

  create table if not exists user_projects (
    id text not null,
    user_id text not null references users(id) on delete cascade,
    name text not null,
    meta text not null,
    business_type text,
    website_url text,
    phone_contact_number text,
    launch_report text,
    created_at text not null,
    updated_at text not null,
    primary key (user_id, id)
  );
`);

ensureColumn('users', 'password_hash', 'text');
ensureColumn('users', 'onboarded_at', 'text');
ensureColumn('users', 'account_type', "text not null default 'customer'");

const selectUserByEmail = db.prepare<string, UserRow>('select * from users where lower(email) = lower(?)');
const selectUserById = db.prepare<string, UserRow>('select * from users where id = ?');
const insertUser = db.prepare(`
  insert into users (id, email, name, avatar_url, provider, provider_id, password_hash, onboarded_at, account_type, created_at, updated_at)
  values (@id, @email, @name, @avatarUrl, @provider, @providerId, @passwordHash, @onboardedAt, @accountType, @now, @now)
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
const updateUserPassword = db.prepare(`
  update users
  set password_hash = @passwordHash,
      account_type = @accountType,
      onboarded_at = @onboardedAt,
      updated_at = @now
  where id = @id
`);
const markUserOnboarded = db.prepare(`
  update users
  set onboarded_at = coalesce(onboarded_at, @now),
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
const insertPasswordResetToken = db.prepare(`
  insert into password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
  values (@id, @userId, @tokenHash, @expiresAt, @now)
`);
const selectPasswordResetToken = db.prepare<string, PasswordResetTokenRow>('select * from password_reset_tokens where token_hash = ?');
const deletePasswordResetTokensByUserId = db.prepare<string>('delete from password_reset_tokens where user_id = ?');
const deleteExpiredPasswordResetTokens = db.prepare<string>('delete from password_reset_tokens where expires_at <= ? or used_at is not null');
const selectProjectsByUserId = db.prepare<string, ProjectRow>('select * from user_projects where user_id = ? order by created_at asc');
const upsertProject = db.prepare(`
  insert into user_projects (id, user_id, name, meta, business_type, website_url, phone_contact_number, launch_report, created_at, updated_at)
  values (@id, @userId, @name, @meta, @businessType, @websiteUrl, @phoneContactNumber, @launchReport, @now, @now)
  on conflict(user_id, id) do update set
    name = excluded.name,
    meta = excluded.meta,
    business_type = excluded.business_type,
    website_url = excluded.website_url,
    phone_contact_number = excluded.phone_contact_number,
    launch_report = excluded.launch_report,
    updated_at = excluded.updated_at
`);

ensureDemoAccount();

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
  onboarded: boolean;
  accountType: string;
};

export type UserProject = {
  id: string;
  name: string;
  meta: string;
  businessType?: string;
  websiteUrl?: string;
  phoneContactNumber?: string;
  launchReport?: string;
};

const defaultDemoProjects: UserProject[] = [
  { id: 'clear-dbs-live', name: 'Clear DBS', meta: 'Live DBS compliance command centre', businessType: 'DBS checks and compliance support' },
  { id: 'cleardbs', name: 'ClearDBS archive', meta: 'DBS support pilot', businessType: 'Compliance checks' },
  { id: 'northstar-dental', name: 'Northstar Dental', meta: 'Live customer agent', businessType: 'Dental clinic' },
  { id: 'harbour-financial', name: 'Harbour Financial', meta: 'Client service desk', businessType: 'Financial services' },
  { id: 'atlas-retail', name: 'Atlas Retail', meta: 'Order support and store callbacks', businessType: 'Retail support' },
  { id: 'midtown-property', name: 'Midtown Property', meta: 'Tenant maintenance triage', businessType: 'Estate agency' },
];
const passwordResetExpiryMinutes = 60;

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
  const rememberMe = req.body?.rememberMe === true;

  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Enter your password.' });
    return;
  }

  const user = selectUserByEmail.get(email);

  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }

  createSession(res, user.id, { rememberMe });
  res.json({ user: serializeUser(user), googleAuthAvailable: isGoogleAuthConfigured() });
}

export function handleEmailSignup(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Use at least 8 characters for your password.' });
    return;
  }

  if (selectUserByEmail.get(email)) {
    res.status(409).json({ error: 'An account already exists for this email. Sign in instead.' });
    return;
  }

  const user = createUser({
    email,
    name: name || email.split('@')[0],
    avatarUrl: null,
    provider: 'email',
    providerId: null,
    passwordHash: hashPassword(password),
    onboardedAt: null,
    accountType: 'customer',
  });

  createSession(res, user.id);
  res.status(201).json({ user: serializeUser(user), googleAuthAvailable: isGoogleAuthConfigured() });
}

export async function handlePasswordResetRequest(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  if (!isEmailDeliveryConfigured()) {
    if (config.nodeEnv === 'production') {
      res.status(503).json({ error: 'Password reset email is not configured on this server.' });
      return;
    }

    const user = selectUserByEmail.get(email);
    const resetUrl = user ? createPasswordResetLink(user.id) : '';

    res.json({
      ok: true,
      emailDelivery: 'not_configured',
      message: 'Email delivery is not configured locally. Use the development reset link to test this flow.',
      ...(resetUrl ? { resetUrl } : {}),
    });
    return;
  }

  const user = selectUserByEmail.get(email);

  if (user) {
    const resetUrl = createPasswordResetLink(user.id);
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresInMinutes: passwordResetExpiryMinutes,
    });
  }

  res.json({
    ok: true,
    emailDelivery: 'sent',
    message: 'If an account exists for that email, a password reset link has been sent.',
  });
}

export function handlePasswordResetConfirm(req: Request, res: Response) {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!token) {
    res.status(400).json({ error: 'Password reset link is missing or invalid.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Use at least 8 characters for your new password.' });
    return;
  }

  const tokenRow = selectPasswordResetToken.get(hashResetToken(token));
  const now = new Date().toISOString();

  if (!tokenRow || tokenRow.used_at || tokenRow.expires_at <= now) {
    res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    return;
  }

  const user = selectUserById.get(tokenRow.user_id);

  if (!user) {
    res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    return;
  }

  updateUserPassword.run({
    id: user.id,
    passwordHash: hashPassword(password),
    accountType: user.account_type || 'customer',
    onboardedAt: user.onboarded_at,
    now,
  });
  deletePasswordResetTokensByUserId.run(user.id);

  const updatedUser = selectUserById.get(user.id) as UserRow;
  createSession(res, updatedUser.id);
  res.json({ user: serializeUser(updatedUser), googleAuthAvailable: isGoogleAuthConfigured() });
}

export function handleOnboardingComplete(req: Request, res: Response) {
  const user = requireAuth(req, res);

  if (!user) {
    return;
  }

  markUserOnboarded.run({ id: user.id, now: new Date().toISOString() });
  const updatedUser = selectUserById.get(user.id);
  res.json({ user: updatedUser ? serializeUser(updatedUser) : user, googleAuthAvailable: isGoogleAuthConfigured() });
}

export function handleListProjects(req: Request, res: Response) {
  const user = requireAuth(req, res);

  if (!user) {
    return;
  }

  const projects = selectProjectsByUserId.all(user.id).map(serializeProject);
  res.json({ projects: projects.length || user.accountType !== 'demo' ? projects : defaultDemoProjects });
}

export function handleSaveProject(req: Request, res: Response) {
  const user = requireAuth(req, res);

  if (!user) {
    return;
  }

  const project = normalizeProject(req.body);

  if (!project) {
    res.status(400).json({ error: 'Project name and id are required.' });
    return;
  }

  upsertProject.run({
    id: project.id,
    userId: user.id,
    name: project.name,
    meta: project.meta,
    businessType: project.businessType || null,
    websiteUrl: project.websiteUrl || null,
    phoneContactNumber: project.phoneContactNumber || null,
    launchReport: project.launchReport || null,
    now: new Date().toISOString(),
  });

  res.status(201).json({
    project,
    projects: selectProjectsByUserId.all(user.id).map(serializeProject),
  });
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

  return createUser({
    ...input,
    passwordHash: null,
    onboardedAt: null,
    accountType: 'customer',
  });
}

function createUser(input: {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  providerId: string | null;
  passwordHash: string | null;
  onboardedAt: string | null;
  accountType: string;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  insertUser.run({
    id,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    provider: input.provider,
    providerId: input.providerId,
    passwordHash: input.passwordHash,
    onboardedAt: input.onboardedAt,
    accountType: input.accountType,
    now,
  });

  return selectUserById.get(id) as UserRow;
}

function createSession(res: Response, userId: string, options: { rememberMe?: boolean } = {}) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresInMs = options.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + expiresInMs).toISOString();
  deleteExpiredSessions.run(now.toISOString());
  insertSession.run({ token, userId, expiresAt, now: now.toISOString() });
  setSessionCookie(res, token, options.rememberMe ? expiresAt : undefined);
}

function createPasswordResetLink(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + passwordResetExpiryMinutes * 60 * 1000).toISOString();

  deleteExpiredPasswordResetTokens.run(now.toISOString());
  deletePasswordResetTokensByUserId.run(userId);
  insertPasswordResetToken.run({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashResetToken(token),
    expiresAt,
    now: now.toISOString(),
  });

  const resetUrl = new URL('/reset-password', config.appBaseUrl.replace(/\/$/, ''));
  resetUrl.searchParams.set('token', token);
  return resetUrl.toString();
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
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

function setSessionCookie(res: Response, token: string, expiresAt?: string) {
  const secure = config.appBaseUrl.startsWith('https://') || config.apiBaseUrl.startsWith('https://');
  res.cookie(config.authCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    ...(expiresAt ? { expires: new Date(expiresAt) } : {}),
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
    onboarded: Boolean(user.onboarded_at),
    accountType: user.account_type || 'customer',
  };
}

function serializeProject(project: ProjectRow): UserProject {
  return {
    id: project.id,
    name: project.name,
    meta: project.meta,
    businessType: project.business_type || undefined,
    websiteUrl: project.website_url || undefined,
    phoneContactNumber: project.phone_contact_number || undefined,
    launchReport: project.launch_report || undefined,
  };
}

function normalizeProject(value: unknown): UserProject | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const input = value as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    meta: typeof input.meta === 'string' && input.meta.trim() ? input.meta.trim() : 'Workspace',
    businessType: typeof input.businessType === 'string' ? input.businessType.trim() : undefined,
    websiteUrl: typeof input.websiteUrl === 'string' ? input.websiteUrl.trim() : undefined,
    phoneContactNumber: typeof input.phoneContactNumber === 'string' ? input.phoneContactNumber.trim() : undefined,
    launchReport: typeof input.launchReport === 'string' ? input.launchReport : undefined,
  };
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;

  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function ensureDemoAccount() {
  const email = 'demo@relayclarity.ai';
  const passwordHash = hashPassword('RelayClarityDemo2026!');
  const now = new Date().toISOString();
  const existing = selectUserByEmail.get(email);

  if (existing) {
    updateUser.run({
      id: existing.id,
      name: 'Demo Operator',
      avatarUrl: null,
      provider: 'email',
      providerId: null,
      now,
    });
    updateUserPassword.run({
      id: existing.id,
      passwordHash,
      accountType: 'demo',
      onboardedAt: existing.onboarded_at || now,
      now,
    });
    return;
  }

  createUser({
    email,
    name: 'Demo Operator',
    avatarUrl: null,
    provider: 'email',
    providerId: null,
    passwordHash,
    onboardedAt: now,
    accountType: 'demo',
  });
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, expectedHash] = storedHash.split(':');

  if (scheme !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(crypto.scryptSync(password, salt, 64).toString('base64url'));
  const expected = Buffer.from(expectedHash);

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
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
