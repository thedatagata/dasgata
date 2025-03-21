// routes/api/contact.ts
import { Handlers } from "$fresh/server.ts";
import { initDatabase } from "../../utils/db.ts";
import { ContactModel } from "../../models/contact.ts";
import { VisitorModel } from "../../models/visitor.ts";
import { trackEvent } from "../../utils/posthog.ts";

// Initialize the database
await initDatabase();

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      
      const contact = {
        name: body.name,
        email: body.email,
        service: body.service,
        message: body.message
      };
      
      // Now async
      const newContact = await ContactModel.create(contact);
      const visitor = await VisitorModel.getOrCreate(contact.email);
      
      // Track successful form submission
      trackEvent('form_submitted', visitor.visitor_id, {
        form_type: 'contact',
        service_selected: contact.service,
        message_length: contact.message.length,
        contact_id: newContact.id
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          data: newContact,
          visitor_id: visitor.visitor_id
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error creating contact:", error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "An error occurred while processing your request"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
  
  OPTIONS() {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
};