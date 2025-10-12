# PRD: Unique webhook URLs per workflow

**Issue:** [#153](https://github.com/profullstack/meshhook/issues/153)
**Milestone:** Phase 5: Webhook System
**Labels:** webhook-triggers, hacktoberfest

---

# PRD: Unique Webhook URLs per Workflow

## Overview

The purpose of this task is to enhance the security and operational efficiency of MeshHook by implementing unique webhook URLs for each workflow. This feature is critical for preventing unauthorized access, improving the granularity of access controls, and enabling detailed monitoring and analytics on a per-workflow basis. It directly aligns with MeshHook's goals of security and scalability, building upon its foundational webhook triggers with signature verification and multi-tenant RLS security model.

## Functional Requirements

1. **Unique URL Generation**: Automatically generate a secure, unguessable URL for each workflow's webhook trigger upon creation or request.
2. **Webhook Management Interface**: Provide UI and API capabilities for users to create, view, and delete webhook URLs associated with their workflows.
3. **Signature Verification Update**: Adjust the existing signature verification process to accommodate and authenticate requests to the new unique URLs.
4. **Existing Workflow Compatibility**: Develop a seamless migration approach for existing workflows to adopt unique webhook URLs without service interruption or manual intervention.
5. **Comprehensive Documentation**: Update the MeshHook documentation to include clear instructions and examples for managing and utilizing unique webhook URLs.

## Non-Functional Requirements

- **Performance**: Ensure the system can generate, resolve, and verify unique webhook URLs without noticeable latency or degradation in webhook processing times.
- **Security**: Utilize secure methods for URL generation and storage to prevent unauthorized discovery or access to webhook endpoints.
- **Reliability**: Guarantee high availability and error handling for the webhook management system, ensuring no loss of functionality or data.
- **Maintainability**: Code related to unique webhook URLs should be clear, well-organized, and easily extendable for future enhancements.

## Technical Specifications

### Architecture Context

MeshHook's architecture will require updates across several components to support unique webhook URLs:

- **Database (Postgres)**: Introduce schema modifications for storing and managing unique webhook URLs.
- **SvelteKit (Backend + SSR/API)**: Develop backend logic for URL management and integrate these capabilities into the existing SvelteKit frontend.
- **Supabase Realtime**: Expand the use of Supabase Realtime to provide live feedback on webhook activities, as relevant.

### Implementation Approach

1. **Schema Design**: Add a `unique_url` column to the `webhooks` table, ensuring it supports uniqueness and secure storage.
2. **Backend Logic**:
   - Implement a secure URL generator that creates unique and unguessable webhook URLs.
   - Modify the webhook triggering logic to validate incoming requests against the unique URLs.
3. **API Extensions**:
   - Develop endpoints for webhook URL management: creation, retrieval, and deletion.
4. **Frontend Updates**:
   - Integrate new API endpoints into the SvelteKit frontend, allowing users to manage webhook URLs within the existing workflow UI.
5. **Migration Tooling**:
   - Create scripts or utilities to update existing workflows with unique webhook URLs, prioritizing backward compatibility.
6. **Testing and Documentation**:
   - Ensure comprehensive test coverage for new features and update documentation to guide users on managing webhook URLs.

### Data Model Changes

- `webhooks` table:
  - Add `unique_url` VARCHAR column, with a unique constraint.

### API Endpoints

- `POST /api/webhooks/{workflow_id}/generate`: Generate a new unique webhook URL for the specified workflow.
- `GET /api/webhooks/{workflow_id}`: Retrieve the webhook's details, including its unique URL.
- `DELETE /api/webhooks/{workflow_id}`: Remove the unique webhook URL from the specified workflow.

## Acceptance Criteria

- [ ] Unique webhook URLs are automatically generated for new and existing workflows.
- [ ] Users can manage webhook URLs via both UI and API.
- [ ] Signature verification processes requests to unique webhook URLs accurately.
- [ ] Documentation accurately reflects how to manage webhook URLs.
- [ ] Migration tooling successfully updates existing workflows without disruption.

## Dependencies and Prerequisites

- Access to MeshHook's GitHub repository for code changes.
- Necessary permissions on Supabase and Postgres instances for schema updates.
- Familiarity with the SvelteKit framework for frontend modifications.

## Implementation Notes

### Development Guidelines

- Adhere to MeshHook's existing coding standards, utilizing TypeScript for backend and frontend changes.
- Ensure new database operations follow best security practices, such as parameterized queries to prevent SQL injection.

### Testing Strategy

- **Unit Tests**: Cover new logic for URL generation and signature verification with unit tests.
- **Integration Tests**: Test the API endpoints in conjunction with the database to ensure correct behavior.
- **End-to-End Tests**: Validate the entire workflow of creating, using, and deleting unique webhook URLs through automated UI tests.

### Security Considerations

- Use cryptographically secure methods for generating unique URLs to prevent enumeration attacks.
- Ensure that the migration of existing workflows to unique URLs does not expose sensitive information or introduce vulnerabilities.

### Monitoring & Observability

- Implement monitoring for the new API endpoints, tracking success rates, error rates, and performance metrics.
- Set up alerts for critical failures in the webhook URL management and triggering processes.

By systematically addressing these requirements and specifications, MeshHook will enhance its security and functionality with the introduction of unique webhook URLs, providing users with a more secure and efficient platform for managing their workflows.

---

*This PRD was AI-generated using gpt-4-turbo-preview from GitHub issue #153*
*Generated: 2025-10-10*
