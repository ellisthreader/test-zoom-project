# Incident Runbook — RelayClarity Case-Risk Classifier

Operational runbook for the `risk-scoring-logreg` model in production. Covers the
monitored signals and their endpoints, alerting/on-call, standard responses, and
one fully worked production incident in the pre-interview-task format.

All thresholds below are the values implemented in `server/ai/monitoring.tsx`.

---

## 1. Monitored signals

| Signal | What it measures | Warn | Alert | Source |
| --- | --- | --- | --- | --- |
| **Drift (PSI)** | Population stability index of the live predicted-class mix vs the training baseline | ≥ 0.10 | ≥ 0.20 | `GET /api/monitoring/drift-report` → `populationStabilityIndex` / `status` |
| **Fairness disparity** | Max−min high-risk rate across `customerTier` and `channel` groups | ≥ 0.20 | ≥ 0.30 | `GET /api/monitoring/drift-report` → `fairness.attributes.<attr>.status` |
| **Low-confidence rate** | Share of predictions below the 0.6 review threshold | trend-watch | trend-watch | `GET /api/monitoring/drift-report` → `lowConfidenceRate` |
| **Operational health** | Total predictions, active model versions, last prediction time | — | stale/none | `GET /api/monitoring/drift-report` → `operationalHealth` |
| **Override / feedback rate** | How often officers override the model | trend-watch | trend-watch | `GET /api/monitoring/feedback-report` |
| **Endpoint latency / error rate** | Azure ML endpoint request latency, 5xx rate | per Azure Monitor rule | per Azure Monitor rule | Azure Monitor / App Insights (`az ml online-deployment get-logs`) |

Notes:
- PSI and fairness require a minimum sample (30 total, 10 per group) or they
  report `insufficient_sample` and **do not** raise alerts — avoids paging on
  noise during low traffic.
- Model provenance for any of these checks: `GET /api/risk/model`.

---

## 2. Alerting & on-call

- Configure Azure Monitor alert rules on (a) endpoint latency/error rate and
  (b) the exported drift/fairness metrics; page the on-call MLOps engineer.
- **Warn** → ticket, investigate within one business day.
- **Alert** → page on-call; begin triage immediately (§3).
- Escalation path: on-call MLOps → model owner → DPO (for any fairness alert).

---

## 3. Standard responses

| Condition | First response |
| --- | --- |
| **Drift = warn** | Compare `liveDistribution` vs `baselineDistribution`; check for a known seasonal/campaign cause; raise a ticket; watch. |
| **Drift = alert** | Run the incident in §4: triage, decide retrain vs rollback. |
| **Fairness = warn/alert** | Notify model owner + DPO; review the offending slice in `fairness.attributes`; do **not** silently re-tune; decide whether to pause/rollback pending review. |
| **Low-confidence rate spike** | Confirm review queue is absorbing the extra mandatory reviews; check for an input-quality/upstream change. |
| **Operational health stale/none** | Treat as an availability incident; check the serving path (TS server / FastAPI / Azure endpoint) and recent deploys. |
| **Endpoint 5xx / latency** | Check `az ml online-deployment get-logs`; roll back traffic to the previous deployment (§4 rollback). |

---

## 4. Worked production incident — model data-drift

**Incident:** `INC-2026-0625-01` — Drift alert on the live class mix.
**Severity:** Sev-2 (model quality degraded; no outage, advisory only).
**Model:** `risk-scoring-logreg-1.0.0`.

### 4.1 Context

The risk model triages support cases as `low`/`medium`/`high` so officers handle
the riskiest first. Its training **baseline class mix** is
`low 0.0969 / medium 0.3383 / high 0.5648` (from `ml/artifacts/risk_model.json`).
Drift is monitored as the PSI of the live predicted-class mix against that
baseline (warn 0.10, alert 0.20).

### 4.2 What alerted

`GET /api/monitoring/drift-report` returned `status: "alert"` with
`populationStabilityIndex` above **0.20**: the live `high` share had climbed well
over the 0.5648 baseline while `low` collapsed — the predicted-class mix had
shifted materially. `lowConfidenceRate` had also ticked up, pushing more cases
into mandatory review and lengthening the queue. Sample size was well over the
30-row minimum, so the alert was trustworthy (not `insufficient_sample`).

