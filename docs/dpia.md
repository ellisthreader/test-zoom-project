# Data Protection Impact Assessment — RelayClarity Case-Risk Classifier

A full UK GDPR / Data Protection Act 2018 style Data Protection Impact
Assessment (DPIA) for the RelayClarity case-risk classifier
(`risk-scoring-logreg-1.0.0`). It supersedes the "DPIA-lite" summary in
[`responsible-ai.md`](./responsible-ai.md) and is written to be lifted directly
into a real public-sector (e.g. local authority) deployment.

> **Status of the published system.** The model shipped in this repository is
> trained on **synthetic data only** (`ml/generate_data.py`); no personal data
> is processed. This DPIA is therefore a *pre-deployment* assessment: it
> describes the controls that MUST be in place **before** the model is pointed
> at real resident/customer data, and records the residual-risk position that
> would apply at that point.

---

## 1. Screening — is a DPIA required?

A DPIA is required under UK GDPR Art. 35 when processing is "likely to result in
a high risk" to individuals. Screening against the ICO criteria:

| Trigger | Applies? | Notes |
| --- | --- | --- |
| Evaluation/scoring/profiling of individuals | **Yes** | The model profiles a case to predict `low`/`medium`/`high` risk. |
| Automated decision-making with significant effect | Partial | Advisory only; a human owner decides (see §6). Mitigates the trigger but does not remove it. |
| Systematic monitoring | No | Per-case scoring at point of contact, not ongoing surveillance. |
| Sensitive / special-category data | **Not intended** | Feature set excludes special-category data by design (§4). |
| Data processed on a large scale | Likely (at production scale) | All inbound contacts in scope. |
| Vulnerable data subjects | **Yes** | Public-service users include vulnerable individuals; the `policy`/safety wording path can surface them. |

**Conclusion:** profiling + potential vulnerable subjects + production scale mean
a **full DPIA is required** before any real-data deployment. This document
satisfies that requirement.

---

## 2. Description of the processing (data flow)

```
case / call record
   -> feature extraction (ml/features.py / server/ai/risk-features.tsx)
   -> calibrated logistic-regression inference
        (ml/infer.py | serving/app.py | azure/score.py | server/ai/risk-model.tsx)
   -> advisory risk score + class probabilities + reasons
        (POST /api/risk/score)
   -> human review queue (humanReviewRequired flag)
   -> officer decision / override  (POST /api/risk/feedback)
   -> monitoring (drift, fairness, feedback) + periodic retraining
```

- **Nature:** real-time inference; a single case in, one advisory score out.
- **Scope:** structured case metadata plus a derived count of risk-related
  keywords from free text (no free text is stored in the model path).
- **Context:** triage aid for support/contact-centre officers.
- **Purpose:** surface the most urgent/sensitive cases for human attention
  first; force review for high-risk, low-confidence, or escalated cases.
- **Serving artifacts (one model, multiple consumers):** the in-app TypeScript
  scorer (`server/ai/risk-model.tsx`), the FastAPI service (`serving/app.py`),
  and the Azure ML managed online endpoint (`azure/score.py`) all load the same
  `ml/artifacts/risk_model.json` artifact, so the data flow is identical
  regardless of serving path.

---

## 3. Necessity & proportionality

- **Necessity:** triage by hand does not scale and is inconsistent; a
  transparent, gated model gives a defensible, repeatable prioritisation while
  keeping the decision with a person.
- **Proportionality:** the model is a **linear** logistic regression (not an
  opaque deep model) chosen for auditability; it consumes a small, declared
  feature set; it never auto-actions; and every score carries plain-English
  reasons and per-feature attributions so it can be challenged.
- **Less-intrusive alternative considered:** the deterministic heuristic in
  `server/ai/risk-scoring.tsx` (retained as the fallback). The trained model is
  preferred because it is calibrated, evaluated, fairness-monitored, and gated —
  giving stronger governance evidence than a hand-tuned rule.

---

## 4. Lawful basis (for a real public-sector deployment)

For the synthetic demo there is **no personal data and therefore no lawful
basis question**. For a real local-authority deployment the most likely basis:

- **Public task — UK GDPR Art. 6(1)(e):** processing necessary to perform a task
  in the public interest / exercise of official authority (the usual basis for a
  council operating a service). This should be the primary basis.
- **Legal obligation — Art. 6(1)(f) [for an authority, public task is preferred over legitimate interests]:** where a statutory duty drives the service.
- **Special-category data — Art. 9:** **none intended.** If any special-category
  data were ever introduced (it must not be without re-assessment), an Art. 9
  condition (e.g. substantial public interest under DPA 2018 Sch. 1) would be
  required first.

The chosen basis, and the corresponding entry in the authority's Record of
Processing Activities (ROPA), must be confirmed with the DPO before go-live.

---

## 5. Data minimisation

