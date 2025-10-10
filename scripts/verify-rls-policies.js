#!/usr/bin/env node

/**
 * Verification script for Row Level Security (RLS) policies
 * 
 * This script verifies that:
 * 1. RLS is enabled on all required tables
 * 2. RLS policies are created for each table
 * 3. The helper function exists
 * 
 * Note: This script verifies the RLS configuration exists, but does not test
 * the actual isolation behavior (which requires Supabase Auth integration).
 * 
 * Usage: node scripts/verify-rls-policies.js
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

// Utilities
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

/**
 * Verify RLS is enabled on all tables
 */
async function verifyRLSEnabled() {
  log.section('🔍 Verifying RLS is enabled on all tables...');
  
  const tables = [
    'projects',
    'secrets',
    'workflow_definitions',
    'workflow_runs',
    'workflow_events',
    'audit_log',
  ];
  
  let allEnabled = true;
  
  for (const table of tables) {
    const result = await pool.query(
      `SELECT relrowsecurity 
       FROM pg_class 
       WHERE relname = $1 AND relnamespace = 'public'::regnamespace`,
      [table]
    );
    
    if (result.rows.length > 0 && result.rows[0].relrowsecurity) {
      log.success(`RLS enabled on ${table}`);
    } else {
      log.error(`RLS NOT enabled on ${table}`);
      allEnabled = false;
    }
  }
  
  return allEnabled;
}

/**
 * Verify RLS policies exist for all tables
 */
async function verifyPoliciesExist() {
  log.section('📋 Verifying RLS policies exist...');
  
  const expectedPolicies = {
    projects: 4, // select, insert, update, delete
    secrets: 4,
    workflow_definitions: 4,
    workflow_runs: 4,
    workflow_events: 4,
    audit_log: 2, // select, insert (no update/delete for audit logs)
  };
  
  let allPoliciesExist = true;
  
  for (const [table, expectedCount] of Object.entries(expectedPolicies)) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1`,
      [table]
    );
    
    const actualCount = parseInt(result.rows[0].count);
    
    if (actualCount >= expectedCount) {
      log.success(`${table}: ${actualCount} policies found (expected ${expectedCount})`);
    } else {
      log.error(`${table}: ${actualCount} policies found (expected ${expectedCount})`);
      allPoliciesExist = false;
    }
  }
  
  return allPoliciesExist;
}

/**
 * Verify helper function exists
 */
async function verifyHelperFunction() {
  log.section('🔧 Verifying helper function exists...');
  
  const result = await pool.query(
    `SELECT proname, pronargs
     FROM pg_proc
     WHERE proname = 'user_project_ids' 
     AND pronamespace = 'public'::regnamespace`
  );
  
  if (result.rows.length > 0) {
    log.success('Helper function user_project_ids() exists');
    return true;
  } else {
    log.error('Helper function user_project_ids() NOT found');
    return false;
  }
}

/**
 * List all policies for documentation
 */
async function listAllPolicies() {
  log.section('📜 Listing all RLS policies...');
  
  const result = await pool.query(
    `SELECT 
       schemaname,
       tablename,
       policyname,
       cmd,
       qual IS NOT NULL as has_using,
       with_check IS NOT NULL as has_with_check
     FROM pg_policies
     WHERE schemaname = 'public'
     ORDER BY tablename, policyname`
  );
  
  if (result.rows.length === 0) {
    log.error('No policies found');
    return;
  }
  
  let currentTable = '';
  for (const row of result.rows) {
    if (row.tablename !== currentTable) {
      console.log(`\n  ${colors.cyan}${row.tablename}:${colors.reset}`);
      currentTable = row.tablename;
    }
    
    const cmdStr = row.cmd === '*' ? 'ALL' : row.cmd;
    const usingStr = row.has_using ? '✓' : ' ';
    const checkStr = row.has_with_check ? '✓' : ' ';
    
    console.log(`    • ${row.policyname}`);
    console.log(`      Command: ${cmdStr}, USING: ${usingStr}, WITH CHECK: ${checkStr}`);
  }
}

/**
 * Main verification runner
 */
async function runVerification() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║         MeshHook RLS Policy Verification                  ║
║         Checking RLS Configuration                        ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  try {
    const rlsEnabled = await verifyRLSEnabled();
    const policiesExist = await verifyPoliciesExist();
    const helperExists = await verifyHelperFunction();
    await listAllPolicies();
    
    log.section('📊 Verification Summary');
    
    if (rlsEnabled && policiesExist && helperExists) {
      log.success('All RLS policies are correctly configured! ✨');
      log.info('');
      log.info('Note: RLS policies will enforce multi-tenant isolation when users');
      log.info('authenticate through Supabase Auth. The policies filter data by');
      log.info('project_id based on the authenticated user\'s owned projects.');
      process.exit(0);
    } else {
      log.error('Some RLS configuration issues were found. Please review the output above.');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
runVerification();