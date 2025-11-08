// routes/admin/users.tsx
import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";
import AdminNav from "../../components/AdminNav.tsx";

interface User {
  email: string;
  name: string;
  picture: string;
  createdAt: number;
  onboardingCompleted: boolean;
  department: string | null;
  metrics: string[];
  sources: string[];
}

interface AdminUsersData {
  users: User[];
}

export const handler: Handlers<AdminUsersData> = {
  async GET(req, ctx) {
    const kv = getKv();
    
    // Get all users
    const users: User[] = [];
    const userEntries = kv.list({ prefix: ["users"] });
    
    for await (const entry of userEntries) {
      users.push(entry.value as User);
    }
    
    // Sort by creation date (newest first)
    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    return ctx.render({ users });
  },

  async POST(req, ctx) {
    const kv = getKv();
    const formData = await req.formData();
    const action = formData.get("action");
    const email = formData.get("email");

    if (action === "delete" && email) {
      // Delete user record
      await kv.delete(["users", email]);
      
      // Delete all user sessions
      const sessions = kv.list({ prefix: ["user_sessions"] });
      for await (const session of sessions) {
        const sessionData = session.value as any;
        if (sessionData.email === email) {
          await kv.delete(session.key);
        }
      }

      console.log(`Deleted user: ${email}`);
    }

    // Redirect back to users page
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/users" }
    });
  }
};

export default function AdminUsers({ data }: PageProps<AdminUsersData>) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      <Head>
        <title>User Management | DATA_GATA Admin</title>
      </Head>
      
      <AdminNav />

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-[#172217]">User Management</h1>
        </div>

        {data.users.length === 0 ? (
          <div class="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
            <p class="text-gray-500">No users found</p>
          </div>
        ) : (
          <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Onboarding
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {data.users.map((user) => (
                  <tr key={user.email} class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img 
                          class="h-10 w-10 rounded-full" 
                          src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                          alt={user.name}
                        />
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div class="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {user.onboardingCompleted ? (
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Incomplete
                        </span>
                      )}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department || "-"}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <form method="POST" class="inline" onSubmit={(e) => {
                        if (!confirm(`Delete ${user.email}? They'll need to complete onboarding again.`)) {
                          e.preventDefault();
                        }
                      }}>
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="email" value={user.email} />
                        <button 
                          type="submit"
                          class="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
