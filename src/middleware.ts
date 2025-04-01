import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runMigrations } from "./utils/dbMigrations";
import { v4 as uuidv4 } from "uuid";

// Singleton flag to ensure migrations run only once on startup
let migrationsRun = false;
let migrationsFailed = false;
const instanceId = uuidv4(); // Unique ID for this app instance

export async function middleware(request: NextRequest) {
  // Run migrations only once on app startup
  if (!migrationsRun && !migrationsFailed) {
    try {
      console.log(`Starting app instance ${instanceId}...`);
      console.log("Running database migrations on app startup...");
      await runMigrations(instanceId);
      migrationsRun = true;
      console.log("Database migrations completed successfully.");
    } catch (error) {
      console.error("Failed to run database migrations on startup:", error);
      migrationsFailed = true;
      // Throw an error to prevent the app from starting
      throw new Error("Database migration failed. App cannot start. Please check the logs for details.");
    }
  }

  // If migrations failed, prevent the app from proceeding
  if (migrationsFailed) {
    return NextResponse.json({ error: "Database migration failed. App cannot start." }, { status: 500 });
  }

  // Proceed to the requested route
  return NextResponse.next();
}

// Apply middleware to all routes
export const config = {
  matcher: ["/:path*"],
};