# Operations & Observability

## Logs & Metrics
- Append-only `workflow_events` is truth.
- Stream selected events to Realtime channels for the UI.
- Materialized views: P95 step latency, success rate, failure hotspots.

## Dead Letter & Replay
- Failed runs land in DLQ with reason and last step.
- Replay entire run or resume from a step (same definition version).

## Alerts
- Threshold-based email/webhook alerts on failure spikes or queue lag.
