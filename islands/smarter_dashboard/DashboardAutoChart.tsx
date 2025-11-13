// islands/smarter_dashboard/DashboardAutoChart.tsx
import { useState, useEffect } from "preact/hooks";
import { WebLLMSemanticHandler } from "../../utils/semantic/webllm-auto-handler.ts";
import { createSemanticTables } from "../../utils/semantic/semantic-amplitude.ts";

interface DashboardAutoChartProps {
  db: any;
  onBack: () => void;
}

export default function DashboardAutoChart({ db, onBack }: DashboardAutoChartProps) {
  const [handler, setHandler] = useState<WebLLMSemanticHandler | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initWebLLM() {
      try {
        const tables = createSemanticTables(db);
        const llmHandler = new WebLLMSemanticHandler(tables, 'medium');
        
        await llmHandler.initialize((progress) => {
          console.log("WebLLM ready");
        });
        
        setHandler(llmHandler);
        setLoading(false);
      } catch (error) {
        console.error("Failed to initialize WebLLM:", error);
        setError("Failed to initialize AI assistant");
        setLoading(false);
      }
    }
    initWebLLM();
  }, [db]);

  const handleQuery = async () => {
    if (!userInput.trim() || !handler) return;
    
    setError(null);
    setQuerying(true);
    
    try {
      const response = await handler.generateQueryWithChart(userInput);
      setResult(response);
    } catch (error) {
      console.error("Query failed:", error);
      setError(error.message);
    } finally {
      setQuerying(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="font-medium">Back to Dashboard</span>
            </button>
            
            <div class="flex items-center space-x-2">
              {loading ? (
                <div class="flex items-center space-x-2 text-sm text-gray-500">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span>Initializing AI...</span>
                </div>
              ) : (
                <div class="flex items-center space-x-2 text-sm text-green-600">
                  <span class="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>AI Ready</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Query Input */}
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-xl font-bold mb-4">Ask Questions, Get Visualizations</h2>
          <p class="text-sm text-gray-600 mb-4">
            Charts are automatically generated based on your query structure
          </p>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Natural language query
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              placeholder="Try these:&#10;• Show conversion rate by traffic source&#10;• Revenue trends over last 12 weeks&#10;• Active users by plan tier&#10;• New vs returning sessions by source"
              class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
            
            <div class="flex items-center justify-between mt-3">
              <div class="text-xs text-gray-500">
                Press Enter to submit • Charts auto-generated
              </div>
              <button
                onClick={handleQuery}
                disabled={!userInput.trim() || querying || loading}
                class={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  userInput.trim() && !querying && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {querying ? 'Generating...' : 'Generate Chart'}
              </button>
            </div>
          </div>

          {error && (
            <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <div class="font-medium mb-1">Error</div>
              <div class="text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Results with Auto-Generated Chart */}
        {result && (
          <div class="space-y-6">
            {/* Chart Detection Info */}
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start space-x-3">
                <span class="text-2xl">📊</span>
                <div class="flex-1">
                  <div class="font-semibold text-blue-900 mb-1">
                    Auto-detected: {result.chartDetection.type.toUpperCase()} Chart
                  </div>
                  <div class="text-sm text-blue-800">
                    {result.chartDetection.reason}
                  </div>
                </div>
              </div>
            </div>

            {/* Query Details */}
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-bold mb-4">{result.query.explanation}</h3>
              
              <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-4">
                <div>
                  <span class="font-medium text-gray-700">Table:</span>{' '}
                  <span class="text-gray-900">{result.query.table}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Chart Type:</span>{' '}
                  <span class="text-gray-900 capitalize">{result.chartDetection.type}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Dimensions:</span>{' '}
                  <span class="text-gray-900">
                    {result.query.dimensions?.length > 0 
                      ? result.query.dimensions.join(', ') 
                      : 'none'}
                  </span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Measures:</span>{' '}
                  <span class="text-gray-900">{result.query.measures.join(', ')}</span>
                </div>
                {result.query.filters && result.query.filters.length > 0 && (
                  <div class="col-span-2">
                    <span class="font-medium text-gray-700">Filters:</span>{' '}
                    <span class="text-gray-900">{result.query.filters.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Generated Chart */}
            <PlotlyChart
              data={result.plotlyConfig.data}
              layout={result.plotlyConfig.layout}
              config={result.plotlyConfig.config}
              loading={querying}
            />

            {/* Raw Data (Collapsible) */}
            <details class="bg-white rounded-lg shadow-md">
              <summary class="cursor-pointer p-4 font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                View Raw Data ({result.data.length} rows)
              </summary>
              <div class="p-4 border-t border-gray-200">
                <div class="overflow-auto max-h-96">
                  <pre class="text-xs bg-gray-50 p-4 rounded">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Examples Section */}
        {!result && !querying && !loading && (
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="font-bold mb-4">Chart Type Detection Examples</h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start space-x-2">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">📈 Line</span>
                <span class="text-gray-700">"Revenue over time" → Detects date dimension</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">📊 Bar</span>
                <span class="text-gray-700">"Sessions by traffic source" → Single dimension</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">🎯 Funnel</span>
                <span class="text-gray-700">"Users by lifecycle stage" → Detects funnel stages</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">🔥 Heatmap</span>
                <span class="text-gray-700">"Revenue by source and tier" → Two dimensions</span>
              </div>
              <div class="flex items-start space-x-2">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">🥧 Pie</span>
                <span class="text-gray-700">"Distribution by plan tier" → Low cardinality</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
