// scripts/migrationUtils.js
const semver = require("semver");

// Execute SQL via the execute-sql Edge Function with retry logic
async function executeSql(sqlText, supabase, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("execute-sql", {
        method: "POST",
        body: { sql_text: sqlText },
      });

      if (error) {
        console.error(
          `Edge Function invocation error (attempt ${attempt}/${retries}):`,
          error
        );
        throw new Error(`Failed to invoke Edge Function: ${error.message}`);
      }

      if (data.error) {
        console.error(
          `SQL execution error from Edge Function (attempt ${attempt}/${retries}):`,
          data.error
        );
        throw new Error(`SQL execution failed: ${data.error}`);
      }

      if (!data.success) {
        console.error(
          `SQL execution failed (attempt ${attempt}/${retries}):`,
          JSON.stringify(data, null, 2)
        );
        throw new Error("SQL execution failed without error message");
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        console.error("Error executing SQL after all retries:", error);
        if (error.context && error.context.body) {
          const bodyText = await error.context.text();
          console.error("Edge Function response body:", bodyText);
        }
        throw error;
      }
      console.warn(
        `Retrying SQL execution (${attempt}/${retries}) due to error:`,
        error.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Ensure the required tables exist
async function ensureTablesExist(supabase) {
  try {
    await executeSql(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, supabase);

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
    `, supabase);

    const { data: compatibilityCheck, error: compatibilityCheckError } = await supabase
      .from("db_app_version_compatibility")
      .select("*")
      .limit(1);
    if (compatibilityCheckError && compatibilityCheckError.code !== "PGRST116") {
      console.error(
        "Failed to verify db_app_version_compatibility table:",
        compatibilityCheckError.message
      );
      throw new Error(
        `Failed to verify db_app_version_compatibility table: ${compatibilityCheckError.message}`
      );
    }

    await executeSql(`
      CREATE TABLE IF NOT EXISTS migration_locks (
        id SERIAL PRIMARY KEY,
        lock_key TEXT NOT NULL UNIQUE,
        locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP,
        locked_by TEXT
      );
    `, supabase);

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
        "performanceHistory" JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, supabase);

    await executeSql(`
      GRANT ALL PRIVILEGES ON TABLE sessions TO postgres;
    `, supabase);

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
async function getCurrentVersion(supabase) {
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

// Check if the app version is compatible with the database version
async function isAppVersionCompatible(dbVersion, migrations, APP_VERSION, dbVersionRequiredByAppVersion) {
  try {
    const latestMigration = migrations
      .sort((a, b) => b.version - a.version)[0];

    if (!latestMigration) {
      console.log("No migrations available. Assuming compatibility with database version 0.");
      return { isCompatible: true, targetDbVersion: 0 };
    }

    const highestMigrationVersion = latestMigration.version;

    const sortedMapping = [...dbVersionRequiredByAppVersion].sort((a, b) =>
      semver.compare(a.appVersion, b.appVersion)
    );
    let requiredDbVersion = 0;
    for (const entry of sortedMapping) {
      if (semver.gte(APP_VERSION, entry.appVersion)) {
        requiredDbVersion = entry.dbVersion;
      } else {
        break;
      }
    }

    const isCompatible = dbVersion >= requiredDbVersion;

    console.log(
      `App version ${APP_VERSION} requires database version ${requiredDbVersion}. ` +
      `Current database version: ${dbVersion}. Highest migration version: ${highestMigrationVersion}. ` +
      `Compatible: ${isCompatible}`
    );

    return { isCompatible, targetDbVersion: requiredDbVersion };
  } catch (error) {
    console.error("Error checking app version compatibility:", error);
    throw error;
  }
}

// Acquire a migration lock
async function acquireLock(lockKey, instanceId, supabase) {
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
      .select()
      .single();

    if (updateError) throw updateError;

    return !!data;
  } catch (error) {
    console.error("Error acquiring lock:", error);
    return false;
  }
}

// Release a migration lock
async function releaseLock(lockKey, instanceId, supabase) {
  try {
    const { error } = await supabase
      .from("migration_locks")
      .update({ locked: false, locked_at: null, locked_by: null })
      .eq("lock_key", lockKey)
      .eq("locked_by", instanceId);

    if (error) throw error;

    console.log(`Lock ${lockKey} released by ${instanceId}`);
  } catch (error) {
    console.error("Error releasing lock:", error);
    throw error;
  }
}

module.exports = {
  executeSql,
  ensureTablesExist,
  getCurrentVersion,
  isAppVersionCompatible,
  acquireLock,
  releaseLock,
};