import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  config,
  hasGmailOAuth,
  hasGoogleAnalyticsOAuth,
  hasGoogleCalendarOAuth,
  hasHubSpotOAuth,
  hasMicrosoftOAuth,
  hasNotionOAuth,
  hasOktaOAuth,
  hasSalesforceOAuth,
  hasShopifyOAuth,
  hasSlackOAuth,
  hasSnowflakeApiKey,
  hasStripeOAuth,
  hasZendeskOAuth,
} from '../config.js';

export type IntegrationCategory =
  | 'crm'
  | 'knowledge'
  | 'telephony'
  | 'helpdesk'
  | 'billing'
  | 'identity'
  | 'calendar'
  | 'messaging'
  | 'commerce'
  | 'analytics'
  | 'data'
  | 'email';

export type IntegrationStatus = 'available' | 'connected' | 'oauth_ready' | 'sandbox';

export type IntegrationProvider = {
  id: string;
  name: string;
  category: IntegrationCategory;
  logoUrl: string;
  authType: 'oauth' | 'api_key' | 'webhook' | 'sandbox';
  status: IntegrationStatus;
  scopes: string[];
  description: string;
};

export type ConnectIntegrationInput = {
  providerId?: string;
  providerName?: string;
  category?: IntegrationCategory;
  workspaceName?: string;
};

export type ConnectedIntegration = {
  id: string;
  providerId: string;
  name: string;
  category: IntegrationCategory;
  logoUrl: string;
  status: 'connected' | 'oauth_redirect';
  authUrl?: string;
  mode: 'oauth' | 'sandbox';
  scopes: string[];
  connectedAt: string;
  message: string;
  tokenType?: string;
  tokenPreview?: string;
};

export type StoredIntegrationConnection = ConnectedIntegration & {
  providerAccountId?: string;
  expiresAt?: string;
};

type IntegrationConnectionRow = {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  category: IntegrationCategory;
  logo_url: string;
  mode: 'oauth';
  scopes_json: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_type: string | null;
  expires_at: string | null;
  provider_account_id: string | null;
  workspace_name: string | null;
  connected_at: string;
  updated_at: string;
};

type IntegrationOAuthStateRow = {
  state: string;
  user_id: string;
  provider_id: string;
  workspace_name: string | null;
  expires_at: string;
};

type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  account_id?: string;
  instance_url?: string;
  shop?: string;
  team?: { id?: string; name?: string };
  bot_user_id?: string;
};

const dbDirectory = path.dirname(config.authDbPath);
fs.mkdirSync(dbDirectory, { recursive: true });

