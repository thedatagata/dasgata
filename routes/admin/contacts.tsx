import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { initDatabase } from "../../utils/db.ts";
import { ContactModel, Contact } from "../../models/contact.ts";
import AdminNav from "../../components/AdminNav.tsx";

// Initialize the database when the module loads
await initDatabase();

interface ContactsPageData {
  contacts: Contact[];
  authenticated: boolean;
}

export const handler: Handlers<ContactsPageData> = {
  async GET(_req, ctx) {
    // Auth already checked by middleware
    const contacts = ContactModel.getAll();
    return ctx.render({ contacts, authenticated: true });
  },
};

export default function ContactsAdminPage({ data }: PageProps<ContactsPageData>) {
  const { contacts, authenticated } = data;
  
  return (
    <>
      <Head>
        <title>Admin - Contact Submissions</title>
      </Head>
      
      <div class="min-h-screen bg-gray-100">
        <AdminNav />
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">Contact Form Submissions</h1>
          
          <div class="bg-white shadow overflow-hidden sm:rounded-md">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} class="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                      No contact submissions yet
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">{contact.name}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">{contact.email}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">{contact.service || "Not specified"}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contact.status === 'new' 
                            ? 'bg-blue-100 text-blue-800' 
                            : contact.status === 'in-progress' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {contact.status || 'new'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">
                          {new Date(contact.created_at || "").toLocaleDateString()}
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a href={`/admin/contacts/${contact.id}`} class="text-indigo-600 hover:text-indigo-900 mr-4">
                          View
                        </a>
                        <button 
                          class="text-red-600 hover:text-red-900"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this contact?")) {
                              fetch(`/api/contact/${contact.id}`, {
                                method: "DELETE",
                              }).then(() => {
                                window.location.reload();
                              });
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}