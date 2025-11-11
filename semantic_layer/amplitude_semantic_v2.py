"""
Amplitude Semantic Layer v2 - MotherDuck Integration
Built with Boring Semantic Layer v2 API
"""

import ibis
from ibis import _
from boring_semantic_layer import to_semantic_table, Dimension, Measure

# Connect to MotherDuck
con = ibis.duckdb.connect("md:")

# Load raw tables
sessions_tbl = con.table("sessions_fct", database="amplitude")
users_tbl = con.table("users_fct", database="amplitude")

# ============================================================================
# SESSIONS SEMANTIC TABLE
# ============================================================================

sessions = (
    to_semantic_table(sessions_tbl, name="sessions")
    .with_dimensions(
        # Identity
        session_id=_.session_id,
        device_id=_.device_id,
        user_id=_.user_id,
        email=_.email,
        
        # Time
        session_date=_.session_date,
        session_start_time=_.session_start_time,
        
        # Plan & Status
        plan_tier=Dimension(
            expr=_.plan_tier,
            description="User subscription tier (trial, starter, premium, business, enterprise)"
        ),
        is_identified=_.is_identified,
        is_customer=_.is_customer,
        
        # Lifecycle
        max_lifecycle_stage=Dimension(
            expr=_.max_lifecycle_stage,
            description="Highest lifecycle stage reached in session"
        ),
        max_funnel_step=_.max_funnel_step,
        
        # Conversion
        has_conversion=_.has_conversion,
        reached_activation=_.reached_activation,
        
        # Attribution
        traffic_source=Dimension(
            expr=_.traffic_source,
            description="Primary traffic source channel"
        ),
        utm_source=_.utm_source,
        utm_medium=_.utm_medium,
        utm_campaign=_.utm_campaign,
    )
    .with_measures(
        # Core Volume
        session_count=Measure(
            expr=lambda t: t.count(),
            description="Total number of sessions"
        ),
        
        # Duration Metrics
        avg_session_duration=Measure(
            expr=lambda t: t.session_duration_seconds.mean(),
            description="Average session duration in seconds"
        ),
        median_session_duration=lambda t: t.session_duration_seconds.quantile(0.5),
        total_session_duration=lambda t: t.session_duration_seconds.sum(),
        
        # Event Metrics
        total_events=Measure(
            expr=lambda t: t.total_events.sum(),
            description="Total events across all sessions"
        ),
        avg_events_per_session=lambda t: t.total_events.mean(),
        events_per_minute=lambda t: t.total_events.sum() / (t.total_session_duration / 60),
        
        # Revenue
        total_revenue=Measure(
            expr=lambda t: t.session_revenue.sum(),
            description="Total revenue generated from sessions"
        ),
        avg_revenue_per_session=lambda t: t.session_revenue.mean(),
        revenue_per_event=lambda t: t.total_revenue / t.total_events,
        
        # Conversion Rates
        conversion_rate=Measure(
            expr=lambda t: (t.has_conversion == True).mean() * 100,
            description="Percentage of sessions with conversions"
        ),
        activation_rate=lambda t: (t.reached_activation == True).mean() * 100,
        identified_rate=lambda t: (t.is_identified == True).mean() * 100,
        
        # Quality Metrics
        bounce_rate=Measure(
            expr=lambda t: (t.total_events == 1).mean() * 100,
            description="Percentage of single-event sessions"
        ),
        engaged_session_rate=lambda t: (t.session_duration_seconds > 30).mean() * 100,
        
        # Lifecycle Events
        awareness_events=lambda t: t.awareness_events.sum(),
        interest_events=lambda t: t.interest_events.sum(),
        consideration_events=lambda t: t.consideration_events.sum(),
        trial_events=lambda t: t.trial_events.sum(),
        activation_events=lambda t: t.activation_events.sum(),
        retention_events=lambda t: t.retention_events.sum(),
        expansion_events=lambda t: t.expansion_events.sum(),
        churn_risk_events=lambda t: t.churn_risk_events.sum(),
        
        # Funnel Metrics
        avg_funnel_depth=lambda t: t.max_funnel_step.mean(),
        max_funnel_reached=lambda t: t.max_funnel_step.max(),
        
        # Market Share (using .all())
        market_share=Measure(
            expr=lambda t: t.session_count / t.all(t.session_count) * 100,
            description="Percentage of total sessions"
        ),
    )
)

