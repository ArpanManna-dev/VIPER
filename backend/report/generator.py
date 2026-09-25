"""Assembles VulnerabilityReport from completed AuditSession."""
from datetime import datetime, timezone
from backend.models.session import AuditSession, VulnerabilityReport, ReportSummary


def generate(session: AuditSession) -> VulnerabilityReport:
    """
    Build VulnerabilityReport from session.
    Raises ValueError if session.status != "complete".
    All summary fields calculated from session data.
    """
    if session.status != "complete":
        raise ValueError(f"Session {session.session_id} is not complete (status={session.status})")

    duration_seconds = 0
    if session.completed_at is not None:
        duration_seconds = int((session.completed_at - session.started_at).total_seconds())

    summary = ReportSummary(
        total_probes=session.probes_sent,
        total_attacks=session.attacks_launched,
        critical=sum(1 for f in session.findings if f.severity == "critical"),
        high=sum(1 for f in session.findings if f.severity == "high"),
        medium=sum(1 for f in session.findings if f.severity == "medium"),
        chains_discovered=len(session.chains),
        patches_generated=len(session.patches),
        patches_validated=sum(1 for p in session.patches if p.validated),
        duration_seconds=duration_seconds,
    )

    return VulnerabilityReport(
        session_id=session.session_id,
        target=session.target_url,
        timestamp=datetime.now(timezone.utc),
        profile=session.profile,
        summary=summary,
        findings=session.findings,
        chains=session.chains,
        patches=session.patches,
    )


def _demo() -> None:
    from backend.models.finding import Finding
    from backend.models.patch import Patch

    now = datetime.now(timezone.utc)
    session = AuditSession(
        session_id="vpr_test1234", target_url="http://localhost:8000/chatbot/message",
        status="attacking", probes_sent=5, attacks_launched=6,
        findings=[
            Finding(id=1, category="Role Hijacking", payload="p1", chatbot_response="r1",
                    severity="critical", hypothesis="h", consequence="c", detected_at=now),
            Finding(id=2, category="Context Injection", payload="p2", chatbot_response="r2",
                    severity="high", hypothesis="h", consequence="c", detected_at=now),
        ],
        patches=[
            Patch(id="patch_001", finding_id=1, root_cause="rc", patch_description="pd",
                  original_prompt_fragment="orig", patched_prompt_fragment="fixed",
                  confidence=0.9, validated=True, retest_result="fixed"),
        ],
        started_at=now,
    )

    try:
        generate(session)
        raise AssertionError("expected ValueError for non-complete session")
    except ValueError:
        pass

    session = session.model_copy(update={"status": "complete", "completed_at": now})
    report = generate(session)

    assert report.session_id == "vpr_test1234"
    assert report.summary.critical == 1
    assert report.summary.high == 1
    assert report.summary.medium == 0
    assert report.summary.patches_generated == 1
    assert report.summary.patches_validated == 1
    assert report.summary.duration_seconds == 0
    assert len(report.findings) == 2

    print("OK —", report.summary.model_dump())


if __name__ == "__main__":
    _demo()
