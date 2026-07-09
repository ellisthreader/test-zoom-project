import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.js';
import { findCustomer } from './crm.js';
import { connectIntegration, finalizeOAuthConnection, listIntegrationProviders, testIntegration } from './integrations.js';

const testUserId = 'test-user-integrations';

test('integration catalog includes HubSpot, Obsidian, and Notion with logo metadata', () => {
  const providers = listIntegrationProviders();
  const hubspot = providers.find((provider) => provider.id === 'hubspot');
  const obsidian = providers.find((provider) => provider.id === 'obsidian');
  const notion = providers.find((provider) => provider.id === 'notion');
  const slack = providers.find((provider) => provider.id === 'slack');
  const stripe = providers.find((provider) => provider.id === 'stripe');

  assert.equal(hubspot?.name, 'HubSpot');
  assert.equal(hubspot?.category, 'crm');
  assert.match(hubspot?.logoUrl || '', /hubspot/);
  assert.equal(obsidian?.name, 'Obsidian');
  assert.equal(obsidian?.category, 'knowledge');
  assert.match(obsidian?.logoUrl || '', /obsidian/);
  assert.equal(notion?.name, 'Notion');
  assert.equal(notion?.category, 'knowledge');
  assert.match(notion?.logoUrl || '', /notion/);
  assert.equal(slack?.authType, 'oauth');
  assert.equal(stripe?.authType, 'oauth');
});

test('connectIntegration refuses to fake a sandbox connection without real authorization support', async () => {
  assert.throws(
    () => connectIntegration({ providerId: 'salesforce', category: 'crm', workspaceName: 'Northstar Dental' }, testUserId),
    /Configure a real OAuth app/
  );
  const check = await testIntegration('salesforce', testUserId);

  assert.equal(check.ok, false);
  assert.equal(check.checks[0]?.status, 'missing');
});

test('connectIntegration does not fall back from an unsupported requested provider to a category provider', () => {
  assert.throws(
    () => connectIntegration({ providerId: 'crm', providerName: 'Pabau', category: 'crm' }, testUserId),
    /Pabau does not have a real integration connector implemented yet/
  );
});

test('Slack and Stripe refuse to link until OAuth credentials are configured', () => {
  const previous = {
    slackClientId: config.slackClientId,
    slackClientSecret: config.slackClientSecret,
    stripeClientId: config.stripeClientId,
    stripeSecretKey: config.stripeSecretKey,
  };

  config.slackClientId = '';
  config.slackClientSecret = '';
  config.stripeClientId = '';
  config.stripeSecretKey = '';

  assert.throws(
    () => connectIntegration({ providerId: 'slack', category: 'messaging' }, testUserId),
    /Slack is not connected yet/
  );
  assert.throws(
    () => connectIntegration({ providerId: 'stripe', category: 'billing' }, testUserId),
    /Stripe is not connected yet/
  );

  config.slackClientId = previous.slackClientId;
  config.slackClientSecret = previous.slackClientSecret;
  config.stripeClientId = previous.stripeClientId;
  config.stripeSecretKey = previous.stripeSecretKey;
});

test('all OAuth catalog providers can build real authorization URLs when configured', () => {
  const previous = snapshotIntegrationConfig();
  const userId = `test-oauth-url-user-${Date.now()}`;

  Object.assign(config, {
    hubspotClientId: 'hubspot-client',
    hubspotClientSecret: 'hubspot-secret',
    salesforceClientId: 'salesforce-client',
    salesforceClientSecret: 'salesforce-secret',
    salesforceLoginUrl: 'https://login.salesforce.com',
    notionClientId: 'notion-client',
    notionClientSecret: 'notion-secret',
    zendeskClientId: 'zendesk-client',
    zendeskClientSecret: 'zendesk-secret',
    zendeskSubdomain: 'relayclarity-test',
    slackClientId: 'slack-client',
    slackClientSecret: 'slack-secret',
    stripeClientId: 'stripe-client',
    stripeSecretKey: 'sk_test',
    oktaClientId: 'okta-client',
    oktaClientSecret: 'okta-secret',
    oktaIssuerUrl: 'https://example.okta.com/oauth2/default',
    microsoftClientId: 'microsoft-client',
    microsoftClientSecret: 'microsoft-secret',
    microsoftTenantId: 'common',
    shopifyClientId: 'shopify-client',
    shopifyClientSecret: 'shopify-secret',
    shopifyShopDomain: 'relayclarity-test.myshopify.com',
    googleIntegrationClientId: 'google-client',
    googleIntegrationClientSecret: 'google-secret',
  });

  try {
    const expectedHosts: Record<string, string> = {
      hubspot: 'app.hubspot.com',
      salesforce: 'login.salesforce.com',
      notion: 'api.notion.com',
      zendesk: 'relayclarity-test.zendesk.com',
      slack: 'slack.com',
      stripe: 'connect.stripe.com',
      okta: 'example.okta.com',
      'microsoft-teams': 'login.microsoftonline.com',
      shopify: 'relayclarity-test.myshopify.com',
      'google-calendar': 'accounts.google.com',
      'google-analytics': 'accounts.google.com',
      gmail: 'accounts.google.com',
    };

    for (const [providerId, host] of Object.entries(expectedHosts)) {
      const connection = connectIntegration({ providerId }, userId);
      const authUrl = new URL(connection.authUrl || '');
      assert.equal(authUrl.hostname, host);
      assert.ok(authUrl.searchParams.get('state'));
      assert.equal(connection.status, 'oauth_redirect');
    }
  } finally {
    Object.assign(config, previous);
  }
});

