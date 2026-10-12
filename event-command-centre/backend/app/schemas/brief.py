"""Pydantic schema for event briefs (wizard input)."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, field_validator, model_validator


class Brief(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    type: str  # hackathon|workshop|bootcamp|webinar_series
    format: str  # in_person|hybrid|virtual
    start_date: date
    end_date: date
    audience: str = Field(min_length=2, max_length=200)
    scale_seats: int = Field(ge=1, le=100_000)
    venue_type: str | None = None
    city: str | None = None
    needs_catering: bool = False
    needs_av: bool = False
    needs_streaming: bool = False
    objectives: list[str] = Field(min_length=1, max_length=10)
    target_registrations: int = Field(ge=1)
    target_reach: int | None = None
    target_partners: int | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"hackathon", "workshop", "bootcamp", "webinar_series"}
        if v not in allowed:
            raise ValueError(f"type must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        allowed = {"in_person", "hybrid", "virtual"}
        if v not in allowed:
            raise ValueError(f"format must be one of: {', '.join(sorted(allowed))}")
        return v

    @model_validator(mode="after")
    def validate_dates_and_targets(self) -> "Brief":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.target_registrations > self.scale_seats:
            raise ValueError("target_registrations cannot exceed scale_seats")
        if self.format == "hybrid" and not self.needs_streaming:
            # Auto-set streaming for hybrid events
            self.needs_streaming = True
        return self
