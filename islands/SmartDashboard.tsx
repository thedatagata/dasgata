import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../utils/motherduck-client.ts";
import ObservablePlot from "./ObservablePlot.tsx";
import * as Plot from "@observablehq/plot";

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
  planTier: "base" | "premium";
  sessionId: string;
}

interface TableOption {
  name: string;
  description: string;
  source: 'motherduck' | 'materialized';
  full_path: string;
}

type Step = 'select' | 'analyze' | 'validate' | 'visualize';

export default function SmartDashboard({ motherDuckToken, planTier, sessionId }: SmartDashboardProps) {
  const [client, setClient] = useState<any>(null);
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState<string | null>(null);

  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableSummary, setTableSummary] = useState<any[]>([]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [sqlExplanation, setSqlExplanation] = useState("");
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [executedQuery, setExecutedQuery] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [approved, setApproved] = useState(false);
  const [materialize, setMaterialize] = useState(false);

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

      const mdResult = await c.evaluateQuery(`
        SELECT 
          database_name,
          schema_name,
          table_name
        FROM duckdb_tables()
        WHERE (database_name = 'my_db' AND schema_name = 'amplitude' AND table_name IN ('users_fct', 'sessions_fct'))
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
      const summaryResult = await client.evaluateQuery(`SUMMARIZE ${tablePath}`);
      setTableSummary(summaryResult.data.toRows());
      setStep('analyze');
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
      const selectedTableInfo = tables.find(t => t.full_path === selectedTable);
      
      if (selectedTableInfo?.source === 'materialized' && planTier === 'premium') {
        if (!(window as any).webllmEngine) {
          alert('WebLLM needs to be initialized. Redirecting...');
          window.location.href = '/app/loading';
          return;
        }
        
        const schemaResult = await client.evaluateQuery(`DESCRIBE ${selectedTable}`);
        const schema = schemaResult.data.toRows();
        
        const completion = await (window as any).webllmEngine.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a SQL expert. Generate DuckDB SQL queries.
Table: ${selectedTable}
Schema: ${JSON.stringify(schema)}`
            },
            {
              role: "user", 
              content: `Generate SQL for: ${aiPrompt}`
            }
          ]
        });
        
        const response = completion.choices[0].message.content;
        const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```/);
        const sql = sqlMatch ? sqlMatch[1] : response;
        
        setGeneratedSQL(sql);
        setSqlExplanation("Generated with WebLLM");
        setSimilarityScore(1.0);
        
      } else {
        const parts = selectedTable.split('.');
        const dbName = parts[0];
        const schemaTable = parts.slice(1).join('.');
        
        await client.evaluateQuery(`USE ${dbName};`);
        
        const escapedPrompt = aiPrompt.replace(/'/g, "''");
        const result = await client.evaluateQuery(
          `CALL prompt_sql('${escapedPrompt}', include_tables=['${schemaTable}'])`
        );
        
        const row = result.data.toRows()[0];
        if (!row?.query) throw new Error('No SQL generated');
        
        setGeneratedSQL(row.query);
        
        const explainResult = await client.evaluateQuery(
          `CALL prompt_explain('${row.query.replace(/'/g, "''")}')`
        );
        const explainRow = explainResult.data.toRows()[0];
        setSqlExplanation(explainRow?.explanation || 'Query generated');
        
        const promptTokens = tokenize(aiPrompt);
        const explanationTokens = tokenize(explainRow?.explanation || '');
        const similarity = cosineSimilarity(
          createBagOfWords(promptTokens),
          createBagOfWords(explanationTokens)
        );
        setSimilarityScore(similarity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function executeQuery() {
    if (!client || !generatedSQL.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.evaluateQuery(generatedSQL);
      setQueryResults(result.data.toRows());
      setExecutedQuery(generatedSQL);
      
      try {
        const escapedQuery = generatedSQL.replace(/'/g, "''");
        const explainResult = await client.evaluateQuery(
          `CALL prompt_explain('${escapedQuery}')`
        );
        setQueryDescription(explainResult.data.toRows()[0]?.explanation || 'Query executed successfully');
      } catch (explainErr) {
        setQueryDescription('Query executed successfully');
      }
      
      setStep('validate');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approved) return;
    
    if (materialize && planTier === 'premium' && client) {
      try {
        const userTableName = prompt('Enter a name for the materialized table:', 'my_analysis');
        if (!userTableName || !userTableName.trim()) {
          alert('❌ Materialization cancelled');
          return;
        }
        
        const tableName = userTableName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        await client.evaluateQuery(`CREATE TABLE memory.main.${tableName} AS ${executedQuery}`);
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
        
        <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-4">
          <div class="flex items-center justify-between">
            {['select', 'analyze', 'validate', 'visualize'].map((s, idx) => (
              <div key={s} class="flex items-center flex-1">
                <div class={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step === s ? 'bg-[#90C137] text-[#172217]' : 'bg-[#172217] border border-[#90C137]/30 text-[#F8F6F0]/50'
                }`}>
                  {idx + 1}
                </div>
                <span class={`ml-2 text-sm ${step === s ? 'text-[#90C137]' : 'text-[#F8F6F0]/50'}`}>
                  {s === 'select' && 'Select'}
                  {s === 'analyze' && 'Analyze'}
                  {s === 'validate' && 'Validate'}
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

        {step === 'select' && (
          <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-[#F8F6F0]">Select Table</h2>
              <button
                onClick={() => client && loadTables(client)}
                disabled={loading}
                class="px-4 py-2 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 text-sm font-medium"
              >
                🔄 Refresh
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
                    {table.source === 'materialized' ? '💾 WASM' : '☁️ MD'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'analyze' && (
          <div class="space-y-6">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
              <h2 class="text-xl font-bold text-[#F8F6F0] mb-4">Query with AI</h2>
              
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
                        Similarity: <strong class="text-[#90C137]">{(similarityScore * 100).toFixed(1)}%</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={executeQuery}
                disabled={loading || !generatedSQL}
                class="w-full mt-6 py-3 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 font-medium"
              >
                {loading ? 'Executing...' : 'Execute Query →'}
              </button>

              <button
                onClick={() => setStep('select')}
                class="w-full mt-3 py-2 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10 text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {step === 'validate' && queryResults.length > 0 && (
          <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20 p-6">
            <h2 class="text-2xl font-bold text-[#F8F6F0] mb-4">Validate Results</h2>

            {executedQuery && (
              <div class="mb-4 p-4 bg-[#172217]/80 border border-[#90C137]/30 rounded-lg">
                <strong class="text-[#90C137] block mb-2">Executed Query:</strong>
                <pre class="text-[#F8F6F0] text-sm overflow-x-auto font-mono whitespace-pre-wrap">{executedQuery}</pre>
              </div>
            )}

            {queryDescription && (
              <div class="mb-6 p-4 bg-[#90C137]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0]/90">
                <strong>Query Explanation:</strong><br/>
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

              {planTier === 'premium' && approved && (
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
                  onClick={() => setStep('analyze')}
                  class="flex-1 py-3 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10"
                >
                  ← Back
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
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Dimension (Optional)</label>
                <select
                  value={dimensionField}
                  onChange={(e) => setDimensionField(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- None --</option>
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
                  <option value="">-- None --</option>
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Filter Field (Optional)</label>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg"
                >
                  <option value="">-- None --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {filterField && (
                <div class="col-span-2">
                  <label class="block text-sm font-medium mb-2 text-[#F8F6F0]">Filter Value</label>
                  <input
                    type="text"
                    value={filterValue}
                    onInput={(e) => setFilterValue((e.target as HTMLInputElement).value)}
                    placeholder="Enter value..."
                    class="w-full px-3 py-2 bg-[#172217]/60 border border-[#90C137]/30 text-[#90C137] rounded-lg placeholder-[#F8F6F0]/40"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowViz(true)}
              disabled={!timeField || !metric1}
              class="w-full py-3 mb-6 bg-[#90C137] text-[#172217] rounded-lg hover:bg-[#a0d147] disabled:opacity-50 font-medium"
            >
              Generate Visualization
            </button>

            {showViz && timeField && metric1 && (
              <div class="bg-white rounded-lg p-4 mb-6">
                {(() => {
                  let plotData = queryResults.filter(row => 
                    !filterField || !filterValue || String(row[filterField]) === filterValue
                  );
                  
                  if (plotData.length > 10000) {
                    plotData = plotData.slice(0, 10000);
                  }
                  
                  const uniqueXValues = new Set(plotData.map(row => row[timeField])).size;
                  
                  if (uniqueXValues > 1000) {
                    return (
                      <div class="p-8 text-center text-gray-600">
                        <div class="text-4xl mb-4">📊</div>
                        <p class="text-lg font-semibold">Too many data points to visualize</p>
                        <p class="text-sm mt-2">
                          Your query returned {uniqueXValues.toLocaleString()} unique values for {timeField}.
                          Try aggregating your data (GROUP BY) to reduce the number of points.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <ObservablePlot
                      data={plotData}
                      spec={{
                        marks: vizType === 'line' ? [
                          Plot.line(plotData, {
                            x: timeField,
                            y: metric1,
                            stroke: dimensionField || '#90C137',
                            strokeWidth: 2
                          }),
                          ...(metric2 ? [Plot.line(plotData, {
                            x: timeField,
                            y: metric2,
                            stroke: '#ff6b6b',
                            strokeWidth: 2,
                            strokeDasharray: '4'
                          })] : [])
                        ] : [
                          Plot.barY(plotData, {
                            x: timeField,
                            y: metric1,
                            fill: dimensionField || '#90C137'
                          }),
                          ...(metric2 ? [Plot.barY(plotData, {
                            x: timeField,
                            y: metric2,
                            fill: '#ff6b6b',
                            opacity: 0.7
                          })] : [])
                        ],
                        color: dimensionField ? { legend: true } : undefined,
                        width: 800,
                        height: 400
                      }}
                      title={`${metric1}${metric2 ? ` & ${metric2}` : ''} by ${timeField}`}
                    />
                  );
                })()}
              </div>
            )}

            <div class="flex gap-3">
              <button
                onClick={() => setStep('validate')}
                class="flex-1 py-3 bg-[#172217]/40 border border-[#90C137]/30 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/10"
              >
                ← Back
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