const db = new Database(config.authDbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  create table if not exists integration_connections (
    id text primary key,
    user_id text not null,
    provider_id text not null,
    provider_name text not null,
    category text not null,
    logo_url text not null,
    mode text not null,
    scopes_json text not null,
    access_token_encrypted text not null,
    refresh_token_encrypted text,
    token_type text,
    expires_at text,
    provider_account_id text,
    workspace_name text,
    connected_at text not null,
    updated_at text not null,
    unique(user_id, provider_id)
  );

  create table if not exists integration_oauth_states (
    state text primary key,
    user_id text not null,
    provider_id text not null,
    workspace_name text,
    expires_at text not null,
    created_at text not null
  );

  create index if not exists integration_connections_user_idx on integration_connections(user_id);
  create index if not exists integration_oauth_states_user_idx on integration_oauth_states(user_id);
`);

const selectConnectionsByUser = db.prepare<string, IntegrationConnectionRow>('select * from integration_connections where user_id = ? order by connected_at asc');
const selectConnectionByUserAndProvider = db.prepare<[string, string], IntegrationConnectionRow>('select * from integration_connections where user_id = ? and provider_id = ?');
const upsertConnection = db.prepare(`
  insert into integration_connections (
    id, user_id, provider_id, provider_name, category, logo_url, mode, scopes_json,
    access_token_encrypted, refresh_token_encrypted, token_type, expires_at,
    provider_account_id, workspace_name, connected_at, updated_at
  )
  values (
    @id, @userId, @providerId, @providerName, @category, @logoUrl, @mode, @scopesJson,
    @accessTokenEncrypted, @refreshTokenEncrypted, @tokenType, @expiresAt,
    @providerAccountId, @workspaceName, @connectedAt, @updatedAt
  )
  on conflict(user_id, provider_id) do update set
    provider_name = excluded.provider_name,
    category = excluded.category,
    logo_url = excluded.logo_url,
    mode = excluded.mode,
    scopes_json = excluded.scopes_json,
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    token_type = excluded.token_type,
    expires_at = excluded.expires_at,
    provider_account_id = excluded.provider_account_id,
    workspace_name = excluded.workspace_name,
    updated_at = excluded.updated_at
`);
const insertOAuthState = db.prepare(`
  insert into integration_oauth_states (state, user_id, provider_id, workspace_name, expires_at, created_at)
  values (@state, @userId, @providerId, @workspaceName, @expiresAt, @createdAt)
`);
const selectOAuthState = db.prepare<string, IntegrationOAuthStateRow>('select * from integration_oauth_states where state = ?');
const deleteOAuthState = db.prepare<string>('delete from integration_oauth_states where state = ?');
const deleteExpiredOAuthStates = db.prepare<string>('delete from integration_oauth_states where expires_at <= ?');

const icon = (slug: string) => `https://cdn.simpleicons.org/${slug}`;

const providers: IntegrationProvider[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    logoUrl: icon('hubspot'),
    authType: 'oauth',
    status: hasHubSpotOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['crm.objects.contacts.read', 'crm.objects.companies.read', 'tickets'],
    description: 'Sync contacts, companies, lifecycle stage, owner, and recent CRM activity.',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    logoUrl: icon('salesforce'),
    authType: 'oauth',
    status: hasSalesforceOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['api', 'refresh_token', 'read_only'],
    description: 'Read account, contact, case, opportunity, and customer ownership context.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'knowledge',
    logoUrl: icon('obsidian'),
    authType: 'api_key',
    status: 'available',
    scopes: ['vault.read', 'notes.search', 'citations.read'],
    description: 'Search approved vault notes, policies, FAQs, and deployment playbooks.',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'knowledge',
    logoUrl: icon('notion'),
    authType: 'oauth',
    status: hasNotionOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['read_content', 'read_user'],
    description: 'Search approved pages, FAQs, policies, and deployment playbooks.',
  },
  {
    id: 'zoom',
    name: 'Zoom Contact Center',
    category: 'telephony',
    logoUrl: icon('zoom'),
    authType: 'webhook',
    status: 'available',
    scopes: ['contact_center:read:admin', 'contact_center_event:read:admin'],
    description: 'Receive call events, transcript payloads, and warm-transfer routing context.',
  },
  {
    id: 'zendesk',
    name: 'Zendesk Support',
    category: 'helpdesk',
    logoUrl: icon('zendesk'),
    authType: 'oauth',
    status: hasZendeskOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['tickets:read', 'tickets:write', 'users:read'],
    description: 'Create follow-up tickets with intent, urgency, summary, and transcript links.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'billing',
    logoUrl: icon('stripe'),
    authType: 'oauth',
    status: hasStripeOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['read_only'],
    description: 'Check invoice, customer, subscription, and payment state when approved.',
  },
  {
    id: 'okta',
    name: 'Okta',
    category: 'identity',
    logoUrl: icon('okta'),
    authType: 'oauth',
    status: hasOktaOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['openid', 'profile', 'email'],
    description: 'Verify caller identity before sensitive account or policy actions.',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    logoUrl: icon('googlecalendar'),
    authType: 'oauth',
    status: hasGoogleCalendarOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.freebusy'],
    description: 'Check appointment availability and prepare callback or booking requests.',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'messaging',
    logoUrl: icon('slack'),
    authType: 'oauth',
    status: hasSlackOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    description: 'Notify internal teams when the agent finds urgent callers or product gaps.',
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    category: 'messaging',
    logoUrl: icon('microsoftteams'),
    authType: 'oauth',
    status: hasMicrosoftOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['ChannelMessage.Send', 'User.Read'],
    description: 'Route high-priority handoffs and launch updates into operational channels.',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    logoUrl: icon('shopify'),
    authType: 'oauth',
    status: hasShopifyOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['read_customers', 'read_orders', 'read_products'],
    description: 'Read customer, product, order, return, and fulfilment state for retail calls.',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'analytics',
    logoUrl: icon('googleanalytics'),
    authType: 'oauth',
    status: hasGoogleAnalyticsOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    description: 'Tie caller demand to traffic, campaign, and conversion signals.',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'data',
    logoUrl: icon('snowflake'),
    authType: 'api_key',
    status: hasSnowflakeApiKey() ? 'available' : 'sandbox',
    scopes: ['read:customer_tables', 'read:events'],
    description: 'Read approved customer and operational tables for enterprise deployments.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    logoUrl: icon('gmail'),
    authType: 'oauth',
    status: hasGmailOAuth() ? 'oauth_ready' : 'sandbox',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    description: 'Create follow-up emails and inspect approved support mailbox context.',
  },
];

