from fastapi import APIRouter, HTTPException
from backend.agents.session_manager import get_session
from backend.report.generator import generate

router = APIRouter(prefix="/report", tags=["report"])

@router.get("/{session_id}")
async def get_report(session_id: str):
    """Return VulnerabilityReport. 404 if not found. 409 if not complete."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "complete":
        raise HTTPException(status_code=409, detail="Session not yet complete")
    return generate(session)
