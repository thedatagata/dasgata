import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";

interface NaturalLanguageQueryProps {
  motherDuckToken: string;
}

interface TableOption {
  fullName: string;
  displayName: string;
  source: 'browser' | 'motherduck';
}

export default function NaturalLanguageQuery({ motherDuckToken }: NaturalLanguageQueryProps) {
  const [client, setClient] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"generate" | "execute">("generate");
  
  // Table selection
  const [availableTables, setAvailableTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const c = await createMotherDuckClient(motherDuckToken);
        setClient(c);
        
        // Fetch available tables
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

  async function handleSubmit() {
    if (!client || !prompt.trim() || !selectedTable) return;

    setLoading(true);
    setError(null);
    setGeneratedSql(null);
    setResultData([]);

    try {
      if (mode === "generate") {
        // Generate SQL without executing
        const generateQuery = `CALL prompt_sql('${prompt.replace(/'/g, "''")}', include_tables=['${selectedTable}']);`;
        
        console.log('Generating SQL:', generateQuery);
        const sqlResult = await client.evaluateQuery(generateQuery);
        const sqlRows = sqlResult.data.toRows();
        
        if (!sqlRows[0]?.query) throw new Error('No SQL generated');

        const sql = sqlRows[0].query;
        setGeneratedSql(sql);

        // Auto-execute the generated SQL
        console.log('Executing generated SQL:', sql);
        const result = await client.evaluateQuery(sql);
        const rows = result.data.toRows();
        setResultData(rows);

      } else {
        // Execute directly using PRAGMA prompt_query
        const directQuery = `PRAGMA prompt_query('${prompt.replace(/'/g, "''")}')`;
        
        console.log('Direct query:', directQuery);
        const result = await client.evaluateQuery(directQuery);
        const rows = result.data.toRows();
        setResultData(rows);
        setGeneratedSql("(SQL generated and executed by MotherDuck AI)");
      }

    } catch (err) {
      console.error('Query error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const examples = [
    "What are the top 5 traffic sources by session count?",
    "Show me total revenue by plan tier",
    "Which lifecycle stage has the most activations?",
    "Compare average session duration across traffic sources",
    "How many users reached activation by utm_source?",
    "What's the conversion rate by plan tier?"
  ];

  return (
    <div class="space-y-6">
      <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold mb-2 text-[#F8F6F0]">Ask Questions About Your Data</h2>
        <p class="text-sm text-[#90C137] mb-6">
          Powered by MotherDuck AI - converts natural language to SQL
        </p>
        
        <div class="space-y-4">
          {/* Table Selection */}
          <div class="border-b border-[#90C137]/30 pb-4">
            <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">
              Select Data Source:
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable((e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137] focus:ring-1 focus:ring-[#90C137]"
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

          {/* Mode selector */}
          <div class="flex space-x-4 pb-3 border-b border-[#90C137]/30">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="generate"
                checked={mode === "generate"}
                onChange={() => setMode("generate")}
                class="text-[#90C137] focus:ring-[#90C137]"
              />
              <span class="text-sm text-[#F8F6F0]">Generate & Show SQL</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="execute"
                checked={mode === "execute"}
                onChange={() => setMode("execute")}
                class="text-[#90C137] focus:ring-[#90C137]"
              />
              <span class="text-sm text-[#F8F6F0]">Direct Execution</span>
            </label>
          </div>

          {/* Input area */}
          <div class="flex space-x-2">
            <textarea
              value={prompt}
              onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., What are the top traffic sources by revenue?"
              class="flex-1 px-4 py-3 bg-[#F8F6F0]/10 border border-[#90C137]/30 text-[#F8F6F0] placeholder-[#F8F6F0]/50 rounded-lg resize-none focus:border-[#90C137] focus:ring-1 focus:ring-[#90C137]"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim() || !selectedTable}
              class="px-6 py-3 bg-[#90C137] text-[#172217] font-medium rounded-lg hover:bg-[#a0d147] disabled:bg-[#F8F6F0]/20 disabled:text-[#F8F6F0]/40 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {loading ? '🤔 Thinking...' : '🚀 Ask'}
            </button>
          </div>

          {/* Example prompts */}
          <div>
            <p class="text-xs text-[#F8F6F0]/70 mb-2">Example questions:</p>
            <div class="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  class="text-xs px-3 py-1.5 bg-[#F8F6F0]/10 hover:bg-[#90C137]/20 border border-[#90C137]/30 text-[#F8F6F0] rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div class="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded">
            <p class="text-sm font-semibold text-red-400">Error</p>
            <p class="text-sm text-red-300 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* Generated SQL */}
      {generatedSql && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-semibold text-[#F8F6F0]">Generated SQL</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedSql);
              }}
              class="text-xs px-3 py-1 bg-[#F8F6F0]/10 hover:bg-[#90C137]/20 border border-[#90C137]/30 text-[#F8F6F0] rounded transition-colors"
            >
              📋 Copy
            </button>
          </div>
          <pre class="bg-[#F8F6F0]/5 p-4 rounded overflow-x-auto text-sm border border-[#90C137]/30 text-[#F8F6F0]">
            <code>{generatedSql}</code>
          </pre>
        </div>
      )}

      {/* Results */}
      {resultData.length > 0 && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-[#F8F6F0]">
              Results ({resultData.length} rows)
            </h3>
            <button
              onClick={() => {
                const csv = [
                  Object.keys(resultData[0]).join(','),
                  ...resultData.map(row => Object.values(row).join(','))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'query_results.csv';
                a.click();
              }}
              class="text-xs px-3 py-1 bg-[#90C137] text-[#172217] hover:bg-[#a0d147] font-medium rounded transition-colors"
            >
              💾 Export CSV
            </button>
          </div>
          
          <div class="overflow-x-auto max-h-96">
            <table class="min-w-full border border-[#90C137]/30 text-sm">
              <thead class="bg-[#F8F6F0]/5 sticky top-0">
                <tr>
                  {Object.keys(resultData[0]).map((key) => (
                    <th key={key} class="px-3 py-2 border border-[#90C137]/30 text-left font-medium whitespace-nowrap text-[#90C137]">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultData.map((row, idx) => (
                  <tr key={idx} class="hover:bg-[#F8F6F0]/5">
                    {Object.values(row).map((val, i) => (
                      <td key={i} class="px-3 py-2 border border-[#90C137]/30 whitespace-nowrap text-[#F8F6F0]">
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && resultData.length === 0 && !generatedSql && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg p-8 text-center">
          <p class="text-[#F8F6F0]">
            💡 Select a table above and ask a question about your data in plain English
          </p>
          <p class="text-sm text-[#F8F6F0]/70 mt-2">
            The AI will convert it to SQL and show you the results
          </p>
        </div>
      )}
    </div>
  );
}