The declared feature contract (`featureOrder` in `ml/artifacts/risk_model.json`,
mirrored in `ml/features.py` and `server/ai/risk-features.tsx`) is the **only**
data the model consumes:

`priority_urgent, priority_high, priority_low, tier_vip, escalate,
sentiment_negative, category_sensitive, category_operational, prev_open_tickets,
confidence, low_confidence, outcome_unresolved, duration_long, high_term_count,
medium_term_count, channel_voice`.

- All features are **derived signals**: booleans, small counts, and a model
  confidence value. Free text is reduced to keyword **counts**
  (`high_term_count`, `medium_term_count`) — the raw transcript is not a model
  input and is not stored in the artifact or monitoring store.
- **No special-category data** (health, race, religion, sexuality, etc.) is in
  the feature set, by design.
- `customerTier` and `channel` are retained **only** for fairness monitoring
  (`server/ai/monitoring.tsx`), not as additional model inputs beyond
  `tier_vip` / `channel_voice`.
- The monitoring store keeps only `{level, confidence, modelVersion, at,
  customerTier, channel}` per prediction — the minimum needed for drift and
  fairness — and is in-memory/transient in the current implementation.

---

## 6. Automated decision-making (UK GDPR Art. 22)

- **Position: NOT a solely-automated decision with legal or similarly
  significant effect.** The output is **advisory**.
- A named human owner reviews each recommendation and can override it. The model
  never auto-closes, auto-routes, or finalises a case.
- `humanReviewRequired` is forced `true` when the score is `high`, when
  `confidence < reviewThreshold` (0.6), or when the case was escalated — so the
  riskiest and least-certain cases are guaranteed a human.
- Overrides are captured via `POST /api/risk/feedback` and feed the retraining
  loop, preserving meaningful human agency over the outcome.

Because Art. 22 is engaged only by *solely* automated significant decisions, the
mandatory-human-review design keeps this processing outside Art. 22's
prohibition while still meeting its safeguard expectations (information, human
intervention, ability to contest).

---

## 7. Risks & mitigations

All metrics below are the **current measured values** from
`ml/artifacts/evaluation.json` / `risk_model.json`.

| # | Risk | Likelihood / impact | Mitigation |
| --- | --- | --- | --- |
| R1 | **Proxy discrimination** via `customerTier` — VIP cases flagged high more often. Measured tier **disparity gap = 0.2059** (VIP 0.6793 vs standard 0.4734 high-risk rate). | Medium / High | Fairness reported every evaluation **and live** (`buildFairnessReport`, `GET /api/monitoring/drift-report`); warn ≥ 0.20, alert ≥ 0.30. Tier gap currently at the warn line — reviewed by a human, **not** auto-tuned away. Retraining is **blocked** if it worsens the tier gap by > 0.02. |
| R2 | **Category disparity** — measured **gap = 0.3252** across categories. | Medium / Medium | Largely a legitimate risk driver (category sensitivity), but logged and reviewed. Above the 0.30 alert line, so treated as a standing governance item, not an automatic block. |
| R3 | **Channel disparity** — measured **gap = 0.0691**. | Low / Low | Within tolerance; monitored live by `customerTier`/`channel` slices. |
| R4 | **Automation bias** — officers defer to the score. | Medium / High | Advisory framing; calibrated confidence shown (ECE 0.0167); low-confidence cases forced to review; override rate tracked (`GET /api/monitoring/feedback-report`). |
| R5 | **Label bias** — training labels encode historical bias. | Medium / High | Current labels are synthetic and documented. Real labels (officer feedback) enter only via the gated retraining loop (§8); promotion blocked on any fairness/recall regression. |
| R6 | **Drift / silent degradation** — live case mix diverges from baseline. | Medium / Medium | PSI of live vs baseline class mix, warn 0.10 / alert 0.20 (`GET /api/monitoring/drift-report`); documented rollback in [`incident-runbook.md`](./incident-runbook.md). |
| R7 | **Security / unauthorised access** to scores or PII. | Low / High | Serve behind auth + gateway; Azure ML endpoint uses `auth_mode: key`; secrets in a vault; audit log of predictions/decisions (§10). |
| R8 | **Lack of recourse** — individual cannot understand/challenge a score. | Medium / Medium | Plain-English `mainReasons` + per-feature attributions on every score; human owner can override; individual rights process (§11). |
| R9 | **Train-serve skew** — Python and production scorers disagree. | Low / High | Parity test (`server/ai/parity.test.tsx`) asserts the TypeScript scorer reproduces the Python model on fixtures from `ml/export_parity_fixtures.py`; all serving paths load the same artifact. |

---

## 8. Fairness monitoring & thresholds

- **Offline (every evaluation):** `ml/evaluate.py` reports the high-risk-rate
  disparity gap for `customerTier`, `channel`, and `category` into
  `ml/artifacts/evaluation.json`. Current gaps: **tier 0.2059, channel 0.0691,
  category 0.3252**.
