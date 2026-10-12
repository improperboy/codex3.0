"""Named thresholds and templates.

All engine constants live here. Never hard-code a threshold in a rule.
To change a threshold, edit this file and update boundary tests.
"""
from __future__ import annotations

# --------------------------------------------------------------------------- #
# Risk thresholds
# --------------------------------------------------------------------------- #

# Registration pace (computed over the recent window)
PACE_WINDOW_DAYS: int = 14

# Visit-to-registration conversion
CONVERSION_THRESHOLD: float = 0.09  # 9 %

# Content behind plan
CONTENT_BEHIND_THRESHOLD: int = 2  # posts

# Partner confirmation overdue thresholds
PARTNER_LATE_MEDIUM_DAYS: int = 3
PARTNER_LATE_HIGH_DAYS: int = 7
PARTNER_LATE_CRITICAL_DAYS: int = 14

# Logistics lead-time thresholds by category (days before event)
LOGISTICS_LEAD_TIMES: dict[str, int] = {
    "venue": 45,
    "catering": 21,
    "av": 21,
    "travel": 14,
    "swag": 30,
}

# --------------------------------------------------------------------------- #
# Recommendation ranking weights
# --------------------------------------------------------------------------- #

IMPACT_SCORES: dict[str, float] = {"high": 3.0, "medium": 2.0, "low": 1.0}
EFFORT_SCORES: dict[str, float] = {"low": 3.0, "medium": 2.0, "high": 1.0}

# --------------------------------------------------------------------------- #
# Event type templates: workstreams and baseline task counts
# --------------------------------------------------------------------------- #

EVENT_TYPE_WORKSTREAMS: dict[str, list[dict]] = {
    "hackathon": [
        {"name": "Marketing", "owner_role": "marketing"},
        {"name": "Partnerships", "owner_role": "partnerships"},
        {"name": "Operations", "owner_role": "operations"},
        {"name": "Programme", "owner_role": "programme"},
        {"name": "Content", "owner_role": "marketing"},
        {"name": "Leadership", "owner_role": "leadership"},
    ],
    "workshop": [
        {"name": "Marketing", "owner_role": "marketing"},
        {"name": "Operations", "owner_role": "operations"},
        {"name": "Programme", "owner_role": "programme"},
        {"name": "Content", "owner_role": "marketing"},
        {"name": "Leadership", "owner_role": "leadership"},
    ],
    "bootcamp": [
        {"name": "Marketing", "owner_role": "marketing"},
        {"name": "Partnerships", "owner_role": "partnerships"},
        {"name": "Operations", "owner_role": "operations"},
        {"name": "Programme", "owner_role": "programme"},
        {"name": "Content", "owner_role": "marketing"},
        {"name": "Leadership", "owner_role": "leadership"},
    ],
    "webinar_series": [
        {"name": "Marketing", "owner_role": "marketing"},
        {"name": "Programme", "owner_role": "programme"},
        {"name": "Content", "owner_role": "marketing"},
        {"name": "Leadership", "owner_role": "leadership"},
    ],
}

# Streaming workstream added for hybrid events
STREAMING_WORKSTREAM = {"name": "Streaming", "owner_role": "operations"}

# --------------------------------------------------------------------------- #
# Task templates per workstream (title, owner_role, relative due days before event)
# --------------------------------------------------------------------------- #

