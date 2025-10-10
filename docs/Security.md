# Security & Multi-Tenancy

- Row-Level Security by `project_id`.
- Secrets encrypted at rest (AES-GCM), KEK rotation task.
- Webhook verification: HMAC-SHA256, JWT, provider-style signatures.
- Audit logs for admin actions and secret reads.
- PII redaction rules for stored artifacts.
