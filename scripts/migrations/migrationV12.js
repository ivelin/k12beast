// scripts/migrations/migrationV12.js
module.exports = {
    version: 12,
    appVersion: "0.6.6",
    modifications: [
      // Log the action for visibility
      "SELECT 'Creating index idx_sessions_updated_at_id on sessions table...' AS migration_log;",
      // Create the index if it doesn't exist
      `
        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at_id
        ON sessions (updated_at DESC, id DESC);
      `,
      // Log the completion
      "SELECT 'Index idx_sessions_updated_at_id created or already exists.' AS migration_log;",
    ],
  };