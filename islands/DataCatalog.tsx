import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";

interface DataCatalogProps {
  motherDuckToken: string;
}

interface TableInfo {
  database: string;
  schema: string;
  table: string;
  row_count: number;
  column_count: number;
  size_bytes?: number;
  comment?: string;
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
}

export default function DataCatalog({ motherDuckToken }: DataCatalogProps) {
  const [client, setClient] = useState<any>(null);
  const [wasmTables, setWasmTables] = useState<TableInfo[]>([]);
  const [motherDuckTables, setMotherDuckTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"wasm" | "motherduck">("motherduck");

  // Expanded table state for accordion
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<ColumnInfo[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Load dialog state
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadDialogTable, setLoadDialogTable] = useState<TableInfo | null>(null);
  const [loadMode, setLoadMode] = useState<"stream" | "materialize">("materialize");
  const [materializeQuery, setMaterializeQuery] = useState("");
  const [targetTableName, setTargetTableName] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const c = await createMotherDuckClient(motherDuckToken);
        await c.evaluateQuery('USE my_db;');
        setClient(c);
        await loadCatalogData(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    init();
  }, [motherDuckToken]);

  async function loadCatalogData(c: any) {
    setLoading(true);
    try {
      const wasmResult = await c.evaluateQuery(`
        SELECT 
          database_name as database,
          schema_name as schema,
          table_name as table,
          estimated_size as row_count,
          column_count,
          comment
        FROM duckdb_tables()
        WHERE database_name = 'memory'
        AND internal = false
        ORDER BY schema_name, table_name
      `);
      setWasmTables(wasmResult.data.toRows());

      const mdResult = await c.evaluateQuery(`
        SELECT 
          database_name as database,
          schema_name as schema,
          table_name as table,
          estimated_size as row_count,
          column_count,
          comment
        FROM duckdb_tables()
        WHERE database_name != 'memory'
        AND database_name NOT IN ('system', 'temp')
        AND internal = false
        ORDER BY database_name, schema_name, table_name
      `);
      setMotherDuckTables(mdResult.data.toRows());

    } catch (err) {
      console.error('Error loading catalog:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleTableExpansion(tableName: string, database: string, schema: string) {
    const fullName = `${database}.${schema}.${tableName}`;
    
    if (expandedTable === fullName) {
      // Collapse
      setExpandedTable(null);
      setExpandedColumns([]);
    } else {
      // Expand and load columns
      setExpandedTable(fullName);
      setLoadingColumns(true);
      
      try {
        const result = await client.evaluateQuery(`
          SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM duckdb_columns()
          WHERE database_name = '${database}'
          AND schema_name = '${schema}'
          AND table_name = '${tableName}'
          ORDER BY column_index
        `);
        setExpandedColumns(result.data.toRows());
      } catch (err) {
        console.error('Error loading columns:', err);
      } finally {
        setLoadingColumns(false);
      }
    }
  }

  function openLoadDialog(table: TableInfo) {
    setLoadDialogTable(table);
    setTargetTableName(table.table);
    setMaterializeQuery(`SELECT * FROM ${table.database}.${table.schema}.${table.table} LIMIT 10000`);
    setShowLoadDialog(true);
    loadPreviewData(table);
  }

  async function loadPreviewData(table: TableInfo) {
    if (!client) return;
    
    setLoadingPreview(true);
    try {
      const result = await client.evaluateQuery(`
        SELECT * FROM ${table.database}.${table.schema}.${table.table} 
        LIMIT 5
      `);
      setPreviewData(result.data.toRows());
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewData([]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function executeLoad() {
    if (!client || !loadDialogTable) return;
    
    setLoadingData(true);
    try {
      if (loadMode === "stream") {
        alert(`✅ ${loadDialogTable.database}.${loadDialogTable.schema}.${loadDialogTable.table} is already available for streaming queries!
        
Use it in queries like:
SELECT * FROM ${loadDialogTable.database}.${loadDialogTable.schema}.${loadDialogTable.table}

This queries the remote table over the network.`);
      } else {
        await client.evaluateQuery(`
          CREATE OR REPLACE TABLE memory.main.${targetTableName} AS 
          ${materializeQuery}
        `);
        
        await loadCatalogData(client);
        setView("wasm");
        alert(`✅ Materialized ${targetTableName} in browser memory!`);
      }
      
      setShowLoadDialog(false);
    } catch (err) {
      console.error('Error loading table:', err);
      alert(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingData(false);
    }
  }

  const currentTables = view === "wasm" ? wasmTables : motherDuckTables;

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
        <h2 class="text-xl font-bold mb-2 text-[#F8F6F0]">Data Catalog</h2>
        <p class="text-sm text-[#F8F6F0]/70">
          Browse tables and columns. Click table names to expand and view schema.
        </p>
        <div class="mt-3 p-3 bg-[#90C137]/10 border border-[#90C137]/30 rounded text-sm text-[#90C137]">
          <strong>Note:</strong> MotherDuck tables query over the network. Choose "Stream" for remote queries or "Materialize" to download data into your browser.
        </div>
      </div>

      {error && (
        <div class="bg-red-900/20 border border-red-500/30 rounded p-4">
          <p class="text-red-400 font-semibold">Error</p>
          <p class="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && loadDialogTable && (
        <div class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div class="bg-[#172217] border-2 border-[#90C137]/30 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <h3 class="text-xl font-bold mb-4 text-[#F8F6F0]">
                Load Table: <span class="text-[#90C137]">{loadDialogTable.database}.{loadDialogTable.schema}.{loadDialogTable.table}</span>
              </h3>
              
              {/* Data Preview */}
              <div class="mb-6">
                <h4 class="text-sm font-medium mb-2 text-[#F8F6F0]">Data Preview (First 5 Rows)</h4>
                {loadingPreview ? (
                  <div class="border border-[#90C137]/20 rounded p-8 text-center text-[#F8F6F0]/60">
                    Loading preview...
                  </div>
                ) : previewData.length > 0 ? (
                  <div class="border border-[#90C137]/20 rounded overflow-x-auto max-h-64 overflow-y-auto bg-[#172217]/40">
                    <table class="min-w-full text-xs">
                      <thead class="bg-[#90C137]/10 sticky top-0">
                        <tr>
                          {Object.keys(previewData[0]).map((key) => (
                            <th key={key} class="px-2 py-1 text-left font-medium border-b border-[#90C137]/20 text-[#90C137]">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, idx) => (
                          <tr key={idx} class="hover:bg-[#90C137]/5">
                            {Object.values(row).map((val, i) => (
                              <td key={i} class="px-2 py-1 border-b border-[#90C137]/10 text-[#F8F6F0]/80">
                                {val === null ? (
                                  <span class="text-[#F8F6F0]/40 italic">null</span>
                                ) : typeof val === 'number' ? (
                                  val.toLocaleString()
                                ) : typeof val === 'boolean' ? (
                                  val ? 'true' : 'false'
                                ) : (
                                  String(val).length > 50 ? String(val).substring(0, 50) + '...' : String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div class="border border-[#90C137]/20 rounded p-8 text-center text-[#F8F6F0]/60">
                    No preview data available
                  </div>
                )}
              </div>
              
              {/* Mode Selection */}
              <div class="mb-6">
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Connection Mode</label>
                <div class="space-y-3">
                  <label class="flex items-start space-x-3 p-3 border border-[#90C137]/30 rounded cursor-pointer hover:bg-[#90C137]/10 transition-colors">
                    <input
                      type="radio"
                      name="loadMode"
                      value="stream"
                      checked={loadMode === "stream"}
                      onChange={() => setLoadMode("stream")}
                      class="mt-1"
                    />
                    <div class="flex-1">
                      <div class="font-medium text-[#F8F6F0]">🌊 Streaming Connection</div>
                      <div class="text-sm text-[#F8F6F0]/70 mt-1">
                        Query the table remotely over the network. No data downloaded. Always up-to-date.
                      </div>
                    </div>
                  </label>
                  
                  <label class="flex items-start space-x-3 p-3 border border-[#90C137]/30 rounded cursor-pointer hover:bg-[#90C137]/10 transition-colors">
                    <input
                      type="radio"
                      name="loadMode"
                      value="materialize"
                      checked={loadMode === "materialize"}
                      onChange={() => setLoadMode("materialize")}
                      class="mt-1"
                    />
                    <div class="flex-1">
                      <div class="font-medium text-[#F8F6F0]">💾 Materialize in Browser</div>
                      <div class="text-sm text-[#F8F6F0]/70 mt-1">
                        Download data into browser memory. Instant queries. Works offline. Can filter/sample.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Materialize Options */}
              {loadMode === "materialize" && (
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Target Table Name</label>
                    <input
                      type="text"
                      value={targetTableName}
                      onInput={(e) => setTargetTableName((e.target as HTMLInputElement).value)}
                      class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 rounded text-[#F8F6F0] placeholder-[#F8F6F0]/40 focus:border-[#90C137] focus:outline-none"
                      placeholder="e.g., sessions_sample"
                    />
                    <p class="text-xs text-[#F8F6F0]/60 mt-1">
                      Table will be created as: memory.main.{targetTableName}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">
                      Materialization Query
                      <span class="ml-2 text-xs text-[#F8F6F0]/60">(Customize to filter, sample, or transform)</span>
                    </label>
                    <textarea
                      value={materializeQuery}
                      onInput={(e) => setMaterializeQuery((e.target as HTMLTextAreaElement).value)}
                      rows={8}
                      class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 rounded font-mono text-sm text-[#90C137] placeholder-[#F8F6F0]/40 focus:border-[#90C137] focus:outline-none"
                      placeholder="SELECT * FROM table WHERE ..."
                    />
                    <div class="mt-2 space-y-1 text-xs text-gray-600">
                      <p>💡 Examples:</p>
                      <button
                        onClick={() => setMaterializeQuery(`SELECT * FROM ${loadDialogTable.database}.${loadDialogTable.schema}.${loadDialogTable.table} LIMIT 10000`)}
                        class="block text-blue-600 hover:underline"
                      >
                        • Sample first 10K rows
                      </button>
                      <button
                        onClick={() => setMaterializeQuery(`SELECT * FROM ${loadDialogTable.database}.${loadDialogTable.schema}.${loadDialogTable.table} WHERE session_date >= '2024-01-01'`)}
                        class="block text-blue-600 hover:underline"
                      >
                        • Filter recent data only
                      </button>
                      <button
                        onClick={() => setMaterializeQuery(`SELECT * FROM ${loadDialogTable.database}.${loadDialogTable.schema}.${loadDialogTable.table} USING SAMPLE 10%`)}
                        class="block text-blue-600 hover:underline"
                      >
                        • Random 10% sample
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div class="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowLoadDialog(false)}
                  disabled={loadingData}
                  class="px-4 py-2 border border-[#90C137]/30 rounded text-[#F8F6F0] hover:bg-[#90C137]/10 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeLoad}
                  disabled={loadingData || (loadMode === "materialize" && !targetTableName.trim())}
                  class="px-4 py-2 bg-[#90C137] text-[#172217] rounded hover:bg-[#a0d147] disabled:bg-[#90C137]/30 font-medium transition-colors"
                >
                  {loadingData ? "Loading..." : (loadMode === "stream" ? "Continue with Streaming" : "Materialize")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Selector */}
      <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20">
        <div class="border-b border-[#90C137]/20">
          <nav class="flex -mb-px">
            <button
              onClick={() => setView("wasm")}
              class={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-300 ${
                view === "wasm"
                  ? "border-[#90C137] text-[#90C137] bg-[#90C137]/10"
                  : "border-transparent text-[#F8F6F0]/70 hover:text-[#90C137] hover:bg-[#F8F6F0]/5"
              }`}
            >
              <div class="flex flex-col items-center space-y-1">
                <span>💾 Browser (WASM)</span>
                <span class={`text-xs ${view === "wasm" ? "text-[#90C137]/80" : "text-[#F8F6F0]/50"}`}>
                  {wasmTables.length} materialized tables
                </span>
              </div>
            </button>
            <button
              onClick={() => setView("motherduck")}
              class={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-300 ${
                view === "motherduck"
                  ? "border-[#90C137] text-[#90C137] bg-[#90C137]/10"
                  : "border-transparent text-[#F8F6F0]/70 hover:text-[#90C137] hover:bg-[#F8F6F0]/5"
              }`}
            >
              <div class="flex flex-col items-center space-y-1">
                <span>☁️ MotherDuck (Cloud)</span>
                <span class={`text-xs ${view === "motherduck" ? "text-[#90C137]/80" : "text-[#F8F6F0]/50"}`}>
                  {motherDuckTables.length} remote tables
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tables List */}
      {loading ? (
        <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-8 text-center">
          <p class="text-[#F8F6F0]/70">Loading catalog...</p>
        </div>
      ) : (
        <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20">
          <div class="p-4 border-b border-[#90C137]/20">
            <h3 class="font-semibold text-[#F8F6F0]">
              {view === "wasm" ? "Materialized Tables" : "Remote MotherDuck Tables"}
            </h3>
            <p class="text-xs text-[#F8F6F0]/60 mt-1">Click table names to view columns</p>
          </div>
          <div class="max-h-[600px] overflow-y-auto">
            {currentTables.length === 0 ? (
              <div class="p-8 text-center text-[#F8F6F0]/60">
                {view === "wasm" 
                  ? "No tables materialized. Load tables from MotherDuck →" 
                  : "No tables found"}
              </div>
            ) : (
              currentTables.map((table) => {
                const fullName = `${table.database}.${table.schema}.${table.table}`;
                const isExpanded = expandedTable === fullName;
                
                return (
                  <div key={fullName} class="border-b border-[#90C137]/10 last:border-b-0">
                    {/* Table Header Row */}
                    <div
                      class="p-4 hover:bg-[#90C137]/5 transition-colors cursor-pointer"
                      onClick={() => toggleTableExpansion(table.table, table.database, table.schema)}
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex items-start space-x-2 flex-1">
                          {/* Expand/Collapse Icon */}
                          <span class="text-[#90C137]/60 mt-0.5">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          
                          <div class="flex-1">
                            <div class="font-medium text-[#F8F6F0]">
                              {table.database}.{table.schema}.{table.table}
                            </div>
                            <div class="text-xs text-[#F8F6F0]/60 mt-1">
                              {table.row_count?.toLocaleString() || "0"} rows · {table.column_count} columns
                            </div>
                            {table.comment && (
                              <div class="text-xs text-[#F8F6F0]/70 mt-1 italic">
                                {table.comment}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {view === "motherduck" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openLoadDialog(table);
                            }}
                            class="ml-2 px-3 py-1 text-xs bg-[#90C137] text-[#172217] rounded hover:bg-[#a0d147] whitespace-nowrap font-medium transition-colors"
                          >
                            Configure →
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Columns */}
                    {isExpanded && (
                      <div class="bg-[#172217]/40 border-t border-[#90C137]/10">
                        {loadingColumns ? (
                          <div class="p-4 text-center text-sm text-gray-500">
                            Loading columns...
                          </div>
                        ) : (
                          <div class="p-4">
                            <div class="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Columns ({expandedColumns.length})
                            </div>
                            <div class="space-y-2">
                              {expandedColumns.map((col) => (
                                <div key={col.column_name} class="flex items-start space-x-2 text-sm">
                                  <div class="w-4 h-4 mt-0.5 flex-shrink-0">
                                    <span class="text-gray-400">•</span>
                                  </div>
                                  <div class="flex-1">
                                    <span class="font-mono font-medium text-gray-900">{col.column_name}</span>
                                    <span class="text-gray-500 ml-2">
                                      {col.data_type}
                                      {col.is_nullable && " · nullable"}
                                    </span>
                                    {col.column_default && (
                                      <div class="text-xs text-gray-500 ml-4 mt-0.5">
                                        default: {col.column_default}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-900 mb-2">💡 Loading Options</h4>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• <strong>Streaming:</strong> Query remote tables over network - always current, no storage</li>
          <li>• <strong>Materialize:</strong> Download filtered data to browser - instant queries, offline access</li>
          <li>• Use LIMIT, WHERE, SAMPLE to control data size when materializing</li>
          <li>• Materialized tables persist in the browser session only</li>
        </ul>
      </div>
    </div>
  );
}
