import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { config } from "../../utils/config.ts";

interface LoginPageData {
  error?: string;
}

export const handler: Handlers<LoginPageData> = {
  GET(req, ctx) {
    return ctx.render({});
  },
  
  async POST(req, ctx) {
    const form = await req.formData();
    const email = form.get("email")?.toString();
    const password = form.get("password")?.toString();
    
    console.log("Login attempt:", { email, password });
    console.log("Expected credentials:", { 
      email: config.admin.email, 
      password: config.admin.password 
    });
    
    if (email === config.admin.email && password === config.admin.password) {
      console.log("Credentials match, creating session");
      
      // Set session data in context
      ctx.state.session = {
        authenticated: true,
        isAdmin: true
      };
      
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/admin/contacts"
        }
      });
    }
    
    console.log("Authentication failed");
    return ctx.render({ error: "Invalid email or password" });
  }
};

export default function AdminLoginPage({ data }: PageProps<LoginPageData>) {
  const { error } = data || {};
  
  return (
    <>
      <Head>
        <title>Admin Login - DATA_GATA</title>
      </Head>
      
      <div class="min-h-screen flex items-center justify-center bg-[#172217]">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="py-4 px-6 bg-[#90C137]">
            <h2 class="text-2xl font-bold text-[#172217]">Admin Login</h2>
          </div>
          
          <div class="py-8 px-6">
            {error && (
              <div class="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
                {error}
              </div>
            )}
            
            <form method="POST">
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-medium mb-2" for="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#90C137]"
                  placeholder="admin@example.com"
                />
              </div>
              
              <div class="mb-6">
                <label class="block text-gray-700 text-sm font-medium mb-2" for="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#90C137]"
                  placeholder="Enter your password"
                />
              </div>
              
              <button
                type="submit"
                class="w-full py-2 px-4 bg-[#90C137] hover:bg-[#7dab2a] text-[#172217] font-bold rounded-md transition-colors"
              >
                Sign In
              </button>
            </form>
            
            <div class="mt-6 text-center">
              <a href="/" class="text-sm text-gray-600 hover:text-[#90C137]">
                Return to Homepage
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}