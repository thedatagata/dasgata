// islands/smarter_dashboard/CombinedDashboard.tsx
import { useState } from "preact/hooks";
import SessionDashboard from "./dashboard_landing_view/SessionDashboard.tsx";
import UserDashboard from "./UserDashboard.tsx";

interface CombinedDashboardProps {
  db: any;
  onAskQuestion: () => void;
}

export default function CombinedDashboard({ db, onAskQuestion }: CombinedDashboardProps) {
  const [activeView, setActiveView] = useState<'sessions' | 'users'>('sessions');

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">DasGata Analytics</h1>
              <p class="text-sm text-gray-500">Amplitude session & user metrics</p>
            </div>

            {/* View Toggle */}
            <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('sessions')}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'sessions'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Sessions
              </button>
              <button
                onClick={() => setActiveView('users')}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'users'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👥 Users
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Query Prompt - Always Visible */}
      <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 mr-4">
              <h2 class="text-lg font-semibold mb-1">Ask a question about your data</h2>
              <p class="text-sm text-blue-100">
                Get instant visualizations with natural language queries
              </p>
            </div>
            <button
              onClick={onAskQuestion}
              class="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-lg flex items-center space-x-2"
            >
              <span>🤖</span>
              <span>Ask Claude</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Quick Examples */}
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="text-xs text-blue-100">Try:</span>
            <button
              onClick={onAskQuestion}
              class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
            >
              "Show conversion rate by source"
            </button>
            <button
              onClick={onAskQuestion}
              class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
            >
              "Revenue trends over time"
            </button>
            <button
              onClick={onAskQuestion}
              class="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition-colors"
            >
              "Active users by plan tier"
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'sessions' && <SessionDashboard db={db} />}
        {activeView === 'users' && <UserDashboard db={db} />}
      </div>
    </div>
  );
}
