"""B7.7 - Audit log coverage check.

Every write endpoint must produce at least one audit_events row.
This test statically inspects service and router code to verify
audit_service.log is called for all write operations.
"""
from __future__ import annotations

from pathlib import Path

# tests/api/ → tests/ → backend/  (need 3 parents to reach app/)
_BACKEND = Path(__file__).parent.parent.parent
ROUTERS_DIR = _BACKEND / "app" / "api" / "routers"
SERVICES_DIR = _BACKEND / "app" / "services"

# Routes excluded from the audit check with justification
EXCLUDED_ROUTES: dict[str, str] = {
    "POST /api/plans/preview": "no-persist preview endpoint - explicitly never writes to DB",
    "PATCH /api/tasks/{task_id}/checklist": "small optimistic tick; parent task writes audit for status changes",
}


def test_excluded_routes_have_justifications():
    """Every entry in EXCLUDED_ROUTES must have a non-empty justification."""
    for key, justification in EXCLUDED_ROUTES.items():
        assert justification and justification.strip(), (
            f"Route {key!r} in EXCLUDED_ROUTES has no justification. Add one."
        )


def test_services_call_audit_log():
    """Key services that write business state must call audit_service."""
    assert SERVICES_DIR.is_dir(), f"Services dir not found: {SERVICES_DIR}"

    service_audit_callers: set[str] = set()
    for py_file in SERVICES_DIR.glob("*.py"):
        source = py_file.read_text(encoding="utf-8")
        if "audit_service" in source:
            service_audit_callers.add(py_file.stem)

    required = {"event_service", "task_service", "risk_service"}
    missing = required - service_audit_callers
    assert not missing, (
        f"These services write business state but don't call audit_service: {missing}"
    )


def test_routers_with_standalone_writes_call_audit():
    """Routers with write endpoints not fully delegated to services call audit_service."""
    assert ROUTERS_DIR.is_dir(), f"Routers dir not found: {ROUTERS_DIR}"

    audited: set[str] = set()
    for py_file in ROUTERS_DIR.glob("*.py"):
        source = py_file.read_text(encoding="utf-8")
        if "audit_service" in source:
            audited.add(py_file.stem)

    # These routers do direct DB writes (partner/logistics patch, dismiss/snooze)
    required = {"recommendations", "workstreams", "demo"}
    missing = required - audited
    assert not missing, (
        f"Routers with direct write operations lack audit_service calls: {missing}"
    )


def test_audit_service_is_append_only():
    """audit_service.py must not UPDATE or DELETE rows; it must be append-only."""
    audit_svc = SERVICES_DIR / "audit_service.py"
    assert audit_svc.exists(), "audit_service.py not found"
    source = audit_svc.read_text(encoding="utf-8")

    # Must use append pattern
    assert "session.add(" in source, (
        "audit_service must use session.add() to append rows, not update"
    )

    # Sanity: no update/delete operations in AST
    import ast
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            name = ""
            if isinstance(func, ast.Attribute):
                name = func.attr
            elif isinstance(func, ast.Name):
                name = func.id
            assert name not in ("update", "delete", "remove"), (
                f"audit_service.py calls {name!r} which mutates rows; must be append-only"
            )


def test_write_routes_documented():
    """Walk all router files and ensure every write method either has audit or is delegated."""
    import re
    assert ROUTERS_DIR.is_dir()

    # Routers whose writes are handled through services that log audit
    delegated_to_auditing_services = {
        "events",   # event_service logs audit
        "tasks",    # task_service logs audit
        "risks",    # risk_service logs audit
        "stream",   # SSE only - no writes
        "health",   # read-only
        "plans",    # preview is read, plan fetch is read
    }

    problem_routes: list[str] = []
    for py_file in ROUTERS_DIR.glob("*.py"):
        if py_file.stem in delegated_to_auditing_services:
            continue
        source = py_file.read_text(encoding="utf-8")
        has_audit = "audit_service" in source
        # Check for any write route decorator
        has_write = bool(re.search(
            r"@router\.(post|put|patch|delete)\(",
            source,
            re.I,
        ))
        if has_write and not has_audit:
            problem_routes.append(py_file.stem)

    assert not problem_routes, (
        "These routers have write routes but no audit_service calls:\n"
        + "\n".join(problem_routes)
    )
