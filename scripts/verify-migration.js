#!/usr/bin/env node

/**
 * Verify Migration Script
 * Tests that the core tables migration was applied successfully
 */

import pg from 'pg';
const { Client } = pg;

async function verifyMigration() {
  console.log('🔍 Verifying core tables migration...\n');

  const client = new Client({
    host: 'localhost',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if all tables exist
    const tables = [
      'projects',
      'secrets',
      'workflow_definitions',
      'workflow_runs',
      'workflow_events',
      'audit_log',
    ];

    console.log('📋 Checking tables...');
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - NOT FOUND`);
      }
    }

    // Check indexes
    console.log('\n📊 Checking key indexes...');
    const indexes = [
      'idx_projects_owner',
      'idx_secrets_project_id',
      'idx_workflow_definitions_project_id',
      'idx_workflow_runs_project_started',
      'idx_workflow_events_run_ts',
      'idx_audit_log_project_id',
    ];

    for (const index of indexes) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )`,
        [index]
      );

      if (result.rows[0].exists) {
        console.log(`  ✅ ${index}`);
      } else {
        console.log(`  ❌ ${index} - NOT FOUND`);
      }
    }

    // Check triggers
    console.log('\n⚡ Checking triggers...');
    const triggers = [
      'update_projects_updated_at',
      'update_secrets_updated_at',
      'update_workflow_definitions_updated_at',
      'update_workflow_runs_updated_at',
    ];

    for (const trigger of triggers) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.triggers 
          WHERE trigger_schema = 'public' 
          AND trigger_name = $1
        )`,
        [trigger]
      );

      if (result.rows[0].exists) {
        console.log(`  ✅ ${trigger}`);
      } else {
        console.log(`  ❌ ${trigger} - NOT FOUND`);
      }
    }

    console.log('\n✅ Migration verification complete!');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});