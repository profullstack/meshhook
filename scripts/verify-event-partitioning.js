#!/usr/bin/env node

/**
 * Verify Event Partitioning Script
 * Tests that the event partitioning migration was applied successfully
 * and that partitioning is working correctly
 */

import pg from 'pg';
const { Client } = pg;

/**
 * Create a database client with connection details
 * @returns {Client} PostgreSQL client
 */
function createClient() {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 54322,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });
}

/**
 * Check if workflow_events table is partitioned
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<boolean>}
 */
async function checkTableIsPartitioned(client) {
  const result = await client.query(`
    SELECT relkind 
    FROM pg_class 
    WHERE relname = 'workflow_events' 
    AND relnamespace = 'public'::regnamespace
  `);

  if (result.rows.length === 0) {
    throw new Error('workflow_events table not found');
  }

  // 'p' means partitioned table
  return result.rows[0].relkind === 'p';
}

/**
 * Get list of partitions for workflow_events
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<Array>}
 */
async function getPartitions(client) {
  const result = await client.query(`
    SELECT 
      c.relname as partition_name,
      pg_get_expr(c.relpartbound, c.oid) as partition_bounds,
      pg_size_pretty(pg_total_relation_size(c.oid)) as size
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'workflow_events'
      AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  return result.rows;
}

/**
 * Check if required functions exist
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<Object>}
 */
async function checkFunctions(client) {
  const functions = [
    'create_workflow_events_partition',
    'maintain_workflow_events_partitions',
    'drop_old_workflow_events_partitions',
    'get_workflow_events_partition_stats',
    'get_workflow_run_events',
  ];

  const results = {};

  for (const funcName of functions) {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = $1
      )`,
      [funcName]
    );
    results[funcName] = result.rows[0].exists;
  }

  return results;
}

/**
 * Check if partition info view exists
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<boolean>}
 */
async function checkPartitionView(client) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name = 'workflow_events_partition_info'
    )`
  );

  return result.rows[0].exists;
}

/**
 * Test inserting events into different time periods
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<Object>}
 */
async function testEventInsertion(client) {
  console.log('\n🧪 Testing event insertion across partitions...');

  // First, we need a test project and workflow
  const projectResult = await client.query(`
    INSERT INTO projects (owner, name)
    VALUES ('00000000-0000-0000-0000-000000000000', 'Test Project')
    RETURNING id
  `);
  const projectId = projectResult.rows[0].id;

  const workflowResult = await client.query(`
    INSERT INTO workflow_definitions (project_id, slug, version, definition)
    VALUES ($1, 'test-workflow', 1, '{}')
    RETURNING id
  `, [projectId]);
  const workflowId = workflowResult.rows[0].id;

  const runResult = await client.query(`
    INSERT INTO workflow_runs (project_id, workflow_id, status)
    VALUES ($1, $2, 'running')
    RETURNING id
  `, [projectId, workflowId]);
  const runId = runResult.rows[0].id;

  // Test inserting events in different months
  const testDates = [
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
    new Date(), // current
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month future
  ];

  const insertedEvents = [];

  for (const testDate of testDates) {
    try {
      const result = await client.query(`
        INSERT INTO workflow_events (run_id, ts, type, payload)
        VALUES ($1, $2, 'test_event', '{"test": true}')
        RETURNING id, ts
      `, [runId, testDate]);

      insertedEvents.push(result.rows[0]);
      console.log(`  ✅ Inserted event for ${testDate.toISOString().split('T')[0]}`);
    } catch (error) {
      console.log(`  ❌ Failed to insert event for ${testDate.toISOString().split('T')[0]}: ${error.message}`);
    }
  }

  // Verify events can be queried
  const queryResult = await client.query(`
    SELECT COUNT(*) as count
    FROM workflow_events
    WHERE run_id = $1
  `, [runId]);

  console.log(`  ℹ️  Total events inserted: ${queryResult.rows[0].count}`);

  // Clean up test data
  await client.query('DELETE FROM workflow_runs WHERE id = $1', [runId]);
  await client.query('DELETE FROM workflow_definitions WHERE id = $1', [workflowId]);
  await client.query('DELETE FROM projects WHERE id = $1', [projectId]);

  return {
    success: insertedEvents.length > 0,
    eventsInserted: insertedEvents.length,
    expectedEvents: testDates.length,
  };
}

/**
 * Test the get_workflow_run_events function
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<boolean>}
 */
async function testQueryFunction(client) {
  console.log('\n🧪 Testing get_workflow_run_events function...');

  try {
    // Just test that the function can be called
    const result = await client.query(`
      SELECT * FROM get_workflow_run_events(
        '00000000-0000-0000-0000-000000000000'::uuid
      )
      LIMIT 1
    `);

    console.log('  ✅ Function executed successfully');
    return true;
  } catch (error) {
    console.log(`  ❌ Function test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test partition maintenance function
 * @param {Client} client - PostgreSQL client
 * @returns {Promise<boolean>}
 */
