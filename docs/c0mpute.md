# MeshHook on c0mpute

MeshHook is a webhook-first workflow engine; [c0mpute](https://c0mpute.com) is a
peer-to-peer compute network. Put together, you get a p2p n8n: you design the DAG
in the visual builder, MeshHook keeps the durable event log and decides what runs
next, and the steps themselves run on c0mpute nodes.

```
webhook ──► workflow_runs + run_created ──► workflow_jobs ──► orchestrator (decide)
                                                                 │ step_started
                                                                 ▼
                                                           workflow_steps ──► executor
                                                                               │
                         ┌─────────────────────────────────────────────────────┤
                         ▼                                 ▼                   ▼
             c0mpute jobs bridge                 Infernet open market      this server
         (auction on workflow.step)            (ai node, p2p_only=true)    (everything else,
          transform · http_call                                            and every fallback)
                         │
                         ▼
              step_succeeded { output, executed_on: { backend, worker, job_id, price } }
```

## What runs where

| Node | Where it runs |
|------|---------------|
| `ai` | Always c0mpute inference (Infernet `POST /api/chat`, `p2p_only: true`). Open models only; it never falls back to a paid hosted model. |
| `transform` with a JMESPath `expression` | c0mpute `workflow.step` worker when the workflow runs on c0mpute; otherwise this server. |
| `httpCall` | c0mpute worker when it carries **no credentials**, or when the workflow pins trusted workers (`allowPeers`). Otherwise this server. |
| template `transform`, `xmlJsonTransform`, `conditional`, `branch`, `loop`, `delay`, `terminate`, triggers | This server (cheap, or they need the run's state). |

**Credentials never go to a stranger.** A worker sees the whole step spec. MeshHook
keeps an `httpCall` local if it has an auth-like header (`Authorization`, `Cookie`,
anything matching `key|token|secret|signature|session|auth|password`), `user:pass@`
in the URL, a credential-looking query parameter, or a `{{$secret…}}` template.
Pin your own nodes with `settings.c0mpute.allowPeers` to send those steps to them.

**Fallbacks are recorded.** No bids, the bridge is down, a worker cannot reach
the host, or the API answers `402` (only this server holds the x402 payer key):
the step runs here, and `executed_on.reason` in the run log says why.

## Per-workflow settings

The editor's **Runs on** menu writes `definition.settings`:

| Choice | Stored | Effect |
|--------|--------|--------|
| Auto | *(nothing)* | Server default: c0mpute when `C0MPUTE_JOBS_TOKEN` is set, else local. |
| c0mpute network | `execution: "c0mpute"` | Offer eligible steps to the network. |
| This server | `execution: "local"` | Run everything here (AI steps still use c0mpute inference). |
| Private | `c0mpute.private: true` | Nothing but AI steps leaves this server, whatever the default. |

API-only extras on the same object: `c0mpute.allowPeers` (libp2p peer ids),
`c0mpute.maxPrice`, `retryAttempts` (1-10, default 3) and `retryDelay` (ms,
doubling).

## Templates

Every string in a node config takes `{{path}}` against the node's input (the
previous node's output), plus:

- `{{$trigger.body.x}}`, `{{$trigger.headers.x}}`: the webhook that started the run
- `{{$nodes.<id or label>.x}}`: any finished node's output
- `{{$input}}`: the whole input

## Server setup

```bash
# 1. a c0mpute peer with the jobs bridge, on loopback next to MeshHook
C0MPUTE_JOBS_TOKEN=$(openssl rand -hex 24) c0mpute jobs serve --listen 127.0.0.1:8788

# 2. MeshHook
C0MPUTE_JOBS_URL=http://127.0.0.1:8788
C0MPUTE_JOBS_TOKEN=<same token>
MESHHOOK_EXECUTOR=auto            # auto | local | c0mpute
INFERNET_URL=https://infernetprotocol.com
INFERNET_CLIENT_KEY=ifc_...       # optional trusted-client budget

# 3. check
bun mh c0mpute
```

Run a node that serves `workflow.step` jobs to add capacity to the network. See
the c0mpute docs (DIP for `workflow.step`).

## Run log events

| Event | Payload |
|-------|---------|
| `run_created` | `{ headers, body }` from the webhook |
| `step_started` | `{ node: { id, kind } }` |
| `step_succeeded` | `{ node, output, branch?, executed_on, attempt }` |
| `step_failed` | `{ node, attempt, final, error, status?, executed_on? }` |
| `delay_started` | `{ node, until }` |
| `run_terminated` / `run_completed` / `run_failed` | `{ error? }` |
