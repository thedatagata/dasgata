import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";
import ObservablePlot from "./ObservablePlot.tsx";
import * as Plot from "@observablehq/plot";

interface PivotTableProps {
  motherDuckToken: string;
}

interface TableOption {
  fullName: string;
  displayName: string;
  source: 'browser' | 'motherduck';
}

// Available dimensions and measures
const DIMENSIONS = [
  { value: "traffic_source", label: "Traffic Source" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "plan_tier", label: "Plan Tier" },
  { value: "max_lifecycle_stage", label: "Lifecycle Stage" },
  { value: "is_customer", label: "Customer Status" },
  { value: "reached_activation", label: "Reached Activation" },
  { value: "DATE_TRUNC('week', session_date)", label: "Week" },
  { value: "DATE_TRUNC('month', session_date)", label: "Month" },
];

const MEASURES = [
  { value: "COUNT(*)", label: "Session Count", format: "number" },
  { value: "COUNT(DISTINCT COALESCE(user_id, cookie_id))", label: "Unique Users", format: "number" },
  { value: "SUM(session_revenue)", label: "Total Revenue", format: "currency" },
  { value: "AVG(session_revenue)", label: "Avg Revenue", format: "currency" },
  { value: "SUM(total_events)", label: "Total Events", format: "number" },
  { value: "AVG(total_events)", label: "Avg Events per Session", format: "decimal" },
  { value: "SUM(CASE WHEN reached_activation THEN 1 ELSE 0 END)", label: "Activations", format: "number" },
  { value: "SUM(CASE WHEN has_conversion THEN 1 ELSE 0 END)", label: "Conversions", format: "number" },
  { value: "AVG(session_duration_seconds)", label: "Avg Session Duration (sec)", format: "decimal" },
];

