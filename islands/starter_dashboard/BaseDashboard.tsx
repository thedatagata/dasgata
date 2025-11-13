import { useEffect, useState } from "preact/hooks";
import { createMotherDuckClient } from "../../utils/services/motherduck-client.ts";
import ObservablePlot from "./ObservablePlot.tsx";

interface BaseDashboardProps {
  motherDuckToken: string;
  sessionId?: string;
}

interface TableOption {
  name: string;
  description: string;
  source: 'motherduck';
  full_path: string;
}

type Step = 'configure' | 'query' | 'validate' | 'visualize';

export default function BaseDashboard({ motherDuckToken, sessionId }: BaseDashboardProps) {
  const [client, setClient] = useState<any>(null);
  const [step, setStep] = useState<Step>('configure');
  const [error, setError] = useState<string | null>(null);
  
  // Step 1: Configure
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // Step 2: Query
  const [tableSummary, setTableSummary] = useState<any[]>([]);
  const [tablePreview, setTablePreview] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generatedSql, setGeneratedSql] = useState<string>("");
  const [sqlExplanation, setSqlExplanation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  // Step 3: Validate
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [schemaDescription, setSchemaDescription] = useState<string>("");
  
  // Step 4: Visualize
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedTimeseries, setSelectedTimeseries] = useState<string>('');
  const [timeGranularity, setTimeGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const c = await createMotherDuckClient(motherDuckToken);
        setClient(c);
        await loadTableCatalog(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    init();
  }, [motherDuckToken]);

  async function loadTableCatalog(c: any) {
    try {
      const tableNames = ['amplitude.sessions_fct', 'amplitude.users_fct'];
      
      const tblDetails = await Promise.all(
        tableNames.map(async (tbl) => {
          try {
            const mdQuery = `CALL prompt_schema(include_tables=['${tbl}'])`;
            const mdResult = await c.evaluateQuery(mdQuery);
            
            console.log('Schema result for', tbl, ':', mdResult);
            
            // Handle different result formats
            let rows;
            if (mdResult.data) {
              rows = mdResult.data.toRows();
            } else if (mdResult.toRows) {
              rows = mdResult.toRows();
            } else {
              rows = [mdResult];
            }
            
            return {
              full_path: tbl,
              name: tbl.split('.').at(-1) || tbl,
              description: rows[0]?.summary || 'No description available',
              source: 'motherduck' as const
            };
          } catch (err) {
            console.warn(`Failed to get AI description for ${tbl}, using fallback`);
            return {
              full_path: tbl,
              name: tbl.split('.').at(-1) || tbl,
              description: `Table: ${tbl}`,
              source: 'motherduck' as const
            };
          }
        })
      );
      
      setTables(tblDetails);
    } catch (err) {
      console.error('Error loading table catalog:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleConfigureTable(tablePath: string) {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    setSelectedTable(tablePath);
    
    try {
      // Get SUMMARIZE output
      const summaryQuery = `SUMMARIZE ${tablePath}`;
      const summaryResult = await client.evaluateQuery(summaryQuery);
      setTableSummary(summaryResult.data.toRows());
      
      // Get preview (first 5 rows)
      const previewQuery = `SELECT * FROM ${tablePath} LIMIT 5`;
      const previewResult = await client.evaluateQuery(previewQuery);
      setTablePreview(previewResult.data.toRows());
      
      setStep('query');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQuery() {
    if (!client || !prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate SQL
      const generateQuery = `CALL prompt_sql('${prompt.replace(/'/g, "''")}', include_tables=['${selectedTable}']);`;
      const sqlResult = await client.evaluateQuery(generateQuery);
      const sqlRows = sqlResult.data.toRows();
      
      if (!sqlRows[0]?.query) throw new Error('No SQL generated');
      
      const sql = sqlRows[0].query;
      setGeneratedSql(sql);
      
      // Get explanation
      const explainQuery = `SELECT explanation FROM prompt_explain('${sql.replace(/'/g, "''")}') LIMIT 1`;
      const explainResult = await client.evaluateQuery(explainQuery);
      const explainRows = explainResult.data.toRows();
      setSqlExplanation(explainRows[0]?.explanation || 'No explanation available');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateQuery() {
    if (!client || !generatedSql) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Execute query
      const result = await client.evaluateQuery(generatedSql);
      const rows = result.data.toRows();
      setQueryResults(rows);
      
      // Get schema description
      const schemaQuery = `CALL prompt_schema(include_tables=['${selectedTable}']);`;
      const schemaResult = await client.evaluateQuery(schemaQuery);
      const schemaRows = schemaResult.data.toRows();
      setSchemaDescription(schemaRows[0]?.summary || 'No schema description available');
      
      setStep('validate');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleProceedToVisualize() {
    if (queryResults.length === 0) return;
    
    console.log('Query results:', queryResults);
    console.log('First row:', queryResults[0]);
    console.log('Available columns:', Object.keys(queryResults[0]));
    
    // Auto-detect columns
    const firstRow = queryResults[0];
    const columns = Object.keys(firstRow);
    
    console.log('Detecting numeric columns...');
    const numericCols = columns.filter(col => {
      const val = firstRow[col];
      const isNumeric = typeof val === 'number' || typeof val === 'bigint';
      console.log(`  ${col}: ${typeof val} = ${isNumeric}`);
      return isNumeric;
    });
    
    console.log('Detecting date columns...');
    const dateCols = columns.filter(col => {
      const val = firstRow[col];
      const isDate = val instanceof Date || 
                     (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) ||
                     (val && typeof val === 'object' && 'days' in val); // DuckDB date
      console.log(`  ${col}: ${typeof val} = ${isDate}`, val);
      return isDate;
    });
    
    console.log('Numeric columns:', numericCols);
    console.log('Date columns:', dateCols);
    
    if (numericCols.length > 0) setSelectedMetric(numericCols[0]);
    if (dateCols.length > 0) setSelectedTimeseries(dateCols[0]);
    
    setStep('visualize');
  }

  const availableColumns = queryResults.length > 0 ? Object.keys(queryResults[0]) : [];
  const numericColumns = availableColumns.filter(col => {
    const val = queryResults[0]?.[col];
    return typeof val === 'number' || typeof val === 'bigint';
  });
  const dateColumns = availableColumns.filter(col => {
    const val = queryResults[0]?.[col];
    return val instanceof Date || 
           (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) ||
           (val && typeof val === 'object' && 'days' in val);
  });

  return (
    <div class="max-w-7xl mx-auto p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p class="text-sm font-semibold text-red-400">Error</p>
          <p class="text-sm text-red-300 mt-1">{error}</p>
        </div>
      )}

      {/* Step 1: Configure */}
      {step === 'configure' && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
          <h2 class="text-2xl font-bold text-[#F8F6F0] mb-6">Step 1: Configure Data Source</h2>
          
          {tables.length === 0 ? (
            <p class="text-[#F8F6F0]/70">Loading tables...</p>
          ) : (
            <div class="space-y-4">
              {tables.map(table => (
                <div key={table.full_path} class="bg-[#F8F6F0]/5 border border-[#90C137]/30 rounded-lg p-4">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-[#90C137]">{table.name}</h3>
                      <p class="text-sm text-[#F8F6F0]/70 mt-1">{table.description}</p>
                      <p class="text-xs text-[#F8F6F0]/50 mt-2">📍 {table.full_path}</p>
                    </div>
                    <button
                      onClick={() => handleConfigureTable(table.full_path)}
                      disabled={loading}
                      class="px-4 py-2 bg-[#90C137] text-[#172217] font-medium rounded-lg hover:bg-[#a0d147] disabled:opacity-50 transition-colors"
                    >
                      {loading ? '⏳ Configuring...' : 'Configure'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Query */}
      {step === 'query' && (
        <>
          <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold text-[#F8F6F0]">Step 2: Create Query</h2>
              <button
                onClick={() => setStep('configure')}
                class="text-sm text-[#F8F6F0]/70 hover:text-[#90C137]"
              >
                ← Back
              </button>
            </div>
            
            <p class="text-sm text-[#90C137] mb-4">Table: {selectedTable}</p>

            {/* Table Summary */}
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-[#F8F6F0] mb-3">Table Summary</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full border border-[#90C137]/30 text-sm">
                  <thead class="bg-[#F8F6F0]/5">
                    <tr>
                      {tableSummary.length > 0 && Object.keys(tableSummary[0]).map(key => (
                        <th key={key} class="px-3 py-2 border border-[#90C137]/30 text-left font-medium text-[#90C137]">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableSummary.map((row, idx) => (
                      <tr key={idx} class="hover:bg-[#F8F6F0]/5">
                        {Object.values(row).map((val, i) => (
                          <td key={i} class="px-3 py-2 border border-[#90C137]/30 text-[#F8F6F0]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Preview */}
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-[#F8F6F0] mb-3">Table Preview (5 rows)</h3>
              <div class="overflow-x-auto max-h-64">
                <table class="min-w-full border border-[#90C137]/30 text-sm">
                  <thead class="bg-[#F8F6F0]/5 sticky top-0">
                    <tr>
                      {tablePreview.length > 0 && Object.keys(tablePreview[0]).map(key => (
                        <th key={key} class="px-3 py-2 border border-[#90C137]/30 text-left font-medium text-[#90C137]">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tablePreview.map((row, idx) => (
                      <tr key={idx} class="hover:bg-[#F8F6F0]/5">
                        {Object.values(row).map((val, i) => (
                          <td key={i} class="px-3 py-2 border border-[#90C137]/30 text-[#F8F6F0] whitespace-nowrap">
                            {typeof val === 'bigint' ? Number(val).toLocaleString() : 
                             typeof val === 'number' ? val.toLocaleString() : 
                             (val && typeof val === 'object' && 'days' in val) ? new Date((val as any).days * 24 * 60 * 60 * 1000).toLocaleDateString() :
                             String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Query Input */}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-[#F8F6F0] mb-2">
                  Natural Language Query
                </label>
                <div class="flex space-x-2">
                  <textarea
                    value={prompt}
                    onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
                    placeholder="e.g., What are the top 5 traffic sources by session count?"
                    class="flex-1 px-4 py-3 bg-[#F8F6F0]/10 border border-[#90C137]/30 text-[#F8F6F0] placeholder-[#F8F6F0]/50 rounded-lg resize-none focus:border-[#90C137] focus:ring-1 focus:ring-[#90C137]"
                    rows={2}
                    disabled={loading}
                  />
                  <button
                    onClick={handleGenerateQuery}
                    disabled={loading || !prompt.trim()}
                    class="px-6 py-3 bg-[#90C137] text-[#172217] font-medium rounded-lg hover:bg-[#a0d147] disabled:opacity-50 transition-colors"
                  >
                    {loading ? '⏳ Generating...' : '🚀 Generate SQL'}
                  </button>
                </div>
              </div>

              {/* Generated SQL */}
              {generatedSql && (
                <div class="space-y-4">
                  <div>
                    <div class="flex justify-between items-center mb-2">
                      <h3 class="text-lg font-semibold text-[#F8F6F0]">Generated SQL</h3>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedSql)}
                        class="text-xs px-3 py-1 bg-[#F8F6F0]/10 hover:bg-[#90C137]/20 border border-[#90C137]/30 text-[#F8F6F0] rounded"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <pre class="bg-[#F8F6F0]/5 p-4 rounded overflow-x-auto text-sm border border-[#90C137]/30 text-[#F8F6F0]">
                      <code>{generatedSql}</code>
                    </pre>
                  </div>

                  {/* SQL Explanation */}
                  {sqlExplanation && (
                    <div>
                      <h3 class="text-lg font-semibold text-[#F8F6F0] mb-2">Query Explanation</h3>
                      <div class="bg-[#F8F6F0]/5 p-4 rounded border border-[#90C137]/30">
                        <p class="text-sm text-[#F8F6F0]">{sqlExplanation}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleValidateQuery}
                    disabled={loading}
                    class="w-full py-3 bg-[#90C137] text-[#172217] font-medium rounded-lg hover:bg-[#a0d147] disabled:opacity-50 transition-colors"
                  >
                    {loading ? '⏳ Executing...' : '✓ Validate Query'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Step 3: Validate */}
      {step === 'validate' && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-[#F8F6F0]">Step 3: Validate Results</h2>
            <button
              onClick={() => setStep('query')}
              class="text-sm text-[#F8F6F0]/70 hover:text-[#90C137]"
            >
              ← Back
            </button>
          </div>

          {/* Schema Description */}
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-[#F8F6F0] mb-2">Schema Description</h3>
            <div class="bg-[#F8F6F0]/5 p-4 rounded border border-[#90C137]/30">
              <p class="text-sm text-[#F8F6F0]">{schemaDescription}</p>
            </div>
          </div>

          {/* Results Preview */}
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-[#F8F6F0] mb-3">
              Results Preview ({queryResults.length} rows)
            </h3>
            <div class="overflow-x-auto max-h-96">
              <table class="min-w-full border border-[#90C137]/30 text-sm">
                <thead class="bg-[#F8F6F0]/5 sticky top-0">
                  <tr>
                    {queryResults.length > 0 && Object.keys(queryResults[0]).map(key => (
                      <th key={key} class="px-3 py-2 border border-[#90C137]/30 text-left font-medium text-[#90C137]">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.slice(0, 50).map((row, idx) => (
                    <tr key={idx} class="hover:bg-[#F8F6F0]/5">
                      {Object.values(row).map((val, i) => (
                        <td key={i} class="px-3 py-2 border border-[#90C137]/30 text-[#F8F6F0] whitespace-nowrap">
                          {typeof val === 'bigint' ? Number(val).toLocaleString() : 
                           typeof val === 'number' ? val.toLocaleString() : 
                           (val && typeof val === 'object' && 'days' in val) ? new Date((val as any).days * 24 * 60 * 60 * 1000).toLocaleDateString() :
                           String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleProceedToVisualize}
            class="w-full py-3 bg-[#90C137] text-[#172217] font-medium rounded-lg hover:bg-[#a0d147] transition-colors"
          >
            Next: Visualize →
          </button>
        </div>
      )}

      {/* Step 4: Visualize */}
      {step === 'visualize' && (
        <div class="bg-[#172217] border border-[#90C137]/30 rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-[#F8F6F0]">Step 4: Visualize</h2>
            <div class="space-x-2">
              <button
                onClick={() => setStep('query')}
                class="text-sm px-4 py-2 bg-[#F8F6F0]/10 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/20"
              >
                ← Back to Query
              </button>
              <button
                onClick={() => setStep('validate')}
                class="text-sm px-4 py-2 bg-[#F8F6F0]/10 text-[#F8F6F0] rounded-lg hover:bg-[#90C137]/20"
              >
                ← Back
              </button>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-6 mb-6">
            {/* Chart Type */}
            <div>
              <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType((e.target as HTMLSelectElement).value as 'line' | 'bar')}
                class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
            </div>

            {/* Metric */}
            <div>
              <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Metric</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
              >
                <option value="">Select metric...</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Timeseries */}
            <div>
              <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Timeseries (optional)</label>
              <select
                value={selectedTimeseries}
                onChange={(e) => setSelectedTimeseries((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
              >
                <option value="">None</option>
                {dateColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Granularity */}
            {selectedTimeseries && (
              <div>
                <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Time Granularity</label>
                <select
                  value={timeGranularity}
                  onChange={(e) => setTimeGranularity((e.target as HTMLSelectElement).value as any)}
                  class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            )}

            {/* Dimension 1 */}
            <div>
              <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Dimension 1 (optional)</label>
              <select
                value={selectedDimensions[0] || ''}
                onChange={(e) => {
                  const newDims = [...selectedDimensions];
                  newDims[0] = (e.target as HTMLSelectElement).value;
                  setSelectedDimensions(newDims.filter(d => d));
                }}
                class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
              >
                <option value="">None</option>
                {availableColumns.filter(col => !numericColumns.includes(col)).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Dimension 2 */}
            <div>
              <label class="block text-sm font-medium text-[#F8F6F0] mb-2">Dimension 2 (optional)</label>
              <select
                value={selectedDimensions[1] || ''}
                onChange={(e) => {
                  const newDims = [...selectedDimensions];
                  newDims[1] = (e.target as HTMLSelectElement).value;
                  setSelectedDimensions(newDims.filter(d => d));
                }}
                class="w-full px-3 py-2 bg-[#F8F6F0]/10 border border-[#90C137]/30 rounded-lg text-[#F8F6F0] focus:border-[#90C137]"
              >
                <option value="">None</option>
                {availableColumns.filter(col => !numericColumns.includes(col) && col !== selectedDimensions[0]).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart */}
          {selectedMetric && (
            <ObservablePlot
              data={queryResults}
              chartType={chartType}
              metric={selectedMetric}
              timeseries={selectedTimeseries}
              timeGranularity={timeGranularity}
              dimensions={selectedDimensions}
            />
          )}
        </div>
      )}
    </div>
  );
}
