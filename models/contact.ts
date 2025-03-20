import { getDb } from "../utils/db.ts";

// Contact form submission interface
export interface Contact {
  id?: number;
  name: string;
  email: string;
  service?: string;
  message: string;
  created_at?: string;
  status?: string;
}

export class ContactModel {
  // Create a new contact submission
  static create(contact: Contact): Contact {
    const db = getDb();
    const { name, email, service, message } = contact;
    
    const query = `
      INSERT INTO contacts (name, email, service, message)
      VALUES (?, ?, ?, ?)
    `;
    
    db.prepare(query).run(name, email, service, message);
    const id = db.lastInsertRowId;
    
    // Return the created contact with its ID
    return { id, ...contact, status: 'new', created_at: new Date().toISOString() };
  }

  // Get all contacts
  static getAll(): Contact[] {
    const db = getDb();
    const query = "SELECT * FROM contacts ORDER BY created_at DESC";
    
    return db.prepare(query).all() as Contact[];
  }

  // Get a single contact by ID
  static getById(id: number): Contact | null {
    const db = getDb();
    const query = "SELECT * FROM contacts WHERE id = ?";
    
    return db.prepare(query).get(id) as Contact || null;
  }

  // Update a contact
  static update(id: number, contact: Partial<Contact>): boolean {
    const db = getDb();
    const existingContact = this.getById(id);
    
    if (!existingContact) {
      return false;
    }
    
    // Build update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(contact)) {
      if (key !== 'id' && key !== 'created_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) {
      return false;
    }
    
    // Add ID to values for WHERE clause
    values.push(id);
    
    const query = `
      UPDATE contacts
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    
    const result = db.prepare(query).run(...values);
    return result.changes > 0;
  }

  // Delete a contact
  static delete(id: number): boolean {
    const db = getDb();
    const query = "DELETE FROM contacts WHERE id = ?";
    
    const result = db.prepare(query).run(id);
    return result.changes > 0;
  }
}