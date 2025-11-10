import { useState } from "preact/hooks";
import PivotTable from "./PivotTable.tsx";
import NaturalLanguageQuery from "./NaturalLanguageQuery.tsx";
import DashboardWithPlots from "./DashboardWithPlots.tsx";
import DataCatalog from "./DataCatalog.tsx";

interface DashboardTabsProps {
  motherDuckToken: string;
  plan: string;
  email: string;
}

export default function DashboardTabs({ motherDuckToken, plan, email }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"nl" | "pivot" | "charts" | "catalog">("nl");

  const tabs = [
    { 
      id: "nl", 
      label: "🤖 AI Query", 
      description: "Ask questions in plain English",
      enabled: true // Always available for now
    },
    { 
      id: "pivot", 
      label: "📊 Pivot Table", 
      description: "Explore with dimensions & measures",
      enabled: true
    },
    { 
      id: "charts", 
      label: "📈 Time Series", 
      description: "View trends over time",
      enabled: true
    },
    { 
      id: "catalog", 
      label: "📚 Data Catalog", 
      description: "Browse & load tables",
      enabled: true
    },
  ];

  return (
    <div class="space-y-6">
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
          />
        )}
        {activeTab === "pivot" && (
          <PivotTable 
            motherDuckToken={motherDuckToken}
          />
        )}
        {activeTab === "charts" && (
          <DashboardWithPlots 
            motherDuckToken={motherDuckToken}
          />
        )}
        {activeTab === "catalog" && (
          <DataCatalog 
            motherDuckToken={motherDuckToken}
          />
        )}
      </div>
    </div>
  );
}
