#!/usr/bin/env node

/**
 * GitHub Issue PRD Generator
 * Generates detailed Product Requirements Documents (PRDs) for GitHub issues
 *
 * Features:
 * - Fetches all open issues from GitHub using gh CLI
 * - Generates comprehensive PRDs based on issue metadata
 * - Saves PRDs to docs/PRDs/{issue-number}.md
 * - Updates issue bodies with PRD content and links
 * - Supports --dry-run mode for preview
 * - Can add labels to issues
 *
 * Prerequisites:
 *   - GitHub CLI installed: https://cli.github.com/
 *   - Authenticated: gh auth login
 *
 * Usage:
 *   node scripts/generate-issue-prds.mjs [--dry-run] [--labels label1,label2,...]
 *
 * Options:
 *   --dry-run           Preview PRDs without saving or updating issues
 *   --labels <labels>   Comma-separated list of labels to add to all issues
 *
 * Examples:
 *   node scripts/generate-issue-prds.mjs --dry-run
 *   node scripts/generate-issue-prds.mjs --labels hacktoberfest,good-first-issue
 *   node scripts/generate-issue-prds.mjs --dry-run --labels hacktoberfest
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const DOCS_DIR = join(PROJECT_ROOT, "docs");
const PRDS_DIR = join(PROJECT_ROOT, "docs", "PRDs");
const RATE_LIMIT_DELAY = 2000; // 2 seconds between API calls

// Helper to execute gh CLI commands
function gh(args) {
  try {
    return execSync(`gh ${args}`, { encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(`gh CLI error: ${error.message}`);
  }
}

// Get repository info
function getRepo() {
  try {
    const repo = gh("repo view --json nameWithOwner -q .nameWithOwner");
    return repo;
  } catch (error) {
    console.error("❌ Not in a GitHub repository or gh CLI not configured");
    process.exit(1);
  }
}

// Recursively read all files from a directory
function readAllFilesRecursive(dir, fileList = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip PRDs directory to avoid reading generated PRDs
      if (file !== "PRDs") {
        readAllFilesRecursive(filePath, fileList);
      }
    } else {
      const ext = extname(file);
      // Include .md and .puml files
      if (ext === ".md" || ext === ".puml") {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

// Read project context files from entire docs directory
function loadProjectContext() {
  const context = {
    files: {},
    allContent: "",
  };

  try {
    // Read all .md and .puml files from docs directory
    const docFiles = readAllFilesRecursive(DOCS_DIR);
    
    console.log(`  📄 Loading ${docFiles.length} documentation files...`);
    
    for (const filePath of docFiles) {
      try {
        const content = readFileSync(filePath, "utf8");
        const relativePath = filePath.replace(PROJECT_ROOT + "/", "");
        context.files[relativePath] = content;
        context.allContent += `\n\n--- ${relativePath} ---\n\n${content}`;
      } catch (error) {
        console.warn(`  ⚠️  Could not read ${filePath}`);
      }
    }

    // Also read TODO.md from root
    try {
      const todoPath = join(PROJECT_ROOT, "TODO.md");
      if (existsSync(todoPath)) {
        const content = readFileSync(todoPath, "utf8");
        context.files["TODO.md"] = content;
        context.allContent += `\n\n--- TODO.md ---\n\n${content}`;
      }
    } catch (error) {
      console.warn("  ⚠️  Could not read TODO.md");
    }

  } catch (error) {
    console.warn(`  ⚠️  Error loading documentation: ${error.message}`);
  }

  return context;
}

// Fetch all open issues
async function fetchOpenIssues(repo) {
  try {
    const issuesJson = gh(
      `issue list --repo ${repo} --state open --json number,title,body,milestone,labels,url --limit 1000`
    );
    return JSON.parse(issuesJson);
  } catch (error) {
    throw new Error(`Failed to fetch issues: ${error.message}`);
  }
}

// Parse issue body to extract structured information
function parseIssueBody(body) {
  const parsed = {
    phase: "",
    section: "",
    task: "",
    originalContent: body || "",
  };

  if (!body) return parsed;

  // Extract Phase
  const phaseMatch = body.match(/\*\*Phase:\*\*\s*(.+?)(?:\n|$)/i);
  if (phaseMatch) {
    parsed.phase = phaseMatch[1].trim();
  }

  // Extract Section
  const sectionMatch = body.match(/\*\*Section:\*\*\s*(.+?)(?:\n|$)/i);
  if (sectionMatch) {
    parsed.section = sectionMatch[1].trim();
  }

  // Extract Task
  const taskMatch = body.match(/\*\*Task:\*\*\s*(.+?)(?:\n|$)/i);
  if (taskMatch) {
    parsed.task = taskMatch[1].trim();
  }

  return parsed;
}

// Sanitize title for filename
function sanitizeFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80); // Limit length
}

// Generate PRD content for an issue
function generatePRD(issue, context) {
  const { number, title, body, milestone, labels, url } = issue;
  const parsed = parseIssueBody(body);
  const labelNames = labels.map((l) => l.name).join(", ");
  const milestoneName = milestone?.title || "None";

  // Extract relevant context from project docs
  const prdContent = context.files["docs/PRD.md"] || "";
  const archContent = context.files["docs/Architecture.md"] || "";
  const projectGoals = extractSection(prdContent, "## 2. Goals");
  const securityNotes = extractSection(prdContent, "## 7. Security");
  const architectureOverview = extractSection(archContent, "## Components");

  const prd = `# PRD: ${title}

**Issue:** [#${number}](${url})  
**Milestone:** ${milestoneName}  
**Labels:** ${labelNames || "None"}  
**Phase:** ${parsed.phase || "N/A"}  
**Section:** ${parsed.section || "N/A"}

---

## Overview

${generateOverview(title, parsed, context)}

## Requirements

### Functional Requirements

${generateFunctionalRequirements(title, parsed, context)}

### Non-Functional Requirements

- **Performance:** Maintain sub-second response times for user-facing operations
- **Reliability:** Ensure 99.9% uptime with proper error handling and recovery
- **Security:** Follow project security guidelines (RLS, secrets management, audit logging)
- **Maintainability:** Write clean, well-documented code following project conventions

## Technical Specifications

### Architecture Context

${architectureOverview || "See docs/Architecture.md for full system architecture."}

### Implementation Approach

${generateImplementationApproach(title, parsed, context)}

### Data Model

${generateDataModel(title, parsed, context)}

### API Endpoints (if applicable)

${generateAPIEndpoints(title, parsed)}

## Acceptance Criteria

${generateAcceptanceCriteria(title, parsed, context)}

## Dependencies

### Technical Dependencies

- Existing codebase components
- Database schema (see schema.sql)
- External services: Supabase (Postgres, Realtime, Storage)

### Prerequisite Tasks

${generatePrerequisites(parsed, context)}

## Implementation Notes

### Development Guidelines

1. Follow ESM module system (Node.js 20+)
2. Use modern JavaScript (ES2024+) features
3. Implement comprehensive error handling
4. Write tests before implementation (TDD)
5. Ensure code passes ESLint and Prettier checks

### Testing Strategy

- **Unit Tests:** Test individual functions and modules
- **Integration Tests:** Test component interactions
- **E2E Tests:** Test complete user workflows (where applicable)

### Security Considerations

${securityNotes || "- Follow RLS policies\n- Implement proper input validation\n- Use parameterized queries\n- Mask sensitive data in logs"}

### Monitoring & Observability

- Add appropriate logging for debugging
- Track key metrics (response times, error rates)
- Set up alerts for critical failures
- Use Supabase Realtime for live updates where needed

## Related Documentation

- [Main PRD](../PRD.md)
- [Architecture](../Architecture.md)
- [Security Guidelines](../Security.md)
- [Operations Guide](../Operations.md)

## Task Details

**Original Task Description:**
${parsed.task || title}

**Full Issue Body:**
${parsed.originalContent}

---

*This PRD was auto-generated from GitHub issue #${number}*  
*Last updated: ${new Date().toISOString().split("T")[0]}*
`;

  return prd;
}

// Helper to extract sections from markdown
function extractSection(content, heading) {
  if (!content) return "";

  const lines = content.split("\n");
  const startIdx = lines.findIndex((line) => line.startsWith(heading));

  if (startIdx === -1) return "";

  const endIdx = lines.findIndex(
    (line, idx) => idx > startIdx && line.match(/^##\s/)
  );

  const sectionLines =
    endIdx === -1 ? lines.slice(startIdx + 1) : lines.slice(startIdx + 1, endIdx);

  return sectionLines.join("\n").trim();
}

// Generate overview section
function generateOverview(title, parsed, context) {
  const phase = parsed.phase || "implementation";
  const section = parsed.section || "development";

  return `This task is part of ${phase} in the ${section} section of the MeshHook project. 

**MeshHook** is a webhook-first, deterministic, Postgres-native workflow engine that delivers n8n's visual simplicity and Temporal's durability without restrictive licensing.

**Task Objective:** ${title}

This implementation should align with the project's core goals of providing:
- Webhook triggers with signature verification
- Visual DAG builder using SvelteKit/Svelte 5
- Durable, replayable runs via event sourcing
- Live logs via Supabase Realtime
- Multi-tenant RLS security`;
}

// Generate functional requirements
function generateFunctionalRequirements(title, parsed, context) {
  const taskLower = title.toLowerCase();

  let requirements = `1. Implement the core functionality described in the task: "${title}"\n`;

  // Add context-specific requirements based on keywords
  if (taskLower.includes("api") || taskLower.includes("endpoint")) {
    requirements += `2. Create RESTful API endpoint(s) following project conventions\n`;
    requirements += `3. Implement proper request validation and error handling\n`;
    requirements += `4. Return appropriate HTTP status codes and response formats\n`;
  }

  if (taskLower.includes("database") || taskLower.includes("schema")) {
    requirements += `2. Design database schema following normalization principles\n`;
    requirements += `3. Implement RLS policies for multi-tenant security\n`;
    requirements += `4. Create necessary indexes for query performance\n`;
  }

  if (taskLower.includes("ui") || taskLower.includes("component")) {
    requirements += `2. Create reusable Svelte 5 components\n`;
    requirements += `3. Implement responsive design for mobile and desktop\n`;
    requirements += `4. Follow project UI/UX patterns and styling\n`;
  }

  if (taskLower.includes("test")) {
    requirements += `2. Write comprehensive test coverage (unit, integration, e2e)\n`;
    requirements += `3. Ensure all tests pass before merging\n`;
    requirements += `4. Document test scenarios and edge cases\n`;
  }

  requirements += `5. Document all public APIs and interfaces\n`;
  requirements += `6. Follow project coding standards and best practices\n`;

  return requirements;
}

// Generate implementation approach
function generateImplementationApproach(title, parsed, context) {
  return `The implementation should follow these steps:

1. **Analysis:** Review existing codebase and identify integration points
2. **Design:** Create detailed technical design considering:
   - Data structures and schemas
   - API contracts and interfaces
   - Component architecture
   - Error handling strategies
3. **Implementation:** Write code following TDD approach:
   - Write tests first
   - Implement minimal code to pass tests
   - Refactor for clarity and performance
4. **Integration:** Ensure seamless integration with existing components
5. **Testing:** Comprehensive testing at all levels
6. **Documentation:** Update relevant documentation
7. **Review:** Code review and feedback incorporation

**Key Considerations:**
- Maintain backward compatibility where applicable
- Follow event sourcing patterns for state changes
- Use Postgres for durable storage
- Implement proper error handling and logging
- Consider rate limiting and resource constraints`;
}

// Generate data model section
function generateDataModel(title, parsed, context) {
  const taskLower = title.toLowerCase();

  if (
    taskLower.includes("database") ||
    taskLower.includes("schema") ||
    taskLower.includes("table")
  ) {
    return `Define the data model including:

- **Tables:** List all new or modified tables
- **Columns:** Specify column names, types, and constraints
- **Relationships:** Define foreign keys and relationships
- **Indexes:** Identify columns that need indexing
- **RLS Policies:** Define row-level security policies

Refer to \`schema.sql\` for existing schema and follow established patterns.`;
  }

  return `No new data model changes required for this task. If data model changes are needed during implementation, update \`schema.sql\` and document changes here.`;
}

// Generate API endpoints section
function generateAPIEndpoints(title, parsed) {
  const taskLower = title.toLowerCase();

  if (taskLower.includes("api") || taskLower.includes("endpoint")) {
    return `Define API endpoints:

### Endpoint 1: [Method] /path/to/endpoint

**Request:**
\`\`\`json
{
  "field": "value"
}
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

**Error Responses:**
- 400: Bad Request - Invalid input
- 401: Unauthorized - Authentication required
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource not found
- 500: Internal Server Error - Server error

Add additional endpoints as needed.`;
  }

  return `No new API endpoints required for this task.`;
}

// Generate acceptance criteria
function generateAcceptanceCriteria(title, parsed, context) {
  return `- [ ] Core functionality implemented and working as described
- [ ] All tests passing (unit, integration, e2e where applicable)
- [ ] Code follows project conventions and passes linting
- [ ] Documentation updated (code comments, README, API docs)
- [ ] Security considerations addressed (RLS, input validation, etc.)
- [ ] Performance requirements met (response times, resource usage)
- [ ] Error handling implemented with clear error messages
- [ ] Changes reviewed and approved by team
- [ ] No breaking changes to existing functionality
- [ ] Database migrations created if schema changes made
- [ ] Manual testing completed in development environment

**Definition of Done:**
- Code merged to main branch
- All CI/CD checks passing
- Documentation complete and accurate
- Ready for deployment to production`;
}

// Generate prerequisites
function generatePrerequisites(parsed, context) {
  const phase = parsed.phase || "";

  if (phase.includes("Phase 1")) {
    return `- Project setup and infrastructure (if not already complete)
- Database schema initialized
- Development environment configured`;
  }

  return `- Previous phase tasks completed
- Dependencies installed and configured
- Development environment ready
- Access to required services (Supabase, etc.)`;
}

// Save PRD to file
function savePRD(issueNumber, issueTitle, content, dryRun = false) {
  if (dryRun) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`PRD Preview for Issue #${issueNumber}`);
    console.log("=".repeat(80));
    console.log(content);
    console.log("=".repeat(80));
    return null;
  }

  // Create PRDs directory if it doesn't exist
  if (!existsSync(PRDS_DIR)) {
    mkdirSync(PRDS_DIR, { recursive: true });
    console.log(`  📁 Created directory: ${PRDS_DIR}`);
  }

  const sanitizedTitle = sanitizeFilename(issueTitle);
  const filename = join(PRDS_DIR, `${issueNumber}-${sanitizedTitle}.md`);
  writeFileSync(filename, content, "utf8");

  return filename;
}

// Parse command line arguments
function parseArgs() {
  const args = {
    dryRun: false,
    labels: [],
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--labels" && i + 1 < process.argv.length) {
      // Parse comma-separated labels
      args.labels = process.argv[i + 1]
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label.length > 0);
      i++; // Skip next arg since we consumed it
    }
  }

  return args;
}

// Check if issue already has PRD section
function hasPRDSection(body) {
  return body?.includes("## 📋 Product Requirements Document") || false;
}

// Add labels to an issue
async function addLabelsToIssue(repo, issueNumber, labels, dryRun = false) {
  if (!labels || labels.length === 0) {
    return true;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would add labels: ${labels.join(", ")}`);
    return true;
  }

  try {
    // Get existing labels
    const existingLabelsJson = gh(
      `api repos/${repo}/issues/${issueNumber} --jq '.labels[].name'`
    );
    const existingLabels = existingLabelsJson
      .split("\n")
      .filter((l) => l.trim().length > 0);

    // Combine with new labels (avoid duplicates)
    const allLabels = [...new Set([...existingLabels, ...labels])];

    // Add labels to issue
    const labelArgs = allLabels.map((l) => `-a labels="${l}"`).join(" ");
    gh(`api repos/${repo}/issues/${issueNumber} ${labelArgs} -X PATCH`);

    return true;
  } catch (error) {
    console.error(
      `  ⚠️  Could not add labels to issue #${issueNumber}: ${error.message}`
    );
    return false;
  }
}

// Update issue body with PRD content and link
async function updateIssueBody(repo, issueNumber, issueTitle, originalBody, prdContent, dryRun = false) {
  const sanitizedTitle = sanitizeFilename(issueTitle);
  const prdFilename = `${issueNumber}-${sanitizedTitle}.md`;
  const prdLink = `\n\n---\n\n## 📋 Product Requirements Document\n\n**Full PRD:** [docs/PRDs/${prdFilename}](https://github.com/${repo}/blob/main/docs/PRDs/${prdFilename})\n\n<details>\n<summary>View PRD Content</summary>\n\n${prdContent}\n\n</details>`;

  // Check if PRD section already exists
  if (hasPRDSection(originalBody)) {
    console.log(`  ⏭️  Issue #${issueNumber} already has PRD section - skipping update`);
    return true; // Return true since no update is needed
  }

  // Append PRD section to original body
  const newBody = (originalBody || "") + prdLink;

  if (dryRun) {
    console.log(`  [DRY RUN] Would append PRD section to issue #${issueNumber}`);
    return true;
  }

  try {
    // Escape the body content for shell
    const escapedBody = newBody
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    gh(`api repos/${repo}/issues/${issueNumber} -f body="${escapedBody}"`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to update issue #${issueNumber}: ${error.message}`);
    return false;
  }
}

// Main function
async function generateIssuePRDs(args) {
  const { dryRun, labels } = args;
  
  console.log("📋 GitHub Issue PRD Generator\n");

  // Check gh CLI
  try {
    gh("--version");
  } catch {
    console.error("❌ GitHub CLI (gh) is not installed");
    console.error("Install it from: https://cli.github.com/");
    process.exit(1);
  }

  // Check auth
  try {
    gh("auth status");
    console.log("✓ GitHub CLI authenticated");
  } catch {
    console.error("❌ Not authenticated with GitHub");
    console.error("Run: gh auth login");
    process.exit(1);
  }

  const repo = getRepo();
  console.log(`📦 Repository: ${repo}`);

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
  }
  
  if (labels.length > 0) {
    console.log(`🏷️  Labels to add: ${labels.join(", ")}`);
  }
  
  console.log();

  // Load project context
  console.log("\n📖 Loading project context...");
  const context = loadProjectContext();
  const fileCount = Object.keys(context.files).length;
  console.log(`  ✓ Loaded ${fileCount} documentation files`);

  // Fetch open issues
  console.log("\n🔍 Fetching open issues...");
  const issues = await fetchOpenIssues(repo);
  console.log(`  ✓ Found ${issues.length} open issues\n`);

  if (issues.length === 0) {
    console.log("✅ No open issues to process");
    return;
  }

  // Process each issue
  let processedCount = 0;
  let errorCount = 0;

  for (const issue of issues) {
    console.log(`\n📝 Processing Issue #${issue.number}: ${issue.title}`);

    try {
      // Check if issue already has PRD section
      if (hasPRDSection(issue.body)) {
        console.log(`  ⏭️  Already has PRD - skipping`);
        processedCount++;
        continue;
      }

      // Generate PRD
      const prdContent = generatePRD(issue, context);

      // Save PRD to file
      const filename = savePRD(issue.number, issue.title, prdContent, dryRun);
      if (filename) {
        console.log(`  ✓ Saved PRD to: ${filename}`);
      }

      // Update issue body (append PRD section)
      const updated = await updateIssueBody(
        repo,
        issue.number,
        issue.title,
        issue.body,
        prdContent,
        dryRun
      );

      if (updated) {
        console.log(`  ✓ Appended PRD section to issue #${issue.number}`);
      } else {
        errorCount++;
      }

      // Add labels if specified
      if (labels.length > 0) {
        const labelsAdded = await addLabelsToIssue(
          repo,
          issue.number,
          labels,
          dryRun
        );
        
        if (labelsAdded) {
          console.log(`  ✓ Added labels: ${labels.join(", ")}`);
        }
      }

      processedCount++;

      // Rate limiting delay
      if (!dryRun && issues.indexOf(issue) < issues.length - 1) {
        console.log(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s to avoid rate limiting...`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (error) {
      console.error(`  ✗ Error processing issue #${issue.number}: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log(`✅ Processed ${processedCount} issues`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors encountered`);
  }

  if (!dryRun) {
    console.log(`\n📁 PRDs saved to: ${PRDS_DIR}`);
    console.log(`🔗 View issues: https://github.com/${repo}/issues`);
  } else {
    console.log("\n🔍 DRY RUN complete - no changes were made");
    console.log("   Run without --dry-run to save PRDs and update issues");
  }
}

// Run the generator
const args = parseArgs();
generateIssuePRDs(args).catch((error) => {
  console.error("❌ PRD generation failed:", error.message);
  process.exit(1);
});