from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_config
from backend.routers import audit, chatbot, report
from google import genai

app = FastAPI(title="VIPER API", version="1.0.0")

@app.on_event("startup")
async def startup():
    """Validate Gemini API key. Fail loudly if missing."""
    if not config.gemini_api_key or not config.gemini_api_key.strip():
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key before starting VIPER."
        )

config = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit.router)
app.include_router(chatbot.router)
app.include_router(report.router)

@app.get("/health")
async def health():
    return {"status": "ok"}


async def _demo() -> None:
    """Integration self-check over ASGI (no real server process, no port binding).
    Does not wait on a full live audit — Gemini quota may be exhausted — it only
    verifies HTTP wiring, status codes, and response shapes per openapi.yaml."""
    import json
    import httpx
    from httpx import ASGITransport
    from backend.agents import session_manager

    await startup()  # this httpx version's ASGITransport doesn't drive ASGI lifespan

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
        assert r.status_code == 200 and r.json() == {"status": "ok"}

        r = await client.post("/chatbot/message", json={"message": "hi"})
        assert r.status_code == 200
        assert isinstance(r.json()["response"], str) and r.json()["response"]

        r = await client.get("/report/does-not-exist")
        assert r.status_code == 404

        session = session_manager.create_session("http://localhost:8000/chatbot/message")
        r = await client.get(f"/report/{session.session_id}")
        assert r.status_code == 409

        r = await client.get(f"/audit/status/{session.session_id}")
        assert r.status_code == 200
        for key in ["session_id", "status", "phase", "probes_sent", "attacks_launched",
                    "findings_count", "chains_count", "patches_validated", "elapsed_seconds"]:
            assert key in r.json(), f"missing status field: {key}"

        r = await client.get("/audit/status/does-not-exist")
        assert r.status_code == 404
        r = await client.get("/audit/stream/does-not-exist")
        assert r.status_code == 404

        # Manually seed events (no live agent run) and read them back over SSE.
        stream_session = session_manager.create_session("http://localhost:8000/chatbot/message")
        await session_manager.push_event(stream_session.session_id, "red:reasoning", {"text": "hi"})
        await session_manager.push_event(stream_session.session_id, "session:complete", {"report_ready": True})

        seen_types = []
        async with client.stream("GET", f"/audit/stream/{stream_session.session_id}") as response:
            assert response.status_code == 200
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    payload = json.loads(line[len("data:"):].strip())
                    seen_types.append(payload["type"])
                    if payload["type"] == "session:complete":
                        break
        assert seen_types == ["red:reasoning", "session:complete"]

        # Launches real background agent tasks (will hit quota gracefully if exhausted).
        r = await client.post("/audit/start", json={"target_url": "http://localhost:8000/chatbot/message"})
        assert r.status_code == 200
        body = r.json()
        for key in ["session_id", "target_url", "status", "phase", "findings_count",
                    "chains_count", "patches_count", "started_at", "completed_at"]:
            assert key in body, f"missing session field: {key}"
        assert body["status"] == "profiling" and body["findings_count"] == 0

    print("OK — all router endpoints verified")


if __name__ == "__main__":
    import asyncio
    asyncio.run(_demo())
