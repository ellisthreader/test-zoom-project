import { config, hasHubSpotOAuth, hasNotionOAuth, hasSlackOAuth, hasStripeOAuth } from '../config.js';

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

const connectedIntegrations = new Map<string, ConnectedIntegration>();
const integrationAccessTokens = new Map<string, string>();

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
    status: 'sandbox',
    scopes: ['api', 'refresh_token', 'read_only'],
    description: 'Read account, contact, case, opportunity, and customer ownership context.',
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
    authType: 'api_key',
    status: 'sandbox',
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
    status: 'sandbox',
    scopes: ['openid', 'profile', 'email'],
    description: 'Verify caller identity before sensitive account or policy actions.',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    logoUrl: icon('googlecalendar'),
    authType: 'oauth',
    status: 'sandbox',
    scopes: ['calendar.events.readonly', 'calendar.freebusy'],
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
    status: 'sandbox',
    scopes: ['ChannelMessage.Send', 'User.Read'],
    description: 'Route high-priority handoffs and launch updates into operational channels.',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    logoUrl: icon('shopify'),
    authType: 'oauth',
    status: 'sandbox',
    scopes: ['read_customers', 'read_orders', 'read_products'],
    description: 'Read customer, product, order, return, and fulfilment state for retail calls.',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'analytics',
    logoUrl: icon('googleanalytics'),
    authType: 'oauth',
    status: 'sandbox',
    scopes: ['analytics.readonly'],
    description: 'Tie caller demand to traffic, campaign, and conversion signals.',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'data',
    logoUrl: icon('snowflake'),
    authType: 'api_key',
    status: 'sandbox',
    scopes: ['read:customer_tables', 'read:events'],
    description: 'Read approved customer and operational tables for enterprise deployments.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    logoUrl: icon('gmail'),
    authType: 'oauth',
    status: 'sandbox',
    scopes: ['gmail.readonly', 'gmail.send'],
    description: 'Create follow-up emails and inspect approved support mailbox context.',
  },
];

export function listIntegrationProviders() {
  return providers.map((provider) => ({
    ...provider,
    status: connectedIntegrations.has(provider.id) ? 'connected' : provider.status,
  }));
}

export function getConnectedIntegrations() {
  return Array.from(connectedIntegrations.values());
}

export function findIntegrationProvider(providerIdOrName: string, category?: IntegrationCategory) {
  const normalized = normalizeProvider(providerIdOrName);
  return providers.find((provider) => (
    provider.id === normalized ||
    normalizeProvider(provider.name) === normalized ||
    (category && provider.category === category && provider.name.toLowerCase().includes(normalized))
  ));
}

export function connectIntegration(input: ConnectIntegrationInput): ConnectedIntegration {
  const provider = selectProvider(input);
  const authUrl = buildOAuthUrl(provider);
  const now = new Date().toISOString();
  if (!authUrl) {
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

export async function testIntegration(providerId: string) {
  const provider = findIntegrationProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown integration provider: ${providerId}`);
  }

  const connection = connectedIntegrations.get(provider.id);
  const accessToken = integrationAccessTokens.get(provider.id);
  const accountReachable = connection && accessToken ? await validateProviderAccount(provider, accessToken) : false;

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

export async function finalizeOAuthConnection(providerId: string, code: string): Promise<ConnectedIntegration> {
  const provider = findIntegrationProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown integration provider: ${providerId}`);
  }

  if (!code) {
    throw new Error('OAuth code is required');
  }

  const token = await exchangeOAuthCode(provider, code);
  await assertProviderAccount(provider, token.access_token);

  const connection: ConnectedIntegration = {
    id: `int_${provider.id}_${Date.now()}`,
    providerId: provider.id,
    name: provider.name,
    category: provider.category,
    logoUrl: provider.logoUrl,
    status: 'connected',
    mode: 'oauth',
    scopes: provider.scopes,
    connectedAt: new Date().toISOString(),
    tokenType: token.token_type,
    tokenPreview: redactToken(token.access_token),
    message: `${provider.name} OAuth connection approved and token exchange completed.`,
  };

  connectedIntegrations.set(provider.id, connection);
  integrationAccessTokens.set(provider.id, token.access_token);
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

function buildOAuthUrl(provider: IntegrationProvider) {
  if (provider.id === 'hubspot' && hasHubSpotOAuth()) {
    const params = new URLSearchParams({
      client_id: config.hubspotClientId,
      redirect_uri: config.hubspotRedirectUri,
      scope: provider.scopes.join(' '),
      state: 'chatoraai-dashboard',
    });
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'notion' && hasNotionOAuth()) {
    const params = new URLSearchParams({
      client_id: config.notionClientId,
      redirect_uri: config.notionRedirectUri,
      response_type: 'code',
      owner: 'user',
      state: 'chatoraai-dashboard',
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  if (provider.id === 'slack' && hasSlackOAuth()) {
    const params = new URLSearchParams({
      client_id: config.slackClientId,
      scope: provider.scopes.join(','),
      redirect_uri: config.slackRedirectUri,
      state: 'chatoraai-dashboard',
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  if (provider.id === 'stripe' && hasStripeOAuth()) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.stripeClientId,
      scope: provider.scopes[0] || 'read_only',
      redirect_uri: config.stripeRedirectUri,
      state: 'chatoraai-dashboard',
    });
    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  }

  return undefined;
}

async function exchangeOAuthCode(provider: IntegrationProvider, code: string): Promise<{ access_token: string; token_type?: string }> {
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

async function parseOAuthTokenResponse(provider: IntegrationProvider, response: Response) {
  const payload = await response.json().catch(() => ({})) as {
    access_token?: string;
    token_type?: string;
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
    token_type: payload.token_type,
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

  if (provider.id === 'notion') {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
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

  return false;
}

function redactToken(token: string) {
  return token.length > 10 ? `${token.slice(0, 4)}...${token.slice(-4)}` : 'stored';
}

function normalizeProvider(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
