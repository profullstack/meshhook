#!/usr/bin/env node

/**
 * GitHub Project Status Manager
 * Moves issues between project board columns using GitHub CLI
 *
 * Usage:
 *   node scripts/gh-project-status.js <issue-number> --board <status>
 *
 * Status values: in-progress, done
 */

import { execSync } from 'child_process';

const PROJECT_TITLE = 'MeshHook Development';

function exec(command, silent = false) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output?.trim();
  } catch (error) {
    if (!silent) {
      console.error(`Error executing: ${command}`);
      console.error(error.message);
    }
    throw error;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3 || args[1] !== '--board') {
    console.log('Usage: node scripts/gh-project-status.js <issue-number> --board <status>');
    console.log('');
    console.log('Status values:');
    console.log('  in-progress  - Move to In Progress');
    console.log('  done         - Move to Done');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/gh-project-status.js 78 --board in-progress');
    console.log('  node scripts/gh-project-status.js 78 --board done');
    process.exit(1);
  }
  
  const issueNumber = args[0];
  const statusArg = args[2].toLowerCase();
  
  let status, emoji;
  if (statusArg === 'in-progress' || statusArg === 'progress' || statusArg === 'todo') {
    status = 'In Progress';
    emoji = '🏗️';
  } else if (statusArg === 'done' || statusArg === 'complete') {
    status = 'Done';
    emoji = '✅';
  } else {
    console.error(`Invalid status: ${statusArg}`);
    console.error('Valid options: in-progress, done');
    process.exit(1);
  }
  
  console.log(`${emoji} Moving issue #${issueNumber} to "${status}"...\n`);
  
  try {
    // First, ensure issue is added to the project
    console.log('📌 Adding issue to project (if not already added)...');
    try {
      exec(`gh issue edit ${issueNumber} --add-project "${PROJECT_TITLE}"`, true);
    } catch (e) {
      // Issue might already be in project, that's okay
    }
    
    // Note: GitHub CLI doesn't support setting project status directly yet
    // We need to use the GraphQL API for this
    console.log('⚠️  Note: GitHub CLI does not yet support setting project status directly.');
    console.log('   Please manually move the issue to the correct column in the project board:');
    console.log(`   https://github.com/orgs/profullstack/projects/6`);
    console.log('');
    console.log('   Or use the GitHub web interface to drag the issue to the correct column.');
    
  } catch (error) {
    console.error('\n❌ Failed to update issue status');
    console.error('Make sure you have the correct permissions and the project exists.');
    process.exit(1);
  }
}

main();