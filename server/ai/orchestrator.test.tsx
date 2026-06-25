import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentPlan, createTicketFromConversation, runCustomerTurn } from './orchestrator.js';
import { runWorkspaceAssistant } from './workspace.js';

test('chat turn asks for missing order number before ticket creation', async () => {
  const result = await runCustomerTurn({
    channel: 'chat',
    customer: { email: 'amelia@example.com' },
    message: 'My express delivery has not arrived.',
    mockAi: true,
  });

  assert.equal(result.intent, 'delivery');
  assert.equal(result.needsTicket, true);
  assert.deepEqual(result.missingFields, ['order_number']);
  assert.equal(result.ticket, null);
});

test('ticket extraction creates a high-priority delivery ticket', async () => {
  const ticket = await createTicketFromConversation({
    channel: 'voice',
    customer: { phone: '+447700900111' },
    transcript: [
      { role: 'customer', content: 'My express delivery for order AB123 has not arrived.' },
      { role: 'assistant', content: 'I will log that for logistics support.' },
    ],
    mockAi: true,
  });

  assert.equal(ticket.channel, 'voice');
  assert.equal(ticket.category, 'delivery');
  assert.equal(ticket.priority, 'high');
  assert.equal(ticket.customerId, 'cus_001');
});

test('ticket extraction attaches risk scoring metadata for human-review cases', async () => {
  const ticket = await createTicketFromConversation({
    channel: 'voice',
    customer: { phone: '+447700900111' },
    transcript: [
      { role: 'customer', content: 'This chargeback is fraud and I want a manager before I take legal action.' },
      { role: 'assistant', content: 'I will route this to the team for urgent review.' },
    ],
    mockAi: true,
  });

  assert.equal(ticket.priority, 'urgent');
  assert.equal(ticket.escalate, true);
  assert.equal(ticket.riskLevel, 'high');
  assert.ok(typeof ticket.riskScore === 'number' && ticket.riskScore >= 75);
  assert.equal(ticket.humanReviewRequired, true);
  assert.ok(ticket.riskReasons?.some((reason) => /fraud|legal|urgent|escalat/i.test(`${reason.factor} ${reason.impact}`)));
  assert.ok(ticket.riskFeatureAttributions?.some((feature) => feature.direction === 'raises_risk' && feature.value > 0));
  assert.equal(ticket.riskClassProbabilities?.high && ticket.riskClassProbabilities.high > ticket.riskClassProbabilities.low, true);
  assert.match(ticket.riskModelVersion || '', /risk.*\d+\.\d+\.\d+/);
});

test('builder turns an operations request into deployable AI configuration work', async () => {
  const plan = await buildAgentPlan({
    instruction: 'Create a refund workflow that asks for order number and escalates angry customers.',
    mockAi: true,
  });

  assert.ok(plan.summary.includes('refund'));
  assert.ok(plan.knowledgeBaseUpdates.length > 0);
  assert.ok(plan.escalationRules.length > 0);
});

test('ticket category is normalized into a stable identifier', async () => {
  const ticket = await createTicketFromConversation({
    channel: 'chat',
    customer: { email: 'amelia@example.com' },
    transcript: 'Customer has a delivery issue.',
    mockAi: true,
  });

  assert.match(ticket.category, /^[a-z0-9_]+$/);
});

test('workspace assistant cleans metrics and returns chart-ready data', async () => {
  const result = await runWorkspaceAssistant({
    message: 'Show me today metrics and handoffs.',
    project: { id: 'northstar', name: 'Northstar Dental' },
    metrics: {
      callsHandled: 10.4,
      activeCalls: 2,
      containedCalls: 8,
      handoffs: 2,
      openRisks: 1,
      p95LatencyMs: 1288,
      citationCoverage: 91,
      policyViolations: 0,
      hourlyVolume: [1, 2, 3, 4, 5, 6, 7, 8, 999],
    },
    mockAi: true,
  });

  assert.equal(result.mode, 'mock');
  assert.equal(result.metrics.callsHandled, 10);
  assert.equal(result.metrics.containmentRate, 80);
  assert.equal(result.metrics.latencySeconds, 1.3);
  assert.deepEqual(result.charts.map((chart) => chart.id), ['hourly-volume', 'outcome-mix', 'handoff-reasons', 'knowledge-quality']);
  assert.equal(result.charts[0].id, 'hourly-volume');
  assert.equal(result.charts[0].data.length, 8);
  assert.equal(result.charts[0].data[7].value, 8);
});
