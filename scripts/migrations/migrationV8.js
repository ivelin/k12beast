// src/scripts/migrations/migrationV8.js
module.exports = {
  version: 8,
  appVersion: "0.6.2",
  modifications: [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS messages JSONB;",
  ],
};