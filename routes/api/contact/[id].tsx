// routes/api/contact/[id].ts
import { Handlers } from "$fresh/server.ts";
import { ContactModel } from "../../../models/contact.ts";
import { initDatabase } from "../../../utils/db.ts";

// Initialize the database
await initDatabase();

export const handler: Handlers = {
  async GET(_req, ctx) {
    try {
      const id = ctx.params.id;
      const contact = await ContactModel.getById(id);
      
      if (!contact) {
        return Response.json({ success: false, error: "Contact not found" }, { status: 404 });
      }
      
      return Response.json({ success: true, data: contact });
    } catch (error) {
      return Response.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
    }
  },
  
  async DELETE(_req, ctx) {
    try {
      const id = ctx.params.id;
      const contact = await ContactModel.getById(id);
      
      if (!contact) {
        return Response.json({ success: false, error: "Contact not found" }, { status: 404 });
      }
      
      const deleted = await ContactModel.delete(id);
      
      if (!deleted) {
        return Response.json({ success: false, error: "Failed to delete contact" }, { status: 500 });
      }
    
      
      return Response.json({ success: true });
    } catch (error) {
      return Response.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  },
  
  async PATCH(req, ctx) {
    try {
      const id = ctx.params.id;
      const body = await req.json();
      const updated = await ContactModel.update(id, body);
      
      if (!updated) {
        return Response.json({ success: false, error: "Failed to update contact" }, { status: 500 });
      }
      
      return Response.json({ success: true });
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  }
};