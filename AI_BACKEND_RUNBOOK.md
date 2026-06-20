# RelayClarity AI Backend Runbook

This backend is the working foundation for the AI systems behind RelayClarity. It
does not depend on the dashboard or front-end.

## What It Does

- Runs customer-service AI turns for chat or voice channels.
- Searches the approved knowledge base before replying.
- Looks up customers through a CRM adapter.
- Creates structured support tickets through a helpdesk adapter.
- Generates operations plans from plain-English builder instructions.
- Exposes a realtime voice session endpoint for OpenAI Realtime integration.
- Exposes an ElevenLabs speech endpoint for high-quality TTS experiments.
- Exposes Zoom Contact Center webhook handling for Virtual Agent deployment
  events, transcript ingestion, and AI ticket creation.
- Keeps Twilio-compatible voice webhooks only as a legacy local prototype.

## Run Locally

```bash
npm install
cp .env.example .env
npm run server
```

The API starts on:

```text
http://127.0.0.1:8787
```

Without `OPENAI_API_KEY`, the backend uses deterministic mock behavior so the
workflow can still be tested end to end.

## Environment

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-nano
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=alloy
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL=eleven_flash_v2_5
ZOOM_WEBHOOK_SECRET_TOKEN=your_zoom_webhook_secret
ZOOM_ACCOUNT_ID=optional_zoom_account_id
ZOOM_VIRTUAL_AGENT_ID=optional_virtual_agent_id
ZOOM_CONTACT_CENTER_QUEUE_ID=optional_contact_center_queue_id
TWILIO_ACCOUNT_SID=optional_twilio_account_sid_for_test_calls
TWILIO_AUTH_TOKEN=optional_twilio_auth_token_for_test_calls
TWILIO_FROM_NUMBER=optional_verified_twilio_from_number
PUBLIC_BASE_URL=optional_public_https_url_for_twilio_to_fetch_elevenlabs_audio
PORT=8787
ALLOWED_ORIGIN=http://127.0.0.1:5173,http://127.0.0.1:5174
```

## Key Endpoints

### Health

```http
GET /api/health
```

### Provider Status

```http
GET /api/providers/status
```

Shows which AI, voice, telephony, and adapter providers are configured without
exposing API keys.

### Zoom Contact Center / Virtual Agent Webhook

```http
POST /api/zoom/contact-center/events
```

Use this as the Event Notification Endpoint URL for a Zoom Marketplace webhook
subscription connected to Zoom Contact Center events.

The endpoint supports:

- Zoom `endpoint.url_validation` challenge response.
- Zoom webhook HMAC signature verification.
- Contact Center event ingestion.
- Transcript/message extraction from Zoom event payloads.
- AI support ticket creation from Zoom Virtual Agent or Contact Center
  conversation content.

For local testing with Zoom, expose the server with a public HTTPS tunnel:

```bash
npm run server
ngrok http 8787
```

Then configure the Zoom webhook endpoint as:

```text
https://YOUR-NGROK-DOMAIN/api/zoom/contact-center/events
```

In the Zoom app configuration, copy the webhook Secret Token into:

```bash
ZOOM_WEBHOOK_SECRET_TOKEN=...
```

Subscribe to the Contact Center events that are available in your Zoom account,
especially engagement/task events that include conversation, transcript, summary,
or customer metadata.

### Chat or Voice AI Turn

```http
POST /api/ai/chat
Content-Type: application/json

{
  "channel": "chat",
  "customer": { "email": "amelia@example.com" },
  "message": "My express delivery has not arrived."
}
```

Returns the AI reply, matched knowledge-base snippets, intent, escalation flag,
missing fields, and a ticket if enough information is available.

### Ticket Creation from Conversation

```http
POST /api/ai/tickets/from-conversation
Content-Type: application/json

{
  "channel": "voice",
  "customer": { "phone": "+447700900111" },
  "transcript": [
    { "role": "customer", "content": "My express delivery for order AB123 has not arrived." }
  ]
}
```

### AI Builder

```http
POST /api/ai/builder
Content-Type: application/json

{
  "instruction": "Create a refund workflow that asks for order number and escalates angry customers."
}
```

Returns a configuration plan with intents, knowledge-base updates, escalation
rules, and test scenarios.

### Realtime Voice Session

```http
POST /api/realtime/session
```

When `OPENAI_API_KEY` is set, this mints a short-lived Realtime client secret
for a voice client. Without a key, it returns a mock setup message.

### ElevenLabs Speech

```http
POST /api/voice/speech
Content-Type: application/json

{
  "text": "Thanks for calling. I can help create a ticket or answer a question."
}
```

When `ELEVENLABS_API_KEY` is set, this returns MP3 audio as base64. Without a
key, it returns mock metadata so the provider path can be tested.

### Telephony Webhooks

```http
POST /api/telephony/inbound
POST /api/telephony/transcript
```

These return TwiML-style XML for a legacy phone prototype. For the Zoom-aligned
deployment path, use `/api/zoom/contact-center/events`.

### Outbound Demo Call

```http
POST /api/telephony/outbound-demo
Content-Type: application/json

{
  "to": "+441624000000",
  "businessName": "Northstar Dental",
  "greeting": "Thanks for calling Northstar Dental. I can help with bookings today.",
  "callerNeed": "I need an emergency appointment today",
  "approvedAnswer": "Offer same-day triage and transfer urgent cases to reception.",
  "handoff": "Transfer urgent callers",
  "reference": "northstardental.co.uk/book"
}
```

This endpoint places a real outbound test call only when
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set.
Without those credentials it returns mock/setup status so the UI does not
pretend a call was placed.

## Low-Cost OpenAI Model

The backend reads `OPENAI_API_KEY` and `OPENAI_MODEL` from the environment. For
now the configured low-cost default is `gpt-5.4-nano`. Set `OPENAI_MODEL` only
when you want to override that default.

When `ELEVENLABS_API_KEY` and a public HTTPS `PUBLIC_BASE_URL` are set, the
outbound call generates an ElevenLabs MP3, stores it briefly in memory, and
returns TwiML with `<Play>` so Twilio plays the ElevenLabs voice. `PUBLIC_BASE_URL`
must point to this backend, for example an ngrok or deployed URL, because Twilio
cannot fetch `localhost`. If ElevenLabs is configured but the public URL is
missing, the call falls back to Twilio's neural `<Say>` voice instead of failing.

## Where Real Providers Plug In

- CRM lookup: `server/adapters/crm.js`
- Helpdesk ticket creation: `server/adapters/helpdesk.js`
- Knowledge search: `server/adapters/kb.js`
- AI orchestration: `server/ai/orchestrator.js`
- OpenAI and Realtime integration: `server/ai/client.js`
- ElevenLabs TTS: `server/voice/elevenlabs.js`
- Zoom Contact Center webhook adapter: `server/zoom/webhook.js`

Replace the mock adapters with HubSpot, Salesforce, Zendesk, Freshdesk, Twilio,
Zoom Phone, or internal APIs without changing the route contract.

## Tests

```bash
npm test
```

The current tests cover:

- Chat AI detecting a delivery issue and asking for a missing order number.
- Ticket creation from a voice transcript.
- Builder instructions becoming deployable AI configuration work.
