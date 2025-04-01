require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const { createClient } = require("@supabase/supabase-js");
const packageJson = require("../package.json");

// Debug environment variables
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? `Non-empty (last 5 chars: ${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-5)})`
    : "Empty"
);

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file."
  );
}

// Initialize Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Define the app version from package.json
const APP_VERSION = packageJson.version;

// Define the migrations with their required app versions
const migrations = [
  {
    version: 1,
    appVersion: "0.1.0", // Compatible app version
  },
  {
    version: 2,
    appVersion: "0.2.0",
    modifications: [
      "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;"
    ]
  },
  {
    version: 3,
    appVersion: "0.3.0",
    async apply(supabase) {
      try {
        // Check if the 'problems' bucket already exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
          throw new Error(`Failed to list buckets: ${listError.message}`);
        }

        const bucketExists = buckets.some(bucket => bucket.name === "problems");
        if (bucketExists) {
          console.log("Bucket 'problems' already exists, skipping creation.");
          return;
        }

        // Create the 'problems' bucket with public access
        const { data, error } = await supabase.storage.createBucket("problems", {
          public: true,
        });

        if (error) {
          throw new Error(`Failed to create bucket 'problems': ${error.message}`);
        }

        console.log("Bucket 'problems' created successfully:", data);
      } catch (err) {
        console.error("Error creating bucket 'problems':", err);
        throw err;
      }
    }
  },
  {
    version: 4,
    appVersion: "0.3.0",
    modifications: [
      "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
      "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"
    ]
  },
];

// Execute SQL via the execute-sql Edge Function
async function executeSql(sqlText) {
  try {
    console.log("Invoking Edge Function with SQL:", sqlText);
    const { data, error } = await supabase.functions.invoke("execute-sql", {
      method: "POST",
      body: { sql_text: sqlText },
    });

    if (error) {
      console.error("Edge Function invocation error:", error);
      throw new Error(`Failed to invoke Edge Function: ${error.message}`);
    }

    console.log("Edge Function response:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("SQL execution error from Edge Function:", data.error);
      throw new Error(`SQL execution failed: ${data.error}`);
    }

    if (!data.success) {
      console.error("Edge Function response:", JSON.stringify(data, null, 2));
      throw new Error("SQL execution failed without error message");
    }

    return data;
  } catch (error) {
    console.error("Error executing SQL:", error);
    throw error;
  }
}

// Ensure the required tables exist
async function ensureTablesExist() {
  try {
    // Create migrations table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Verify migrations table exists
    const { data: migrationsCheck, error: migrationsCheckError } = await supabase
      .from("migrations")
      .select("*")
      .limit(1);
    if (migrationsCheckError && migrationsCheckError.code !== "PGRST116") {
      throw new Error(`Failed to verify migrations table: ${migrationsCheckError.message}`);
    }

    // Create db_app_version_compatibility table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS db_app_version_compatibility (
        id SERIAL PRIMARY KEY,
        db_version INTEGER NOT NULL,
        app_version TEXT NOT NULL,
        upgraded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Verify db_app_version_compatibility table exists
    const { data: compatibilityCheck, error: compatibilityCheckError } = await supabase
      .from("db_app_version_compatibility")
      .select("*")
      .limit(1);
    if (compatibilityCheckError && compatibilityCheckError.code !== "PGRST116") {
      throw new Error(`Failed to verify db_app_version_compatibility table: ${compatibilityCheckError.message}`);
    }

    // Create migration_locks table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS migration_locks (
        id SERIAL PRIMARY KEY,
        lock_key TEXT NOT NULL UNIQUE,
        locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP,
        locked_by TEXT
      );
    `);

    // Verify migration_locks table exists
    const { data: locksCheck, error: locksCheckError } = await supabase
      .from("migration_locks")
      .select("*")
      .limit(1);
    if (locksCheckError && locksCheckError.code !== "PGRST116") {
      throw new Error(`Failed to verify migration_locks table: ${locksCheckError.message}`);
    }

    // Create sessions table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        lesson TEXT,
        examples JSONB,
        quizzes JSONB,
        "performanceHistory" JSONB
      );
    `);

    // Verify sessions table exists
    const { data: sessionsCheck, error: sessionsCheckError } = await supabase
      .from("sessions")
      .select("*")
      .limit(1);
    if (sessionsCheckError && sessionsCheckError.code !== "PGRST116") {
      throw new Error(`Failed to verify sessions table: ${sessionsCheckError.message}`);
    }

    console.log("All required tables ensured and verified.");
  } catch (error) {
    console.error("Error ensuring tables exist:", error);
    throw error;
  }
}

