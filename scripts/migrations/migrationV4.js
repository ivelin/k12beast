// scripts/migrations/migrationV4.js
module.exports = {
  version: 4,
  appVersion: "0.3.0",
  modifications: [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"
  ]
};