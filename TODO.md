# MeshHook TODO

Based on [PRD.md](./docs/PRD.md) - v1 Implementation Roadmap

## ✅ Phase 0: Foundation (COMPLETED)
- [x] Environment configuration (local/staging/production)
- [x] Supabase CLI integration
- [x] Database connection setup
- [x] Unified setup and migration scripts
- [x] Documentation (README, Environment-Setup)

## 🚧 Phase 1: Core Infrastructure

### Database Schema
- [ ] Create core tables migration
  - [ ] `projects` - Multi-tenant project isolation
  - [ ] `workflows` - Workflow definitions with versioning
  - [ ] `workflow_versions` - Immutable published versions
  - [ ] `runs` - Workflow execution instances
  - [ ] `events` - Event sourcing log
  - [ ] `secrets` - Encrypted secrets vault
  - [ ] `audit_log` - Admin actions and secret access
- [ ] Implement Row Level Security (RLS) policies
- [ ] Create indices for hot paths
- [ ] Set up event partitioning

### Queue System
- [ ] Choose queue implementation (pg-boss vs pgmq)
- [ ] Create queue tables/setup
- [ ] Implement job enqueue/dequeue
- [ ] Add retry logic with exponential backoff + jitter
- [ ] Implement DLQ (Dead Letter Queue)

## 📦 Phase 2: Backend Workers

### Orchestrator Worker
- [ ] State machine implementation
- [ ] Event sourcing engine
- [ ] Job scheduling and polling
- [ ] Deterministic replay logic
- [ ] Circuit breaker implementation
- [ ] Timeout handling
- [ ] Idempotency key support

### HTTP Executor Worker
- [ ] HTTP client with retry logic
- [ ] Exponential backoff + jitter
- [ ] Timeout configuration
- [ ] Response recording for replay
- [ ] Error handling and logging

### Node Types Implementation
- [ ] `transform` node (JMESPath)
  - [ ] JMESPath parser integration
  - [ ] Input/output validation
  - [ ] Preview functionality
- [ ] `http_call` node
  - [ ] Request configuration
  - [ ] Retry policies
  - [ ] Response handling
- [ ] `branch` node (conditional logic)
- [ ] `delay` node (scheduled execution)
- [ ] `terminate` node (end workflow)

## 🎨 Phase 3: Frontend (SvelteKit)

### Project Setup
- [ ] SvelteKit app structure
- [ ] Svelte 5 configuration
- [ ] Supabase client setup
- [ ] Authentication flow

### Workflow Builder
- [ ] Visual DAG editor component
- [ ] Node palette (drag & drop)
- [ ] Connection/edge drawing
- [ ] Node configuration forms (JSON Schema-driven)
- [ ] Workflow validation
- [ ] Save/load workflow definitions

### Workflow Management
- [ ] Workflow list view
- [ ] Create/edit workflow
- [ ] Version management (Draft → Publish)
- [ ] Workflow settings

### Run Console
- [ ] Run list view
- [ ] Run detail view with DAG visualization
- [ ] Live logs via Supabase Realtime
- [ ] Event timeline
- [ ] "Resume from step" functionality
- [ ] Test run feature

### Secrets Management
- [ ] Secrets vault UI
- [ ] Add/edit/delete secrets
- [ ] Secret masking in UI
- [ ] Project-scoped secrets

## 🔐 Phase 4: Security

### Authentication & Authorization
- [ ] Supabase Auth integration
- [ ] RLS policy enforcement
- [ ] Project membership management
- [ ] Role-based access control

### Secrets Encryption
- [ ] AES-GCM encryption implementation
- [ ] KEK (Key Encryption Key) management
- [ ] Key rotation mechanism
- [ ] Secret access audit logging

### PII & Redaction
- [ ] PII detection rules
- [ ] Automatic redaction in logs
- [ ] Artifact sanitization
- [ ] Compliance helpers

## 🔌 Phase 5: Webhook System

### Webhook Triggers
- [ ] Webhook endpoint creation
- [ ] Unique webhook URLs per workflow
- [ ] Signature verification (HMAC)
- [ ] JWT token support
- [ ] Payload validation
- [ ] Rate limiting (token bucket)

### Webhook Management UI
- [ ] Webhook configuration
- [ ] Test webhook functionality
- [ ] Webhook logs
- [ ] Signature key management

## 📊 Phase 6: Observability

### Logging
- [ ] Structured logging implementation
- [ ] Log levels and filtering
- [ ] Realtime log streaming (Supabase)
- [ ] Log retention policies

### Metrics
- [ ] Materialized views for metrics
- [ ] Run success/failure rates
- [ ] Execution time statistics
- [ ] Queue depth monitoring
- [ ] Error rate tracking

### Alerting
- [ ] Failure alert system
- [ ] Webhook for alerts
- [ ] Alert configuration UI

## 🧪 Phase 7: Testing

### Unit Tests
- [ ] Worker logic tests
- [ ] Node execution tests
- [ ] Transform/JMESPath tests
- [ ] Retry logic tests

### Integration Tests
- [ ] End-to-end workflow tests
- [ ] Webhook trigger tests
- [ ] Event sourcing replay tests
- [ ] Multi-tenant isolation tests

### Performance Tests
- [ ] Load testing
- [ ] Concurrent execution tests
- [ ] Queue throughput tests

## 📚 Phase 8: Documentation

### User Documentation
- [ ] Getting started guide
- [ ] Workflow builder tutorial
- [ ] Node reference documentation
- [ ] JMESPath examples
- [ ] Webhook setup guide
- [ ] Secrets management guide

### Developer Documentation
- [ ] Architecture deep-dive
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Contributing guide
- [ ] Deployment guide

## 🚀 Phase 9: Deployment & Operations

### Production Readiness
- [ ] Health check endpoints
- [ ] Graceful shutdown
- [ ] Connection pooling optimization
- [ ] Resource limits configuration
- [ ] Backup strategy

### Monitoring
- [ ] Application metrics
- [ ] Database performance monitoring
- [ ] Queue health monitoring
- [ ] Error tracking integration

### CI/CD
- [ ] GitHub Actions workflows
- [ ] Automated testing
- [ ] Database migration automation
- [ ] Deployment automation

## 🎯 Phase 10: Polish & Launch

### Performance Optimization
- [ ] Query optimization
- [ ] Index tuning
- [ ] Caching strategy
- [ ] Bundle size optimization

### UX Improvements
- [ ] Loading states
- [ ] Error messages
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness
- [ ] Dark mode

### Launch Prep
- [ ] Security audit
- [ ] Performance benchmarks
- [ ] Documentation review
- [ ] Demo workflows
- [ ] Marketing site

---

## Current Sprint Focus

**Environment Setup** ✅ COMPLETE
- All environment configuration completed
- Supabase CLI integrated
- Documentation updated

**Next Up: Phase 1 - Core Infrastructure**
- Start with database schema design
- Implement core tables with RLS
- Set up queue system (pg-boss recommended)

---

## Notes

- Follow KISS principle - keep it simple
- Use Supabase CLI for all migrations (`pnpx supabase migration new`)
- All tests go in `./tests` directory
- Port 8080 for all services
- Event sourcing is key for determinism and replay
- JMESPath for transforms (no arbitrary code execution in v1)