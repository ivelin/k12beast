// scripts/migrations/migrationV5.js
module.exports = {
  version: 5,
  appVersion: "0.4.0",
  modifications: [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes TEXT;"
  ]
};