# ============================================================================
# USERS SEMANTIC TABLE
# ============================================================================

users = (
    to_semantic_table(users_tbl, name="users")
    .with_dimensions(
        # Identity
        user_key=_.user_key,
        user_id=_.user_id,
        email=_.email,
        
        # Time
        first_event_date=_.first_event_date,
        last_event_date=_.last_event_date,
        days_since_last_event=_.days_since_last_event,
        
        # Status
        current_plan_tier=Dimension(
            expr=_.current_plan_tier,
            description="Current subscription tier"
        ),
        max_lifecycle_stage_name=Dimension(
            expr=_.max_lifecycle_stage_name,
            description="Highest lifecycle stage reached by user"
        ),
        is_active_7d=_.is_active_7d,
        is_active_30d=_.is_active_30d,
        is_paying_customer=_.is_paying_customer,
        
        # Attribution
        first_touch_utm_source=_.first_touch_utm_source,
        first_touch_utm_medium=_.first_touch_utm_medium,
        first_touch_utm_campaign=_.first_touch_utm_campaign,
    )
    .with_measures(
        # Core Counts
        user_count=Measure(
            expr=lambda t: t.count(),
            description="Total number of users"
        ),
        active_users_7d=Measure(
            expr=lambda t: (t.is_active_7d == True).sum(),
            description="Users active in last 7 days"
        ),
        active_users_30d=lambda t: (t.is_active_30d == True).sum(),
        paying_customers=lambda t: (t.is_paying_customer == True).sum(),
        activated_users=lambda t: (t.has_activated == 1).sum(),
        
        # Engagement - Lifetime
        avg_lifetime_events=Measure(
            expr=lambda t: t.total_events.mean(),
            description="Average events per user (lifetime)"
        ),
        avg_lifetime_sessions=lambda t: t.total_sessions.mean(),
        avg_days_active=lambda t: t.total_days_active.mean(),
        
        # Engagement - Recent
        avg_events_7d=lambda t: t.events_7d.mean(),
        avg_sessions_7d=lambda t: t.sessions_7d.mean(),
        avg_events_30d=lambda t: t.events_30d.mean(),
        avg_sessions_30d=lambda t: t.sessions_30d.mean(),
        
        # Revenue
        total_ltv=Measure(
            expr=lambda t: t.total_revenue.sum(),
            description="Total lifetime value across all users"
        ),
        avg_ltv=lambda t: t.total_revenue.mean(),
        avg_revenue_30d=lambda t: t.revenue_30d.mean(),
        revenue_per_active_user=lambda t: t.total_ltv / t.active_users_30d,
        
        # Retention Rates
        retention_rate_7d=Measure(
            expr=lambda t: (t.is_active_7d == True).mean() * 100,
            description="Percentage of users active in last 7 days"
        ),
        retention_rate_30d=lambda t: (t.is_active_30d == True).mean() * 100,
        activation_rate=lambda t: (t.has_activated == 1).mean() * 100,
        paying_rate=lambda t: (t.is_paying_customer == True).mean() * 100,
        
        # Cohorts
        power_users=Measure(
            expr=lambda t: ((t.events_30d > 100) & (t.sessions_30d > 20)).sum(),
            description="Users with >100 events and >20 sessions in last 30 days"
        ),
        casual_users=lambda t: ((t.events_30d.between(10, 100)) & (t.sessions_30d.between(5, 20))).sum(),
        at_risk_users=lambda t: ((t.days_since_last_event > 30) & (t.is_active_30d == False)).sum(),
        
        # Stickiness
        stickiness_30d=Measure(
            expr=lambda t: t.days_active_30d.sum() / t.active_users_30d,
            description="Average days active per active user (30d)"
        ),
        
        # Market Share
        market_share=lambda t: t.user_count / t.all(t.user_count) * 100,
    )
)

# Export for use in other modules
__all__ = ["sessions", "users"]
