"""
Amplitude Semantic Layer v2 - Example Queries
Demonstrates the full v2 API with filtering, grouping, aggregation, and charting
"""

import ibis
from amplitude_semantic_v2 import sessions, users

print("=" * 80)
print("AMPLITUDE SEMANTIC LAYER V2 - COMPREHENSIVE EXAMPLES")
print("=" * 80)

# ============================================================================
# BASIC QUERIES
# ============================================================================

print("\n1. OVERALL SESSION METRICS (No Grouping)")
print("-" * 80)
result = sessions.group_by().aggregate(
    "session_count",
    "total_revenue",
    "conversion_rate",
    "bounce_rate"
)
print(result.execute())

print("\n2. SESSIONS BY PLAN TIER")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "avg_session_duration",
        "conversion_rate",
        "market_share"
    )
    .order_by(ibis.desc("session_count"))
)
print(result.execute())

# ============================================================================
# FILTERING EXAMPLES
# ============================================================================

print("\n3. HIGH-VALUE SESSIONS (Revenue > $100)")
print("-" * 80)
result = (
    sessions
    .filter(_.session_revenue > 100)
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "total_revenue",
        "avg_revenue_per_session"
    )
    .order_by(ibis.desc("total_revenue"))
)
print(result.execute())

print("\n4. ENGAGED SESSIONS (Duration > 60s, Multiple Events)")
print("-" * 80)
result = (
    sessions
    .filter(_.session_duration_seconds > 60)
    .filter(_.total_events > 3)
    .group_by("traffic_source")
    .aggregate(
        "session_count",
        "avg_events_per_session",
        "conversion_rate"
    )
    .limit(10)
)
print(result.execute())

# ============================================================================
# MULTI-DIMENSIONAL ANALYSIS
# ============================================================================

print("\n5. CONVERSION FUNNEL BY PLAN TIER AND LIFECYCLE STAGE")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier", "max_lifecycle_stage")
    .aggregate(
        "session_count",
        "conversion_rate",
        "avg_funnel_depth"
    )
    .order_by(ibis.desc("session_count"))
    .limit(15)
)
print(result.execute())

print("\n6. ATTRIBUTION ANALYSIS: SOURCE + MEDIUM")
print("-" * 80)
result = (
    sessions
    .filter(_.utm_source.notnull())
    .group_by("utm_source", "utm_medium")
    .aggregate(
        "session_count",
        "total_revenue",
        "conversion_rate",
        "market_share"
    )
    .order_by(ibis.desc("session_count"))
    .limit(10)
)
print(result.execute())

# ============================================================================
# ON-THE-FLY CALCULATIONS
# ============================================================================

print("\n7. CUSTOM CALCULATIONS IN AGGREGATE")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "total_revenue",
        # On-the-fly: Revenue per session
        revenue_per_session=lambda t: t.total_revenue / t.session_count,
        # On-the-fly: High-value session %
        high_value_pct=lambda t: (t.session_revenue > 50).mean() * 100,
        # On-the-fly: Avg events per engaged session
        engaged_events=lambda t: t.total_events[t.session_duration_seconds > 30].mean()
    )
    .order_by(ibis.desc("total_revenue"))
)
print(result.execute())

# ============================================================================
# LIFECYCLE STAGE ANALYSIS
# ============================================================================

print("\n8. LIFECYCLE EVENT DISTRIBUTION")
print("-" * 80)
result = sessions.group_by().aggregate(
    "session_count",
    "awareness_events",
    "interest_events",
    "consideration_events",
    "trial_events",
    "activation_events",
    "retention_events",
    "expansion_events",
    "churn_risk_events"
)
print(result.execute())

print("\n9. LIFECYCLE STAGE PROGRESSION BY PLAN")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "avg_funnel_depth",
        "activation_rate",
        # Funnel velocity: events per step
        events_per_step=lambda t: t.total_events.sum() / t.max_funnel_step.sum()
    )
    .order_by(ibis.desc("avg_funnel_depth"))
)
print(result.execute())

# ============================================================================
# USER ANALYSIS
# ============================================================================

print("\n10. USER ENGAGEMENT OVERVIEW")
print("-" * 80)
result = users.group_by().aggregate(
    "user_count",
    "active_users_7d",
    "active_users_30d",
    "paying_customers",
    "retention_rate_7d",
    "retention_rate_30d",
    "stickiness_30d"
)
print(result.execute())

