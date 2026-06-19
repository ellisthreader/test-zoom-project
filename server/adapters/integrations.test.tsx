import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectIntegration, listIntegrationProviders, testIntegration } from './integrations.js';

test('integration catalog includes HubSpot and Notion with logo metadata', () => {
  const providers = listIntegrationProviders();
  const hubspot = providers.find((provider) => provider.id === 'hubspot');
  const notion = providers.find((provider) => provider.id === 'notion');
  const slack = providers.find((provider) => provider.id === 'slack');
  const stripe = providers.find((provider) => provider.id === 'stripe');

  assert.equal(hubspot?.name, 'HubSpot');
  assert.equal(hubspot?.category, 'crm');
  assert.match(hubspot?.logoUrl || '', /hubspot/);
  assert.equal(notion?.name, 'Notion');
  assert.equal(notion?.category, 'knowledge');
  assert.match(notion?.logoUrl || '', /notion/);
  assert.equal(slack?.authType, 'oauth');
  assert.equal(stripe?.authType, 'oauth');
});

test('connectIntegration refuses to fake a sandbox connection without real authorization support', async () => {
  assert.throws(
    () => connectIntegration({ providerId: 'salesforce', category: 'crm', workspaceName: 'Northstar Dental' }),
    /Configure a real OAuth app/
  );
  const check = await testIntegration('salesforce');

  assert.equal(check.ok, false);
  assert.equal(check.checks[0]?.status, 'missing');
});

test('connectIntegration does not fall back from an unsupported requested provider to a category provider', () => {
  assert.throws(
    () => connectIntegration({ providerId: 'crm', providerName: 'Pabau', category: 'crm' }),
    /Pabau does not have a real integration connector implemented yet/
  );
});

test('Slack and Stripe refuse to link until OAuth credentials are configured', () => {
  assert.throws(
    () => connectIntegration({ providerId: 'slack', category: 'messaging' }),
    /Slack is not connected yet/
  );
  assert.throws(
    () => connectIntegration({ providerId: 'stripe', category: 'billing' }),
    /Stripe is not connected yet/
  );
});
