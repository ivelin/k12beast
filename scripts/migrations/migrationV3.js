// scripts/migrations/migrationV3.js
module.exports = {
  version: 3,
  appVersion: "0.3.0",
  async apply(supabase) {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.error("Failed to list buckets:", listError.message);
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets.some(bucket => bucket.name === "problems");
      if (bucketExists) return;

      const { data, error } = await supabase.storage.createBucket("problems", {
        public: true,
      });

      if (error) {
        console.error("Failed to create bucket 'problems':", error.message);
        throw new Error(`Failed to create bucket 'problems': ${error.message}`);
      }
    } catch (err) {
      console.error("Error creating bucket 'problems':", err);
      throw err;
    }
  }
};