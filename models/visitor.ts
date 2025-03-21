// models/visitor.ts
import { getKv } from "../utils/db.ts";

export interface Visitor {
  id: string;
  email: string;
  visitor_id: string;
  first_seen: string;
  last_seen: string;
}

export class VisitorModel {
  private static generateVisitorId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async getOrCreate(email: string): Promise<Visitor> {
    const kv = getKv();
    
    const result = await kv.get<{ visitor_id: string }>(["visitors_by_email", email]);
    
    if (result.value) {
      const visitorResult = await kv.get<Visitor>(["visitors", result.value.visitor_id]);
      const visitor = visitorResult.value;
      
      if (visitor) {
        const updatedVisitor = {
          ...visitor,
          last_seen: new Date().toISOString()
        };
        
        await kv.set(["visitors", visitor.visitor_id], updatedVisitor);
        return updatedVisitor;
      }
    }
    
    const id = crypto.randomUUID();
    const visitor_id = this.generateVisitorId();
    const now = new Date().toISOString();
    
    const newVisitor: Visitor = {
      id,
      email,
      visitor_id,
      first_seen: now,
      last_seen: now
    };
    
    await kv.set(["visitors", visitor_id], newVisitor);
    await kv.set(["visitors_by_email", email], { visitor_id });
    
    return newVisitor;
  }

  static async getByEmail(email: string): Promise<Visitor | null> {
    const kv = getKv();
    
    const result = await kv.get<{ visitor_id: string }>(["visitors_by_email", email]);
    if (!result.value) return null;
    
    const visitorResult = await kv.get<Visitor>(["visitors", result.value.visitor_id]);
    return visitorResult.value;
  }

  static async getByVisitorId(visitor_id: string): Promise<Visitor | null> {
    const kv = getKv();
    const result = await kv.get<Visitor>(["visitors", visitor_id]);
    return result.value;
  }
}