TASK_TEMPLATES: dict[str, list[dict]] = {
    "Marketing": [
        {"title": "Define registration page copy", "owner_role": "marketing", "days_before": 42},
        {"title": "Launch registration form", "owner_role": "marketing", "days_before": 40},
        {"title": "Set up UTM tracking for all channels", "owner_role": "marketing", "days_before": 40},
        {"title": "Brief campus ambassadors", "owner_role": "marketing", "days_before": 35},
        {"title": "Send first registration push email", "owner_role": "marketing", "days_before": 35},
        {"title": "Mid-campaign registration check", "owner_role": "marketing", "days_before": 21},
        {"title": "Second registration push", "owner_role": "marketing", "days_before": 14},
        {"title": "Final registration reminder", "owner_role": "marketing", "days_before": 5},
        {"title": "Close registration and send confirmation emails", "owner_role": "marketing", "days_before": 1},
    ],
    "Partnerships": [
        {"title": "Identify and shortlist partners", "owner_role": "partnerships", "days_before": 40},
        {"title": "Send initial outreach to partners", "owner_role": "partnerships", "days_before": 38},
        {"title": "Follow up with non-responding partners", "owner_role": "partnerships", "days_before": 30},
        {"title": "Confirm partner deliverables and logos", "owner_role": "partnerships", "days_before": 25},
        {"title": "Activate partners — brief on event day logistics", "owner_role": "partnerships", "days_before": 7},
        {"title": "Confirm partner presence and final headcount", "owner_role": "partnerships", "days_before": 3},
    ],
    "Operations": [
        {"title": "Confirm venue booking", "owner_role": "operations", "days_before": 42},
        {"title": "Arrange catering", "owner_role": "operations", "days_before": 30},
        {"title": "Book AV equipment", "owner_role": "operations", "days_before": 28},
        {"title": "Confirm travel arrangements for speakers", "owner_role": "operations", "days_before": 21},
        {"title": "Arrange swag production", "owner_role": "operations", "days_before": 28},
        {"title": "Prepare registration desk setup", "owner_role": "operations", "days_before": 7},
        {"title": "On-site run sheet finalised", "owner_role": "operations", "days_before": 5},
        {"title": "Confirm all vendor arrival times", "owner_role": "operations", "days_before": 3},
    ],
    "Programme": [
        {"title": "Finalise agenda and schedule", "owner_role": "programme", "days_before": 35},
        {"title": "Confirm keynote and speaker lineup", "owner_role": "programme", "days_before": 30},
        {"title": "Brief mentors and judges", "owner_role": "programme", "days_before": 14},
        {"title": "Send participant welcome email with schedule", "owner_role": "programme", "days_before": 7},
        {"title": "Prepare judging rubric", "owner_role": "programme", "days_before": 10},
        {"title": "Run technical check on event platform", "owner_role": "programme", "days_before": 3},
        {"title": "Participant reminder and FAQs sent", "owner_role": "programme", "days_before": 2},
    ],
    "Content": [
        {"title": "Content calendar created", "owner_role": "marketing", "days_before": 42},
        {"title": "Week 1 social posts drafted and scheduled", "owner_role": "marketing", "days_before": 38},
        {"title": "Week 2 social posts drafted and scheduled", "owner_role": "marketing", "days_before": 31},
        {"title": "Week 3 social posts drafted and scheduled", "owner_role": "marketing", "days_before": 24},
        {"title": "Week 4 social posts drafted and scheduled", "owner_role": "marketing", "days_before": 17},
        {"title": "Campus newsletter draft reviewed", "owner_role": "marketing", "days_before": 28},
        {"title": "Post-event recap content planned", "owner_role": "marketing", "days_before": 7},
    ],
    "Leadership": [
        {"title": "Event brief signed off by leadership", "owner_role": "leadership", "days_before": 40},
        {"title": "Budget approved", "owner_role": "leadership", "days_before": 38},
        {"title": "Mid-point progress review", "owner_role": "leadership", "days_before": 21},
        {"title": "Final go / no-go decision", "owner_role": "leadership", "days_before": 5},
    ],
    "Streaming": [
        {"title": "Select streaming platform", "owner_role": "operations", "days_before": 35},
        {"title": "Test streaming setup end to end", "owner_role": "operations", "days_before": 14},
        {"title": "Confirm streaming moderator", "owner_role": "operations", "days_before": 7},
    ],
}

# --------------------------------------------------------------------------- #
# Milestone templates
# --------------------------------------------------------------------------- #

MILESTONE_TEMPLATES: list[dict] = [
    {"title": "Registration open", "days_before": 40},
    {"title": "50 % registration target reached", "days_before": 28},
    {"title": "All partners confirmed", "days_before": 21},
    {"title": "All logistics locked", "days_before": 14},
    {"title": "Full programme confirmed", "days_before": 7},
    {"title": "Event day", "days_before": 0},
]

# --------------------------------------------------------------------------- #
# Content calendar defaults (posts per week)
# --------------------------------------------------------------------------- #

