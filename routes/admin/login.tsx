// routes/admin/login.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

interface LoginData {
  errorMessage?: string;
  redirectTo?: string;
  debug?: string; // Add debug information
}

export const handler: Handlers<LoginData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/admin/contacts";
    
    // In development, show debugging info
    const debug = !config.isProduction ? 
      `Expected credentials: ${config.admin.email} / ${config.admin.password}` : 
      undefined;
    
    return ctx.render({ redirectTo, debug });
  },
  
  async POST(req, ctx) {
    try {
      const form = await req.formData();
      const email = form.get("email")?.toString() || "";
      const password = form.get("password")?.toString() || "";
      const redirectTo = form.get("redirectTo")?.toString() || "/admin/contacts";
      
      console.log("Login attempt with:", { 
        email, 
        password: password.replace(/./g, '*'),  // Mask password in logs
        redirectPath: redirectTo 
      });
      
      console.log("Expected credentials:", {
        email: config.admin.email,
        password: config.admin.password.replace(/./g, '*') // Mask password
      });
      
      // Debug check for whitespace issues
      if (email.trim() !== email) {
        console.log("Warning: Email contains leading/trailing whitespace");
      }
      if (password.trim() !== password) {
        console.log("Warning: Password contains leading/trailing whitespace");
      }
      
      // Exact string comparison
      const emailMatches = email === config.admin.email;
      const passwordMatches = password === config.admin.password;
      
      console.log("Credential match results:", { emailMatches, passwordMatches });
      
      // Validate credentials
      if (!emailMatches || !passwordMatches) {
        // For development, add debug info
        let debugInfo = "";
        if (!config.isProduction) {
          debugInfo = `Expected: ${config.admin.email} / ${config.admin.password}\n`;
          debugInfo += `Received: ${email} / ${password.replace(/./g, '*')}\n`;
          debugInfo += `Email match: ${emailMatches}, Password match: ${passwordMatches}`;
        }
        
        return ctx.render({ 
          errorMessage: "Invalid email or password",
          redirectTo,
          debug: debugInfo
        });
      }
      
      // Create a session
      const sessionId = crypto.randomUUID();
      const kv = getKv();
      
      // Store session in KV
      await kv.set(["sessions", sessionId], {
        email,
        expires: Date.now() + config.session.maxAge * 1000
      });
      
      console.log("Session created:", sessionId);
      
      // Set cookie and redirect
      const headers = new Headers();
      headers.set(
        "Set-Cookie", 
        `${config.session.cookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.session.maxAge}`
      );
      headers.set("Location", redirectTo);
      
      return new Response(null, {
        status: 302,
        headers
      });
    } catch (error) {
      console.error("Login error:", error);
      return ctx.render({ 
        errorMessage: "An error occurred during login. Please try again.",
        redirectTo: "/admin/contacts" 
      });
    }
  }
};

export default function LoginPage({ data }: PageProps<LoginData>) {
  const { errorMessage, redirectTo, debug } = data || {};
  
  return (
    <>
      <Head>
        <title>Admin Login | DATA_GATA</title>
      </Head>
      
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full max-w-md">
          <div class="text-center mb-8">
            <div class="flex justify-center">
              <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500">
                <img 
                  src="/nerdy_alligator_headshot.png" 
                  alt="DATA_GATA Logo" 
                  class="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 class="text-2xl font-bold mt-4 text-gray-800">
              DATA_<span class="text-green-500">GATA</span> Admin
            </h1>
            <p class="text-gray-600 mt-2">Sign in to access the admin dashboard</p>
          </div>
          
          {errorMessage && (
            <div class="bg-red-100 text-red-800 p-4 rounded-md mb-6">
              {errorMessage}
            </div>
          )}
          
          {debug && (
            <div class="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-6 text-xs font-mono whitespace-pre-wrap text-gray-800">
              <p className="font-bold mb-1">Debug Info (only visible in development):</p>
              {debug}
            </div>
          )}
          
          <form method="POST" class="space-y-6">
            <input 
              type="hidden" 
              name="redirectTo" 
              value={redirectTo || "/admin/contacts"} 
            />
            
            <div>
              <label 
                for="email" 
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <label 
                for="password" 
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <button
              type="submit"
              class="w-full bg-green-500 text-gray-800 py-2 px-4 rounded-md hover:bg-green-400 transition-colors"
            >
              Sign In
            </button>
          </form>
          
          <div class="mt-6 text-center">
            <a 
              href="/" 
              class="text-green-500 hover:text-green-400 transition-colors"
            >
              &larr; Back to website
            </a>
          </div>
        </div>
      </div>
    </>
  );
}