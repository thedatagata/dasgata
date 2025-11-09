import { useState } from "preact/hooks";
import PivotTable from "./PivotTable.tsx";
import NaturalLanguageQuery from "./NaturalLanguageQuery.tsx";
import DashboardWithPlots from "./DashboardWithPlots.tsx";
import DataCatalog from "./DataCatalog.tsx";

import { PlanFeatures } from "../utils/launchDarkly.ts";

interface DashboardTabsProps {
  motherDuckToken: string;
  features: PlanFeatures;
}

export default function DashboardTabs({ motherDuckToken, features }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"nl" | "pivot" | "charts" | "catalog">("nl");

  const tabs = [
    { 
      id: "nl", 
      label: "🤖 AI Query", 
      description: "Ask questions in plain English",
      enabled: true // Always available
    },
    { 
      id: "pivot", 
      label: "📊 Pivot Table", 
      description: "Explore with dimensions & measures",
      enabled: features.hasPivotTables
    },
    { 
      id: "charts", 
      label: "📈 Time Series", 
      description: "View trends over time",
      enabled: features.hasVisualization
    },
    { 
      id: "catalog", 
      label: "📚 Data Catalog", 
      description: "Browse & load tables",
      enabled: features.hasDataCatalog
    },
  ];

  return (
    <div class="space-y-6">
      {/* Feature Banner */}
      {!features.hasWebLLM && (
        <div class="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <p class="text-yellow-200">
            🔒 <strong>Upgrade to Premium</strong> to unlock WebLLM for privacy-first AI queries on local data
          </p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div class="bg-[#172217]/60 backdrop-blur-sm rounded-lg shadow-xl border border-[#90C137]/20">
        <div class="border-b border-[#90C137]/20">
          <nav class="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id as any)}
                disabled={!tab.enabled}
                class={`
                  flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-300
                  ${!tab.enabled ? 'opacity-40 cursor-not-allowed' : ''}
                  ${activeTab === tab.id
                    ? 'border-[#90C137] text-[#90C137] bg-[#90C137]/10'
                    : 'border-transparent text-[#F8F6F0]/70 hover:text-[#90C137] hover:bg-[#F8F6F0]/5'
                  }
                `}
              >
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-base">{tab.label}</span>
                  <span class={`text-xs ${activeTab === tab.id ? 'text-[#90C137]/80' : 'text-[#F8F6F0]/50'}`}>
                    {tab.description}
                  </span>
                  {!tab.enabled && <span class="text-xs text-red-400">🔒 Locked</span>}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "nl" && (
          <NaturalLanguageQuery 
            motherDuckToken={motherDuckToken}
            features={features}
          />
        )}
        {activeTab === "pivot" && features.hasPivotTables && (
          <PivotTable 
            motherDuckToken={motherDuckToken}
            features={features}
          />
        )}
        {activeTab === "charts" && features.hasVisualization && (
          <DashboardWithPlots 
            motherDuckToken={motherDuckToken}
            features={features}
          />
        )}
        {activeTab === "catalog" && features.hasDataCatalog && (
          <DataCatalog 
            motherDuckToken={motherDuckToken}
            features={features}
          />
        )}
      </div>
    </div>
  );
}