export function listIntegrationProviders(userId?: string) {
  const connectedProviderIds = new Set(userId ? getConnectedIntegrations(userId).map((connection) => connection.providerId) : []);

  return providers.map((provider) => ({
    ...provider,
    status: connectedProviderIds.has(provider.id) ? 'connected' : provider.status,
  }));
}

export function getConnectedIntegrations(userId?: string) {
  if (!userId) {
    return [];
  }

  return selectConnectionsByUser.all(userId).map(serializeConnectionRow);
}

export function getIntegrationAccessToken(userId: string, providerId: string) {
  if (!userId || !providerId) {
    return '';
  }

  const provider = findIntegrationProvider(providerId);
  if (!provider) {
    return '';
  }

  const connection = selectConnectionByUserAndProvider.get(userId, provider.id);
  return connection ? decryptToken(connection.access_token_encrypted) : '';
}

export function getStoredIntegrationConnection(userId: string, providerId: string): StoredIntegrationConnection | null {
  if (!userId || !providerId) {
    return null;
  }

  const provider = findIntegrationProvider(providerId);
  if (!provider) {
    return null;
  }

  const row = selectConnectionByUserAndProvider.get(userId, provider.id);
  if (!row) {
    return null;
  }

  return {
    ...serializeConnectionRow(row),
    providerAccountId: row.provider_account_id || undefined,
    expiresAt: row.expires_at || undefined,
  };
}

export function findIntegrationProvider(providerIdOrName: string, category?: IntegrationCategory) {
  const normalized = normalizeProvider(providerIdOrName);
  return providers.find((provider) => (
    provider.id === normalized ||
    normalizeProvider(provider.name) === normalized ||
    (category && provider.category === category && provider.name.toLowerCase().includes(normalized))
  ));
}

export function connectIntegration(input: ConnectIntegrationInput, userId: string): ConnectedIntegration {
  if (!userId) {
    throw new Error('Sign in before connecting integrations.');
  }

  const provider = selectProvider(input);

  if (provider.authType !== 'oauth' && isServerConfiguredProvider(provider)) {
    return {
      id: `int_${provider.id}_server`,
      providerId: provider.id,
      name: provider.name,
      category: provider.category,
      logoUrl: provider.logoUrl,
      status: 'connected',
      mode: 'sandbox',
      scopes: provider.scopes,
      connectedAt: new Date().toISOString(),
      message: `${provider.name} is configured on the server and ready to use.`,
    };
  }

  const state = createOAuthState(userId, provider.id, input.workspaceName);
  const authUrl = buildOAuthUrl(provider, state);
  const now = new Date().toISOString();
  if (!authUrl) {
    deleteOAuthState.run(state);
    throw new Error(`${provider.name} is not connected yet. Configure a real ${provider.authType === 'oauth' ? 'OAuth app' : provider.authType} integration before this dashboard can link it.`);
  }

  const connection: ConnectedIntegration = {
    id: `int_${provider.id}_${Date.now()}`,
    providerId: provider.id,
    name: provider.name,
    category: provider.category,
    logoUrl: provider.logoUrl,
    status: 'oauth_redirect',
    authUrl,
    mode: 'oauth',
    scopes: provider.scopes,
    connectedAt: now,
    message: `Redirect the user to ${provider.name} to approve access.`,
  };

  return connection;
}

