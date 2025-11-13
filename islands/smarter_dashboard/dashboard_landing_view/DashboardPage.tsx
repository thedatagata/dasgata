// islands/DashboardPage.tsx
import { useState } from "preact/hooks";
import SessionDashboard from "./SessionDashboard.tsx";
import UserDashboard from "./UserDashboard.tsx";
import { WebLLMSemanticHandler } from "../../utils/semantic/webllm-handler.ts";
import { createSemanticTables } from "../../utils/semantic/semantic-amplitude.ts";

type TabType = 'sessions' | 'users' | 'ask';

export default function DashboardPage({ db }) {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [handler, setHandler] = useState<WebLLMSemanticHandler | null>(null);
  const [llmReady, setLlmReady] = useState(false);

  // Initialize WebLLM in background
  const initWebLLM = async () => {
    if (handler) return;
    
    try {
      const tables = createSemanticTables(db);
      const llmHandler = new WebLLMSemanticHandler(tables, 'medium');
      
      await llmHandler.initialize((progress) => {
        console.log("Loading WebLLM:", progress);
      });
      
      setHandler(llmHandler);
      setLlmReady(true);
    } catch (error) {
      console.error("Failed to initialize WebLLM:", error);
    }
  };

  const tabs = [
    { id: 'sessions' as TabType, name: 'Sessions', icon: '📊' },
    { id: 'users' as TabType, name: 'Users', icon: '👥' },
    { id: 'ask' as TabType, name: 'Ask Claude', icon: '🤖', disabled: !llmReady }
  ];

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p class="text-sm text-gray-500">Amplitude session & user metrics</p>
            </div>
            
            {!llmReady && (
              <button
                onClick={initWebLLM}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Initialize AI Assistant
              </button>
            )}
            
            {llmReady && (
              <div class="flex items-center space-x-2 text-sm text-green-600">
                <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                <span>AI Assistant Ready</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div class="flex space-x-8 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                class={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                      ? 'border-transparent text-gray-300 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span class="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'sessions' && <SessionDashboard db={db} />}
        {activeTab === 'users' && <UserDashboard db={db} />}
        {activeTab === 'ask' && handler && (
          <AskClaudeTab handler={handler} />
        )}
      </div>
    </div>
  );
}

// Ask Claude Tab Component
function AskClaudeTab({ handler }: { handler: WebLLMSemanticHandler }) {
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!userInput.trim()) return;
    
    setError(null);
    setLoading(true);
    
    try {
      const { query, data } = await handler.generateQuery(userInput);
      setResult({ query, data });
    } catch (error) {
      console.error("Query failed:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div class="max-w-4xl mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-bold mb-4">Ask Questions About Your Data</h2>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Natural language query
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.currentTarget.value)}
            onKeyPress={handleKeyPress}
            placeholder="Examples:&#10;• Show conversion rate by traffic source&#10;• Revenue trends over last 12 weeks&#10;• Active users by plan tier excluding empty plans"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          
          <div class="flex items-center justify-between mt-3">
            <div class="text-xs text-gray-500">Press Enter to submit</div>
            <button
              onClick={handleQuery}
              disabled={!userInput.trim() || loading}
              class={`px-6 py-2 rounded-lg font-medium transition-colors ${
                userInput.trim() && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Generating...' : 'Ask Claude'}
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

      {result && (
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-bold mb-4">{result.query.explanation}</h3>
          
          <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-4">
            <div>
              <span class="font-medium">Table:</span> {result.query.table}
            </div>
            <div>
              <span class="font-medium">Measures:</span> {result.query.measures.join(', ')}
            </div>
            <div class="col-span-2">
              <span class="font-medium">Dimensions:</span>{' '}
              {result.query.dimensions?.length > 0 
                ? result.query.dimensions.join(', ') 
                : 'none'}
            </div>
          </div>

          <div class="overflow-auto max-h-96 border border-gray-200 rounded-lg">
            <pre class="text-xs p-4 bg-gray-50">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}