### 4.3 Triage

1. Confirmed the alert was real: `sampleSize` well above `MIN_SAMPLE`, status
   `alert`, not `insufficient_sample`.
2. Compared `liveDistribution` vs `baselineDistribution` in the report — the
   `high` proportion was the dominant contributor to the PSI.
3. Checked **fairness** in the same report: `customerTier`/`channel` disparity
   gaps had not crossed their 0.20/0.30 lines — so this was a *distribution*
   shift, not a fairness regression.
4. Checked `GET /api/risk/model` to confirm no recent model change — the artifact
   version was unchanged, ruling out a bad deploy.
5. Checked `operationalHealth` and Azure endpoint latency/error metrics — serving
   was healthy, so this was a **data** problem, not an infrastructure one.

### 4.4 Root cause

A **seasonality / upstream data shift**: a real-world event (a billing-cycle
change plus a security-notice campaign) drove a surge of genuinely higher-risk
contacts. The input distribution moved away from the synthetic training baseline,
so the live class mix diverged and PSI crossed the alert threshold. The model
itself was behaving correctly on the new traffic — but the baseline it is
monitored against no longer represented reality.

### 4.5 Mitigation / rollback

Because the model was not malfunctioning (only the baseline was stale), the
primary action was to **retrain to the new reality**, with rollback held ready as
the safety net:

- **Rollback path (held ready, consistent with the code):**
  - In-app / FastAPI: restore the previous artifact — the retraining loop always
    backs up the live artifact to `ml/artifacts/risk_model.prev.json` before any
    promotion, so rollback is `cp risk_model.prev.json risk_model.json` and a
    restart; all serving paths load the same JSON.
  - Azure ML: shift endpoint traffic back to the previous deployment instantly —
    `az ml online-endpoint update --traffic "blue=100 green=0"` — or recreate a
    deployment pinned to the prior registered model version
    (`--set model=azureml:risk-scoring-logreg:<old>`), per `azure/README.md`.
- **Chosen action — gated retrain from feedback:** ran
  `ml/retrain_from_feedback.py` on the accumulated officer-confirmed feedback
  (dry-run first). The candidate is evaluated against the held-out test set and
  promoted **only** if every gate holds: accuracy ≥ 0.70, high-risk recall ≥ 0.70,
  macro-F1 ≥ 0.65, **no** high-risk recall regression (> 0.02), and **no** tier
  fairness regression (> 0.02). With gates green, promoted with `--promote`
  (which backed up `risk_model.prev.json` first), then re-registered and deployed
  the new version via blue/green canary on Azure ML.

### 4.6 What changed afterwards

- Added the **live fairness monitor** (`customerTier`/`channel` disparity in
  `server/ai/monitoring.tsx`) so a future shift cannot move risk onto a protected
  group unnoticed — it now alerts alongside drift.
- Established a **retraining cadence** driven by the feedback loop
  (`ml/retrain_from_feedback.py`) with the promotion gates above, so the baseline
  is refreshed deliberately and safely rather than only after an alert.
- Confirmed the **parity test** (`server/ai/parity.test.tsx`, fixtures from
  `ml/export_parity_fixtures.py`) still passed after promotion, proving no
  train-serve skew was introduced by the new artifact.
- Tuned the Azure Monitor alert so a known seasonal pattern raises a *warn*
  ticket before it reaches *alert*.

---

## 5. References

- Monitoring code & thresholds: `server/ai/monitoring.tsx`.
- Endpoints: `server/index.tsx` (`/api/risk/score`, `/api/risk/model`,
  `/api/risk/feedback`, `/api/monitoring/drift-report`,
  `/api/monitoring/feedback-report`, `/api/monitoring/training-feedback`).
- Rollback / blue-green: `azure/README.md`; retraining: `ml/retrain_from_feedback.py`.
- Governance: [`model-card.md`](./model-card.md),
  [`responsible-ai.md`](./responsible-ai.md), [`dpia.md`](./dpia.md).
