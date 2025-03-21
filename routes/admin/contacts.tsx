// routes/admin/contacts.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { Contact, ContactModel } from "../../models/contact.ts";
import AdminNav from "../../components/AdminNav.tsx";
import { initDatabase } from "../../utils/db.ts";

// Initialize database
await initDatabase();

interface ContactsPageData {
  contacts: Contact[];
}

export const handler: Handlers<ContactsPageData> = {
  async GET(_req, ctx) {
    try {
      const contacts = await ContactModel.getAll();
      return ctx.render({ contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return ctx.render({ contacts: [] });
    }
  }
};

export default function ContactsPage({ data }: PageProps<ContactsPageData>) {
  const { contacts } = data;
  
  return (
    <>
      <Head>
        <title>Contact Submissions | DATA_GATA Admin</title>
      </Head>
      
      <AdminNav />
      
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-[#172217]">Contact Submissions</h1>
        </div>
        
        {contacts.length === 0 ? (
          <div class="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
            <p class="text-gray-500">No contact submissions yet.</p>
          </div>
        ) : (
          <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="font-medium text-gray-900">{contact.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-gray-500">{contact.email}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-gray-500">{contact.service || "General"}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        contact.status === 'new' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.status === 'new' ? 'New' : 'Viewed'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={`/admin/contacts/${contact.id}`} class="text-[#90C137] hover:text-[#7dab2a]">
                        View
                      </a>
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