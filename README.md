# ChatoraAi

ChatoraAi is a focused product showcase for a voice agent deployment platform.
It presents the software as a real B2B tool for moving AI voice agents from
pilot to production with evidence.

## Stack

- React and TypeScript frontend on Vite.
- TypeScript Express backend for AI orchestration, tickets, realtime session
  setup, voice synthesis, and telephony webhooks.
- Mockable CRM, helpdesk, and knowledge-base adapters.

## Product Workflow

- Customer workspace setup for goals, channels, guardrails, and launch criteria.
- Enterprise integration mapping for CRM, telephony, knowledge, and helpdesk systems.
- Voice tuning controls for provider selection, response-start latency, and barge-in behavior.
- Evaluation suite with scripted and adversarial scenarios.
- Deployment insights that turn field gaps into reusable platform improvements.
- Pilot-to-production handoff report generation.

## Brand Direction

The ChatoraAi brand uses a clean navy, blue, cyan, and white system. The logo is
stored at `assets/chatoraai-logo.svg` and avoids generic AI visual tropes such
as heavy purple gradients or decorative blobs.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. The TypeScript app is served from `/`.

To run the backend:

```bash
npm run server
```

## ElevenLabs Phone Voice

Outbound demo calls use Twilio for the phone call. When `ELEVENLABS_API_KEY`
and a public HTTPS `PUBLIC_BASE_URL` are configured, the backend generates the
spoken audio with ElevenLabs and Twilio plays it with `<Play>`. For local demos,
set `PUBLIC_BASE_URL` to a tunnel that points at the backend, such as an ngrok
URL. Without a public URL, calls fall back to Twilio's neural `<Say>` voice.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```
