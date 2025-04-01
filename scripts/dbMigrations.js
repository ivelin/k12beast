require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const { createClient } = require("@supabase/supabase-js");
const packageJson = require("../package.json");

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL || "Empty");
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `Non-empty (last 5 chars: ${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-5)})`
      : "Empty"
  );
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
    appVersion: "0.1.0",
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
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
          console.error("Failed to list buckets:", listError.message);
          throw new Error(`Failed to list buckets: ${listError.message}`);
        }

        const bucketExists = buckets.some(bucket => bucket.name === "problems");
        if (bucketExists) return;

        const { data, error } = await supabase.storage.createBucket("problems", {
          public: true,
        });

        if (error) {
          console.error("Failed to create bucket 'problems':", error.message);
          throw new Error(`Failed to create bucket 'problems': ${error.message}`);
        }
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
    const { data, error } = await supabase.functions.invoke("execute-sql", {
      method: "POST",
      body: { sql_text: sqlText },
    });

    if (error) {
      console.error("Edge Function invocation error:", error);
      throw new Error(`Failed to invoke Edge Function: ${error.message}`);
    }

    if (data.error) {
      console.error("SQL execution error from Edge Function:", data.error);
      throw new Error(`SQL execution failed: ${data.error}`);
    }

    if (!data.success) {
      console.error("SQL execution failed:", JSON.stringify(data, null, 2));
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
    await executeSql(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { data: migrationsCheck, error: migrationsCheckError } = await supabase
      .from("migrations")
      .select("*")
      .limit(1);
    if (migrationsCheckError && migrationsCheckError.code !== "PGRST116") {
      console.error("Failed to verify migrations table:", migrationsCheckError.message);
      throw new Error(`Failed to verify migrations table: ${migrationsCheckError.message}`);
    }

    await executeSql(`
      CREATE TABLE IF NOT EXISTS db_app_version_compatibility (
        id SERIAL PRIMARY KEY,
        db_version INTEGER NOT NULL,
        app_version TEXT NOT NULL,
        upgraded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { data: compatibilityCheck, error: compatibilityCheckError } = await supabase
      .from("db_app_version_compatibility")
      .select("*")
      .limit(1);
    if (compatibilityCheckError && compatibilityCheckError.code !== "PGRST116") {
      console.error("Failed to verify db_app_version_compatibility table:", compatibilityCheckError.message);
      throw new Error(`Failed to verify db_app_version_compatibility table: ${compatibilityCheckError.message}`);
    }

    await executeSql(`
      CREATE TABLE IF NOT EXISTS migration_locks (
        id SERIAL PRIMARY KEY,
        lock_key TEXT NOT NULL UNIQUE,
        locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP,
        locked_by TEXT
      );
    `);

    const { data: locksCheck, error: locksCheckError } = await supabase
      .from("migration_locks")
      .select("*")
      .limit(1);
    if (locksCheckError && locksCheckError.code !== "PGRST116") {
      console.error("Failed to verify migration_locks table:", locksCheckError.message);
      throw new Error(`Failed to verify migration_locks table: ${locksCheckError.message}`);
    }

    await executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        lesson TEXT,
        examples JSONB,
        quizzes JSONB,
        "performanceHistory" JSONB
      );
    `);

    const { data: sessionsCheck, error: sessionsCheckError } = await supabase
      .from("sessions")
      .select("*")
      .limit(1);
    if (sessionsCheckError && sessionsCheckError.code !== "PGRST116") {
      console.error("Failed to verify sessions table:", sessionsCheckError.message);
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
    const compatibleMigration = migrations
      .filter(m => m.appVersion === APP_VERSION)
      .sort((a, b) => b.version - a.version)[0];

    if (!compatibleMigration) {
      console.log(`No migrations found for app version ${APP_VERSION}.`);
      return false;
    }

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
    const { error: insertError } = await supabase
      .from("migration_locks")
      .upsert(
        { lock_key: lockKey, locked: false, locked_at: null, locked_by: null },
        { onConflict: "lock_key" }
      );

    if (insertError) throw insertError;

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
    await ensureTablesExist();

    const currentVersion = await getCurrentVersion();
    console.log(`Running app version: ${APP_VERSION}`);
    console.log(`Current database version: ${currentVersion}`);

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

    const lockAcquired = await acquireLock(lockKey, instanceId);
    if (!lockAcquired) {
      console.log("Another instance is currently running migrations. Waiting...");
      let retries = 10;
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data } = await supabase
          .from("migration_locks")
          .select("locked")
          .eq("lock_key", lockKey)
          .single();

        if (!data?.locked) {
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

        if (migration.modifications) {
          for (const sql of migration.modifications) {
            await executeSql(sql);
          }
        }

        if (migration.apply) {
          await migration.apply(supabase);
        }

        const { error: insertMigrationError } = await supabase
          .from("migrations")
          .insert({ version: migration.version });
        if (insertMigrationError) throw insertMigrationError;

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
      await releaseLock(lockKey, instanceId);
    }
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

module.exports = { runMigrations };