const { runMigrations } = require("./dbMigrations");

// Run migrations on startup
(async () => {
  try {
    await runMigrations("startup-instance");
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error("Failed to run database migrations on startup:", error);
    console.error("App cannot start due to migration failure.");
    process.exit(1); // Exit with failure
  }
})();