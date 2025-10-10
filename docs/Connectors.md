# Connectors & Nodes

## Node Types (v1)
- **Webhook Trigger** — verifies signatures; enqueues run.
- **Transform** — JMESPath expression mapping input → output JSON.
- **HTTP Call** — method, URL, headers, body; retries/backoff; idempotency keys.
- **Branch** — boolean JMESPath.
- **Delay** — sleep then continue.
- **Terminate** — finalize with payload.

## Declarative Connectors (JSON/YAML)
Minimal example:
```json
{
  "name": "Generic CRM",
  "auth": { "type": "apiKey", "placement": "header", "template": "Bearer {{secrets.crm_token}}" },
  "endpoints": {
    "createContact": {
      "method": "POST",
      "url": "https://api.crm.example.com/contacts",
      "requestSchema": { "$ref": "#/schemas/contact" },
      "idempotencyHeader": "Idempotency-Key"
    }
  },
  "schemas": {
    "contact": {
      "type": "object",
      "properties": { "email": {"type":"string"}, "fullName": {"type":"string"} },
      "required": ["email"]
    }
  }
}
```
