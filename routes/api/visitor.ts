import { Handlers } from "$fresh/server.ts";
import { Application, Router } from "oak";
import { initDatabase } from "../../utils/db.ts";
import { VisitorModel } from "../../models/visitor.ts";

// Initialize the database when the module loads
await initDatabase();

// Create the Oak application for handling API requests
const app = new Application();
const router = new Router();

// Set up API routes
router
  // Get a visitor ID by email
  .get("/:email", (ctx) => {
    try {
      const email = ctx.params.email;
      
      if (!email) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, error: "Email is required" };
        return;
      }
      
      // Get or create visitor by email
      const visitor = VisitorModel.getOrCreate(email);
      
      ctx.response.body = { 
        success: true, 
        data: {
          visitor_id: visitor.visitor_id
        } 
      };
    } catch (error) {
      console.error("Error getting visitor:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, error: error.message };
    }
  });

// Register router with the app
app.use(router.routes());
app.use(router.allowedMethods());

// Fresh.js handler to bridge to Oak middleware
export const handler: Handlers = {
  async GET(req, ctx) {
    const response = await app.handle(req, ctx.remoteAddr);
    return response || new Response("Not Found", { status: 404 });
  },
};