CONTENT_POSTS_PER_WEEK: int = 3
CONTENT_CHANNELS_DEFAULT: list[str] = ["LinkedIn", "Instagram", "Campus Newsletter"]

# --------------------------------------------------------------------------- #
# Action recommendation templates
# --------------------------------------------------------------------------- #

ACTION_TEMPLATES: dict[str, list[dict]] = {
    "registration_pace_low": [
        {
            "template_key": "activate_campus_referrals",
            "title": "Activate campus referrals",
            "owner_role": "marketing",
            "expected_impact": "high",
            "effort": "low",
            "rationale_template": "Current pace is {current_pace:.1f}/day vs {required_pace:.1f} required. Activating top-converting campus channels can recover {gap} registrations.",
            "checklist": [
                "Identify the 2–3 highest-converting campus contacts",
                "Draft a referral message with a tracking link",
                "Share with campus leads",
                "Monitor registrations over 48 hours",
                "Record outcome in the metric update",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop"],
        },
        {
            "template_key": "social_media_push",
            "title": "Run a targeted social media push",
            "owner_role": "marketing",
            "expected_impact": "medium",
            "effort": "medium",
            "rationale_template": "Registration pace is {current_pace:.1f}/day, {gap} below target. A targeted push can improve visibility.",
            "checklist": [
                "Draft 3 posts for LinkedIn and Instagram",
                "Schedule posts across the next 5 days",
                "Boost best-performing post",
                "Record registrations after 5 days",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop", "webinar_series"],
        },
    ],
    "conversion_low": [
        {
            "template_key": "fix_mobile_registration",
            "title": "Fix mobile registration drop-off",
            "owner_role": "programme",
            "expected_impact": "high",
            "effort": "medium",
            "rationale_template": "Visit-to-registration conversion is {conversion:.1%}, below the {threshold:.0%} threshold. Mobile form abandonment is the most common cause.",
            "checklist": [
                "Test the registration form on iOS and Android",
                "Identify fields with high abandonment",
                "Simplify or remove problematic fields",
                "Retest and record improved conversion",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop", "webinar_series"],
        }
    ],
    "partner_confirmation_late": [
        {
            "template_key": "chase_partner_confirmation",
            "title": "Chase overdue partner confirmation",
            "owner_role": "partnerships",
            "expected_impact": "high",
            "effort": "low",
            "rationale_template": "{partner_name} confirmation is {days_late} days overdue. Contact them directly and activate the fallback if needed.",
            "checklist": [
                "Call or email the partner contact directly",
                "Set a 24-hour response deadline",
                "If no response, activate the identified fallback partner",
                "Update partner status in the system",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop", "webinar_series"],
        }
    ],
    "logistics_unconfirmed": [
        {
            "template_key": "lock_vendor",
            "title": "Lock {category} vendor",
            "owner_role": "operations",
            "expected_impact": "high",
            "effort": "low",
            "rationale_template": "{title} is unconfirmed with {days_to_lock} days to the lock date.",
            "checklist": [
                "Get final quote from vendor",
                "Get sign-off on budget",
                "Send confirmation and deposit",
                "Update logistics status to confirmed",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop"],
        }
    ],
    "content_behind_plan": [
        {
            "template_key": "catch_up_content",
            "title": "Publish backlog content this week",
            "owner_role": "marketing",
            "expected_impact": "medium",
            "effort": "medium",
            "rationale_template": "Content is {behind_count} posts behind plan. Publishing this week keeps the campaign momentum.",
            "checklist": [
                "List unpublished posts",
                "Assign drafting to team members",
                "Review and schedule all backlog posts by Friday",
                "Update content calendar",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop", "webinar_series"],
        }
    ],
    "tasks_overdue": [
        {
            "template_key": "clear_overdue_tasks",
            "title": "Clear overdue tasks in {workstream}",
            "owner_role": "{owner_role}",
            "expected_impact": "medium",
            "effort": "medium",
            "rationale_template": "{count} tasks in {workstream} are overdue. Unblocking them now prevents escalation.",
            "checklist": [
                "Review each overdue task",
                "Identify blockers and reassign if needed",
                "Update status or close with outcome",
            ],
            "event_types": ["hackathon", "bootcamp", "workshop", "webinar_series"],
        }
    ],
}