print("\n11. USER COHORTS BY ENGAGEMENT")
print("-" * 80)
result = users.group_by().aggregate(
    "user_count",
    "power_users",
    "casual_users",
    "at_risk_users",
    # Cohort percentages
    power_user_pct=lambda t: t.power_users / t.user_count * 100,
    casual_pct=lambda t: t.casual_users / t.user_count * 100,
    at_risk_pct=lambda t: t.at_risk_users / t.user_count * 100
)
print(result.execute())

print("\n12. REVENUE ANALYSIS BY PLAN TIER")
print("-" * 80)
result = (
    users
    .filter(_.current_plan_tier.notnull())
    .group_by("current_plan_tier")
    .aggregate(
        "user_count",
        "paying_customers",
        "total_ltv",
        "avg_ltv",
        "avg_revenue_30d",
        "market_share"
    )
    .order_by(ibis.desc("total_ltv"))
)
print(result.execute())

print("\n13. RETENTION BY LIFECYCLE STAGE")
print("-" * 80)
result = (
    users
    .filter(_.max_lifecycle_stage_name.notnull())
    .group_by("max_lifecycle_stage_name")
    .aggregate(
        "user_count",
        "retention_rate_7d",
        "retention_rate_30d",
        "avg_events_30d",
        "avg_revenue_30d"
    )
    .order_by(ibis.desc("user_count"))
)
print(result.execute())

# ============================================================================
# ATTRIBUTION ANALYSIS
# ============================================================================

print("\n14. FIRST TOUCH ATTRIBUTION")
print("-" * 80)
result = (
    users
    .filter(_.first_touch_utm_source.notnull())
    .group_by("first_touch_utm_source", "first_touch_utm_medium")
    .aggregate(
        "user_count",
        "activated_users",
        "paying_customers",
        "total_ltv",
        "avg_ltv",
        # Activation conversion rate
        activation_cvr=lambda t: t.activation_rate,
        # Customer conversion rate
        customer_cvr=lambda t: t.paying_rate
    )
    .order_by(ibis.desc("total_ltv"))
    .limit(10)
)
print(result.execute())

# ============================================================================
# ADVANCED: MUTATE FOR POST-AGGREGATION CALCULATIONS
# ============================================================================

print("\n15. SESSION QUALITY SCORE (Custom Formula)")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "avg_session_duration",
        "avg_events_per_session",
        "conversion_rate"
    )
    .mutate(
        # Quality score: weighted combination of metrics
        quality_score=lambda t: (
            (t.avg_session_duration / 100) * 0.3 +
            t.avg_events_per_session * 0.4 +
            t.conversion_rate * 0.3
        )
    )
    .order_by(ibis.desc("quality_score"))
)
print(result.execute())

# ============================================================================
# TIME-BASED FILTERING
# ============================================================================

print("\n16. RECENT ACTIVITY (Last 7 Days)")
print("-" * 80)
from datetime import datetime, timedelta

seven_days_ago = datetime.now() - timedelta(days=7)

result = (
    sessions
    .filter(_.session_start_time >= seven_days_ago)
    .group_by("plan_tier")
    .aggregate(
        "session_count",
        "total_revenue",
        "conversion_rate"
    )
    .order_by(ibis.desc("session_count"))
)
print(result.execute())

# ============================================================================
# SQL GENERATION
# ============================================================================

print("\n17. VIEW GENERATED SQL")
print("-" * 80)
result = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "total_revenue", "conversion_rate")
    .order_by(ibis.desc("session_count"))
    .limit(5)
)
print("Generated SQL:")
print(result.sql())

# ============================================================================
# CHARTING (requires viz-altair or viz-plotly)
# ============================================================================

print("\n18. CREATE VISUALIZATIONS")
print("-" * 80)
print("To enable charting, install: pip install 'boring-semantic-layer[viz-altair]'")
print("\nExample chart code:")
print("""
# Bar chart: Sessions by plan tier
chart = (
    sessions
    .group_by("plan_tier")
    .aggregate("session_count", "conversion_rate")
    .order_by(ibis.desc("session_count"))
    .chart()
)

# Time series: Daily sessions
chart = (
    sessions
    .group_by("session_date")
    .aggregate("session_count", "total_revenue")
    .order_by("session_date")
    .chart()
)

# Export as PNG
png_bytes = result.chart(format="png")
with open("sessions_by_tier.png", "wb") as f:
    f.write(png_bytes)
""")

print("\n" + "=" * 80)
print("EXAMPLES COMPLETE")
print("=" * 80)
print("\nNext Steps:")
print("- Try modifying these queries for your analysis needs")
print("- Combine with LaunchDarkly AI Configs for dynamic querying")
print("- Export results to visualizations or dashboards")
print("- Use .sql() to see generated SQL for optimization")
