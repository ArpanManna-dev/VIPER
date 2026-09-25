from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from backend.agents import red_agent, blue_agent
from backend.agents.session_manager import (
    create_session, get_session, get_event_queue
)
import asyncio, json

router = APIRouter(prefix="/audit", tags=["audit"])

class StartAuditRequest(BaseModel):
    target_url: str

# Wire-format response shapes per openapi.yaml components/schemas — the internal
# AuditSession model (backend/models/session.py) carries full findings/chains/patches
# lists for in-memory agent state; these mirror the trimmed *_count response schemas.
class AuditSessionResponse(BaseModel):
    session_id: str
    target_url: str
    status: str
    phase: str
    findings_count: int
    chains_count: int
    patches_count: int
    started_at: datetime
    completed_at: datetime | None

class AuditStatusResponse(BaseModel):
    session_id: str
    status: str
    phase: str
    probes_sent: int
    attacks_launched: int
    findings_count: int
    chains_count: int
    patches_validated: int
    elapsed_seconds: int


def _to_session_response(session) -> AuditSessionResponse:
    return AuditSessionResponse(
        session_id=session.session_id,
        target_url=session.target_url,
        status=session.status,
        phase=session.phase,
        findings_count=len(session.findings),
        chains_count=len(session.chains),
        patches_count=len(session.patches),
        started_at=session.started_at,
        completed_at=session.completed_at,
    )


@router.post("/start")
async def start_audit(request: StartAuditRequest):
    """Create session, launch Red + Blue agents as concurrent background tasks."""
    session = create_session(request.target_url)
    queue = get_event_queue(session.session_id)
    asyncio.create_task(red_agent.run(session, queue))
    asyncio.create_task(blue_agent.run(session, queue))
    return _to_session_response(session)


@router.get("/stream/{session_id}")
async def stream_events(session_id: str):
    """SSE stream. Format: data: {json}\n\n  Closes after session:complete."""
    if get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    queue = get_event_queue(session_id)
    if queue is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        while True:
            event = await queue.get()
            yield {"data": json.dumps(event)}
            if event["type"] == "session:complete":
                break

    return EventSourceResponse(event_generator())


@router.get("/status/{session_id}")
async def get_status(session_id: str):
    """Return AuditStatus snapshot. 404 if not found."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    end = session.completed_at or datetime.now(timezone.utc)
    elapsed_seconds = int((end - session.started_at).total_seconds())

    return AuditStatusResponse(
        session_id=session.session_id,
        status=session.status,
        phase=session.phase,
        probes_sent=session.probes_sent,
        attacks_launched=session.attacks_launched,
        findings_count=len(session.findings),
        chains_count=len(session.chains),
        patches_validated=sum(1 for p in session.patches if p.validated),
        elapsed_seconds=elapsed_seconds,
    )