// Get the current database version
async function getCurrentVersion() {
  try {
    const { data, error } = await supabase
      .from("migrations")
      .select("version")
      .order("version", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data && data.length > 0 ? data[0].version : 0;
  } catch (error) {
    console.error("Error getting current database version:", error);
    throw error;
  }
}

// Check if the app version is compatible with the current database version
async function isAppVersionCompatible(dbVersion) {
  try {
    // Find the highest migration version compatible with the current app version
    const compatibleMigration = migrations
      .filter(m => m.appVersion === APP_VERSION)
      .sort((a, b) => b.version - a.version)[0];

    if (!compatibleMigration) {
      console.log(`No migrations found for app version ${APP_VERSION}.`);
      return false;
    }

    // The app is compatible only if the database version matches the highest migration version for this app version
    const requiredDbVersion = compatibleMigration.version;
    const isCompatible = dbVersion >= requiredDbVersion;

    console.log(`App version ${APP_VERSION} requires database version ${requiredDbVersion}. Current database version: ${dbVersion}. Compatible: ${isCompatible}`);
    return isCompatible;
  } catch (error) {
    console.error("Error checking app version compatibility:", error);
    throw error;
  }
}

// Acquire a migration lock
async function acquireLock(lockKey, instanceId) {
  try {
    // Try to insert a lock record
    const { error: insertError } = await supabase
      .from("migration_locks")
      .upsert(
        { lock_key: lockKey, locked: false, locked_at: null, locked_by: null },
        { onConflict: "lock_key" }
      );

    if (insertError) throw insertError;

    // Attempt to acquire the lock
    const { data, error: updateError } = await supabase
      .from("migration_locks")
      .update({ locked: true, locked_at: new Date().toISOString(), locked_by: instanceId })
      .eq("lock_key", lockKey)
      .eq("locked", false)
      .select();

    if (updateError) throw updateError;

    return data && data.length > 0;
  } catch (error) {
    console.error("Error acquiring migration lock:", error);
    throw error;
  }
}

// Release the migration lock
async function releaseLock(lockKey, instanceId) {
  try {
    const { error } = await supabase
      .from("migration_locks")
      .update({ locked: false, locked_at: null, locked_by: null })
      .eq("lock_key", lockKey)
      .eq("locked_by", instanceId);

    if (error) throw error;
  } catch (error) {
    console.error("Error releasing migration lock:", error);
    throw error;
  }
}

// Run pending migrations
async function runMigrations(instanceId = "default-instance") {
  const lockKey = "migration-lock";

  try {
    // Ensure all required tables exist
    await ensureTablesExist();

    const currentVersion = await getCurrentVersion();
    console.log(`Running app version: ${APP_VERSION}`);
    console.log(`Current database version: ${currentVersion}`);

    // Check if the current app version is compatible with the database version
    const isCompatible = await isAppVersionCompatible(currentVersion);
    if (isCompatible) {
      console.log(`App version ${APP_VERSION} is compatible with database version ${currentVersion}. No migrations needed.`);
      return;
    }

    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log(`No pending migrations to run, but app version ${APP_VERSION} is not compatible with database version ${currentVersion}.`);
      throw new Error(`App version ${APP_VERSION} requires a database version newer than ${currentVersion}. Please update the app or database schema.`);
    }

    // Acquire the migration lock
    const lockAcquired = await acquireLock(lockKey, instanceId);
    if (!lockAcquired) {
      console.log("Another instance is currently running migrations. Waiting...");
      // Wait and retry (simple polling for demonstration; in production, consider exponential backoff)
      let retries = 10;
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const { data } = await supabase
          .from("migration_locks")
          .select("locked")
          .eq("lock_key", lockKey)
          .single();

        if (!data?.locked) {
          // Try to acquire the lock again
          const retryLock = await acquireLock(lockKey, instanceId);
          if (retryLock) break;
        }
        retries--;
      }

      if (retries === 0) {
        throw new Error("Failed to acquire migration lock after multiple attempts.");
      }
    }

    try {
      console.log(`Database upgrade required: Upgrading from version ${currentVersion} to version ${pendingMigrations[pendingMigrations.length - 1].version} for app version ${APP_VERSION}...`);

      for (const migration of pendingMigrations) {
        console.log(`Applying migration version ${migration.version} for app version ${migration.appVersion}...`);

        // Apply any additional schema modifications (e.g., adding columns)
        if (migration.modifications) {
          for (const sql of migration.modifications) {
            await executeSql(sql);
          }
        }

        // Apply custom migration steps (e.g., creating a bucket)
        if (migration.apply) {
          await migration.apply(supabase);
        }

        // Record the migration in the migrations table
        const { error: insertMigrationError } = await supabase
          .from("migrations")
          .insert({ version: migration.version });
        if (insertMigrationError) throw insertMigrationError;

        // Record the compatibility mapping in db_app_version_compatibility
        const { error: insertCompatibilityError } = await supabase
          .from("db_app_version_compatibility")
          .insert({
            db_version: migration.version,
            app_version: migration.appVersion,
            upgraded_at: new Date().toISOString(),
          });
        if (insertCompatibilityError) throw insertCompatibilityError;

        console.log(`Migration version ${migration.version} applied successfully.`);
      }

      console.log("All migrations applied successfully.");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    } finally {
      // Release the lock
      await releaseLock(lockKey, instanceId);
    }
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

module.exports = { runMigrations };