test('server configured providers can report ready without OAuth', async () => {
  const previous = snapshotIntegrationConfig();
  Object.assign(config, {
    obsidianVaultPath: 'C:\\RelayClarity\\Vault',
    zoomWebhookSecretToken: 'zoom-secret',
    snowflakeAccount: 'relayclarity-test',
    snowflakePat: 'snowflake-pat',
  });

  try {
    assert.equal((await testIntegration('obsidian', testUserId)).ok, true);
    assert.equal((await testIntegration('zoom', testUserId)).ok, true);
    assert.equal((await testIntegration('snowflake', testUserId)).ok, true);
  } finally {
    Object.assign(config, previous);
  }
});

test('HubSpot OAuth connection can feed live CRM customer lookup', async () => {
  const userId = `test-hubspot-user-${Date.now()}`;
  const previousHubSpot = {
    clientId: config.hubspotClientId,
    clientSecret: config.hubspotClientSecret,
    redirectUri: config.hubspotRedirectUri,
  };
  const originalFetch = globalThis.fetch;

  config.hubspotClientId = 'test-client-id';
  config.hubspotClientSecret = 'test-client-secret';
  config.hubspotRedirectUri = 'http://127.0.0.1:8787/api/integrations/oauth/hubspot/callback';

  try {
    const pendingConnection = connectIntegration({ providerId: 'hubspot', category: 'crm', workspaceName: 'Live CRM' }, userId);
    const state = new URL(pendingConnection.authUrl || '').searchParams.get('state') || '';

    globalThis.fetch = async (input, init) => {
      const url = String(input);

      if (url === 'https://api.hubapi.com/oauth/v1/token') {
        return jsonResponse({ access_token: 'hubspot-access-token', token_type: 'bearer' });
      }

      if (url.startsWith('https://api.hubapi.com/crm/v3/objects/contacts?limit=1')) {
        assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, 'Bearer hubspot-access-token');
        return jsonResponse({ results: [] });
      }

      if (url === 'https://api.hubapi.com/crm/v3/objects/contacts/search') {
        const body = JSON.parse(String(init?.body || '{}'));
        assert.equal(body.filterGroups[0].filters[0].propertyName, 'email');
        assert.equal(body.filterGroups[0].filters[0].value, 'live@example.com');
        return jsonResponse({
          results: [{
            id: '12345',
            properties: {
              firstname: 'Live',
              lastname: 'Customer',
              email: 'live@example.com',
              phone: '+447700900333',
              lifecyclestage: 'customer',
            },
          }],
        });
      }

      throw new Error(`Unexpected fetch in HubSpot CRM test: ${url}`);
    };

    await finalizeOAuthConnection('hubspot', 'test-code', state);
    const customer = await findCustomer({ email: 'live@example.com' }, { userId });

    assert.equal(customer?.id, 'hubspot:12345');
    assert.equal(customer?.name, 'Live Customer');
    assert.equal(customer?.email, 'live@example.com');
    assert.equal(customer?.tier, 'customer');
  } finally {
    globalThis.fetch = originalFetch;
    config.hubspotClientId = previousHubSpot.clientId;
    config.hubspotClientSecret = previousHubSpot.clientSecret;
    config.hubspotRedirectUri = previousHubSpot.redirectUri;
  }
});

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function snapshotIntegrationConfig() {
  return {
    hubspotClientId: config.hubspotClientId,
    hubspotClientSecret: config.hubspotClientSecret,
    salesforceClientId: config.salesforceClientId,
    salesforceClientSecret: config.salesforceClientSecret,
    salesforceLoginUrl: config.salesforceLoginUrl,
    notionClientId: config.notionClientId,
    notionClientSecret: config.notionClientSecret,
    zendeskClientId: config.zendeskClientId,
    zendeskClientSecret: config.zendeskClientSecret,
    zendeskSubdomain: config.zendeskSubdomain,
    slackClientId: config.slackClientId,
    slackClientSecret: config.slackClientSecret,
    stripeClientId: config.stripeClientId,
    stripeSecretKey: config.stripeSecretKey,
    oktaClientId: config.oktaClientId,
    oktaClientSecret: config.oktaClientSecret,
    oktaIssuerUrl: config.oktaIssuerUrl,
    microsoftClientId: config.microsoftClientId,
    microsoftClientSecret: config.microsoftClientSecret,
    microsoftTenantId: config.microsoftTenantId,
    shopifyClientId: config.shopifyClientId,
    shopifyClientSecret: config.shopifyClientSecret,
    shopifyShopDomain: config.shopifyShopDomain,
    googleIntegrationClientId: config.googleIntegrationClientId,
    googleIntegrationClientSecret: config.googleIntegrationClientSecret,
    obsidianVaultPath: config.obsidianVaultPath,
    zoomWebhookSecretToken: config.zoomWebhookSecretToken,
    snowflakeAccount: config.snowflakeAccount,
    snowflakePat: config.snowflakePat,
  };
}
