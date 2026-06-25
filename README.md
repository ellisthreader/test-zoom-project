# RelayClarity

RelayClarity is a focused product showcase for a voice agent deployment platform.
It presents the software as a real B2B tool for moving AI voice agents from
pilot to production with evidence.

## Stack

- React and TypeScript frontend on Vite.
- TypeScript Express backend for AI orchestration, tickets, realtime session
  setup, voice synthesis, and telephony webhooks.
- Mockable CRM, helpdesk, and knowledge-base adapters.
- A Python (scikit-learn) machine-learning pipeline for case-risk scoring,
  served natively from the TypeScript API.

## Machine Learning: Case-Risk Model

RelayClarity trains a real, governed ML model that scores each case/call as
`low`, `medium`, or `high` risk to prioritise human review.

- **Train (Python):** `npm run ml:pipeline` generates synthetic data, fits a
  multinomial logistic regression, evaluates it (accuracy, macro-F1, high-risk
  recall, confusion matrix, fairness slices), and enforces a deployment gate.
- **Serve (TypeScript):** training exports a portable JSON artifact
  (`ml/artifacts/risk_model.json`) that `server/ai/risk-model.tsx` loads and runs
  natively — no Python needed at runtime. The deterministic heuristic in
  `server/ai/risk-scoring.tsx` is the automatic fallback when no artifact exists.
- **Govern:** model card (`docs/model-card.md`), responsible-AI / DPIA-lite
  (`docs/responsible-ai.md`), drift monitoring, and a human-override feedback
  loop.

Endpoints: `POST /api/risk/score`, `GET /api/risk/model`,
`POST /api/risk/feedback`, `GET /api/monitoring/drift-report`,
`GET /api/monitoring/feedback-report`. See `ml/README.md`.

### Production ML (Azure-ready)

A trained, **calibrated** logistic-regression risk model (accuracy 0.8042,
high-risk recall 0.8541, ECE 0.0167 via temperature scaling) exported to a single
JSON artifact and served from one source of truth:

- **Deploy** via the FastAPI scoring service (`serving/`, containerised for AKS)
  or an **Azure ML managed online endpoint** (`azure/`, blue/green rollback) —
  both reuse the same `ml/infer.py` as the in-app TypeScript scorer.
- **Monitor** drift (PSI), live fairness (`customerTier`/`channel` disparity),
  and the human-feedback/override loop via `/api/monitoring/*`.
- **Retrain** from human feedback with promotion gates (no recall/fairness
  regression) — `ml/retrain_from_feedback.py`, dry-run by default.
- **Parity-tested** (`server/ai/parity.test.tsx`) so Python and TypeScript
  scorers cannot drift apart.

Governance: [`docs/model-card.md`](docs/model-card.md),
[`docs/responsible-ai.md`](docs/responsible-ai.md),
[`docs/dpia.md`](docs/dpia.md),
[`docs/incident-runbook.md`](docs/incident-runbook.md).

## Product Workflow

- Customer workspace setup for goals, channels, guardrails, and launch criteria.
- Enterprise integration mapping for CRM, telephony, knowledge, and helpdesk systems.
- Voice tuning controls for provider selection, response-start latency, and barge-in behavior.
- Evaluation suite with scripted and adversarial scenarios.
- Deployment insights that turn field gaps into reusable platform improvements.
- Pilot-to-production handoff report generation.

## Brand Direction

The RelayClarity brand uses a clean graphite, white, blue, teal, and slate
system. The logo is stored at `assets/relayclarity-logo.svg` and avoids generic
AI visual tropes such as heavy purple gradients or decorative blobs.

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
