# PRD: Unique webhook URLs per workflow

**Issue:** [#153](https://github.com/profullstack/meshhook/issues/153)
**Milestone:** Phase 5: Webhook System
**Labels:** webhook-triggers, hacktoberfest

---

# PRD: Unique Webhook URLs per Workflow

## Overview

The objective of this task is to implement unique webhook URLs for each workflow within the MeshHook platform. This feature is essential for enhancing security, enabling more granular tracking, and providing a foundation for future scalability and customization options per workflow. It aligns with MeshHook's core goals by leveraging webhook triggers with signature verification, and it enhances multi-tenant RLS security by allowing more specific access control and monitoring.

## Functional Requirements

1. **Unique URL Generation**: Each workflow should have a unique, unguessable URL generated for its webhook trigger. This URL must be securely generated and should not be predictable.
2. **Webhook Registration and Management**: Users should be able to register and manage the webhook URLs through the MeshHook UI and API. This includes creating new webhooks for workflows and viewing existing webhook details.
3. **Signature Verification Enhancement**: The existing signature verification mechanism should be extended to support the verification of requests coming to unique URLs, ensuring that each webhook can only be triggered by authorized sources.
4. **Migration Strategy**: Implement a migration strategy for existing workflows to transition to using unique webhook URLs without disrupting current operations.
5. **Documentation**: Update the existing documentation to reflect the changes in webhook management and usage, including examples of registering and managing webhook URLs.

## Non-Functional Requirements

- **Performance**: The generation and resolution of unique webhook URLs should not significantly impact the response times of webhook triggers.
- **Security**: The system must ensure that the unique URLs are generated and stored securely, preventing unauthorized access.
- **Reliability**: The webhook URL mapping and triggering mechanism must be highly reliable, with minimal downtime or errors.
- **Maintainability**: The implementation should follow code standards and practices that ensure the codebase remains clean, well-documented, and easy to maintain.

## Technical Specifications

### Architecture Context

The implementation will involve the following components:

- **Database (Postgres)**: Introduce new schema changes for storing unique webhook URLs and mapping them to workflows.
- **SvelteKit (SSR/API)**: Extend the backend to include API endpoints for managing webhook URLs and integrate these changes into the frontend for UI management.
- **Supabase Realtime**: Utilize for live updates on webhook activity if applicable.

### Implementation Approach

1. **Analysis**: Review the current data model and identify the best approach for integrating unique webhook URLs.
2. **Schema Update**: Extend the `webhooks` table to include a column for the unique URL identifier.
3. **Backend Logic**: Implement the logic for generating unique, unguessable URLs and mapping them to specific workflows. Update the webhook triggering mechanism to resolve and validate these unique URLs.
4. **API Extensions**: Create or update API endpoints for the creation, retrieval, and management of webhook URLs per workflow.
5. **Frontend Integration**: Update the SvelteKit frontend to allow users to manage webhook URLs through the UI.
6. **Migration Tooling**: Develop scripts or tools necessary for migrating existing workflows to use unique webhook URLs.
7. **Testing & Documentation**: Write comprehensive tests covering new functionality and update documentation accordingly.

### Data Model Changes

- Modify `webhooks` table to include:
  - `unique_url_id`: A new column for storing the unique identifier part of the webhook URL.
  - Ensure that there is a unique constraint on the `unique_url_id` column.

### API Endpoints

- `POST /api/webhooks/{workflow_id}/generate`: Generates a unique webhook URL for a given workflow.
- `GET /api/webhooks/{workflow_id}`: Retrieves the webhook details, including its unique URL, for a given workflow.
- `DELETE /api/webhooks/{workflow_id}`: Removes the unique webhook URL for a given workflow (soft delete or archival might be considered for audit purposes).

## Acceptance Criteria

- [ ] Unique webhook URLs are generated for each workflow.
- [ ] Users can manage webhook URLs through the MeshHook UI and API.
- [ ] Existing workflows are migrated to use unique webhook URLs without service disruption.
- [ ] Signature verification works with unique webhook URLs.
- [ ] Documentation is updated to reflect the new webhook management features.
- [ ] All new code is covered by unit and integration tests ensuring functionality works as expected.

## Dependencies and Prerequisites

- Access to the MeshHook repository and infrastructure.
- Supabase and Postgres for database schema changes.
- Existing codebase for SvelteKit/Svelte 5 for frontend integration.

## Implementation Notes

### Development Guidelines

- Follow the existing coding standards and best practices for MeshHook.
- Use TypeScript for type safety and better code completion.
- Ensure all new endpoints and logic are covered by automated tests.

### Testing Strategy

- **Unit Tests**: For isolated logic like URL generation and signature verification.
- **Integration Tests**: For testing the API endpoints and their interaction with the database.
- **E2E Tests**: To simulate user interactions with the UI for managing webhook URLs.

### Security Considerations

- Ensure unique URL generation is cryptographically secure.
- Validate input to prevent SQL injection or other security vulnerabilities.
- Follow least privilege principle in database access and operations.

### Monitoring & Observability

- Monitor API response times and error rates for new endpoints.
- Set up alerts for any failures in the webhook triggering and management processes.

By following this PRD, MeshHook will introduce a robust and secure mechanism for managing unique webhook URLs per workflow, enhancing the platform's usability and security posture.

---

*This PRD was AI-generated using gpt-4-turbo-preview from GitHub issue #153*
*Generated: 2025-10-10*
