// scripts/migrations/migrationV2.js
module.exports = {
  version: 2,
  appVersion: "0.2.0",
  modifications: [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;"
  ]
};