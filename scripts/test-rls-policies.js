#!/usr/bin/env node

/**
 * Test script for Row Level Security (RLS) policies
 * 
 * This script verifies that RLS policies correctly enforce multi-tenant data isolation.
 * It creates test users and projects, then verifies that users can only access their own data.
 * 
 * Usage: node scripts/test-rls-policies.js
 */

import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env') });
config({ path: join(rootDir, '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

// Test data
const testUsers = {
  user1: '11111111-1111-1111-1111-111111111111',
  user2: '22222222-2222-2222-2222-222222222222',
};

let testData = {
  user1: {},
  user2: {},
};

/**
 * Execute query as a specific user by setting the JWT claim
 */
async function queryAsUser(userId, query, params = []) {
  const client = await pool.connect();
  try {
    // Set the user context for RLS
    await client.query(`SELECT set_config('request.jwt.claims', '{"sub":"${userId}"}', true)`);
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute query as admin (bypassing RLS)
 */
async function queryAsAdmin(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Clean up test data
 */
async function cleanup() {
  log.section('🧹 Cleaning up test data...');
  
  try {
    // Delete test projects (cascades to all related tables)
    await queryAsAdmin(
      'DELETE FROM projects WHERE owner = ANY($1)',
      [[testUsers.user1, testUsers.user2]]
    );
    log.success('Test data cleaned up');
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  log.section('📝 Setting up test data...');
  
  try {
    // Create projects for user1
    const user1Projects = await queryAsUser(
      testUsers.user1,
      `INSERT INTO projects (owner, name) 
       VALUES ($1, 'User1 Project 1'), ($1, 'User1 Project 2')
       RETURNING id, name`,
      [testUsers.user1]
    );
    testData.user1.projects = user1Projects;
    log.success(`Created ${user1Projects.length} projects for user1`);
    
    // Create projects for user2
    const user2Projects = await queryAsUser(
      testUsers.user2,
      `INSERT INTO projects (owner, name) 
       VALUES ($1, 'User2 Project 1')
       RETURNING id, name`,
      [testUsers.user2]
    );
    testData.user2.projects = user2Projects;
    log.success(`Created ${user2Projects.length} project for user2`);
    
    // Create secrets for user1's first project
    const user1Secrets = await queryAsUser(
      testUsers.user1,
      `INSERT INTO secrets (project_id, key, value_encrypted) 
       VALUES ($1, 'API_KEY', 'encrypted_value_1'), ($1, 'DB_PASSWORD', 'encrypted_value_2')
       RETURNING id, key`,
      [user1Projects[0].id]
    );
    testData.user1.secrets = user1Secrets;
    log.success(`Created ${user1Secrets.length} secrets for user1`);
    
    // Create workflow definition for user1
    const user1Workflows = await queryAsUser(
      testUsers.user1,
      `INSERT INTO workflow_definitions (project_id, slug, definition) 
       VALUES ($1, 'test-workflow', '{"nodes": [], "edges": []}')
       RETURNING id, slug`,
      [user1Projects[0].id]
    );
    testData.user1.workflows = user1Workflows;
    log.success(`Created ${user1Workflows.length} workflow for user1`);
    
    // Create workflow run for user1
    const user1Runs = await queryAsUser(
      testUsers.user1,
      `INSERT INTO workflow_runs (project_id, workflow_id, status) 
       VALUES ($1, $2, 'running')
       RETURNING id, status`,
      [user1Projects[0].id, user1Workflows[0].id]
    );
    testData.user1.runs = user1Runs;
    log.success(`Created ${user1Runs.length} workflow run for user1`);
    
    // Create workflow events for user1's run
    const user1Events = await queryAsUser(
      testUsers.user1,
      `INSERT INTO workflow_events (run_id, type, payload) 
       VALUES ($1, 'workflow.started', '{"timestamp": "2025-01-10T00:00:00Z"}')
       RETURNING id, type`,
      [user1Runs[0].id]
    );
    testData.user1.events = user1Events;
    log.success(`Created ${user1Events.length} workflow event for user1`);
    
    // Create audit log entry for user1
    const user1AuditLogs = await queryAsUser(
      testUsers.user1,
      `INSERT INTO audit_log (project_id, user_id, action, resource_type, resource_id) 
       VALUES ($1, $2, 'project.created', 'project', $1)
       RETURNING id, action`,
      [user1Projects[0].id, testUsers.user1]
    );
    testData.user1.auditLogs = user1AuditLogs;
    log.success(`Created ${user1AuditLogs.length} audit log entry for user1`);
    
    log.success('Test data setup complete');
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test: Users can only view their own projects
 */
async function testProjectIsolation() {
  log.section('🔒 Testing project isolation...');
  
  try {
    // User1 should see their own projects
    const user1Projects = await queryAsUser(
      testUsers.user1,
      'SELECT id, name FROM projects ORDER BY name'
    );
    
    if (user1Projects.length === 2) {
      log.success('User1 can view their own projects');
    } else {
      log.error(`User1 should see 2 projects, but saw ${user1Projects.length}`);
      return false;
    }
    
    // User2 should only see their own project
    const user2Projects = await queryAsUser(
      testUsers.user2,
      'SELECT id, name FROM projects ORDER BY name'
    );
    
    if (user2Projects.length === 1) {
      log.success('User2 can view their own project');
    } else {
      log.error(`User2 should see 1 project, but saw ${user2Projects.length}`);
      return false;
    }
    
    // User2 should not see user1's projects
    const user2ViewingUser1 = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM projects WHERE id = $1',
      [testData.user1.projects[0].id]
    );
    
    if (user2ViewingUser1.length === 0) {
      log.success('User2 cannot view user1\'s projects');
    } else {
      log.error('User2 should not be able to view user1\'s projects');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Project isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Users can only view secrets in their own projects
 */
async function testSecretIsolation() {
  log.section('🔐 Testing secret isolation...');
  
  try {
    // User1 should see their own secrets
    const user1Secrets = await queryAsUser(
      testUsers.user1,
      'SELECT id, key FROM secrets ORDER BY key'
    );
    
    if (user1Secrets.length === 2) {
      log.success('User1 can view their own secrets');
    } else {
      log.error(`User1 should see 2 secrets, but saw ${user1Secrets.length}`);
      return false;
    }
    
    // User2 should not see user1's secrets
    const user2ViewingUser1Secrets = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM secrets WHERE id = $1',
      [testData.user1.secrets[0].id]
    );
    
    if (user2ViewingUser1Secrets.length === 0) {
      log.success('User2 cannot view user1\'s secrets');
    } else {
      log.error('User2 should not be able to view user1\'s secrets');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Secret isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Users can only view workflow definitions in their own projects
 */
async function testWorkflowIsolation() {
  log.section('📊 Testing workflow definition isolation...');
  
  try {
    // User1 should see their own workflows
    const user1Workflows = await queryAsUser(
      testUsers.user1,
      'SELECT id, slug FROM workflow_definitions'
    );
    
    if (user1Workflows.length === 1) {
      log.success('User1 can view their own workflow definitions');
    } else {
      log.error(`User1 should see 1 workflow, but saw ${user1Workflows.length}`);
      return false;
    }
    
    // User2 should not see user1's workflows
    const user2ViewingUser1Workflows = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM workflow_definitions WHERE id = $1',
      [testData.user1.workflows[0].id]
    );
    
    if (user2ViewingUser1Workflows.length === 0) {
      log.success('User2 cannot view user1\'s workflow definitions');
    } else {
      log.error('User2 should not be able to view user1\'s workflow definitions');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Workflow isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Users can only view workflow runs in their own projects
 */
async function testRunIsolation() {
  log.section('🏃 Testing workflow run isolation...');
  
  try {
    // User1 should see their own runs
    const user1Runs = await queryAsUser(
      testUsers.user1,
      'SELECT id, status FROM workflow_runs'
    );
    
    if (user1Runs.length === 1) {
      log.success('User1 can view their own workflow runs');
    } else {
      log.error(`User1 should see 1 run, but saw ${user1Runs.length}`);
      return false;
    }
    
    // User2 should not see user1's runs
    const user2ViewingUser1Runs = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM workflow_runs WHERE id = $1',
      [testData.user1.runs[0].id]
    );
    
    if (user2ViewingUser1Runs.length === 0) {
      log.success('User2 cannot view user1\'s workflow runs');
    } else {
      log.error('User2 should not be able to view user1\'s workflow runs');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Run isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Users can only view workflow events for runs in their own projects
 */
async function testEventIsolation() {
  log.section('📝 Testing workflow event isolation...');
  
  try {
    // User1 should see their own events
    const user1Events = await queryAsUser(
      testUsers.user1,
      'SELECT id, type FROM workflow_events'
    );
    
    if (user1Events.length === 1) {
      log.success('User1 can view their own workflow events');
    } else {
      log.error(`User1 should see 1 event, but saw ${user1Events.length}`);
      return false;
    }
    
    // User2 should not see user1's events
    const user2ViewingUser1Events = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM workflow_events WHERE id = $1',
      [testData.user1.events[0].id]
    );
    
    if (user2ViewingUser1Events.length === 0) {
      log.success('User2 cannot view user1\'s workflow events');
    } else {
      log.error('User2 should not be able to view user1\'s workflow events');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Event isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Users can view audit logs for their own projects
 */
async function testAuditLogIsolation() {
  log.section('📋 Testing audit log isolation...');
  
  try {
    // User1 should see their own audit logs
    const user1AuditLogs = await queryAsUser(
      testUsers.user1,
      'SELECT id, action FROM audit_log'
    );
    
    if (user1AuditLogs.length === 1) {
      log.success('User1 can view their own audit logs');
    } else {
      log.error(`User1 should see 1 audit log, but saw ${user1AuditLogs.length}`);
      return false;
    }
    
    // User2 should not see user1's audit logs
    const user2ViewingUser1AuditLogs = await queryAsUser(
      testUsers.user2,
      'SELECT id FROM audit_log WHERE id = $1',
      [testData.user1.auditLogs[0].id]
    );
    
    if (user2ViewingUser1AuditLogs.length === 0) {
      log.success('User2 cannot view user1\'s audit logs');
    } else {
      log.error('User2 should not be able to view user1\'s audit logs');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Audit log isolation test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test: Verify RLS is enabled on all tables
 */
async function testRLSEnabled() {
  log.section('🔍 Verifying RLS is enabled on all tables...');
  
  try {
    const tables = [
      'projects',
      'secrets',
      'workflow_definitions',
      'workflow_runs',
      'workflow_events',
      'audit_log',
    ];
    
    for (const table of tables) {
      const result = await queryAsAdmin(
        `SELECT relrowsecurity 
         FROM pg_class 
         WHERE relname = $1`,
        [table]
      );
      
      if (result.length > 0 && result[0].relrowsecurity) {
        log.success(`RLS is enabled on ${table}`);
      } else {
        log.error(`RLS is NOT enabled on ${table}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log.error(`RLS verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║         MeshHook RLS Policy Test Suite                    ║
║         Testing Multi-Tenant Data Isolation               ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  let allTestsPassed = true;
  
  try {
    // Clean up any existing test data
    await cleanup();
    
    // Setup test data
    await setupTestData();
    
    // Run all tests
    const tests = [
      { name: 'RLS Enabled', fn: testRLSEnabled },
      { name: 'Project Isolation', fn: testProjectIsolation },
      { name: 'Secret Isolation', fn: testSecretIsolation },
      { name: 'Workflow Isolation', fn: testWorkflowIsolation },
      { name: 'Run Isolation', fn: testRunIsolation },
      { name: 'Event Isolation', fn: testEventIsolation },
      { name: 'Audit Log Isolation', fn: testAuditLogIsolation },
    ];
    
    for (const test of tests) {
      const passed = await test.fn();
      if (!passed) {
        allTestsPassed = false;
      }
    }
    
    // Clean up test data
    await cleanup();
    
    // Print summary
    log.section('📊 Test Summary');
    if (allTestsPassed) {
      log.success('All RLS policy tests passed! ✨');
      process.exit(0);
    } else {
      log.error('Some RLS policy tests failed. Please review the output above.');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    await cleanup();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
runTests();