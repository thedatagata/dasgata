import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";
import SimplePivot from "./SimplePivot.tsx";

interface DashboardDataProps {
  motherDuckToken: string;
}

export default function DashboardData({ motherDuckToken }: DashboardDataProps) {
  const [status, setStatus] = useState("Initializing DuckDB-WASM...");
  const [userData, setUserData] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWasm() {
      try {
        setStatus("Connecting to MotherDuck...");
        const client = await createMotherDuckClient(motherDuckToken);
        
        if (!mounted) return;
        setStatus("Loading user summary data...");

        const userResult = await client.evaluateQuery(
        "SELECT * FROM my_db.amplitude.users_fct LIMIT 1000"
        );
        const userRows = userResult.data.toRows();
        
        if (!mounted) return;
        setUserData(userRows);
        setStatus("Loading session summary data...");

        const sessionResult = await client.evaluateQuery(
        "SELECT * FROM my_db.amplitude.sessions_fct LIMIT 1000"
        );
        const sessionRows = sessionResult.data.toRows();
        
        if (!mounted) return;
        setSessionData(sessionRows);
        setStatus(`Loaded ${userRows.length} users and ${sessionRows.length} sessions`);

      } catch (err) {
        console.error("Error initializing WASM:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("Error loading data");
        }
      }
    }

    initializeWasm();

    return () => {
      mounted = false;
    };
  }, [motherDuckToken]);

  if (error) {
    return (
      <div class="p-4 bg-red-50 border border-red-200 rounded">
        <h3 class="font-bold text-red-800">Error</h3>
        <p class="text-red-600">{error}</p>
        <details class="mt-2">
          <summary class="cursor-pointer text-sm text-red-700">Troubleshooting</summary>
          <ul class="mt-2 text-sm text-red-600 list-disc list-inside">
            <li>Ensure CORS headers are set (check _middleware.ts exists)</li>
            <li>Check that MotherDuck token is valid</li>
            <li>Verify tables exist: user_summary, sessions_summary</li>
          </ul>
        </details>
      </div>
    );
  }

  return (
    <div class="p-4">
      <div class="mb-4">
        <h2 class="text-xl font-bold">Dashboard Data Status</h2>
        <p class="text-gray-600">{status}</p>
      </div>

      {userData.length > 0 && (
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">User Summary Preview</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border border-gray-300">
              <thead class="bg-gray-100">
                <tr>
                  {Object.keys(userData[0]).map((key) => (
                    <th key={key} class="px-4 py-2 border text-left text-sm font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userData.slice(0, 5).map((row, idx) => (
                  <tr key={idx} class="hover:bg-gray-50">
                    {Object.values(row).map((val, i) => (
                      <td key={i} class="px-4 py-2 border text-sm">
                        {typeof val === 'number' ? val.toFixed(2) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Showing 5 of {userData.length} users loaded
          </p>
        </div>
      )}

      {sessionData.length > 0 && (
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">Session Summary Preview</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border border-gray-300">
              <thead class="bg-gray-100">
                <tr>
                  {Object.keys(sessionData[0]).map((key) => (
                    <th key={key} class="px-4 py-2 border text-left text-sm font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionData.slice(0, 5).map((row, idx) => (
                  <tr key={idx} class="hover:bg-gray-50">
                    {Object.values(row).map((val, i) => (
                      <td key={i} class="px-4 py-2 border text-sm">
                        {typeof val === 'number' ? val.toFixed(2) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Showing 5 of {sessionData.length} sessions loaded
          </p>
        </div>
      )}

      {userData.length > 0 && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SimplePivot data={userData} title="User Summary Pivot" />
          {sessionData.length > 0 && (
            <SimplePivot data={sessionData} title="Session Summary Pivot" />
          )}
        </div>
      )}
    </div>
  );
}