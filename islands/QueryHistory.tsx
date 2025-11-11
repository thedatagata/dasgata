// islands/QueryHistory.tsx
import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface CachedQuery {
  id: string;
  prompt: string;
  query: string;
  results: any[];
  timestamp: number;
  approved: boolean;
  queryMode: 'webllm' | 'motherduck';
  tableNames: string[];
}

interface QueryHistoryProps {
  onReload: (query: CachedQuery) => void;
  currentPrompt?: string;
}

export default function QueryHistory({ onReload, currentPrompt }: QueryHistoryProps) {
  const queries = useSignal<CachedQuery[]>([]);
  const loading = useSignal(true);
  const filter = useSignal<'all' | 'approved'>('all');
  const similarMatch = useSignal<CachedQuery | null>(null);

  const filteredQueries = useComputed(() => {
    if (filter.value === 'approved') {
      return queries.value.filter(q => q.approved);
    }
    return queries.value;
  });

  // Load recent queries
  useEffect(() => {
    loadRecentQueries();
  }, []);

  // Check for similar query when prompt changes
  useEffect(() => {
    if (currentPrompt && currentPrompt.length > 10) {
      findSimilarQuery(currentPrompt);
    } else {
      similarMatch.value = null;
    }
  }, [currentPrompt]);

  async function loadRecentQueries() {
    try {
      loading.value = true;
      const response = await fetch('/api/query/approve?limit=20');
      const data = await response.json();
      
      if (data.success) {
        queries.value = data.queries;
      }
    } catch (error) {
      console.error('Failed to load queries:', error);
    } finally {
      loading.value = false;
    }
  }

  async function findSimilarQuery(prompt: string) {
    try {
      const response = await fetch(
        `/api/query/cache?prompt=${encodeURIComponent(prompt)}&threshold=0.85`
      );
      const data = await response.json();
      
      if (data.success && data.cached) {
        similarMatch.value = data.cached;
      } else {
        similarMatch.value = null;
      }
    } catch (error) {
      console.error('Failed to find similar query:', error);
      similarMatch.value = null;
    }
  }

  async function approveQuery(id: string) {
    try {
      const response = await fetch('/api/query/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        queries.value = queries.value.map(q => 
          q.id === id ? { ...q, approved: true } : q
        );
      }
    } catch (error) {
      console.error('Failed to approve query:', error);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <div class="space-y-4">
      {/* Similar Query Alert */}
      {similarMatch.value && (
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium text-blue-800">
                Similar query found! ({(similarMatch.value.embedding ? 'High' : 'Medium')} confidence)
              </p>
              <p class="mt-1 text-sm text-blue-700">
                "{similarMatch.value.prompt}"
              </p>
              <button
                onClick={() => onReload(similarMatch.value!)}
                class="mt-2 text-sm font-medium text-blue-800 hover:text-blue-900 underline"
              >
                Load cached results ({similarMatch.value.results.length} rows)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div class="flex space-x-2 border-b">
        <button
          onClick={() => filter.value = 'all'}
          class={`px-4 py-2 font-medium text-sm ${
            filter.value === 'all'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => filter.value = 'approved'}
          class={`px-4 py-2 font-medium text-sm ${
            filter.value === 'approved'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Approved
        </button>
      </div>

      {/* Query List */}
      {loading.value ? (
        <div class="text-center py-8 text-gray-500">Loading queries...</div>
      ) : filteredQueries.value.length === 0 ? (
        <div class="text-center py-8 text-gray-500">
          No {filter.value === 'approved' ? 'approved' : ''} queries yet
        </div>
      ) : (
        <div class="space-y-3 max-h-96 overflow-y-auto">
          {filteredQueries.value.map((query) => (
            <div 
              key={query.id}
              class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-xs font-medium px-2 py-1 rounded bg-gray-100">
                      {query.queryMode}
                    </span>
                    {query.approved && (
                      <span class="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                        ✓ Approved
                      </span>
                    )}
                  </div>
                  <p class="font-medium text-gray-900">{query.prompt}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    {formatDate(query.timestamp)} • {query.tableNames.join(', ')}
                  </p>
                </div>
                
                <div class="flex space-x-2 ml-4">
                  {!query.approved && (
                    <button
                      onClick={() => approveQuery(query.id)}
                      class="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      title="Approve query"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => onReload(query)}
                    class="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Reload results"
                  >
                    Load
                  </button>
                </div>
              </div>
              
              <details class="mt-2">
                <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  View SQL ({query.results.length} rows)
                </summary>
                <pre class="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {query.query}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
