"""
Amplitude Semantic Layer Examples - MotherDuck Integration

This script demonstrates how to query the Amplitude semantic layer
using Ibis and MotherDuck as the execution engine.

Requirements:
- boring-semantic-layer
- ibis-framework[duckdb]
"""

import ibis
from boring_semantic_layer import SemanticModel

# Connect to MotherDuck
con = ibis.duckdb.connect("md:")

# Map tables to your MotherDuck database
tables = {
    "amplitude.sessions_fct": con.table("sessions_fct", database="amplitude"),
    "amplitude.users_fct": con.table("users_fct", database="amplitude"),
}

# Load semantic models from YAML
models = SemanticModel.from_yaml("amplitude_semantic_layer.yml", tables=tables)

sessions_sm = models["sessions"]
users_sm = models["users"]

print("=" * 80)
print("AMPLITUDE SEMANTIC LAYER EXAMPLES")
print("=" * 80)

# ============================================================================
# SESSIONS ANALYSIS
# ============================================================================

print("\n1. SESSION VOLUME BY PLAN TIER")
print("-" * 80)
expr = sessions_sm.query(
    dimensions=["plan_tier"],
    measures=["session_count", "avg_session_duration", "avg_events_per_session"],
    order_by=[("session_count", "desc")],
)
print(expr.execute())

print("\n2. CONVERSION FUNNEL BY LIFECYCLE STAGE")
print("-" * 80)
expr = sessions_sm.query(
    dimensions=["max_lifecycle_stage"],
    measures=[
        "session_count",
        "conversion_rate",
        "activation_rate",
        "avg_funnel_depth"
    ],
    order_by=[("session_count", "desc")],
)
print(expr.execute())

print("\n3. REVENUE ANALYSIS BY TRAFFIC SOURCE")
print("-" * 80)
expr = sessions_sm.query(
    dimensions=["traffic_source"],
    measures=[
        "session_count",
        "total_revenue",
        "avg_revenue_per_session",
        "conversion_rate"
    ],
    order_by=[("total_revenue", "desc")],
    limit=10,
)
print(expr.execute())

print("\n4. SESSION QUALITY METRICS BY UTM CAMPAIGN")
print("-" * 80)
expr = sessions_sm.query(
    dimensions=["utm_campaign"],
    measures=[
        "session_count",
        "bounce_rate",
        "engaged_session_rate",
        "avg_session_duration"
    ],
    order_by=[("session_count", "desc")],
    limit=10,
)
print(expr.execute())

print("\n5. LIFECYCLE EVENT DISTRIBUTION")
print("-" * 80)
expr = sessions_sm.query(
    measures=[
        "session_count",
        "total_awareness_events",
        "total_interest_events",
        "total_consideration_events",
        "total_trial_events",
        "total_activation_events",
        "total_retention_events",
        "total_expansion_events",
        "total_churn_risk_events",
    ],
)
print(expr.execute())

# ============================================================================
# USER ANALYSIS
# ============================================================================

print("\n6. USER ENGAGEMENT OVERVIEW")
print("-" * 80)
expr = users_sm.query(
    measures=[
        "user_count",
        "active_users_7d",
        "active_users_30d",
        "paying_customers",
        "activated_users",
        "retention_rate_7d",
        "retention_rate_30d",
    ],
)
print(expr.execute())

print("\n7. USER COHORTS BY ENGAGEMENT LEVEL")
print("-" * 80)
expr = users_sm.query(
    measures=[
        "user_count",
        "power_users",
        "casual_users",
        "at_risk_users",
        "avg_events_per_user",
        "avg_sessions_per_user",
    ],
)
print(expr.execute())

print("\n8. REVENUE METRICS BY PLAN TIER")
print("-" * 80)
expr = users_sm.query(
    dimensions=["current_plan_tier"],
    measures=[
        "user_count",
        "paying_customers",
        "total_ltv",
        "avg_ltv",
        "avg_revenue_30d",
        "avg_transaction_size",
    ],
    order_by=[("total_ltv", "desc")],
)
print(expr.execute())

print("\n9. ACTIVATION & CUSTOMER JOURNEY METRICS")
print("-" * 80)
expr = users_sm.query(
    measures=[
        "user_count",
        "activation_rate",
        "paying_customer_rate",
        "avg_days_to_activation",
        "median_days_to_activation",
        "stickiness_7d",
        "stickiness_30d",
    ],
)
print(expr.execute())

print("\n10. FIRST TOUCH ATTRIBUTION ANALYSIS")
print("-" * 80)
expr = users_sm.query(
    dimensions=["first_touch_utm_source", "first_touch_utm_medium"],
    measures=[
        "user_count",
        "activated_users",
        "paying_customers",
        "total_ltv",
        "avg_ltv",
    ],
    order_by=[("user_count", "desc")],
    limit=10,
)
print(expr.execute())

print("\n11. USER ENGAGEMENT TRENDS (RECENT ACTIVITY)")
print("-" * 80)
expr = users_sm.query(
    measures=[
        "user_count",
        "avg_events_24h",
        "avg_sessions_24h",
        "avg_events_7d",
        "avg_sessions_7d",
        "avg_events_30d",
        "avg_sessions_30d",
        "avg_days_active_7d",
        "avg_days_active_30d",
    ],
)
print(expr.execute())

print("\n12. LIFECYCLE STAGE DISTRIBUTION")
print("-" * 80)
expr = users_sm.query(
    dimensions=["max_lifecycle_stage_name"],
    measures=[
        "user_count",
        "avg_events_30d",
        "avg_revenue_30d",
        "retention_rate_30d",
    ],
    order_by=[("user_count", "desc")],
)
print(expr.execute())

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
