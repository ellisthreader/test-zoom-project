import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runScenarioTest } from './launch-tests.js';

test('runScenarioTest returns a scored, simulated result without an API key', async () => {
  const result = await runScenarioTest({
    scenario: {
      title: 'New caller qualification',
      label: 'Lead capture',
      result: 'Captured contact details, intent, urgency, and next step without overpromising.',
    },
    business: {
      name: 'Northstar Dental',
      type: 'Dental clinic',
      context: 'We offer check-ups and emergency appointments. Opening hours are not published here.',
      capabilities: ['Lead capture'],
      guardrails: ['Do not provide clinical advice', 'Escalate urgent symptoms'],
    },
    agent: { name: 'Reception AI', purpose: 'Book and qualify callers', knowledge: 'Approved FAQ', handoff: 'Escalate urgent cases' },
    connectors: ['crm'],
    voiceReady: true,
    mockAi: true,
  });

  assert.equal(result.mode, 'simulated');
  assert.ok(result.score >= 0 && result.score <= 99);
  assert.equal(result.checks.length, 5);
  assert.equal(typeof result.passed, 'boolean');
  assert.ok(result.transcript.length >= 2, 'should hold a simulated caller/agent exchange');
  assert.ok(result.transcript.some((turn) => turn.role === 'assistant'), 'agent should respond');
  assert.ok(result.metrics.turns >= 1);
});

test('runScenarioTest expects escalation on an escalation scenario', async () => {
  const result = await runScenarioTest({
    scenario: { title: 'Urgent complaint', label: 'Escalation', result: 'Transferred with concise context.' },
    business: { name: 'Harbour Financial', type: 'Financial services', context: 'Support desk.' },
    agent: { name: 'Desk AI', purpose: 'Help callers', knowledge: '', handoff: 'Escalate complaints' },
    mockAi: true,
  });

  assert.ok('escalationHandled' in result.metrics);
  assert.ok(result.checks.some((check) => check.name === 'Handled escalation correctly'));
});

test('runScenarioTest throws without a scenario', async () => {
  await assert.rejects(() => runScenarioTest({} as never), /scenario is required/);
});
