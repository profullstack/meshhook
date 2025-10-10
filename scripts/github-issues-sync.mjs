#!/usr/bin/env node

/**
 * GitHub Issues Sync Script
 * Syncs TODO.md with GitHub issues using gh CLI
 *
 * Features:
 * - Creates milestones from ## headings
 * - Creates labels from ### headings
 * - Creates issues from - [ ] checkboxes
 * - Links issues to milestones
 * - Handles indented sub-tasks
 *
 * Prerequisites:
 *   - GitHub CLI installed: https://cli.github.com/
 *   - Authenticated: gh auth login
 *
 * Usage:
 *   node scripts/github-issues-sync.js [--clean]
 *
 * Options:
 *   --clean  Delete all existing milestones and labels before syncing
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";

const TODO_FILE = "TODO.md";

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

// Check if issue exists by title (only check open issues)
async function issueExists(repo, title) {
  try {
    const result = gh(
      `issue list --repo ${repo} --search "in:title ${title}" --state open --json number --jq '.[0].number'`
    );
    return result ? parseInt(result) : null;
  } catch {
    return null;
  }
}

// Get or create milestone
async function getOrCreateMilestone(repo, title, description) {
  try {
    // Check if milestone exists (including closed ones)
    const milestones = JSON.parse(
      gh(`api repos/${repo}/milestones?state=all --jq '.'`)
    );
    const existing = milestones.find((m) => m.title === title);

    if (existing) {
      // If milestone is closed, reopen it
      if (existing.state === 'closed') {
        console.log(`  🔄 Reopening closed milestone: ${title}`);
        gh(`api repos/${repo}/milestones/${existing.number} -f state=open`);
      }
      return existing.number;
    }

    // Create new milestone
    const result = JSON.parse(
      gh(
        `api repos/${repo}/milestones -f title="${title}" -f description="${description}" --jq '.'`
      )
    );
    return result.number;
  } catch (error) {
    console.error(`  ✗ Failed to create milestone: ${error.message}`);
    return null;
  }
}

// Ensure label exists
async function ensureLabel(repo, labelName) {
  try {
    // Try to get the label (URL encode the label name)
    const encodedLabel = encodeURIComponent(labelName);
    gh(`api repos/${repo}/labels/${encodedLabel}`);
    return true;
  } catch {
    // Label doesn't exist, create it
    try {
      const color = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      gh(`api repos/${repo}/labels -f name="${labelName}" -f color="${color}"`);
      console.log(`  ✓ Created label: ${labelName}`);
      return true;
    } catch (error) {
      console.error(`  ⚠️  Could not create label '${labelName}': ${error.message}`);
      return false;
    }
  }
}

// Create a regular issue (without milestone, add it separately)
async function createIssue(repo, title, body, labels) {
  try {
    // Escape strings properly for shell
    const escapedTitle = title.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    const labelStr = labels.join(",");
    let cmd = `issue create --repo ${repo} --title "${escapedTitle}" --body "${escapedBody}"`;
    
    if (labelStr) {
      cmd += ` --label "${labelStr}"`;
    }

    const url = gh(cmd);
    const match = url.match(/\/issues\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (error) {
    console.error(`  ✗ Failed to create issue: ${error.message}`);
    return null;
  }
}

// Add milestone to an existing issue
async function addMilestoneToIssue(repo, issueNumber, milestoneNumber) {
  try {
    gh(`api repos/${repo}/issues/${issueNumber} -F milestone=${milestoneNumber}`);
    return true;
  } catch (error) {
    console.error(`  ⚠️  Could not add milestone to issue #${issueNumber}: ${error.message}`);
    return false;
  }
}

// Parse TODO.md structure (first pass)
function parseTodoStructure(content) {
  const lines = content.split("\n");
  const milestones = new Map();
  const labels = new Set();
  const tasks = [];

  let currentPhase = "";
  let currentPhaseLabel = "";
  let currentPhaseCompleted = false;
  let currentSection = "";
  let currentSectionLabel = "";

  for (const line of lines) {
    // Detect phase headers (## ... Phase X: Name)
    // Also check for completion markers like ✅ or (COMPLETED)
    // Match any emoji or no emoji at all
    const phaseMatch = line.match(/^##\s+(?:[\u{1F300}-\u{1F9FF}]|\u{2600}-\u{26FF}|\u{2700}-\u{27BF})?\s*Phase\s+(\d+):\s+(.+?)(?:\s+\(COMPLETED\))?$/u);
    if (phaseMatch) {
      const phaseNum = phaseMatch[1];
      const phaseName = phaseMatch[2];
      currentPhase = `Phase ${phaseNum}`;
      currentPhaseLabel = `phase-${phaseNum}`;
      currentSection = "";
      currentSectionLabel = "";

      // Check if phase is completed (marked with ✅ or (COMPLETED))
      currentPhaseCompleted = line.includes('✅') || line.includes('(COMPLETED)');
      
      if (!currentPhaseCompleted) {
        const milestoneTitle = `${currentPhase}: ${phaseName}`;
        const milestoneDesc = `Tracking all tasks for ${currentPhase}`;
        
        milestones.set(milestoneTitle, {
          title: milestoneTitle,
          description: milestoneDesc,
          phase: currentPhase,
        });
      }

      // Don't add phase labels - phases are milestones, not labels
      continue;
    }

    // Detect section headers (### Section Name)
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch) {
      // Skip sections in completed phases
      if (currentPhaseCompleted) {
        continue;
      }
      
      const sectionName = sectionMatch[1];
      currentSection = sectionName;
      currentSectionLabel = sectionName
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-");
      
      if (currentSectionLabel) {
        labels.add(currentSectionLabel);
      }
      continue;
    }

    // Detect unchecked tasks (- [ ] Task) with any indentation
    const taskMatch = line.match(/^(\s*)-\s+\[\s+\]\s+(.+)$/);
    if (taskMatch) {
      // Skip tasks in completed phases
      if (currentPhaseCompleted) {
        continue;
      }
      
      const indent = taskMatch[1].length;
      const task = taskMatch[2];
      const cleanTask = task.replace(/`/g, "").trim();

      const title = cleanTask;

      const taskLabels = [];
      if (currentSectionLabel) {
        taskLabels.push(currentSectionLabel);
      }

      const body = `**Phase:** ${currentPhase}
**Section:** ${currentSection || "N/A"}

**Task:** ${task}

---
_Auto-generated from TODO.md_`;

      tasks.push({
        title,
        cleanTask,
        body,
        labels: taskLabels,
        phase: currentPhase,
        indent,
      });
    }
  }

  // Add default GitHub labels
  const defaultLabels = [
    'bug',
    'documentation',
    'duplicate',
    'enhancement',
    'good first issue',
    'help wanted',
    'invalid',
    'question',
    'wontfix'
  ];
  
  for (const label of defaultLabels) {
    labels.add(label);
  }

  return { milestones: Array.from(milestones.values()), labels: Array.from(labels), tasks };
}

// Clean up existing milestones, labels, and issues
async function cleanupGitHub(repo) {
  console.log("🧹 Cleaning up existing issues, milestones, and labels...\n");

  // Close all open issues
  try {
    const issues = JSON.parse(
      gh(`api repos/${repo}/issues?state=open --jq '.'`)
    );
    
    for (const issue of issues) {
      try {
        gh(`api repos/${repo}/issues/${issue.number} -f state=closed`);
        console.log(`  🗑️  Closed issue #${issue.number}: ${issue.title}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  ⚠️  Could not close issue #${issue.number}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`  ⚠️  Could not fetch issues: ${error.message}`);
  }

  // Delete all milestones
  try {
    const milestones = JSON.parse(
      gh(`api repos/${repo}/milestones?state=all --jq '.'`)
    );
    
    for (const milestone of milestones) {
      try {
        gh(`api repos/${repo}/milestones/${milestone.number} -X DELETE`);
        console.log(`  🗑️  Deleted milestone: ${milestone.title}`);
      } catch (error) {
        console.error(`  ⚠️  Could not delete milestone ${milestone.title}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`  ⚠️  Could not fetch milestones: ${error.message}`);
  }

  // Delete all labels (be careful - this deletes ALL labels)
  try {
    const labels = JSON.parse(
      gh(`api repos/${repo}/labels --jq '.'`)
    );
    
    for (const label of labels) {
      try {
        gh(`api repos/${repo}/labels/${encodeURIComponent(label.name)} -X DELETE`);
        console.log(`  🗑️  Deleted label: ${label.name}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  ⚠️  Could not delete label ${label.name}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`  ⚠️  Could not fetch labels: ${error.message}`);
  }

  console.log("\n✅ Cleanup complete\n");
}

// Parse TODO.md and sync with GitHub (two-pass approach)
async function syncTodoWithGitHub(shouldClean = false) {
  console.log("🔄 GitHub Issues Sync (Two-Pass)\n");

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
  console.log(`📦 Repository: ${repo}\n`);

  // Clean up if requested
  if (shouldClean) {
    await cleanupGitHub(repo);
    console.log("✅ Cleanup complete. Run without --clean to recreate milestones and issues.\n");
    return;
  }

  // Read and parse TODO.md
  const content = readFileSync(TODO_FILE, "utf8");
  console.log("📖 Pass 1: Parsing TODO.md structure...");
  const { milestones, labels, tasks } = parseTodoStructure(content);
  
  console.log(`   Found ${milestones.length} milestones, ${labels.length} labels, ${tasks.length} tasks\n`);

  // Pass 2: Create all milestones and labels
  console.log("🏗️  Pass 2: Creating milestones and labels...\n");
  
  const milestoneMap = new Map();
  let milestoneCount = 0;

  for (const milestone of milestones) {
    const milestoneNumber = await getOrCreateMilestone(
      repo,
      milestone.title,
      milestone.description
    );
    
    if (milestoneNumber) {
      milestoneMap.set(milestone.title, milestoneNumber);
      console.log(`  📍 Milestone: ${milestone.title} (#${milestoneNumber})`);
      milestoneCount++;
    }
  }

  // Wait for milestones to propagate in GitHub's system
  if (milestoneCount > 0) {
    console.log(`\n⏳ Waiting 5 seconds for milestones to propagate...\n`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log();
  let labelIndex = 0;
  for (const label of labels) {
    labelIndex++;
    console.log(`  [${labelIndex}/${labels.length}] Creating label: ${label}...`);
    const created = await ensureLabel(repo, label);
    if (!created) {
      console.log(`  ⚠️  Skipped label: ${label}`);
    }
    // Delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Wait for labels to propagate before creating issues
  if (labels.length > 0) {
    console.log(`\n⏳ Waiting 5 seconds for labels to propagate...\n`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Pass 3: Create all issues
  console.log("📝 Pass 3: Creating issues...\n");
  
  let issueCount = 0;
  let skipCount = 0;
  let taskIndex = 0;

  for (const task of tasks) {
    taskIndex++;
    // Check if exists
    const existing = await issueExists(repo, task.cleanTask);
    if (existing) {
      console.log(`  [${taskIndex}/${tasks.length}] ⏭️  Skipping (exists #${existing}): ${task.cleanTask}`);
      skipCount++;
      continue;
    }

    console.log(`  [${taskIndex}/${tasks.length}] Creating: ${task.cleanTask}...`);

    // Find milestone number by matching phase
    const milestoneNumber = Array.from(milestoneMap.entries())
      .find(([title]) => title.startsWith(task.phase))
      ?.[1] || null;

    // Debug: log milestone lookup
    if (!milestoneNumber) {
      console.log(`  ⚠️  Warning: No milestone found for phase "${task.phase}"`);
      console.log(`     Available milestones:`, Array.from(milestoneMap.keys()));
      console.log(`     Task title: ${task.title}`);
    } else {
      console.log(`  🔗 Using milestone #${milestoneNumber} for: ${task.cleanTask}`);
    }

    // Create issue without milestone first
    const issueNum = await createIssue(
      repo,
      task.title,
      task.body,
      task.labels
    );

    if (issueNum) {
      const prefix = task.indent > 0 ? "  ".repeat(task.indent / 2) + "└─" : "";
      console.log(`  ${prefix}✓ Created #${issueNum}`);
      
      // Add milestone separately if available
      if (milestoneNumber) {
        const added = await addMilestoneToIssue(repo, issueNum, milestoneNumber);
        if (added) {
          console.log(`  ${prefix}  📍 Added to milestone #${milestoneNumber}`);
        }
      }
      
      issueCount++;

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Created ${milestoneCount} milestones and ${issueCount} issues`);
  if (skipCount > 0) {
    console.log(`⏭️  Skipped ${skipCount} existing items`);
  }
  console.log(`\nView issues: gh issue list --repo ${repo}`);
  console.log(`View milestones: gh api repos/${repo}/milestones --jq '.[] | "\\(.number): \\(.title)"'`);
  console.log(`Or visit: https://github.com/${repo}/issues`);
}

// Run the sync
const shouldClean = process.argv.includes('--clean');
syncTodoWithGitHub(shouldClean).catch((error) => {
  console.error("❌ Sync failed:", error.message);
  process.exit(1);
});