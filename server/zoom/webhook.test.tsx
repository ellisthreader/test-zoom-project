import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZoomUrlValidationResponse,
  handleZoomContactCenterEvent,
  verifyZoomWebhookSignature,
} from './webhook.js';

process.env.ZOOM_WEBHOOK_SECRET_TOKEN ||= 'test_zoom_secret';

test('Zoom URL validation response hashes the plainToken with the webhook secret', () => {
  const response = buildZoomUrlValidationResponse({
    event: 'endpoint.url_validation',
    payload: { plainToken: 'plain-token' },
  });

  const expected = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '').update('plain-token').digest('hex');

  assert.deepEqual(response, {
    plainToken: 'plain-token',
    encryptedToken: expected,
  });
});

test('Zoom webhook signature verification accepts a valid signed raw body', () => {
  const rawBody = JSON.stringify({
    event: 'contact_center.task_created',
    payload: { object: { engagement_id: 'eng_123' } },
  });
  const timestamp = '1760000000';
  const hash = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '').update(`v0:${timestamp}:${rawBody}`).digest('hex');

  const req = {
    rawBody,
    header(name: string) {
      const headers: Record<string, string> = {
        'x-zm-request-timestamp': timestamp,
        'x-zm-signature': `v0=${hash}`,
      };
      return headers[name.toLowerCase()];
    },
  };

  assert.equal(verifyZoomWebhookSignature(req as never), true);
});

test('Zoom Contact Center transcript event creates an AI support ticket', async () => {
  const result = await handleZoomContactCenterEvent(
    {
      event: 'contact_center.engagement_ended',
      payload: {
        object: {
          channel: 'voice',
          caller_number: '+447700900111',
          transcript: [
            { role: 'customer', content: 'My express delivery for order AB123 has not arrived.' },
            { role: 'virtual_agent', content: 'I will create a support ticket.' },
          ],
        },
      },
    },
    { mockAi: true },
  );

  assert.equal(result.type, 'ticket_created');
  assert.ok(result.ticket);
  assert.equal(result.ticket.channel, 'voice');
  assert.equal(result.ticket.customerId, 'cus_001');
});

test('Zoom Contact Center ticket includes risk scoring metadata', async () => {
  const result = await handleZoomContactCenterEvent(
    {
      event: 'contact_center.engagement_ended',
      payload: {
        object: {
          channel: 'voice',
          caller_number: '+447700900111',
          transcript: [
            { role: 'customer', content: 'This is fraud, I am angry, and I want a manager before legal action.' },
            { role: 'virtual_agent', content: 'I will escalate this to the support team.' },
          ],
        },
      },
    },
    { mockAi: true },
  );

  assert.equal(result.type, 'ticket_created');
  assert.ok(result.ticket);
  assert.equal(result.ticket.riskLevel, 'high');
  assert.ok(typeof result.ticket.riskScore === 'number' && result.ticket.riskScore >= 75);
  assert.equal(result.ticket.humanReviewRequired, true);
  assert.ok(result.ticket.riskSignals?.some((signal) => /zoom|contact center|voice/i.test(`${signal.label} ${signal.value}`)));
  assert.ok(result.ticket.riskReasons?.some((reason) => /fraud|legal|manager|angry|escalat/i.test(`${reason.factor} ${reason.impact}`)));
});