export async function testIntegration(providerId: string, userId: string) {
  if (!userId) {
    throw new Error('Sign in before testing integrations.');
  }

  const provider = findIntegrationProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown integration provider: ${providerId}`);
  }

  const connectionRow = selectConnectionByUserAndProvider.get(userId, provider.id);
  const serverConfigured = !connectionRow && provider.authType !== 'oauth' && isServerConfiguredProvider(provider);
  const connection = connectionRow
    ? serializeConnectionRow(connectionRow)
    : serverConfigured
      ? serverConfiguredConnection(provider)
      : null;
  const accessToken = connectionRow ? decryptToken(connectionRow.access_token_encrypted) : '';
  const accountReachable = connectionRow && accessToken
    ? await validateProviderAccount(provider, accessToken)
    : serverConfigured
      ? await validateServerConfiguredProvider(provider)
      : false;

  return {
    ok: Boolean(connection && accountReachable),
    provider: provider.name,
    mode: connection?.mode || 'not_connected',
    checkedAt: new Date().toISOString(),
    checks: [
      { name: 'Authentication', status: connection ? 'passed' : 'missing' },
      { name: 'Scopes', status: provider.scopes.length > 0 ? 'passed' : 'missing' },
      { name: 'Provider account', status: accountReachable ? 'passed' : 'blocked' },
      { name: 'Dashboard handoff', status: connection && accountReachable ? 'passed' : 'blocked' },
    ],
  };
}

export async function finalizeOAuthConnection(providerId: string, code: string, state: string): Promise<ConnectedIntegration> {
  const provider = findIntegrationProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown integration provider: ${providerId}`);
  }

  if (!code) {
    throw new Error('OAuth code is required');
  }

  if (!state) {
    throw new Error('OAuth state is required');
  }

  const storedState = selectOAuthState.get(state);
  const now = new Date().toISOString();

  if (!storedState || storedState.expires_at <= now || storedState.provider_id !== provider.id) {
    if (storedState) {
      deleteOAuthState.run(state);
    }
    throw new Error('OAuth authorization expired or could not be verified.');
  }

  deleteOAuthState.run(state);

  const token = await exchangeOAuthCode(provider, code);
  await assertProviderAccount(provider, token.access_token);
  const connectedAt = new Date().toISOString();
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
  const connectionId = `int_${provider.id}_${crypto.randomUUID()}`;

  const connection: ConnectedIntegration = {
    id: connectionId,
    providerId: provider.id,
    name: provider.name,
    category: provider.category,
    logoUrl: provider.logoUrl,
    status: 'connected',
    mode: 'oauth',
    scopes: provider.scopes,
    connectedAt,
    tokenType: token.token_type,
    tokenPreview: redactToken(token.access_token),
    message: `${provider.name} OAuth connection approved and token exchange completed.`,
  };

  upsertConnection.run({
    id: connectionId,
    userId: storedState.user_id,
    providerId: provider.id,
    providerName: provider.name,
    category: provider.category,
    logoUrl: provider.logoUrl,
    mode: 'oauth',
    scopesJson: JSON.stringify(provider.scopes),
    accessTokenEncrypted: encryptToken(token.access_token),
    refreshTokenEncrypted: token.refresh_token ? encryptToken(token.refresh_token) : null,
    tokenType: token.token_type || null,
    expiresAt,
    providerAccountId: providerAccountId(provider, token),
    workspaceName: storedState.workspace_name,
    connectedAt,
    updatedAt: connectedAt,
  });
  return connection;
}

function selectProvider(input: ConnectIntegrationInput) {
  const provider = input.providerId ? findIntegrationProvider(input.providerId, input.category) : null;

  if (provider) {
    return provider;
  }

  if (input.providerId) {
    throw new Error(`${input.providerName || input.providerId} does not have a real integration connector implemented yet.`);
  }

  if (input.category) {
    const categoryProvider = providers.find((item) => item.category === input.category);

    if (categoryProvider) {
      return categoryProvider;
    }
  }

  throw new Error('Integration provider is required');
}

