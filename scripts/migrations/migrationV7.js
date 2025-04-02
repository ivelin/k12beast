// scripts/migrations/migrationV7.js
module.exports = {
  version: 7,
  appVersion: "0.5.0",
  modifications: [
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS problem TEXT;",
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS images TEXT[];"
  ],
};