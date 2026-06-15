# ChatoraAi Implementation Plan

## Objective

Rebrand the project as **ChatoraAi**, a real B2B software product for deploying
production voice AI agents. The experience should show the software workflow
clearly and avoid looking like a generic AI landing page.

## Brand Direction

ChatoraAi should feel credible, operational, and enterprise-ready.

- Brand name: `ChatoraAi`
- Product category: voice agent deployment platform
- Palette: navy, white, slate, blue, cyan, green, amber, and red
- Avoid: heavy purple gradients, decorative AI blobs, vague AI imagery, and
  overdesigned futuristic effects
- Logo: `assets/chatoraai-logo.svg`
- Logo concept: conversation mark, voice signal, and clean wordmark

## Product Workflow

The site is organized around the ChatoraAi workflow:

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

- Static Vite app.
- Product-first ChatoraAi branding.
- SVG logo asset.
- Sectioned product workflow.
- Interactive scenario selector.
- Transcript, tool trace, and evaluation tabs.
- Voice tuning controls.
- Dynamic readiness, containment, resolution, and deployment state.
- Handoff report generation and copy action.

## Production Expansion

The next engineering build should add:

1. TypeScript models for workspaces, scenarios, tool calls, evaluations, and
   reports.
2. Python FastAPI backend with mockable adapters:
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

## Known Limits

- Current metrics are illustrative.
- Tool calls are simulated.
- There is no real ASR, TTS, telephony, retrieval, CRM, or authentication yet.
- The current build is a polished product prototype showing the software
  workflow and brand direction.