function buildOAuthUrl(provider: IntegrationProvider, state: string) {
  if (provider.id === 'hubspot' && hasHubSpotOAuth()) {
    const params = new URLSearchParams({
      client_id: config.hubspotClientId,
      redirect_uri: config.hubspotRedirectUri,
      scope: provider.scopes.join(' '),
      state,
    });
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'salesforce' && hasSalesforceOAuth()) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.salesforceClientId,
      redirect_uri: config.salesforceRedirectUri,
      scope: provider.scopes.join(' '),
      state,
    });
    return `${config.salesforceLoginUrl.replace(/\/$/, '')}/services/oauth2/authorize?${params.toString()}`;
  }

  if (provider.id === 'notion' && hasNotionOAuth()) {
    const params = new URLSearchParams({
      client_id: config.notionClientId,
      redirect_uri: config.notionRedirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'zendesk' && hasZendeskOAuth()) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.zendeskClientId,
      redirect_uri: config.zendeskRedirectUri,
      scope: provider.scopes.join(' '),
      state,
    });
    return `${zendeskBaseUrl()}/oauth/authorizations/new?${params.toString()}`;
  }

  if (provider.id === 'slack' && hasSlackOAuth()) {
    const params = new URLSearchParams({
      client_id: config.slackClientId,
      scope: provider.scopes.join(','),
      redirect_uri: config.slackRedirectUri,
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  if (provider.id === 'stripe' && hasStripeOAuth()) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.stripeClientId,
      scope: provider.scopes[0] || 'read_only',
      redirect_uri: config.stripeRedirectUri,
      state,
    });
    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'okta' && hasOktaOAuth()) {
    const params = new URLSearchParams({
      client_id: config.oktaClientId,
      redirect_uri: config.oktaRedirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state,
    });
    return `${config.oktaIssuerUrl.replace(/\/$/, '')}/v1/authorize?${params.toString()}`;
  }

  if (provider.id === 'microsoft-teams' && hasMicrosoftOAuth()) {
    const params = new URLSearchParams({
      client_id: config.microsoftClientId,
      redirect_uri: config.microsoftRedirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: provider.scopes.join(' '),
      state,
    });
    return `https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenantId)}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  if (provider.id === 'shopify' && hasShopifyOAuth()) {
    const params = new URLSearchParams({
      client_id: config.shopifyClientId,
      redirect_uri: config.shopifyRedirectUri,
      scope: provider.scopes.join(','),
      state,
    });
    return `${shopifyBaseUrl()}/admin/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'google-calendar' && hasGoogleCalendarOAuth()) {
    return buildGoogleOAuthUrl(provider, config.googleCalendarRedirectUri, state);
  }

  if (provider.id === 'google-analytics' && hasGoogleAnalyticsOAuth()) {
    return buildGoogleOAuthUrl(provider, config.googleAnalyticsRedirectUri, state);
  }

  if (provider.id === 'gmail' && hasGmailOAuth()) {
    return buildGoogleOAuthUrl(provider, config.gmailRedirectUri, state);
  }

  return undefined;
}

