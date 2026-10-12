"""Demo seed — Hackingly Build Sprint.

Creates the intentional gap state described in the implementation plan:
- Registrations: 140 of 300 (47%) with 45 days left
- Visit-to-registration conversion: 6.1% (below 9% threshold)
- Two campus channels driving 70% of visits
- Three partners pending, one 6 days late
- Venue confirmed, catering and AV not confirmed (within lock window)
- Content 2 posts behind plan
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.channel import Channel, ChannelDailyStat
from app.db.models.logistics import LogisticsItem
from app.db.models.metric import MetricSnapshot
from app.db.models.partner import Partner
from app.schemas.brief import Brief


def build_demo_brief(now: datetime) -> Brief:
    """Build the Build Sprint brief with event 45 days from now."""
    today = now.date()
    start = today + timedelta(days=45)
    end = start + timedelta(days=1)  # 2-day hackathon
    return Brief(
        name="Hackingly Build Sprint",
        type="hackathon",
        format="in_person",
        start_date=start,
        end_date=end,
        audience="Final-year engineering students",
        scale_seats=300,
        venue_type="university_campus",
        city="Bengaluru",
        needs_catering=True,
        needs_av=True,
        objectives=["Build community", "Surface talent", "Drive registrations"],
        target_registrations=300,
        target_reach=5000,
        target_partners=5,
    )


async def seed_demo_state(
    session: AsyncSession,
    *,
    event_id: str,
    now: datetime,
) -> None:
    """Seed metrics, partners, logistics gaps, and channel stats for the demo."""
    today = now.date()

    # ------------------------------------------------------------------ #
    # 1. Registration metrics — 140 registered, pace declining
    # ------------------------------------------------------------------ #
    # Seed 16 daily snapshots showing slowing pace
    # Start at 92 registrations 14 days ago, grow slowly to 140
    initial = 92.0
    for day_offset in range(15, -1, -1):
        day_date = today - timedelta(days=day_offset)
        # Slow pace: ~1.6 per day over last 14 days
        reg_value = initial + (15 - day_offset) * 1.6
        snap = MetricSnapshot(
            event_id=event_id,
            metric_key="registrations",
            value=round(reg_value, 1),
            recorded_at=datetime.combine(day_date, datetime.min.time()).replace(tzinfo=now.tzinfo),
            source="seed",
        )
        session.add(snap)

    # Visits: 140 / 0.061 ≈ 2295
    visits_snap = MetricSnapshot(
        event_id=event_id,
        metric_key="visits",
        value=2295.0,
        source="seed",
    )
    session.add(visits_snap)

    reach_snap = MetricSnapshot(
        event_id=event_id,
        metric_key="reach",
        value=1200.0,
        source="seed",
    )
    session.add(reach_snap)

    # ------------------------------------------------------------------ #
    # 2. Campus channels — 5 channels, top 2 drive 70% of visits
    # ------------------------------------------------------------------ #
    channel_data = [
        ("IIT Bengaluru Campus", True, True, 0.089, 950),   # top converting
        ("RV College Campus", True, False, 0.072, 655),     # second campus
        ("LinkedIn", False, False, 0.041, 390),
        ("Instagram", False, False, 0.028, 230),
        ("Email Newsletter", False, False, 0.055, 70),
    ]

    # Load channels already created by event_service
    channels_q = select(Channel).where(Channel.event_id == event_id)
    existing_channels = list((await session.execute(channels_q)).scalars())
    existing_names = {ch.name for ch in existing_channels}

    ch_objects: list[Channel] = list(existing_channels)
    for ch_name, is_campus, is_top, conv, visits in channel_data:
        if ch_name not in existing_names:
            ch = Channel(
                event_id=event_id,
                name=ch_name,
                is_campus=is_campus,
                is_top_converting=is_top,
            )
            session.add(ch)
            ch_objects.append(ch)
        else:
            # Update flags on existing channel
            for existing in existing_channels:
                if existing.name == ch_name:
                    existing.is_campus = is_campus
                    existing.is_top_converting = is_top
    await session.flush()

    # Seed daily stats for the last 14 days for the seeded channels
    for ch in ch_objects:
        for ch_name, is_campus, is_top, conv, total_visits in channel_data:
            if ch.name == ch_name:
                daily_visits = total_visits // 14
                daily_regs = int(daily_visits * conv)
                for d in range(14):
                    day_date = today - timedelta(days=d)
                    stat = ChannelDailyStat(
                        channel_id=ch.id,
                        day=day_date,
                        visits=daily_visits,
                        registrations=daily_regs,
                    )
                    session.add(stat)
                break

    # ------------------------------------------------------------------ #
    # 3. Partners — 3 pending, 1 overdue by 6 days
    # ------------------------------------------------------------------ #
    partner_data = [
        ("TechCorp Solutions", "gold", "confirmed", None),
        ("DevHub India", "silver", "contacted", today - timedelta(days=6)),  # 6 days overdue
        ("CodeCraft Labs", "silver", "contacted", today + timedelta(days=5)),
        ("StartupHive", "bronze", "contacted", today + timedelta(days=8)),
        ("BinaryBuilders", "bronze", "prospect", today + timedelta(days=14)),
    ]
    for name, tier, status, due_date in partner_data:
        p = Partner(
            event_id=event_id,
            name=name,
            tier=tier,
            status=status,
            confirmation_due_date=due_date,
        )
        session.add(p)

    # ------------------------------------------------------------------ #
    # 4. Logistics — venue confirmed, catering and AV unconfirmed
    # ------------------------------------------------------------------ #
    # Update existing logistics items if present
    logistics_q = select(LogisticsItem).where(LogisticsItem.event_id == event_id)
    existing_logistics = list((await session.execute(logistics_q)).scalars())
    logistics_by_category = {li.category: li for li in existing_logistics}

    updates = {
        "venue": "confirmed",
        "catering": "pending",  # NOT confirmed — risk trigger
        "av": "pending",        # NOT confirmed — risk trigger
        "travel": "in_progress",
        "swag": "in_progress",
    }
    for category, target_status in updates.items():
        li = logistics_by_category.get(category)
        if li:
            li.status = target_status

    # ------------------------------------------------------------------ #
    # 5. Partners activated metric
    # ------------------------------------------------------------------ #
    partners_snap = MetricSnapshot(
        event_id=event_id,
        metric_key="partners_activated",
        value=1.0,  # only TechCorp confirmed
        source="seed",
    )
    session.add(partners_snap)

    # Content published — 2 behind plan (no explicit seeding needed;
    # content_items were created with no published_at, so the rule fires naturally)
    content_published_snap = MetricSnapshot(
        event_id=event_id,
        metric_key="content_published",
        value=4.0,  # some published
        source="seed",
    )
    session.add(content_published_snap)
