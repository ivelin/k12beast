// scripts/migrations/migrationV9.js
module.exports = {
  version: 9,
  appVersion: "0.6.4",
  modifications: [
    // Step 1: Drop the user_id column if it exists (to handle failed previous attempts)
    "ALTER TABLE sessions DROP COLUMN IF EXISTS user_id;",
    // Step 2: Add the user_id column without constraints
    "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID;",
    // Step 3: Add the foreign key constraint (allows NULL values by default)
    "ALTER TABLE sessions ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);",
  ],
};