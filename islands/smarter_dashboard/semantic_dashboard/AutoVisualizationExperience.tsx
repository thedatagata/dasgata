// islands/smarter_dashboard/semantic_dashboard/AutoVisualizationExperience.tsx
import { useEffect, useState } from "preact/hooks";
import { WebLLMSemanticHandler } from "../../../utils/semantic/webllm-handler.ts";
import { createSemanticTables } from "../../../utils/semantic/semantic-amplitude.ts";
import { autoGenerateRechartsChart } from "../../../utils/semantic/recharts-generator.ts";
import { getSemanticConfig } from "../../../utils/semantic/semantic_config.ts";
import RechartsWrapper from "../../../components/charts/RechartsWrapper.tsx";
import { PivotBuilder } from "./PivotBuilder.tsx";
import type { RechartsConfig } from "../../../utils/semantic/recharts-generator.ts";

interface AutoVisualizationExperienceProps {
  db: any;
  initialQuery?: string;
  onBack: () => void;
}

export default function AutoVisualizationExperience({
  db,
  initialQuery,
  onBack,
}: AutoVisualizationExperienceProps) {
  const [handler, setHandler] = useState<WebLLMSemanticHandler | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState(initialQuery || "");
  const [result, setResult] = useState<any>(null);
  const [chartConfig, setChartConfig] = useState<RechartsConfig | null>(null);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drill-down/refinement state
  const [drillDownInput, setDrillDownInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [dataAnalysis, setDataAnalysis] = useState<string>("");

  const semanticConfig = getSemanticConfig();

  // Initialize WebLLM
  useEffect(() => {
    async function initWebLLM() {
      try {
        const tables = createSemanticTables(db);
        const llmHandler = new WebLLMSemanticHandler(tables, "medium");

        await llmHandler.initialize((progress) => {
          console.log("WebLLM initialization:", progress);
        });

        setHandler(llmHandler);
        setLoading(false);

        // If we have an initial query, run it
        if (initialQuery) {
          executeQuery(initialQuery, llmHandler);
        }
      } catch (error) {
        console.error("Failed to initialize WebLLM:", error);
        setError("Failed to initialize AI assistant");
        setLoading(false);
      }
    }
    initWebLLM();
  }, [db, initialQuery]);

  // Generate chart when result changes
  useEffect(() => {
    if (result && result.data.length > 0) {
      try {
        const { rechartsConfig, detection } = autoGenerateRechartsChart(
          result.query,
          result.data,
          semanticConfig,
        );
        setChartConfig(rechartsConfig);

        // Generate data analysis
        generateDataAnalysis(result.data, result.query);
      } catch (error) {
        console.error("Chart generation failed:", error);
      }
    }
  }, [result]);

  const generateDataAnalysis = async (data: any[], query: any) => {
    if (!handler || data.length === 0) return;

    try {
      const sampleData = data.slice(0, 5);
      const analysisPrompt = `Analyze this data and provide 2-3 key insights in bullet points:
      
Query: ${query.explanation}
Dimensions: ${query.dimensions?.join(", ") || "none"}
Measures: ${query.measures.join(", ")}
Sample data (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

Provide insights in this format:
• [Key insight 1]
• [Key insight 2]
• [Key insight 3 if applicable]`;

      const response = await handler.chat(analysisPrompt);
      setDataAnalysis(response);
    } catch (error) {
      console.error("Analysis generation failed:", error);
      setDataAnalysis("Unable to generate analysis");
    }
  };

  const executeQuery = async (queryText: string, llmHandler?: WebLLMSemanticHandler) => {
    const activeHandler = llmHandler || handler;
    if (!activeHandler || !queryText.trim()) return;

    setError(null);
    setQuerying(true);

    try {
      const { query, data } = await activeHandler.generateQuery(queryText);
      setResult({ query, data });
    } catch (error) {
      console.error("Query failed:", error);
      setError(error.message);
    } finally {
      setQuerying(false);
    }
  };

  const handleQuery = () => executeQuery(userInput);

  const handleDrillDown = async () => {
    if (!handler || !drillDownInput.trim() || !result) return;

    setRefining(true);
    setError(null);

    try {
      const drillDownPrompt = `Based on this current analysis:
Query: ${result.query.explanation}
Table: ${result.query.table}
Dimensions: ${result.query.dimensions?.join(", ") || "none"}
Measures: ${result.query.measures.join(", ")}

User wants to drill down: ${drillDownInput}

Generate a new query that drills into this data based on the user's request.`;

      const { query, data } = await handler.generateQuery(drillDownPrompt);
      setResult({ query, data });
      setDrillDownInput("");
    } catch (error) {
      console.error("Drill-down failed:", error);
      setError(error.message);
    } finally {
      setRefining(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const handleDrillDownKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleDrillDown();
    }
  };

  if (loading) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4">
          </div>
          <p class="text-gray-600">Initializing AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span class="font-medium">Back to Dashboard</span>
            </button>

            <div class="flex items-center space-x-2 text-sm text-green-600">
              <span class="w-2 h-2 bg-green-600 rounded-full"></span>
              <span>AI Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Query Input (if no initial query) */}
        {!initialQuery && (
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">Ask Questions, Get Visualizations</h2>

            <div class="mb-4">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                placeholder="Example: Show conversion rate by traffic source"
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />

              <div class="flex justify-end mt-3">
                <button
                  onClick={handleQuery}
                  disabled={!userInput.trim() || querying}
                  class={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    userInput.trim() && !querying
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {querying ? "Generating..." : "Generate Visualization"}
                </button>
              </div>
            </div>

            {error && (
              <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <div class="font-medium">Error</div>
                <div class="text-sm">{error}</div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div class="space-y-6">
            {/* Query Summary & Drill Down */}
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-xl font-bold mb-3">{result.query.explanation}</h3>

              <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-4">
                <div>
                  <span class="font-medium text-gray-700">Table:</span>{" "}
                  <span class="text-gray-900">{result.query.table}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Chart:</span>{" "}
                  <span class="text-gray-900 capitalize">{chartConfig?.type || "N/A"}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Dimensions:</span>{" "}
                  <span class="text-gray-900">
                    {result.query.dimensions?.length > 0
                      ? result.query.dimensions.join(", ")
                      : "none"}
                  </span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Measures:</span>{" "}
                  <span class="text-gray-900">{result.query.measures.join(", ")}</span>
                </div>
              </div>

              {/* Drill-Down Prompt */}
              <div class="border-t border-gray-200 pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Drill into this data
                </label>
                <div class="flex gap-2">
                  <textarea
                    value={drillDownInput}
                    onChange={(e) => setDrillDownInput(e.currentTarget.value)}
                    onKeyPress={handleDrillDownKeyPress}
                    placeholder="Examples:&#10;• Show only last 7 days&#10;• Filter for paid customers only&#10;• Break down by device type&#10;• Show percentage change"
                    class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleDrillDown}
                    disabled={!drillDownInput.trim() || refining}
                    class={`px-4 py-2 rounded-lg font-medium transition-colors self-end ${
                      drillDownInput.trim() && !refining
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {refining ? "Drilling..." : "Drill Down"}
                  </button>
                </div>
              </div>
            </div>

            {/* Data Analysis */}
            {dataAnalysis && (
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 class="font-semibold text-blue-900 mb-2">📊 Data Insights</h4>
                <div class="text-sm text-blue-800 whitespace-pre-line">
                  {dataAnalysis}
                </div>
              </div>
            )}

            {/* Auto-Generated Chart */}
            {chartConfig && (
              <RechartsWrapper config={chartConfig} height={400} loading={querying} />
            )}

            {/* Pivot Table */}
            {result.data.length > 0 && (
              <PivotBuilder
                data={result.data}
                availableColumns={Object.keys(result.data[0])}
              />
            )}

            {/* Raw Data Preview */}
            <details class="bg-white rounded-lg shadow-md">
              <summary class="cursor-pointer p-4 font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                View Raw Data ({result.data.length} rows)
              </summary>
              <div class="p-4 border-t border-gray-200">
                <div class="overflow-auto max-h-96">
                  <pre class="text-xs p-4 bg-gray-50 rounded">
                    {JSON.stringify(result.data.slice(0, 10), null, 2)}
                    {result.data.length > 10 && `\n... and ${result.data.length - 10} more rows`}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
