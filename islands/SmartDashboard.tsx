import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";
import ObservablePlot from "./ObservablePlot.tsx";
import * as Plot from "@observablehq/plot";

// Simple similarity calculation
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
}

function createBagOfWords(tokens: string[]): Map<string, number> {
  const bow = new Map<string, number>();
  for (const token of tokens) {
    bow.set(token, (bow.get(token) || 0) + 1);
  }
  return bow;
}

function cosineSimilarity(bowA: Map<string, number>, bowB: Map<string, number>): number {
  const allTerms = new Set([...bowA.keys(), ...bowB.keys()]);
  let dotProduct = 0, magnitudeA = 0, magnitudeB = 0;
  
  for (const term of allTerms) {
    const freqA = bowA.get(term) || 0;
    const freqB = bowB.get(term) || 0;
    dotProduct += freqA * freqB;
    magnitudeA += freqA * freqA;
    magnitudeB += freqB * freqB;
  }
  
  return magnitudeA === 0 || magnitudeB === 0 ? 0 : dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

interface SmartDashboardProps {
  motherDuckToken: string;
}

interface TableOption {
  name: string;
  description: string;
  source: 'motherduck' | 'materialized';
  full_path: string;
}

type Step = 'select' | 'create_query' | 'audit_results' | 'visualize';

export default function SmartDashboard({ motherDuckToken }: SmartDashboardProps) {
  const [client, setClient] = useState<any>(null);
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState<string | null>(null);

  // Select step
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableSummary, setTableSummary] = useState<any[]>([]);

  // Create Query step
  const [queryMode, setQueryMode] = useState<'sql' | 'ai'>('ai');
  const [sqlQuery, setSqlQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [sqlExplanation, setSqlExplanation] = useState("");
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [fixupSuggestions, setFixupSuggestions] = useState("");
  const [loading, setLoading] = useState(false);

  // Audit Results step
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [executedQuery, setExecutedQuery] = useState(""); // Store actual executed query
  const [queryDescription, setQueryDescription] = useState("");
  const [approved, setApproved] = useState(false);
  const [materialize, setMaterialize] = useState(false);

  // Visualize step
  const [vizType, setVizType] = useState<'line' | 'bar'>('line');
  const [timeField, setTimeField] = useState("");
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [dimensionField, setDimensionField] = useState("");
  const [metric1, setMetric1] = useState("");
  const [metric2, setMetric2] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [showViz, setShowViz] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const c = await createMotherDuckClient(motherDuckToken);
        await c.evaluateQuery('USE my_db;');
        setClient(c);
        await loadTables(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    init();
  }, [motherDuckToken]);

  async function loadTables(c: any) {
    try {
      // Get materialized tables from memory.main
      const wasmResult = await c.evaluateQuery(`
        SELECT 
          table_name as name,
          'Materialized in browser' as description,
          'materialized' as source,
          'memory.main.' || table_name as full_path
        FROM duckdb_tables()
        WHERE database_name = 'memory' AND schema_name = 'main' AND internal = false
      `);
      const wasmTables = wasmResult.data.toRows().map((row: any) => ({
        name: row.name,
        description: row.description,
        source: row.source,
        full_path: row.full_path
      }));

      // Get MotherDuck tables with descriptions - only sample_data.nyc and my_db.amplitude
      const mdResult = await c.evaluateQuery(`
        SELECT 
          database_name,
          schema_name,
          table_name
        FROM duckdb_tables()
        WHERE (database_name = 'sample_data' AND schema_name = 'nyc')
           OR (database_name = 'my_db' AND schema_name = 'amplitude')
        AND internal = false
      `);
      
      const mdTables = [];
      for (const table of mdResult.data.toRows()) {
        try {
          const descResult = await c.evaluateQuery(
            `CALL prompt_schema(include_tables=['${table.schema_name}.${table.table_name}'])`
          );
          const desc = descResult.data.toRows()[0]?.summary || 'No description available';
          mdTables.push({
            name: `${table.database_name}.${table.schema_name}.${table.table_name}`,
            description: desc,
            source: 'motherduck',
            full_path: `${table.database_name}.${table.schema_name}.${table.table_name}`
          });
        } catch (err) {
          console.warn(`Failed to get description for ${table.table_name}:`, err);
          mdTables.push({
            name: `${table.database_name}.${table.schema_name}.${table.table_name}`,
            description: 'Remote table in MotherDuck',
            source: 'motherduck',
            full_path: `${table.database_name}.${table.schema_name}.${table.table_name}`
          });
        }
      }

      setTables([...wasmTables, ...mdTables]);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function selectTable(tablePath: string) {
    if (!client) return;
    
    setSelectedTable(tablePath);
    setLoading(true);
    setError(null);
    
    try {
      // Get table summary - SUMMARIZE returns rows directly now
      const summaryResult = await client.evaluateQuery(`
        SUMMARIZE ${tablePath}
      `);
      setTableSummary(summaryResult.data.toRows());
      setStep('create_query');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function generateAIQuery() {
    if (!client || !aiPrompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const parts = selectedTable.split('.');
      const dbName = parts[0];
      const schemaTable = parts.slice(1).join('.');
      
      await client.evaluateQuery(`USE ${dbName};`);
      
      const escapedPrompt = aiPrompt.replace(/'/g, "''");
      
      // Generate SQL
      const result = await client.evaluateQuery(
        `CALL prompt_sql('${escapedPrompt}', include_tables=['${schemaTable}'])`
      );
      
      const row = result.data.toRows()[0];
      if (!row?.query) throw new Error('No SQL generated');
      
      const generatedQuery = row.query;
      setGeneratedSQL(generatedQuery);
      
      // Get explanation for the generated SQL
      const explainResult = await client.evaluateQuery(
        `CALL prompt_explain('${generatedQuery.replace(/'/g, "''")}')`
      );
      const explainRow = explainResult.data.toRows()[0];
      setSqlExplanation(explainRow?.explanation || 'Query generated successfully');
      
      // Calculate similarity between prompt and explanation (both natural language)
      const promptTokens = tokenize(aiPrompt);
      const explanationTokens = tokenize(explainRow?.explanation || '');
      const promptBow = createBagOfWords(promptTokens);
      const explanationBow = createBagOfWords(explanationTokens);
      const similarity = cosineSimilarity(promptBow, explanationBow);
      setSimilarityScore(similarity);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestFixup() {
    if (!client || !sqlQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Properly escape SQL - double single quotes, that's it
      const escapedQuery = sqlQuery.replace(/'/g, "''");
      
      const result = await client.evaluateQuery(
        `CALL prompt_fixup('${escapedQuery}')`
      );
      const row = result.data.toRows()[0];
      setFixupSuggestions(row.fixed_sql || 'No changes suggested - query looks good!');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function executeQuery() {
    if (!client) return;
    
    const queryToExecute = queryMode === 'ai' ? generatedSQL : sqlQuery;
    if (!queryToExecute.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Execute query
      const result = await client.evaluateQuery(queryToExecute);
      setQueryResults(result.data.toRows());
      
      // Store the executed query for display in audit results
      setExecutedQuery(queryToExecute);
      
      // Get explanation - properly escape the SQL
      try {
        const escapedQuery = queryToExecute.replace(/'/g, "''");
        
        const explainResult = await client.evaluateQuery(
          `CALL prompt_explain('${escapedQuery}')`
        );
        setQueryDescription(explainResult.data.toRows()[0]?.explanation || 'Query executed successfully');
      } catch (explainErr) {
        console.warn('Could not get explanation:', explainErr);
        setQueryDescription('Query executed successfully');
      }
      
      setStep('audit_results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approved) return;
    
    if (materialize && client) {
      try {
        // Prompt for table name
        const userTableName = prompt('Enter a name for the materialized table:', 'my_analysis');
        if (!userTableName || !userTableName.trim()) {
          alert('❌ Materialization cancelled - no table name provided');
          return;
        }
        
        // Sanitize table name (alphanumeric and underscores only)
        const tableName = userTableName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        
        await client.evaluateQuery(`
          CREATE TABLE memory.main.${tableName} AS 
          ${executedQuery}
        `);
        
        // Reload tables to include the new materialized table
        await loadTables(client);
        
        alert(`✅ Results materialized as: memory.main.${tableName}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    
    setStep('visualize');
  }

  const availableColumns = queryResults.length > 0 ? Object.keys(queryResults[0]) : [];
  const numericColumns = queryResults.length > 0 
    ? Object.keys(queryResults[0]).filter(key => {
        const val = queryResults[0][key];
        return typeof val === 'number' || !isNaN(Number(val));
      })
    : [];

  return (
    <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        
        {/* Progress Indicator */}
        <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-4">
          <div class="flex items-center justify-between">
            {['select', 'create_query', 'audit_results', 'visualize'].map((s, idx) => (
              <div key={s} class="flex items-center flex-1">
                <div class={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step === s ? 'bg-[#90C137] text-[#172217]' : 'bg-[#172217] border border-[#90C137]/30 text-[#F8F6F0]/50'
                }`}>
                  {idx + 1}
                </div>
                <span class={`ml-2 text-sm ${step === s ? 'text-[#90C137]' : 'text-[#F8F6F0]/50'}`}>
                  {s === 'select' && 'Select'}
                  {s === 'create_query' && 'Create Query'}
                  {s === 'audit_results' && 'Audit Results'}
                  {s === 'visualize' && 'Visualize'}
                </span>
                {idx < 3 && <div class="flex-1 h-0.5 bg-[#90C137]/20 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300">
            ❌ {error}
          </div>
        )}

        {/* SELECT STEP */}
        {step === 'select' && (
          <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-[#F8F6F0]">Select Table</h2>
              <button
                onClick={() => client && loadTables(client)}
                disabled={loading}
                class="px-4 py-2 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 text-sm font-medium"
              >
                🔄 Refresh Tables
              </button>
            </div>
            
            <div class="space-y-3">
              {tables.map(table => (
                <button
                  key={table.full_path}
                  onClick={() => selectTable(table.full_path)}
                  disabled={loading}
                  class="w-full text-left p-4 bg-[#172217]/40 border border-[#90C137]/30 rounded-lg hover:bg-[#90C137]/10 hover:border-[#90C137] transition-all grid grid-cols-12 gap-4 items-center disabled:opacity-50"
                >
                  <div class="col-span-4 font-medium text-[#90C137]">
                    {table.name}
                  </div>
                  <div class="col-span-6 text-sm text-[#F8F6F0]/80">
                    {table.description}
                  </div>
                  <div class="col-span-2 text-right text-xs text-[#F8F6F0]/50">
                    {table.source === 'materialized' ? '💾 Materialized' : '☁️ MotherDuck'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CREATE QUERY STEP */}
        {step === 'create_query' && (
          <div class="space-y-6">
            {/* Table Summary */}
            <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
              <h2 class="text-xl font-bold text-[#F8F6F0] mb-4">Table Summary: {selectedTable}</h2>
              
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-[#90C137]/10">
                    <tr>
                      <th class="px-4 py-2 text-left text-[#90C137] border-b border-[#90C137]/20">Column</th>
                      <th class="px-4 py-2 text-left text-[#90C137] border-b border-[#90C137]/20">Type</th>
                      <th class="px-4 py-2 text-right text-[#90C137] border-b border-[#90C137]/20">Min</th>
                      <th class="px-4 py-2 text-right text-[#90C137] border-b border-[#90C137]/20">Max</th>
                      <th class="px-4 py-2 text-right text-[#90C137] border-b border-[#90C137]/20">Null %</th>
                      <th class="px-4 py-2 text-right text-[#90C137] border-b border-[#90C137]/20">Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSummary.map((row, idx) => (
                      <tr key={idx} class="hover:bg-[#90C137]/5">
                        <td class="px-4 py-2 font-mono text-[#F8F6F0] border-b border-[#90C137]/10">{row.column_name}</td>
                        <td class="px-4 py-2 text-[#F8F6F0]/70 border-b border-[#90C137]/10">{row.column_type}</td>
                        <td class="px-4 py-2 text-right text-[#F8F6F0]/70 border-b border-[#90C137]/10 text-xs">
                          {row.min !== null ? String(row.min).substring(0, 20) : '-'}
                        </td>
                        <td class="px-4 py-2 text-right text-[#F8F6F0]/70 border-b border-[#90C137]/10 text-xs">
                          {row.max !== null ? String(row.max).substring(0, 20) : '-'}
                        </td>
                        <td class="px-4 py-2 text-right text-[#F8F6F0]/70 border-b border-[#90C137]/10">
                          {row.null_percentage !== null ? parseFloat(row.null_percentage).toFixed(1) + '%' : '-'}
                        </td>
                        <td class="px-4 py-2 text-right text-[#F8F6F0]/70 border-b border-[#90C137]/10">
                          {row.approx_unique !== null ? parseInt(row.approx_unique).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Query Builder */}
            <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
              <div class="flex space-x-4 mb-6">
                <button
                  onClick={() => setQueryMode('ai')}
                  class={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    queryMode === 'ai' 
                      ? 'bg-[#90C137] text-[#172217]' 
                      : 'bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0]'
                  }`}
                >
                  🤖 Use AI
                </button>
                <button
                  onClick={() => setQueryMode('sql')}
                  class={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    queryMode === 'sql' 
                      ? 'bg-[#90C137] text-[#172217]' 
                      : 'bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0]'
                  }`}
                >
                  ✍️ Write SQL
                </button>
              </div>

              {queryMode === 'ai' ? (
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Describe what you want to query</label>
                    <textarea
                      value={aiPrompt}
                      onInput={(e) => setAiPrompt((e.target as HTMLTextAreaElement).value)}
                      rows={3}
                      placeholder="e.g., Show me total revenue by month for 2024"
                      class="w-full px-4 py-3 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg focus:border-[#90C137] focus:outline-none placeholder-[#F8F6F0]/40"
                    />
                  </div>
                  <button
                    onClick={generateAIQuery}
                    disabled={loading || !aiPrompt.trim()}
                    class="w-full py-3 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Generating...' : 'Generate SQL'}
                  </button>

                  {generatedSQL && (
                    <div class="space-y-3 mt-4">
                      <div>
                        <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Generated SQL</label>
                        <pre class="p-4 bg-[#172217]/60 border border-[#90C137]/30 rounded-lg text-[#90C137] text-sm overflow-x-auto">
                          {generatedSQL}
                        </pre>
                      </div>
                      {sqlExplanation && (
                        <div class="p-3 bg-[#90C137]/10 border border-[#90C137]/30 rounded text-sm text-[#F8F6F0]/90">
                          <strong>Explanation:</strong> {sqlExplanation}
                        </div>
                      )}
                      {similarityScore !== null && (
                        <div class="text-sm text-[#F8F6F0]/70">
                          Similarity Score: <strong class="text-[#90C137]">{(similarityScore * 100).toFixed(1)}%</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Write your SQL query</label>
                    <textarea
                      value={sqlQuery}
                      onInput={(e) => setSqlQuery((e.target as HTMLTextAreaElement).value)}
                      rows={8}
                      placeholder="SELECT * FROM ..."
                      class="w-full px-4 py-3 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] font-mono text-sm rounded-lg focus:border-[#90C137] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={requestFixup}
                    disabled={loading || !sqlQuery.trim()}
                    class="w-full py-2 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10 disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : '🔧 Get MotherDuck Suggestions (PROMPT_FIXUP)'}
                  </button>

                  {fixupSuggestions && (
                    <div>
                      <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">MotherDuck Suggestions</label>
                      <pre class="p-4 bg-[#90C137]/10 border border-[#90C137]/30 rounded-lg text-[#90C137] text-sm overflow-x-auto">
                        {fixupSuggestions}
                      </pre>
                      <div class="mt-2 flex space-x-3">
                        <button
                          onClick={() => setSqlQuery(fixupSuggestions)}
                          class="flex-1 py-2 bg-[#90C137] text-[#172217] rounded hover:bg-[#a0d147] text-sm font-medium"
                        >
                          Accept Changes
                        </button>
                        <button
                          onClick={() => setFixupSuggestions("")}
                          class="flex-1 py-2 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded hover:bg-[#90C137]/10 text-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={executeQuery}
                disabled={loading || (queryMode === 'ai' ? !generatedSQL : !sqlQuery.trim())}
                class="w-full mt-6 py-3 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 font-medium"
              >
                {loading ? 'Executing...' : 'Execute Query →'}
              </button>

              <button
                onClick={() => setStep('select')}
                class="w-full mt-3 py-2 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10 text-sm"
              >
                ← Back to Table Selection
              </button>
            </div>
          </div>
        )}

        {/* AUDIT RESULTS STEP */}
        {step === 'audit_results' && queryResults.length > 0 && (
          <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
            <h2 class="text-2xl font-bold text-[#F8F6F0] mb-4">Audit Results</h2>

            {executedQuery && (
              <div class="mb-4 p-4 bg-[#172217]/80 border border-[#90C137]/30 rounded-lg">
                <strong class="text-[#90C137] block mb-2">Executed Query:</strong>
                <pre class="text-[#F8F6F0] text-sm overflow-x-auto font-mono whitespace-pre-wrap">{executedQuery}</pre>
              </div>
            )}

            {queryDescription && (
              <div class="mb-6 p-4 bg-[#90C137]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0]/90">
                <strong>Query Explanation (PROMPT_EXPLAIN):</strong><br/>
                {queryDescription}
              </div>
            )}

            <div class="mb-4 text-sm text-[#F8F6F0]/70">
              Showing first 100 of {queryResults.length} rows
            </div>

            <div class="overflow-x-auto mb-6 max-h-96 border border-[#90C137]/20 rounded-lg">
              <table class="w-full text-sm">
                <thead class="bg-[#90C137]/10 sticky top-0">
                  <tr>
                    {availableColumns.map(col => (
                      <th key={col} class="px-4 py-2 text-left text-[#90C137] border-b border-[#90C137]/20">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.slice(0, 100).map((row, idx) => (
                    <tr key={idx} class="hover:bg-[#90C137]/5">
                      {Object.values(row).map((val, i) => (
                        <td key={i} class="px-4 py-2 text-[#F8F6F0]/80 border-b border-[#90C137]/10">
                          {val === null ? <span class="italic text-[#F8F6F0]/40">null</span> : 
                           typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div class="space-y-4">
              <label class="flex items-center space-x-3 p-3 bg-[#172217]/40 border border-[#90C137]/30 rounded-lg cursor-pointer hover:bg-[#90C137]/5">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.currentTarget.checked)}
                  class="w-5 h-5"
                />
                <span class="text-[#F8F6F0]">✓ Approve these results</span>
              </label>

              {approved && (
                <label class="flex items-center space-x-3 p-3 bg-[#172217]/40 border border-[#90C137]/30 rounded-lg cursor-pointer hover:bg-[#90C137]/5">
                  <input
                    type="checkbox"
                    checked={materialize}
                    onChange={(e) => setMaterialize(e.currentTarget.checked)}
                    class="w-5 h-5"
                  />
                  <span class="text-[#F8F6F0]">💾 Materialize results to DuckDB WASM</span>
                </label>
              )}

              <div class="flex space-x-3">
                <button
                  onClick={() => setStep('create_query')}
                  class="flex-1 py-3 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10"
                >
                  ← Back to Query
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!approved}
                  class="flex-1 py-3 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 font-medium"
                >
                  Continue to Visualization →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISUALIZE STEP */}
        {step === 'visualize' && queryResults.length > 0 && (
          <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
            <h2 class="text-2xl font-bold text-[#F8F6F0] mb-6">Visualize Results</h2>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Chart Type</label>
                <select
                  value={vizType}
                  onChange={(e) => setVizType(e.target.value as any)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="line">Line Chart</option>
                  <option value="bar">Bar Chart</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Time Field</label>
                <select
                  value={timeField}
                  onChange={(e) => setTimeField(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- Select --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Granularity</label>
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as any)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Dimension Field</label>
                <select
                  value={dimensionField}
                  onChange={(e) => setDimensionField(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- Select --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Metric 1</label>
                <select
                  value={metric1}
                  onChange={(e) => setMetric1(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Metric 2 (Optional)</label>
                <select
                  value={metric2}
                  onChange={(e) => setMetric2(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div class="col-span-2">
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Filter</label>
                <div class="grid grid-cols-3 gap-2">
                  <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    class="px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                  >
                    <option value="">-- Dimension --</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <select
                    class="px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">{">"}</option>
                    <option value="<">{"<"}</option>
                    <option value=">=">{">="}</option>
                    <option value="<=">{"<="}</option>
                    <option value="LIKE">LIKE</option>
                    <option value="IS NULL">IS NULL</option>
                    <option value="IS NOT NULL">IS NOT NULL</option>
                  </select>
                  <input
                    type="text"
                    value={filterValue}
                    onInput={(e) => setFilterValue((e.target as HTMLInputElement).value)}
                    placeholder="Value"
                    class="px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg placeholder-[#F8F6F0]/40"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowViz(true)}
              class="w-full py-3 mb-6 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] font-medium"
            >
              Generate Visualization
            </button>

            {showViz && ((vizType === 'line' && timeField && metric1) || (vizType === 'bar' && (timeField || dimensionField) && metric1)) && (
              <div class="bg-white rounded-lg p-4 mb-6">
                <ObservablePlot
                  data={queryResults.map(row => ({
                    ...row,
                    ...(timeField && vizType === 'line' ? { [timeField]: new Date(row[timeField]) } : {}),
                    ...(dimensionField && vizType === 'bar' && row[dimensionField] && String(row[dimensionField]).match(/^\d{4}-\d{2}/) ? 
                      { [dimensionField]: String(row[dimensionField]) } : {}),
                    [metric1]: Number(row[metric1]),
                    ...(metric2 ? { [metric2]: Number(row[metric2]) } : {})
                  }))}
                  spec={{
                    marks: vizType === 'line' ? [
                      Plot.line(queryResults.map(row => ({
                        ...row,
                        [timeField]: new Date(row[timeField]),
                        [metric1]: Number(row[metric1])
                      })), {
                        x: timeField,
                        y: metric1,
                        ...(dimensionField ? { stroke: dimensionField } : { stroke: '#90C137' }),
                        strokeWidth: 2
                      }),
                      Plot.dot(queryResults.map(row => ({
                        ...row,
                        [timeField]: new Date(row[timeField]),
                        [metric1]: Number(row[metric1])
                      })), {
                        x: timeField,
                        y: metric1,
                        ...(dimensionField ? { fill: dimensionField } : { fill: '#90C137' }),
                        r: 3
                      })
                    ] : [
                      Plot.barY(queryResults.map(row => ({
                        ...row,
                        ...(timeField && row[timeField] && String(row[timeField]).match(/^\d{4}-\d{2}/) ? 
                          { [timeField]: String(row[timeField]) } : {}),
                        [metric1]: Number(row[metric1])
                      })), {
                        x: timeField || dimensionField,
                        y: metric1,
                        ...(dimensionField && timeField ? { fill: dimensionField } : { fill: '#90C137' })
                      })
                    ],
                    color: dimensionField && vizType === 'line' ? { legend: true } : undefined,
                    x: { 
                      label: dimensionField || timeField,
                      ...(vizType === 'line' ? { type: 'utc' } : {})
                    },
                    y: { label: metric1 },
                    width: 800,
                    height: 400,
                    marginLeft: 60,
                    marginBottom: 80
                  }}
                  title={`${metric1} ${vizType === 'line' ? 'over' : 'by'} ${dimensionField || timeField}`}
                />
              </div>
            )}

            {showViz && ((vizType === 'line' && (!timeField || !metric1)) || (vizType === 'bar' && (!timeField && !dimensionField || !metric1))) && (
              <div class="p-12 bg-white rounded-lg text-center text-gray-600 mb-6">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-lg font-semibold">Missing Required Fields</p>
                <p class="text-sm mt-2 text-gray-500">
                  Please select both Time Field and Metric 1 to generate visualization
                </p>
              </div>
            )}

            <div class="flex space-x-3 mt-6">
              <button
                onClick={() => setStep('create_query')}
                class="flex-1 py-3 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10"
              >
                ← Back to Create Query
              </button>
              <button
                onClick={() => setStep('select')}
                class="flex-1 py-3 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] font-medium"
              >
                Start New Query
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
