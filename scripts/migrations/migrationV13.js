// scripts/migrations/migrationV13.js
module.exports = {
  version: 13,
  appVersion: "0.6.6",
  modifications: [
    // Add created_at column if it doesn't exist (safety net for prior migration failures)
    `
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `,
    // Add updated_at column if it doesn't exist
    `
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    `,
    // Backfill updated_at for existing sessions where it's null, using created_at
    `
      UPDATE sessions
      SET updated_at = COALESCE(created_at, NOW())
      WHERE updated_at IS NULL;
    `,
    // Create or update the trigger to set updated_at on update
    `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `,
    `
      CREATE TRIGGER update_sessions_updated_at
      BEFORE UPDATE ON sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `,
  ],
};