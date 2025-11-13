// islands/SemanticExperience.tsx
import { useEffect, useState } from "preact/hooks";
import { WebLLMSemanticHandler } from "../../utils/semantic/webllm-handler.ts";
import { createSemanticTables } from "../../utils/semantic/semantic-amplitude.ts";

export default function SemanticExperience({ db }) {
  const [handler, setHandler] = useState<WebLLMSemanticHandler | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("Initializing...");
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const tables = createSemanticTables(db);
        const llmHandler = new WebLLMSemanticHandler(
          tables,
          'medium'  // Using 3B model
        );
        
        await llmHandler.initialize((progress) => {
          setLoadProgress(progress.progress || 0);
          setLoadStatus(progress.text || "Loading model...");
        });
        
        setHandler(llmHandler);
        setLoadProgress(100);
        setLoadStatus("Ready!");
      } catch (error) {
        console.error("Initialization failed:", error);
        setError(`Failed to initialize: ${error.message}`);
        setLoadStatus("Initialization failed");
      }
    }
    init();
  }, [db]);

  const handleQuery = async () => {
    if (!handler || !userInput.trim()) return;
    
    setError(null);
    setLoadStatus("Generating query...");
    
    try {
      const { query, data } = await handler.generateQuery(userInput);
      setResult({ query, data });
      setLoadStatus("Ready!");
    } catch (error) {
      console.error("Query failed:", error);
      setError(error.message);
      setLoadStatus("Error - Ready for retry");
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  if (loadProgress < 100) {
    return (
      <div class="p-6 max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold mb-4">Loading WebLLM Model</h2>
          <div class="mb-2 text-sm text-gray-600">{loadStatus}</div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div 
              class="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <div class="text-xs text-gray-500 mt-2 text-right">
            {Math.round(loadProgress)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-2xl font-bold mb-4">Natural Language Analytics</h2>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Ask a question about your data
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.currentTarget.value)}
            onKeyPress={handleKeyPress}
            placeholder="Examples:&#10;• Show conversion rate by traffic source&#10;• Revenue over time&#10;• Active users by plan tier"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          
          <div class="flex items-center justify-between mt-3">
            <div class="text-xs text-gray-500">
              {loadStatus} • Press Enter to submit
            </div>
            <button
              onClick={handleQuery}
              disabled={!userInput.trim()}
              class={`px-6 py-2 rounded-lg font-medium transition-colors ${
                userInput.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Query
            </button>
          </div>
        </div>

        {error && (
          <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            <div class="font-medium mb-1">Error</div>
            <div class="text-sm">{error}</div>
          </div>
        )}
      </div>

      {result && (
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="mb-4">
            <h3 class="text-xl font-bold mb-2">{result.query.explanation}</h3>
            
            <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div>
                <span class="font-medium text-gray-700">Table:</span>{' '}
                <span class="text-gray-900">{result.query.table}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Measures:</span>{' '}
                <span class="text-gray-900">{result.query.measures.join(', ')}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Dimensions:</span>{' '}
                <span class="text-gray-900">
                  {result.query.dimensions?.length > 0 
                    ? result.query.dimensions.join(', ') 
                    : 'none'}
                </span>
              </div>
              {result.query.filters && result.query.filters.length > 0 && (
                <div>
                  <span class="font-medium text-gray-700">Filters:</span>{' '}
                  <span class="text-gray-900">{result.query.filters.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-gray-700">Results</h4>
              <span class="text-sm text-gray-500">
                {result.data.length} rows
              </span>
            </div>
            
            <div class="overflow-auto max-h-96 border border-gray-200 rounded-lg">
              <pre class="text-xs p-4 bg-gray-50">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>

          {/* TODO: Add visualization component here */}
          {/* <div class="mt-6">
            <ObservablePlotChart data={result.data} config={result.query} />
          </div> */}
        </div>
      )}
    </div>
  );
}