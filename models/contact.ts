// models/contact.ts
import { getKv } from "../utils/db.ts";

export interface Contact {
  id: string;
  name: string;
  email: string;
  service?: string;
  message: string;
  created_at: string;
  status: string;
}

export class ContactModel {
  static async create(contact: Omit<Contact, "id" | "created_at" | "status">): Promise<Contact> {
    const kv = getKv();
    const id = crypto.randomUUID();
    
    const newContact: Contact = {
      id,
      ...contact,
      created_at: new Date().toISOString(),
      status: 'new'
    };
    
    await kv.set(["contacts", id], newContact);
    await kv.set(["contacts_by_email", contact.email, id], { id });
    
    return newContact;
  }

  static async getAll(): Promise<Contact[]> {
    const kv = getKv();
    const contacts: Contact[] = [];
    
    const entries = kv.list<Contact>({ prefix: ["contacts"] });
    for await (const entry of entries) {
      contacts.push(entry.value);
    }
    
    return contacts.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  static async getById(id: string): Promise<Contact | null> {
    const kv = getKv();
    const result = await kv.get<Contact>(["contacts", id]);
    return result.value;
  }

  static async update(id: string, contact: Partial<Contact>): Promise<boolean> {
    const kv = getKv();
    const existingResult = await kv.get<Contact>(["contacts", id]);
    const existingContact = existingResult.value;
    
    if (!existingContact) return false;
    
    const updatedContact = {
      ...existingContact,
      ...contact,
      id
    };
    
    await kv.set(["contacts", id], updatedContact);
    
    if (contact.email && contact.email !== existingContact.email) {
      await kv.delete(["contacts_by_email", existingContact.email, id]);
      await kv.set(["contacts_by_email", contact.email, id], { id });
    }
    
    return true;
  }

  static async delete(id: string): Promise<boolean> {
    const kv = getKv();
    
    const result = await kv.get<Contact>(["contacts", id]);
    const contact = result.value;
    
    if (!contact) return false;
    
    await kv.delete(["contacts", id]);
    await kv.delete(["contacts_by_email", contact.email, id]);
    
    return true;
  }
}