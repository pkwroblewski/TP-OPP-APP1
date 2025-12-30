// scripts/test-supabase-connection.ts
// Test script to verify Supabase database connection

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`  ✓ ${message}`, 'green');
}

function error(message: string) {
  log(`  ✗ ${message}`, 'red');
}

function info(message: string) {
  log(`  → ${message}`, 'cyan');
}

function warning(message: string) {
  log(`  ⚠ ${message}`, 'yellow');
}

function header(message: string) {
  console.log();
  log(`━━━ ${message} ━━━`, 'blue');
}

async function testSupabaseCredentials(): Promise<boolean> {
  header('Testing Supabase Credentials');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    error('NEXT_PUBLIC_SUPABASE_URL is not set');
    return false;
  }
  success('NEXT_PUBLIC_SUPABASE_URL is set');
  info(`URL: ${supabaseUrl}`);

  if (!supabaseAnonKey) {
    error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    return false;
  }
  success('NEXT_PUBLIC_SUPABASE_ANON_KEY is set');

  if (!supabaseServiceKey) {
    error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return false;
  }
  success('SUPABASE_SERVICE_ROLE_KEY is set');

  return true;
}

async function testDatabaseConnection(): Promise<boolean> {
  header('Testing Database Connection');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple query to test connection
    const { error: connError } = await supabase.from('companies').select('count').limit(1);

    if (connError) {
      // Check if error is because table doesn't exist
      if (connError.message.includes('does not exist')) {
        warning('Tables not yet created (this is expected for new setup)');
        return true; // Connection works, just no tables
      }
      error(`Connection failed: ${connError.message}`);
      return false;
    }

    success('Connected to Supabase database');
    return true;
  } catch (err) {
    error(`Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

async function testTables(): Promise<{ exists: string[]; missing: string[] }> {
  header('Testing Database Tables');

  const requiredTables = [
    'companies',
    'financial_years',
    'tp_analyses',
    'ic_transactions',
    'related_party_transactions',
    'opportunity_pipeline',
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const exists: string[] = [];
  const missing: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error: tableError } = await supabase.from(table).select('count').limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        missing.push(table);
        error(`Table "${table}" does not exist`);
      } else if (tableError) {
        error(`Error checking table "${table}": ${tableError.message}`);
        missing.push(table);
      } else {
        exists.push(table);
        success(`Table "${table}" exists`);
      }
    } catch (err) {
      missing.push(table);
      error(`Error checking table "${table}": ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  return { exists, missing };
}

async function main() {
  console.log();
  log('╔════════════════════════════════════════════════╗', 'yellow');
  log('║     Supabase Connection Test                   ║', 'yellow');
  log('╚════════════════════════════════════════════════╝', 'yellow');

  const credentialsOk = await testSupabaseCredentials();

  if (!credentialsOk) {
    log('\nCannot continue without valid credentials.', 'red');
    process.exit(1);
  }

  const connectionOk = await testDatabaseConnection();

  if (!connectionOk) {
    log('\nCannot continue without database connection.', 'red');
    process.exit(1);
  }

  const { exists, missing } = await testTables();

  header('Summary');

  console.log();
  log('  Connection Status:', 'blue');
  console.log(`    Credentials: ✓ PASS`);
  console.log(`    Connection:  ✓ PASS`);
  console.log();

  log('  Table Status:', 'blue');
  console.log(`    Existing:    ${exists.length} tables`);
  console.log(`    Missing:     ${missing.length} tables`);
  console.log();

  if (missing.length > 0) {
    log('  Missing tables:', 'yellow');
    missing.forEach((table) => {
      console.log(`    - ${table}`);
    });
    console.log();
    warning('Run the database migration to create missing tables.');
    warning('See docs/IMPLEMENTATION_GUIDE.md for the SQL migration script.');
    console.log();
  } else {
    log('All tables exist! Database is ready. ✓', 'green');
  }

  // Exit with success if connection works (tables can be created later)
  if (connectionOk) {
    log('Supabase connection successful! ✓', 'green');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
