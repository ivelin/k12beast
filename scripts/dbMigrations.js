// scripts/dbMigrations.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const { createClient } = require("@supabase/supabase-js");
const packageJson = require("../package.json");
const {
  executeSql,
  ensureTablesExist,
  getCurrentVersion,
  isAppVersionCompatible,
  acquireLock,
  releaseLock,
} = require("./migrationUtils");

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
    "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
    "SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file."
  );
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log(
  "Supabase client initialized with key (last 5 chars):",
  process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-5)
);

// Import migration scripts
const migrationV1 = require("./migrations/migrationV1");
const migrationV2 = require("./migrations/migrationV2");
const migrationV3 = require("./migrations/migrationV3");
const migrationV4 = require("./migrations/migrationV4");
const migrationV5 = require("./migrations/migrationV5");
const migrationV6 = require("./migrations/migrationV6");
const migrationV7 = require("./migrations/migrationV7");
const migrationV8 = require("./migrations/migrationV8");
const migrationV9 = require("./migrations/migrationV9");
const migrationV10 = require("./migrations/migrationV10");
const migrationV11 = require("./migrations/migrationV11");
const migrationV12 = require("./migrations/migrationV12");
const migrationV13 = require("./migrations/migrationV13");

// Define app version
const APP_VERSION = packageJson.version;

// Define migrations in ascending order
const migrations = [
  migrationV1,
  migrationV2,
  migrationV3,
  migrationV4,
  migrationV5,
  migrationV6,
  migrationV7,
  migrationV8,
  migrationV9,
  migrationV10,
  migrationV11,
  migrationV12,
  migrationV13,
];

// Mapping of database versions to app versions
const dbVersionRequiredByAppVersion = [
  { dbVersion: 1, appVersion: "0.0.1" },
  { dbVersion: 2, appVersion: "0.1.0" },
  { dbVersion: 3, appVersion: "0.2.0" },
  { dbVersion: 4, appVersion: "0.3.0" },
  { dbVersion: 5, appVersion: "0.4.0" },
  { dbVersion: 6, appVersion: "0.5.0" },
  { dbVersion: 7, appVersion: "0.6.2" },
  { dbVersion: 8, appVersion: "0.6.3" },
  { dbVersion: 9, appVersion: "0.6.4" },
  { dbVersion: 10, appVersion: "0.6.5" },
  { dbVersion: 11, appVersion: "0.6.6" },
  { dbVersion: 12, appVersion: "0.6.6" },
  { dbVersion: 13, appVersion: "0.6.6" },
];

// Run pending migrations
async function runMigrations(instanceId = "default-instance") {
  const lockKey = "migration-lock";

  try {
    await ensureTablesExist(supabase);

    const currentVersion = await getCurrentVersion(supabase);
    console.log(`Running app version: ${APP_VERSION}`);
    console.log(`Current database version: ${currentVersion}`);

    const { isCompatible: isCompatibleBefore, targetDbVersion } = await isAppVersionCompatible(
      currentVersion,
      migrations,
      APP_VERSION,
      dbVersionRequiredByAppVersion
    );

    if (isCompatibleBefore) {
      console.log(
        `App version ${APP_VERSION} is compatible with database version ${currentVersion}. ` +
        "No migrations needed."
      );
      return;
    }

    // Find migrations to apply: from currentVersion + 1 to targetDbVersion
    const pendingMigrations = migrations
      .filter(m => m.version > currentVersion && m.version <= targetDbVersion)
      .sort((a, b) => a.version - b.version);

    if (pendingMigrations.length === 0) {
      console.log(
        `No pending migrations to apply. Current version: ${currentVersion}, ` +
        `Target version: ${targetDbVersion}.`
      );
      throw new Error(
        `App version ${APP_VERSION} requires database version ${targetDbVersion}, ` +
        `but no migrations are available to bridge the gap from ${currentVersion}.`
      );
    }

    console.log(
      `Pending migrations to apply (versions ${pendingMigrations[0].version} to ` +
      `${pendingMigrations[pendingMigrations.length - 1].version}): ` +
      pendingMigrations.map(m => m.version).join(", ")
    );

    const lockAcquired = await acquireLock(lockKey, instanceId, supabase);
    if (!lockAcquired) {
      console.log("Another instance is running migrations. Waiting...");
      let retries = 10;
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data } = await supabase
          .from("migration_locks")
          .select("locked")
          .eq("lock_key", lockKey)
          .single();

        if (!data?.locked) {
          const retryLock = await acquireLock(lockKey, instanceId, supabase);
          if (retryLock) break;
        }
        retries--;
      }
      if (retries === 0) {
        throw new Error("Failed to acquire migration lock after attempts.");
      }
    }

    try {
      for (const migration of pendingMigrations) {
        // Double-check if migration was applied (in case of partial previous runs)
        const { data: migrationExists } = await supabase
          .from("migrations")
          .select("version")
          .eq("version", migration.version)
          .single();

        if (migrationExists) {
          console.log(`Migration version ${migration.version} already applied, skipping.`);
          continue;
        }

        console.log(
          `Applying migration version ${migration.version} for app version ${migration.appVersion}...`
        );

        if (migration.modifications) {
          for (const sql of migration.modifications) {
            console.log(`Executing SQL for migration ${migration.version}:`, sql);
            await executeSql(sql, supabase);
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

      const newDbVersion = await getCurrentVersion(supabase);
      console.log(`Database version after migrations: ${newDbVersion}`);
      const { isCompatible: isCompatibleAfter } = await isAppVersionCompatible(
        newDbVersion,
        migrations,
        APP_VERSION,
        dbVersionRequiredByAppVersion
      );

      if (!isCompatibleAfter) {
        throw new Error(
          `App version ${APP_VERSION} not compatible with database version ${newDbVersion} ` +
          `after migrations. Required: ${targetDbVersion}.`
        );
      }

      console.log(
        `App version ${APP_VERSION} is compatible with final database version ${newDbVersion}.`
      );
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    } finally {
      await releaseLock(lockKey, instanceId, supabase);
    }
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

module.exports = { runMigrations };