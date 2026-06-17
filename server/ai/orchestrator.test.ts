import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentPlan, createTicketFromConversation, runCustomerTurn } from './orchestrator.js';

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
