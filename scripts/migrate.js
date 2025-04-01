// scripts/migrate.js
const { runMigrations } = require("./dbMigrations");

// Run migrations on startup
(async () => {
  try {
    await runMigrations("startup-instance");
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error("Failed to run database migrations on startup:", error);
    console.error(
      "App cannot start due to migration failure. This may be due to a network issue (ENETUNREACH). " +
      "Please check your internet connection, ensure the Supabase Edge Function 'execute-sql' is deployed and accessible, " +
      "and verify that your Supabase URL and service role key in .env.local are correct."
    );
    process.exit(1); // Exit with failure
  }
})();