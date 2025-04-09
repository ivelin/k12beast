// scripts/migrations/migrationV10.js
module.exports = {
    version: 10,
    appVersion: "0.6.5",
    modifications: [
      // Backfill user_id for existing sessions by selecting the first user from auth.users
      // This assumes at least one user exists in auth.users
      "UPDATE sessions SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users);",
    ],
  };