- **Live (on real traffic):** `server/ai/monitoring.tsx` computes the disparity
  gap by `customerTier` and `channel` per served prediction, surfaced under
  `fairness` in `GET /api/monitoring/drift-report`.
  - Thresholds: **warn ≥ 0.20, alert ≥ 0.30**; minimum 30 total / 10 per group
    before a gap is trusted (`insufficient_sample` otherwise).
- **Retraining gate:** the candidate is rejected if the tier disparity gap
  worsens by more than **0.02** vs the current live model
  (`FAIRNESS_REGRESSION_TOLERANCE` in `ml/retrain_from_feedback.py`).

---

## 9. Calibration & confidence integrity

Confidence values are **calibrated** via post-hoc temperature scaling
(temperature **1.0446**, in `ml/artifacts/risk_model.json`), applied identically
in `ml/infer.py` and `server/ai/risk-model.tsx`. The measured **Expected
Calibration Error is 0.0167**, so the confidence shown to officers is meaningful
— important because the low-confidence threshold (0.6) drives mandatory human
review (§6). Temperature scaling does not change the predicted class, so accuracy
and high-risk recall are unaffected.

---

## 10. Security & access controls

- **Authentication / network:** serve behind authentication and an API gateway.
  The Azure ML managed online endpoint uses `auth_mode: key` (`azure/endpoint.yml`);
  the FastAPI service (`serving/`) is deployed behind an ingress on AKS.
- **Secrets:** keys/credentials in a managed vault, never in code.
- **Audit:** durably log prediction, decision, model version, and confidence for
  every case (the in-memory monitoring store must be replaced with durable
  storage before production).
- **Least privilege:** scoped access to the endpoint, the artifact registry, and
  the feedback store; separate write access for retraining/promotion.
- **Data residency:** Azure resources provisioned in a UK region per the
  authority's policy.

---

## 11. Retention

- **Model inputs/outputs:** retain prediction + decision audit records for the
  period agreed with Information Governance (default proposal: aligned to the
  case record's own retention schedule), then delete.
- **Feedback used for retraining:** retained until incorporated into a promoted
  model version, then minimised.
- **Artifacts:** the live artifact and the immediately previous version
  (`risk_model.prev.json`) are retained to enable rollback; older versions remain
  registered in Azure ML for traceability and re-deploy.

---

## 12. Individual rights & recourse

- **Right to be informed:** privacy notice to state that an advisory model
  assists case prioritisation, the logic involved, and that a human decides.
  Suitable for an Algorithmic Transparency Recording Standard (ATRS) entry.
- **Access / rectification / erasure:** supported via the authority's standard
  SAR/rights process against the underlying case record.
- **Right to contest:** every score carries `mainReasons` and feature
  attributions; the human owner can override, and the override is logged.
- **Human intervention:** guaranteed for high-risk, low-confidence, and escalated
  cases (`humanReviewRequired`).

---

## 13. Consultation

- **Information Governance / DPO:** confirm lawful basis, ROPA entry, retention,
  and audit storage before go-live; sign off the residual-risk position (§14).
- **Service owners / officers:** validate that advisory framing and the review
  queue fit the operational workflow and do not induce automation bias.
- **Data subjects (where appropriate):** representative consultation for a
  public-facing deployment, per ICO guidance.

---

## 14. Residual risk & sign-off

| Risk area | Residual rating (post-mitigation) | Owner |
| --- | --- | --- |
| Proxy discrimination (tier, R1) | Medium — at the warn line, under active monitoring | Model owner + DPO |
| Category disparity (R2) | Medium — accepted as a legitimate driver, monitored | Model owner |
| Automation bias (R4) | Low–Medium | Service owner |
| Drift (R6) | Low — monitored + documented rollback | MLOps owner |
| Security (R7) | Low (subject to the §10 controls being implemented) | Platform owner |

**Go-live is conditional on:** (a) replacing synthetic data only after a real-data
DPIA refresh; (b) durable audit logging; (c) the §10 security controls; (d) DPO
sign-off of the lawful basis and residual risk.

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Model / MLOps owner | _________ | _____ | _____ |
| Data Protection Officer | _________ | _____ | _____ |
| Senior Information Risk Owner (SIRO) | _________ | _____ | _____ |

---

## 15. Review cadence

Re-assess this DPIA on **every promoted model version**, on any **material data
or feature change**, on a **sustained fairness/drift alert**, or at minimum
**annually**. Each retraining run (`ml/retrain_from_feedback.py`) and each
Azure model version provides a checkpoint for review. See
[`model-card.md`](./model-card.md), [`responsible-ai.md`](./responsible-ai.md),
and [`incident-runbook.md`](./incident-runbook.md).
