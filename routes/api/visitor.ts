// routes/api/visitor.ts
import { Handlers } from "$fresh/server.ts";
import { initDatabase } from "../../utils/db.ts";
import { VisitorModel } from "../../models/visitor.ts";

// Initialize the database when the module loads
await initDatabase();

export const handler: Handlers = {
  async GET(req, _ctx) {
    try {
      // Parse the URL to get the email parameter
      const url = new URL(req.url);
      const email = url.pathname.split("/").pop();
      
      if (!email) {
        return Response.json(
          { success: false, error: "Email is required" },
          { status: 400 }
        );
      }
      
      // Get or create visitor by email
      const visitor = await VisitorModel.getOrCreate(email);
      
      return Response.json({ 
        success: true, 
        data: {
          visitor_id: visitor.visitor_id
        }
      });
    } catch (error) {
      console.error("Error getting visitor:", error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
};