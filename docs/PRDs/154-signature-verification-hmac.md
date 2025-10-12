# PRD: Signature verification (HMAC)

**Issue:** [#154](https://github.com/profullstack/meshhook/issues/154)
**Milestone:** Phase 5: Webhook System
**Labels:** webhook-triggers, hacktoberfest

---

# PRD: Signature Verification (HMAC) for Webhook Triggers

## Overview

The implementation of HMAC (Hash-based Message Authentication Code) signature verification for MeshHook's webhook triggers is a critical enhancement aimed at bolstering the security framework of our webhook-first, deterministic, Postgres-native workflow engine. This feature is designed to validate the authenticity and integrity of incoming webhook requests, ensuring that only requests with verified signatures trigger workflows. This aligns with MeshHook's objectives of providing a secure, reliable, and easy-to-use automation platform, addressing the need for stringent security measures in automated workflow execution.

### Objective

The goal of this enhancement is to integrate HMAC signature verification for all incoming webhook requests to MeshHook. By doing so, we aim to ensure that workflows are only triggered by authenticated sources, thereby safeguarding against unauthorized access and preserving the integrity of the data processed by MeshHook.

## Functional Requirements

1. **HMAC-SHA256 Verification:** Implement a mechanism to verify HMAC-SHA256 signatures for incoming webhook requests, ensuring that each request is authenticated before proceeding to trigger a workflow.
2. **Secret Key Configuration:** Develop both a user interface and an API endpoint that allow users to set and manage secret keys used for generating HMAC signatures, specific to each project within MeshHook.
3. **Invalid Signature Handling:** Clearly define the behavior of the system when encountering invalid or missing signatures in webhook requests, including rejecting the request and returning an HTTP 401 Unauthorized status code.
4. **Audit Trail:** Maintain a detailed log of all webhook requests, including those that fail signature verification, to support monitoring, auditing, and troubleshooting.

## Non-Functional Requirements

- **Performance:** The HMAC signature verification process must be optimized to minimize impact on webhook processing latency, ensuring that the system remains responsive under high load.
- **Security:** Implement robust security measures for the storage and handling of HMAC secret keys, ensuring that they are securely stored and accessed.
- **Reliability:** Ensure that the signature verification process is reliable, even under peak loads, to maintain the integrity of the workflow execution process.
- **Maintainability:** Design the HMAC signature verification feature with maintainability in mind, ensuring that future updates and modifications can be easily implemented.

## Technical Specifications

### Architecture Context

MeshHook's architecture comprises SvelteKit for serving dynamic content and handling API requests, Supabase for backend services including Postgres for data persistence, and dedicated workers for orchestration and execution of HTTP requests. The HMAC signature verification will be integrated within the SvelteKit component, where webhook requests are received and initially processed.

### Implementation Approach

#### 1. Analysis
- Review the current webhook processing logic within SvelteKit to identify the optimal point for integrating signature verification.

#### 2. Secret Key Management
- Modify the `projects` table in Postgres to include a `hmac_secret` field for storing secret keys.
- Implement a UI in SvelteKit for users to input and manage HMAC secrets for their projects.
- Develop API endpoints for setting and retrieving HMAC secret configurations, ensuring sensitive information is securely handled.

#### 3. Verification Logic
- Introduce a middleware function in SvelteKit that extracts the signature from incoming webhook request headers, computes the expected HMAC signature using the project-specific secret, and validates the request signature against this computed signature.
- Implement logic to allow or reject the webhook request based on the outcome of the signature comparison.

#### 4. Testing & Documentation
- Create comprehensive unit and integration tests to validate the functionality of the HMAC signature verification process.
- Update the project documentation to include detailed instructions on configuring and using the HMAC signature verification feature.

### Data Model Changes

- `projects` table schema will be extended to include:
  - `hmac_secret VARCHAR(255)`: Field to store the HMAC secret key for each project.

### API Endpoints

- `POST /api/projects/:id/hmac_secret`: Configures the HMAC secret for a given project.
- `GET /api/projects/:id/hmac_secret`: Retrieves the HMAC secret configuration for a given project (excluding the secret itself for security reasons).

## Acceptance Criteria
- [ ] HMAC signature verification correctly validates the authenticity of incoming webhook requests.
- [ ] UI and API for managing HMAC secret keys are fully functional and user-friendly.
- [ ] Performance benchmarks confirm that signature verification introduces negligible latency.
- [ ] Comprehensive test coverage ensures reliability and functionality of the feature.
- [ ] Documentation provides clear guidance on configuring and utilizing HMAC signature verification.

## Dependencies and Prerequisites
- Existing MeshHook development environment and codebase access.
- Understanding of the current webhook processing logic within MeshHook.
- Familiarity with HMAC-SHA256 and cryptographic best practices.

## Implementation Notes

### Development Guidelines
- Adhere to MeshHook's coding standards and best practices, focusing on clean, maintainable code and robust error handling.
- Use environment variables for managing sensitive information during development and testing.

### Testing Strategy
- **Unit Tests:** Implement tests to cover the new logic for HMAC signature generation and verification.
- **Integration Tests:** Perform end-to-end testing of the signature verification process, including secret configuration and webhook request handling.

### Security Considerations
- Implement encryption at rest for the `hmac_secret` field in the database.
- Ensure secure access patterns to HMAC secrets within the application, following the principle of least privilege.
- Prevent logging of sensitive information to avoid potential exposure of HMAC secrets.

### Monitoring & Observability
- Monitor the rate of webhook requests rejected due to signature verification failures, alerting on unusual patterns that might indicate configuration issues or malicious activity.

By following this PRD, MeshHook will establish a robust security measure to authenticate and verify webhook requests, enhancing the overall security posture and reliability of the system.

---

*This PRD was AI-generated using gpt-4-turbo-preview from GitHub issue #154*
*Generated: 2025-10-10*