function buildGoogleOAuthUrl(provider: IntegrationProvider, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.googleIntegrationClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: provider.scopes.join(' '),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeOAuthCode(provider: IntegrationProvider, code: string): Promise<OAuthTokenResponse> {
  if (provider.id === 'hubspot' && hasHubSpotOAuth()) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.hubspotClientId,
      client_secret: config.hubspotClientSecret,
      redirect_uri: config.hubspotRedirectUri,
      code,
    });
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'salesforce' && hasSalesforceOAuth()) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.salesforceClientId,
      client_secret: config.salesforceClientSecret,
      redirect_uri: config.salesforceRedirectUri,
      code,
    });
    const response = await fetch(`${config.salesforceLoginUrl.replace(/\/$/, '')}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'notion' && hasNotionOAuth()) {
    const credentials = Buffer.from(`${config.notionClientId}:${config.notionClientSecret}`).toString('base64');
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.notionRedirectUri,
      }),
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'zendesk' && hasZendeskOAuth()) {
    const response = await fetch(`${zendeskBaseUrl()}/oauth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: config.zendeskClientId,
        client_secret: config.zendeskClientSecret,
        redirect_uri: config.zendeskRedirectUri,
        code,
        scope: provider.scopes.join(' '),
      }),
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'slack' && hasSlackOAuth()) {
    const body = new URLSearchParams({
      client_id: config.slackClientId,
      client_secret: config.slackClientSecret,
      code,
      redirect_uri: config.slackRedirectUri,
    });
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'okta' && hasOktaOAuth()) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.oktaClientId,
      client_secret: config.oktaClientSecret,
      redirect_uri: config.oktaRedirectUri,
      code,
    });
    const response = await fetch(`${config.oktaIssuerUrl.replace(/\/$/, '')}/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'microsoft-teams' && hasMicrosoftOAuth()) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.microsoftClientId,
      client_secret: config.microsoftClientSecret,
      redirect_uri: config.microsoftRedirectUri,
      code,
    });
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'shopify' && hasShopifyOAuth()) {
    const response = await fetch(`${shopifyBaseUrl()}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.shopifyClientId,
        client_secret: config.shopifyClientSecret,
        code,
      }),
    });
    return parseOAuthTokenResponse(provider, response);
  }

  if (provider.id === 'google-calendar' && hasGoogleCalendarOAuth()) {
    return exchangeGoogleOAuthCode(provider, code, config.googleCalendarRedirectUri);
  }

  if (provider.id === 'google-analytics' && hasGoogleAnalyticsOAuth()) {
    return exchangeGoogleOAuthCode(provider, code, config.googleAnalyticsRedirectUri);
  }

  if (provider.id === 'gmail' && hasGmailOAuth()) {
    return exchangeGoogleOAuthCode(provider, code, config.gmailRedirectUri);
  }

  if (provider.id === 'stripe' && hasStripeOAuth()) {
    const credentials = Buffer.from(`${config.stripeSecretKey}:`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    });
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    return parseOAuthTokenResponse(provider, response);
  }

  throw new Error(`${provider.name} OAuth credentials are not configured`);
}

async function exchangeGoogleOAuthCode(provider: IntegrationProvider, code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.googleIntegrationClientId,
    client_secret: config.googleIntegrationClientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return parseOAuthTokenResponse(provider, response);
}

async function parseOAuthTokenResponse(provider: IntegrationProvider, response: Response) {
  const payload = await response.json().catch(() => ({})) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    account_id?: string;
    instance_url?: string;
    shop?: string;
    team?: { id?: string; name?: string };
    bot_user_id?: string;
    ok?: boolean;
    error?: string;
    error_description?: string;
    message?: string;
  };

  if (!response.ok || payload.ok === false || !payload.access_token) {
    throw new Error(`${provider.name} token exchange failed: ${payload.message || payload.error_description || payload.error || response.statusText}`);
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in,
    account_id: payload.account_id,
    instance_url: payload.instance_url,
    shop: payload.shop,
    team: payload.team,
    bot_user_id: payload.bot_user_id,
  };
}

async function assertProviderAccount(provider: IntegrationProvider, accessToken: string) {
  if (!(await validateProviderAccount(provider, accessToken))) {
    throw new Error(`${provider.name} account validation failed after OAuth token exchange`);
  }
}