export default function PivotTable({ motherDuckToken }: PivotTableProps) {
  const [client, setClient] = useState<any>(null);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(["traffic_source"]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(["COUNT(*)", "SUM(session_revenue)"]);
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "none">("bar");
  
  // Table selection
  const [availableTables, setAvailableTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Initialize client
  useEffect(() => {
    async function init() {
      try {
        const c = await createMotherDuckClient(motherDuckToken);
        setClient(c);
        await loadAvailableTables(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
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

  // Execute pivot query
  async function executePivotQuery() {
    if (!client || selectedDimensions.length === 0 || selectedMeasures.length === 0 || !selectedTable) return;

    setLoading(true);
    setError(null);

    try {
      // Build dimension aliases for clean column names
      const dimensionAliases = selectedDimensions.map((dim, idx) => {
        const dimObj = DIMENSIONS.find(d => d.value === dim);
        const alias = dimObj?.label.replace(/\s+/g, '_').toLowerCase() || `dim_${idx}`;
        return `${dim} as ${alias}`;
      });

      // Build measure aliases
      const measureAliases = selectedMeasures.map((measure, idx) => {
        const measureObj = MEASURES.find(m => m.value === measure);
        const alias = measureObj?.label.replace(/\s+/g, '_').toLowerCase() || `measure_${idx}`;
        return `${measure} as ${alias}`;
      });

      const query = `
        SELECT 
          ${dimensionAliases.join(',\n          ')},
          ${measureAliases.join(',\n          ')}
        FROM ${selectedTable}
        GROUP BY ${selectedDimensions.map((_, idx) => idx + 1).join(', ')}
        ORDER BY ${measureAliases[0].split(' as ')[1]} DESC
        LIMIT 100
      `;

      console.log('Executing query:', query);

      const result = await client.evaluateQuery(query);
      const rows = result.data.toRows();
      
      setPivotData(rows);
    } catch (err) {
      console.error('Pivot query error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Auto-execute on dimension/measure change
  useEffect(() => {
    if (client && selectedTable) {
      executePivotQuery();
    }
  }, [client, selectedDimensions, selectedMeasures, selectedTable]);

  // Format cell values
  function formatValue(value: any, columnName: string): string {
    if (value === null || value === undefined) return 'N/A';
    
    const measure = MEASURES.find(m => 
      m.label.replace(/\s+/g, '_').toLowerCase() === columnName.toLowerCase()
    );
    
    if (measure?.format === 'currency') {
      return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
    } else if (measure?.format === 'decimal') {
      return typeof value === 'number' ? value.toFixed(2) : value;
    } else if (measure?.format === 'number') {
      return typeof value === 'number' ? value.toLocaleString() : value;
    }
    
    return String(value);
  }

  // Generate chart spec
  const chartSpec = chartType === "bar" && pivotData.length > 0 ? {
    marginLeft: 100,
    marginBottom: 60,
    marks: [
      (data: any[]) => Plot.barX(data, {
        y: Object.keys(data[0])[0], // First dimension
        x: Object.keys(data[0])[selectedDimensions.length], // First measure
        fill: "#3b82f6",
        sort: { y: "x", reverse: true },
        tip: true
      }),
      Plot.ruleX([0])
    ]
  } : chartType === "line" && pivotData.length > 0 ? {
    marginLeft: 60,
    marginBottom: 60,
    grid: true,
    marks: [
      (data: any[]) => Plot.lineY(data, {
        x: Object.keys(data[0])[0],
        y: Object.keys(data[0])[selectedDimensions.length],
        stroke: "#3b82f6",
        strokeWidth: 2,
        tip: true
      }),
      Plot.ruleY([0])
    ]
  } : null;

  if (error) {
    return (
      <div class="p-4 bg-red-900/20 border border-red-500/50 rounded">
        <h3 class="font-bold text-red-400">Error</h3>
        <p class="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold mb-4 text-[#F8F6F0]">Data Explorer</h2>
        
        {/* Table Selection */}
        <div class="mb-6 pb-4 border-b border-[#90C137]/30">
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
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dimensions */}
          <div>
            <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">
              Dimensions (Group By)
            </label>
            <div class="space-y-2 max-h-64 overflow-y-auto border border-[#90C137]/30 rounded p-3 bg-[#F8F6F0]/5">
              {DIMENSIONS.map(dim => (
                <label key={dim.value} class="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(dim.value)}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      setSelectedDimensions(prev =>
                        checked 
                          ? [...prev, dim.value]
                          : prev.filter(d => d !== dim.value)
                      );
                    }}
                    class="rounded text-[#90C137] focus:ring-[#90C137]"
                  />
                  <span class="text-sm text-[#F8F6F0] group-hover:text-[#90C137] transition-colors">{dim.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Measures */}
          <div>
            <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">
              Measures (Metrics)
            </label>
            <div class="space-y-2 max-h-64 overflow-y-auto border border-[#90C137]/30 rounded p-3 bg-[#F8F6F0]/5">
              {MEASURES.map(measure => (
                <label key={measure.value} class="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedMeasures.includes(measure.value)}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      setSelectedMeasures(prev =>
                        checked 
                          ? [...prev, measure.value]
                          : prev.filter(m => m !== measure.value)
                      );
                    }}
                    class="rounded text-[#90C137] focus:ring-[#90C137]"
                  />
                  <span class="text-sm text-[#F8F6F0] group-hover:text-[#90C137] transition-colors">{measure.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Type Selector */}
        <div class="mt-4">
          <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Visualization</label>
          <div class="flex space-x-4">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="chartType"
                value="bar"
                checked={chartType === "bar"}
                onChange={() => setChartType("bar")}
                class="text-[#90C137] focus:ring-[#90C137]"
              />
              <span class="text-sm text-[#F8F6F0]">Bar Chart</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="chartType"
                value="line"
                checked={chartType === "line"}
                onChange={() => setChartType("line")}
                class="text-[#90C137] focus:ring-[#90C137]"
              />
              <span class="text-sm text-[#F8F6F0]">Line Chart</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="chartType"
                value="none"
                checked={chartType === "none"}
                onChange={() => setChartType("none")}
                class="text-[#90C137] focus:ring-[#90C137]"
              />
              <span class="text-sm text-[#F8F6F0]">Table Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div class="bg-[#90C137]/20 border border-[#90C137]/50 rounded p-4">
          <p class="text-[#90C137]">Loading data...</p>
        </div>
      )}

      {/* Chart */}
      {!loading && chartSpec && pivotData.length > 0 && (
        <ObservablePlot
          data={pivotData}
          spec={chartSpec}
          title="Visualization"
        />
      )}

      {/* Pivot Table */}
      {!loading && pivotData.length > 0 && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-[#F8F6F0]">
              Results ({pivotData.length} rows)
            </h3>
            <button
              onClick={() => {
                const csv = [
                  Object.keys(pivotData[0]).join(','),
                  ...pivotData.map(row => Object.values(row).join(','))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'pivot_data.csv';
                a.click();
              }}
              class="px-3 py-1 bg-[#90C137] text-[#172217] rounded text-sm hover:bg-[#a0d147] font-medium transition-colors"
            >
              Export CSV
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full border border-[#90C137]/30 text-sm">
              <thead class="bg-[#F8F6F0]/5 sticky top-0">
                <tr>
                  {pivotData.length > 0 && Object.keys(pivotData[0]).map((key) => (
                    <th key={key} class="px-3 py-2 border border-[#90C137]/30 text-left font-medium whitespace-nowrap text-[#90C137]">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotData.map((row, idx) => (
                  <tr key={idx} class="hover:bg-[#F8F6F0]/5">
                    {Object.entries(row).map(([key, val], i) => (
                      <td key={i} class="px-3 py-2 border border-[#90C137]/30 whitespace-nowrap text-[#F8F6F0]">
                        {formatValue(val, key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && pivotData.length === 0 && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded p-8 text-center">
          <p class="text-[#F8F6F0]">
            Select dimensions and measures to explore your data
          </p>
        </div>
      )}
    </div>
  );
}
