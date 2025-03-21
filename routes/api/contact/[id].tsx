import { Handlers } from "$fresh/server.ts";
import { ContactModel } from "../../../models/contact.ts";
import { getPostHogClient } from "../../../utils/posthog-server.ts";

export const handler: Handlers = {
  DELETE(req, ctx) {
    try {
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
        return Response.json({ success: false, error: "Invalid ID" }, { status: 400 });
      }
      
      // Get contact before deleting to capture info in tracking
      const contact = ContactModel.getById(id);
      const deleted = ContactModel.delete(id);
      
      if (!deleted) {
        return Response.json({ success: false, error: "Contact not found" }, { status: 404 });
      }
      
      // Track deletion with PostHog
      const posthog = getPostHogClient();
      if (posthog && contact) {
        posthog.capture({
          distinctId: 'admin', // Or get from session if available
          event: 'contact_deleted',
          properties: {
            contact_id: id,
            contact_email: contact.email,
            deleted_at: new Date().toISOString(),
            admin_action: true
          }
        });
      }
      
      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      return Response.json({ 
        success: false, 
        error: error.message || "Failed to delete contact" 
      }, { status: 500 });
    }
  },
  
  async PATCH(req, ctx) {
    try {
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
        return Response.json({ success: false, error: "Invalid ID" }, { status: 400 });
      }
      
      const contact = ContactModel.getById(id);
      if (!contact) {
        return Response.json({ success: false, error: "Contact not found" }, { status: 404 });
      }
      
      const body = await req.json();
      const updated = ContactModel.update(id, body);
      
      if (!updated) {
        return Response.json({ success: false, error: "Failed to update contact" }, { status: 500 });
      }
      
      return Response.json({ success: true });
    } catch (error) {
      console.error("Error updating contact:", error);
      return Response.json({
        success: false,
        error: error.message || "Failed to update contact"
      }, { status: 500 });
    }
  }
};