// islands/smarter_dashboard/dashboard_landing_view/SmartDashboardLandingPage.tsx
import { useEffect, useState } from "preact/hooks";
import SessionDashboard from "./SessionDashboard.tsx";
import UserDashboard from "./UserDashboard.tsx";
import AutoVisualizationExperience from "../semantic_dashboard/AutoVisualizationExperience.tsx";
import { WebLLMSemanticHandler } from "../../../utils/semantic/webllm-handler.ts";
import { createSemanticTables } from "../../../utils/semantic/semantic-amplitude.ts";

type TabType = "sessions" | "users";
type ViewMode = "dashboard" | "visualization";

export default function SmartDashboardLandingPage({ db }) {
  const [activeTab, setActiveTab] = useState<TabType>("sessions");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [handler, setHandler] = useState<WebLLMSemanticHandler | null>(null);
  const [llmReady, setLlmReady] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);

  // Prompt state
  const [promptInput, setPromptInput] = useState("");
  const [showSQLPreview, setShowSQLPreview] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<any>(null);
  const [generatingSQL, setGeneratingSQL] = useState(false);
  const [confirmedQuery, setConfirmedQuery] = useState("");

  // Auto-initialize WebLLM on mount
  useEffect(() => {
    const initWebLLM = async () => {
      if (handler || llmLoading) {
        console.log("Skipping init - already initialized or loading");
        return;
      }

      console.log("Starting WebLLM initialization...");
      setLlmLoading(true);

      try {
        const tables = createSemanticTables(db);
        const llmHandler = new WebLLMSemanticHandler(tables, "medium");

        console.log("Calling llmHandler.initialize...");
        await llmHandler.initialize((progress) => {
          console.log("Loading WebLLM:", progress);
          // Check if initialization is complete
          if (progress.progress === 1) {
            console.log("Progress reached 100%, but still waiting for promise to resolve");
          }
        });

        console.log("WebLLM initialization promise resolved!");
        setHandler(llmHandler);
        setLlmReady(true);
        console.log("State updated - llmReady set to true");
      } catch (error) {
        console.error("Failed to initialize WebLLM:", error);
      } finally {
        console.log("Setting llmLoading to false");
        setLlmLoading(false);
      }
    };

    initWebLLM();
  }, [db]);

  const handlePromptSubmit = async () => {
    if (!handler || !promptInput.trim()) return;

    setGeneratingSQL(true);

    try {
      // Generate SQL preview without executing
      const sqlQuery = await handler.generateSQLPreview(promptInput);
      setSqlPreview(sqlQuery);
      setShowSQLPreview(true);
    } catch (error) {
      console.error("SQL generation failed:", error);
    } finally {
      setGeneratingSQL(false);
    }
  };

  const handleConfirmSQL = () => {
    setConfirmedQuery(promptInput);
    setShowSQLPreview(false);
    setViewMode("visualization");
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    setConfirmedQuery("");
    setPromptInput("");
    setSqlPreview(null);
  };

  // Show visualization view
  if (viewMode === "visualization") {
    return (
      <AutoVisualizationExperience
        db={db}
        initialQuery={confirmedQuery}
        onBack={handleBackToDashboard}
      />
    );
  }

  const tabs = [
    { id: "sessions" as TabType, name: "Sessions", icon: "📊" },
    { id: "users" as TabType, name: "Users", icon: "👥" },
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

            {llmLoading && (
              <div class="flex items-center space-x-2 text-sm text-blue-600">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading AI Assistant...</span>
              </div>
            )}

            {llmReady && (
              <div class="flex items-center space-x-2 text-sm text-green-600">
                <span class="w-2 h-2 bg-green-600 rounded-full"></span>
                <span>AI Ready</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div class="flex space-x-8 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                class={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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

      {/* AI Prompt Section */}
      {llmReady && (
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex-1 mr-4">
                <h2 class="text-lg font-semibold mb-1">Ask a question about your data</h2>
                <p class="text-sm text-blue-100">
                  Generate SQL and visualizations with natural language
                </p>
              </div>
            </div>

            {/* Prompt Input */}
            <div class="flex gap-3">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.currentTarget.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePromptSubmit();
                  }
                }}
                placeholder="Example: Show conversion rate by traffic source for the last 30 days"
                class="flex-1 p-3 rounded-lg text-gray-900 border-2 border-white/20 focus:border-white focus:outline-none"
                rows={2}
                disabled={!llmReady || generatingSQL}
              />
              <button
                onClick={handlePromptSubmit}
                disabled={!promptInput.trim() || generatingSQL || !llmReady}
                class={`px-6 py-2 rounded-lg font-medium transition-colors self-end ${
                  promptInput.trim() && !generatingSQL && llmReady
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                {generatingSQL ? "Generating..." : "Preview SQL"}
              </button>
            </div>

            {/* Quick Examples */}
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="text-xs text-blue-100">Try:</span>
              <button
                onClick={() => setPromptInput("Show conversion rate by traffic source")}
                class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
              >
                "Conversion by source"
              </button>
              <button
                onClick={() => setPromptInput("Revenue trends over last 12 weeks")}
                class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
              >
                "Revenue trends"
              </button>
              <button
                onClick={() => setPromptInput("Active users by plan tier")}
                class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
              >
                "Users by plan"
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "sessions" && <SessionDashboard db={db} />}
        {activeTab === "users" && <UserDashboard db={db} />}
      </div>

      {/* SQL Preview Modal */}
      {showSQLPreview && sqlPreview && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-auto">
            <div class="p-6">
              <h3 class="text-xl font-bold mb-4">SQL Preview</h3>

              {/* Query Explanation */}
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-blue-900 mb-2">What this query does:</h4>
                <p class="text-sm text-blue-800">{sqlPreview.explanation}</p>
              </div>

              {/* Query Details */}
              <div class="grid grid-cols-2 gap-3 text-sm mb-4">
                <div class="bg-gray-50 p-3 rounded">
                  <span class="font-medium text-gray-700">Table:</span>{" "}
                  <span class="text-gray-900">{sqlPreview.table}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded">
                  <span class="font-medium text-gray-700">Measures:</span>{" "}
                  <span class="text-gray-900">{sqlPreview.measures.join(", ")}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded col-span-2">
                  <span class="font-medium text-gray-700">Dimensions:</span>{" "}
                  <span class="text-gray-900">
                    {sqlPreview.dimensions?.length > 0 ? sqlPreview.dimensions.join(", ") : "none"}
                  </span>
                </div>
              </div>

              {/* SQL Code */}
              <div class="mb-6">
                <h4 class="font-semibold mb-2">Generated SQL:</h4>
                <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                  {sqlPreview.sql}
                </pre>
              </div>

              {/* Actions */}
              <div class="flex justify-end gap-3">
                <button
                  onClick={() => setShowSQLPreview(false)}
                  class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSQL}
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Execute & Visualize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
