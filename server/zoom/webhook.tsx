import crypto from 'node:crypto';
import type { Request } from 'express';
import { config, hasZoomWebhookSecret } from '../config.js';
import { createTicketFromConversation } from '../ai/orchestrator.js';
import type { CustomerLookup, TranscriptTurn, ZoomWebhookEvent } from '../types.js';

type RawBodyRequest = Request & {
  rawBody?: string;
};

export function buildZoomUrlValidationResponse(event: ZoomWebhookEvent) {
  const plainToken = event.payload?.plainToken;
  const secret = getZoomWebhookSecret();
  if (!plainToken) throw new Error('Zoom validation plainToken is required');
  if (!secret) throw new Error('ZOOM_WEBHOOK_SECRET_TOKEN is required');

  return {
    plainToken,
    encryptedToken: crypto.createHmac('sha256', secret).update(plainToken).digest('hex'),
  };
}

export function verifyZoomWebhookSignature(req: RawBodyRequest): boolean {
  const secret = getZoomWebhookSecret();
  if (!secret) return false;

  const timestamp = req.header('x-zm-request-timestamp');
  const signature = req.header('x-zm-signature');
  const rawBody = req.rawBody;

  if (!timestamp || !signature || !rawBody) return false;

  const message = `v0:${timestamp}:${rawBody}`;
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const expected = `v0=${hash}`;

  return timingSafeEqual(signature, expected);
}

export async function handleZoomContactCenterEvent(event: ZoomWebhookEvent, options: { mockAi?: boolean } = {}) {
  if (event.event === 'endpoint.url_validation') {
    return {
      type: 'validation',
      response: buildZoomUrlValidationResponse(event),
    };
  }

  const object = event.payload?.object || {};
  const transcript = extractTranscript(event, object);

  if (!transcript.length) {
    return {
      type: 'stored_event',
      event: event.event,
      message: 'Zoom event received. No transcript or customer utterance found, so no AI ticket was created.',
    };
  }

  const ticket = await createTicketFromConversation({
    channel: extractChannel(object),
    customer: extractCustomer(object),
    transcript,
    mockAi: options.mockAi,
  });

  return {
    type: 'ticket_created',
    event: event.event,
    ticket,
  };
}

function getZoomWebhookSecret(): string {
  return process.env.ZOOM_WEBHOOK_SECRET_TOKEN || config.zoomWebhookSecretToken;
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function extractChannel(object: Record<string, unknown>): string {
  const channel = getString(object, ['channel', 'channel_type', 'media_type']);
  return channel || 'zoom_contact_center';
}

function extractCustomer(object: Record<string, unknown>): CustomerLookup {
  return {
    phone: getString(object, ['from', 'from_number', 'caller_number', 'phone', 'ani']),
    email: getString(object, ['email', 'customer_email', 'consumer_email']),
    customerId: getString(object, ['customer_id', 'consumer_id', 'contact_id']),
  };
}

function extractTranscript(event: ZoomWebhookEvent, object: Record<string, unknown>): TranscriptTurn[] {
  const directTranscript = object.transcript || object.transcripts || object.messages || object.conversation;
  if (Array.isArray(directTranscript)) {
    return directTranscript
      .map((turn) => normalizeTranscriptTurn(turn))
      .filter((turn): turn is TranscriptTurn => Boolean(turn?.content || turn?.text));
  }

  const text = getString(object, [
    'transcript',
    'summary',
    'description',
    'message',
    'text',
    'customer_message',
    'consumer_message',
    'subject',
  ]);

  if (text) return [{ role: 'customer', content: text }];

  const engagementId = getString(object, ['engagement_id', 'engagementId', 'id']);
  if (engagementId && /task_created|engagement/i.test(event.event)) {
    return [{ role: 'system', content: `Zoom Contact Center event ${event.event} received for engagement ${engagementId}.` }];
  }

  return [];
}

function normalizeTranscriptTurn(value: unknown): TranscriptTurn | null {
  if (typeof value === 'string') return { role: 'speaker', content: value };
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  return {
    role: getString(item, ['role', 'speaker', 'sender', 'from']) || 'speaker',
    content: getString(item, ['content', 'text', 'message', 'body', 'utterance']),
  };
}

function getString(object: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}
