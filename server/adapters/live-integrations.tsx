import { config } from '../config.js';
import { createTicket } from './helpdesk.js';
import { getIntegrationAccessToken, getStoredIntegrationConnection } from './integrations.js';
import type { CustomerLookup, TicketInput } from '../types.js';

export type IntegrationActionInput = {
  action?: string;
  query?: string;
  email?: string;
  phone?: string;
  customer?: CustomerLookup;
  ticket?: TicketInput;
  message?: string;
  channelId?: string;
  teamId?: string;
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  propertyId?: string;
  sql?: string;
};

export async function runIntegrationAction(userId: string, providerId: string, input: IntegrationActionInput = {}) {
  if (!userId) {
    throw new Error('Sign in before using integrations.');
  }

  switch (providerId) {
    case 'salesforce':
      return findSalesforceRecord(userId, input);
    case 'zendesk':
      return createZendeskTicket(userId, input);
    case 'notion':
      return searchNotion(userId, input);
    case 'zoom':
      return zoomStatus();
    case 'stripe':
      return findStripeCustomer(userId, input);
    case 'okta':
      return findOktaUser(userId, input);
    case 'google-calendar':
      return getGoogleCalendarFreeBusy(userId, input);
    case 'slack':
      return sendSlackMessage(userId, input);
    case 'microsoft-teams':
      return sendTeamsMessage(userId, input);
    case 'shopify':
      return findShopifyCustomer(userId, input);
    case 'google-analytics':
      return getGoogleAnalyticsSummary(userId, input);
    case 'snowflake':
      return runSnowflakeQuery(input);
    case 'gmail':
      return listGmailMessages(userId, input);
    case 'obsidian':
      return { ok: Boolean(config.obsidianVaultPath), provider: 'obsidian', mode: 'vault', vaultPathConfigured: Boolean(config.obsidianVaultPath) };
    case 'hubspot':
      return { ok: true, provider: 'hubspot', message: 'HubSpot CRM lookup is wired through the CRM adapter.' };
    default:
      throw new Error(`Unknown integration provider: ${providerId}`);
  }
}

async function findSalesforceRecord(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'salesforce');
  const connection = getStoredIntegrationConnection(userId, 'salesforce');
  const baseUrl = connection?.providerAccountId || config.salesforceLoginUrl.replace(/\/$/, '');
  const query = input.email
    ? `SELECT Id,Name,Email,Phone FROM Contact WHERE Email = '${escapeSoql(input.email)}' LIMIT 1`
    : `SELECT Id,Name,Email,Phone FROM Contact LIMIT 1`;
  const url = new URL(`${baseUrl}/services/data/v60.0/query`);
  url.searchParams.set('q', query);
  const payload = await fetchJson(url, { headers: bearer(token) });
  return { ok: true, provider: 'salesforce', records: payload.records || [] };
}

async function createZendeskTicket(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'zendesk');
  const localTicket = input.ticket || {
    title: input.message || 'RelayClarity support request',
    summary: input.message || 'Customer requested support.',
    category: 'support',
    priority: 'normal',
    requiredAction: 'Review and respond.',
    sentiment: 'neutral',
  };
  const payload = await fetchJson(`${zendeskBaseUrl()}/api/v2/tickets.json`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticket: {
        subject: localTicket.title,
        comment: { body: localTicket.summary },
        priority: zendeskPriority(localTicket.priority),
        tags: ['relayclarity', localTicket.category],
      },
    }),
  });
  return { ok: true, provider: 'zendesk', ticket: payload.ticket };
}

async function searchNotion(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'notion');
  const payload = await fetchJson('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({ query: input.query || '', page_size: 5 }),
  });
  return { ok: true, provider: 'notion', results: payload.results || [] };
}

function zoomStatus() {
  return {
    ok: Boolean(config.zoomWebhookSecretToken || config.zoomAccountId || config.zoomVirtualAgentId || config.zoomContactCenterQueueId),
    provider: 'zoom',
    webhookConfigured: Boolean(config.zoomWebhookSecretToken),
    accountIdConfigured: Boolean(config.zoomAccountId),
    virtualAgentIdConfigured: Boolean(config.zoomVirtualAgentId),
    contactCenterQueueIdConfigured: Boolean(config.zoomContactCenterQueueId),
  };
}

async function findStripeCustomer(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'stripe');
  const url = new URL('https://api.stripe.com/v1/customers');
  url.searchParams.set('limit', '5');
  if (input.email) {
    url.searchParams.set('email', input.email);
  }
  const payload = await fetchJson(url, { headers: bearer(token) });
  return { ok: true, provider: 'stripe', customers: payload.data || [] };
}

