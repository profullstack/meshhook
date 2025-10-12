# PRD: Version management (Draft → Publish)

**Issue:** [#128](https://github.com/profullstack/meshhook/issues/128)
**Milestone:** Phase 3: Frontend (SvelteKit)
**Labels:** workflow-management, hacktoberfest

---

# PRD: Version Management (Draft → Publish)

**Issue:** [#128](https://github.com/profullstack/meshhook/issues/128)  
**Milestone:** Phase 3: Frontend (SvelteKit)  
**Labels:** workflow-management  
**Phase:** Phase 3  
**Section:** Workflow Management

---

## 1. Overview

### Purpose

The Version Management feature is a critical component of the MeshHook project, enabling users to transition workflow definitions from a draft state to a published version. This feature is aligned with MeshHook's goal to provide a robust, user-friendly workflow engine that supports deterministic, replayable runs with version control capabilities. It ensures that users can develop and test workflows thoroughly before committing them as immutable published versions for execution.

### Alignment with Project Goals

- **Visual Simplicity and Durability:** By integrating version management seamlessly with the SvelteKit-based frontend, we maintain the visual simplicity of workflow editing while ensuring the durability of published workflows.
- **Deterministic, Replayable Runs:** Version management supports the deterministic nature of MeshHook by allowing users to publish tested versions, ensuring consistent, replayable runs.

## 2. Requirements

### Functional Requirements

1. **Version Drafting:** Users must be able to create and edit draft versions of workflows.
2. **Publishing Workflow:** Users must be able to publish a draft, transitioning it to an immutable published version.
3. **Version History:** The system must track and display a history of published versions for each workflow.
4. **Version Reversion:** Users should be able to revert a draft to a previously published version.
5. **API Documentation:** Document all public APIs involved in version management.
6. **Conventions and Standards:** Adhere to MeshHook coding standards and best practices.

### Non-Functional Requirements

- **Performance:** Version management operations should complete within 500ms to ensure a responsive UI.
- **Reliability:** Achieve 99.9% uptime for the version management feature.
- **Security:** Implement RLS and other security measures to protect version data.
- **Maintainability:** Code should be clean, well-documented, and easy to maintain.

## 3. Technical Specifications

### Architecture Context

- **Integration Points:** Version management will integrate with the existing SvelteKit frontend for workflow editing and the Supabase-backed Postgres database for persisting version data.
- **Components:** This feature interacts primarily with the workflow definition storage and the UI components for workflow editing and publishing.

### Implementation Approach

1. **Analysis:** Examine the current workflow editing and storage mechanisms.
2. **Design:**
   - Define data schema changes for storing version information.
   - Design UI changes for handling draft and publish operations.
   - Outline API modifications or additions needed.
3. **Implementation:**
   - Extend the workflow schema in Postgres to include versioning attributes.
   - Implement frontend changes in SvelteKit for version management.
   - Update or create API endpoints for version operations.
4. **Testing:** Write unit and integration tests covering new functionality.
5. **Documentation:** Update API and feature documentation.
6. **Review and Feedback:** Iterate based on team feedback.

### Data Model Changes

- Add `workflow_versions` table with fields: `id`, `workflow_id`, `version_number`, `state`, `created_at`, and `published_at`.
- Update `workflows` table to include a `current_version_id` field.

### API Endpoints

- `POST /workflows/{id}/versions`: Create a new draft version.
- `POST /workflows/{id}/versions/publish`: Publish the current draft version.
- `GET /workflows/{id}/versions`: List versions of a workflow.

## 4. Acceptance Criteria

- [ ] Users can create and edit draft versions of workflows.
- [ ] Users can publish drafts as immutable versions.
- [ ] A history of published versions is accessible.
- [ ] Drafts can be reverted to previous versions.
- [ ] API endpoints for version management are documented.
- [ ] All new code is covered by unit and integration tests.
- [ ] Performance, security, and maintainability standards are met.

## 5. Dependencies and Prerequisites

- Access to the existing MeshHook codebase and development environment.
- Supabase project access for database schema modifications.

## 6. Implementation Notes

### Development Guidelines

- Follow the existing module system and JavaScript feature usage.
- Prioritize comprehensive error handling.
- Employ TDD for reliability.

### Testing Strategy

- **Unit Tests:** For backend logic and utility functions.
- **Integration Tests:** For API endpoints and interaction with the database.
- **UI Tests:** To ensure version management workflows perform as expected in the frontend.

### Security Considerations

- Implement RLS for the `workflow_versions` table.
- Ensure all version management operations are authorized.

### Monitoring & Observability

- Log key actions in the version management process.
- Monitor performance metrics for version management operations.

## 7. Related Documentation

- [Main PRD](../PRD.md)
- [Architecture Diagrams](../diagrams/)
- [Security Guidelines](../Security.md)

*This document is a detailed expansion on the requirements and approach for implementing the Version Management feature (Draft → Publish) for the MeshHook project. It is designed to guide the development team through the planning, implementation, and release phases.*

---

*This PRD was AI-generated using gpt-4-turbo-preview from GitHub issue #128*
*Generated: 2025-10-10*
