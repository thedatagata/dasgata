import { Database } from "sqlite";
import { exists } from "$std/fs/exists.ts";

// Database singleton to ensure we only have one connection
let db: Database | null = null;

// Database initialization and schema creation
export async function initDatabase(): Promise<Database> {
  if (db !== null) {
    return db;
  }

  // Create db directory if it doesn't exist
  if (!await exists("./db")) {
    await Deno.mkdir("./db", { recursive: true });
  }

  // Create and open the database
  db = new Database("./db/contact.db");

  // Initialize schema
  db.exec(`
    -- Create contacts table if it doesn't exist
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'new'
    );

    -- Create an index on email for faster lookups
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    
    -- Create visitors table for unique identifiers
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      visitor_id TEXT NOT NULL,
      first_seen TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );
  `);
  
  console.log("Database initialized successfully");
  return db;
}

// Get database instance
export function getDb(): Database {
  if (db === null) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// Close database connection (useful for cleanup)
export function closeDb(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
}