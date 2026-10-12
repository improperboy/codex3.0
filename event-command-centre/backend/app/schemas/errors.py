"""Shared error response shape."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class FieldError(BaseModel):
    field: str
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: list[FieldError] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


def make_error(code: str, message: str, fields: list[FieldError] | None = None) -> dict:
    return {"error": {"code": code, "message": message, "fields": fields}}
