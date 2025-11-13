// islands/smarter_dashboard/LoadingPage.tsx
import { useEffect, useState } from "preact/hooks";

export interface LoadingProgress {
  step: 'duckdb' | 'webllm' | 'complete';
  progress: number;
  message: string;
}

interface LoadingPageProps {
  onComplete: (db: any, webllmEngine: any) => void;
}

export default function LoadingPage({ onComplete }: LoadingPageProps) {
  const [loading, setLoading] = useState<LoadingProgress>({
    step: 'duckdb',
    progress: 0,
    message: 'Initializing database...'
  });

  useEffect(() => {
    async function initialize() {
      try {
        // Step 1: Create DuckDB-WASM instance
        setLoading({
          step: 'duckdb',
          progress: 10,
          message: 'Loading DuckDB WASM...'
        });

        const { MDConnection } = await import("@motherduck/wasm-client");
        
        setLoading({
          step: 'duckdb',
          progress: 30,
          message: 'Connecting to MotherDuck...'
        });

        // Get token
        const tokenResponse = await fetch('/api/motherduck-token');
        const { token } = await tokenResponse.json();
        
        // Create connection (initializes DuckDB-WASM + attaches MotherDuck)
        const mdConn = await MDConnection.create({ mdToken: token });
        
        setLoading({
          step: 'duckdb',
          progress: 40,
          message: 'Loading data locally...'
        });

        // Materialize tables locally for in-browser queries
        await mdConn.evaluateQuery('USE my_db');
        await mdConn.evaluateQuery('CREATE TABLE IF NOT EXISTS sessions_fct AS SELECT * FROM amplitude.sessions_fct');
        await mdConn.evaluateQuery('CREATE TABLE IF NOT EXISTS users_fct AS SELECT * FROM amplitude.users_fct');

        setLoading({
          step: 'webllm',
          progress: 60,
          message: 'Preparing WebLLM...'
        });

        // Step 2: Initialize WebLLM
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
        
        const engine = await CreateMLCEngine(
          "Llama-3.2-3B-Instruct-q4f16_1-MLC",
          {
            initProgressCallback: (progress) => {
              const webllmProgress = 60 + (progress.progress || 0) * 35;
              setLoading({
                step: 'webllm',
                progress: webllmProgress,
                message: progress.text || 'Loading language model...'
              });
            }
          }
        );

        setLoading({
          step: 'complete',
          progress: 100,
          message: 'Setup complete! Loading dashboard...'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        onComplete(mdConn, engine);

      } catch (error) {
        console.error("Initialization failed:", error);
        setLoading({
          step: 'duckdb',
          progress: 0,
          message: `Error: ${error.message}`
        });
      }
    }

    initialize();
  }, []);

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">DasGata Analytics</h1>
          <p class="text-gray-600">Setting up your account</p>
        </div>

        <div class="bg-white rounded-2xl shadow-xl p-8">
          <div class="flex justify-center mb-6">
            <div class="relative">
              <div class="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
              <div class="w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0"></div>
              {loading.step === 'complete' && (
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div class="text-center mb-4">
            <p class="text-lg font-medium text-gray-900 mb-1">
              {loading.message}
            </p>
            <p class="text-sm text-gray-500">
              {loading.step === 'duckdb' && 'Downloading data from cloud...'}
              {loading.step === 'webllm' && 'Loading AI assistant...'}
              {loading.step === 'complete' && 'Ready to go!'}
            </p>
          </div>

          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(loading.progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                class="h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loading.progress}%` }}
              />
            </div>
          </div>

          <div class="flex justify-between text-xs mt-6">
            <div class={`flex items-center ${loading.progress >= 10 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div class={`w-2 h-2 rounded-full mr-2 ${loading.progress >= 50 ? 'bg-green-500' : loading.progress >= 10 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <span class="font-medium">Database</span>
            </div>
            <div class={`flex items-center ${loading.progress >= 60 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div class={`w-2 h-2 rounded-full mr-2 ${loading.progress >= 95 ? 'bg-green-500' : loading.progress >= 60 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <span class="font-medium">AI Assistant</span>
            </div>
            <div class={`flex items-center ${loading.progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
              <div class={`w-2 h-2 rounded-full mr-2 ${loading.progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span class="font-medium">Complete</span>
            </div>
          </div>
        </div>

        <div class="text-center mt-6 text-sm text-gray-500">
          <p>💡 All queries run locally after initial load</p>
        </div>
      </div>
    </div>
  );
}
