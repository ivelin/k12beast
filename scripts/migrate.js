// scripts/migrate.js
const { runMigrations } = require("./dbMigrations");
const { isConnectivityFailure } = require("./migrationUtils");

// Run migrations on startup. A missing database must not fail `next build`:
// compilation does not need a live schema, and the configured Supabase host
// may no longer resolve.
(async () => {
  try {
    await runMigrations("startup-instance");
    process.exit(0); // Exit successfully
  } catch (error) {
    if (isConnectivityFailure(error)) {
      console.warn("Database migrations skipped because the database is unreachable.");
      console.warn(
        "Continuing so the application can build and start without a live database. " +
        "Database-backed features stay unavailable until the Supabase host resolves " +
        "and migrations can run."
      );
      console.warn(error);
      process.exit(0);
    }

    console.error("Failed to run database migrations on startup:", error);
    console.error(
      "App cannot start due to migration failure. This may be due to a network issue (ENETUNREACH). " +
      "Please check your internet connection, ensure the Supabase Edge Function 'execute-sql' is deployed and accessible, " +
      "and verify that your Supabase URL and service role key in .env.local are correct."
    );
    process.exit(1); // Exit with failure
  }
})();