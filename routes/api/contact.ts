// routes/api/contact.ts
import { Handlers } from "$fresh/server.ts";
import { getDb, initDatabase } from "../../utils/db.ts";
import { ContactModel } from "../../models/contact.ts";
import { VisitorModel } from "../../models/visitor.ts";
import { getPostHogClient } from "../../utils/posthog-server.ts";

// Initialize the database when the module loads
await initDatabase();

export const handler: Handlers = {
  async POST(req) {
    try {
      // Parse the JSON body
      const body = await req.json();
      
      // Create the contact in the database
      const contact = {
        name: body.name,
        email: body.email,
        service: body.service,
        message: body.message
      };
      
      // Insert into database
      const newContact = ContactModel.create(contact);
      
      // Create or update visitor record for PostHog tracking
      const visitor = VisitorModel.getOrCreate(contact.email);
      
      // Track the event in PostHog
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: visitor.visitor_id,
          event: 'contact_form_submitted',
          properties: {
            name: contact.name,
            email: contact.email,
            service: contact.service,
            message_length: contact.message.length,
            submission_source: 'server',
            status: 'success'
          }
        });
      }
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          data: newContact,
          visitor_id: visitor.visitor_id
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    } catch (error) {
      console.error("Error creating contact:", error);
      
      // Track the error event if possible
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({
          distinctId: 'server',
          event: 'contact_form_error',
          properties: {
            error_message: error.message,
            submission_source: 'server'
          }
        });
      }
      
      // Return error response
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "An error occurred while processing your request"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  },
  
  // Handle OPTIONS for CORS if needed
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