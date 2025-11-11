# Amplitude Semantic Layer v2

Business-friendly interface for querying Amplitude analytics data using Boring Semantic Layer v2, Ibis, and MotherDuck.

## Quick Start

```python
from amplitude_semantic_v2 import sessions, users

# Sessions by plan tier
result = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "conversion_rate", "total_revenue")
    .order_by(ibis.desc("session_count"))
    .execute()
)

# Active users overview
result = users.group_by().aggregate(
    "user_count",
    "active_users_30d",
    "retention_rate_30d"
).execute()
```

## Installation

```bash
# Core dependencies
pip install boring-semantic-layer ibis-framework[duckdb]

# For visualizations (optional)
pip install 'boring-semantic-layer[viz-altair]'

# Or with uv (recommended)
uv add boring-semantic-layer ibis-framework[duckdb]
```

## Data Sources

### Sessions (`amplitude.sessions_fct`)
- **345,538 sessions** across all plan tiers
- Tracks behavior, conversions, lifecycle progression, attribution
- Key dimensions: plan_tier, traffic_source, lifecycle_stage, utm_* fields
- Key measures: session_count, conversion_rate, revenue metrics

### Users (`amplitude.users_fct`)
- **234,835 users** with lifetime and recent activity metrics
- Tracks engagement, retention, revenue, attribution
- Key dimensions: current_plan_tier, lifecycle_stage_name, is_active_*
- Key measures: user_count, retention rates, LTV, cohorts

## Available Metrics

### Sessions
- **Volume**: session_count, total_events
- **Engagement**: avg_session_duration, avg_events_per_session, bounce_rate
- **Revenue**: total_revenue, avg_revenue_per_session, revenue_per_event
- **Conversion**: conversion_rate (%), activation_rate (%), identified_rate (%)
- **Lifecycle**: awareness/interest/consideration/trial/activation/retention/expansion/churn_risk events
- **Funnel**: avg_funnel_depth, max_funnel_reached
- **Market**: market_share (% of total sessions)

### Users
- **Base**: user_count, active_users_7d, active_users_30d, paying_customers
- **Engagement**: avg_lifetime_events, avg_sessions_30d, stickiness_30d
- **Revenue**: total_ltv, avg_ltv, avg_revenue_30d, revenue_per_active_user
- **Retention**: retention_rate_7d/30d (%), activation_rate (%), paying_rate (%)
- **Cohorts**: power_users, casual_users, at_risk_users
- **Market**: market_share (% of total users)

## Query Patterns

### Basic Aggregation

```python
# Overall metrics (no grouping)
result = sessions.group_by().aggregate(
    "session_count",
    "conversion_rate",
    "total_revenue"
).execute()
```

### Grouping by Dimensions

```python
# Single dimension
result = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "conversion_rate")
    .execute()
)

# Multiple dimensions
result = (
    sessions
    .group_by("utm_source", "utm_medium")
    .aggregate("session_count", "total_revenue")
    .execute()
)
```

### Filtering

```python
from ibis import _

# High-value sessions
result = (
    sessions
    .filter(_.session_revenue > 100)
    .filter(_.session_duration_seconds > 60)
    .group_by("plan_tier")
    .aggregate("session_count", "total_revenue")
    .execute()
)

# Time-based filtering
from datetime import datetime, timedelta
week_ago = datetime.now() - timedelta(days=7)

result = (
    sessions
    .filter(_.session_start_time >= week_ago)
    .group_by("plan_tier")
    .aggregate("session_count")
    .execute()
)
```

### Sorting and Limiting

```python
import ibis

result = (
    sessions
    .group_by("traffic_source")
    .aggregate("session_count", "conversion_rate")
    .order_by(ibis.desc("session_count"))
    .limit(10)
    .execute()
)
```

### On-the-Fly Calculations

```python
# Computed measures in aggregate()
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "total_revenue",
        # Custom: revenue per session
        rps=lambda t: t.total_revenue / t.session_count,
        # Custom: high-value session %
        high_value_pct=lambda t: (t.session_revenue > 50).mean() * 100
    )
    .execute()
)
```

### Post-Aggregation Transformations

```python
# Use mutate() for calculations after aggregation
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "avg_session_duration",
        "conversion_rate"
    )
    .mutate(
        quality_score=lambda t: (
            (t.avg_session_duration / 100) * 0.4 +
            t.conversion_rate * 0.6
        )
    )
    .order_by(ibis.desc("quality_score"))
    .execute()
)
```

### Visualization

```python
# Requires: pip install 'boring-semantic-layer[viz-altair]'

# Auto-detected bar chart
chart = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "conversion_rate")
    .order_by(ibis.desc("session_count"))
    .chart()  # Returns interactive visualization
)

# Export as PNG
png_bytes = chart.chart(format="png")
with open("sessions_by_tier.png", "wb") as f:
    f.write(png_bytes)

# Time series (auto-detected line chart)
chart = (
    sessions
    .group_by("session_date")
    .aggregate("session_count", "total_revenue")
    .order_by("session_date")
    .chart()
)
```

### View Generated SQL

```python
result = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "conversion_rate")
)

# Inspect SQL before executing
print(result.sql())

# Then execute
df = result.execute()
```

## Integration with LaunchDarkly

### AI Config Query Context

Use the semantic layer to provide context for AI queries:

```python
# In your LaunchDarkly AI Config handler
from amplitude_semantic_v2 import sessions, users

def get_analytics_context(user_plan: str) -> dict:
    """Generate semantic layer context for AI queries"""
    
    # Get session metrics for user's plan tier
    session_metrics = (
        sessions
        .filter(_.plan_tier == user_plan)
        .group_by()
        .aggregate(
            "session_count",
            "avg_session_duration",
            "conversion_rate",
            "bounce_rate"
        )
        .execute()
        .iloc[0]
        .to_dict()
    )
    
    # Get user cohort info
    user_metrics = (
        users
        .filter(_.current_plan_tier == user_plan)
        .group_by()
        .aggregate(
            "user_count",
            "retention_rate_30d",
            "power_users",
            "casual_users"
        )
        .execute()
        .iloc[0]
        .to_dict()
    )
    
    return {
        "plan_tier": user_plan,
        "session_metrics": session_metrics,
        "user_metrics": user_metrics
    }
```

### Feature Flag Targeting

Use semantic layer metrics for targeting rules:

```python
# Calculate user engagement score for targeting
def get_engagement_score(email: str) -> float:
    """Get user engagement score for LaunchDarkly context"""
    
    user_data = (
        users
        .filter(_.email == email)
        .group_by()
        .aggregate(
            "avg_events_30d",
            "avg_sessions_30d",
            "retention_rate_30d"
        )
        .execute()
    )
    
    if user_data.empty:
        return 0.0
    
    row = user_data.iloc[0]
    
    # Weighted engagement score (0-100)
    score = (
        (row['avg_events_30d'] / 100) * 40 +  # 40% weight on events
        (row['avg_sessions_30d'] / 20) * 30 +  # 30% weight on sessions
        (row['retention_rate_30d']) * 30       # 30% weight on retention
    )
    
    return min(score, 100.0)
```

### Experimentation Analysis

Analyze experiment results by plan tier:

```python
def analyze_experiment_by_cohort(experiment_key: str):
    """Compare experiment impact across user cohorts"""
    
    # Get power users vs casual users performance
    power_user_metrics = (
        sessions
        .filter(_.total_events > 100)
        .filter(_.sessions_30d > 20)
        .group_by("plan_tier")
        .aggregate(
            "session_count",
            "conversion_rate",
            "avg_revenue_per_session"
        )
        .execute()
    )
    
    casual_metrics = (
        sessions
        .filter(_.total_events.between(10, 100))
        .group_by("plan_tier")
        .aggregate(
            "session_count",
            "conversion_rate",
            "avg_revenue_per_session"
        )
        .execute()
    )
    
    return {
        "power_users": power_user_metrics.to_dict(orient='records'),
        "casual_users": casual_metrics.to_dict(orient='records')
    }
```

## Advanced Examples

### Cohort Analysis

```python
# Engagement cohorts with custom thresholds
result = (
    users
    .group_by("current_plan_tier")
    .aggregate(
        "user_count",
        "power_users",  # >100 events, >20 sessions
        "casual_users", # 10-100 events, 5-20 sessions
        "at_risk_users",  # >30 days inactive
        # Calculate percentages
        power_pct=lambda t: t.power_users / t.user_count * 100,
        casual_pct=lambda t: t.casual_users / t.user_count * 100,
        at_risk_pct=lambda t: t.at_risk_users / t.user_count * 100
    )
    .execute()
)
```

### Funnel Analysis

```python
# Lifecycle stage progression
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "awareness_events",
        "interest_events",
        "consideration_events",
        "trial_events",
        "activation_events",
        # Conversion rates between stages
        awareness_to_interest=lambda t: t.interest_events / t.awareness_events * 100,
        interest_to_consideration=lambda t: t.consideration_events / t.interest_events * 100,
        consideration_to_trial=lambda t: t.trial_events / t.consideration_events * 100,
        trial_to_activation=lambda t: t.activation_events / t.trial_events * 100
    )
    .execute()
)
```

### Attribution ROI

```python
# ROI by traffic source
result = (
    sessions
    .filter(_.traffic_source.notnull())
    .group_by("traffic_source")
    .aggregate(
        "session_count",
        "total_revenue",
        "conversion_rate",
        # Average revenue per session
        arps=lambda t: t.total_revenue / t.session_count,
        # Market share
        "market_share"
    )
    .mutate(
        # Assume $50 cost per 100 sessions for comparison
        estimated_cost=lambda t: t.session_count / 100 * 50,
        roi=lambda t: (t.total_revenue - t.estimated_cost) / t.estimated_cost * 100
    )
    .order_by(ibis.desc("roi"))
    .execute()
)
```

## Running Examples

```bash
cd semantic_layer

# Run comprehensive examples
python examples_v2.py

# Import for custom analysis
python
>>> from amplitude_semantic_v2 import sessions, users
>>> result = sessions.group_by("plan_tier").aggregate("session_count").execute()
```

## Architecture

```
amplitude_semantic_v2.py     # Semantic table definitions
├── sessions                 # 33 dimensions, 20 measures
└── users                    # 13 dimensions, 20 measures

examples_v2.py              # 18 example queries demonstrating v2 API

MotherDuck (md:)
├── amplitude.sessions_fct  # 345K sessions
└── amplitude.users_fct     # 235K users
```

## Next Steps

1. **Dashboard Integration**: Import semantic tables in your Fresh.js routes
2. **LaunchDarkly AI Configs**: Use metrics for AI query context
3. **Feature Targeting**: Calculate engagement scores for flag rules
4. **Experimentation**: Analyze results by cohort/plan tier
5. **Visualizations**: Add `.chart()` calls for interactive dashboards

## Troubleshooting

**MotherDuck Authentication**:
```python
# Set token
export motherduck_token="your_token"

# Or authenticate interactively
import ibis
con = ibis.duckdb.connect("md:")  # Opens browser
```

**Missing Columns**:
Check your table schema matches expectations:
```python
con = ibis.duckdb.connect("md:")
print(con.table("sessions_fct", database="amplitude").schema())
```

**Slow Queries**:
View generated SQL and optimize:
```python
result = sessions.group_by("plan_tier").aggregate("session_count")
print(result.sql())  # Check for inefficiencies
```
