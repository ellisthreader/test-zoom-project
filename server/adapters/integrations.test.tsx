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

test('connectIntegration creates a sandbox connection when real authorization is not configured', async () => {
  const connection = connectIntegration({ providerId: 'salesforce', category: 'crm', workspaceName: 'Northstar Dental' });

  assert.equal(connection.providerId, 'salesforce');
  assert.equal(connection.status, 'connected');
  assert.equal(connection.mode, 'sandbox');

  const check = await testIntegration('salesforce');

  assert.equal(check.ok, true);
  assert.equal(check.checks[0]?.status, 'passed');
});

test('connectIntegration supports custom sandbox providers from the walkthrough', async () => {
  const connection = connectIntegration({ providerId: 'pabau', providerName: 'Pabau', category: 'crm' });

  assert.equal(connection.providerId, 'pabau');
  assert.equal(connection.name, 'Pabau');
  assert.equal(connection.mode, 'sandbox');

  const check = await testIntegration('pabau');
  assert.equal(check.ok, true);
});

test('Slack and Stripe use sandbox links until OAuth credentials are configured', () => {
  assert.equal(connectIntegration({ providerId: 'slack', category: 'messaging' }).mode, 'sandbox');
  assert.equal(connectIntegration({ providerId: 'stripe', category: 'billing' }).mode, 'sandbox');
});
