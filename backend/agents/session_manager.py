"""
In-memory session store and event queue manager.
No database — all session state lives here.
"""
import asyncio
import uuid
from datetime import datetime
from backend.models.session import AuditSession

_sessions: dict[str, AuditSession] = {}
_queues: dict[str, asyncio.Queue] = {}


def create_session(target_url: str) -> AuditSession:
    """Create a new AuditSession with unique ID. Also creates its asyncio.Queue."""
    session_id = f"vpr_{uuid.uuid4().hex[:8]}"
    session = AuditSession(session_id=session_id, target_url=target_url)
    _sessions[session_id] = session
    _queues[session_id] = asyncio.Queue()
    return session


def get_session(session_id: str) -> AuditSession | None:
    """Return AuditSession or None."""
    return _sessions.get(session_id)


def get_event_queue(session_id: str) -> asyncio.Queue | None:
    """Return the event queue for a session or None."""
    return _queues.get(session_id)


async def push_event(session_id: str, event_type: str, data: dict) -> None:
    """Push a typed SSE event dict to the session queue. Silent on unknown session_id."""
    queue = _queues.get(session_id)
    if queue is not None:
        await queue.put({"type": event_type, "data": data})


def update_session(session_id: str, **kwargs) -> AuditSession | None:
    """Partially update session fields. Returns updated session or None."""
    session = _sessions.get(session_id)
    if session is None:
        return None
    updated = session.model_copy(update=kwargs)
    _sessions[session_id] = updated
    return updated


async def _demo() -> None:
    session = create_session("http://localhost:8000/chatbot/message")
    assert get_session(session.session_id) is session
    assert get_session("nope") is None
    assert get_event_queue(session.session_id) is not None
    assert get_event_queue("nope") is None

    await push_event(session.session_id, "red:probe", {"probe_message": "hi"})
    await push_event("nope", "red:probe", {})  # silent no-op
    queue = get_event_queue(session.session_id)
    event = queue.get_nowait()
    assert event == {"type": "red:probe", "data": {"probe_message": "hi"}}

    updated = update_session(session.session_id, status="attacking", probes_sent=5)
    assert updated.status == "attacking"
    assert updated.probes_sent == 5
    assert get_session(session.session_id).status == "attacking"
    assert update_session("nope", status="attacking") is None

    print("OK")


if __name__ == "__main__":
    asyncio.run(_demo())
