# Analytics Experience Rollout - Implementation Plan v3

## Two-Stage Implementation

### Stage 1: Clean Up & LaunchDarkly Integration (4-5 hours)
**Goal**: Working base + premium experiences with LaunchDarkly control

#### 1.1 Remove Trial Tier (30 min)
- [ ] Update onboarding: only "Base" and "Premium" options
- [ ] Remove trial references from database schema
- [ ] Update user type to `plan_tier: "base" | "premium"`

#### 1.2 Simplify Current Flow (1 hour)
- [ ] Remove "Configure" step
- [ ] Flow: Select → Analyze (query) → Visualize
- [ ] Keep existing WebLLM + MotherDuck AI integration

#### 1.3 Create Base Experience Component (1 hour)
**File**: `islands/BaseExperience.tsx`
- Select table (streaming from MotherDuck)
- Query with MotherDuck AI
- Audit results
- Observable visualization
- No materialization

#### 1.4 Create Premium Control Component (1.5 hours)
**File**: `islands/PremiumExperience.tsx`
- Select table
- Materialize to DuckDB-WASM (user clicks button)
- WebLLM generates queries against materialized tables
- Audit results
- Observable visualization

#### 1.5 LaunchDarkly Integration (1 hour)
**Files**: 
- `lib/analytics-config.ts` - Config getter
- `routes/dashboard.tsx` - Route to correct experience
- Add event tracking: `dashboard_loaded`, `query_executed`, `materialization_completed`

**Flag Structure**:
```json
{
  "base": {
    "engine": "motherduck_ai",
    "materialized": false,
    "viz": "observable"
  },
  "premium_control": {
    "engine": "webllm",
    "materialized": true,
    "viz": "observable"
  },
  "premium_treatment": {
    "engine": "webllm_semantic",
    "materialized": true,
    "viz": "plotly",
    "autoViz": true
  }
}
```

---

### Stage 2: Premium Treatment (8-10 hours)
**Goal**: Semantic layer with auto-viz and Plotly drill-downs

#### 2.1 Auto-Materialization (2 hours)
**File**: `lib/semantic-materializer.ts`
- Detect if sessions_fct/users_fct need materialization
- Auto-materialize on dashboard load
- Show loading state with progress

#### 2.2 Semantic Layer Setup (2 hours)
**File**: `lib/semantic/amplitude.ts`
- Port semantic layer to TypeScript for DuckDB-WASM
- Define dimensions and measures for sessions_fct and users_fct
- Query builder: `semanticTable.query({ dimensions: [...], measures: [...] })`

#### 2.3 Table Selector + Auto-Viz (2 hours)
**File**: `islands/SemanticExperience.tsx`
- User selects: "Sessions" or "Users"
- Auto-generate 4 Plotly visualizations:
  - Sessions: Lifecycle funnel, new vs returning, traffic, revenue by source
  - Users: Cohort distribution, retention rates, LTV by tier, lifecycle stages
- Display in 2x2 grid

#### 2.4 WebLLM Semantic Queries (2 hours)
**File**: `lib/webllm-semantic-handler.ts`
- Feed semantic layer schema to WebLLM context
- User prompt: "Compare activation rates by traffic source"
- WebLLM generates: `sessionsSemantic.query({ dimensions: ["traffic_source"], measures: ["activation_rate"] })`
- Execute query and return results

#### 2.5 Plotly Pivot Table (2 hours)
**File**: `islands/PlotlyPivotTable.tsx`
- Render query results as interactive Plotly table
- Support sorting, filtering
- Click column to create visualization

---

## File Structure

```
thedenogatar/
├── islands/
│   ├── BaseExperience.tsx              # Stage 1.3
│   ├── PremiumExperience.tsx           # Stage 1.4
│   └── SemanticExperience.tsx          # Stage 2.3
│       ├── TableSelector.tsx
│       ├── AutoVisualizations.tsx
│       ├── WebLLMSemanticInput.tsx
│       └── PlotlyPivotTable.tsx        # Stage 2.5
│
├── lib/
│   ├── analytics-config.ts             # Stage 1.5
│   ├── semantic-materializer.ts        # Stage 2.1
│   ├── webllm-semantic-handler.ts      # Stage 2.4
│   └── semantic/
│       ├── amplitude.ts                # Stage 2.2
│       └── chart-generator.ts          # Stage 2.3
│
└── routes/
    ├── onboarding.tsx                  # Stage 1.1 - remove trial
    └── dashboard.tsx                   # Stage 1.5 - routing
```

---

## LaunchDarkly Setup

### Feature Flag: `analytics-experience`
**Type**: JSON
**Variations**:
1. `base` - MotherDuck AI, streaming, Observable
2. `premium_control` - WebLLM, manual materialize, Observable  
3. `premium_treatment` - WebLLM+Semantic, auto-materialize, Plotly

**Targeting**:
- IF `plan_tier = "base"` → serve `base`
- IF `plan_tier = "premium"` → Progressive rollout: `premium_control` → `premium_treatment` (0% to 100%)

### Metrics to Track
- `dashboard_loaded` - Which experience loaded
- `query_executed` - Query time by engine
- `materialization_completed` - Materialization time
- `visualization_created` - Chart generation time
- `user_interaction` - Engagement level

---

## Testing Checklist

### Stage 1
- [ ] Onboarding shows only Base/Premium
- [ ] Base users see streaming + MotherDuck AI
- [ ] Premium users see WebLLM + materialization
- [ ] LaunchDarkly flag evaluates correctly
- [ ] Metrics tracked in LD dashboard

### Stage 2
- [ ] Auto-materialization works on load
- [ ] Table selector shows Sessions/Users
- [ ] 4 charts auto-generate
- [ ] WebLLM queries semantic layer
- [ ] Plotly pivot table renders results
- [ ] Progressive rollout 0% → 100% works

---

## Demo Script

1. **Show Base** (2 min)
   - Log in as base user
   - Select table, query with MotherDuck AI
   - Show Observable chart

2. **Show Premium Control** (2 min)
   - Log in as premium user
   - Materialize table
   - WebLLM generates query
   - Show Observable chart

3. **Start Rollout** (1 min)
   - Open LaunchDarkly dashboard
   - Set progressive rollout: 0% → 20%

4. **Show Premium Treatment** (5 min)
   - Refresh premium dashboard
   - Tables auto-materialize
   - Select "Sessions"
   - 4 Plotly charts appear
   - Prompt: "Show conversion by UTM source"
   - Display Plotly pivot table

5. **Metrics** (2 min)
   - Compare query times
   - Show engagement metrics
   - Demonstrate rollback
