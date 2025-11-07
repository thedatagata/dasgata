import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";
import ObservablePlot from "./ObservablePlot.tsx";
import * as Plot from "@observablehq/plot";

interface DashboardDataProps {
  motherDuckToken: string;
}

interface TableOption {
  fullName: string;
  displayName: string;
  source: 'browser' | 'motherduck';
}

export default function DashboardWithPlots({ motherDuckToken }: DashboardDataProps) {
  const [status, setStatus] = useState("Initializing DuckDB-WASM...");
  const [client, setClient] = useState<any>(null);
  const [userData, setUserData] = useState<any[]>([]);
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Table selection
  const [availableTables, setAvailableTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Initialize client and load tables
  useEffect(() => {
    async function init() {
      try {
        setStatus("Connecting to MotherDuck...");
        const c = await createMotherDuckClient(motherDuckToken);
        setClient(c);
        await loadAvailableTables(c);
        setStatus("Ready - select a table to visualize");
      } catch (err) {
        console.error("Error initializing:", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("Error loading data");
      }
    }
    init();
  }, [motherDuckToken]);

  async function loadAvailableTables(c: any) {
    try {
      // Get Browser (WASM) tables
      const wasmQuery = `
        SELECT 
          'memory.main.' || table_name as full_name,
          table_name as display_name,
          'browser' as source
        FROM duckdb_tables()
        WHERE database_name = 'memory' AND schema_name = 'main'
      `;
      const wasmResult = await c.evaluateQuery(wasmQuery);
      const wasmTables = wasmResult.data.toRows();

      // Get MotherDuck tables
      const mdQuery = `
        SELECT 
          database_name || '.' || schema_name || '.' || table_name as full_name,
          database_name || '.' || schema_name || '.' || table_name as display_name,
          'motherduck' as source
        FROM duckdb_tables()
        WHERE database_name != 'memory' 
          AND database_name != 'system'
          AND NOT internal
        ORDER BY database_name, schema_name, table_name
      `;
      const mdResult = await c.evaluateQuery(mdQuery);
      const mdTables = mdResult.data.toRows();

      const allTables = [...wasmTables, ...mdTables];
      setAvailableTables(allTables);
      
      // Default to sessions_fct if available
      const defaultTable = allTables.find(t => t.full_name.includes('sessions_fct'));
      if (defaultTable) {
        setSelectedTable(defaultTable.full_name);
      } else if (allTables.length > 0) {
        setSelectedTable(allTables[0].full_name);
      }
    } catch (err) {
      console.error('Error loading tables:', err);
    }
  }

  // Load data when table selection changes
  useEffect(() => {
    if (client && selectedTable) {
      loadTableData();
    }
  }, [client, selectedTable]);

  async function loadTableData() {
    if (!client || !selectedTable) return;

    setLoading(true);
    setError(null);

    try {
      setStatus("Loading time series data...");

      // Load time series aggregation using session_date
      const timeSeriesResult = await client.evaluateQuery(`
        SELECT 
          session_date as date,
          COUNT(DISTINCT COALESCE(user_id, cookie_id)) as daily_users,
          COUNT(*) as daily_sessions,
          SUM(session_revenue) as daily_revenue,
          SUM(CASE WHEN reached_activation THEN 1 ELSE 0 END) as daily_activations
        FROM ${selectedTable}
        GROUP BY session_date
        ORDER BY session_date
        LIMIT 365
      `);
      const timeSeriesRows = timeSeriesResult.data.toRows();
      
      // Parse dates for Observable Plot
      const parsedTimeSeriesData = timeSeriesRows.map(row => ({
        ...row,
        date: new Date(row.date)
      }));
      
      console.log('Time series data sample:', parsedTimeSeriesData.slice(0, 3));
      console.log('Total time series rows:', parsedTimeSeriesData.length);
      
      setTimeSeriesData(parsedTimeSeriesData);
      setStatus(`Dashboard loaded: ${parsedTimeSeriesData.length} days of data`);

    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("Error loading data");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div class="p-4 bg-red-900/20 border border-red-500/50 rounded">
        <h3 class="font-bold text-red-400">Error</h3>
        <p class="text-red-300">{error}</p>
        <details class="mt-2">
          <summary class="cursor-pointer text-sm text-red-400">Troubleshooting</summary>
          <ul class="mt-2 text-sm text-red-300 list-disc list-inside">
            <li>Ensure CORS headers are set (check _middleware.ts)</li>
            <li>Check that MotherDuck token is valid in .env</li>
            <li>Verify table has required columns: session_date, user_id, session_revenue, reached_activation</li>
          </ul>
        </details>
      </div>
    );
  }

  // Observable Plot specifications
  const timeSeriesPlotSpec = {
    marginLeft: 60,
    marginBottom: 40,
    grid: true,
    marks: [
      (data: any[]) => Plot.lineY(data, {
        x: "date",
        y: "daily_users",
        stroke: "#2563eb",
        strokeWidth: 2,
        tip: true
      }),
      Plot.ruleY([0])
    ],
    y: { label: "Daily Active Users" }
  };

  const sessionsBarPlotSpec = {
    marginLeft: 60,
    marginBottom: 40,
    marks: [
      (data: any[]) => Plot.barY(data, {
        x: "date",
        y: "daily_sessions",
        fill: "#10b981",
        tip: true
      }),
      Plot.ruleY([0])
    ],
    y: { label: "Daily Sessions" }
  };

  const revenueAreaPlotSpec = {
    marginLeft: 60,
    marginBottom: 40,
    grid: true,
    marks: [
      (data: any[]) => Plot.areaY(data, {
        x: "date",
        y: "daily_revenue",
        fill: "#8b5cf6",
        fillOpacity: 0.3,
        tip: true
      }),
      (data: any[]) => Plot.lineY(data, {
        x: "date",
        y: "daily_revenue",
        stroke: "#8b5cf6",
        strokeWidth: 2
      }),
      Plot.ruleY([0])
    ],
    y: { label: "Daily Revenue ($)", tickFormat: "$,.0f" }
  };

  const activationsPlotSpec = {
    marginLeft: 60,
    marginBottom: 40,
    marks: [
      (data: any[]) => Plot.barY(data, {
        x: "date",
        y: "daily_activations",
        fill: "#f59e0b",
        tip: true
      }),
      Plot.ruleY([0])
    ],
    y: { label: "Daily Activations" }
  };

  return (
    <div class="space-y-6">
      {/* Table Selection */}
      <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold mb-4 text-[#F8F6F0]">Time Series Analytics</h2>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">
            Select Data Source:
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg focus:border-[#90C137] focus:ring-1 focus:ring-[#90C137]"
          >
            {availableTables.length === 0 ? (
              <option value="">Loading tables...</option>
            ) : (
              <>
                <optgroup label="💾 Browser (WASM)">
                  {availableTables.filter(t => t.source === 'browser').map(table => (
                    <option key={table.full_name} value={table.full_name}>
                      {table.display_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="☁️ MotherDuck (Cloud)">
                  {availableTables.filter(t => t.source === 'motherduck').map(table => (
                    <option key={table.full_name} value={table.full_name}>
                      {table.display_name}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
          {!selectedTable && availableTables.length > 0 && (
            <p class="text-xs text-red-400 mt-2">⚠️ Please select a table</p>
          )}
        </div>

        {/* Status Bar */}
        <div class="bg-[#90C137]/20 border border-[#90C137]/50 rounded-lg p-4">
          <p class="text-sm text-[#90C137]">{status}</p>
        </div>
      </div>

      {loading && (
        <div class="bg-[#90C137]/20 border border-[#90C137]/50 rounded p-4">
          <p class="text-[#90C137]">Loading data...</p>
        </div>
      )}

      {/* Time Series Charts */}
      {!loading && timeSeriesData.length > 0 && (
        <>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ObservablePlot
              data={timeSeriesData}
              spec={timeSeriesPlotSpec}
              title="Daily Active Users"
            />
            <ObservablePlot
              data={timeSeriesData}
              spec={sessionsBarPlotSpec}
              title="Daily Sessions"
            />
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ObservablePlot
              data={timeSeriesData}
              spec={revenueAreaPlotSpec}
              title="Daily Revenue"
            />
            <ObservablePlot
              data={timeSeriesData}
              spec={activationsPlotSpec}
              title="Daily Activations"
            />
          </div>
        </>
      )}

      {!loading && timeSeriesData.length === 0 && selectedTable && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded p-8 text-center">
          <p class="text-[#F8F6F0]">
            No time series data available for this table
          </p>
          <p class="text-sm text-[#F8F6F0]/70 mt-2">
            Make sure the table has session_date, user_id, session_revenue, and reached_activation columns
          </p>
        </div>
      )}
    </div>
  );
}
