// scripts/migrations/migrationV14.js
// Adds cloned_from column to sessions table to track original session for clones

module.exports = {
  version: 14,
  appVersion: "0.8.2",
  modifications: [
    // Add cloned_from column if it doesn't exist, nullable to support existing sessions
    `
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS cloned_from UUID DEFAULT NULL;
    `,
  ],
};