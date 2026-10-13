import json
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from groq import Groq, APIError

from config import settings
from schemas.event_wizard import EventPlan, EventWizardInput

router = APIRouter()

SYSTEM_PROMPT = """You are an expert event operations planner. Given event details, generate a complete operating plan.

You MUST return ONLY valid JSON — no markdown, no code fences, no explanation text before or after. 
The JSON must exactly match this structure:

{
  "overview": "A 2-3 paragraph narrative summary of the event operating plan covering the key goals, approach, and expected outcomes.",
  "timeline": [
    {
      "name": "Milestone name (e.g. 'Open Registrations')",
      "date_offset_days": -56,
      "description": "What needs to happen at this milestone",
      "responsible_team": "Team responsible (e.g. 'Marketing', 'Logistics', 'Tech')"
    }
  ],
  "staffing": [
    {
      "role": "Role title (e.g. 'Registration Coordinator')",
      "count": 2,
      "responsibilities": "Clear description of what this role does"
    }
  ],
  "marketing": [
    {
      "channel": "Channel name (e.g. 'LinkedIn', 'Email Newsletter')",
      "target": "Who to target and what message (e.g. 'Students and early-career professionals — registration CTA')",
      "deadline_offset_days": -42
    }
  ],
  "budget_breakdown": [
    {
      "category": "Budget category (e.g. 'Venue', 'Catering', 'Prizes')",
      "estimated_amount": "Dollar amount or description (e.g. '$2,000' or 'Included in venue')",
      "percentage": 25.5
    }
  ],
  "key_risks": [
    {
      "risk": "Description of the risk",
      "mitigation": "How to mitigate or manage this risk"
    }
  ],
  "success_metrics": [
    "Specific, measurable success metric (e.g. '≥ 80% of expected participants register')"
  ]
}

Rules:
- date_offset_days for timeline and deadline_offset_days for marketing are NEGATIVE numbers counting days before the event (e.g. -56 means 8 weeks before). Use 0 for event day. Use positive numbers for post-event tasks.
- Include at least 8 timeline milestones, 5 staff roles, 4 marketing channels, 6 budget items, 4 risks, and 5 success metrics.
- Be specific and realistic for the event type, scale, and budget provided.
- All monetary values in budget_breakdown should be realistic proportions of the stated budget.
- Return ONLY the JSON object. No other text."""


def _build_user_message(data: EventWizardInput) -> str:
    lines = [
        f"Event Format: {data.event_format}",
        f"Event Date: {data.event_date}",
        f"Duration: {data.duration_days} day(s)",
        f"Expected Participants: {data.expected_participants}",
        f"Venue: {data.venue}",
        f"Budget: {data.budget}",
        f"Target Audience: {data.audience}",
        f"Goals: {data.goals}",
    ]
    if data.theme:
        lines.append(f"Theme / Track: {data.theme}")

    return (
        "Please generate a complete operating plan for the following event:\n\n"
        + "\n".join(lines)
    )


@router.post("/event-wizard/generate", response_model=EventPlan)
async def generate_event_plan(
    data: EventWizardInput,
    x_user_role: Optional[str] = Header(None),
) -> EventPlan:
    if x_user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    client = Groq(api_key=settings.groq_api_key)

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_message(data)},
            ],
            temperature=0.7,
            max_tokens=4000,
        )
    except APIError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Groq API error: {exc}",
        ) from exc

    raw = completion.choices[0].message.content or ""

    try:
        parsed = json.loads(raw)
        return EventPlan(**parsed)
    except (json.JSONDecodeError, Exception) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response as valid JSON: {exc}",
        ) from exc