async function findOktaUser(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'okta');
  const login = input.email || input.query || 'me';
  const payload = login === 'me'
    ? await fetchJson(`${config.oktaIssuerUrl.replace(/\/$/, '')}/v1/userinfo`, { headers: bearer(token) })
    : await fetchJson(`${oktaOrgBaseUrl()}/api/v1/users/${encodeURIComponent(login)}`, { headers: bearer(token) });
  return { ok: true, provider: 'okta', user: payload };
}

async function getGoogleCalendarFreeBusy(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'google-calendar');
  const timeMin = input.timeMin || new Date().toISOString();
  const timeMax = input.timeMax || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const payload = await fetchJson('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: input.calendarId || 'primary' }],
    }),
  });
  return { ok: true, provider: 'google-calendar', freeBusy: payload };
}

async function sendSlackMessage(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'slack');
  if (!input.channelId || !input.message) {
    throw new Error('Slack channelId and message are required.');
  }
  const payload = await fetchJson('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: input.channelId, text: input.message }),
  });
  return { ok: payload.ok === true, provider: 'slack', result: payload };
}

async function sendTeamsMessage(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'microsoft-teams');
  if (!input.teamId || !input.channelId || !input.message) {
    throw new Error('Microsoft Teams teamId, channelId, and message are required.');
  }
  const payload = await fetchJson(`https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(input.teamId)}/channels/${encodeURIComponent(input.channelId)}/messages`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: { content: input.message } }),
  });
  return { ok: true, provider: 'microsoft-teams', message: payload };
}

async function findShopifyCustomer(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'shopify');
  const query = input.email || input.query || '';
  const url = new URL(`${shopifyBaseUrl()}/admin/api/2025-07/customers/search.json`);
  url.searchParams.set('query', query ? `email:${query}` : '');
  const payload = await fetchJson(url, { headers: { 'X-Shopify-Access-Token': token } });
  return { ok: true, provider: 'shopify', customers: payload.customers || [] };
}

async function getGoogleAnalyticsSummary(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'google-analytics');
  if (!input.propertyId) {
    const payload = await fetchJson('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=10', { headers: bearer(token) });
    return { ok: true, provider: 'google-analytics', accountSummaries: payload.accountSummaries || [] };
  }
  const payload = await fetchJson(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(input.propertyId)}:runReport`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    }),
  });
  return { ok: true, provider: 'google-analytics', report: payload };
}

async function runSnowflakeQuery(input: IntegrationActionInput) {
  if (!config.snowflakeAccount || !config.snowflakePat) {
    throw new Error('Snowflake is not configured.');
  }
  const payload = await fetchJson(`https://${config.snowflakeAccount}.snowflakecomputing.com/api/v2/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.snowflakePat}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ statement: input.sql || 'select current_version()' }),
  });
  return { ok: true, provider: 'snowflake', result: payload };
}

async function listGmailMessages(userId: string, input: IntegrationActionInput) {
  const token = requireToken(userId, 'gmail');
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', '5');
  if (input.query) {
    url.searchParams.set('q', input.query);
  }
  const payload = await fetchJson(url, { headers: bearer(token) });
  return { ok: true, provider: 'gmail', messages: payload.messages || [] };
}

export async function createHelpdeskTicket(userId: string, ticket: TicketInput) {
  const token = getIntegrationAccessToken(userId, 'zendesk');
  if (!token) {
    return createTicket(ticket);
  }

  const result = await createZendeskTicket(userId, { ticket });
  return createTicket({
    ...ticket,
    requiredAction: `${ticket.requiredAction} Zendesk ticket: ${result.ticket?.id || 'created'}.`,
  });
}

function requireToken(userId: string, providerId: string) {
  const token = getIntegrationAccessToken(userId, providerId);
  if (!token) {
    throw new Error(`${providerId} is not connected for this user.`);
  }
  return token;
}

async function fetchJson(input: string | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(`Integration request failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload as Record<string, any>;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function zendeskPriority(priority: string) {
  return ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal';
}

function zendeskBaseUrl() {
  return `https://${config.zendeskSubdomain.replace(/^https?:\/\//, '').replace(/\.zendesk\.com\/?$/, '')}.zendesk.com`;
}

function shopifyBaseUrl() {
  const shop = config.shopifyShopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${shop}`;
}

function oktaOrgBaseUrl() {
  return config.oktaIssuerUrl.replace(/\/oauth2\/[^/]+\/?$/, '').replace(/\/$/, '');
}

function escapeSoql(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