async function validateProviderAccount(provider: IntegrationProvider, accessToken: string) {
  if (provider.id === 'hubspot') {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'salesforce') {
    const response = await fetch(`${config.salesforceLoginUrl.replace(/\/$/, '')}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'notion') {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });
    return response.ok;
  }

  if (provider.id === 'zendesk') {
    const response = await fetch(`${zendeskBaseUrl()}/api/v2/users/me.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'slack') {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean };
    return response.ok && payload.ok === true;
  }

  if (provider.id === 'stripe') {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'okta') {
    const response = await fetch(`${config.oktaIssuerUrl.replace(/\/$/, '')}/v1/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'microsoft-teams') {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'shopify') {
    const response = await fetch(`${shopifyBaseUrl()}/admin/api/2025-07/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });
    return response.ok;
  }

  if (provider.id === 'google-calendar') {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'google-analytics') {
    const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  if (provider.id === 'gmail') {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  return false;
}

function redactToken(token: string) {
  return token.length > 10 ? `${token.slice(0, 4)}...${token.slice(-4)}` : 'stored';
}

function createOAuthState(userId: string, providerId: string, workspaceName?: string) {
  const state = crypto.randomBytes(24).toString('base64url');
  const now = new Date();
  deleteExpiredOAuthStates.run(now.toISOString());
  insertOAuthState.run({
    state,
    userId,
    providerId,
    workspaceName: workspaceName?.trim() || null,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
  });
  return state;
}

function serializeConnectionRow(row: IntegrationConnectionRow): ConnectedIntegration {
  const provider = findIntegrationProvider(row.provider_id);
  const scopes = parseScopes(row.scopes_json);

  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.provider_name,
    category: row.category,
    logoUrl: row.logo_url,
    status: 'connected',
    mode: row.mode,
    scopes,
    connectedAt: row.connected_at,
    tokenType: row.token_type || undefined,
    tokenPreview: 'stored',
    message: `${provider?.name || row.provider_name} OAuth connection approved and ready.`,
  };
}

function serverConfiguredConnection(provider: IntegrationProvider): ConnectedIntegration {
  return {
    id: `int_${provider.id}_server`,
    providerId: provider.id,
    name: provider.name,
    category: provider.category,
    logoUrl: provider.logoUrl,
    status: 'connected',
    mode: 'sandbox',
    scopes: provider.scopes,
    connectedAt: new Date().toISOString(),
    message: `${provider.name} is configured on the server and ready to use.`,
  };
}

async function validateServerConfiguredProvider(provider: IntegrationProvider) {
  if (provider.id === 'obsidian') {
    return true;
  }

  if (provider.id === 'zoom') {
    return Boolean(config.zoomWebhookSecretToken || config.zoomAccountId || config.zoomVirtualAgentId || config.zoomContactCenterQueueId);
  }

  if (provider.id === 'snowflake') {
    return hasSnowflakeApiKey();
  }

  return false;
}

function isServerConfiguredProvider(provider: IntegrationProvider) {
  if (provider.id === 'obsidian') {
    return true;
  }

  if (provider.id === 'zoom') {
    return Boolean(config.zoomWebhookSecretToken || config.zoomAccountId || config.zoomVirtualAgentId || config.zoomContactCenterQueueId);
  }

  if (provider.id === 'snowflake') {
    return hasSnowflakeApiKey();
  }

  return false;
}

function parseScopes(scopesJson: string): string[] {
  try {
    const scopes = JSON.parse(scopesJson);
    return Array.isArray(scopes) ? scopes.filter((scope): scope is string => typeof scope === 'string') : [];
  } catch {
    return [];
  }
}

function providerAccountId(provider: IntegrationProvider, token: OAuthTokenResponse) {
  if (provider.id === 'salesforce') {
    return token.instance_url || null;
  }

  if (provider.id === 'shopify') {
    return token.shop || config.shopifyShopDomain || null;
  }

  if (provider.id === 'slack') {
    return token.team?.id || token.bot_user_id || null;
  }

  return token.account_id || null;
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', integrationEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptToken(value: string) {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split(':');

  if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Stored integration token is not readable.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', integrationEncryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function integrationEncryptionKey() {
  if (!config.integrationEncryptionKey && config.nodeEnv === 'production') {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is required in production.');
  }

  return crypto
    .createHash('sha256')
    .update(config.integrationEncryptionKey || `relayclarity-local-dev:${config.authDbPath}`, 'utf8')
    .digest();
}

function zendeskBaseUrl() {
  return `https://${config.zendeskSubdomain.replace(/^https?:\/\//, '').replace(/\.zendesk\.com\/?$/, '')}.zendesk.com`;
}

function shopifyBaseUrl() {
  const shop = config.shopifyShopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${shop}`;
}

function normalizeProvider(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