async function testPartitionMaintenance(client) {
  console.log('\n🧪 Testing partition maintenance...');

  try {
    await client.query('SELECT maintain_workflow_events_partitions()');
    console.log('  ✅ Partition maintenance executed successfully');
    return true;
  } catch (error) {
    console.log(`  ❌ Partition maintenance failed: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyEventPartitioning() {
  console.log('🔍 Verifying event partitioning setup...\n');

  const client = createClient();
  let allChecksPassed = true;

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check 1: Verify table is partitioned
    console.log('📋 Checking if workflow_events is partitioned...');
    const isPartitioned = await checkTableIsPartitioned(client);
    if (isPartitioned) {
      console.log('  ✅ workflow_events is a partitioned table');
    } else {
      console.log('  ❌ workflow_events is NOT partitioned');
      allChecksPassed = false;
    }

    // Check 2: List partitions
    console.log('\n📊 Checking partitions...');
    const partitions = await getPartitions(client);
    if (partitions.length > 0) {
      console.log(`  ✅ Found ${partitions.length} partition(s):`);
      partitions.forEach((partition) => {
        console.log(`     - ${partition.partition_name} (${partition.size})`);
        console.log(`       Range: ${partition.partition_bounds}`);
      });
    } else {
      console.log('  ❌ No partitions found');
      allChecksPassed = false;
    }

    // Check 3: Verify functions exist
    console.log('\n⚙️  Checking partition management functions...');
    const functions = await checkFunctions(client);
    for (const [funcName, exists] of Object.entries(functions)) {
      if (exists) {
        console.log(`  ✅ ${funcName}`);
      } else {
        console.log(`  ❌ ${funcName} - NOT FOUND`);
        allChecksPassed = false;
      }
    }

    // Check 4: Verify partition info view
    console.log('\n👁️  Checking partition info view...');
    const viewExists = await checkPartitionView(client);
    if (viewExists) {
      console.log('  ✅ workflow_events_partition_info view exists');

      // Query the view
      const viewResult = await client.query(
        'SELECT * FROM workflow_events_partition_info'
      );
      console.log(`  ℹ️  View contains ${viewResult.rows.length} partition(s)`);
    } else {
      console.log('  ❌ workflow_events_partition_info view NOT FOUND');
      allChecksPassed = false;
    }

    // Check 5: Test event insertion
    const insertionTest = await testEventInsertion(client);
    if (!insertionTest.success) {
      allChecksPassed = false;
    }

    // Check 6: Test query function
    const queryTest = await testQueryFunction(client);
    if (!queryTest) {
      allChecksPassed = false;
    }

    // Check 7: Test partition maintenance
    const maintenanceTest = await testPartitionMaintenance(client);
    if (!maintenanceTest) {
      allChecksPassed = false;
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    if (allChecksPassed) {
      console.log('✅ All partitioning checks passed!');
      console.log('\n📝 Partitioning Summary:');
      console.log(`   - Table is partitioned: YES`);
      console.log(`   - Number of partitions: ${partitions.length}`);
      console.log(`   - All functions present: YES`);
      console.log(`   - Event insertion: WORKING`);
      console.log(`   - Query functions: WORKING`);
      console.log('\n💡 Tips:');
      console.log('   - Run maintain_workflow_events_partitions() regularly');
      console.log('   - Monitor partition sizes with workflow_events_partition_info view');
      console.log('   - Use drop_old_workflow_events_partitions(months) to clean old data');
    } else {
      console.log('❌ Some partitioning checks failed!');
      console.log('   Please review the errors above and ensure the migration ran successfully.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run verification
verifyEventPartitioning().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});