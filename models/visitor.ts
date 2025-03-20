import { getDb } from "../utils/db.ts";

// Define the visitor interface
export interface Visitor {
  id?: number;
  email: string;
  visitor_id: string;
  first_seen?: string;
  last_seen?: string;
}

export class VisitorModel {
  // Generate a unique visitor ID
  private static generateVisitorId(): string {
    // Generate a random string of 16 characters
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get or create a visitor by email
  static getOrCreate(email: string): Visitor {
    const db = getDb();
    
    // Try to find the visitor first
    const visitor = db.prepare("SELECT * FROM visitors WHERE email = ?").get(email) as Visitor | undefined;
    
    if (visitor) {
      // Update last_seen timestamp
      db.prepare("UPDATE visitors SET last_seen = datetime('now') WHERE id = ?").run(visitor.id);
      return visitor;
    }
    
    // Generate a new visitor ID
    const visitor_id = this.generateVisitorId();
    
    // Insert the new visitor
    db.prepare(
      "INSERT INTO visitors (email, visitor_id) VALUES (?, ?)"
    ).run(email, visitor_id);
    
    const id = db.lastInsertRowId;
    const now = new Date().toISOString();
    
    // Return the new visitor
    return {
      id: Number(id),
      email,
      visitor_id,
      first_seen: now,
      last_seen: now
    };
  }

  // Get a visitor by email
  static getByEmail(email: string): Visitor | null {
    const db = getDb();
    return db.prepare("SELECT * FROM visitors WHERE email = ?").get(email) as Visitor | null;
  }

  // Get a visitor by visitor_id
  static getByVisitorId(visitor_id: string): Visitor | null {
    const db = getDb();
    return db.prepare("SELECT * FROM visitors WHERE visitor_id = ?").get(visitor_id) as Visitor | null;
  }
}