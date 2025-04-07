// scripts/migrations/migrationV11.js
module.exports = {
    version: 11,
    appVersion: "0.6.6",
    modifications: [
      `
        CREATE POLICY "Public read access to sessions" ON sessions
        FOR SELECT TO anon
        USING (true);
      `,
    ],
  };