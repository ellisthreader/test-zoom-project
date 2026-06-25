# RelayClarity Implementation Plan

## Objective

Rebrand the project as **RelayClarity**, a real B2B software product for deploying
production voice AI agents. The experience should show the software workflow
clearly and avoid looking like a generic AI landing page.

## Brand Direction

RelayClarity should feel credible, operational, and enterprise-ready.

- Brand name: `RelayClarity`
- Product category: voice agent deployment platform
- Palette: graphite, white, slate, blue, teal, green, amber, and red
- Avoid: heavy purple gradients, decorative AI blobs, vague AI imagery, and
  overdesigned futuristic effects
- Logo: `assets/relayclarity-logo.svg`
- Logo concept: routing mark, voice signal, and clean wordmark

## Product Workflow

The site is organized around the RelayClarity workflow:

1. **Customer workspace setup**
   Capture the customer, use case, launch goals, channels, and guardrails.

2. **Enterprise integration map**
   Show the production systems the agent needs: CRM, telephony, knowledge base,
   and helpdesk.

3. **Voice tuning lab**
   Configure provider, response-start latency, and barge-in behavior.

4. **Evaluation suite**
   Run scripted and adversarial scenarios with transcripts, tool traces, and
   evaluation gates.

5. **Deployment insights**
   Capture field gaps and convert them into reusable deployment intelligence.

6. **Pilot-to-production handoff**
   Generate the operational report needed for launch ownership.

## Current Implementation

- React and TypeScript Vite app.
- Customer-first setup dashboard for configuring a production voice agent.
- SVG logo asset.
- Workspace setup, connector setup, agent builder, voice lab, evaluation, and
  handoff sections.
- Interactive connector state, readiness scoring, voice controls, evaluation
  scenarios, and launch-pack generation.
- TypeScript Express AI backend foundation with chat, ticket extraction, builder,
  realtime session, and telephony webhook endpoints.
- Mockable CRM, helpdesk, and knowledge-base adapters.
- OpenAI Responses integration with deterministic fallback behavior when no API
  key is configured.
- Focused backend tests for chat field collection, ticket extraction, and AI
  builder planning.
- Zoom Contact Center webhook adapter for Virtual Agent deployment events,
  URL validation, signature verification, transcript ingestion, and AI ticket
  creation.

## Production Expansion

The next engineering build should add:

1. Shared TypeScript models for workspaces, scenarios, tool calls, evaluations,
   and reports.
2. Production adapters:
   - `/crm/customer`
   - `/billing/invoices`
   - `/kb/search`
   - `/helpdesk/tickets`
   - `/telephony/events`
   - `/eval/run`
3. Scenario definitions in JSON or YAML.
4. Structured event logs for latency, retries, policy decisions, citations, and
   failure class.
5. Exportable handoff packs as Markdown and JSON.
6. Tests for scenario scoring, report generation, and UI state changes.

## Machine Learning (Implemented)

The case-risk scorer is now a real trained model, not just a heuristic:

- `ml/` — scikit-learn logistic-regression pipeline over a shared feature
  contract (`ml/features.py` ↔ `server/ai/risk-features.tsx`).
- Synthetic data generation, training, and an evaluation gate (accuracy,
  macro-F1, high-risk recall, confusion matrix, fairness slices).
- Portable JSON model artifact served natively by `server/ai/risk-model.tsx`,
  with the original heuristic as a deterministic fallback.
- Drift monitoring (PSI vs training baseline) and a human-override feedback loop
  that exports labelled rows for retraining.
- Governance docs: `docs/model-card.md`, `docs/responsible-ai.md`.

Run it with `npm run ml:pipeline`.

## Known Limits

- The model is trained on synthetic data, so it does not prove real-world
  performance; it demonstrates the production ML lifecycle and governance.
- Other tool calls (telephony, retrieval, CRM) remain simulated.
- There is no real ASR, TTS, or authentication on the public demo yet.
